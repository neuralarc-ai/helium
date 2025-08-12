"""
LLM API interface for making calls to various language models.

This module provides a unified interface for making API calls to different LLM providers
(OpenAI, Anthropic, Groq, xAI, etc.) using LiteLLM. It includes support for:
- Streaming responses
- Tool calls and function calling
- Retry logic with exponential backoff
- Model-specific configurations
- Comprehensive error handling and logging
"""

from typing import Union, Dict, Any, Optional, AsyncGenerator, List
import os
import json
import asyncio
from openai import OpenAIError
import litellm
from litellm.files.main import ModelResponse
from utils.logger import logger
from utils.config import config

# litellm.set_verbose=True
litellm.modify_params=True

# Constants
MAX_RETRIES = 2
RATE_LIMIT_DELAY = 30
RETRY_DELAY = 0.1
# Add timeout configuration for different providers
BEDROCK_TIMEOUT = 300  # 5 minutes for Bedrock calls
DEFAULT_TIMEOUT = 120  # 2 minutes for other providers

class LLMError(Exception):
    """Base exception for LLM-related errors."""
    pass

class LLMRetryError(LLMError):
    """Exception raised when retries are exhausted."""
    pass

def setup_api_keys() -> None:
    """Set up API keys from environment variables."""
    providers = ['OPENAI', 'ANTHROPIC', 'GROQ', 'OPENROUTER', 'XAI', 'MORPH', 'GEMINI', 'MOONSHOT']
    for provider in providers:
        key = getattr(config, f'{provider}_API_KEY')
        if key:
            # Set the environment variable that LiteLLM expects
            os.environ[f'{provider}_API_KEY'] = key
            logger.info(f"API key set for provider: {provider} (length: {len(key)}, starts with: {key[:10]}...)")
        else:
            logger.warning(f"No API key found for provider: {provider}")

    # Set up OpenRouter API base if not already set
    if config.OPENROUTER_API_KEY and config.OPENROUTER_API_BASE:
        os.environ['OPENROUTER_API_BASE'] = config.OPENROUTER_API_BASE
        logger.info(f"Set OPENROUTER_API_BASE to {config.OPENROUTER_API_BASE}")
    
    # Set up Moonshot AI API base if not already set
    if config.MOONSHOT_API_KEY and config.MOONSHOT_API_BASE:
        os.environ['MOONSHOT_API_BASE'] = config.MOONSHOT_API_BASE
        logger.info(f"Set MOONSHOT_API_BASE to {config.MOONSHOT_API_BASE}")
    
    # Debug: Check if OpenRouter API key is available in environment
    openrouter_key = os.environ.get('OPENROUTER_API_KEY')
    if openrouter_key:
        logger.info(f"OpenRouter API key found in environment (length: {len(openrouter_key)}, starts with: {openrouter_key[:10]}...)")
    else:
        logger.error("OpenRouter API key NOT found in environment variables!")
        
    # Debug: Check if Moonshot AI API key is available in environment
    moonshot_key = os.environ.get('MOONSHOT_API_KEY')
    if moonshot_key:
        logger.info(f"Moonshot AI API key found in environment (length: {len(moonshot_key)}, starts with: {moonshot_key[:10]}...)")
    else:
        logger.warning("Moonshot AI API key NOT found in environment variables!")

    # Set up AWS Bedrock credentials
    aws_access_key = config.AWS_ACCESS_KEY_ID
    aws_secret_key = config.AWS_SECRET_ACCESS_KEY
    aws_region = config.AWS_REGION_NAME

    if aws_access_key and aws_secret_key and aws_region:
        logger.debug(f"AWS credentials set for Bedrock in region: {aws_region}")
        
        # Validate AWS region format
        if not aws_region or not isinstance(aws_region, str):
            logger.error(f"Invalid AWS region: {aws_region}")
            return
            
        # Validate AWS credentials format
        if not aws_access_key.startswith('AKIA') or len(aws_access_key) != 20:
            logger.warning(f"AWS access key format may be invalid: {aws_access_key[:10]}...")
        
        # Validate AWS secret key format (should be 40 characters)
        if len(aws_secret_key) != 40:
            logger.warning(f"AWS secret key format may be invalid (length: {len(aws_secret_key)})")
        
        # Configure LiteLLM to use AWS credentials
        os.environ['AWS_ACCESS_KEY_ID'] = aws_access_key
        os.environ['AWS_SECRET_ACCESS_KEY'] = aws_secret_key
        # Set both AWS_REGION and AWS_DEFAULT_REGION for compatibility
        os.environ['AWS_REGION'] = aws_region
        os.environ['AWS_DEFAULT_REGION'] = aws_region
        # Also set AWS_REGION_NAME for backward compatibility
        os.environ['AWS_REGION_NAME'] = aws_region
        logger.info(f"AWS region set to: {aws_region}")
        
        # Debug: Log the environment variables that were set
        logger.debug(f"AWS_ACCESS_KEY_ID: {os.environ.get('AWS_ACCESS_KEY_ID', 'NOT_SET')[:10]}...")
        logger.debug(f"AWS_SECRET_ACCESS_KEY: {os.environ.get('AWS_SECRET_ACCESS_KEY', 'NOT_SET')[:10]}...")
        logger.debug(f"AWS_REGION: {os.environ.get('AWS_REGION', 'NOT_SET')}")
        logger.debug(f"AWS_DEFAULT_REGION: {os.environ.get('AWS_DEFAULT_REGION', 'NOT_SET')}")
    else:
        logger.warning(f"Missing AWS credentials for Bedrock integration - access_key: {bool(aws_access_key)}, secret_key: {bool(aws_secret_key)}, region: {aws_region}")

def get_openrouter_fallback(model_name: str) -> Optional[str]:
    """Get OpenRouter fallback model for a given model name."""
    # Skip if already using OpenRouter
    if model_name.startswith("openrouter/"):
        return None
    
    # Map models to their OpenRouter equivalents
    fallback_mapping = {
        "deepseek/deepseek-chat-v3-0324:free": "openrouter/deepseek/deepseek-chat-v3-0324:free",
        "z-ai/glm-4.5-air:free": "openrouter/z-ai/glm-4.5-air:free",
        "agentica-org/deepcoder-14b-preview:free": "openrouter/agentica-org/deepcoder-14b-preview:free",
        
        # Add Z.AI GLM models
        "z-ai/glm-4.5v": "openrouter/z-ai/glm-4.5v",
        "z-ai/glm-4.5": "openrouter/z-ai/glm-4.5",
        "z-ai/glm-4.5-air": "openrouter/z-ai/glm-4.5-air",
        "z-ai/glm-4-32b": "openrouter/z-ai/glm-4-32b",
    }
    
    # Check for exact match first
    if model_name in fallback_mapping:
        return fallback_mapping[model_name]
    
    # Check for partial matches (e.g., bedrock models)
    for key, value in fallback_mapping.items():
        if key in model_name:
            return value

async def handle_error(error: Exception, attempt: int, max_attempts: int) -> None:
    """Handle API errors with appropriate delays and logging."""
    delay = RATE_LIMIT_DELAY if isinstance(error, litellm.exceptions.RateLimitError) else RETRY_DELAY
    logger.warning(f"Error on attempt {attempt + 1}/{max_attempts}: {str(error)}")
    logger.debug(f"Waiting {delay} seconds before retry...")
    await asyncio.sleep(delay)

def prepare_params(
    messages: List[Dict[str, Any]],
    model_name: str,
    temperature: float = 0,
    max_tokens: Optional[int] = None,
    response_format: Optional[Any] = None,
    tools: Optional[List[Dict[str, Any]]] = None,
    tool_choice: str = "auto",
    api_key: Optional[str] = None,
    api_base: Optional[str] = None,
    stream: bool = False,
    top_p: Optional[float] = None,
    model_id: Optional[str] = None,
    enable_thinking: Optional[bool] = False,
    reasoning_effort: Optional[str] = 'low'
) -> Dict[str, Any]:
    """Prepare parameters for the API call."""
    params = {
        "model": model_name,
        "messages": messages,
        "temperature": temperature,
        "response_format": response_format,
        "top_p": top_p,
        "stream": stream,
    }

    if api_key:
        params["api_key"] = api_key
    if api_base:
        params["api_base"] = api_base
    if model_id:
        params["model_id"] = model_id

    # Handle token limits
    if max_tokens is not None:
        # For Claude 3.7 in Bedrock, do not set max_tokens or max_tokens_to_sample
        # as it causes errors with inference profiles
        if model_name.startswith("bedrock/") and "claude-3-7" in model_name:
            logger.debug(f"Skipping max_tokens for Claude 3.7 model: {model_name}")
            # Do not add any max_tokens parameter for Claude 3.7
        else:
            param_name = "max_completion_tokens" if 'o1' in model_name else "max_tokens"
            params[param_name] = max_tokens

    # Add tools if provided
    if tools:
        params.update({
            "tools": tools,
            "tool_choice": tool_choice
        })
        logger.debug(f"Added {len(tools)} tools to API parameters")

    # # Add Claude-specific headers
    if "claude" in model_name.lower() or "anthropic" in model_name.lower():
        params["extra_headers"] = {
            # "anthropic-beta": "max-tokens-3-5-sonnet-2024-07-15"
            "anthropic-beta": "output-128k-2025-02-19"
        }
        # params["mock_testing_fallback"] = True
        logger.debug("Added Claude-specific headers")

    # Add OpenRouter-specific parameters
    if model_name.startswith("openrouter/"):
        logger.info(f"Preparing OpenRouter parameters for model: {model_name}")

        # Set OpenRouter API key if not already provided
        if not api_key and config.OPENROUTER_API_KEY:
            params["api_key"] = config.OPENROUTER_API_KEY
            logger.info(f"Set OpenRouter API key from config (length: {len(config.OPENROUTER_API_KEY)}, starts with: {config.OPENROUTER_API_KEY[:10]}...)")
        elif api_key:
            logger.info(f"Using provided API key for OpenRouter (length: {len(api_key)}, starts with: {api_key[:10]}...)")
        else:
            logger.error("No OpenRouter API key available!")
            # Check environment variable as fallback
            env_key = os.environ.get('OPENROUTER_API_KEY')
            if env_key:
                params["api_key"] = env_key
                logger.info(f"Using OpenRouter API key from environment (length: {len(env_key)}, starts with: {env_key[:10]}...)")
            else:
                logger.error("OpenRouter API key not found in config or environment!")

        # Add optional site URL and app name from config
        site_url = config.OR_SITE_URL
        app_name = config.OR_APP_NAME
        if site_url or app_name:
            extra_headers = params.get("extra_headers", {})
            if site_url:
                extra_headers["HTTP-Referer"] = site_url
                logger.debug(f"Added HTTP-Referer header: {site_url}")
            if app_name:
                extra_headers["X-Title"] = app_name
                logger.debug(f"Added X-Title header: {app_name}")
            params["extra_headers"] = extra_headers
        
        # Ensure the API key is explicitly passed to LiteLLM
        if "api_key" not in params:
            logger.error("OpenRouter API key not set in params - this will cause authentication failure!")
        else:
            logger.info(f"OpenRouter API key confirmed in params (length: {len(params['api_key'])}, starts with: {params['api_key'][:10]}...)")

    # Add Bedrock-specific parameters
    if model_name.startswith("bedrock/"):
        logger.debug(f"Preparing AWS Bedrock parameters for model: {model_name}")

        # Auto-set model_id for specific models if not provided
        if not model_id:
            bedrock_model_mapping = {
                "bedrock/anthropic.claude-3-7-sonnet-20250219-v1:0": "arn:aws:bedrock:us-east-2:492597629786:inference-profile/us.anthropic.claude-3-7-sonnet-20250219-v1:0",
                "bedrock/anthropic.claude-sonnet-4-20250514-v1:0": "arn:aws:bedrock:us-east-2:492597629786:inference-profile/us.anthropic.claude-sonnet-4-20250514-v1:0",
                "bedrock/anthropic.claude-3-5-sonnet-20241022-v2:0": "arn:aws:bedrock:us-east-2:492597629786:inference-profile/us.anthropic.claude-3-5-sonnet-20241022-v2:0",
                "bedrock/anthropic.claude-3-5-sonnet-20240620-v1:0": "arn:aws:bedrock:us-east-2:492597629786:inference-profile/us.anthropic.claude-3-5-sonnet-20240620-v1:0",
                "bedrock/meta.llama3-3-70b-instruct-v1:0": "arn:aws:bedrock:us-east-2:492597629786:inference-profile/us.meta.llama3-3-70b-instruct-v1:0",
                "bedrock/meta.llama4-scout-17b-instruct-v1:0": "arn:aws:bedrock:us-east-2:492597629786:inference-profile/us.meta.llama4-scout-17b-instruct-v1:0",
                "bedrock/meta.llama4-maverick-17b-instruct-v1:0": "arn:aws:bedrock:us-east-2:492597629786:inference-profile/us.meta.llama4-maverick-17b-instruct-v1:0",
                "bedrock/deepseek.r1-v1:0": "arn:aws:bedrock:us-east-2:492597629786:inference-profile/us.deepseek.r1-v1:0",
            }
            
            # Check if the model name is in our mapping
            if model_name in bedrock_model_mapping:
                # For LiteLLM, we need to use the full ARN as the model name
                arn_model_name = f"bedrock/{bedrock_model_mapping[model_name]}"
                params["model"] = arn_model_name
                logger.debug(f"Updated model name to use inference profile ARN: {params['model']}")
                # Store the original model name for later use
                original_model_name = model_name
                # Update model_name to the ARN format for this function
                model_name = arn_model_name

        # For AWS Bedrock, we rely on environment variables rather than api_key parameter
        # The credentials are already set in setup_api_keys()
        if api_key:
            logger.debug("API key provided for Bedrock, but using environment variables instead")
            # Remove api_key to avoid conflicts with environment variables
            params.pop("api_key", None)
        else:
            logger.debug("Using AWS credentials from environment variables for Bedrock")
        
        # Set AWS region
        if config.AWS_REGION_NAME:
            params["api_base"] = f"https://bedrock-runtime.{config.AWS_REGION_NAME}.amazonaws.com"
            logger.debug(f"Set Bedrock API base to: {params['api_base']}")
            
            # Validate that the region is supported by Bedrock
            # Updated to include us-east-2
            supported_regions = [
                "us-east-1", "us-east-2", "us-west-2", "eu-west-1", "ap-southeast-1"
            ]
            if config.AWS_REGION_NAME not in supported_regions:
                logger.error(f"AWS region {config.AWS_REGION_NAME} is not supported by Bedrock. Supported regions: {supported_regions}")
                logger.error("Please update your AWS_REGION_NAME to one of the supported regions.")
                logger.error("Recommended: us-west-2 (most comprehensive Bedrock support)")
            else:
                logger.info(f"AWS region {config.AWS_REGION_NAME} is supported by Bedrock")
        else:
            logger.error("No AWS region configured for Bedrock!")
            
        # Add timeout configuration for Bedrock calls
        params["timeout"] = BEDROCK_TIMEOUT
        logger.debug(f"Set Bedrock timeout to {BEDROCK_TIMEOUT} seconds")

    # Add timeout configuration for non-Bedrock calls
    if not model_name.startswith("bedrock/"):
        params["timeout"] = DEFAULT_TIMEOUT
        logger.debug(f"Set default timeout to {DEFAULT_TIMEOUT} seconds for {model_name}")
    
    fallback_model = get_openrouter_fallback(model_name)
    if fallback_model:
        params["fallbacks"] = [{
            "model": fallback_model,
            "messages": messages,
        }]
        logger.debug(f"Added OpenRouter fallback for model: {model_name} to {fallback_model}")

    # Apply Anthropic prompt caching (minimal implementation)
    # Check model name *after* potential modifications (like adding bedrock/ prefix)
    effective_model_name = params.get("model", model_name) # Use model from params if set, else original
    
    # Skip prompt caching for Bedrock models as they don't support it
    if ("claude" in effective_model_name.lower() or "anthropic" in effective_model_name.lower()) and not effective_model_name.startswith("bedrock/"):
        messages = params["messages"] # Direct reference, modification affects params

        # Ensure messages is a list
        if not isinstance(messages, list):
            return params # Return early if messages format is unexpected

        # Apply cache control to the first 4 text blocks across all messages
        cache_control_count = 0
        max_cache_control_blocks = 3

        for message in messages:
            if cache_control_count >= max_cache_control_blocks:
                break
                
            content = message.get("content")
            
            if isinstance(content, str):
                message["content"] = [
                    {"type": "text", "text": content, "cache_control": {"type": "ephemeral"}}
                ]
                cache_control_count += 1
            elif isinstance(content, list):
                for item in content:
                    if cache_control_count >= max_cache_control_blocks:
                        break
                    if isinstance(item, dict) and item.get("type") == "text" and "cache_control" not in item:
                        item["cache_control"] = {"type": "ephemeral"}
                        cache_control_count += 1

    # Add reasoning_effort for Anthropic models if enabled
    use_thinking = enable_thinking if enable_thinking is not None else False
    is_anthropic = "anthropic" in effective_model_name.lower() or "claude" in effective_model_name.lower()
    is_xai = "xai" in effective_model_name.lower() or model_name.startswith("xai/")
    is_kimi_k2 = "kimi-k2" in effective_model_name.lower() or model_name.startswith("moonshotai/kimi-k2")

    if is_kimi_k2:
        params["provider"] = {
            "order": ["together/fp8", "novita/fp8", "baseten/fp8", "moonshotai", "groq"]
        }

    if is_anthropic and use_thinking:
        effort_level = reasoning_effort if reasoning_effort else 'low'
        params["reasoning_effort"] = effort_level
        params["temperature"] = 1.0 # Required by Anthropic when reasoning_effort is used
        logger.info(f"Anthropic thinking enabled with reasoning_effort='{effort_level}'")

    # Add reasoning_effort for xAI models if enabled
    if is_xai and use_thinking:
        effort_level = reasoning_effort if reasoning_effort else 'low'
        params["reasoning_effort"] = effort_level
        logger.info(f"xAI thinking enabled with reasoning_effort='{effort_level}'")

    # Add xAI-specific parameters
    if model_name.startswith("xai/"):
        logger.debug(f"Preparing xAI parameters for model: {model_name}")
        # xAI models support standard parameters, no special handling needed beyond reasoning_effort

    # Add Z.AI-specific reasoning support
    is_zai_glm = "z-ai/glm" in model_name.lower() or "glm-4" in model_name.lower()
    
    if is_zai_glm and enable_thinking:
        # Z.AI models support reasoning through the reasoning parameter
        effort_level = reasoning_effort if reasoning_effort else 'low'
        params["reasoning"] = True  # Enable reasoning mode
        params["include_reasoning"] = True  # Include reasoning in response
        logger.info(f"Z.AI GLM reasoning enabled for model: {model_name}")

    return params

async def make_llm_api_call(
    messages: List[Dict[str, Any]],
    model_name: str,
    response_format: Optional[Any] = None,
    temperature: float = 0,
    max_tokens: Optional[int] = None,
    tools: Optional[List[Dict[str, Any]]] = None,
    tool_choice: str = "auto",
    api_key: Optional[str] = None,
    api_base: Optional[str] = None,
    stream: bool = False,
    top_p: Optional[float] = None,
    model_id: Optional[str] = None,
    enable_thinking: Optional[bool] = False,
    reasoning_effort: Optional[str] = 'low'
) -> Union[Dict[str, Any], AsyncGenerator, ModelResponse]:
    """
    Make an API call to a language model using LiteLLM.

    Args:
        messages: List of message dictionaries for the conversation
        model_name: Name of the model to use (e.g., "gpt-4", "claude-3", "openrouter/openai/gpt-4", "bedrock/anthropic.claude-3-sonnet-20240229-v1:0")
        response_format: Desired format for the response
        temperature: Sampling temperature (0-1)
        max_tokens: Maximum tokens in the response
        tools: List of tool definitions for function calling
        tool_choice: How to select tools ("auto" or "none")
        api_key: Override default API key
        api_base: Override default API base URL
        stream: Whether to stream the response
        top_p: Top-p sampling parameter
        model_id: Optional ARN for Bedrock inference profiles
        enable_thinking: Whether to enable thinking
        reasoning_effort: Level of reasoning effort

    Returns:
        Union[Dict[str, Any], AsyncGenerator]: API response or stream

    Raises:
        LLMRetryError: If API call fails after retries
        LLMError: For other API-related errors
    """
    # debug <timestamp>.json messages
    logger.info(f"Making LLM API call to model: {model_name} (Thinking: {enable_thinking}, Effort: {reasoning_effort})")
    logger.info(f"📡 API Call: Using model {model_name}")
    params = prepare_params(
        messages=messages,
        model_name=model_name,
        temperature=temperature,
        max_tokens=max_tokens,
        response_format=response_format,
        tools=tools,
        tool_choice=tool_choice,
        api_key=api_key,
        api_base=api_base,
        stream=stream,
        top_p=top_p,
        model_id=model_id,
        enable_thinking=enable_thinking,
        reasoning_effort=reasoning_effort
    )
    last_error = None
    for attempt in range(MAX_RETRIES):
        try:
            logger.debug(f"Attempt {attempt + 1}/{MAX_RETRIES}")
            # logger.debug(f"API request parameters: {json.dumps(params, indent=2)}")
            
            # Debug: Log the API key being used
            if "api_key" in params:
                logger.info(f"Making LiteLLM call with API key (length: {len(params['api_key'])}, starts with: {params['api_key'][:10]}...)")
            else:
                logger.info("No API key in params - using environment variables or default credentials")
                
            # Debug: Log AWS environment variables for Bedrock calls
            if "bedrock" in model_name.lower():
                logger.debug(f"AWS environment check - ACCESS_KEY_ID: {'SET' if os.environ.get('AWS_ACCESS_KEY_ID') else 'NOT_SET'}")
                logger.debug(f"AWS environment check - SECRET_ACCESS_KEY: {'SET' if os.environ.get('AWS_SECRET_ACCESS_KEY') else 'NOT_SET'}")
                logger.debug(f"AWS environment check - REGION: {os.environ.get('AWS_REGION', 'NOT_SET')}")
                logger.debug(f"AWS environment check - DEFAULT_REGION: {os.environ.get('AWS_DEFAULT_REGION', 'NOT_SET')}")

            # Get timeout from params or use default
            timeout = params.get("timeout", DEFAULT_TIMEOUT)
            logger.debug(f"Using timeout of {timeout} seconds for {model_name}")
            
            # Wrap the LiteLLM call with timeout
            response = await asyncio.wait_for(litellm.acompletion(**params), timeout=timeout)
            logger.debug(f"Successfully received API response from {model_name}")
            # logger.debug(f"Response: {response}")
            return response

        except asyncio.TimeoutError as e:
            timeout_used = params.get("timeout", DEFAULT_TIMEOUT)
            error_msg = f"API call timed out after {timeout_used} seconds for model {model_name}"
            logger.error(error_msg)
            last_error = e
            await handle_error(e, attempt, MAX_RETRIES)
            
        except (litellm.exceptions.RateLimitError, OpenAIError, json.JSONDecodeError) as e:
            last_error = e
            await handle_error(e, attempt, MAX_RETRIES)

        except Exception as e:
            logger.error(f"Unexpected error during API call: {str(e)}", exc_info=True)
            
            # Add additional debugging for AWS Bedrock errors
            if "bedrock" in model_name.lower() and "credential" in str(e).lower():
                logger.error("AWS Bedrock credential error detected. Checking environment variables:")
                logger.error(f"AWS_ACCESS_KEY_ID: {'SET' if os.environ.get('AWS_ACCESS_KEY_ID') else 'NOT_SET'}")
                logger.error(f"AWS_SECRET_ACCESS_KEY: {'SET' if os.environ.get('AWS_SECRET_ACCESS_KEY') else 'NOT_SET'}")
                logger.error(f"AWS_REGION: {os.environ.get('AWS_REGION', 'NOT_SET')}")
                logger.error(f"AWS_DEFAULT_REGION: {os.environ.get('AWS_DEFAULT_REGION', 'NOT_SET')}")
                logger.error(f"Config AWS_REGION_NAME: {config.AWS_REGION_NAME}")
            
            raise LLMError(f"API call failed: {str(e)}")

    error_msg = f"Failed to make API call after {MAX_RETRIES} attempts"
    if last_error:
        error_msg += f". Last error: {str(last_error)}"
    logger.error(error_msg, exc_info=True)
    raise LLMRetryError(error_msg)

# Initialize API keys on module import
setup_api_keys()
