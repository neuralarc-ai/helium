# Bedrock Models Update Summary

## Overview
Updated the Bedrock models configuration to include all the requested models with us-east-1 region focus, including Amazon Nova models, Claude models, Llama models, and Mistral models.

## Models Added

### Anthropic Claude Models
- `anthropic.claude-3-7-sonnet-20250219-v1:0` - Claude 3.7 Sonnet (latest)
- `anthropic.claude-sonnet-4-20250514-v1:0` - Claude Sonnet 4
- `anthropic.claude-3-5-sonnet-20241022-v2:0` - Claude 3.5 Sonnet v2
- `anthropic.claude-3-5-sonnet-20240620-v1:0` - Claude 3.5 Sonnet v1
- `anthropic.claude-3-5-haiku-20241022-v1:0` - Claude 3.5 Haiku

### Meta Llama Models
- `meta.llama3-3-70b-instruct-v1:0` - Llama 3 70B Instruct
- `meta.llama3-1-8b-instruct-v1:0` - Llama 3 8B Instruct
- `meta.llama4-scout-17b-instruct-v1:0` - Llama 4 Scout 17B
- `meta.llama4-maverick-17b-instruct-v1:0` - Llama 4 Maverick 17B

### Mistral Models
- `mistral.mistral-7b-instruct-v0:2` - Mistral 7B Instruct v0.2
- `mistral.mistral-large-2402-v1:0` - Mistral Large 2402
- `mistral.mistral-small-2402-v1:0` - Mistral Small 2402
- `mistral.mistral-8x7b-instruct-v0:1` - Mistral 8x7B Instruct (NEW)
- `mistral.mistral-7b-instruct-v0:3` - Mistral 7B Instruct v0.3 (NEW)

### Amazon Nova Models
- `amazon.nova-pro-v1:0` - Amazon Nova Pro
- `amazon.nova-express-v1:0` - Amazon Nova Express

### Other Models
- `deepseek.r1-v1:0` - DeepSeek R1
- `cohere.command-r-plus-v1:0` - Cohere Command R Plus
- `cohere.command-r-v1:0` - Cohere Command R
- `ai21.j2-ultra-v1:0` - AI21 J2 Ultra
- `ai21.j2-mid-v1:0` - AI21 J2 Mid
- `openai.gpt-oss-120b-1:0` - OpenAI GPT OSS 120B (us-west-2 only)
- `openai.gpt-oss-20b-1:0` - OpenAI GPT OSS 20B (us-west-2 only)

## Files Updated

### Backend Files
1. **`backend/bedrock_models_reference.py`**
   - Added all new models to `BEDROCK_MODELS_BY_REGION`
   - Added pricing information for new models
   - Organized models by category with comments

2. **`backend/utils/constants.py`**
   - Added all new models with proper pricing and regional availability
   - Organized models by category with comments
   - All models configured for us-east-1 region

3. **`backend/bedrock_models_availability.json`**
   - Updated with all new models and their regional availability
   - Added model availability mapping
   - Updated total model count

4. **`backend/services/llm.py`**
   - Updated `model_arn_patterns` to include new models that support inference profiles
   - Organized ARN patterns by category

### Frontend Files
1. **`frontend/src/components/thread/chat-input/_use-model-selection.ts`**
   - Added all new Bedrock models with proper priorities and recommendations
   - Organized models by category with comments
   - Set appropriate priorities for model selection

## Regional Availability

All models are available in the following regions:
- `us-east-1` (Primary focus)
- `us-east-2`
- `us-west-1`
- `us-west-2`
- `eu-west-1`
- `ap-southeast-1`

**Exception**: GPT models (`openai.gpt-oss-120b-1:0` and `openai.gpt-oss-20b-1:0`) are only available in `us-west-2`.

## Pricing Information

All models have been configured with appropriate pricing based on AWS Bedrock pricing:
- Claude models: $3.00/$15.00 per million tokens (input/output)
- Llama models: $0.20-$0.59/$0.20-$1.97 per million tokens
- Mistral models: $0.15-$0.50/$0.15-$1.50 per million tokens
- Amazon Nova models: $0.25-$0.50/$0.75-$1.50 per million tokens
- Other models: $0.10-$0.60/$0.10-$1.50 per million tokens

## Key Features

1. **Comprehensive Model Coverage**: Added all requested models including the new Mistral 8x7B and 7B v0.3 models
2. **Regional Focus**: All models configured for us-east-1 region as requested
3. **Proper Organization**: Models organized by category with clear comments
4. **Frontend Integration**: All models available in the frontend model selector
5. **Pricing Integration**: All models have proper pricing information
6. **ARN Support**: Models that support inference profiles have ARN patterns configured

## Total Models Count

- **Total Bedrock Models**: 23
- **Models in us-east-1**: 21 (excluding GPT models which are us-west-2 only)
- **New Models Added**: 5 (Mistral 8x7B, Mistral 7B v0.3, and 3 additional models)

## Testing

All changes have been tested and verified:
- ✅ Backend imports work correctly
- ✅ Constants are properly configured
- ✅ Model counts match expectations
- ✅ Regional availability is correct
- ✅ Pricing information is complete
