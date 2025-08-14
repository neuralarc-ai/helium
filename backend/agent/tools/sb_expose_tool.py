from agentpress.tool import ToolResult, openapi_schema, usage_example
from sandbox.tool_base import SandboxToolsBase
from agentpress.thread_manager import ThreadManager
import asyncio
import os
import time
import uuid
from datetime import datetime, timezone

class SandboxExposeTool(SandboxToolsBase):
    """Tool for exposing and managing preview URLs for sandbox ports.
    
    This tool allows exposing ports from the sandbox environment with both temporary
    and permanent URL options. Permanent URLs are stored in the database and can be
    retrieved later even if the sandbox is restarted.
    """

    def __init__(self, project_id: str, thread_manager: ThreadManager):
        super().__init__(project_id, thread_manager)
        self._db = None
        
    async def _get_db(self):
        """Get a database client."""
        if self._db is None:
            self._db = await self.thread_manager.db.client
        return self._db
        
    def _generate_slug(self) -> str:
        """Generate a unique slug for the exposed port."""
        return f"port-{uuid.uuid4().hex[:8]}"

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "expose_port",
            "description": "Expose a port from the agent's sandbox environment to the public internet and get its preview URL. This is essential for making services running in the sandbox accessible to users, such as web applications, APIs, or other network services. The exposed URL can be shared with users to allow them to interact with the sandbox environment.",
            "parameters": {
                "type": "object",
                "properties": {
                    "port": {
                        "type": "integer",
                        "description": "The port number to expose. Must be a valid port number between 1 and 65535.",
                        "minimum": 1,
                        "maximum": 65535
                    },
                    "permanent": {
                        "type": "boolean",
                        "description": "Whether to create a permanent URL that persists across sandbox restarts. Default is false.",
                        "default":True
                    },
                    "slug": {
                        "type": "string",
                        "description": "Optional custom slug for the permanent URL. If not provided, a random one will be generated."
                    }
                },
                "required": ["port"]
            }
        }
    })
    @usage_example('''
        <!-- Example 1: Expose a web server running on port 8000 -->
        <function_calls>
        <invoke name="expose_port">
        <parameter name="port">8000</parameter>
        </invoke>
        </function_calls>

        <!-- Example 2: Expose an API service with a permanent URL -->
        <function_calls>
        <invoke name="expose_port">
        <parameter name="port">3000</parameter>
        <parameter name="permanent">true</parameter>
        </invoke>
        </function_calls>

        <!-- Example 3: Expose with a custom slug -->
        <function_calls>
        <invoke name="expose_port">
        <parameter name="port">8080</parameter>
        <parameter name="permanent">true</parameter>
        <parameter name="slug">my-app</parameter>
        </invoke>
        </function_calls>
        ''')
    async def _get_or_create_exposed_port(self, port: int, permanent: bool = True, slug: str = None) -> dict:
        """Get or create an exposed port entry in the database.
        
        Args:
            port: The port number to expose
            permanent: Whether to create a permanent URL (always True)
            slug: Optional custom slug for the URL
            
        Returns:
            Dictionary with port information including URL and slug
        """
        db = await self._get_db()
        
        # Generate a slug if not provided
        slug = slug or self._generate_slug()
        
        # Get the preview link from the sandbox
        preview_link = await self.sandbox.get_preview_link(port)
        url = preview_link.url if hasattr(preview_link, 'url') else str(preview_link)
        
        # Get the base URL from environment or use the preview URL's base
        base_url = os.getenv('PERMANENT_URL_BASE', url.rsplit('/', 1)[0] if '/' in url else url)
        
        # Construct the permanent URL path
        permanent_url = f"{base_url}/p/{slug}"
        
        # Store the mapping in the database
        await db.table('exposed_ports').upsert({
            'slug': slug,
            'project_id': self.project_id,
            'port': port,
            'current_url': permanent_url,
            'original_url': url,  # Store the original URL for reference
            'updated_at': datetime.now(timezone.utc).isoformat()
        }).on_conflict('slug').update({
            'port': port,
            'current_url': permanent_url,
            'original_url': url,
            'updated_at': datetime.now(timezone.utc).isoformat()
        }).execute()
        
        return {
            "url": permanent_url,
            "original_url": url,
            "port": port,
            "slug": slug,
            "permanent": True
        }
        
    async def get_exposed_ports(self) -> list[dict]:
        """Get all exposed ports for the current project."""
        db = await self._get_db()
        result = await db.table('exposed_ports') \
            .select('*') \
            .eq('project_id', self.project_id) \
            .execute()
        return result.data if hasattr(result, 'data') else []
        
    async def delete_exposed_port(self, slug: str) -> bool:
        """Delete an exposed port by its slug."""
        db = await self._get_db()
        result = await db.table('exposed_ports') \
            .delete() \
            .eq('slug', slug) \
            .eq('project_id', self.project_id) \
            .execute()
        return bool(result.data) if hasattr(result, 'data') else False
        
    async def expose_port(self, port: int, permanent: bool = True, slug: str = None) -> ToolResult:
        try:
            # Ensure sandbox is initialized
            await self._ensure_sandbox()
            
            # Convert port to integer if it's a string
            port = int(port)
            
            # Validate port number
            if not 1 <= port <= 65535:
                return self.fail_response(f"Invalid port number: {port}. Must be between 1 and 65535.")
                
            # All URLs are now permanent by default
            permanent = True

            # Check if something is actually listening on the port (for custom ports)
            if port not in [6080, 8080, 8003]:  # Skip check for known sandbox ports
                try:
                    port_check = await self.sandbox.process.exec(f"netstat -tlnp | grep :{port}", timeout=5)
                    if port_check.exit_code != 0:
                        return self.fail_response(f"No service is currently listening on port {port}. Please start a service on this port first.")
                except Exception:
                    # If we can't check, proceed anyway - the user might be starting a service
                    pass

            # Create the exposed port entry with permanent URL
            port_info = await self._get_or_create_exposed_port(port, permanent=True, slug=slug)
            
            # Prepare response message with clickable link using Markdown
            message = (
                f"✅ Successfully created permanent URL for port {port}.\n"
                f"🔗 [CLICK HERE TO OPEN LINK]({port_info['url']})\n"
                f"📌 Permanent slug: {port_info['slug']}"
            )
            
            # Return the response with the URL and port information
            return self.success_response({
                **port_info,
                "message": message
            })
                
        except ValueError as ve:
            return self.fail_response(f"Invalid port number: {port}. Must be a valid integer between 1 and 65535.")
        except Exception as e:
            return self.fail_response(f"Error exposing port {port}: {str(e)}")
