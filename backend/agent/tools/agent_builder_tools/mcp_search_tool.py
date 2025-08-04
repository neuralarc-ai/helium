import json
from typing import Optional
from agentpress.tool import ToolResult, openapi_schema, usage_example
from agentpress.thread_manager import ThreadManager
from .base_tool import AgentBuilderBaseTool
from pipedream import app_service, mcp_service
from utils.logger import logger


class MCPSearchTool(AgentBuilderBaseTool):
    def __init__(self, thread_manager: ThreadManager, db_connection, agent_id: str):
        super().__init__(thread_manager, db_connection, agent_id)

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "search_mcp_servers",
            "description": "Search for Pipedream MCP servers based on user requirements. Use this when the user wants to add MCP tools to their agent.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query for finding relevant Pipedream apps (e.g., 'linear', 'github', 'database', 'search')"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of apps to return (default: 10)",
                        "default": 10
                    }
                },
                "required": ["query"]
            }
        }
    })
    @usage_example('''
        <function_calls>
        <invoke name="search_mcp_servers">
        <parameter name="query">linear</parameter>
        <parameter name="limit">5</parameter>
        </invoke>
        </function_calls>
        ''')
    async def search_mcp_servers(
        self,
        query: str,
        category: Optional[str] = None,
        limit: int = 10
    ) -> ToolResult:
        try:
            search_result = await app_service.search_apps(
                query=query,
                category=category,
                page=1,
                limit=limit
            )
            
            apps = search_result.get("apps", [])
            
            formatted_apps = []
            for app in apps:
                formatted_apps.append({
                    "name": app.name,
                    "app_slug": app.slug.value if hasattr(app.slug, 'value') else str(app.slug),
                    "description": app.description,
                    "logo_url": getattr(app, 'logo_url', ''),
                    "auth_type": app.auth_type.value if app.auth_type else '',
                    "is_verified": getattr(app, 'is_verified', False),
                    "url": getattr(app, 'url', ''),
                    "tags": getattr(app, 'tags', [])
                })
            
            if not formatted_apps:
                return ToolResult(
                    success=False,
                    output=json.dumps([], ensure_ascii=False)
                )
            
            return ToolResult(
                success=True,
                output=json.dumps(formatted_apps, ensure_ascii=False)
            )
                
        except Exception as e:
            return self.fail_response(f"Error searching Pipedream apps: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "get_app_details",
            "description": "Get detailed information about a specific Pipedream app, including available tools and authentication requirements.",
            "parameters": {
                "type": "object",
                "properties": {
                    "app_slug": {
                        "type": "string",
                        "description": "The app slug to get details for (e.g., 'github', 'linear', 'slack')"
                    }
                },
                "required": ["app_slug"]
            }
        }
    })
    @usage_example('''
        <function_calls>
        <invoke name="get_app_details">
        <parameter name="app_slug">github</parameter>
        </invoke>
        </function_calls>
        ''')
    async def get_app_details(self, app_slug: str) -> ToolResult:
        try:
            app_data = await app_service.get_app_by_slug(app_slug)
            
            if not app_data:
                return self.fail_response(f"Could not find app details for '{app_slug}'")
            
            formatted_app = {
                "name": app_data.name,
                "app_slug": app_data.slug.value if hasattr(app_data.slug, 'value') else str(app_data.slug),
                "description": app_data.description,
                "logo_url": getattr(app_data, 'logo_url', ''),
                "auth_type": app_data.auth_type.value if app_data.auth_type else '',
                "is_verified": getattr(app_data, 'is_verified', False),
                "url": getattr(app_data, 'url', ''),
                "tags": getattr(app_data, 'tags', []),
                "pricing": getattr(app_data, 'pricing', ''),
                "setup_instructions": getattr(app_data, 'setup_instructions', ''),
                "available_actions": getattr(app_data, 'available_actions', []),
                "available_triggers": getattr(app_data, 'available_triggers', [])
            }
            
            available_tools = []
            try:
                import httpx
                import json
                
                url = f"https://remote.mcp.pipedream.net/?app={app_slug}&externalUserId=tools_preview"
                payload = {"jsonrpc": "2.0", "method": "tools/list", "params": {}, "id": 1}
                headers = {"Content-Type": "application/json", "Accept": "application/json, text/event-stream"}
                
                async with httpx.AsyncClient(timeout=30.0) as client:
                    async with client.stream("POST", url, json=payload, headers=headers) as resp:
                        resp.raise_for_status()
                        async for line in resp.aiter_lines():
                            if not line or not line.startswith("data:"):
                                continue
                            data_str = line[len("data:"):].strip()
                            try:
                                data_obj = json.loads(data_str)
                                tools = data_obj.get("result", {}).get("tools", [])
                                for tool in tools:
                                    desc = tool.get("description", "") or ""
                                    idx = desc.find("[")
                                    if idx != -1:
                                        desc = desc[:idx].strip()
                                    
                                    available_tools.append({
                                        "name": tool.get("name", ""),
                                        "description": desc
                                    })
                                break
                            except json.JSONDecodeError:
                                logger.warning(f"Failed to parse JSON data: {data_str}")
                                continue
                                
            except Exception as tools_error:
                logger.warning(f"Could not fetch MCP tools for {app_slug}: {tools_error}")
            
            result = {
                "message": f"Retrieved details for {formatted_app['name']}",
                "app": formatted_app,
                "available_mcp_tools": available_tools,
                "total_mcp_tools": len(available_tools)
            }
            
            if available_tools:
                result["message"] += f" - {len(available_tools)} MCP tools available"
            
            return self.success_response(result)
            
        except Exception as e:
            return self.fail_response(f"Error getting app details: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "discover_user_mcp_servers",
            "description": "Discover available MCP servers for a specific user and app combination. Use this to see what MCP tools are available for a connected profile.",
            "parameters": {
                "type": "object",
                "properties": {
                    "user_id": {
                        "type": "string",
                        "description": "The external user ID from the credential profile"
                    },
                    "app_slug": {
                        "type": "string",
                        "description": "The app slug to discover MCP servers for"
                    }
                },
                "required": ["user_id", "app_slug"]
            }
        }
    })
    @usage_example('''
        <function_calls>
        <invoke name="discover_user_mcp_servers">
        <parameter name="user_id">user_123456</parameter>
        <parameter name="app_slug">github</parameter>
        </invoke>
        </function_calls>
        ''')
    async def discover_user_mcp_servers(self, user_id: str, app_slug: str) -> ToolResult:
        try:
            from pipedream.mcp_service import ExternalUserId, AppSlug
            external_user_id = ExternalUserId(user_id)
            app_slug_obj = AppSlug(app_slug)
            servers = await mcp_service.discover_servers_for_user(external_user_id, app_slug_obj)
            
            formatted_servers = []
            for server in servers:
                formatted_servers.append({
                    "server_id": getattr(server, 'server_id', ''),
                    "name": getattr(server, 'name', 'Unknown'),
                    "app_slug": getattr(server, 'app_slug', app_slug),
                    "status": getattr(server, 'status', 'unknown'),
                    "available_tools": getattr(server, 'available_tools', []),
                    "last_ping": getattr(server, 'last_ping', ''),
                    "created_at": getattr(server, 'created_at', '')
                })
            
            connected_servers = [s for s in formatted_servers if s["status"] == "connected"]
            total_tools = sum(len(s["available_tools"]) for s in connected_servers)
            
            return self.success_response({
                "message": f"Found {len(formatted_servers)} MCP servers for {app_slug} (user: {user_id}), {len(connected_servers)} connected with {total_tools} total tools available",
                "servers": formatted_servers,
                "connected_count": len(connected_servers),
                "total_tools": total_tools
            })
            
        except Exception as e:
            return self.fail_response(f"Error discovering MCP servers: {str(e)}") 