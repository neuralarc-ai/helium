"""
Clean browser-use integration for Helium.
"""
import os
from typing import Dict, Any, Optional
from browser_use import Agent, BrowserSession
from browser_use.llm import ChatOpenAI
from browser_use.controller import Controller
from browser_use.mcp import MCPController
from utils.logger import logger

class BrowserUseIntegration:
    """Clean browser-use integration."""
    
    def __init__(self, thread_id: str):
        self.thread_id = thread_id
        self.agent: Optional[Agent] = None
        self.session: Optional[BrowserSession] = None
        self.controller: Optional[Controller] = None
        
        # Ensure directories exist
        os.makedirs("/tmp/browser_use/profiles", exist_ok=True)
        os.makedirs("/tmp/browser_use/conversations", exist_ok=True)
        
    async def initialize(self) -> None:
        """Initialize browser-use components."""
        try:
            # Initialize browser session
            self.session = BrowserSession(
                user_data_dir=f"/tmp/browser_use/profiles/{self.thread_id}"
            )
            
            # Initialize MCP controller
            self.controller = MCPController(
                server_name="browser-use",
                session=self.session
            )
            
            logger.info(f"Initialized browser-use for thread {self.thread_id}")
        except Exception as e:
            logger.error(f"Failed to initialize browser-use: {str(e)}", exc_info=True)
            raise
            
    def _get_llm(self, model: str = "gpt-4", temperature: float = 0.7):
        """Get LLM instance."""
        try:
            # Try OpenRouter if configured
            if os.getenv("OPENROUTER_API_KEY") and model.startswith("o4"):
                return ChatOpenAI(
                    model=model,
                    temperature=temperature,
                    api_key=os.getenv("OPENROUTER_API_KEY"),
                    base_url="https://openrouter.ai/api/v1"
                )
            # Use OpenAI
            return ChatOpenAI(
                model=model,
                temperature=temperature,
                api_key=os.getenv("OPENAI_API_KEY")
            )
        except Exception as e:
            logger.warning(f"LLM initialization failed: {str(e)}, falling back to GPT-4")
            return ChatOpenAI(
                model="gpt-4",
                temperature=temperature,
                api_key=os.getenv("OPENAI_API_KEY")
            )
            
    async def execute(self, task: str, **kwargs) -> Dict[str, Any]:
        """Execute a browser task.
        
        Args:
            task: The browser task to execute
            **kwargs: Additional arguments
                - model: LLM model to use
                - temperature: LLM temperature
                
        Returns:
            Dict containing task results
        """
        if not self.session:
            await self.initialize()
            
        try:
            # Initialize agent for this task
            self.agent = Agent(
                task=task,
                llm=self._get_llm(
                    model=kwargs.get("model", "gpt-4"),
                    temperature=kwargs.get("temperature", 0.7)
                ),
                controller=self.controller,
                use_vision=True,
                save_conversation_path=f"/tmp/browser_use/conversations/{self.thread_id}.json"
            )
            
            # Execute task
            history = await self.agent.run()
            
            # Return results
            return {
                "type": "browser_use",
                "status": "completed",
                "history": history.to_dict(),
                "urls": history.urls(),
                "actions": history.action_names(),
                "content": history.extracted_content(),
                "screenshots": history.screenshots(),
                "errors": history.errors()
            }
            
        except Exception as e:
            logger.error(f"Browser task execution failed: {str(e)}", exc_info=True)
            return {
                "type": "browser_use",
                "status": "error",
                "error": str(e)
            }
            
    async def cleanup(self):
        """Cleanup browser-use resources."""
        try:
            if self.controller:
                await self.controller.close()
            if self.session:
                await self.session.close()
        except Exception as e:
            logger.error(f"Failed to cleanup browser-use: {str(e)}", exc_info=True)
