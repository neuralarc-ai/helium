"""Service for handling Composio webhooks and triggers."""
import os
import logging
import json
import hmac
import hashlib
from typing import Dict, List, Optional, Any, Callable, Awaitable
from dataclasses import dataclass
from datetime import datetime, timedelta
import aiohttp
from fastapi import Request, HTTPException, status

logger = logging.getLogger(__name__)

WebhookHandler = Callable[[Dict[str, Any]], Awaitable[None]]

@dataclass
class WebhookEvent:
    """Represents a webhook event from Composio."""
    id: str
    event_type: str
    payload: Dict[str, Any]
    timestamp: datetime
    profile_id: Optional[str] = None
    trigger_id: Optional[str] = None

class WebhookVerificationError(Exception):
    """Raised when webhook signature verification fails."""
    pass

class ComposioWebhookService:
    """Service for handling Composio webhooks and triggers."""
    
    def __init__(self, webhook_secret: str = None):
        self.webhook_secret = webhook_secret or os.getenv("COMPOSIO_WEBHOOK_SECRET")
        self._event_handlers = {}
        self._session = None
        
    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create an aiohttp session."""
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession()
        return self._session

    def verify_webhook(
        self,
        payload: bytes,
        signature: str,
        timestamp: str,
        tolerance: int = 300
    ) -> bool:
        """
        Verify the signature of an incoming webhook.
        
        Args:
            payload: The raw request body
            signature: The signature from the X-Composio-Signature header
            timestamp: The timestamp from the X-Composio-Timestamp header
            tolerance: Maximum allowed seconds since the timestamp (default: 300s / 5 minutes)
            
        Returns:
            bool: True if the signature is valid, False otherwise
            
        Raises:
            WebhookVerificationError: If verification fails
        """
        if not self.webhook_secret:
            logger.warning("No webhook secret configured, webhook verification disabled")
            return True
            
        try:
            # Verify timestamp is recent to prevent replay attacks
            webhook_time = datetime.fromtimestamp(int(timestamp))
            if (datetime.utcnow() - webhook_time) > timedelta(seconds=tolerance):
                logger.warning(f"Webhook timestamp too old: {webhook_time}")
                raise WebhookVerificationError("Webhook timestamp too old")
                
            # Create signature
            signed_payload = f"{timestamp}.{payload.decode()}"
            expected_signature = hmac.new(
                key=self.webhook_secret.encode(),
                msg=signed_payload.encode(),
                digestmod=hashlib.sha256
            ).hexdigest()
            
            # Compare signatures using a constant-time comparison
            if not hmac.compare_digest(expected_signature, signature):
                raise WebhookVerificationError("Invalid webhook signature")
                
            return True
            
        except Exception as e:
            logger.error("Webhook verification failed", exc_info=True)
            if isinstance(e, WebhookVerificationError):
                raise
            raise WebhookVerificationError(f"Webhook verification failed: {str(e)}")

    async def parse_webhook(
        self,
        request: Request,
        verify_signature: bool = True
    ) -> WebhookEvent:
        """
        Parse and verify an incoming webhook request.
        
        Args:
            request: The incoming FastAPI request
            verify_signature: Whether to verify the webhook signature
            
        Returns:
            WebhookEvent: The parsed webhook event
            
        Raises:
            HTTPException: If the webhook is invalid or verification fails
        """
        try:
            # Read the raw body
            body = await request.body()
            
            # Verify signature if required
            if verify_signature:
                signature = request.headers.get("X-Composio-Signature")
                timestamp = request.headers.get("X-Composio-Timestamp")
                
                if not signature or not timestamp:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Missing required headers: X-Composio-Signature and X-Composio-Timestamp are required"
                    )
                
                self.verify_webhook(body, signature, timestamp)
            
            # Parse the JSON payload
            try:
                payload = json.loads(body)
            except json.JSONDecodeError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid JSON payload"
                )
            
            # Extract event data
            event_id = request.headers.get("X-Composio-Event-Id")
            event_type = request.headers.get("X-Composio-Event-Type")
            
            if not event_id or not event_type:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Missing required headers: X-Composio-Event-Id and X-Composio-Event-Type are required"
                )
            
            # Create and return the event
            return WebhookEvent(
                id=event_id,
                event_type=event_type,
                payload=payload,
                timestamp=datetime.utcnow(),
                profile_id=payload.get("profile_id"),
                trigger_id=payload.get("trigger_id")
            )
            
        except HTTPException:
            raise
        except WebhookVerificationError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=str(e)
            )
        except Exception as e:
            logger.error("Error parsing webhook", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error processing webhook: {str(e)}"
            )
    
    def register_handler(
        self,
        event_type: str,
        handler: WebhookHandler
    ) -> None:
        """
        Register a handler for a specific event type.
        
        Args:
            event_type: The event type to handle (e.g., 'toolkit.connected')
            handler: Async function to handle the event
        """
        if event_type not in self._event_handlers:
            self._event_handlers[event_type] = []
        self._event_handlers[event_type].append(handler)
    
    async def handle_webhook(
        self,
        request: Request,
        verify_signature: bool = True
    ) -> Dict[str, Any]:
        """
        Handle an incoming webhook request.
        
        Args:
            request: The incoming FastAPI request
            verify_signature: Whether to verify the webhook signature
            
        Returns:
            Dict with status and any response data
        """
        try:
            # Parse the webhook
            event = await self.parse_webhook(request, verify_signature)
            
            # Log the incoming event
            logger.info(
                "Received webhook event",
                event_id=event.id,
                event_type=event.event_type,
                profile_id=event.profile_id,
                trigger_id=event.trigger_id
            )
            
            # Find and call matching handlers
            handlers = self._event_handlers.get(event.event_type, [])
            if not handlers:
                logger.warning(
                    "No handlers registered for event type",
                    event_type=event.event_type
                )
            else:
                # Execute all handlers concurrently
                await asyncio.gather(*[
                    self._safe_execute_handler(handler, event)
                    for handler in handlers
                ])
            
            return {
                "status": "processed",
                "event_id": event.id,
                "event_type": event.event_type
            }
            
        except HTTPException as e:
            logger.error(
                "Webhook handling failed",
                status_code=e.status_code,
                detail=e.detail,
                exc_info=True
            )
            raise
        except Exception as e:
            logger.error("Unexpected error handling webhook", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Unexpected error: {str(e)}"
            )
    
    async def _safe_execute_handler(
        self,
        handler: WebhookHandler,
        event: WebhookEvent
    ) -> None:
        """Safely execute a webhook handler with error handling."""
        try:
            await handler(event.payload)
        except Exception as e:
            logger.error(
                "Error in webhook handler",
                handler=handler.__name__,
                event_id=event.id,
                exc_info=True
            )
    
    async def close(self):
        """Close any open resources."""
        if self._session and not self._session.closed:
            await self._session.close()
            self._session = None

# Singleton instance
webhook_service = ComposioWebhookService()
