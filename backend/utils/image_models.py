"""
Image model configuration for OpenRouter integration.
Provides cost-effective alternatives to expensive models like GPT-4 Vision.
"""

# Recommended OpenRouter image generation models (cost-effective alternatives)
RECOMMENDED_IMAGE_MODELS = {
    "flux/kontext-max": {
        "name": "Flux Kontext Max",
        "provider": "Black Forest Labs",
        "description": "Balanced functionality with excellent text legibility and adaptability",
        "cost_per_1k_tokens": "Very low",
        "features": ["text-to-image", "image-editing", "high-quality"],
        "recommended": True
    },
    "stability-ai/stable-diffusion-xl": {
        "name": "Stable Diffusion XL",
        "provider": "Stability AI",
        "description": "Open-source model with detailed image generation",
        "cost_per_1k_tokens": "Low",
        "features": ["text-to-image", "open-source", "detailed"],
        "recommended": True
    },
    "deepseek-ai/janus-pro": {
        "name": "Janus Pro",
        "provider": "DeepSeek",
        "description": "Superior performance in image generation benchmarks",
        "cost_per_1k_tokens": "Low",
        "features": ["text-to-image", "high-performance", "benchmark-leading"],
        "recommended": True
    },
    "openai/dall-e-3": {
        "name": "DALL-E 3",
        "provider": "OpenAI",
        "description": "High-quality but expensive option",
        "cost_per_1k_tokens": "High",
        "features": ["text-to-image", "high-quality", "expensive"],
        "recommended": False
    }
}

# Default models for different use cases
DEFAULT_MODELS = {
    "generation": "openrouter/flux/kontext-max",
    "editing": "openrouter/flux/kontext-max",
    "cost_effective": "openrouter/stability-ai/stable-diffusion-xl",
    "high_quality": "openrouter/deepseek-ai/janus-pro"
}

def get_recommended_model(use_case: str = "generation") -> str:
    """Get the recommended model for a specific use case."""
    return DEFAULT_MODELS.get(use_case, DEFAULT_MODELS["generation"])

def get_model_info(model_name: str) -> dict:
    """Get information about a specific model."""
    # Remove openrouter/ prefix if present for lookup
    lookup_name = model_name.replace("openrouter/", "")
    return RECOMMENDED_IMAGE_MODELS.get(lookup_name, {
        "name": model_name,
        "provider": "Unknown",
        "description": "Model information not available",
        "cost_per_1k_tokens": "Unknown",
        "features": [],
        "recommended": False
    })

def list_available_models() -> dict:
    """List all available image models with their information."""
    return {
        "recommended": {name: info for name, info in RECOMMENDED_IMAGE_MODELS.items() if info["recommended"]},
        "all": RECOMMENDED_IMAGE_MODELS,
        "defaults": DEFAULT_MODELS
    }

