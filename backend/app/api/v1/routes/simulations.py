"""
Simulation routes — Liquidation price and balance adjustment calculations.

CRITICAL: Implements the "STOPPED OUT" logic.
If Balance == Equity, returns is_stopped_out=True to lock the UI.
"""

import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_approved_user, get_audit_service, get_client_ip, require_role
from app.models.simulation_history import SimulationHistory
from app.models.user import User, UserRole
from app.schemas.calculation import (
    BalanceAdjustmentRequest,
    BalanceAdjustmentResponse,
    LiquidationPriceRequest,
    LiquidationPriceResponse,
    PositionInput,
    SimulationHistoryResponse,
)
from app.services.audit_service import AuditService
from app.services.calculation_service import CalculationService, PositionData

router = APIRouter(prefix="/simulations", tags=["Simulations"])


# ─── Liquidation Price ─────────────────────────────────────────────────────────

@router.post("/liquidation-price", response_model=LiquidationPriceResponse)
async def calculate_liquidation_price(
    body: LiquidationPriceRequest,
    user: User = Depends(get_approved_user),
    db: AsyncSession = Depends(get_db),
    audit: AuditService = Depends(get_audit_service),
):
    """
    Calculate the price at which ML% = 100% (liquidation).

    CRITICAL RULE: If Balance == Equity, returns is_stopped_out=True.
    The frontend MUST lock the UI and display "STOPPED OUT" when this flag is set.
    """
    # Convert positions
    positions = [
        PositionData(
            symbol=p.symbol,
            type=p.type,
            volume=p.volume,
            open_price=p.open_price,
            current_price=p.current_price,
        )
        for p in body.positions
    ]

    # Run calculation
    calc_service = CalculationService(db)
    result = await calc_service.calculate_liquidation_price(
        balance=body.balance,
        credit=body.credit,
        used_margin=body.used_margin,
        positions=positions,
    )

    # Save to history
    sim = SimulationHistory(
        user_id=user.id,
        sim_type="liquidation_price",
        balance=body.balance,
        credit=body.credit,
        used_margin=body.used_margin,
        positions=[p.model_dump() for p in body.positions],
        result_value=result.liquidation_price,
        is_stopped_out=result.is_stopped_out,
        margin_level_percent=result.margin_level_percent,
    )
    db.add(sim)
    await db.flush()

    # Audit
    await audit.log(
        action="simulation.liquidation_price",
        user_id=user.id,
        resource_type="simulation",
        resource_id=sim.id,
        details={
            "is_stopped_out": result.is_stopped_out,
            "liquidation_price": result.liquidation_price,
            "margin_level_percent": result.margin_level_percent,
        },
    )

    return LiquidationPriceResponse(
        is_stopped_out=result.is_stopped_out,
        stopped_out_reason=result.stopped_out_reason,
        margin_level_percent=result.margin_level_percent,
        liquidation_price=result.liquidation_price,
        equity=result.equity,
        floating_pl=result.floating_pl,
        details=result.details,
    )


# ─── Balance Adjustment ────────────────────────────────────────────────────────

@router.post("/balance-adjustment", response_model=BalanceAdjustmentResponse)
async def calculate_balance_adjustment(
    body: BalanceAdjustmentRequest,
    user: User = Depends(get_approved_user),
    db: AsyncSession = Depends(get_db),
    audit: AuditService = Depends(get_audit_service),
):
    """
    Calculate the required balance to maintain ML% = 100% at a target price.

    CRITICAL RULE: If Balance == Equity, returns is_stopped_out=True.
    The frontend MUST lock the UI and display "STOPPED OUT" when this flag is set.
    """
    # Convert positions
    positions = [
        PositionData(
            symbol=p.symbol,
            type=p.type,
            volume=p.volume,
            open_price=p.open_price,
            current_price=p.current_price,
        )
        for p in body.positions
    ]

    # Run calculation
    calc_service = CalculationService(db)
    result = await calc_service.calculate_required_balance(
        balance=body.balance,
        credit=body.credit,
        used_margin=body.used_margin,
        target_price=body.target_price,
        positions=positions,
    )

    # Save to history
    sim = SimulationHistory(
        user_id=user.id,
        sim_type="balance_adjustment",
        balance=body.balance,
        credit=body.credit,
        used_margin=body.used_margin,
        positions=[p.model_dump() for p in body.positions],
        result_value=result.balance_required,
        is_stopped_out=result.is_stopped_out,
        margin_level_percent=result.margin_level_percent,
    )
    db.add(sim)
    await db.flush()

    # Audit
    await audit.log(
        action="simulation.balance_adjustment",
        user_id=user.id,
        resource_type="simulation",
        resource_id=sim.id,
        details={
            "is_stopped_out": result.is_stopped_out,
            "balance_required": result.balance_required,
            "additional_deposit": result.additional_deposit,
            "target_price": body.target_price,
        },
    )

    return BalanceAdjustmentResponse(
        is_stopped_out=result.is_stopped_out,
        stopped_out_reason=result.stopped_out_reason,
        balance_required=result.balance_required,
        additional_deposit=result.additional_deposit,
        floating_pl_at_target=result.floating_pl,
        equity_at_target=result.equity,
        margin_level_at_target=result.margin_level_percent,
        details=result.details,
    )


# ─── Simulation History ────────────────────────────────────────────────────────

@router.get("/history", response_model=List[SimulationHistoryResponse])
async def get_simulation_history(
    sim_type: str = Query(None, description="Filter by simulation type"),
    limit: int = Query(50, ge=1, le=200),
    user: User = Depends(get_approved_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user's simulation history."""
    query = select(SimulationHistory).where(
        SimulationHistory.user_id == user.id,
    )

    if sim_type:
        query = query.where(SimulationHistory.sim_type == sim_type)

    query = query.order_by(SimulationHistory.created_at.desc()).limit(limit)

    result = await db.execute(query)
    simulations = result.scalars().all()

    return [
        SimulationHistoryResponse(
            id=s.id,
            sim_type=s.sim_type,
            balance=s.balance,
            credit=s.credit,
            used_margin=s.used_margin,
            result_value=s.result_value,
            is_stopped_out=s.is_stopped_out,
            margin_level_percent=s.margin_level_percent,
            label=s.label,
            created_at=s.created_at.isoformat(),
        )
        for s in simulations
    ]
