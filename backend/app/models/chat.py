from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel

class UserRequestCount(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(foreign_key="user.id")
    total_requests: int = Field(default=0)
    free_requests_used: int = Field(default=0)
    last_request_at: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
