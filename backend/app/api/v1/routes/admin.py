"""
Admin routes — User approval, role assignment, undelete, audit log viewing.
Requires ADMIN role.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_audit_service, require_role
from app.models.audit_log import AuditLog
from app.models.user import User, UserRole
from app.schemas.user import UserAdminResponse, UserUpdate
from app.services.audit_service import AuditService

router = APIRouter(prefix="/admin", tags=["Admin"])


# ─── User Management ───────────────────────────────────────────────────────────

@router.get("/users", response_model=list[UserAdminResponse])
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    role_filter: str = Query(None, alias="role"),
    include_deleted: bool = Query(False),
    admin: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """List all users (admin only)."""
    query = select(User)

    if not include_deleted:
        query = query.where(User.is_deleted == False)

    if role_filter:
        try:
            role_enum = UserRole(role_filter)
            query = query.where(User.role == role_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role: {role_filter}",
            )

    query = query.order_by(User.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    users = result.scalars().all()

    return [
        UserAdminResponse(
            id=u.id,
            email=u.email,
            name=u.name,
            role=u.role,
            is_approved=u.is_approved,
            avatar_url=u.avatar_url,
            created_at=u.created_at,
            is_deleted=u.is_deleted,
            deleted_at=u.deleted_at,
        )
        for u in users
    ]


@router.patch("/users/{user_id}", response_model=UserAdminResponse)
async def update_user(
    user_id: uuid.UUID,
    body: UserUpdate,
    admin: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
    audit: AuditService = Depends(get_audit_service),
):
    """
    Update user role or approval status (admin only).
    - Approve pending users
    - Change roles (visitor → user → admin)
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    changes = {}

    if body.role is not None and body.role != user.role:
        changes["role"] = {"from": user.role.value, "to": body.role.value}
        user.role = body.role

    if body.is_approved is not None and body.is_approved != user.is_approved:
        changes["is_approved"] = {"from": user.is_approved, "to": body.is_approved}
        user.is_approved = body.is_approved

    if changes:
        await db.flush()

        await audit.log(
            action="admin.update_user",
            user_id=admin.id,
            resource_type="user",
            resource_id=user.id,
            details={"target_user": user.email, "changes": changes},
        )

    return UserAdminResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        is_approved=user.is_approved,
        avatar_url=user.avatar_url,
        created_at=user.created_at,
        is_deleted=user.is_deleted,
        deleted_at=user.deleted_at,
    )


@router.post("/users/{user_id}/undelete", response_model=UserAdminResponse)
async def undelete_user(
    user_id: uuid.UUID,
    admin: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
    audit: AuditService = Depends(get_audit_service),
):
    """Restore a soft-deleted user (admin only)."""
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if not user.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not deleted",
        )

    user.restore()
    await db.flush()

    await audit.log(
        action="admin.undelete_user",
        user_id=admin.id,
        resource_type="user",
        resource_id=user.id,
        details={"target_user": user.email},
    )

    return UserAdminResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        is_approved=user.is_approved,
        avatar_url=user.avatar_url,
        created_at=user.created_at,
        is_deleted=user.is_deleted,
        deleted_at=user.deleted_at,
    )


# ─── Audit Log ─────────────────────────────────────────────────────────────────

@router.get("/audit-logs")
async def list_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    action_filter: str = Query(None, alias="action"),
    user_id_filter: uuid.UUID = Query(None, alias="user_id"),
    admin: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """List audit logs (admin only)."""
    query = select(AuditLog)

    if action_filter:
        query = query.where(AuditLog.action.ilike(f"%{action_filter}%"))

    if user_id_filter:
        query = query.where(AuditLog.user_id == user_id_filter)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Paginate
    query = query.order_by(AuditLog.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    logs = result.scalars().all()

    return {
        "items": [
            {
                "id": str(log.id),
                "user_id": str(log.user_id) if log.user_id else None,
                "action": log.action,
                "resource_type": log.resource_type,
                "resource_id": str(log.resource_id) if log.resource_id else None,
                "details": log.details,
                "ip_address": log.ip_address,
                "created_at": log.created_at.isoformat(),
            }
            for log in logs
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }
