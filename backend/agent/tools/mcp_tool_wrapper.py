from typing import Any, Dict, List, Optional
from agentpress.tool import Tool, ToolResult, ToolSchema, SchemaType
from mcp_module import mcp_service
from utils.logger import logger
import inspect
from agent.tools.utils.mcp_connection_manager import MCPConnectionManager
from agent.tools.utils.custom_mcp_handler import CustomMCPHandler
from agent.tools.utils.dynamic_tool_builder import DynamicToolBuilder
from agent.tools.utils.mcp_tool_executor import MCPToolExecutor


class MCPToolWrapper(Tool):
    def __init__(self, mcp_configs: Optional[List[Dict[str, Any]]] = None):
        self.mcp_manager = mcp_service
        self.mcp_configs = mcp_configs or []
        self._initialized = False
        self._schemas: Dict[str, List[ToolSchema]] = {}
        self._dynamic_tools = {}
        self._custom_tools = {}
        
        self.connection_manager = MCPConnectionManager()
        self.custom_handler = CustomMCPHandler(self.connection_manager)
        self.tool_builder = DynamicToolBuilder()
        self.tool_executor = None
        
        super().__init__()
        
    async def _ensure_initialized(self):
        if not self._initialized:
            await self._initialize_servers()
            await self._create_dynamic_tools()
            self._initialized = True
    
    async def _initialize_servers(self):
        standard_configs = [cfg for cfg in self.mcp_configs if not cfg.get('isCustom', False)]
        custom_configs = [cfg for cfg in self.mcp_configs if cfg.get('isCustom', False)]
        
        if standard_configs:
            await self._initialize_standard_servers(standard_configs)
        
        if custom_configs:
            await self.custom_handler.initialize_custom_mcps(custom_configs)
            
    async def _initialize_standard_servers(self, standard_configs: List[Dict[str, Any]]):
        for config in standard_configs:
            try:
                logger.info(f"Attempting to connect to MCP server: {config['qualifiedName']}")
                await self.mcp_manager.connect_server(config)
                logger.info(f"Successfully connected to MCP server: {config['qualifiedName']}")
            except Exception as e:
                logger.error(f"Failed to connect to MCP server {config['qualifiedName']}: {e}")
    
    async def _create_dynamic_tools(self):
        try:
            available_tools = self.mcp_manager.get_all_tools_openapi()
            custom_tools = self.custom_handler.get_custom_tools()
            
            logger.info(f"MCPManager returned {len(available_tools)} tools")
            logger.info(f"Custom handler returned {len(custom_tools)} custom tools")
            
            self._custom_tools = custom_tools
            
            self.tool_executor = MCPToolExecutor(custom_tools, self)
            
            dynamic_methods = self.tool_builder.create_dynamic_methods(
                available_tools, 
                custom_tools, 
                self._execute_mcp_tool
            )
            
            self._dynamic_tools = self.tool_builder.get_dynamic_tools()
            
            for method_name, method in dynamic_methods.items():
                setattr(self, method_name, method)
            
            self._schemas.update(self.tool_builder.get_schemas())
            
            logger.info(f"Created {len(self._dynamic_tools)} dynamic MCP tool methods")
            
            # Re-register schemas to pick up the dynamic methods
            self._register_schemas()
            logger.info(f"Re-registered schemas after creating dynamic tools - total: {len(self._schemas)}")
            
        except Exception as e:
            logger.error(f"Error creating dynamic MCP tools: {e}")
    
    def _register_schemas(self):
        self._schemas.clear()

        for name, method in inspect.getmembers(self, predicate=inspect.ismethod):
            if hasattr(method, 'tool_schemas'):
                self._schemas[name] = method.tool_schemas
                logger.debug(f"Registered schemas for method '{name}' in {self.__class__.__name__}")
        
        if hasattr(self, '_dynamic_tools') and self._dynamic_tools:
            for tool_name, tool_data in self._dynamic_tools.items():
                method_name = tool_data.get('method_name')
                if method_name and method_name in self._schemas:
                    continue
                
                method = tool_data.get('method')
                if method and hasattr(method, 'tool_schemas'):
                    self._schemas[method_name] = method.tool_schemas
                    logger.debug(f"Registered dynamic method schemas for '{method_name}'")
        
        logger.debug(f"Registration complete for MCPToolWrapper - total schemas: {len(self._schemas)}")
    
    def get_schemas(self) -> Dict[str, List[ToolSchema]]:
        logger.debug(f"get_schemas called - returning {len(self._schemas)} schemas")
        for method_name in self._schemas:
            logger.debug(f"  - Schema available for: {method_name}")
        return self._schemas
    
    def __getattr__(self, name: str):
        if hasattr(self, 'tool_builder') and self.tool_builder:
            method = self.tool_builder.find_method_by_name(name)
            if method:
                return method
        
        if hasattr(self, '_dynamic_tools') and self._dynamic_tools:
            for tool_data in self._dynamic_tools.values():
                if tool_data.get('method_name') == name:
                    return tool_data.get('method')
            
            name_with_hyphens = name.replace('_', '-')
            for tool_name, tool_data in self._dynamic_tools.items():
                if tool_data.get('method_name') == name or tool_name == name_with_hyphens:
                    return tool_data.get('method')
        
        raise AttributeError(f"'{self.__class__.__name__}' object has no attribute '{name}'")
    
    async def initialize_and_register_tools(self, tool_registry=None):
        await self._ensure_initialized()
        if tool_registry and self._dynamic_tools:
            logger.info(f"Updating tool registry with {len(self._dynamic_tools)} MCP tools")
            
    async def get_available_tools(self) -> List[Dict[str, Any]]:
        await self._ensure_initialized()
        return self.mcp_manager.get_all_tools_openapi()
    
    async def _execute_mcp_tool(self, tool_name: str, arguments: Dict[str, Any]) -> ToolResult:
        await self._ensure_initialized()
        return await self.tool_executor.execute_tool(tool_name, arguments)
    
    async def cleanup(self):
        if self._initialized:
            try:
                await self.mcp_manager.disconnect_all()
            except Exception as e:
                logger.error(f"Error during MCP cleanup: {str(e)}")
            finally:
                self._initialized = False 