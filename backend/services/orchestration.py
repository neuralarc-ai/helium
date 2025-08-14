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
    name = agent_config.get('name', 'Unnamed')
    description = agent_config.get('description') or ''
    tools = agent_config.get('agentpress_tools') or {}
    tool_names = [n for n, v in tools.items() if isinstance(v, dict) and v.get('enabled')]
    mcp = agent_config.get('configured_mcps') or []
    custom_mcp = agent_config.get('custom_mcps') or []
    caps = []
    if tool_names:
        caps.append(f"tools: {', '.join(tool_names[:8])}")
    if mcp:
        caps.append(f"mcp: {', '.join([m.get('name', '') for m in mcp][:6])}")
    if custom_mcp:
        caps.append(f"custom_mcp: {', '.join([m.get('name', '') for m in custom_mcp][:6])}")
    caps_str = '; '.join([c for c in caps if c])
    return f"{name}: {description[:160]} {('('+caps_str+')') if caps_str else ''}".strip()


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
    logger.info(f"[ROUTER] Starting agent classification: account={account_id}, max_agents={max_agents}")
    # Load candidate agents
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
            candidate_configs.append(cfg)
        except Exception as e:
            logger.warning(f"Failed to extract config for agent {agent.get('agent_id')}: {e}")

    if not candidate_configs:
        return None, {"reason": "no_valid_configs"}

    # Prepare few-shot classification prompt
    agent_list = [
        {
            "agent_id": cfg.get('agent_id'),
            "summary": _summarize_agent_capabilities(cfg)
        }
        for cfg in candidate_configs
    ]

    sys_prompt = (
        "You are a router that selects the best agent for a user query."
        " Consider the agent summaries and choose the single best agent that can handle the query."
        " If none are appropriate, respond with agent_id=null."
        " Respond ONLY in strict JSON: {\"agent_id\": string|null, \"confidence\": 0..1, \"reason\": string}."
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


def _rank_models(allowed_models: List[str], prompt: str) -> Tuple[Optional[str], str]:
    p = prompt.lower()
    # Basic heuristics
    wants_vision = any(k in p for k in ["image", "screenshot", "vision", "photo"])
    wants_code = any(k in p for k in ["code", "bug", "stacktrace", "compile", "typescript", "python"])
    wants_reasoning = any(k in p for k in ["think", "reason", "plan", "math", "solve", "why"])

    preferred_order = [
        # Free/openrouter-first for local testing without vendor creds
        "openrouter/deepseek/deepseek-chat-v3-0324:free",
        "openrouter/z-ai/glm-4.5-air:free",
        "openrouter/google/gemini-2.0-flash-exp:free",
        # Reasoning-strong (vendor-specific)
        "bedrock/anthropic.claude-3-7-sonnet-20250219-v1:0",
        "bedrock/anthropic.claude-sonnet-4-20250514-v1:0",
        "bedrock/anthropic.claude-3-5-sonnet-20241022-v2:0",
        # General strong models (vendor-specific)
        "bedrock/meta.llama4-maverick-17b-instruct-v1:0",
        "bedrock/meta.llama4-scout-17b-instruct-v1:0",
        "bedrock/deepseek.r1-v1:0",
    ]

    ranked = []
    for model in preferred_order:
        if model in allowed_models:
            ranked.append(model)

    # Adjust ordering heuristically
    if wants_vision:
        # Keep current order; Bedrock Anthropic supports image inputs via tools in our stack
        pass
    if wants_code:
        pass
    if wants_reasoning and ranked:
        return ranked[0], "reasoning"

    if ranked:
        return ranked[0], "default_rank"

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

        # If AWS Bedrock credentials are missing, filter out bedrock/* models
        has_bedrock_creds = bool(config.AWS_ACCESS_KEY_ID and config.AWS_SECRET_ACCESS_KEY and config.AWS_REGION_NAME)
        filtered_models = allowed_models
        if not has_bedrock_creds:
            filtered_models = [m for m in allowed_models if not m.startswith("bedrock/")]
            if filtered_models != allowed_models:
                logger.info(f"[ROUTER] AWS creds missing - filtering out Bedrock models (before={len(allowed_models)}, after={len(filtered_models)})")

        model_choice, reason_text = _rank_models(filtered_models, prompt)
        if not model_choice:
            model_choice = MODEL_NAME_ALIASES.get(config.MODEL_TO_USE_PRODUCTION, config.MODEL_TO_USE_PRODUCTION)
            reason_text = reason_text or "fallback_default"
        logger.info(f"[ROUTER] Routing decision: model={model_choice}, reason={reason_text}, allowed_count={len(allowed_models)}")
        return {"agent_config": None, "model_name": model_choice, "debug": {"mode": "model", "reason": reason_text, **agent_debug}}

    except Exception as e:
        logger.error(f"[ROUTER] Failed to route query: {e}")
        default_model = MODEL_NAME_ALIASES.get(config.MODEL_TO_USE_PRODUCTION, config.MODEL_TO_USE_PRODUCTION)
        return {"agent_config": None, "model_name": default_model, "debug": {"error": str(e)}}


