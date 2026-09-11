"""
Screenshot routes — Upload, process (OCR), list, soft-delete, share.
"""

import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import get_approved_user, get_audit_service, get_client_ip, require_role
from app.models.screenshot import Screenshot
from app.models.user import User, UserRole
from app.schemas.screenshot import (
    ExtractedAccountData,
    ScreenshotListResponse,
    ScreenshotResponse,
    ScreenshotShareRequest,
)
from app.services.audit_service import AuditService
from app.services.ocr_service import OCRService

router = APIRouter(prefix="/screenshots", tags=["Screenshots"])


# ─── Upload ────────────────────────────────────────────────────────────────────

@router.post("/upload", response_model=ScreenshotResponse, status_code=status.HTTP_201_CREATED)
async def upload_screenshot(
    file: UploadFile = File(...),
    user: User = Depends(get_approved_user),
    db: AsyncSession = Depends(get_db),
    audit: AuditService = Depends(get_audit_service),
):
    """
    Upload a trading terminal screenshot.
    - Saves file to disk
    - Creates DB record with status='pending'
    - OCR processing is triggered asynchronously (see /process endpoint)
    """
    # Validate file type
    allowed_types = {"image/jpeg", "image/png", "image/webp"}
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type: {file.content_type}. Allowed: {allowed_types}",
        )

    # Validate file size
    content = await file.read()
    max_size = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_size:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Max: {settings.MAX_UPLOAD_SIZE_MB}MB",
        )

    # Save file
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)

    file_ext = Path(file.filename).suffix or ".jpg"
    safe_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = upload_dir / safe_filename

    with open(file_path, "wb") as f:
        f.write(content)

    # Create DB record
    screenshot = Screenshot(
        user_id=user.id,
        filename=file.filename,
        file_path=str(file_path),
        file_size_bytes=len(content),
        content_type=file.content_type,
        ocr_status="pending",
    )
    db.add(screenshot)
    await db.flush()

    # Audit
    await audit.log(
        action="screenshot.upload",
        user_id=user.id,
        resource_type="screenshot",
        resource_id=screenshot.id,
        details={"filename": file.filename, "size": len(content)},
    )

    return _screenshot_to_response(screenshot)


# ─── Process (OCR) ─────────────────────────────────────────────────────────────

@router.post("/{screenshot_id}/process", response_model=ScreenshotResponse)
async def process_screenshot(
    screenshot_id: uuid.UUID,
    user: User = Depends(get_approved_user),
    db: AsyncSession = Depends(get_db),
    audit: AuditService = Depends(get_audit_service),
):
    """
    Trigger OCR processing on an uploaded screenshot.
    - Extracts account data from the image
    - Validates extracted data
    - Updates the screenshot record
    """
    screenshot = await _get_user_screenshot(db, screenshot_id, user.id)

    if screenshot.ocr_status == "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Screenshot already processed",
        )

    # Update status
    screenshot.ocr_status = "processing"
    await db.flush()

    try:
        # Run OCR
        ocr_service = OCRService()
        extracted = await ocr_service.extract_from_image(screenshot.file_path)

        # Store results
        screenshot.extracted_data = extracted
        screenshot.ocr_status = "completed"

    except Exception as e:
        screenshot.ocr_status = "failed"
        screenshot.ocr_error = str(e)

    await db.flush()

    # Audit
    await audit.log(
        action="screenshot.process",
        user_id=user.id,
        resource_type="screenshot",
        resource_id=screenshot.id,
        details={"status": screenshot.ocr_status},
    )

    return _screenshot_to_response(screenshot)


# ─── List ──────────────────────────────────────────────────────────────────────

@router.get("/", response_model=ScreenshotListResponse)
async def list_screenshots(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: str = Query(None, alias="status"),
    user: User = Depends(get_approved_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List user's screenshots with pagination.
    - Only returns non-deleted screenshots owned by the user
    - Optionally filter by OCR status
    """
    query = select(Screenshot).where(
        Screenshot.user_id == user.id,
        Screenshot.is_deleted == False,
    )

    if status_filter:
        query = query.where(Screenshot.ocr_status == status_filter)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Paginate
    query = query.order_by(Screenshot.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    screenshots = result.scalars().all()

    return ScreenshotListResponse(
        items=[_screenshot_to_response(s) for s in screenshots],
        total=total,
        page=page,
        page_size=page_size,
    )


# ─── Get Single ────────────────────────────────────────────────────────────────

@router.get("/{screenshot_id}", response_model=ScreenshotResponse)
async def get_screenshot(
    screenshot_id: uuid.UUID,
    user: User = Depends(get_approved_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single screenshot by ID (must be owned by user or shared with user)."""
    screenshot = await _get_user_screenshot(db, screenshot_id, user.id)
    return _screenshot_to_response(screenshot)


# ─── Soft Delete ───────────────────────────────────────────────────────────────

@router.delete("/{screenshot_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_screenshot(
    screenshot_id: uuid.UUID,
    user: User = Depends(get_approved_user),
    db: AsyncSession = Depends(get_db),
    audit: AuditService = Depends(get_audit_service),
):
    """Soft-delete a screenshot (marks as deleted, does not remove file)."""
    screenshot = await _get_user_screenshot(db, screenshot_id, user.id)

    screenshot.soft_delete()
    await db.flush()

    await audit.log(
        action="screenshot.delete",
        user_id=user.id,
        resource_type="screenshot",
        resource_id=screenshot.id,
    )


# ─── Share ─────────────────────────────────────────────────────────────────────

@router.post("/{screenshot_id}/share", response_model=ScreenshotResponse)
async def share_screenshot(
    screenshot_id: uuid.UUID,
    body: ScreenshotShareRequest,
    user: User = Depends(get_approved_user),
    db: AsyncSession = Depends(get_db),
    audit: AuditService = Depends(get_audit_service),
):
    """
    Share a screenshot with specific users or make it public.
    - Updates the shared_with JSONB field
    """
    screenshot = await _get_user_screenshot(db, screenshot_id, user.id)

    import secrets
    screenshot.shared_with = {
        "user_ids": [str(uid) for uid in body.user_ids],
        "is_public": body.is_public,
        "share_token": secrets.token_urlsafe(16),
    }
    await db.flush()

    await audit.log(
        action="screenshot.share",
        user_id=user.id,
        resource_type="screenshot",
        resource_id=screenshot.id,
        details={"shared_with": body.model_dump()},
    )

    return _screenshot_to_response(screenshot)


# ─── Helpers ───────────────────────────────────────────────────────────────────

async def _get_user_screenshot(
    db: AsyncSession,
    screenshot_id: uuid.UUID,
    user_id: uuid.UUID,
) -> Screenshot:
    """Fetch a screenshot owned by the user (non-deleted)."""
    result = await db.execute(
        select(Screenshot).where(
            Screenshot.id == screenshot_id,
            Screenshot.user_id == user_id,
            Screenshot.is_deleted == False,
        )
    )
    screenshot = result.scalar_one_or_none()

    if screenshot is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Screenshot not found",
        )

    return screenshot


def _screenshot_to_response(screenshot: Screenshot) -> ScreenshotResponse:
    """Convert Screenshot model to response schema."""
    extracted = None
    if screenshot.extracted_data:
        try:
            extracted = ExtractedAccountData(**screenshot.extracted_data)
        except Exception:
            extracted = None

    return ScreenshotResponse(
        id=screenshot.id,
        user_id=screenshot.user_id,
        filename=screenshot.filename,
        file_size_bytes=screenshot.file_size_bytes,
        content_type=screenshot.content_type,
        ocr_status=screenshot.ocr_status,
        extracted_data=extracted,
        shared_with=screenshot.shared_with,
        created_at=screenshot.created_at,
        updated_at=screenshot.updated_at,
    )
