import os
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from utils.logger import logger
from utils.auth_utils import get_current_user_id_from_jwt
from agentpress.thread_manager import ThreadManager
from services.supabase import DBConnection
from services.llm import make_llm_api_call
from utils.config import config

router = APIRouter(tags=["voice"])

# Initialize database connection
db = DBConnection()

class VoiceProcessRequest(BaseModel):
    thread_id: str
    user_input: str
    conversation_history: Optional[List[Dict[str, str]]] = None
    is_first_message: bool = False
    project_id: Optional[str] = None

class VoiceProcessResponse(BaseModel):
    response: str
    thread_id: str
    message_id: str
    agent_run_id: Optional[str] = None

class CreateVoiceThreadRequest(BaseModel):
    project_id: Optional[str] = None
    name: Optional[str] = None

class CreateVoiceThreadResponse(BaseModel):
    thread_id: str
    project_id: str
    name: str

@router.post("/voice/threads", response_model=CreateVoiceThreadResponse)
async def create_voice_thread(
    request: CreateVoiceThreadRequest,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    """Create a new thread specifically for voice conversations."""
    try:
        logger.info(f"Creating new voice thread for user: {user_id}")
        
        # Initialize thread manager
        thread_manager = ThreadManager()
        
        # If no project_id provided, get the user's first project
        if not request.project_id:
            client = await db.client
            project_result = await client.table('projects').select('project_id').eq('account_id', user_id).limit(1).execute()
            if project_result.data and len(project_result.data) > 0:
                request.project_id = project_result.data[0].get('project_id')
                logger.info(f"Using user's first project: {request.project_id}")
            else:
                # Create a default project if none exists
                default_project = await client.table('projects').insert({
                    'account_id': user_id,
                    'name': 'Personal',
                    'description': 'Personal workspace'
                }).select('project_id').execute()
                request.project_id = default_project.data[0].get('project_id')
                logger.info(f"Created default project: {request.project_id}")
        
        # Create a new thread
        thread_id = await thread_manager.create_thread(
            account_id=user_id,
            project_id=request.project_id,
            metadata={
                "type": "voice_conversation",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "name": request.name or f"Voice Conversation {datetime.now().strftime('%I:%M %p')}"
            }
        )
        
        # Get project ID from thread
        client = await db.client
        thread_result = await client.table('threads').select('project_id').eq('thread_id', thread_id).execute()
        project_id = thread_result.data[0].get('project_id') if thread_result.data else None
        
        logger.info(f"Voice thread created successfully: {thread_id}")
        logger.info(f"Thread data: thread_id={thread_id}, project_id={project_id}, name={request.name}")
        
        return CreateVoiceThreadResponse(
            thread_id=thread_id,
            project_id=project_id or "default",
            name=request.name or f"Voice Conversation {datetime.now().strftime('%I:%M %p')}"
        )
        
    except Exception as e:
        logger.error(f"Failed to create voice thread: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create voice thread: {str(e)}")

@router.post("/voice/process", response_model=VoiceProcessResponse)
async def process_voice_input(
    request: VoiceProcessRequest,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    """Process voice input with conversation history and thread context."""
    try:
        logger.info(f"Processing voice input for thread: {request.thread_id}")
        
        # Initialize thread manager
        thread_manager = ThreadManager()
        
        # Add user message to thread
        user_message = await thread_manager.add_message(
            thread_id=request.thread_id,
            type="user",
            content={"role": "user", "content": request.user_input},
            is_llm_message=False
        )
        
        if request.is_first_message:
            # For first message, start the agent and get response
            return await handle_first_message(
                thread_id=request.thread_id,
                user_input=request.user_input,
                user_id=user_id,
                project_id=request.project_id
            )
        else:
            # For subsequent messages, use existing conversation flow
            return await handle_ongoing_conversation(
                thread_id=request.thread_id,
                user_input=request.user_input
            )
            
    except Exception as e:
        logger.error(f"Voice processing failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Voice processing failed: {str(e)}")

async def handle_first_message(
    thread_id: str, 
    user_input: str, 
    user_id: str,
    project_id: Optional[str] = None
) -> VoiceProcessResponse:
    """Handle the first message in a voice conversation."""
    try:
        logger.info(f"Processing first message for voice thread: {thread_id}")
        
        # Get project ID from thread if not provided
        if not project_id:
            client = await db.client
            thread_result = await client.table('threads').select('project_id').eq('thread_id', thread_id).execute()
            if thread_result.data:
                project_id = thread_result.data[0].get('project_id')
        
        # Use LLM service for intelligent responses
        
        try:
            # Create a system prompt for voice assistant
            system_prompt = """You are a helpful voice assistant that provides intelligent, contextual responses to user queries. 
            You should be conversational, helpful, and provide accurate information. 
            Keep responses concise but informative, suitable for voice output.
            If the user asks about specific topics (like places, information, etc.), provide helpful and accurate responses."""
            
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_input}
            ]
            
            # Use the configured model
            model_name = config.MODEL_TO_USE or "moonshot/moonshot-v1-8k"
            
            logger.info(f"Calling LLM service with model: {model_name}")
            response = await make_llm_api_call(
                messages=messages,
                model_name=model_name,
                max_tokens=500,
                temperature=0.7
            )
            
            if response and response.get('choices') and response['choices'][0].get('message'):
                ai_response = response['choices'][0]['message'].get('content', '').strip()
                logger.info(f"LLM generated response: {ai_response[:100]}...")
            else:
                logger.warning("LLM response format unexpected, using fallback")
                ai_response = create_welcome_response(user_input)
                
        except Exception as llm_error:
            logger.error(f"LLM service failed: {str(llm_error)}")
            ai_response = create_welcome_response(user_input)
        
        # Add AI response to thread
        thread_manager = ThreadManager()
        await thread_manager.add_message(
            thread_id=thread_id,
            type="assistant",
            content={"role": "assistant", "content": ai_response},
            is_llm_message=True
        )
        
        logger.info(f"First message processed successfully for thread: {thread_id}")
        
        return VoiceProcessResponse(
            response=ai_response,
            thread_id=thread_id,
            message_id=str(uuid.uuid4()),
            agent_run_id=None
        )
        
    except Exception as e:
        logger.error(f"First message processing failed: {str(e)}")
        # Fallback response
        fallback_response = "Hello! I'm your voice assistant. How can I help you today?"
        
        # Add fallback response to thread
        thread_manager = ThreadManager()
        await thread_manager.add_message(
            thread_id=thread_id,
            type="assistant",
            content={"role": "assistant", "content": fallback_response},
            is_llm_message=True
        )
        
        return VoiceProcessResponse(
            response=fallback_response,
            thread_id=thread_id,
            message_id=str(uuid.uuid4())
        )

async def handle_ongoing_conversation(
    thread_id: str, 
    user_input: str
) -> VoiceProcessResponse:
    """Handle ongoing conversation messages."""
    try:
        logger.info(f"Processing ongoing conversation for thread: {thread_id}")
        
        # Use LLM service for intelligent responses
        
        try:
            # Create a system prompt for voice assistant
            system_prompt = """You are a helpful voice assistant that provides intelligent, contextual responses to user queries. 
            You should be conversational, helpful, and provide accurate information. 
            Keep responses concise but informative, suitable for voice output.
            If the user asks about specific topics (like places, information, etc.), provide helpful and accurate responses."""
            
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_input}
            ]
            
            # Use the configured model
            model_name = config.MODEL_TO_USE or "moonshot/moonshot-v1-8k"
            
            logger.info(f"Calling LLM service with model: {model_name}")
            response = await make_llm_api_call(
                messages=messages,
                model_name=model_name,
                max_tokens=500,
                temperature=0.7
            )
            
            if response and response.get('choices') and response['choices'][0].get('message'):
                ai_response = response['choices'][0]['message'].get('content', '').strip()
                logger.info(f"LLM generated response: {ai_response[:100]}...")
            else:
                logger.warning("LLM response format unexpected, using fallback")
                ai_response = create_contextual_response(user_input)
                
        except Exception as llm_error:
            logger.error(f"LLM service failed: {str(llm_error)}")
            ai_response = create_contextual_response(user_input)
        
        # Add AI response to thread
        thread_manager = ThreadManager()
        await thread_manager.add_message(
            thread_id=thread_id,
            type="assistant",
            content={"role": "assistant", "content": ai_response},
            is_llm_message=True
        )
        
        return VoiceProcessResponse(
            response=ai_response,
            thread_id=thread_id,
            message_id=str(uuid.uuid4())
        )
        
    except Exception as e:
        logger.error(f"Ongoing conversation processing failed: {str(e)}")
        # Fallback response
        fallback_response = "I'm here to help! What would you like to know?"
        
        # Add fallback response to thread
        thread_manager = ThreadManager()
        await thread_manager.add_message(
            thread_id=thread_id,
            type="assistant",
            content={"role": "assistant", "content": fallback_response},
            is_llm_message=True
        )
        
        return VoiceProcessResponse(
            response=fallback_response,
            thread_id=thread_id,
            message_id=str(uuid.uuid4())
        )

def create_welcome_response(user_input: str) -> str:
    """Create a welcome response for the first message."""
    input_lower = user_input.lower()
    
    if any(word in input_lower for word in ['hello', 'hi', 'hey', 'start']):
        return "Hello! I'm your voice assistant. I'm here to help you with tasks, answer questions, and assist with your projects. What would you like to work on today?"
    elif any(word in input_lower for word in ['help', 'assist', 'support']):
        return "I'm here to help! I can assist with coding, project management, web searches, and much more. Just tell me what you need help with."
    elif any(word in input_lower for word in ['what', 'how', 'why', 'when', 'where']):
        return "That's a great question! I'd be happy to help you with that. Let me know more details about what you're looking for."
    else:
        return f"Thank you for your message: '{user_input}'. I'm your voice assistant and I'm here to help. How can I assist you today?"

def create_contextual_response(user_input: str) -> str:
    """Create a contextual response for ongoing conversations."""
    input_lower = user_input.lower()
    
    if any(word in input_lower for word in ['thank', 'thanks', 'appreciate']):
        return "You're welcome! I'm glad I could help. Is there anything else you'd like assistance with?"
    elif any(word in input_lower for word in ['yes', 'yeah', 'sure', 'okay']):
        return "Great! What would you like me to help you with next?"
    elif any(word in input_lower for word in ['no', 'nope', 'not really']):
        return "No problem! If you need help with anything later, just let me know. I'm here when you're ready."
    elif any(word in input_lower for word in ['goodbye', 'bye', 'end', 'stop']):
        return "Goodbye! It was great helping you today. Feel free to start a new conversation anytime you need assistance."
    else:
        return "I understand. How else can I help you with your current task or question?"
