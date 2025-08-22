from __future__ import annotations

import asyncio
import asyncio
import json
import os
import re
import time
from typing import Any, Dict, Optional
import re

import httpx
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from utils.logger import logger
from utils.config import config


router = APIRouter(tags=["prompts"])


# --- Simple in-memory cache with TTL ---
class _TTLCache:
    def __init__(self, ttl_seconds: int = 900) -> None:
        self._ttl = ttl_seconds
        self._data: Dict[str, tuple[float, Any]] = {}

    def get(self, key: str) -> Optional[Any]:
        record = self._data.get(key)
        if not record:
            return None
        expires_at, value = record
        if time.time() > expires_at:
            self._data.pop(key, None)
            return None
        return value

    def set(self, key: str, value: Any) -> None:
        self._data[key] = (time.time() + self._ttl, value)


cache = _TTLCache(ttl_seconds=15 * 60)


# --- Response Models ---
class TaskPromptResponse(BaseModel):
    role: str
    task: str
    prompt: str

class TaskPromptsResponse(BaseModel):
    role: str
    task: str
    prompts: list[str] = Field(default_factory=list, description="Multiple prompt variants")


class RolePromptsResponse(BaseModel):
    role: str
    prompts: Dict[str, str] = Field(
        default_factory=dict,
        description="Mapping of task_key -> prompt string",
    )


TAVILY_URL = "https://api.tavily.com/search"


async def _call_tavily(query: str) -> str:
    api_key = os.getenv("TAVILY_API_KEY")
    if not api_key:
        logger.error("TAVILY_API_KEY is not set")
        raise HTTPException(status_code=500, detail="Tavily API key not configured")

    payload = {
        "api_key": api_key,
        "query": query,
        "search_depth": "basic",
        "include_answer": True,
        "max_results": 4,
        "include_raw_content": False,
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(TAVILY_URL, json=payload)
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPStatusError as e:
        logger.error(f"Tavily API HTTP error: {e.response.status_code} - {e.response.text}")
        raise HTTPException(status_code=502, detail="Failed to fetch prompts from Tavily")
    except Exception as e:
        logger.error(f"Tavily API request failed: {e}")
        raise HTTPException(status_code=502, detail="Tavily service unreachable")

    # Tavily returns an "answer" field when include_answer=True
    answer = data.get("answer")
    if not answer:
        logger.warning("Tavily response missing 'answer' field")
        raise HTTPException(status_code=502, detail="Invalid response from Tavily")

    return str(answer)


async def _call_tavily_json(query: str) -> Dict[str, Any]:
    """Call Tavily expecting a JSON string answer and parse to dict."""
    text = await _call_tavily(query)
    try:
        return json.loads(text)
    except Exception:
        # Try to extract JSON substring heuristically
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start : end + 1])
            except Exception:
                pass
        raise HTTPException(status_code=502, detail="Tavily returned non-JSON response")


class CompanyProfileResponse(BaseModel):
    company_name: Optional[str] = None
    website_url: str
    company_description: str = ""
    services: list[str] = Field(default_factory=list)
    products: list[str] = Field(default_factory=list)


async def _fetch_company_pages(base_url: str) -> dict[str, str]:
    """Fetch multiple pages from a company website to get comprehensive profile data."""
    pages = {}
    
    # Common service/product page paths to try
    service_paths = [
        "/services", "/solutions", "/products", "/offerings", 
        "/capabilities", "/what-we-do", "/our-services",
        "/products-services", "/solutions-services"
    ]
    
    # Also try about/company pages for description
    about_paths = ["/about", "/about-us", "/company", "/who-we-are"]
    
    all_paths = service_paths + about_paths
    
    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
        # Fetch main page first
        try:
            resp = await client.get(base_url)
            if resp.status_code == 200:
                pages["main"] = resp.text
        except Exception as e:
            logger.warning(f"Failed to fetch main page {base_url}: {e}")
        
        # Fetch service/product pages in parallel
        tasks = []
        for path in all_paths:
            url = f"{base_url.rstrip('/')}{path}"
            tasks.append(client.get(url))
        
        try:
            responses = await asyncio.gather(*tasks, return_exceptions=True)
            for i, resp in enumerate(responses):
                if isinstance(resp, Exception):
                    continue
                if resp.status_code == 200:
                    path = all_paths[i]
                    pages[path] = resp.text
        except Exception as e:
            logger.warning(f"Failed to fetch some pages: {e}")
    
    return pages


def _extract_text(html: str) -> str:
    """Very lightweight HTML to text conversion without external deps."""
    # Remove scripts/styles
    html = re.sub(r"<script[\s\S]*?</script>", " ", html, flags=re.IGNORECASE)
    html = re.sub(r"<style[\s\S]*?</style>", " ", html, flags=re.IGNORECASE)
    # Replace breaks and list items with newlines for better sentence splits
    html = re.sub(r"<(?:br|li|p|div|tr|h[1-6])[^>]*>", "\n", html, flags=re.IGNORECASE)
    # Strip tags
    text = re.sub(r"<[^>]+>", " ", html)
    # Collapse whitespace
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _extract_profile_from_html(html: str) -> tuple[str, list[str]]:
    """Extract company description and services from raw HTML.

    - Description: prefer <meta name="description"> or og:description. Fallback to first
      2-4 sentences from the visible text.
    - Services/Products: collect items from lists near headings containing
      'Services', 'Products', 'Solutions', 'Offerings', 'Capabilities', or 'What we do'.
    """
    description = ""
    services: list[str] = []

    # Try meta description first
    meta_desc = re.search(
        r"<meta[^>]+name=[\"']description[\"'][^>]+content=[\"']([^\"']+)[\"']",
        html,
        flags=re.IGNORECASE,
    )
    if not meta_desc:
        meta_desc = re.search(
            r"<meta[^>]+property=[\"']og:description[\"'][^>]+content=[\"']([^\"']+)[\"']",
            html,
            flags=re.IGNORECASE,
        )
    if meta_desc:
        description = meta_desc.group(1).strip()

    # If still no description, grab first couple of sentences from body text
    if not description:
        body_text = _extract_text(html)
        # Split into sentences heuristically
        sentences = re.split(r"(?<=[.!?])\s+", body_text)
        description = " ".join(sentences[:3]).strip()[:600]

    # Enhanced services extraction: find lists near relevant headings
    # Look for more comprehensive patterns
    service_patterns = [
        r"(<h[1-6][^>]*>\s*(?:services|products|solutions|offerings|capabilities|what\s+we\s+do)[^<]*</h[1-6]>[\s\S]{0,5000}?<ul[\s\S]*?</ul>)",
        r"(<h[1-6][^>]*>\s*(?:services|products|solutions|offerings|capabilities|what\s+we\s+do)[^<]*</h[1-6]>[\s\S]{0,5000}?<ol[\s\S]*?</ol>)",
        # Also look for div containers with service-like content
        r"(<div[^>]*class=[\"'][^\"']*(?:service|product|solution|offering)[^\"']*[\"'][^>]*>[\s\S]*?</div>)",
        # Look for any list within 2000 chars of service keywords
        r"((?:services?|products?|solutions?|offerings?|capabilities?)[\s\S]{0,2000}?<ul[\s\S]*?</ul>)",
        r"((?:services?|products?|solutions?|offerings?|capabilities?)[\s\S]{0,2000}?<ol[\s\S]*?</ol>)"
    ]
    
    for pattern in service_patterns:
        blocks = re.findall(pattern, html, flags=re.IGNORECASE)
        for block in blocks:
            # Extract list items
            for li in re.findall(r"<li[^>]*>([\s\S]*?)</li>", block, flags=re.IGNORECASE):
                item_text = _extract_text(li)
                if item_text and len(item_text) > 3:
                    services.append(item_text[:140])
            # Also look for div/span elements that might be service items
            for div in re.findall(r"<div[^>]*class=[\"'][^\"']*(?:service|product|solution|offering)[^\"']*[\"'][^>]*>([\s\S]*?)</div>", block, flags=re.IGNORECASE):
                div_text = _extract_text(div)
                if div_text and len(div_text) > 3:
                    services.append(div_text[:140])
            
            if len(services) >= 8:  # Good amount found
                break
        if len(services) >= 8:
            break

    # Deduplicate and clean
    seen: set[str] = set()
    deduped: list[str] = []
    for s in services:
        key = s.lower().strip()
        if key not in seen and len(s.strip()) > 3 and not key.startswith(('http', 'www')):
            seen.add(key)
            deduped.append(s.strip())

    return description, deduped[:12]  # Return up to 12 items


def _extract_profile_from_html_enhanced(html: str) -> tuple[str, list[str], list[str]]:
    """Enhanced extraction of company description, services, and products from raw HTML."""
    description = ""
    services: list[str] = []
    products: list[str] = []

    # Try meta description first
    meta_desc = re.search(
        r"<meta[^>]+name=[\"']description[\"'][^>]+content=[\"']([^\"']+)[\"']",
        html,
        flags=re.IGNORECASE,
    )
    if not meta_desc:
        meta_desc = re.search(
            r"<meta[^>]+property=[\"']og:description[\"'][^>]+content=[\"']([^\"']+)[\"']",
            html,
            flags=re.IGNORECASE,
        )
    if meta_desc:
        description = meta_desc.group(1).strip()

    # If still no description, grab first couple of sentences from body text
    if not description:
        body_text = _extract_text(html)
        # Split into sentences heuristically
        sentences = re.split(r"(?<=[.!?])\s+", body_text)
        description = " ".join(sentences[:3]).strip()[:600]

    # Enhanced Services extraction: multiple approaches
    service_patterns = [
        # Pattern 1: Headings followed by lists
        r"(<h[1-6][^>]*>\s*(?:services?|solutions?|offerings?|capabilities?|what\s+we\s+do|our\s+services?|platforms?|tools?)[^<]*</h[1-6]>[\s\S]{0,8000}?<ul[\s\S]*?</ul>)",
        r"(<h[1-6][^>]*>\s*(?:services?|solutions?|offerings?|capabilities?|what\s+we\s+do|our\s+services?|platforms?|tools?)[^<]*</h[1-6]>[\s\S]{0,8000}?<ol[\s\S]*?</ol>)",
        # Pattern 2: Keywords near lists
        r"((?:services?|solutions?|offerings?|capabilities?|platforms?|tools?|what\s+we\s+do|our\s+services?)[\s\S]{0,3000}?<ul[\s\S]*?</ul>)",
        r"((?:services?|solutions?|offerings?|capabilities?|platforms?|tools?|what\s+we\s+do|our\s+services?)[\s\S]{0,3000}?<ol[\s\S]*?</ol>)",
        # Pattern 3: Div containers with service-like content
        r"(<div[^>]*class=[\"'][^\"']*(?:service|solution|offering|capability|platform|tool)[^\"']*[\"'][^>]*>[\s\S]*?</div>)",
        # Pattern 4: Any list with service keywords in nearby text
        r"((?:ai|intelligence|analytics|platform|business|data|real.?time)[\s\S]{0,2000}?<ul[\s\S]*?</ul>)",
        r"((?:ai|intelligence|analytics|platform|business|data|real.?time)[\s\S]{0,2000}?<ol[\s\S]*?</ol>)"
    ]
    
    for pattern in service_patterns:
        blocks = re.findall(pattern, html, flags=re.IGNORECASE)
        for block in blocks:
            # Extract list items
            for li in re.findall(r"<li[^>]*>([\s\S]*?)</li>", block, flags=re.IGNORECASE):
                item_text = _extract_text(li)
                if item_text and len(item_text) > 3 and len(item_text) < 200:
                    services.append(item_text[:140])
            # Also look for div/span elements that might be service items
            for div in re.findall(r"<div[^>]*class=[\"'][^\"']*(?:service|solution|offering|capability|platform|tool)[^\"']*[\"'][^>]*>([\s\S]*?)</div>", block, flags=re.IGNORECASE):
                div_text = _extract_text(div)
                if div_text and len(div_text) > 3 and len(div_text) < 200:
                    services.append(div_text[:140])
            if len(services) >= 10:
                break
        if len(services) >= 10:
            break

    # Enhanced Products extraction: multiple approaches
    product_patterns = [
        # Pattern 1: Headings followed by lists
        r"(<h[1-6][^>]*>\s*(?:products?|product\s+line|our\s+products?|platforms?|solutions?|tools?)[^<]*</h[1-6]>[\s\S]{0,8000}?<ul[\s\S]*?</ul>)",
        r"(<h[1-6][^>]*>\s*(?:products?|product\s+line|our\s+products?|platforms?|solutions?|tools?)[^<]*</h[1-6]>[\s\S]{0,8000}?<ol[\s\S]*?</ol>)",
        # Pattern 2: Keywords near lists
        r"((?:products?|product\s+line|our\s+products?|platforms?|solutions?|tools?)[\s\S]{0,3000}?<ul[\s\S]*?</ul>)",
        r"((?:products?|product\s+line|our\s+products?|platforms?|solutions?|tools?)[\s\S]{0,3000}?<ol[\s\S]*?</ol>)",
        # Pattern 3: Div containers with product-like content
        r"(<div[^>]*class=[\"'][^\"']*(?:product|platform|solution|tool)[^\"']*[\"'][^>]*>[\s\S]*?</div>)",
        # Pattern 4: Any list with product keywords in nearby text
        r"((?:helium|dash|ai|intelligence|analytics|platform|business|data)[\s\S]{0,2000}?<ul[\s\S]*?</ul>)",
        r"((?:helium|dash|ai|intelligence|analytics|platform|business|data)[\s\S]{0,2000}?<ol[\s\S]*?</ol>)"
    ]
    
    for pattern in product_patterns:
        blocks = re.findall(pattern, html, flags=re.IGNORECASE)
        for block in blocks:
            # Extract list items
            for li in re.findall(r"<li[^>]*>([\s\S]*?)</li>", block, flags=re.IGNORECASE):
                item_text = _extract_text(li)
                if item_text and len(item_text) > 3 and len(item_text) < 200:
                    products.append(item_text[:140])
            # Also look for div/span elements that might be product items
            for div in re.findall(r"<div[^>]*class=[\"'][^\"']*(?:product|platform|solution|tool)[^\"']*[\"'][^>]*>([\s\S]*?)</div>", block, flags=re.IGNORECASE):
                div_text = _extract_text(div)
                if div_text and len(div_text) > 3 and len(div_text) < 200:
                    products.append(div_text[:140])
            if len(products) >= 10:
                break
        if len(products) >= 10:
            break

    # If still no services/products, try to extract from description or body text
    if not services and not products:
        body_text = _extract_text(html)
        # Look for potential services/products in the description
        potential_items = re.findall(r'\b(?:Helium|Dash|AI|analytics|intelligence|platform|business|data|real.?time)\b', body_text, flags=re.IGNORECASE)
        if potential_items:
            services.extend([item for item in set(potential_items) if len(item) > 2])

    # Deduplicate and clean
    def clean_list(items: list[str]) -> list[str]:
        seen: set[str] = set()
        deduped: list[str] = []
        for item in items:
            key = item.lower().strip()
            if key not in seen and len(item.strip()) > 3 and not key.startswith(('http', 'www', '©', 'all rights')):
                seen.add(key)
                deduped.append(item.strip())
        return deduped[:10]  # Return up to 10 items each

    return description, clean_list(services), clean_list(products)


async def _fetch_company_pages(base_url: str) -> dict[str, str]:
    """Fetch multiple pages from a company website to get comprehensive profile data."""
    pages = {}
    
    # Common service/product page paths to try
    service_paths = [
        "/services", "/solutions", "/products", "/offerings", 
        "/capabilities", "/what-we-do", "/our-services",
        "/products-services", "/solutions-services"
    ]
    
    # Also try about/company pages for description
    about_paths = ["/about", "/about-us", "/company", "/who-we-are"]
    
    all_paths = service_paths + about_paths
    
    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
        # Fetch main page first
        try:
            resp = await client.get(base_url)
            if resp.status_code == 200:
                pages["main"] = resp.text
        except Exception as e:
            logger.warning(f"Failed to fetch main page {base_url}: {e}")
        
        # Fetch service/product pages in parallel
        tasks = []
        for path in all_paths:
            url = f"{base_url.rstrip('/')}{path}"
            tasks.append(client.get(url))
        
        try:
            responses = await asyncio.gather(*tasks, return_exceptions=True)
            for i, resp in enumerate(responses):
                if isinstance(resp, Exception):
                    continue
                if resp.status_code == 200:
                    path = all_paths[i]
                    pages[path] = resp.text
        except Exception as e:
            logger.warning(f"Failed to fetch some pages: {e}")
    
    return pages


def _extract_text(html: str) -> str:
    """Very lightweight HTML to text conversion without external deps."""
    # Remove scripts/styles
    html = re.sub(r"<script[\s\S]*?</script>", " ", html, flags=re.IGNORECASE)
    html = re.sub(r"<style[\s\S]*?</style>", " ", html, flags=re.IGNORECASE)
    # Replace breaks and list items with newlines for better sentence splits
    html = re.sub(r"<(?:br|li|p|div|tr|h[1-6])[^>]*>", "\n", html, flags=re.IGNORECASE)
    # Strip tags
    text = re.sub(r"<[^>]+>", " ", html)
    # Collapse whitespace
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _extract_profile_from_html(html: str) -> tuple[str, list[str]]:
    """Extract company description and services from raw HTML.

    - Description: prefer <meta name="description"> or og:description. Fallback to first
      2-4 sentences from the visible text.
    - Services/Products: collect items from lists near headings containing
      'Services', 'Products', 'Solutions', 'Offerings', 'Capabilities', or 'What we do'.
    """
    description = ""
    services: list[str] = []

    # Try meta description first
    meta_desc = re.search(
        r"<meta[^>]+name=[\"']description[\"'][^>]+content=[\"']([^\"']+)[\"']",
        html,
        flags=re.IGNORECASE,
    )
    if not meta_desc:
        meta_desc = re.search(
            r"<meta[^>]+property=[\"']og:description[\"'][^>]+content=[\"']([^\"']+)[\"']",
            html,
            flags=re.IGNORECASE,
        )
    if meta_desc:
        description = meta_desc.group(1).strip()

    # If still no description, grab first couple of sentences from body text
    if not description:
        body_text = _extract_text(html)
        # Split into sentences heuristically
        sentences = re.split(r"(?<=[.!?])\s+", body_text)
        description = " ".join(sentences[:3]).strip()[:600]

    # Enhanced services extraction: find lists near relevant headings
    # Look for more comprehensive patterns
    service_patterns = [
        r"(<h[1-6][^>]*>\s*(?:services|products|solutions|offerings|capabilities|what\s+we\s+do)[^<]*</h[1-6]>[\s\S]{0,5000}?<ul[\s\S]*?</ul>)",
        r"(<h[1-6][^>]*>\s*(?:services|products|solutions|offerings|capabilities|what\s+we\s+do)[^<]*</h[1-6]>[\s\S]{0,5000}?<ol[\s\S]*?</ol>)",
        # Also look for div containers with service-like content
        r"(<div[^>]*class=[\"'][^\"']*(?:service|product|solution|offering)[^\"']*[\"'][^>]*>[\s\S]*?</div>)",
        # Look for any list within 2000 chars of service keywords
        r"((?:services?|products?|solutions?|offerings?|capabilities?)[\s\S]{0,2000}?<ul[\s\S]*?</ul>)",
        r"((?:services?|products?|solutions?|offerings?|capabilities?)[\s\S]{0,2000}?<ol[\s\S]*?</ol>)"
    ]
    
    for pattern in service_patterns:
        blocks = re.findall(pattern, html, flags=re.IGNORECASE)
        for block in blocks:
            # Extract list items
            for li in re.findall(r"<li[^>]*>([\s\S]*?)</li>", block, flags=re.IGNORECASE):
                item_text = _extract_text(li)
                if item_text and len(item_text) > 3:
                    services.append(item_text[:140])
            # Also look for div/span elements that might be service items
            for div in re.findall(r"<div[^>]*class=[\"'][^\"']*(?:service|product|solution|offering)[^\"']*[\"'][^>]*>([\s\S]*?)</div>", block, flags=re.IGNORECASE):
                div_text = _extract_text(div)
                if div_text and len(div_text) > 3:
                    services.append(div_text[:140])
            
            if len(services) >= 8:  # Good amount found
                break
        if len(services) >= 8:
            break

    # Deduplicate and clean
    seen: set[str] = set()
    deduped: list[str] = []
    for s in services:
        key = s.lower().strip()
        if key not in seen and len(s.strip()) > 3 and not key.startswith(('http', 'www')):
            seen.add(key)
            deduped.append(s.strip())

    return description, deduped[:12]  # Return up to 12 items


def _generate_local_prompt(role: str, task: str) -> str:
    """Generate a detailed prompt locally when Tavily API is unavailable"""
    
    # Analyze task complexity
    task_words = len(task.split())
    is_complex_task = task_words > 10 or any(word in task.lower() for word in [
        "comprehensive", "detailed", "complex", "multiple", "various", "several",
        "workflow", "process", "system", "integration", "analysis", "assessment"
    ])
    
    # Role-specific prompt templates with complexity handling
    role_templates = {
        "recruiter": {
            "simple": [
                "As a Recruiter, your task is to {task}. Follow this workflow:",
                "1. First, analyze the job requirements and candidate profile to understand the scope",
                "2. Develop a structured recruitment strategy with clear evaluation criteria",
                "3. Create detailed interview questions and assessment methods",
                "4. Establish communication protocols and follow-up procedures to ensure a smooth hiring process."
            ],
            "complex": [
                "As a Recruiter, you need to {task}. This is a comprehensive task requiring detailed planning and execution. Follow this extensive workflow:",
                "1. Begin with a thorough needs analysis: assess current team structure, identify skill gaps, and understand business objectives",
                "2. Develop a multi-faceted recruitment strategy: create candidate personas, design multiple sourcing channels, and establish evaluation frameworks",
                "3. Implement comprehensive assessment methods: design technical tests, behavioral interviews, case studies, and reference checks",
                "4. Establish robust communication protocols: create candidate journey maps, set up automated follow-ups, and design feedback loops",
                "5. Monitor and optimize the process: track key metrics, gather stakeholder feedback, and continuously improve recruitment efficiency."
            ]
        },
        "hr manager": {
            "simple": [
                "As an HR Manager, your responsibility is to {task}. Execute this approach:",
                "1. Begin by conducting a thorough needs assessment and stakeholder consultation",
                "2. Design and implement comprehensive policies and procedures",
                "3. Establish monitoring systems and performance metrics",
                "4. Ensure compliance with regulations and create documentation for future reference."
            ],
            "complex": [
                "As an HR Manager, you must {task}. This complex task requires strategic thinking and systematic implementation. Execute this comprehensive approach:",
                "1. Conduct extensive stakeholder analysis: identify all affected parties, understand their needs, and assess organizational impact",
                "2. Design comprehensive policies and procedures: create detailed guidelines, establish approval workflows, and define escalation procedures",
                "3. Implement robust monitoring and evaluation systems: set up KPIs, create dashboards, and establish regular review cycles",
                "4. Ensure regulatory compliance and risk management: conduct legal reviews, implement audit trails, and create contingency plans",
                "5. Establish change management protocols: create communication plans, provide training, and monitor adoption rates."
            ]
        },
        "software developer": {
            "simple": [
                "As a Software Developer, you need to {task}. Follow this technical workflow:",
                "1. First, analyze the requirements and create a detailed technical specification",
                "2. Design the system architecture and break down the implementation into manageable tasks",
                "3. Implement the solution following best practices and coding standards",
                "4. Test thoroughly and document your work for maintainability and future development."
            ],
            "complex": [
                "As a Software Developer, you must {task}. This is a complex technical task requiring careful planning and systematic execution. Follow this comprehensive workflow:",
                "1. Conduct thorough requirements analysis: gather detailed specifications, identify edge cases, and understand system constraints and dependencies",
                "2. Design comprehensive system architecture: create detailed technical specifications, design database schemas, plan API structures, and establish security protocols",
                "3. Implement the solution systematically: break down into modular components, follow coding standards, implement error handling, and add comprehensive logging",
                "4. Establish robust testing and quality assurance: create unit tests, integration tests, performance tests, and security tests",
                "5. Document and deploy: create technical documentation, user guides, deployment procedures, and establish monitoring and alerting systems."
            ]
        },
        "data analyst": {
            "simple": [
                "As a Data Analyst, your objective is to {task}. Execute this analytical process:",
                "1. Start by understanding the business question and defining clear objectives",
                "2. Collect and clean relevant data, ensuring quality and completeness",
                "3. Perform exploratory analysis and apply appropriate statistical methods",
                "4. Present findings with actionable insights and recommendations for stakeholders."
            ],
            "complex": [
                "As a Data Analyst, you need to {task}. This complex analytical task requires systematic data exploration and comprehensive analysis. Execute this detailed process:",
                "1. Conduct comprehensive business analysis: understand stakeholder needs, define clear objectives, establish success criteria, and identify key performance indicators",
                "2. Perform extensive data preparation: collect data from multiple sources, assess data quality, implement data cleaning procedures, and create data validation protocols",
                "3. Execute advanced analytical methods: perform exploratory data analysis, apply statistical modeling, conduct hypothesis testing, and implement machine learning algorithms if appropriate",
                "4. Create comprehensive visualizations and reports: develop interactive dashboards, create compelling visualizations, and prepare detailed analytical reports",
                "5. Deliver actionable insights: provide strategic recommendations, establish monitoring frameworks, and create follow-up action plans for stakeholders."
            ]
        },
        "project manager": {
            "simple": [
                "As a Project Manager, you must {task}. Follow this project management methodology:",
                "1. Begin with project initiation and stakeholder identification",
                "2. Create a detailed project plan with timelines, resources, and risk assessments",
                "3. Execute the plan while monitoring progress and managing changes",
                "4. Ensure quality deliverables and conduct thorough project closure with lessons learned."
            ],
            "complex": [
                "As a Project Manager, you need to {task}. This complex project requires comprehensive planning and systematic execution. Follow this detailed methodology:",
                "1. Conduct thorough project initiation: identify all stakeholders, conduct feasibility studies, establish project governance, and create detailed project charters",
                "2. Develop comprehensive project planning: create detailed work breakdown structures, establish resource allocation plans, develop risk management strategies, and create communication plans",
                "3. Execute with systematic monitoring: implement project tracking systems, conduct regular status reviews, manage change requests, and maintain quality control measures",
                "4. Establish stakeholder management: create stakeholder engagement plans, conduct regular progress reviews, manage expectations, and ensure effective communication",
                "5. Conduct thorough project closure: deliver quality outcomes, conduct comprehensive reviews, document lessons learned, and establish post-project support procedures."
            ]
        }
    }
    
    # Find the best matching role template
    role_lower = role.lower()
    template = None
    complexity = "complex" if is_complex_task else "simple"
    
    for key, value in role_templates.items():
        if key in role_lower or any(word in role_lower for word in key.split()):
            template = value[complexity]
            break
    
    # If no specific template found, use a generic one
    if not template:
        if is_complex_task:
            template = [
                f"As a {role}, you must {task}. This complex task requires comprehensive planning and systematic execution. Follow this detailed professional workflow:",
                "1. Begin with thorough analysis: conduct comprehensive needs assessment, identify all stakeholders, understand requirements, and assess current state and constraints",
                "2. Develop detailed planning: create comprehensive strategies, break down into manageable components, establish timelines, and identify required resources",
                "3. Execute systematically: implement solutions step-by-step, maintain quality standards, monitor progress, and adapt plans as needed",
                "4. Establish monitoring and control: implement tracking systems, create performance metrics, establish review cycles, and maintain documentation",
                "5. Ensure continuous improvement: gather feedback, analyze results, identify areas for enhancement, and implement improvements for future iterations."
            ]
        else:
            template = [
                f"As a {role}, your task is to {task}. Follow this professional workflow:",
                "1. First, analyze the current situation and identify key requirements and constraints",
                "2. Develop a comprehensive plan with clear objectives and success criteria",
                "3. Execute the plan systematically while maintaining quality standards",
                "4. Monitor progress, adapt as needed, and document outcomes for future reference."
            ]
    
    # Format the prompt
    prompt_lines = []
    for i, line in enumerate(template):
        if i == 0:
            prompt_lines.append(line.format(task=task))
        else:
            prompt_lines.append(line)
    
    return "\n".join(prompt_lines)


def _append_audit_log(entry: Dict[str, Any]) -> None:
    try:
        path = os.path.join(os.path.dirname(__file__), "generated_prompts.json")
        # Append as JSON Lines for simple auditing
        with open(path, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    except Exception as e:
        # Non-fatal
        logger.warning(f"Failed writing generated_prompts.json: {e}")


@router.get("/get_prompts/", response_model=RolePromptsResponse | TaskPromptResponse)
async def get_prompts(
    role: str = Query(..., description="HR role, e.g., Recruiter, HR Manager"),
    task: Optional[str] = Query(
        default=None,
        description="Optional task key, e.g., resume_screening, job_description",
    ),
):
    """
    Fetch dynamic prompts for a given HR role (and optional task) using Tavily.

    UI integration hints:
    - Call `/api/get_prompts/?role=<ROLE>&task=<TASK?>`.
    - If `task` is omitted, the response contains a `prompts` mapping of task->prompt.
    - If `task` is provided, the response contains a single `prompt` string for that task.

    Example (task provided):
    {
      "role": "Recruiter",
      "task": "resume_screening",
      "prompt": "Dynamically generated prompt for screening resumes"
    }

    Example (only role provided):
    {
      "role": "Recruiter",
      "prompts": {
        "resume_screening": "Prompt for screening resumes",
        "job_description": "Prompt for creating job description",
        "interview_questions": "Prompt for interview questions"
      }
    }
    """

    role_clean = role.strip()
    if not role_clean:
        raise HTTPException(status_code=400, detail="Role must not be empty")

    cache_key = f"prompts:{role_clean}:{task or '*'}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    if task:
        # Create a more specific and detailed prompt request
        try:
            # Try to get prompt from Tavily first
            # Analyze task complexity to request appropriate detail level
            task_words = len(task.split())
            is_complex_task = task_words > 10 or any(word in task.lower() for word in [
                "comprehensive", "detailed", "complex", "multiple", "various", "several",
                "workflow", "process", "system", "integration", "analysis", "assessment"
            ])
            
            if is_complex_task:
                query = (
                    f"Create a comprehensive, detailed prompt for a {role_clean} professional. "
                    f"Task: {task}. "
                    "This is a complex task requiring detailed workflow explanation. "
                    "Requirements: "
                    "1. The prompt should be 5-6 lines long with comprehensive detail "
                    "2. Explain the complete workflow with multiple steps and considerations "
                    "3. Include specific technical or professional details relevant to the role "
                    "4. Address potential challenges and provide guidance on best practices "
                    "5. Start directly with the prompt content - no introductions or prefixes "
                    "6. Focus on practical, actionable guidance with clear step-by-step instructions "
                    "Return ONLY the prompt text, no explanations or meta-commentary."
                )
            else:
                query = (
                    f"Create a detailed, actionable prompt for a {role_clean} professional. "
                    f"Task: {task}. "
                    "Requirements: "
                    "1. The prompt should be 3-4 lines long and detailed "
                    "2. Explain the workflow and steps to follow "
                    "3. Be specific to the given role and task "
                    "4. Start directly with the prompt content - no introductions or prefixes "
                    "5. Focus on practical, actionable guidance "
                    "Return ONLY the prompt text, no explanations or meta-commentary."
                )
            
            answer = await _call_tavily(query)
            logger.info(f"Successfully received prompt from Tavily: {answer[:200]}...")
            
            # Clean the response to remove any unwanted content
            prompt_text = answer.strip().strip("` ")
            original_text = prompt_text
            
            # Define all possible unwanted patterns (case-insensitive)
            unwanted_patterns = [
                "as an ai system built by a team of inventors at amazon",
                "as an ai system built by a team of inventors at amazon, i recommend this prompt:",
                "as an ai system built by a team of inventors at amazon,",
                "i recommend this prompt:",
                "here's a prompt for you:",
                "here's what i recommend:",
                "my recommendation:",
                "i recommend:",
                "here's the prompt:",
                "the prompt is:",
                "prompt:",
                "here's a prompt:",
                "this is the prompt:",
                "ai assistant:",
                "ai system:",
                "amazon ai:",
            ]
            
            # Remove unwanted patterns from anywhere in the text
            for pattern in unwanted_patterns:
                pattern_lower = pattern.lower()
                text_lower = prompt_text.lower()
                
                if pattern_lower in text_lower:
                    # Find the pattern in the original text (case-insensitive)
                    start_idx = text_lower.find(pattern_lower)
                    if start_idx != -1:
                        # Remove the pattern and everything before it
                        prompt_text = prompt_text[start_idx + len(pattern):].strip()
                        logger.info(f"Removed pattern: '{pattern}'")
                        break
            
            # Additional cleanup for any remaining Amazon-related content
            if "amazon" in prompt_text.lower():
                # Look for the actual prompt content after any remaining Amazon text
                amazon_indicators = [
                    "i recommend this prompt:",
                    "i recommend:",
                    "here's what i recommend:",
                    "my recommendation:",
                    "the prompt is:",
                    "here's the prompt:",
                ]
                
                for indicator in amazon_indicators:
                    if indicator in prompt_text.lower():
                        start_idx = prompt_text.lower().find(indicator) + len(indicator)
                        prompt_text = prompt_text[start_idx:].strip()
                        logger.info(f"Removed Amazon indicator: '{indicator}'")
                        break
            
            # Final cleanup - remove quotes, extra formatting, and ensure proper length
            prompt_text = prompt_text.strip('"').strip("'").strip()
            
            # If the prompt is still too short or contains unwanted content, use local fallback
            if len(prompt_text) < 100 or any(unwanted in prompt_text.lower() for unwanted in ["amazon", "ai system", "recommend"]):
                logger.info("Tavily response contained unwanted content, using local fallback")
                prompt_text = _generate_local_prompt(role_clean, task)
            
        except Exception as e:
            # If Tavily fails completely, use local fallback
            logger.warning(f"Tavily API failed, using local fallback: {e}")
            prompt_text = _generate_local_prompt(role_clean, task)
        
        # Log the final result
        logger.info(f"Final prompt generated: {prompt_text[:200]}...")
        
        result: TaskPromptResponse | RolePromptsResponse = TaskPromptResponse(
            role=role_clean, task=task, prompt=prompt_text
        )
    else:
        # Ask Tavily for a JSON mapping of common tasks -> prompts
        query = (
            "For the given HR role, produce a JSON object where keys are common task names in snake_case "
            "(e.g., resume_screening, job_description, interview_questions) and values are concise, high-quality prompts. "
            f"Role: '{role_clean}'. Return JSON only, no markdown or commentary."
        )
        answer = await _call_tavily(query)

        # Try to parse the answer as JSON
        prompts_map: Dict[str, str] = {}
        try:
            prompts_map = json.loads(answer)
            if not isinstance(prompts_map, dict):
                raise ValueError("Parsed JSON is not an object")
            # Coerce all values to strings
            prompts_map = {str(k): str(v) for k, v in prompts_map.items()}
        except Exception:
            # Fallback: create a single prompt bucket
            prompts_map = {
                "general": answer.strip().strip("` ")
            }

        result = RolePromptsResponse(role=role_clean, prompts=prompts_map)

    cache.set(cache_key, result)

    # Audit log (best-effort)
    _append_audit_log(
        {
            "ts": int(time.time()),
            "role": role_clean,
            "task": task,
            "result": json.loads(result.model_dump_json()),
        }
    )

    return result


@router.get("/get_prompts_multi/", response_model=TaskPromptsResponse)
async def get_prompts_multi(
    role: str = Query(..., description="HR role, e.g., Recruiter, HR Manager"),
    task: str = Query(..., description="Task key or description"),
    n: int = Query(default=3, ge=2, le=10, description="Number of prompt variants to generate"),
):
    """Return multiple prompt variants for a role+task.

    Tries Tavily first with an instruction to produce N distinct, high-quality, concise prompts.
    If Tavily fails, falls back to locally generated variations.
    """
    role_clean = role.strip()
    task_clean = task.strip()
    if not role_clean or not task_clean:
        raise HTTPException(status_code=400, detail="Role and task must not be empty")

    # Try Tavily to generate multiple prompts in a structured way
    try:
        query = (
            f"Create {n} distinct, high-quality prompts for a {role_clean} to perform the task: {task_clean}. "
            "Each prompt MUST be clearly different, from different perspectives such as: security, developer experience, performance/scalability, testing/quality, observability/operations, or integrations. "
            "Format EACH prompt as 4-5 lines: the first line sets the objective; the next lines are numbered steps (1., 2., 3., 4., 5.). "
            "Do NOT repeat the same generic steps across prompts; steps must be specific to the perspective. "
            "Return ONLY a JSON array of strings (each string is one multi-line prompt)."
        )
        answer = await _call_tavily(query)
        prompts: list[str] = []
        try:
            parsed = json.loads(answer)
            if isinstance(parsed, list):
                prompts = [str(p).strip() for p in parsed if str(p).strip()]
            elif isinstance(parsed, dict) and "prompts" in parsed and isinstance(parsed["prompts"], list):
                prompts = [str(p).strip() for p in parsed["prompts"] if str(p).strip()]
        except Exception:
            # Heuristic split if JSON parsing failed
            parts = [p.strip(" -\n\t") for p in re.split(r"\n+|\|\|", answer) if p.strip()]
            prompts = [p for p in parts if len(p) > 10]

        # Guardrails + enforce 4-5 lines each
        prompts = prompts[:n] if prompts else []
        prompts = [_ensure_prompt_lines(p, role_clean, task_clean, index=i) for i, p in enumerate(prompts)]

        # Deduplicate; if duplicates remain, top up with local variants
        seen: set[str] = set()
        unique_prompts: list[str] = []
        for p in prompts:
            key = p.strip().lower()
            if key not in seen:
                seen.add(key)
                unique_prompts.append(p)
        prompts = unique_prompts
        if len(prompts) < n:
            # Top up with local variants
            needed = n - len(prompts)
            prompts.extend(_generate_local_prompt_variants(role_clean, task_clean, needed))

        return TaskPromptsResponse(role=role_clean, task=task_clean, prompts=prompts[:n])

    except Exception as e:
        logger.warning(f"Multi-prompt Tavily generation failed: {e}")
        # Local fallback with variants
        prompts = _generate_local_prompt_variants(role_clean, task_clean, n)
        return TaskPromptsResponse(role=role_clean, task=task_clean, prompts=prompts)


def _generate_local_prompt_variants(role: str, task: str, n: int) -> list[str]:
    """Produce n locally generated prompt variations with meaningfully different emphases.

    Each prompt is 4–5 lines and tailored to a specific perspective so that
    the resulting steps differ materially from each other.
    """
    themes = [
        {
            "title": "Security-first implementation",
            "bullets": [
                "Define authentication flows and threat model (OWASP, token lifetimes, rotation).",
                "Design data model and secrets handling (hashing, salting, KMS/env separation).",
                "Implement endpoints with strict validation, RBAC/ABAC, and rate limiting.",
                "Add auditing, structured logs, and security tests (negative paths, fuzzing).",
                "Document security controls, incident steps, and playbooks.",
            ],
        },
        {
            "title": "DX and maintainability",
            "bullets": [
                "Capture API requirements and produce an OpenAPI spec with examples.",
                "Establish layered architecture, dependency boundaries, and naming conventions.",
                "Generate scaffolding, linters, and pre-commit hooks; adopt typed interfaces.",
                "Write integration/contract tests with mocked providers and seed data.",
                "Create developer docs, runbooks, and local recipes for fast onboarding.",
            ],
        },
        {
            "title": "Performance and scalability",
            "bullets": [
                "Define SLAs and load targets; model throughput and latency budgets.",
                "Select cache strategy (session/refresh), indexes, and connection pooling.",
                "Implement idempotent endpoints, pagination, and bulk operations.",
                "Add metrics, tracing, and stress tests with realistic concurrency.",
                "Plan horizontal scaling and rollout with health checks and canaries.",
            ],
        },
        {
            "title": "Testing and quality",
            "bullets": [
                "Break down acceptance criteria and edge cases for the task.",
                "Create unit, integration, and e2e tests covering success and failure paths.",
                "Set up test data factories and deterministic seeds for repeatability.",
                "Enable CI with coverage gates and flaky-test quarantine.",
                "Add regression checks and API contract verification.",
            ],
        },
        {
            "title": "Observability and operations",
            "bullets": [
                "Instrument endpoints with structured logs and trace spans (request ids).",
                "Expose health/metrics; add dashboards for auth rates, errors, latency.",
                "Implement alert thresholds and runbooks for common failures.",
                "Create rollout plan, migration steps, and reversible changes.",
                "Document SLOs and on-call procedures for the service.",
            ],
        },
        {
            "title": "Extensibility and integrations",
            "bullets": [
                "Map future auth providers (OAuth2, SAML, OTP) and abstraction points.",
                "Design provider-agnostic interfaces and configuration strategy.",
                "Implement feature flags and migration-friendly storage for identities.",
                "Validate flows with sandbox credentials and contract tests.",
                "Outline roadmap and risks for adding providers safely.",
            ],
        },
    ]

    variants: list[str] = []
    for t in themes:
        header = f"As a {role}, you need to {task}. {t['title']} approach:" \
            if not t["title"].lower().startswith("as a") else t["title"]
        lines = [
            header,
            f"1. {t['bullets'][0]}",
            f"2. {t['bullets'][1]}",
            f"3. {t['bullets'][2]}",
            f"4. {t['bullets'][3]}",
        ]
        # Optionally add fifth line if available
        if len(t["bullets"]) > 4:
            lines.append(f"5. {t['bullets'][4]}")
        variants.append("\n".join(lines))
        if len(variants) >= n:
            break

    # Ensure 4–5 lines and deduplicate
    variants = [_ensure_prompt_lines(v, role, task) for v in variants]
    seen: set[str] = set()
    unique: list[str] = []
    for v in variants:
        key = v.strip().lower()
        if key not in seen:
            seen.add(key)
            unique.append(v.strip())
        if len(unique) >= n:
            break

    return unique


def _ensure_prompt_lines(text: str, role: str, task: str, index: int | None = None) -> str:
    """Ensure prompt is formatted as 4-5 lines. If too short, expand using local template."""
    # Normalize newlines
    cleaned = text.strip().strip('`')
    lines = [l.strip() for l in cleaned.splitlines() if l.strip()]
    if len(lines) >= 4:
        # Ensure numbering 1., 2., 3., 4. are on their own lines
        normalized: list[str] = []
        for l in lines[:5]:
            m = re.match(r"^(?:\d+[\.)]\s+)?(.*)$", l)
            body = (m.group(1) if m else l).strip()
            normalized.append(body)
        numbered = [
            f"1. {normalized[0]}",
            f"2. {normalized[1] if len(normalized) > 1 else normalized[0]}",
            f"3. {normalized[2] if len(normalized) > 2 else normalized[0]}",
            f"4. {normalized[3] if len(normalized) > 3 else normalized[0]}",
        ]
        if len(normalized) > 4:
            numbered.append(f"5. {normalized[4]}")
        return "\n".join(numbered)

    # If the text is one-liner, embed into a structured multi-line workflow
    base = _generate_local_prompt(role, task)
    base_lines = [l.strip() for l in base.splitlines() if l.strip()]
    # Replace first line with a synthesized objective using original text
    first = lines[0] if lines else f"As a {role}, your task is to {task}."
    # Apply a slight variation based on index to make steps differ
    variations = [
        "Focus on scope, constraints, and acceptance criteria.",
        "Identify data models, interfaces, and error semantics.",
        "Choose frameworks, libraries, and dependency boundaries.",
        "Plan observability, metrics, and deployment strategy.",
        "Mitigate risks and outline rollback procedures.",
    ]
    v = variations[(index or 0) % len(variations)]
    synthesized = [first]
    # Convert base steps to numbered points and inject variation in step 1
    numbered = []
    for i, step in enumerate(base_lines[1:6], start=1):
        body = re.sub(r"^\d+[\.)]\s+", "", step).strip()
        if i == 1:
            body = f"{body} {v}"
        numbered.append(f"{i}. {body}")
    return "\n".join(numbered[:5])


@router.get("/test_company_profile/")
async def test_company_profile():
    """Test endpoint to verify company profile extraction is working"""
    test_url = "https://he2.ai"
    test_name = "Neural Arc Inc"
    
    try:
        # Test simple HTTP request
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            resp = await client.get(test_url)
            if resp.status_code == 200:
                html = resp.text
                
                # Extract basic info
                description = ""
                title_match = re.search(r"<title[^>]*>([^<]+)</title>", html, flags=re.IGNORECASE)
                if title_match:
                    title = title_match.group(1).strip()
                    description = f"Company website: {title}"
                
                meta_desc = re.search(
                    r"<meta[^>]+name=[\"']description[\"'][^>]+content=[\"']([^\"']+)[\"']",
                    html,
                    flags=re.IGNORECASE,
                )
                if meta_desc:
                    description = meta_desc.group(1).strip()
                
                return {
                    "status": "success",
                    "url": test_url,
                    "name": test_name,
                    "description": description,
                    "html_length": len(html),
                    "has_title": bool(title_match),
                    "has_meta_description": bool(meta_desc)
                }
            else:
                return {
                    "status": "error",
                    "message": f"HTTP {resp.status_code}",
                    "url": test_url
                }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "url": test_url
        }


@router.get("/company_profile/", response_model=CompanyProfileResponse)
async def get_company_profile(
    url: str = Query(..., description="Company website URL"),
    name: Optional[str] = Query(default=None, description="Optional company name"),
):
    """
    Fetch a company's profile using Tavily given a website URL (and optional name).

    Returns a structured object with description and services/products.
    """
    logger.info(f"Company profile request - URL: {url}, Name: {name}")
    """
    Fetch a company's profile using Tavily given a website URL (and optional name).

    Returns a structured object with description and services/products.
    """
    url_clean = url.strip()
    if not url_clean:
        raise HTTPException(status_code=400, detail="Website URL must not be empty")
    
    # Check if Tavily API key is configured
    tavily_key = os.getenv("TAVILY_API_KEY")
    if not tavily_key:
        logger.warning("TAVILY_API_KEY not configured, will use fallback scraping")
    else:
        logger.info("TAVILY_API_KEY is configured")

    query = (
        "Extract company details for " + (name or "the company") + " (" + url_clean + ").\n\n"
        "Return ONLY valid JSON with these keys:\n\n"
        "{\n"
        '  "company_description": "Brief overview of the company (if not available, use \'description\' key)",\n'
        '  "services": ["List of services"],\n'
        '  "products": ["List of products"]\n'
        "}\n\n"
        "Rules:\n"
        "- Always provide \"company_description\". If website/meta info is missing, infer from trusted sources.\n"
        "- If you only find 'description', still map it to \"company_description\".\n"
        "- For services/products: check /services, /solutions, /products, /offerings, /what-we-do.\n"
        "- If not found, return empty arrays but do not skip the keys."
    )

    try:
        logger.info(f"Attempting Tavily API call for URL: {url_clean}")
        data = await _call_tavily_json(query)
        logger.info(f"RAW Tavily response: {data}")
        
        description = str(data.get("company_description") or "").strip()
        services = data.get("services", [])
        products = data.get("products", [])
        
        logger.info(f"Extracted description: '{description}'")
        logger.info(f"Extracted services: {services}")
        logger.info(f"Extracted products: {products}")
        
        # Ensure lists
        if not isinstance(services, list):
            services = []
        if not isinstance(products, list):
            products = []
            
        # Clean and validate items
        services = [str(x).strip() for x in services if str(x).strip()]
        products = [str(x).strip() for x in products if str(x).strip()]
        
        logger.info(f"Final description length: {len(description)}")
        logger.info(f"Final services count: {len(services)}")
        logger.info(f"Final products count: {len(products)}")
        
        if not description and not services and not products:
            logger.warning("All fields are empty, raising ValueError")
            raise ValueError("Empty profile")
        
        logger.info("Tavily extraction successful, returning response")
        return CompanyProfileResponse(
            company_name=name,
            website_url=url_clean,
            company_description=description,
            services=services,
            products=products,
        )
    except Exception as e:
        logger.warning(f"Company profile fetch via Tavily failed, attempting direct scrape: {e}")
        # Fallback: Fetch multiple pages and extract comprehensive profile
        try:
            logger.info("Starting fallback direct scraping...")
            # Fetch multiple pages for comprehensive data
            pages = await _fetch_company_pages(url_clean)
            
            logger.info(f"Fetched pages: {list(pages.keys())}")
            
            if not pages:
                logger.warning("No pages fetched, raising ValueError")
                raise ValueError("Failed to fetch any pages")
            
            # Extract from main page first
            main_html = pages.get("main", "")
            logger.info(f"Main page HTML length: {len(main_html)}")
            description, services, products = _extract_profile_from_html_enhanced(main_html)
            logger.info(f"Extracted from main page - description: '{description[:100]}...', services: {len(services)}, products: {len(products)}")
            
            # Try to infer name from HTML if not provided
            inferred_name = name
            if not inferred_name and main_html:
                m = re.search(r"<meta[^>]+property=\"og:site_name\"[^>]+content=\"([^\"]+)\"", main_html, flags=re.IGNORECASE)
                if not m:
                    m = re.search(r"<title[^>]*>([^<]+)</title>", main_html, flags=re.IGNORECASE)
                if m:
                    inferred_name = re.sub(r"\s+\|.*$", "", m.group(1)).strip()
            
            # If we don't have enough services from main page, try service pages
            if len(services) < 3:
                for path, html_content in pages.items():
                    if path in ["/services", "/solutions", "/offerings"]:
                        _, page_services, _ = _extract_profile_from_html_enhanced(html_content)
                        services.extend(page_services)
                        if len(services) >= 6:  # Good amount found
                            break
            
            # If we don't have enough products from main page, try product pages
            if len(products) < 3:
                for path, html_content in pages.items():
                    if path in ["/products", "/product"]:
                        _, _, page_products = _extract_profile_from_html_enhanced(html_content)
                        products.extend(page_products)
                        if len(products) >= 6:  # Good amount found
                            break
            
            # Deduplicate final services and products lists
            def deduplicate_list(items: list[str]) -> list[str]:
                seen: set[str] = set()
                deduped: list[str] = []
                for item in items:
                    key = item.lower().strip()
                    if key not in seen and len(item.strip()) > 3:
                        seen.add(key)
                        deduped.append(item.strip())
                return deduped[:8]  # Limit to 8 items each
            
            final_services = deduplicate_list(services)
            final_products = deduplicate_list(products)
            
            # If still no description, try about pages
            if not description:
                for path, html_content in pages.items():
                    if path in ["/about", "/about-us", "/company"]:
                        about_desc, _, _ = _extract_profile_from_html_enhanced(html_content)
                        if about_desc:
                            description = about_desc
                            break
            
            logger.info(f"Final result - description: '{description[:100]}...', services: {len(final_services)}, products: {len(final_products)}")
            return CompanyProfileResponse(
                company_name=inferred_name,
                website_url=url_clean,
                company_description=description or "",
                services=final_services,
                products=final_products,
            )
        except Exception as e2:
            logger.warning(f"Direct scrape fallback failed: {e2}")
            
            # Final fallback: Try simple HTTP request
            try:
                logger.info("Attempting simple HTTP fallback...")
                async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                    resp = await client.get(url_clean)
                    if resp.status_code == 200:
                        html = resp.text
                        
                        # Extract basic info
                        description = ""
                        services = []
                        products = []
                        
                        # Try to get title
                        title_match = re.search(r"<title[^>]*>([^<]+)</title>", html, flags=re.IGNORECASE)
                        if title_match:
                            title = title_match.group(1).strip()
                            description = f"Company website: {title}"
                        
                        # Try to get meta description
                        meta_desc = re.search(
                            r"<meta[^>]+name=[\"']description[\"'][^>]+content=[\"']([^\"']+)[\"']",
                            html,
                            flags=re.IGNORECASE,
                        )
                        if meta_desc:
                            description = meta_desc.group(1).strip()
                        
                        # If we got something, return it
                        if description:
                            logger.info(f"Simple fallback successful - description: {description[:100]}...")
                            return CompanyProfileResponse(
                                company_name=name,
                                website_url=url_clean,
                                company_description=description,
                                services=services,
                                products=products,
                            )
            except Exception as e3:
                logger.warning(f"Simple HTTP fallback also failed: {e3}")
            
            # Ultimate fallback: minimal response
            logger.warning("All extraction methods failed, returning minimal response")
        return CompanyProfileResponse(
            company_name=name,
            website_url=url_clean,
            company_description="Description currently unavailable.",
                services=[],
                products=[],
        )


