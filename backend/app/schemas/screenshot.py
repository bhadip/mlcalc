"""
Screenshot schemas — request/response models for screenshot endpoints.
"""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class PositionData(BaseModel):
    """Single position extracted from OCR."""
    symbol: str
    type: str  # "buy" | "sell"
    volume: float
    open_price: float
    current_price: float
    profit: float
    swap: float = 0.0
    commission: float = 0.0


class ExtractedAccountData(BaseModel):
    """Full account data extracted from screenshot OCR."""
    balance: float
    equity: float
    margin: float
    free_margin: float
    margin_level_percent: Optional[float] = None
    credit: float = 0.0
    positions: list[PositionData] = []
    raw_ocr_text: Optional[str] = None
    confidence: Optional[float] = None
    validation_passed: bool = False
    validation_errors: list[str] = []


class ScreenshotResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    filename: str
    file_size_bytes: int
    content_type: str
    ocr_status: str
    extracted_data: Optional[ExtractedAccountData] = None
    shared_with: Optional[dict] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ScreenshotShareRequest(BaseModel):
    user_ids: list[uuid.UUID] = []
    is_public: bool = False


class ScreenshotListResponse(BaseModel):
    items: list[ScreenshotResponse]
    total: int
    page: int
    page_size: int
