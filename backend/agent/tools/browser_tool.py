"""
Pure browser-use implementation without any custom modifications.
"""
from typing import Dict, Any
from agent.tools.base import Tool, ToolResult
from browser_use import Agent as BrowserAgent
from browser_use.llm import ChatOpenAI
from utils.logger import logger

class BrowserTool(Tool):
    """Pure browser-use implementation."""
    
    def __init__(self, project_id: str, thread_id: str, thread_manager):
        super().__init__(project_id, thread_id, thread_manager)
        self.agent = None
        
    async def execute(self, task: str, **kwargs) -> ToolResult:
        """Execute browser task using pure browser-use.
        
        Args:
            task: The browser task to execute
            **kwargs: Additional arguments
                - model: LLM model to use
                - temperature: LLM temperature
        """
        try:
            # Create browser-use agent with default settings
            self.agent = BrowserAgent(
                task=task,
                llm=ChatOpenAI(
                    model="gpt-4",
                    api_key=os.getenv("OPENAI_API_KEY")
                )
            )
            
            # Let browser-use handle everything
            history = await self.agent.run()
            
            return self.success_response(
                result={
                    "type": "browser_use",
                    "status": "completed",
                    "history": history.to_dict(),
                    "urls": history.urls(),
                    "actions": history.action_names(),
                    "content": history.extracted_content(),
                    "screenshots": history.screenshots()
                },
                message="Browser task completed"
            )
            
        except Exception as e:
            logger.error(f"Browser task failed: {str(e)}", exc_info=True)
            return self.fail_response(str(e))
            
    async def cleanup(self):
        """Let browser-use handle cleanup."""
        if self.agent:
            try:
                await self.agent.close()
            except Exception as e:
                logger.error(f"Cleanup failed: {str(e)}", exc_info=True)