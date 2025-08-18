# Feature Flags - Environment Variables Support

## Overview

Helium AI now supports enabling feature flags using environment variables, making it easier to deploy and manage features in production Docker environments.

## Quick Start

### Enable All Features

Add these environment variables to your Docker deployment:

```bash
# Feature Flags - Enable all features
FLAG_CUSTOM_AGENTS=true
FLAG_KNOWLEDGE_BASE=true
FLAG_MCP_MODULE=true
FLAG_TEMPLATES_API=true
FLAG_TRIGGERS_API=true
FLAG_WORKFLOWS_API=true
FLAG_PIPEDREAM=true
FLAG_CREDENTIALS_API=true
FLAG_SUNA_DEFAULT_AGENT=true
```

### Docker Compose Example

```yaml
version: "3.8"
services:
  backend:
    build: ./backend
    environment:
      # Feature Flags
      - FLAG_CUSTOM_AGENTS=true
      - FLAG_KNOWLEDGE_BASE=true
      - FLAG_MCP_MODULE=true
      - FLAG_TEMPLATES_API=true
      - FLAG_TRIGGERS_API=true
      - FLAG_WORKFLOWS_API=true
      - FLAG_COMPOSIO=true
      - FLAG_CREDENTIALS_API=true
      - FLAG_SUNA_DEFAULT_AGENT=true
      
      # Other environment variables...
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      - redis
```

## Available Feature Flags

| Feature Flag | Environment Variable | Description |
|--------------|---------------------|-------------|
| `custom_agents` | `FLAG_CUSTOM_AGENTS` | Enable custom agent creation and management |
| `knowledge_base` | `FLAG_KNOWLEDGE_BASE` | Enable knowledge base functionality |
| `mcp_module` | `FLAG_MCP_MODULE` | Enable MCP (Model Context Protocol) module |
| `templates_api` | `FLAG_TEMPLATES_API` | Enable templates API |
| `triggers_api` | `FLAG_TRIGGERS_API` | Enable triggers API |
| `workflows_api` | `FLAG_WORKFLOWS_API` | Enable workflows API |
| `composio` | `FLAG_COMPOSIO` | Enable Composio integration |
| `credentials_api` | `FLAG_CREDENTIALS_API` | Enable credentials API |
| `suna_default_agent` | `FLAG_SUNA_DEFAULT_AGENT` | Enable Suna default agent |

## Environment Variable Priority

1. **Environment variables take precedence** - If `FLAG_KNOWLEDGE_BASE=true` is set, it will override any Redis setting
2. **Redis fallback** - If no environment variable is set, the system checks Redis
3. **Default behavior** - If neither environment variable nor Redis setting exists, the feature is disabled

## Usage Examples

### Enable Specific Features

```bash
# Enable only knowledge base and custom agents
FLAG_KNOWLEDGE_BASE=true
FLAG_CUSTOM_AGENTS=true
```

### Disable Features

```bash
# Disable a feature (set to false or any other value)
FLAG_COMPOSIO=false
```

### Check Current Status

Use the API endpoint to check which flags are enabled:

```bash
# Get all feature flags
curl http://your-backend:8000/feature-flags

# Get available flags and their environment variables
curl http://your-backend:8000/feature-flags/available

# Get specific flag status
curl http://your-backend:8000/feature-flags/knowledge_base
```

## API Endpoints

### Get All Feature Flags
```bash
GET /feature-flags
```

Response:
```json
{
  "flags": {
    "knowledge_base": true,
    "custom_agents": true,
    "mcp_module": false
  }
}
```

### Get Available Flags
```bash
GET /feature-flags/available
```

Response:
```json
{
  "available_flags": {
    "knowledge_base": {
      "environment_variable": "FLAG_KNOWLEDGE_BASE",
      "environment_value": true,
      "description": "Set FLAG_KNOWLEDGE_BASE=true to enable this feature"
    }
  },
  "usage": "Set environment variables like FLAG_KNOWLEDGE_BASE=true to enable features"
}
```

### Get Specific Flag
```bash
GET /feature-flags/{flag_name}
```

Response:
```json
{
  "flag_name": "knowledge_base",
  "enabled": true,
  "details": {
    "description": "Knowledge base feature",
    "updated_at": "2024-01-15T10:30:00Z"
  },
  "environment_info": {
    "environment_variable": "FLAG_KNOWLEDGE_BASE",
    "environment_value": true,
    "source": "environment"
  }
}
```

## Development

### Testing Environment Variables

You can test environment variables locally:

```bash
# Set environment variables for testing
export FLAG_KNOWLEDGE_BASE=true
export FLAG_CUSTOM_AGENTS=true

# Run your application
python -m uvicorn api:app --reload
```

### Checking Current Status

Use the provided script to check current environment variable status:

```bash
cd backend/flags
python3 enable_all_flags.py check
```

This will show you which flags are currently enabled via environment variables.

## Migration from Redis

If you were previously using Redis to manage feature flags, you can:

1. **Keep using Redis** - Environment variables take precedence, so you can gradually migrate
2. **Migrate to environment variables** - Set the environment variables and remove Redis flags
3. **Use both** - Environment variables for production, Redis for development/testing

## Troubleshooting

### Flag Not Working

1. **Check environment variable name** - Make sure it's in the correct format: `FLAG_{UPPERCASE_NAME}`
2. **Check environment variable value** - Must be `true`, `t`, `yes`, `y`, or `1` (case insensitive)
3. **Check application logs** - Look for flag-related log messages
4. **Use API endpoints** - Check `/feature-flags/available` to see all available flags

### Common Issues

- **Flag name mismatch** - Environment variable names are uppercase with `FLAG_` prefix
- **Value format** - Boolean values must be `true`/`false` (not `True`/`False`)
- **Docker environment** - Make sure environment variables are properly passed to the container

## Support

For issues or questions about feature flags:

1. Check the API endpoints for current status
2. Review application logs for flag-related messages
3. Use the `enable_all_flags.py` script to generate environment variables
4. Consult the main README.md for additional documentation
