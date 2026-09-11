"""
SimulationHistory model — stores past liquidation price and balance
adjustment calculations for replay and analysis.
"""

import uuid
from typing import Optional

from sqlalchemy import Boolean, Float, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin, UUIDMixin


class SimulationHistory(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "simulation_history"

    # Ownership
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )

    # Link to source screenshot (optional)
    screenshot_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("screenshots.id"), nullable=True
    )

    # Simulation type
    sim_type: Mapped[str] = mapped_column(
        String(30), nullable=False,
        comment="liquidation_price | balance_adjustment"
    )

    # Input parameters
    balance: Mapped[float] = mapped_column(Float, nullable=False)
    credit: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    used_margin: Mapped[float] = mapped_column(Float, nullable=False)
    stop_out_percent: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)

    # Positions snapshot (JSONB)
    positions: Mapped[Optional[dict]] = mapped_column(
        JSONB, nullable=True,
        comment="Array of positions at simulation time"
    )

    # Results
    result_value: Mapped[Optional[float]] = mapped_column(
        Float, nullable=True,
        comment="Liquidation price or required balance"
    )
    is_stopped_out: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False,
        comment="True if Balance == Equity at input (STOPPED OUT state)"
    )
    margin_level_percent: Mapped[Optional[float]] = mapped_column(
        Float, nullable=True
    )

    # Metadata
    label: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="simulations")

    def __repr__(self) -> str:
        return f"<SimulationHistory {self.sim_type} result={self.result_value}>"


from app.models.user import User  # noqa: E402, F401
