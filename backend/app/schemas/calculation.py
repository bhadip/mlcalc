"""
Calculation schemas — request/response models for simulation endpoints.
"""

import uuid
from typing import Optional

from pydantic import BaseModel, Field


class PositionInput(BaseModel):
    """Position data for simulation input."""
    symbol: str
    type: str = Field(..., pattern="^(buy|sell)$", description="buy or sell")
    volume: float = Field(..., gt=0, description="Lot size")
    open_price: float = Field(..., gt=0)
    current_price: Optional[float] = Field(None, gt=0, description="If null, uses open_price")


class LiquidationPriceRequest(BaseModel):
    """Request to calculate liquidation price (ML% = 100%)."""
    balance: float = Field(..., gt=0)
    credit: float = Field(0.0, ge=0)
    used_margin: float = Field(..., gt=0)
    positions: list[PositionInput] = Field(..., min_length=1)


class LiquidationPriceResponse(BaseModel):
    """Result of liquidation price calculation."""
    is_stopped_out: bool = Field(
        ..., description="True if Balance == Equity (account already liquidated)"
    )
    stopped_out_reason: Optional[str] = None
    margin_level_percent: Optional[float] = Field(
        None, description="Current ML% based on current prices"
    )
    liquidation_price: Optional[float] = Field(
        None, description="Price at which ML% = 100%"
    )
    equity: Optional[float] = None
    floating_pl: Optional[float] = None
    details: Optional[dict] = None


class BalanceAdjustmentRequest(BaseModel):
    """Request to calculate required balance at a target price."""
    balance: float = Field(..., gt=0)
    credit: float = Field(0.0, ge=0)
    used_margin: float = Field(..., gt=0)
    target_price: float = Field(..., gt=0, description="Adverse price to test against")
    positions: list[PositionInput] = Field(..., min_length=1)


class BalanceAdjustmentResponse(BaseModel):
    """Result of balance adjustment calculation."""
    is_stopped_out: bool
    stopped_out_reason: Optional[str] = None
    balance_required: Optional[float] = Field(
        None, description="Minimum balance to survive at target_price"
    )
    additional_deposit: Optional[float] = Field(
        None, description="How much more balance is needed (0 if sufficient)"
    )
    floating_pl_at_target: Optional[float] = None
    equity_at_target: Optional[float] = None
    margin_level_at_target: Optional[float] = None
    details: Optional[dict] = None


class SimulationHistoryResponse(BaseModel):
    id: uuid.UUID
    sim_type: str
    balance: float
    credit: float
    used_margin: float
    result_value: Optional[float]
    is_stopped_out: bool
    margin_level_percent: Optional[float]
    label: Optional[str]
    created_at: str

    model_config = {"from_attributes": True}
