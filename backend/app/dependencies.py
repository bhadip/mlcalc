"""
FastAPI dependencies — reusable injection functions.
"""

import uuid
from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.security import get_current_user_token
from app.database import get_db
from app.models.user import User, UserRole
from app.services.audit_service import AuditService


async def get_current_user(
    token_payload: dict = Depends(get_current_user_token),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Fetch the current authenticated user from the database."""
    user_id = token_payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in token",
        )

    result = await db.execute(
        select(User).where(User.id == user_uuid, User.is_deleted == False)
    )
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or deleted",
        )

    return user


async def get_approved_user(
    user: User = Depends(get_current_user),
) -> User:
    """Ensure the current user is approved (not pending)."""
    if not user.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account pending approval",
        )
    return user


def require_role(minimum_role: UserRole):
    """Dependency factory: require a minimum role level."""
    role_hierarchy = {
        UserRole.VISITOR: 0,
        UserRole.USER: 1,
        UserRole.ADMIN: 2,
    }

    async def _check_role(
        user: User = Depends(get_approved_user),
    ) -> User:
        user_level = role_hierarchy.get(user.role, 0)
        required_level = role_hierarchy.get(minimum_role, 0)

        if user_level < required_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires {minimum_role.value} role or higher",
            )
        return user

    return _check_role


async def get_audit_service(
    db: AsyncSession = Depends(get_db),
) -> AuditService:
    """Provide an AuditService instance."""
    return AuditService(db)


def get_client_ip(request: Request) -> str:
    """Extract client IP from request, respecting Cloudflare headers."""
    # Cloudflare sets CF-Connecting-IP
    cf_ip = request.headers.get("CF-Connecting-IP")
    if cf_ip:
        return cf_ip

    # Standard proxy header
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()

    return request.client.host if request.client else "unknown"
