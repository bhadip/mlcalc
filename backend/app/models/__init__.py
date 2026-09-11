"""
Models package — import all models here so Alembic can discover them.
"""

from app.models.base import Base, SoftDeleteMixin, TimestampMixin, UUIDMixin
from app.models.user import User, UserRole, OAuthProvider
from app.models.instrument import Instrument
from app.models.screenshot import Screenshot
from app.models.audit_log import AuditLog
from app.models.simulation_history import SimulationHistory

__all__ = [
    "Base",
    "SoftDeleteMixin",
    "TimestampMixin",
    "UUIDMixin",
    "User",
    "UserRole",
    "OAuthProvider",
    "Instrument",
    "Screenshot",
    "AuditLog",
    "SimulationHistory",
]
