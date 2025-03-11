from typing import List, Optional
import os
from datetime import datetime
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Field, SQLModel, Session

from app.api.deps import CurrentUser, SessionDep
from app.core.config import settings
from app.models import User

# OpenAI API configuration
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"
DEFAULT_MODEL = "gpt-3.5-turbo"

# Message models
class Message(SQLModel):
    role: str
    content: str

class ChatCompletionRequest(SQLModel):
    messages: List[Message]
    model: str = DEFAULT_MODEL
    temperature: float = 0.7
    max_tokens: Optional[int] = None

class ChatCompletionResponse(SQLModel):
    message: Message
    usage: dict

class UserRequestCount(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(foreign_key="user.id")
    total_requests: int = Field(default=0)
    free_requests_used: int = Field(default=0)
    last_request_at: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class RequestCountResponse(SQLModel):
    count: int
    limit: int
    has_subscription: bool
    remaining: int

router = APIRouter(prefix="/chat", tags=["chat"])

# Utility functions
def get_or_create_request_count(session: Session, user_id: str) -> UserRequestCount:
    """Get or create a request count record for a user"""
    request_count = session.query(UserRequestCount).filter(UserRequestCount.user_id == user_id).first()
    if not request_count:
        request_count = UserRequestCount(user_id=user_id)
        session.add(request_count)
        session.commit()
        session.refresh(request_count)
    return request_count

async def call_openai_api(request: ChatCompletionRequest) -> dict:
    """Call the OpenAI API with the given request"""
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": request.model,
        "messages": [{"role": msg.role, "content": msg.content} for msg in request.messages],
        "temperature": request.temperature,
    }
    
    if request.max_tokens:
        payload["max_tokens"] = request.max_tokens
    
    async with httpx.AsyncClient() as client:
        response = await client.post(OPENAI_API_URL, json=payload, headers=headers)
        
        if response.status_code != 200:
            error_detail = response.json().get("error", {}).get("message", "Unknown error")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"OpenAI API error: {error_detail}"
            )
        
        return response.json()

def has_active_subscription(user: User) -> bool:
    """Check if a user has an active subscription"""
    # This is a placeholder - integrate with your actual subscription system
    if hasattr(user, 'stripe_subscription') and user.stripe_subscription:
        return True
    return False

# API endpoints
@router.post("/completions", response_model=ChatCompletionResponse)
async def create_chat_completion(
    request: ChatCompletionRequest,
    current_user: CurrentUser,
    session: SessionDep
):
    """Create a chat completion with OpenAI API"""
    # Get or create request count
    request_count = get_or_create_request_count(session, str(current_user.id))
    
    # Check if user has subscription or free requests left
    has_subscription = has_active_subscription(current_user)
    
    if not has_subscription and request_count.free_requests_used >= 6:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Free request limit reached. Please subscribe to continue."
        )
    
    # Call OpenAI API
    try:
        response_data = await call_openai_api(request)
        
        # Update request count if not subscribed
        if not has_subscription:
            request_count.free_requests_used += 1
            request_count.total_requests += 1
            request_count.last_request_at = datetime.utcnow()
            request_count.updated_at = datetime.utcnow()
            session.add(request_count)
            session.commit()
        
        # Extract response message
        assistant_message = response_data["choices"][0]["message"]
        message = Message(
            role=assistant_message["role"],
            content=assistant_message["content"]
        )
        
        # Return response
        return ChatCompletionResponse(
            message=message,
            usage=response_data["usage"]
        )
    except Exception as e:
        # Log the error
        print(f"Error calling OpenAI API: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing request: {str(e)}"
        )

@router.get("/request-count", response_model=RequestCountResponse)
async def get_request_count(current_user: CurrentUser, session: SessionDep):
    """Get the current request count for a user"""
    request_count = get_or_create_request_count(session, str(current_user.id))
    has_subscription = has_active_subscription(current_user)
    
    return RequestCountResponse(
        count=request_count.free_requests_used,
        limit=6,
        has_subscription=has_subscription,
        remaining=max(0, 6 - request_count.free_requests_used)
    )

@router.post("/reset-count", response_model=RequestCountResponse)
async def reset_request_count(current_user: CurrentUser, session: SessionDep):
    """Reset the request count for a user (admin only)"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to reset request count"
        )
    
    request_count = get_or_create_request_count(session, str(current_user.id))
    request_count.free_requests_used = 0
    request_count.updated_at = datetime.utcnow()
    session.add(request_count)
    session.commit()
    session.refresh(request_count)
    
    return RequestCountResponse(
        count=request_count.free_requests_used,
        limit=6,
        has_subscription=has_active_subscription(current_user),
        remaining=6
    )
