"""
Tool registration for Helium.
"""
from agent.tools.browser_tool import BrowserTool
from utils.logger import logger

# Register tools
TOOLS = {
    "browser": BrowserTool,  # browser-use implementation with error handling
}

# Tool descriptions
TOOL_DESCRIPTIONS = {
    "browser": {
        "name": "browser",
        "description": "Use browser-use to automate web browsing, interact with websites, and extract information.",
        "enabled": True,
        "icon": "🌐",
        "color": "bg-indigo-100 dark:bg-indigo-800/50"
    }
}