# Image Model Configuration

## Overview

Helium AI now supports configurable image generation models through OpenRouter integration, providing cost-effective alternatives to expensive models like GPT-4 Vision.

## Environment Variables

Add these to your `.env` file to configure image models:

```bash
# Image Generation Models (OpenRouter)
IMAGE_GENERATION_MODEL=openrouter/flux/kontext-max
IMAGE_EDIT_MODEL=openrouter/flux/kontext-max
```

## Recommended Models

### Cost-Effective Options

1. **Flux Kontext Max** (`openrouter/flux/kontext-max`)
   - Provider: Black Forest Labs
   - Cost: Very low
   - Features: Text-to-image, image editing, high quality
   - **Recommended for most use cases**

2. **Stable Diffusion XL** (`openrouter/stability-ai/stable-diffusion-xl`)
   - Provider: Stability AI
   - Cost: Low
   - Features: Open-source, detailed generation

3. **Janus Pro** (`openrouter/deepseek-ai/janus-pro`)
   - Provider: DeepSeek
   - Cost: Low
   - Features: High performance, benchmark-leading

### Expensive Options (Not Recommended)

- **DALL-E 3** (`openrouter/openai/dall-e-3`)
  - Provider: OpenAI
  - Cost: High
  - Features: High quality but expensive

## Usage

### Via API

```bash
# Get current configuration
curl /api/agents/image-models

# Update models
curl -X POST /api/agents/image-models/update \
  -H "Content-Type: application/json" \
  -d '{
    "generation_model": "openrouter/flux/kontext-max",
    "edit_model": "openrouter/flux/kontext-max"
  }'
```

### Via Frontend

Use the Image Model Selector component in the agents section to:
- View available models
- Compare costs and features
- Update model configuration
- See current settings

## Cost Comparison

| Model | Relative Cost | Quality | Use Case |
|-------|---------------|---------|----------|
| Flux Kontext Max | Very Low | High | General purpose |
| Stable Diffusion XL | Low | High | Detailed images |
| Janus Pro | Low | Very High | Professional work |
| DALL-E 3 | High | Very High | Premium quality (expensive) |

## Migration from GPT-4 Vision

To switch from expensive models:

1. Set environment variables:
   ```bash
   IMAGE_GENERATION_MODEL=openrouter/flux/kontext-max
   IMAGE_EDIT_MODEL=openrouter/flux/kontext-max
   ```

2. Restart your backend services

3. The image generation tool will automatically use the new models

## Troubleshooting

### Common Issues

1. **OpenRouter API Key Missing**
   - Ensure `OPENROUTER_API_KEY` is set in your environment
   - Check that the key has sufficient credits

2. **Model Not Found**
   - Verify the model name format: `openrouter/provider/model-name`
   - Check OpenRouter's current model availability

3. **Image Quality Issues**
   - Try different models for different use cases
   - Adjust prompts for better results
   - Use appropriate image sizes

### Support

For issues with specific models, check:
- [OpenRouter Models](https://openrouter.ai/docs/models)
- [Model Provider Documentation](https://openrouter.ai/docs/models)
- [Helium AI Support](https://he2.ai/support)

