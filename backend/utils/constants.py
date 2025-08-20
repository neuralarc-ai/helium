# Master model configuration - single source of truth
MODELS = {
    # Active models (requested)
    "openrouter/mistralai/mistral-small-3.2-24b-instruct:free": {
        "aliases": [
            "mistralai/mistral-small-3.2-24b-instruct:free",
            "mistral-small-3.2-24b-instruct:free"
        ],
        "pricing": {
            "input_cost_per_million_tokens": 0.0,
            "output_cost_per_million_tokens": 0.0
        },
        "tier_availability": ["free", "paid"]
    },
    "openrouter/qwen/qwen3-coder:free": {
        "aliases": [
            "qwen/qwen3-coder:free"
        ],
        "pricing": {
            "input_cost_per_million_tokens": 0.0,
            "output_cost_per_million_tokens": 0.0
        },
        "tier_availability": ["free", "paid"]
    },
    "openrouter/z-ai/glm-4.5-air:free": {
        "aliases": ["glm-4.5-air:free"],
        "pricing": {
            "input_cost_per_million_tokens": 0.0,
            "output_cost_per_million_tokens": 0.0
        },
        "tier_availability": ["free", "paid"]
    },
    "openrouter/moonshotai/kimi-k2:free": {
        "aliases": [
            "moonshotai/kimi-k2:free",
            "moonshotai/kimi-k2"
        ],
        "pricing": {
            "input_cost_per_million_tokens": 0.0,
            "output_cost_per_million_tokens": 0.0
        },
        "tier_availability": ["free", "paid"]
    },

    # All other models have been commented out per request.
    # Examples of previously configured models:
    # "openrouter/deepseek/deepseek-chat-v3-0324:free": {
    #     "aliases": ["deepseek/deepseek-chat-v3-0324:free"],
    #     "pricing": {"input_cost_per_million_tokens": 0.0, "output_cost_per_million_tokens": 0.0},
    #     "tier_availability": ["free", "paid"]
    # },
    # "bedrock/anthropic.claude-3-7-sonnet-20250219-v1:0": {
    #     "aliases": ["bedrock-claude-3-7-sonnet"],
    #     "pricing": {"input_cost_per_million_tokens": 3.00, "output_cost_per_million_tokens": 15.00},
    #     "tier_availability": ["free"]
    # },
    # "moonshot/moonshot-v1-8k": {
    #     "aliases": ["moonshot-v1-8k", "kimi-k2"],
    #     "pricing": {"input_cost_per_million_tokens": 0.0, "output_cost_per_million_tokens": 0.0},
    #     "tier_availability": ["free", "paid"]
    # },
}

# Derived structures (auto-generated from MODELS)
def _generate_model_structures():
    """Generate all model structures from the master MODELS dictionary."""
    
    # Check environment directly to avoid circular imports
    import os
    env_mode = os.getenv("ENV_MODE", "local").lower()
    
    # Generate tier lists
    free_models = []
    paid_models = []
    
    # Generate aliases
    aliases = {}
    
    # Generate pricing
    pricing = {}
    
    for model_name, config_data in MODELS.items():
        # Add to tier lists
        if "free" in config_data["tier_availability"]:
            free_models.append(model_name)
        if "paid" in config_data["tier_availability"]:
            paid_models.append(model_name)
        
        # Add aliases with environment-specific logic
        for alias in config_data["aliases"]:
            # Special handling for "Helio T1" - only add in production
            if alias == "Helio T1":
                if env_mode == "production":
                    aliases[alias] = model_name
            else:
                # Add all other aliases normally
                aliases[alias] = model_name
        
        # Add pricing
        pricing[model_name] = config_data["pricing"]
        
        # Also add pricing for legacy model name variations
        if model_name.startswith("openrouter/deepseek/"):
            legacy_name = model_name.replace("openrouter/", "")
            pricing[legacy_name] = config_data["pricing"]
        elif model_name.startswith("openrouter/qwen/"):
            legacy_name = model_name.replace("openrouter/", "")
            pricing[legacy_name] = config_data["pricing"]
        elif model_name.startswith("gemini/"):
            legacy_name = model_name.replace("gemini/", "")
            pricing[legacy_name] = config_data["pricing"]
        elif model_name.startswith("anthropic/"):
            # Legacy pricing mapping removed - using Bedrock models now
            pass
        elif model_name.startswith("xai/"):
            # Add pricing for OpenRouter x-ai models
            openrouter_name = model_name.replace("xai/", "openrouter/x-ai/")
            pricing[openrouter_name] = config_data["pricing"]
    
    return free_models, paid_models, aliases, pricing

# Generate all structures
FREE_TIER_MODELS, PAID_TIER_MODELS, MODEL_NAME_ALIASES, HARDCODED_MODEL_PRICES = _generate_model_structures()

MODEL_ACCESS_TIERS = {
    "free": FREE_TIER_MODELS,
    "tier_2_20": PAID_TIER_MODELS,
    "tier_6_50": PAID_TIER_MODELS,
    "tier_12_100": PAID_TIER_MODELS,
    "tier_25_200": PAID_TIER_MODELS,
    "tier_50_400": PAID_TIER_MODELS,
    "tier_125_800": PAID_TIER_MODELS,
    "tier_200_1000": PAID_TIER_MODELS,
}
