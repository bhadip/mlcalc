"""
Screenshot model — stores uploaded trading terminal screenshots,
OCR-extracted data (JSONB), and sharing permissions.
"""

import uuid
from typing import Optional

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import SoftDeleteMixin, TimestampMixin, UUIDMixin


class Screenshot(UUIDMixin, TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "screenshots"

    # Ownership
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )

    # File metadata
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(512), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(nullable=False)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)

    # OCR results (JSONB)
    # Structure: {
    #   "balance": 10000.00,
    #   "equity": 10250.00,
    #   "margin": 1080.00,
    #   "free_margin": 9170.00,
    #   "margin_level_percent": 949.07,
    #   "credit": 0.0,
    #   "positions": [
    #     {
    #       "symbol": "EURUSD",
    #       "type": "buy",
    #       "volume": 1.0,
    #       "open_price": 1.0850,
    #       "current_price": 1.0875,
    #       "profit": 250.00,
    #       "swap": 0.0,
    #       "commission": 0.0
    #     }
    #   ],
    #   "raw_ocr_text": "...",
    #   "confidence": 0.95,
    #   "validation_passed": true,
    #   "validation_errors": []
    # }
    extracted_data: Mapped[Optional[dict]] = mapped_column(
        JSONB, nullable=True,
        comment="OCR-extracted account data and positions"
    )

    # Processing status
    ocr_status: Mapped[str] = mapped_column(
        String(20), default="pending", nullable=False,
        comment="pending | processing | completed | failed"
    )
    ocr_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Sharing (JSONB)
    # Structure: {
    #   "user_ids": ["uuid1", "uuid2"],
    #   "is_public": false,
    #   "share_token": "abc123"
    # }
    shared_with: Mapped[Optional[dict]] = mapped_column(
        JSONB, nullable=True, default=None,
        comment="Sharing configuration: user_ids, is_public, share_token"
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="screenshots")

    def __repr__(self) -> str:
        return f"<Screenshot {self.filename} status={self.ocr_status}>"


from app.models.user import User  # noqa: E402, F401
