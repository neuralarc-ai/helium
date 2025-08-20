"""
Dynamic Model Orchestration Service

This module provides intelligent routing between agents and LLM models based on:
1. User prompt analysis (vision, code, reasoning, creative tasks)
2. Dynamic model availability based on credentials
3. Agent capabilities and tool support
4. Intelligent model ranking by task type

Key Features:
- Dynamic model categorization instead of hardcoded lists
- Automatic credential checking and model filtering
- Task-specific model selection (vision, code, reasoning, creative)
- Comprehensive logging for debugging and monitoring
- Fallback mechanisms for robust operation

The system automatically adapts to:
- Available API credentials (AWS, OpenAI, Anthropic, Google)
- User subscription tiers and model access
- Current model availability and performance characteristics
"""

from __future__ import annotations

import asyncio
import json
from typing import Any, Dict, List, Optional, Tuple

from utils.logger import logger
from utils.config import config
from utils.constants import MODEL_NAME_ALIASES
from services.llm import make_llm_api_call
from services.billing import get_allowed_models_for_user
from agent.config_helper import extract_agent_config


def _check_credentials_for_models(allowed_models: List[str]) -> Tuple[List[str], Dict[str, str]]:
    """
    Check which models have required credentials and filter accordingly.
    Returns (filtered_models, credential_status)
    """
    if not allowed_models:
        return [], {}
    
    filtered_models = allowed_models.copy()
    credential_status = {}
    
    # Check AWS Bedrock credentials
    has_bedrock_creds = bool(
        config.AWS_ACCESS_KEY_ID and 
        config.AWS_SECRET_ACCESS_KEY and 
        config.AWS_REGION_NAME
    )
    
    if not has_bedrock_creds:
        bedrock_models = [m for m in filtered_models if m.startswith("bedrock/")]
        filtered_models = [m for m in filtered_models if not m.startswith("bedrock/")]
        for model in bedrock_models:
            credential_status[model] = "missing_aws_credentials"
        
        if bedrock_models:
            logger.info(f"[CREDENTIALS] AWS Bedrock credentials missing - filtered out {len(bedrock_models)} models")
    
    # Check OpenAI credentials
    has_openai_creds = bool(config.OPENAI_API_KEY)
    if not has_openai_creds:
        openai_models = [m for m in filtered_models if m.startswith("openai/")]
        filtered_models = [m for m in filtered_models if not m.startswith("openai/")]
        for model in openai_models:
            credential_status[model] = "missing_openai_credentials"
        
        if openai_models:
            logger.info(f"[CREDENTIALS] OpenAI API key missing - filtered out {len(openai_models)} models")
    
    # Check Anthropic credentials
    has_anthropic_creds = bool(config.ANTHROPIC_API_KEY)
    if not has_anthropic_creds:
        anthropic_models = [m for m in filtered_models if m.startswith("anthropic/")]
        filtered_models = [m for m in filtered_models if not m.startswith("anthropic/")]
        for model in anthropic_models:
            credential_status[model] = "missing_anthropic_credentials"
        
        if anthropic_models:
            logger.info(f"[CREDENTIALS] Anthropic API key missing - filtered out {len(anthropic_models)} models")
    
    # Check Google credentials
    has_google_creds = bool(config.GOOGLE_API_KEY)
    if not has_google_creds:
        google_models = [m for m in filtered_models if m.startswith("gemini/") or "gemini" in m.lower()]
        filtered_models = [m for m in filtered_models if not (m.startswith("gemini/") or "gemini" in m.lower())]
        for model in google_models:
            credential_status[model] = "missing_google_credentials"
        
        if google_models:
            logger.info(f"[CREDENTIALS] Google API key missing - filtered out {len(google_models)} models")
    
    # OpenRouter models typically don't need additional credentials beyond what's configured
    # They're usually accessible via the OpenRouter API key
    
    logger.info(f"[CREDENTIALS] Credential check complete - {len(filtered_models)} models available out of {len(allowed_models)}")
    
    return filtered_models, credential_status


def _get_available_models_for_prompt() -> List[str]:
    """
    Get all available models that can be used for prompt processing.
    This provides a dynamic list instead of hardcoded model names.
    """
    try:
        # Get all models from MODEL_NAME_ALIASES
        all_models = list(MODEL_NAME_ALIASES.values())
        
        if not all_models:
            logger.warning("[MODELS] No models found in MODEL_NAME_ALIASES")
            return []
        
        # Filter based on current credential availability
        available_models = []
        
        for model in all_models:
            if not isinstance(model, str):
                continue
                
            model_lower = model.lower()
            
            # Check if model requires specific credentials
            if model.startswith("bedrock/"):
                if config.AWS_ACCESS_KEY_ID and config.AWS_SECRET_ACCESS_KEY and config.AWS_REGION_NAME:
                    available_models.append(model)
            elif model.startswith("openai/"):
                if config.OPENAI_API_KEY:
                    available_models.append(model)
            elif model.startswith("anthropic/"):
                if config.ANTHROPIC_API_KEY:
                    available_models.append(model)
            elif "gemini" in model_lower:
                if config.GOOGLE_API_KEY:
                    available_models.append(model)
            else:
                # OpenRouter and other models are generally available
                available_models.append(model)
        
        logger.debug(f"[MODELS] Found {len(available_models)} available models out of {len(all_models)} total")
        return available_models
        
    except Exception as e:
        logger.error(f"[MODELS] Error getting available models: {e}", exc_info=True)
        return []


async def _get_latest_user_prompt(client, thread_id: str, wait_ms: int = 1200) -> Optional[str]:
    """Fetch the latest user message content for a thread, with a short wait to
    accommodate front-end parallel calls that add a message and start the agent.
    """
    remaining = max(0, wait_ms)
    step = 150
    while True:
        try:
            result = await client.table('messages').select('content').eq('thread_id', thread_id).eq('type', 'user').order('created_at', desc=True).limit(1).execute()
            if result.data:
                content_obj = result.data[0]['content']
                # content can be dict or JSON string
                if isinstance(content_obj, str):
                    try:
                        content_obj = json.loads(content_obj)
                    except Exception:
                        pass
                if isinstance(content_obj, dict):
                    return content_obj.get('content') or content_obj.get('text')
                if isinstance(content_obj, str):
                    return content_obj
        except Exception as e:
            logger.debug(f"Failed to fetch latest user prompt for thread {thread_id}: {e}")

        if remaining <= 0:
            return None
        await asyncio.sleep(step / 1000.0)
        remaining -= step


def _summarize_agent_capabilities(agent_config: Dict[str, Any]) -> str:
    """
    Create a comprehensive summary of agent capabilities using the actual database schema.
    This enhanced summary helps the LLM make better agent selection decisions.
    """
    if not agent_config:
        return "Unknown Agent: No configuration available"
    
    name = agent_config.get('name', 'Unnamed')
    description = agent_config.get('description') or ''
    
    # Extract tools information from the actual schema
    tools = agent_config.get('agentpress_tools') or {}
    tool_names = []
    if isinstance(tools, dict):
        tool_names = [n for n, v in tools.items() if isinstance(v, dict) and v.get('enabled')]
    
    # Extract MCP information from the actual schema
    mcp = agent_config.get('configured_mcps') or []
    custom_mcp = agent_config.get('custom_mcps') or []
    
    # Extract additional metadata fields that actually exist in the database
    tags = agent_config.get('tags') or []
    metadata = agent_config.get('metadata') or {}
    
    # Build comprehensive capability summary
    caps = []
    
    # Basic capabilities
    if tool_names:
        caps.append(f"tools: {', '.join(tool_names[:8])}")
    if mcp and isinstance(mcp, list):
        mcp_names = [m.get('name', '') for m in mcp if isinstance(m, dict)]
        if mcp_names:
            caps.append(f"mcp: {', '.join(mcp_names[:6])}")
    if custom_mcp and isinstance(custom_mcp, list):
        custom_mcp_names = [m.get('name', '') for m in custom_mcp if isinstance(m, dict)]
        if custom_mcp_names:
            caps.append(f"custom_mcp: {', '.join(custom_mcp_names[:6])}")
    
    # Enhanced metadata from actual database fields
    if tags and isinstance(tags, list):
        # Convert tags to string if they're objects, otherwise use as-is
        tag_names = []
        for tag in tags[:6]:  # Limit to 6 tags for readability
            if isinstance(tag, dict):
                tag_names.append(tag.get('name', str(tag)))
            else:
                tag_names.append(str(tag))
        if tag_names:
            caps.append(f"tags: {', '.join(tag_names)}")
    
    # Include key metadata fields that might be relevant
    if metadata and isinstance(metadata, dict):
        # Extract relevant metadata fields that actually exist
        relevant_metadata = []
        metadata_fields = ['is_suna_default', 'centrally_managed', 'management_version']
        
        for field in metadata_fields:
            if field in metadata and metadata[field]:
                relevant_metadata.append(f"{field}: {metadata[field]}")
        
        if relevant_metadata:
            caps.append(f"metadata: {', '.join(relevant_metadata[:3])}")  # Limit to 3 metadata fields
    
    # Include template information if available
    template_info = agent_config.get('template_info') or {}
    if template_info and isinstance(template_info, dict):
        template_details = []
        
        if template_info.get('template_name'):
            template_details.append(f"template: {template_info['template_name']}")
        
        if template_info.get('template_version'):
            template_details.append(f"v{template_info['template_version']}")
        
        # Include relevant template metadata from actual schema
        template_metadata_fields = [
            'template_is_public', 'template_download_count', 'template_is_kortix_team'
        ]
        
        for field in template_metadata_fields:
            if field in template_info and template_info[field]:
                # Clean up field name for display
                display_name = field.replace('template_', '')
                template_details.append(f"{display_name}: {template_info[field]}")
        
        if template_details:
            caps.append(f"template: {', '.join(template_details[:4])}")  # Limit to 4 template details
    
    # Include usage statistics if available
    download_count = agent_config.get('download_count')
    if download_count is not None and download_count > 0:
        caps.append(f"downloads: {download_count}")
    
    # Include public status if available
    is_public = agent_config.get('is_public')
    if is_public is not None:
        caps.append(f"public: {is_public}")
    
    # Combine all capabilities
    caps_str = '; '.join([c for c in caps if c])
    
    # Create the final summary
    summary = f"{name}: {description[:160]}"
    if caps_str:
        summary += f" ({caps_str})"
    
    return summary.strip()


def _extract_agent_template_info(agent: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract additional information from agent templates using the actual database schema.
    Template info is stored in the metadata field when agents are created from templates.
    """
    if not agent:
        return {}
    
    template_info = {}
    
    # Extract template-related fields from metadata (where they're actually stored)
    metadata = agent.get('metadata') or {}
    
    if not isinstance(metadata, dict):
        return template_info
    
    # Check if this agent was created from a template
    created_from_template = metadata.get('created_from_template')
    template_name = metadata.get('template_name')
    
    if created_from_template:
        template_info['template_id'] = created_from_template
    if template_name:
        template_info['template_name'] = template_name
    
    # Extract additional template metadata if available
    if metadata:
        # Include relevant template metadata fields that might be in metadata
        relevant_template_fields = [
            'template_version', 'template_is_public', 'template_download_count', 
            'template_is_kortix_team', 'template_marketplace_published_at'
        ]
        
        for field in relevant_template_fields:
            if field in metadata and metadata[field]:
                template_info[field] = metadata[field]
    
    return template_info


async def _classify_best_agent(
    client,
    account_id: str,
    prompt: str,
    classification_model: Optional[str] = None,
    max_agents: int = 12,
) -> Tuple[Optional[Dict[str, Any]], Dict[str, Any]]:
    """Ask the default LLM to select the best matching agent for the prompt.

    Returns (agent_config or None, debug_metadata)
    """
    if not account_id or not prompt:
        logger.warning(f"[ROUTER] Invalid parameters for agent classification: account_id={account_id}, prompt_length={len(prompt) if prompt else 0}")
        return None, {"reason": "invalid_parameters"}
    
    logger.info(f"[ROUTER] Starting agent classification: account={account_id}, max_agents={max_agents}")
    
    try:
        # Load candidate agents with enhanced information
        agents_result = await client.table('agents').select('*').eq('account_id', account_id).order('updated_at', desc=True).limit(max_agents).execute()
        agents = agents_result.data or []
        if not agents:
            logger.info("[ROUTER] No agents found for account; will fallback to model ranking")
            return None, {"reason": "no_agents"}

        # Resolve latest version config for each agent if available
        candidate_configs: List[Dict[str, Any]] = []
        for agent in agents:
            try:
                cfg = extract_agent_config(agent, None)
                
                # Enhance config with template information
                template_info = _extract_agent_template_info(agent)
                if template_info:
                    cfg['template_info'] = template_info
                
                # Include additional database fields that actually exist and might be useful
                additional_fields = [
                    'created_at', 'updated_at', 'is_default', 'is_public',
                    'download_count', 'tags', 'metadata', 'avatar', 'avatar_color'
                ]
                
                for field in additional_fields:
                    if field in agent and agent[field] is not None:
                        cfg[field] = agent[field]
                
                candidate_configs.append(cfg)
            except Exception as e:
                logger.warning(f"Failed to extract config for agent {agent.get('agent_id')}: {e}")

        if not candidate_configs:
            logger.warning("[ROUTER] No valid agent configs could be extracted")
            return None, {"reason": "no_valid_configs"}

        # Prepare few-shot classification prompt
        agent_list = [
            {
                "agent_id": cfg.get('agent_id'),
                "summary": _summarize_agent_capabilities(cfg)
            }
            for cfg in candidate_configs
        ]

        # Get available models for context
        available_models = _get_available_models_for_prompt()
        model_context = f"Available models: {', '.join(available_models[:10])}{'...' if len(available_models) > 10 else ''}"
        
        sys_prompt = (
            "You are an intelligent router that selects the best agent for a user query. "
            "Analyze the agent summaries carefully, considering:\n"
            "1. Tool Relevance: Does the agent have the right tools for the task?\n"
            "2. Tags: Do the agent's tags match the query domain?\n"
            "3. Template Source: Is this agent created from a reliable template?\n"
            "4. Metadata: Consider if this is a default, public, or centrally managed agent\n"
            "5. Download Count: Higher downloads often indicate better quality\n\n"
            "Always prioritize agents that:\n"
            "- Have tools that can execute the required functionality\n"
            "- Are tagged for the specific domain\n"
            "- Can use available models effectively\n"
            "- Are from reliable sources (public, high downloads, official templates)\n"
            "- Are created from well-tested templates\n\n"
            f"{model_context}\n\n"
            "If no agent is appropriate, respond with agent_id=null. "
            "Respond ONLY in strict JSON: {\"agent_id\": string|null, \"confidence\": 0..1, \"reason\": string}."
        )

        user_prompt = {
            "query": prompt[:4000],
            "candidates": agent_list[:max_agents],
        }

        classification_model = classification_model or MODEL_NAME_ALIASES.get(config.MODEL_TO_USE_PRODUCTION, config.MODEL_TO_USE_PRODUCTION)
        logger.info(f"[ROUTER] Agent classification using model={classification_model}, candidates={len(agent_list)}")

        try:
            resp = await make_llm_api_call(
                messages=[
                    {"role": "system", "content": sys_prompt},
                    {"role": "user", "content": json.dumps(user_prompt)}
                ],
                model_name=classification_model,
                temperature=0,
                stream=False,
            )
            if hasattr(resp, 'choices'):
                content = resp.choices[0].message.get('content')  # type: ignore[attr-defined]
            elif isinstance(resp, dict):
                content = resp.get('choices', [{}])[0].get('message', {}).get('content')
            else:
                content = None
        except Exception as e:
            logger.warning(f"[ROUTER] Agent classification call failed: {e}")
            return None, {"reason": "classification_error", "error": str(e)}

        selected_agent_id: Optional[str] = None
        confidence = 0.0
        reason = ""
        if isinstance(content, str):
            try:
                data = json.loads(content)
                selected_agent_id = data.get('agent_id')
                confidence = float(data.get('confidence', 0.0))
                reason = data.get('reason') or ""
            except Exception:
                logger.debug(f"[ROUTER] Non-JSON router response: {content}")

        if not selected_agent_id:
            logger.info(f"[ROUTER] No agent selected by classifier (confidence={confidence:.2f})")
            return None, {"reason": "none_selected", "confidence": confidence, "llm_reason": reason}

        for cfg in candidate_configs:
            if cfg.get('agent_id') == selected_agent_id:
                logger.info(f"[ROUTER] Selected agent: id={selected_agent_id}, name={cfg.get('name')}, confidence={confidence:.2f}")
                return cfg, {"reason": "matched", "confidence": confidence, "llm_reason": reason, "agent_id": selected_agent_id, "agent_name": cfg.get('name')}

        logger.info(f"[ROUTER] Classifier returned unknown agent id={selected_agent_id}; falling back to model ranking")
        return None, {"reason": "id_not_found", "confidence": confidence, "llm_reason": reason}
        
    except Exception as e:
        logger.error(f"[ROUTER] Agent classification failed: {e}", exc_info=True)
        return None, {"reason": "classification_failed", "error": str(e)}


def _rank_models(allowed_models: List[str], prompt: str) -> Tuple[Optional[str], str]:
    """
    Dynamically rank models based on prompt analysis and available models.
    Replaces hardcoded model selection with intelligent ranking.
    """
    if not allowed_models:
        logger.warning("[MODEL_SELECTION] No allowed models provided for ranking")
        return None, "no_allowed_models"
    
    p = prompt.lower()
    
    # Basic heuristics for prompt analysis
    wants_vision = any(k in p for k in ["image", "screenshot", "vision", "photo"])
    wants_code = any(k in p for k in ["code", "bug", "stacktrace", "compile", "typescript", "python"])
    wants_reasoning = any(k in p for k in ["think", "reason", "plan", "math", "solve", "why"])
    wants_creative = any(k in p for k in ["creative", "story", "write", "generate", "art", "design"])
    
    # Model capability mapping (can be extended)
    model_capabilities = {
        "vision": [],
        "reasoning": [],
        "code": [],
        "creative": [],
        "general": []
    }
    
    # Categorize models by capabilities
    for model in allowed_models:
        # Vision models
        if any(vision_indicator in model.lower() for vision_indicator in ["vision", "gpt-4v", "claude-3", "gemini"]):
            model_capabilities["vision"].append(model)
        
        # Reasoning models (Claude models are generally strong at reasoning)
        if any(reasoning_indicator in model.lower() for reasoning_indicator in ["claude", "sonnet", "opus", "gpt-4"]):
            model_capabilities["reasoning"].append(model)
        
        # Code models
        if any(code_indicator in model.lower() for code_indicator in ["code", "deepseek", "llama", "gpt-4"]):
            model_capabilities["code"].append(model)
        
        # Creative models
        if any(creative_indicator in model.lower() for creative_indicator in ["gpt-4", "claude", "gemini"]):
            model_capabilities["creative"].append(model)
        
        # General models (all models can handle general tasks)
        model_capabilities["general"].append(model)
    
    # Priority selection based on prompt analysis
    if wants_vision and model_capabilities["vision"]:
        # Prefer vision-capable models
        vision_models = model_capabilities["vision"]
        # Sort by preference: Claude > GPT-4V > others
        sorted_vision = sorted(vision_models, key=lambda x: (
            "claude" in x.lower(),  # Claude models first
            "gpt-4v" in x.lower(),  # Then GPT-4V
            "gemini" in x.lower(),  # Then Gemini
            x  # Then alphabetically
        ), reverse=True)
        logger.info(f"[MODEL_SELECTION] Vision task detected - selected {sorted_vision[0]} from {len(vision_models)} vision models")
        return sorted_vision[0], "vision_optimized"
    
    if wants_reasoning and model_capabilities["reasoning"]:
        # Prefer reasoning-strong models
        reasoning_models = model_capabilities["reasoning"]
        # Sort by preference: Claude > GPT-4 > others
        sorted_reasoning = sorted(reasoning_models, key=lambda x: (
            "claude" in x.lower(),  # Claude models first
            "gpt-4" in x.lower(),   # Then GPT-4
            "sonnet" in x.lower(),  # Then Sonnet variants
            x  # Then alphabetically
        ), reverse=True)
        logger.info(f"[MODEL_SELECTION] Reasoning task detected - selected {sorted_reasoning[0]} from {len(reasoning_models)} reasoning models")
        return sorted_reasoning[0], "reasoning_optimized"
    
    if wants_code and model_capabilities["code"]:
        # Prefer code-strong models
        code_models = model_capabilities["code"]
        # Sort by preference: DeepSeek > Claude > GPT-4 > others
        sorted_code = sorted(code_models, key=lambda x: (
            "deepseek" in x.lower(),  # DeepSeek models first
            "claude" in x.lower(),    # Then Claude
            "gpt-4" in x.lower(),     # Then GPT-4
            x  # Then alphabetically
        ), reverse=True)
        logger.info(f"[MODEL_SELECTION] Code task detected - selected {sorted_code[0]} from {len(code_models)} code models")
        return sorted_code[0], "code_optimized"
    
    if wants_creative and model_capabilities["creative"]:
        # Prefer creative-strong models
        creative_models = model_capabilities["creative"]
        # Sort by preference: GPT-4 > Claude > others
        sorted_creative = sorted(creative_models, key=lambda x: (
            "gpt-4" in x.lower(),  # GPT-4 models first
            "claude" in x.lower(), # Then Claude
            x  # Then alphabetically
        ), reverse=True)
        logger.info(f"[MODEL_SELECTION] Creative task detected - selected {sorted_creative[0]} from {len(creative_models)} creative models")
        return sorted_creative[0], "creative_optimized"
    
    # General task - use intelligent ranking
    if allowed_models:
        # Sort by general capability: Claude > GPT-4 > others
        sorted_general = sorted(allowed_models, key=lambda x: (
            "claude" in x.lower(),  # Claude models first
            "gpt-4" in x.lower(),   # Then GPT-4
            "sonnet" in x.lower(),  # Then Sonnet variants
            "openrouter" in x.lower(),  # Then OpenRouter models
            x  # Then alphabetically
        ), reverse=True)
        logger.info(f"[MODEL_SELECTION] General task - selected {sorted_general[0]} from {len(allowed_models)} available models")
        return sorted_general[0], "general_ranked"
    
    # Fallback to default model if allowed
    default_model = MODEL_NAME_ALIASES.get(config.MODEL_TO_USE_PRODUCTION, config.MODEL_TO_USE_PRODUCTION)
    if default_model in allowed_models:
        return default_model, "fallback_default"
    
    # Final fallback: first allowed
    return (allowed_models[0], "fallback_first_allowed") if allowed_models else (None, "no_allowed_models")


async def route_query_for_thread(
    client,
    account_id: str,
    thread_id: Optional[str] = None,
    prompt: Optional[str] = None,
) -> Dict[str, Any]:
    """Decide whether to use an agent or a raw model for this query.

    Returns dict with keys: agent_config (or None), model_name, debug
    """
    try:
        if not prompt and thread_id:
            prompt = await _get_latest_user_prompt(client, thread_id)
            if not prompt:
                logger.info(f"[ROUTER] No latest user prompt found for thread {thread_id}")
        if not prompt:
            # Without prompt, do not attempt routing; return default
            default_model = MODEL_NAME_ALIASES.get(config.MODEL_TO_USE_PRODUCTION, config.MODEL_TO_USE_PRODUCTION)
            logger.info(f"[ROUTER] Routing without prompt; selecting default model={default_model}")
            return {"agent_config": None, "model_name": default_model, "debug": {"reason": "no_prompt"}}

        # Try agent selection first
        agent_cfg, agent_debug = await _classify_best_agent(client, account_id, prompt)
        if agent_cfg:
            logger.info(f"[ROUTER] Routing decision: agent id={agent_cfg.get('agent_id')}, name={agent_cfg.get('name')}")
            return {"agent_config": agent_cfg, "model_name": None, "debug": {"mode": "agent", **agent_debug}}

        # Else, pick a model the user can access
        allowed_models = await get_allowed_models_for_user(client, account_id)
        
        if not allowed_models:
            logger.warning(f"[ROUTER] No allowed models for user {account_id}, using default")
            default_model = MODEL_NAME_ALIASES.get(config.MODEL_TO_USE_PRODUCTION, config.MODEL_TO_USE_PRODUCTION)
            return {"agent_config": None, "model_name": default_model, "debug": {"mode": "model", "reason": "no_allowed_models", **agent_debug}}

        # Dynamically check credentials and filter models accordingly
        filtered_models, credential_status = _check_credentials_for_models(allowed_models)
        
        if filtered_models != allowed_models:
            filtered_count = len(allowed_models) - len(filtered_models)
            logger.info(f"[ROUTER] Credential check filtered out {filtered_count} models (before={len(allowed_models)}, after={len(filtered_models)})")
            logger.debug(f"[ROUTER] Credential status: {credential_status}")

        # If no models available after credential filtering, use default
        if not filtered_models:
            logger.warning(f"[ROUTER] No models available after credential filtering for user {account_id}, using default")
            default_model = MODEL_NAME_ALIASES.get(config.MODEL_TO_USE_PRODUCTION, config.MODEL_TO_USE_PRODUCTION)
            return {"agent_config": None, "model_name": default_model, "debug": {"mode": "model", "reason": "no_credentialed_models", "credential_status": credential_status, **agent_debug}}

        model_choice, reason_text = _rank_models(filtered_models, prompt)
        if not model_choice:
            model_choice = MODEL_NAME_ALIASES.get(config.MODEL_TO_USE_PRODUCTION, config.MODEL_TO_USE_PRODUCTION)
            reason_text = reason_text or "fallback_default"
        logger.info(f"[ROUTER] Routing decision: model={model_choice}, reason={reason_text}, allowed_count={len(allowed_models)}, filtered_count={len(filtered_models)}")
        return {"agent_config": None, "model_name": model_choice, "debug": {"mode": "model", "reason": reason_text, "credential_status": credential_status, **agent_debug}}

    except Exception as e:
        logger.error(f"[ROUTER] Failed to route query: {e}", exc_info=True)
        default_model = MODEL_NAME_ALIASES.get(config.MODEL_TO_USE_PRODUCTION, config.MODEL_TO_USE_PRODUCTION)
        return {"agent_config": None, "model_name": default_model, "debug": {"error": str(e), "mode": "error_fallback"}}

