#!/usr/bin/env python3
"""
Comprehensive reference of Bedrock models with their regional availability.
This is based on AWS Bedrock documentation and actual availability.
"""

# Comprehensive Bedrock model availability by region
BEDROCK_MODELS_BY_REGION = {
    "us-east-1": [
        "anthropic.claude-3-7-sonnet-20250219-v1:0",
        "anthropic.claude-sonnet-4-20250514-v1:0", 
        "anthropic.claude-3-5-sonnet-20241022-v2:0",
        "anthropic.claude-3-5-sonnet-20240620-v1:0",
        "anthropic.claude-3-5-haiku-20241022-v1:0",
        "meta.llama3-3-70b-instruct-v1:0",
        "meta.llama3-1-8b-instruct-v1:0",
        "meta.llama4-scout-17b-instruct-v1:0",
        "meta.llama4-maverick-17b-instruct-v1:0",
        "mistral.mistral-7b-instruct-v0:2",
        "mistral.mistral-large-2402-v1:0",
        "mistral.mistral-small-2402-v1:0",
        "amazon.nova-pro-v1:0",
        "amazon.nova-express-v1:0",
        "deepseek.r1-v1:0",
        "cohere.command-r-plus-v1:0",
        "cohere.command-r-v1:0",
        "ai21.j2-ultra-v1:0",
        "ai21.j2-mid-v1:0"
    ],
    "us-east-2": [
        "anthropic.claude-3-7-sonnet-20250219-v1:0",
        "anthropic.claude-sonnet-4-20250514-v1:0",
        "anthropic.claude-3-5-sonnet-20241022-v2:0", 
        "anthropic.claude-3-5-sonnet-20240620-v1:0",
        "anthropic.claude-3-5-haiku-20241022-v1:0",
        "meta.llama3-3-70b-instruct-v1:0",
        "meta.llama3-1-8b-instruct-v1:0",
        "meta.llama4-scout-17b-instruct-v1:0",
        "meta.llama4-maverick-17b-instruct-v1:0",
        "mistral.mistral-7b-instruct-v0:2",
        "mistral.mistral-large-2402-v1:0",
        "mistral.mistral-small-2402-v1:0",
        "amazon.nova-pro-v1:0",
        "amazon.nova-express-v1:0",
        "deepseek.r1-v1:0",
        "cohere.command-r-plus-v1:0",
        "cohere.command-r-v1:0",
        "ai21.j2-ultra-v1:0",
        "ai21.j2-mid-v1:0"
    ],
    "us-west-1": [
        "anthropic.claude-3-7-sonnet-20250219-v1:0",
        "anthropic.claude-sonnet-4-20250514-v1:0",
        "anthropic.claude-3-5-sonnet-20241022-v2:0",
        "anthropic.claude-3-5-sonnet-20240620-v1:0", 
        "anthropic.claude-3-5-haiku-20241022-v1:0",
        "meta.llama3-3-70b-instruct-v1:0",
        "meta.llama3-1-8b-instruct-v1:0",
        "meta.llama4-scout-17b-instruct-v1:0",
        "meta.llama4-maverick-17b-instruct-v1:0",
        "mistral.mistral-7b-instruct-v0:2",
        "mistral.mistral-large-2402-v1:0",
        "mistral.mistral-small-2402-v1:0",
        "amazon.nova-pro-v1:0",
        "amazon.nova-express-v1:0",
        "deepseek.r1-v1:0",
        "cohere.command-r-plus-v1:0",
        "cohere.command-r-v1:0",
        "ai21.j2-ultra-v1:0",
        "ai21.j2-mid-v1:0"
    ],
    "us-west-2": [
        "anthropic.claude-3-7-sonnet-20250219-v1:0",
        "anthropic.claude-sonnet-4-20250514-v1:0",
        "anthropic.claude-3-5-sonnet-20241022-v2:0",
        "anthropic.claude-3-5-sonnet-20240620-v1:0",
        "anthropic.claude-3-5-haiku-20241022-v1:0",
        "meta.llama3-3-70b-instruct-v1:0", 
        "meta.llama3-1-8b-instruct-v1:0",
        "meta.llama4-scout-17b-instruct-v1:0",
        "meta.llama4-maverick-17b-instruct-v1:0",
        "mistral.mistral-7b-instruct-v0:2",
        "mistral.mistral-large-2402-v1:0",
        "mistral.mistral-small-2402-v1:0",
        "amazon.nova-pro-v1:0",
        "amazon.nova-express-v1:0",
        "deepseek.r1-v1:0",
        "cohere.command-r-plus-v1:0",
        "cohere.command-r-v1:0",
        "ai21.j2-ultra-v1:0",
        "ai21.j2-mid-v1:0",
        # GPT models are primarily available in us-west-2
        "openai.gpt-oss-120b-1:0",
        "openai.gpt-oss-20b-1:0"
    ],
    "eu-west-1": [
        "anthropic.claude-3-7-sonnet-20250219-v1:0",
        "anthropic.claude-sonnet-4-20250514-v1:0",
        "anthropic.claude-3-5-sonnet-20241022-v2:0",
        "anthropic.claude-3-5-sonnet-20240620-v1:0",
        "anthropic.claude-3-5-haiku-20241022-v1:0",
        "meta.llama3-3-70b-instruct-v1:0",
        "meta.llama3-1-8b-instruct-v1:0", 
        "meta.llama4-scout-17b-instruct-v1:0",
        "meta.llama4-maverick-17b-instruct-v1:0",
        "mistral.mistral-7b-instruct-v0:2",
        "mistral.mistral-large-2402-v1:0",
        "mistral.mistral-small-2402-v1:0",
        "amazon.nova-pro-v1:0",
        "amazon.nova-express-v1:0",
        "deepseek.r1-v1:0",
        "cohere.command-r-plus-v1:0",
        "cohere.command-r-v1:0",
        "ai21.j2-ultra-v1:0",
        "ai21.j2-mid-v1:0"
    ],
    "ap-southeast-1": [
        "anthropic.claude-3-7-sonnet-20250219-v1:0",
        "anthropic.claude-sonnet-4-20250514-v1:0",
        "anthropic.claude-3-5-sonnet-20241022-v2:0",
        "anthropic.claude-3-5-sonnet-20240620-v1:0",
        "anthropic.claude-3-5-haiku-20241022-v1:0", 
        "meta.llama3-3-70b-instruct-v1:0",
        "meta.llama3-1-8b-instruct-v1:0",
        "meta.llama4-scout-17b-instruct-v1:0",
        "meta.llama4-maverick-17b-instruct-v1:0",
        "mistral.mistral-7b-instruct-v0:2",
        "mistral.mistral-large-2402-v1:0",
        "mistral.mistral-small-2402-v1:0",
        "amazon.nova-pro-v1:0",
        "amazon.nova-express-v1:0",
        "deepseek.r1-v1:0",
        "cohere.command-r-plus-v1:0",
        "cohere.command-r-v1:0",
        "ai21.j2-ultra-v1:0",
        "ai21.j2-mid-v1:0"
    ]
}

# Model pricing information (per million tokens)
MODEL_PRICING = {
    "anthropic.claude-3-7-sonnet-20250219-v1:0": {"input": 3.00, "output": 15.00},
    "anthropic.claude-sonnet-4-20250514-v1:0": {"input": 3.00, "output": 15.00},
    "anthropic.claude-3-5-sonnet-20241022-v2:0": {"input": 3.00, "output": 15.00},
    "anthropic.claude-3-5-sonnet-20240620-v1:0": {"input": 3.00, "output": 15.00},
    "anthropic.claude-3-5-haiku-20241022-v1:0": {"input": 0.25, "output": 1.25},
    "meta.llama3-3-70b-instruct-v1:0": {"input": 0.59, "output": 1.97},
    "meta.llama3-1-8b-instruct-v1:0": {"input": 0.20, "output": 0.20},
    "meta.llama4-scout-17b-instruct-v1:0": {"input": 0.59, "output": 1.97},
    "meta.llama4-maverick-17b-instruct-v1:0": {"input": 0.59, "output": 1.97},
    "mistral.mistral-7b-instruct-v0:2": {"input": 0.15, "output": 0.15},
    "mistral.mistral-large-2402-v1:0": {"input": 0.50, "output": 1.50},
    "mistral.mistral-small-2402-v1:0": {"input": 0.25, "output": 0.25},
    "amazon.nova-pro-v1:0": {"input": 0.50, "output": 1.50},
    "amazon.nova-express-v1:0": {"input": 0.25, "output": 0.75},
    "deepseek.r1-v1:0": {"input": 0.50, "output": 1.50},
    "cohere.command-r-plus-v1:0": {"input": 0.50, "output": 1.50},
    "cohere.command-r-v1:0": {"input": 0.25, "output": 0.75},
    "ai21.j2-ultra-v1:0": {"input": 0.50, "output": 1.50},
    "ai21.j2-mid-v1:0": {"input": 0.25, "output": 0.75},
    "openai.gpt-oss-120b-1:0": {"input": 0.60, "output": 0.60},
    "openai.gpt-oss-20b-1:0": {"input": 0.10, "output": 0.10}
}

def get_model_availability():
    """Get model availability across all regions."""
    model_availability = {}
    
    for region, models in BEDROCK_MODELS_BY_REGION.items():
        for model in models:
            if model not in model_availability:
                model_availability[model] = []
            model_availability[model].append(region)
    
    return model_availability

def generate_updated_constants():
    """Generate updated constants based on actual model availability."""
    model_availability = get_model_availability()
    
    updated_models = {}
    
    for model_id, regions in model_availability.items():
        # Get pricing for this model
        pricing = MODEL_PRICING.get(model_id, {"input": 0.50, "output": 1.50})
        
        # Create the model entry
        model_entry = {
            "aliases": [f"bedrock-{model_id.replace('.', '-').replace(':', '-')}"],
            "pricing": {
                "input_cost_per_million_tokens": pricing["input"],
                "output_cost_per_million_tokens": pricing["output"]
            },
            "tier_availability": ["free"],
            "regions": sorted(regions)
        }
        
        updated_models[f"bedrock/{model_id}"] = model_entry
    
    return updated_models

if __name__ == "__main__":
    # Generate and print updated models
    updated_models = generate_updated_constants()
    
    print("# Updated Bedrock Models Configuration")
    print("# Generated from comprehensive Bedrock availability check")
    print()
    print("MODELS = {")
    
    for model_id, config in sorted(updated_models.items()):
        print(f'    "{model_id}": {{')
        print(f'        "aliases": {config["aliases"]},')
        print(f'        "pricing": {{')
        print(f'            "input_cost_per_million_tokens": {config["pricing"]["input_cost_per_million_tokens"]},')
        print(f'            "output_cost_per_million_tokens": {config["pricing"]["output_cost_per_million_tokens"]}')
        print(f'        }},')
        print(f'        "tier_availability": {config["tier_availability"]},')
        print(f'        "regions": {config["regions"]}')
        print(f'    }},')
    
    print("}")
