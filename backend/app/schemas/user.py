"""
User schemas — request/response models for user endpoints.
"""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr

from app.models.user import UserRole


class UserBase(BaseModel):
    email: EmailStr
    name: str


class UserCreate(UserBase):
    oauth_provider: str
    oauth_subject: str
    avatar_url: Optional[str] = None


class UserResponse(UserBase):
    id: uuid.UUID
    role: UserRole
    is_approved: bool
    avatar_url: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    role: Optional[UserRole] = None
    is_approved: Optional[bool] = None


class UserAdminResponse(UserResponse):
    is_deleted: bool
    deleted_at: Optional[datetime] = None
