import json
from typing import Optional, List
from agentpress.tool import ToolResult, openapi_schema, usage_example
from agentpress.thread_manager import ThreadManager
from .base_tool import AgentBuilderBaseTool
from composio_integration.composio_service import get_integration_service
from composio_integration.composio_profile_service import ComposioProfileService
from .mcp_search_tool import MCPSearchTool
from utils.logger import logger


class CredentialProfileTool(AgentBuilderBaseTool):
    def __init__(self, thread_manager: ThreadManager, db_connection, agent_id: str):
        super().__init__(thread_manager, db_connection, agent_id)
        self.composio_search = MCPSearchTool(thread_manager, db_connection, agent_id)

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "get_credential_profiles",
            "description": "Get all existing Composio credential profiles for the current user. Use this to show the user their available profiles.",
            "parameters": {
                "type": "object",
                "properties": {
                    "app_slug": {
                        "type": "string",
                        "description": "Optional filter to show only profiles for a specific app"
                    }
                },
                "required": []
            }
        }
    })
    @usage_example('''
        <function_calls>
        <invoke name="get_credential_profiles">
        <parameter name="app_slug">github</parameter>
        </invoke>
        </function_calls>
        ''')
    async def get_credential_profiles(self, app_slug: Optional[str] = None) -> ToolResult:
        try:
            from uuid import UUID
            account_id = await self._get_current_account_id()
            profile_service = ComposioProfileService(self.db)
            profiles = await profile_service.get_profiles(UUID(account_id), app_slug)
            
            formatted_profiles = []
            for profile in profiles:
                formatted_profiles.append({
                    "profile_id": str(profile.profile_id),
                    "profile_name": profile.profile_name,
                    "display_name": profile.display_name,
                    "app_slug": profile.toolkit_slug,
                    "app_name": profile.toolkit_name,
                    "external_user_id": profile.external_user_id,
                    "is_connected": profile.is_connected,
                    "is_active": profile.is_active,
                    "is_default": profile.is_default,
                    "enabled_tools": profile.enabled_tools or [],
                    "created_at": profile.created_at.isoformat() if profile.created_at else None,
                    "last_used_at": profile.last_used_at.isoformat() if profile.last_used_at else None
                })
            
            return self.success_response({
                "message": f"Found {len(formatted_profiles)} credential profiles",
                "profiles": formatted_profiles,
                "total_count": len(formatted_profiles)
            })
            
        except Exception as e:
            return self.fail_response(f"Error getting credential profiles: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "create_credential_profile",
            "description": "Create a new Composio credential profile for a specific app. This will generate a unique external user ID for the profile.",
            "parameters": {
                "type": "object",
                "properties": {
                    "app_slug": {
                        "type": "string",
                        "description": "The app slug to create the profile for (e.g., 'github', 'linear', 'slack')"
                    },
                    "profile_name": {
                        "type": "string",
                        "description": "A name for this credential profile (e.g., 'Personal GitHub', 'Work Slack')"
                    },
                    "display_name": {
                        "type": "string",
                        "description": "Display name for the profile (defaults to profile_name if not provided)"
                    }
                },
                "required": ["app_slug", "profile_name"]
            }
        }
    })
    @usage_example('''
        <function_calls>
        <invoke name="create_credential_profile">
        <parameter name="app_slug">github</parameter>
        <parameter name="profile_name">Personal GitHub</parameter>
        <parameter name="display_name">My Personal GitHub Account</parameter>
        </invoke>
        </function_calls>
        ''')
    async def create_credential_profile(
        self,
        app_slug: str,
        profile_name: str,
        display_name: Optional[str] = None
    ) -> ToolResult:
        try:
            from uuid import UUID
            account_id = await self._get_current_account_id()
            # fetch toolkit domain object directly
            toolkit_service = ToolkitService()
            toolkit_obj = await toolkit_service.get_toolkit_by_slug(app_slug)
            if not toolkit_obj:
                return self.fail_response(f"Could not find toolkit for slug '{app_slug}'")
            # create credential profile using the toolkit name
            profile_service = ComposioProfileService(self.db_connection)
            profile = await profile_service.create_profile(
                account_id=UUID(account_id),
                profile_name=profile_name,
                toolkit_slug=app_slug,
                toolkit_name=toolkit_obj.name,
                description=display_name or profile_name,
                enabled_tools=[]
            )
            
            return self.success_response({
                "message": f"Successfully created credential profile '{profile_name}' for {app_obj.name}",
                "profile": {
                    "profile_id": str(profile.profile_id),
                    "profile_name": profile.profile_name.value if hasattr(profile.profile_name, 'value') else str(profile.profile_name),
                    "display_name": profile.display_name,
                                    "app_slug": profile.toolkit_slug,
                "app_name": profile.toolkit_name,
                "external_user_id": profile.external_user_id,
                    "is_connected": profile.is_connected,
                    "created_at": profile.created_at.isoformat()
                }
            })
            
        except Exception as e:
            return self.fail_response(f"Error creating credential profile: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "connect_credential_profile",
            "description": "Generate a connection link for a credential profile. The user needs to visit this link to connect their app account to the profile.",
            "parameters": {
                "type": "object",
                "properties": {
                    "profile_id": {
                        "type": "string",
                        "description": "The ID of the credential profile to connect"
                    }
                },
                "required": ["profile_id"]
            }
        }
    })
    @usage_example('''
        <function_calls>
        <invoke name="connect_credential_profile">
        <parameter name="profile_id">profile-uuid-123</parameter>
        </invoke>
        </function_calls>
        ''')
    async def connect_credential_profile(self, profile_id: str) -> ToolResult:
        try:
            from uuid import UUID
            account_id = await self._get_current_account_id()
            
            profile_service = ComposioProfileService(self.db_connection)
            profile = await profile_service.get_profile(UUID(account_id), UUID(profile_id))
            if not profile:
                return self.fail_response("Credential profile not found")
            
            # For now, we'll return a placeholder since the new structure doesn't have connection tokens
            # TODO: Implement connection token generation in the new structure
            connection_result = {
                "connect_link_url": f"https://composio.dev/connect/{profile.toolkit_slug}?userId={profile.external_user_id}",
                "expires_at": None
            }
            
            return self.success_response({
                "message": f"Generated connection link for '{profile.display_name}'",
                "profile_name": profile.display_name,
                "app_name": profile.toolkit_name,
                "connection_link": connection_result.get("connect_link_url"),
                "external_user_id": profile.external_user_id,
                "expires_at": connection_result.get("expires_at"),
                "instructions": f"Please visit the connection link to connect your {profile.toolkit_name} account to this profile. After connecting, you'll be able to use {profile.toolkit_name} tools in your agent."
            })
            
        except Exception as e:
            return self.fail_response(f"Error connecting credential profile: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "check_profile_connection",
            "description": "Check the connection status of a credential profile and get available tools if connected.",
            "parameters": {
                "type": "object",
                "properties": {
                    "profile_id": {
                        "type": "string",
                        "description": "The ID of the credential profile to check"
                    }
                },
                "required": ["profile_id"]
            }
        }
    })
    @usage_example('''
        <function_calls>
        <invoke name="check_profile_connection">
        <parameter name="profile_id">profile-uuid-123</parameter>
        </invoke>
        </function_calls>
        ''')
    async def check_profile_connection(self, profile_id: str) -> ToolResult:
        try:
            from uuid import UUID
            account_id = await self._get_current_account_id()
            
            profile_service = ComposioProfileService(self.db_connection)
            profile = await profile_service.get_profile(UUID(account_id), UUID(profile_id))
            if not profile:
                return self.fail_response("Credential profile not found")
            
            # For now, we'll return basic profile info since the new structure doesn't have connection objects
            # TODO: Implement connection checking in the new structure
            connections = []
            
            response_data = {
                "profile_name": profile.display_name,
                "app_name": profile.toolkit_name,
                "app_slug": profile.toolkit_slug,
                "external_user_id": profile.external_user_id,
                "is_connected": profile.is_connected,
                "connections": connections,
                "connection_count": len(connections)
            }
            
            if profile.is_connected:
                try:
                    # TODO: Implement MCP server discovery in the new structure
                    response_data["available_tools"] = []
                    response_data["tool_count"] = 0
                    response_data["message"] = f"Profile '{profile.display_name}' is connected but no MCP tools are available yet"
                except Exception as mcp_error:
                    logger.error(f"Error getting MCP tools for profile: {mcp_error}")
                    response_data["message"] = f"Profile '{profile.display_name}' is connected but could not retrieve MCP tools"
            else:
                response_data["message"] = f"Profile '{profile.display_name}' is not connected yet"
            
            return self.success_response(response_data)
            
        except Exception as e:
            return self.fail_response(f"Error checking profile connection: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "configure_profile_for_agent",
            "description": "Configure a connected credential profile to be used by the agent with selected tools. Use this after the profile is connected and you want to add it to the agent.",
            "parameters": {
                "type": "object",
                "properties": {
                    "profile_id": {
                        "type": "string",
                        "description": "The ID of the connected credential profile"
                    },
                    "enabled_tools": {
                        "type": "array",
                        "description": "List of tool names to enable for this profile",
                        "items": {"type": "string"}
                    },
                    "display_name": {
                        "type": "string",
                        "description": "Optional custom display name for this configuration in the agent"
                    }
                },
                "required": ["profile_id", "enabled_tools"]
            }
        }
    })
    @usage_example('''
        <function_calls>
        <invoke name="configure_profile_for_agent">
        <parameter name="profile_id">profile-uuid-123</parameter>
        <parameter name="enabled_tools">["create_issue", "list_repositories", "get_user"]</parameter>
        <parameter name="display_name">Personal GitHub Integration</parameter>
        </invoke>
        </function_calls>
        ''')
    async def configure_profile_for_agent(
        self, 
        profile_id: str, 
        enabled_tools: List[str],
        display_name: Optional[str] = None
    ) -> ToolResult:
        try:
            from uuid import UUID
            account_id = await self._get_current_account_id()
            client = await self.db.client

            profile_service = ComposioProfileService(self.db)
            profile = await profile_service.get_profile(UUID(account_id), UUID(profile_id))
            if not profile:
                return self.fail_response("Credential profile not found")
            if not profile.is_connected:
                return self.fail_response("Profile is not connected yet. Please connect the profile first.")

            agent_result = await client.table('agents').select('current_version_id').eq('agent_id', self.agent_id).execute()
            if not agent_result.data or not agent_result.data[0].get('current_version_id'):
                return self.fail_response("Agent configuration not found")

            version_result = await client.table('agent_versions')\
                .select('config')\
                .eq('version_id', agent_result.data[0]['current_version_id'])\
                .maybe_single()\
                .execute()
            
            if not version_result.data or not version_result.data.get('config'):
                return self.fail_response("Agent version configuration not found")

            current_config = version_result.data['config']
            current_tools = current_config.get('tools', {})
            current_custom_mcps = current_tools.get('custom_mcp', [])

            app_slug = profile.toolkit_slug
            
            new_mcp_config = {
                'name': profile.toolkit_name,
                'type': 'composio',
                'config': {
                    'profile_id': profile_id,
                    'toolkit_slug': profile.toolkit_slug,
                    'mcp_qualified_name': profile.mcp_qualified_name
                },
                'enabledTools': enabled_tools
            }
            
            updated_mcps = [mcp for mcp in current_custom_mcps 
                          if mcp.get('config', {}).get('profile_id') != profile_id]
            
            updated_mcps.append(new_mcp_config)
            
            current_tools['custom_mcp'] = updated_mcps
            current_config['tools'] = current_tools
            
            from agent.versioning.version_service import get_version_service
            version_service = await get_version_service()
            new_version = await version_service.create_version(
                agent_id=self.agent_id,
                user_id=account_id,
                system_prompt=current_config.get('system_prompt', ''),
                configured_mcps=current_config.get('tools', {}).get('mcp', []),
                custom_mcps=updated_mcps,
                agentpress_tools=current_config.get('tools', {}).get('agentpress', {}),
                change_description=f"Configured {display_name or profile.display_name} with {len(enabled_tools)} tools"
            )

            profile_name = profile.profile_name.value if hasattr(profile.profile_name, 'value') else str(profile.profile_name)
            return self.success_response({
                "message": f"Profile '{profile_name}' updated with {len(enabled_tools)} tools",
                "enabled_tools": enabled_tools,
                "total_tools": len(enabled_tools),
                "version_id": new_version.version_id,
                "version_name": new_version.version_name
            })
            
        except Exception as e:
            logger.error(f"Error configuring profile for agent: {e}", exc_info=True)
            return self.fail_response(f"Error configuring profile for agent: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "delete_credential_profile",
            "description": "Delete a credential profile that is no longer needed. This will also remove it from any agent configurations.",
            "parameters": {
                "type": "object",
                "properties": {
                    "profile_id": {
                        "type": "string",
                        "description": "The ID of the credential profile to delete"
                    }
                },
                "required": ["profile_id"]
            }
        }
    })
    @usage_example('''
        <function_calls>
        <invoke name="delete_credential_profile">
        <parameter name="profile_id">profile-uuid-123</parameter>
        </invoke>
        </function_calls>
        ''')
    async def delete_credential_profile(self, profile_id: str) -> ToolResult:
        try:
            from uuid import UUID
            account_id = await self._get_current_account_id()
            client = await self.db.client
            
            profile = await profile_service.get_profile(UUID(account_id), UUID(profile_id))
            if not profile:
                return self.fail_response("Credential profile not found")
            
            agent_result = await client.table('agents').select('current_version_id').eq('agent_id', self.agent_id).execute()
            if agent_result.data and agent_result.data[0].get('current_version_id'):
                version_result = await client.table('agent_versions')\
                    .select('config')\
                    .eq('version_id', agent_result.data[0]['current_version_id'])\
                    .maybe_single()\
                    .execute()
                
                if version_result.data and version_result.data.get('config'):
                    current_config = version_result.data['config']
                    current_tools = current_config.get('tools', {})
                    current_custom_mcps = current_tools.get('custom_mcp', [])
                    
                    updated_mcps = [mcp for mcp in current_custom_mcps if mcp.get('config', {}).get('profile_id') != str(profile.profile_id)]
                    
                    if len(updated_mcps) != len(current_custom_mcps):
                        from agent.versioning.version_service import get_version_service
                        try:
                            current_tools['custom_mcp'] = updated_mcps
                            current_config['tools'] = current_tools
                            
                            version_service = await get_version_service()
                            await version_service.create_version(
                                agent_id=self.agent_id,
                                user_id=account_id,
                                system_prompt=current_config.get('system_prompt', ''),
                                configured_mcps=current_config.get('tools', {}).get('mcp', []),
                                custom_mcps=updated_mcps,
                                agentpress_tools=current_config.get('tools', {}).get('agentpress', {}),
                                change_description=f"Deleted credential profile {profile.display_name}"
                            )
                        except Exception as e:
                            return self.fail_response(f"Failed to update agent config: {str(e)}")
            
            await profile_service.delete_profile(UUID(account_id), UUID(profile_id))
            
            return self.success_response({
                "message": f"Successfully deleted credential profile '{profile.display_name}' for {profile.toolkit_name}",
                "deleted_profile": {
                    "profile_id": str(profile.profile_id),
                    "profile_name": profile.profile_name,
                    "app_name": profile.toolkit_name
                }
            })
            
        except Exception as e:
            return self.fail_response(f"Error deleting credential profile: {str(e)}") 