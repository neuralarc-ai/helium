from agentpress.tool import Tool, ToolResult, openapi_schema, usage_example
from agentpress.thread_manager import ThreadManager
import json

class ExpandMessageTool(Tool):
    """Tool for expanding a previous message to the user."""

    def __init__(self, thread_id: str, thread_manager: ThreadManager):
        super().__init__()
        self.thread_manager = thread_manager
        self.thread_id = thread_id

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "expand_message",
            "description": "Expand a message from the previous conversation with the user. Use this tool to expand a message that was truncated in the earlier conversation.",
            "parameters": {
                "type": "object",
                "properties": {
                    "message_id": {
                        "type": "string",
                        "description": "The ID of the message to expand. Must be a UUID."
                    }
                },
                "required": ["message_id"]
            }
        }
    })
    @usage_example('''
        <!-- Example 1: Expand a message that was truncated in the previous conversation -->
        <function_calls>
        <invoke name="expand_message">
        <parameter name="message_id">ecde3a4c-c7dc-4776-ae5c-8209517c5576</parameter>
        </invoke>
        </function_calls>

        <!-- Example 2: Expand a message to create reports or analyze truncated data -->
        <function_calls>
        <invoke name="expand_message">
        <parameter name="message_id">f47ac10b-58cc-4372-a567-0e02b2c3d479</parameter>
        </invoke>
        </function_calls>

        <!-- Example 3: Expand a message when you need the full content for analysis -->
        <function_calls>
        <invoke name="expand_message">
        <parameter name="message_id">550e8400-e29b-41d4-a716-446655440000</parameter>
        </invoke>
        </function_calls>
        ''')
    async def expand_message(self, message_id: str) -> ToolResult:
        """Expand a message from the previous conversation with the user.

        Args:
            message_id: The ID of the message to expand

        Returns:
            ToolResult with the expanded message content
        """
        try:
            client = await self.thread_manager.db.client
            message = await client.table('messages').select('*').eq('message_id', message_id).eq('thread_id', self.thread_id).execute()

            if not message.data or len(message.data) == 0:
                return self.fail_response(f"Message with ID {message_id} not found in thread {self.thread_id}")

            message_data = message.data[0]
            message_content = message_data['content']
            final_content = message_content
            if isinstance(message_content, dict) and 'content' in message_content:
                final_content = message_content['content']
            elif isinstance(message_content, str):
                try:
                    parsed_content = json.loads(message_content)
                    if isinstance(parsed_content, dict) and 'content' in parsed_content:
                        final_content = parsed_content['content']
                except json.JSONDecodeError:
                    pass

            # Return the message content directly in the result field
            return self.success_response(
                result=final_content,
                message=f"Message expanded successfully. Content length: {len(str(final_content))} characters"
            )
        except Exception as e:
            return self.fail_response(f"Error expanding message: {str(e)}")

if __name__ == "__main__":
    import asyncio

    async def test_expand_message_tool():
        # Note: This is just a placeholder test - you'll need to provide actual thread_id and thread_manager
        # For production use, this tool should be instantiated with proper dependencies
        print("ExpandMessageTool test - this tool requires thread_id and thread_manager to be instantiated")
        print("Tool schema:", ExpandMessageTool.__doc__)

    # Uncomment the line below to run the test (requires proper setup)