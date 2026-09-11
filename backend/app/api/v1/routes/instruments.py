"""
Instrument routes — CRUD for instrument configuration (contract sizes, etc.).
Public read access; write access requires ADMIN role.
"""

import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_audit_service, get_approved_user, require_role
from app.models.instrument import Instrument
from app.models.user import User, UserRole
from app.schemas.instrument import InstrumentCreate, InstrumentResponse, InstrumentUpdate
from app.services.audit_service import AuditService

router = APIRouter(prefix="/instruments", tags=["Instruments"])


# ─── Public Read ───────────────────────────────────────────────────────────────

@router.get("/", response_model=List[InstrumentResponse])
async def list_instruments(
    category: str = Query(None),
    active_only: bool = Query(True),
    user: User = Depends(get_approved_user),
    db: AsyncSession = Depends(get_db),
):
    """List all instruments (available to all authenticated users)."""
    query = select(Instrument)

    if active_only:
        query = query.where(Instrument.is_active == True)

    if category:
        query = query.where(Instrument.category == category)

    query = query.order_by(Instrument.symbol)

    result = await db.execute(query)
    instruments = result.scalars().all()

    return [InstrumentResponse.model_validate(inst) for inst in instruments]


@router.get("/{symbol}", response_model=InstrumentResponse)
async def get_instrument(
    symbol: str,
    user: User = Depends(get_approved_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single instrument by symbol."""
    result = await db.execute(
        select(Instrument).where(
            Instrument.symbol == symbol.upper(),
            Instrument.is_active == True,
        )
    )
    instrument = result.scalar_one_or_none()

    if instrument is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Instrument '{symbol}' not found",
        )

    return InstrumentResponse.model_validate(instrument)


# ─── Admin Write ───────────────────────────────────────────────────────────────

@router.post("/", response_model=InstrumentResponse, status_code=status.HTTP_201_CREATED)
async def create_instrument(
    body: InstrumentCreate,
    admin: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
    audit: AuditService = Depends(get_audit_service),
):
    """Create a new instrument (admin only)."""
    # Check for duplicate symbol
    result = await db.execute(
        select(Instrument).where(Instrument.symbol == body.symbol.upper())
    )
    existing = result.scalar_one_or_none()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Instrument '{body.symbol}' already exists",
        )

    instrument = Instrument(
        symbol=body.symbol.upper(),
        name=body.name,
        category=body.category,
        contract_size=body.contract_size,
        tick_size=body.tick_size,
        tick_value=body.tick_value,
        margin_currency=body.margin_currency,
        leverage=body.leverage,
        stop_out_percent=body.stop_out_percent,
        description=body.description,
    )
    db.add(instrument)
    await db.flush()

    await audit.log(
        action="admin.create_instrument",
        user_id=admin.id,
        resource_type="instrument",
        resource_id=instrument.id,
        details={"symbol": instrument.symbol},
    )

    return InstrumentResponse.model_validate(instrument)


@router.patch("/{symbol}", response_model=InstrumentResponse)
async def update_instrument(
    symbol: str,
    body: InstrumentUpdate,
    admin: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
    audit: AuditService = Depends(get_audit_service),
):
    """Update an instrument's configuration (admin only)."""
    result = await db.execute(
        select(Instrument).where(Instrument.symbol == symbol.upper())
    )
    instrument = result.scalar_one_or_none()

    if instrument is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Instrument '{symbol}' not found",
        )

    # Update fields
    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(instrument, field, value)

    await db.flush()

    await audit.log(
        action="admin.update_instrument",
        user_id=admin.id,
        resource_type="instrument",
        resource_id=instrument.id,
        details={"symbol": instrument.symbol, "changes": update_data},
    )

    return InstrumentResponse.model_validate(instrument)


@router.delete("/{symbol}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_instrument(
    symbol: str,
    admin: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
    audit: AuditService = Depends(get_audit_service),
):
    """Deactivate an instrument (soft-delete, admin only)."""
    result = await db.execute(
        select(Instrument).where(Instrument.symbol == symbol.upper())
    )
    instrument = result.scalar_one_or_none()

    if instrument is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Instrument '{symbol}' not found",
        )

    instrument.is_active = False
    await db.flush()

    await audit.log(
        action="admin.deactivate_instrument",
        user_id=admin.id,
        resource_type="instrument",
        resource_id=instrument.id,
        details={"symbol": instrument.symbol},
    )
