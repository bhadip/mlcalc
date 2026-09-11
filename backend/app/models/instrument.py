"""
Instrument model — stores contract sizes, tick values, and margin parameters
per trading instrument (XAUUSD, EURUSD, ND, etc.).
"""

from typing import Optional

from sqlalchemy import Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin, UUIDMixin


class Instrument(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "instruments"

    # Identification
    symbol: Mapped[str] = mapped_column(
        String(20), unique=True, nullable=False, index=True,
        comment="Ticker symbol, e.g. XAUUSD, EURUSD, ND"
    )
    name: Mapped[str] = mapped_column(
        String(100), nullable=False,
        comment="Human-readable name, e.g. 'Gold Spot / US Dollar'"
    )
    category: Mapped[str] = mapped_column(
        String(50), nullable=False,
        comment="forex | metals | indices | crypto | commodities | stocks"
    )

    # Contract specification
    contract_size: Mapped[float] = mapped_column(
        Float, nullable=False,
        comment="Units per 1 lot. Forex=100000, XAUUSD=100, XAGUSD=5000, indices=1"
    )
    tick_size: Mapped[float] = mapped_column(
        Float, nullable=False,
        comment="Minimum price increment, e.g. 0.01 for gold, 0.00001 for EURUSD"
    )
    tick_value: Mapped[float] = mapped_column(
        Float, nullable=False,
        comment="Monetary value per tick per 1 lot in margin currency"
    )

    # Margin parameters
    margin_currency: Mapped[str] = mapped_column(
        String(10), nullable=False, default="USD",
        comment="Currency in which margin is denominated"
    )
    leverage: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True,
        comment="Default leverage for this instrument (null = use account-level)"
    )
    stop_out_percent: Mapped[Optional[float]] = mapped_column(
        Float, nullable=True,
        comment="Override stop-out % for this instrument (null = use account-level)"
    )

    # Metadata
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

    @property
    def point_value(self) -> float:
        """Value per 1-unit price move per 1 lot = tick_value / tick_size."""
        if self.tick_size == 0:
            return 0.0
        return self.tick_value / self.tick_size

    def __repr__(self) -> str:
        return f"<Instrument {self.symbol} contract_size={self.contract_size}>"
