#!/usr/bin/env python3
"""
Script to check available Bedrock models across different regions.
This will help us update the model configuration with the correct regional availability.
"""

import boto3
import json
from typing import Dict, List, Set
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Regions to check
REGIONS = [
    "us-east-1",
    "us-east-2", 
    "us-west-1",
    "us-west-2",
    "eu-west-1",
    "ap-southeast-1"
]

def get_available_models_in_region(region: str) -> List[str]:
    """Get available models in a specific region."""
    try:
        bedrock = boto3.client('bedrock', region_name=region)
        
        # List foundation models
        response = bedrock.list_foundation_models()
        models = []
        
        for model in response.get('modelSummaries', []):
            model_id = model.get('modelId', '')
            if model_id:
                models.append(model_id)
        
        logger.info(f"Found {len(models)} models in {region}")
        return models
        
    except Exception as e:
        logger.error(f"Error checking models in {region}: {e}")
        return []

def get_model_details_in_region(region: str, model_id: str) -> Dict:
    """Get detailed information about a specific model in a region."""
    try:
        bedrock = boto3.client('bedrock', region_name=region)
        
        response = bedrock.get_foundation_model(modelIdentifier=model_id)
        return response.get('modelDetails', {})
        
    except Exception as e:
        logger.error(f"Error getting details for {model_id} in {region}: {e}")
        return {}

def main():
    """Main function to check all models across regions."""
    print("🔍 Checking Bedrock models across regions...")
    
    # Dictionary to store models by region
    models_by_region = {}
    all_models = set()
    
    # Check each region
    for region in REGIONS:
        print(f"\n📍 Checking region: {region}")
        models = get_available_models_in_region(region)
        models_by_region[region] = models
        all_models.update(models)
        
        if models:
            print(f"   Found {len(models)} models")
            for model in sorted(models):
                print(f"   - {model}")
        else:
            print("   No models found")
    
    # Analyze model availability across regions
    print(f"\n📊 Analysis:")
    print(f"Total unique models found: {len(all_models)}")
    
    # Create a summary of which models are available in which regions
    model_availability = {}
    
    for model in sorted(all_models):
        available_regions = []
        for region in REGIONS:
            if model in models_by_region.get(region, []):
                available_regions.append(region)
        model_availability[model] = available_regions
    
    # Print summary
    print(f"\n🎯 Model Availability Summary:")
    for model, regions in model_availability.items():
        print(f"{model}: {', '.join(regions)}")
    
    # Save results to file
    results = {
        "models_by_region": models_by_region,
        "model_availability": model_availability,
        "total_models": len(all_models)
    }
    
    with open('bedrock_models_availability.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\n💾 Results saved to bedrock_models_availability.json")
    
    # Generate updated constants
    generate_updated_constants(model_availability)

def generate_updated_constants(model_availability: Dict[str, List[str]]):
    """Generate updated constants based on actual model availability."""
    print(f"\n🔧 Generating updated constants...")
    
    # Define model categories and their patterns
    model_categories = {
        "anthropic": ["anthropic.claude"],
        "meta": ["meta.llama", "meta.llama3", "meta.llama4"],
        "mistral": ["mistral."],
        "openai": ["openai.gpt"],
        "amazon": ["amazon."],
        "deepseek": ["deepseek."],
        "cohere": ["cohere."],
        "ai21": ["ai21."]
    }
    
    updated_models = {}
    
    for model_id, regions in model_availability.items():
        # Skip models that don't have any regions
        if not regions:
            continue
            
        # Determine the model category
        category = "other"
        for cat, patterns in model_categories.items():
            if any(pattern in model_id for pattern in patterns):
                category = cat
                break
        
        # Generate pricing (you'll need to update these based on actual pricing)
        pricing = get_default_pricing(model_id, category)
        
        # Create the model entry
        model_entry = {
            "aliases": [f"bedrock-{model_id.replace('.', '-').replace(':', '-')}"],
            "pricing": pricing,
            "tier_availability": ["free"],
            "regions": regions
        }
        
        updated_models[f"bedrock/{model_id}"] = model_entry
    
    # Save updated constants
    constants_content = f'''# Updated Bedrock Models Configuration
# Generated from actual Bedrock availability check

MODELS = {{
{chr(10).join([f'    "{model_id}": {json.dumps(config, indent=8)}' for model_id, config in updated_models.items()])}
}}
'''
    
    with open('updated_bedrock_constants.py', 'w') as f:
        f.write(constants_content)
    
    print(f"💾 Updated constants saved to updated_bedrock_constants.py")

def get_default_pricing(model_id: str, category: str) -> Dict[str, float]:
    """Get default pricing for a model based on its category."""
    # Default pricing - you should update these with actual prices
    pricing_map = {
        "anthropic": {"input_cost_per_million_tokens": 3.00, "output_cost_per_million_tokens": 15.00},
        "meta": {"input_cost_per_million_tokens": 0.59, "output_cost_per_million_tokens": 1.97},
        "mistral": {"input_cost_per_million_tokens": 0.15, "output_cost_per_million_tokens": 0.15},
        "openai": {"input_cost_per_million_tokens": 0.60, "output_cost_per_million_tokens": 0.60},
        "amazon": {"input_cost_per_million_tokens": 0.50, "output_cost_per_million_tokens": 1.50},
        "deepseek": {"input_cost_per_million_tokens": 0.50, "output_cost_per_million_tokens": 1.50},
        "cohere": {"input_cost_per_million_tokens": 0.50, "output_cost_per_million_tokens": 1.50},
        "ai21": {"input_cost_per_million_tokens": 0.50, "output_cost_per_million_tokens": 1.50},
        "other": {"input_cost_per_million_tokens": 0.50, "output_cost_per_million_tokens": 1.50}
    }
    
    return pricing_map.get(category, pricing_map["other"])

if __name__ == "__main__":
    main()
