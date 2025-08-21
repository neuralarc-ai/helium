# Master model configuration - single source of truth
MODELS = {
    # Free tier models

    # AWS Bedrock Models
    "bedrock/anthropic.claude-3-7-sonnet-20250219-v1:0": {
        "aliases": ["bedrock-claude-3-7-sonnet"],
        "pricing": {
            "input_cost_per_million_tokens": 3.00,
            "output_cost_per_million_tokens": 15.00
        },
        "tier_availability": ["free"]
    },
    "bedrock/anthropic.claude-sonnet-4-20250514-v1:0": {
        "aliases": ["bedrock-claude-sonnet-4"],
        "pricing": {
            "input_cost_per_million_tokens": 3.00,
            "output_cost_per_million_tokens": 15.00
        },
        "tier_availability": ["free"]
    },
    "bedrock/meta.llama4-scout-17b-instruct-v1:0": {
        "aliases": ["bedrock-llama4-scout"],
        "pricing": {
            "input_cost_per_million_tokens": 0.59,
            "output_cost_per_million_tokens": 1.97
        },
        "tier_availability": ["free"]
    },
    "bedrock/meta.llama4-maverick-17b-instruct-v1:0": {
        "aliases": ["bedrock-llama4-maverick"],
        "pricing": {
            "input_cost_per_million_tokens": 0.59,
            "output_cost_per_million_tokens": 1.97
        },
        "tier_availability": ["free"]
    },
    "bedrock/deepseek.r1-v1:0": {
        "aliases": ["bedrock-deepseek-r1"],
        "pricing": {
            "input_cost_per_million_tokens": 0.50,
            "output_cost_per_million_tokens": 1.50
        },
        "tier_availability": ["free"]
    },
    "bedrock/anthropic.claude-3-5-sonnet-20241022-v2:0": {
        "aliases": ["bedrock-claude-3-5-sonnet-v2"],
        "pricing": {
            "input_cost_per_million_tokens": 3.00,
            "output_cost_per_million_tokens": 15.00
        },
        "tier_availability": ["free"]
    },
    "bedrock/anthropic.claude-3-5-sonnet-20240620-v1:0": {
        "aliases": ["bedrock-claude-3-5-sonnet-v1"],
        "pricing": {
            "input_cost_per_million_tokens": 3.00,
            "output_cost_per_million_tokens": 15.00
        },
        "tier_availability": ["free"]
    },
    "bedrock/meta.llama3-3-70b-instruct-v1:0": {
        "aliases": ["bedrock-llama3-3-70b-instruct"],
        "pricing": {
            "input_cost_per_million_tokens": 0.59,
            "output_cost_per_million_tokens": 1.97
        },
        "tier_availability": ["free"]
    },
    
    "openrouter/agentica-org/deepcoder-14b-preview:free": {
        "aliases": ["agentica-org/deepcoder-14b-preview:free"],
        "pricing": {
            "input_cost_per_million_tokens": 0.0,
            "output_cost_per_million_tokens": 0.0
        },
            "tier_availability": ["free", "paid"]
    },
    "openrouter/deepseek/deepseek-chat-v3-0324:free": {
        "aliases": ["deepseek/deepseek-chat-v3-0324:free"],
        "pricing": {
            "input_cost_per_million_tokens": 0.0,
            "output_cost_per_million_tokens": 0.0
        },
        "tier_availability": ["free", "paid"]
    },
    "openrouter/qwen/qwen3-235b-a22b:free": {
        "aliases": ["qwen/qwen3-235b-a22b:free", "Helio T1"],
        "pricing": {
            "input_cost_per_million_tokens": 0.0,
            "output_cost_per_million_tokens": 0.0
        },
        "tier_availability": ["free", "paid"]
    },
    "moonshot/moonshot-v1-8k": {
        "aliases": ["moonshot-v1-8k", "kimi-k2", "moonshotai/kimi-k2:free", "moonshotai/kimi-k2"],
        "pricing": {
            "input_cost_per_million_tokens": 0.0,
            "output_cost_per_million_tokens": 0.0
        },
        "tier_availability": ["free", "paid"]
    },
    "moonshot/moonshot-v1-32k": {
        "aliases": ["moonshot-v1-32k", "kimi-k2-32k"],
        "pricing": {
            "input_cost_per_million_tokens": 0.0,
            "output_cost_per_million_tokens": 0.0
        },
        "tier_availability": ["free", "paid"]
    },
    "moonshot/moonshot-v1-128k": {
        "aliases": ["moonshot-v1-128k", "kimi-k2-128k"],
        "pricing": {
            "input_cost_per_million_tokens": 0.0,
            "output_cost_per_million_tokens": 0.0
        },
        "tier_availability": ["free", "paid"]
    },
    "moonshot/kimi-k2-0711-preview": {
        "aliases": ["kimi-k2-0711-preview", "kimi-k2-0711"],
        "pricing": {
            "input_cost_per_million_tokens": 0.0,
            "output_cost_per_million_tokens": 0.0
        },
        "tier_availability": ["free", "paid"]
    },
    "moonshot/kimi-k2-turbo-preview": {
        "aliases": ["kimi-k2-turbo-preview", "kimi-k2-turbo"],
        "pricing": {
            "input_cost_per_million_tokens": 0.0,
            "output_cost_per_million_tokens": 0.0
        },
        "tier_availability": ["free", "paid"]
    },
    "openrouter/z-ai/glm-4.5-air:free": {
        "aliases": ["glm-4.5-air:free", "z-ai/glm-4.5-air:free"],
        "pricing": {
            "input_cost_per_million_tokens": 0.0,
            "output_cost_per_million_tokens": 0.0
        },
        "tier_availability": ["free", "paid"]
    },
    
    # Z.AI GLM Models from OpenRouter
    "openrouter/z-ai/glm-4.5v": {
        "aliases": ["glm-4.5v", "z-ai-glm-4.5v"],
        "pricing": {
            "input_cost_per_million_tokens": 0.60,
            "output_cost_per_million_tokens": 1.80
        },
        "tier_availability": ["free"],
        "features": ["vision", "multimodal", "reasoning", "agent-focused"]
    },
    "openrouter/z-ai/glm-4.5": {
        "aliases": ["glm-4.5", "z-ai-glm-4.5"],
        "pricing": {
            "input_cost_per_million_tokens": 0.60,
            "output_cost_per_million_tokens": 2.20
        },
        "tier_availability": ["free"],
        "features": ["reasoning", "code-generation", "agent-alignment", "128k-context"]
    },
    "openrouter/z-ai/glm-4.5-air": {
        "aliases": ["glm-4.5-air", "z-ai-glm-4.5-air"],
        "pricing": {
            "input_cost_per_million_tokens": 0.20,
            "output_cost_per_million_tokens": 1.10
        },
        "tier_availability": ["free"],
        "features": ["lightweight", "reasoning", "real-time", "cost-effective"]
    },
    "openrouter/z-ai/glm-4-32b": {
        "aliases": ["glm-4-32b", "z-ai-glm-4-32b"],
        "pricing": {
            "input_cost_per_million_tokens": 0.10,
            "output_cost_per_million_tokens": 0.10
        },
        "tier_availability": ["free"],
        "features": ["cost-effective", "tool-use", "online-search", "code-tasks"]
    },
    
    # Mistral Models from OpenRouter
    "openrouter/mistralai/mistral-small-3.2-24b-instruct": {
        "aliases": ["mistral-small-3.2", "mistral-small-3.2-24b", "mistral-small"],
        "pricing": {
            "input_cost_per_million_tokens": 0.02,
            "output_cost_per_million_tokens": 0.08
        },
        "tier_availability": ["free"],
        "features": ["instruction-following", "function-calling", "coding", "stem", "vision", "structured-output", "131k-context"]
    }
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
