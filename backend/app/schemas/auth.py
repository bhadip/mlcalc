"""
Auth schemas — request/response models for authentication endpoints.
"""

from typing import Optional

from pydantic import BaseModel


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class OAuthCallbackResponse(BaseModel):
    """Returned after successful OAuth callback."""
    access_token: str
    refresh_token: str
    user: dict
    is_new_user: bool = False


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UserInfo(BaseModel):
    """Decoded JWT payload / user info."""
    sub: str  # user ID
    email: str
    name: str
    role: str
    is_approved: bool
    avatar_url: Optional[str] = None
