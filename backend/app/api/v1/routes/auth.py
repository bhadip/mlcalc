"""
Auth routes — Google/Microsoft OAuth login, callback, token refresh, logout.
"""

import secrets
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.oauth import GoogleOAuth, MicrosoftOAuth
from app.auth.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user_token,
)
from app.config import settings
from app.database import get_db
from app.dependencies import get_audit_service, get_client_ip, get_current_user
from app.models.user import OAuthProvider, User, UserRole
from app.schemas.auth import OAuthCallbackResponse, RefreshTokenRequest, TokenResponse, UserInfo
from app.services.audit_service import AuditService

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ─── Google OAuth ──────────────────────────────────────────────────────────────

@router.get("/google/login")
async def google_login(request: Request):
    """Initiate Google OAuth flow."""
    state = secrets.token_urlsafe(32)
    # In production, store state in Redis/session for CSRF validation
    authorization_url = GoogleOAuth.get_authorization_url(state)
    return {"authorization_url": authorization_url, "state": state}


@router.get("/google/callback")
async def google_callback(
    code: str,
    state: str,
    db: AsyncSession = Depends(get_db),
    audit: AuditService = Depends(get_audit_service),
    request: Request = None,
):
    """Handle Google OAuth callback — exchange code, create/find user, issue JWTs."""
    # Exchange code for user info
    oauth_data = await GoogleOAuth.exchange_code(code)

    # Find or create user
    user = await _get_or_create_user(
        db=db,
        provider=OAuthProvider.GOOGLE,
        subject=oauth_data["subject"],
        email=oauth_data["email"],
        name=oauth_data["name"],
        avatar_url=oauth_data.get("avatar_url"),
    )

    # Generate tokens
    tokens = _generate_tokens(user)

    # Audit log
    await audit.log(
        action="auth.google_login",
        user_id=user.id,
        details={"email": user.email},
        ip_address=get_client_ip(request) if request else None,
        user_agent=request.headers.get("user-agent") if request else None,
    )

    return OAuthCallbackResponse(
        access_token=tokens["access_token"],
        refresh_token=tokens["refresh_token"],
        user=_user_to_dict(user),
        is_new_user=tokens.get("is_new_user", False),
    )


# ─── Microsoft OAuth ───────────────────────────────────────────────────────────

@router.get("/microsoft/login")
async def microsoft_login(request: Request):
    """Initiate Microsoft OAuth flow."""
    state = secrets.token_urlsafe(32)
    authorization_url = MicrosoftOAuth.get_authorization_url(state)
    return {"authorization_url": authorization_url, "state": state}


@router.get("/microsoft/callback")
async def microsoft_callback(
    code: str,
    state: str,
    db: AsyncSession = Depends(get_db),
    audit: AuditService = Depends(get_audit_service),
    request: Request = None,
):
    """Handle Microsoft OAuth callback."""
    oauth_data = await MicrosoftOAuth.exchange_code(code)

    user = await _get_or_create_user(
        db=db,
        provider=OAuthProvider.MICROSOFT,
        subject=oauth_data["subject"],
        email=oauth_data["email"],
        name=oauth_data["name"],
        avatar_url=oauth_data.get("avatar_url"),
    )

    tokens = _generate_tokens(user)

    await audit.log(
        action="auth.microsoft_login",
        user_id=user.id,
        details={"email": user.email},
        ip_address=get_client_ip(request) if request else None,
        user_agent=request.headers.get("user-agent") if request else None,
    )

    return OAuthCallbackResponse(
        access_token=tokens["access_token"],
        refresh_token=tokens["refresh_token"],
        user=_user_to_dict(user),
        is_new_user=tokens.get("is_new_user", False),
    )


# ─── Token Refresh ─────────────────────────────────────────────────────────────

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    body: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    """Refresh an access token using a valid refresh token."""
    payload = decode_token(body.refresh_token)

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid token type — expected refresh token",
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    result = await db.execute(
        select(User).where(User.id == uuid.UUID(user_id), User.is_deleted == False)
    )
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    tokens = _generate_tokens(user)
    return TokenResponse(**tokens)


# ─── Current User Info ─────────────────────────────────────────────────────────

@router.get("/me", response_model=UserInfo)
async def get_me(user: User = Depends(get_current_user)):
    """Get current authenticated user info."""
    return UserInfo(
        sub=str(user.id),
        email=user.email,
        name=user.name,
        role=user.role.value,
        is_approved=user.is_approved,
        avatar_url=user.avatar_url,
    )


# ─── Helpers ───────────────────────────────────────────────────────────────────

async def _get_or_create_user(
    db: AsyncSession,
    provider: OAuthProvider,
    subject: str,
    email: str,
    name: str,
    avatar_url: Optional[str] = None,
) -> User:
    """Find existing user by OAuth subject or create a new one."""
    # Try to find by provider + subject
    result = await db.execute(
        select(User).where(
            User.oauth_provider == provider,
            User.oauth_subject == subject,
        )
    )
    user = result.scalar_one_or_none()

    if user is not None:
        # Update last login info
        user.name = name
        user.avatar_url = avatar_url
        await db.flush()
        return user

    # Try to find by email (account linking)
    result = await db.execute(
        select(User).where(User.email == email)
    )
    user = result.scalar_one_or_none()

    if user is not None:
        # Link OAuth provider to existing account
        user.oauth_provider = provider
        user.oauth_subject = subject
        user.name = name
        user.avatar_url = avatar_url
        await db.flush()
        return user

    # Create new user
    user = User(
        email=email,
        name=name,
        avatar_url=avatar_url,
        oauth_provider=provider,
        oauth_subject=subject,
        role=UserRole.VISITOR,
        is_approved=False,  # Requires admin approval
    )
    db.add(user)
    await db.flush()
    return user


def _generate_tokens(user: User) -> dict:
    """Generate JWT access and refresh tokens for a user."""
    token_data = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role.value,
    }

    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


def _user_to_dict(user: User) -> dict:
    """Convert user model to dict for API response."""
    return {
        "id": str(user.id),
        "email": user.email,
        "name": user.name,
        "role": user.role.value,
        "is_approved": user.is_approved,
        "avatar_url": user.avatar_url,
    }
