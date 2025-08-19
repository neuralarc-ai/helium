# backend/mcp_module/composio_mcp_service.py
import os
import logging
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from mcp import ClientSession
from mcp.client.sse import sse_client
from mcp.client.streamable_http import streamablehttp_client
import aiohttp

logger = logging.getLogger(__name__)

class ComposioMCPError(Exception):
    pass

@dataclass
class ComposioMCPTool:
    name: str
    description: str
    input_schema: Dict[str, Any]

class ComposioMCPService:
    def __init__(self):
        self.base_url = os.getenv("COMPOSIO_API_URL", "https://api.composio.dev")
        self.api_key = os.getenv("COMPOSIO_API_KEY")
        self.session = None
        self.toolkits = {}

    async def _ensure_session(self) -> aiohttp.ClientSession:
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession(
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                }
            )
        return self.session

    async def get_profile_mcp_config(self, profile_id: str) -> Dict[str, Any]:
        try:
            session = await self._ensure_session()
            url = f"{self.base_url}/v1/profiles/{profile_id}/mcp-config"
            
            async with session.get(url) as response:
                if response.status != 200:
                    error = await response.text()
                    raise ComposioMCPError(f"Failed to get MCP config: {error}")
                return await response.json()
                
        except Exception as e:
            logger.error(f"Error getting MCP config: {str(e)}", exc_info=True)
            raise ComposioMCPError(f"Failed to get MCP config: {str(e)}")

    async def get_toolkits(self) -> List[ComposioMCPTool]:
        try:
            session = await self._ensure_session()
            url = f"{self.base_url}/v1/toolkits"
            
            async with session.get(url) as response:
                if response.status != 200:
                    error = await response.text()
                    raise ComposioMCPError(f"Failed to get toolkits: {error}")
                toolkits = await response.json()
                self.toolkits = [ComposioMCPTool(**toolkit) for toolkit in toolkits]
                return self.toolkits
                
        except Exception as e:
            logger.error(f"Error getting toolkits: {str(e)}", exc_info=True)
            raise ComposioMCPError(f"Failed to get toolkits: {str(e)}")

    async def get_profile(self, profile_id: str) -> Dict[str, Any]:
        try:
            session = await self._ensure_session()
            url = f"{self.base_url}/v1/profiles/{profile_id}"
            
            async with session.get(url) as response:
                if response.status != 200:
                    error = await response.text()
                    raise ComposioMCPError(f"Failed to get profile: {error}")
                return await response.json()
                
        except Exception as e:
            logger.error(f"Error getting profile: {str(e)}", exc_info=True)
            raise ComposioMCPError(f"Failed to get profile: {str(e)}")

    async def create_webhook(self, profile_id: str, webhook_url: str) -> Dict[str, Any]:
        try:
            session = await self._ensure_session()
            url = f"{self.base_url}/v1/profiles/{profile_id}/webhooks"
            
            async with session.post(url, json={"url": webhook_url}) as response:
                if response.status != 201:
                    error = await response.text()
                    raise ComposioMCPError(f"Failed to create webhook: {error}")
                return await response.json()
                
        except Exception as e:
            logger.error(f"Error creating webhook: {str(e)}", exc_info=True)
            raise ComposioMCPError(f"Failed to create webhook: {str(e)}")

# Singleton instance
composio_mcp_service = ComposioMCPService()