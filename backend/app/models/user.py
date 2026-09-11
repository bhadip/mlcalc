"""
User model — supports Google/Microsoft OAuth, role-based access, soft-delete.
"""

import enum
from typing import Optional

from sqlalchemy import Enum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import SoftDeleteMixin, TimestampMixin, UUIDMixin


class UserRole(str, enum.Enum):
    VISITOR = "visitor"
    USER = "user"
    ADMIN = "admin"


class OAuthProvider(str, enum.Enum):
    GOOGLE = "google"
    MICROSOFT = "microsoft"


class User(UUIDMixin, TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)

    # OAuth
    oauth_provider: Mapped[OAuthProvider] = mapped_column(
        Enum(OAuthProvider), nullable=False
    )
    oauth_subject: Mapped[str] = mapped_column(
        String(255), nullable=False, comment="Provider-specific user ID (sub)"
    )

    # Authorization
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole), default=UserRole.VISITOR, nullable=False
    )
    is_approved: Mapped[bool] = mapped_column(default=False, nullable=False)

    # Relationships
    screenshots: Mapped[list["Screenshot"]] = relationship(
        "Screenshot", back_populates="user", lazy="selectin"
    )
    simulations: Mapped[list["SimulationHistory"]] = relationship(
        "SimulationHistory", back_populates="user", lazy="selectin"
    )
    audit_logs: Mapped[list["AuditLog"]] = relationship(
        "AuditLog", back_populates="user", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<User {self.email} role={self.role.value}>"


# Avoid circular imports
from app.models.screenshot import Screenshot  # noqa: E402, F401
from app.models.simulation_history import SimulationHistory  # noqa: E402, F401
from app.models.audit_log import AuditLog  # noqa: E402, F401
