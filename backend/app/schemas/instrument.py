"""
Instrument schemas — request/response models for instrument CRUD.
"""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class InstrumentBase(BaseModel):
    symbol: str = Field(..., max_length=20, description="Ticker symbol, e.g. XAUUSD")
    name: str = Field(..., max_length=100, description="Human-readable name")
    category: str = Field(..., max_length=50, description="forex | metals | indices | crypto | commodities")
    contract_size: float = Field(..., gt=0, description="Units per 1 lot")
    tick_size: float = Field(..., gt=0, description="Minimum price increment")
    tick_value: float = Field(..., description="Monetary value per tick per 1 lot")
    margin_currency: str = Field(default="USD", max_length=10)
    leverage: Optional[int] = Field(None, gt=0)
    stop_out_percent: Optional[float] = Field(None, gt=0)
    description: Optional[str] = None


class InstrumentCreate(InstrumentBase):
    pass


class InstrumentUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    contract_size: Optional[float] = Field(None, gt=0)
    tick_size: Optional[float] = Field(None, gt=0)
    tick_value: Optional[float] = None
    margin_currency: Optional[str] = None
    leverage: Optional[int] = Field(None, gt=0)
    stop_out_percent: Optional[float] = Field(None, gt=0)
    description: Optional[str] = None
    is_active: Optional[bool] = None


class InstrumentResponse(InstrumentBase):
    id: uuid.UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @property
    def point_value(self) -> float:
        """Value per 1-unit price move per 1 lot."""
        return self.tick_value / self.tick_size if self.tick_size else 0.0
