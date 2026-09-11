"""
AuditLog model — tracks all significant actions for compliance and debugging.
"""

import uuid
from typing import Optional

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin, UUIDMixin


class AuditLog(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "audit_logs"

    # Who
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True
    )

    # What
    action: Mapped[str] = mapped_column(
        String(100), nullable=False, index=True,
        comment="e.g. user.login, screenshot.upload, simulation.run, admin.approve_user"
    )
    resource_type: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True,
        comment="e.g. screenshot, user, instrument"
    )
    resource_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True,
        comment="ID of the affected resource"
    )

    # Details
    details: Mapped[Optional[dict]] = mapped_column(
        JSONB, nullable=True,
        comment="Additional context about the action"
    )
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    user: Mapped[Optional["User"]] = relationship("User", back_populates="audit_logs")

    def __repr__(self) -> str:
        return f"<AuditLog {self.action} user={self.user_id}>"


from app.models.user import User  # noqa: E402, F401
