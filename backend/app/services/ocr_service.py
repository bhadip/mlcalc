"""
OCR Service — Extract trading data from dark-themed MT5 terminal screenshots.

Supports EasyOCR (primary) and Pytesseract (fallback).
Includes validation: Equity ≈ Balance + Credit + Sum(P/L).
"""

import logging
import re
from pathlib import Path
from typing import Optional

import numpy as np

from app.config import settings

logger = logging.getLogger(__name__)


class OCRValidationError(Exception):
    """Raised when OCR-extracted data fails validation."""
    pass


class OCRService:
    """
    Extracts account data from MT5 terminal screenshots.

    Target fields:
      - Balance, Equity, Margin, Free Margin, Margin Level %
      - Credit (if visible)
      - Open positions: Symbol, Type (Buy/Sell), Volume, Open Price, Current Price, Profit
    """

    def __init__(self):
        self._easyocr_reader = None
        self._tesseract_available = None

    def _get_easyocr_reader(self):
        """Lazy-load EasyOCR reader."""
        if self._easyocr_reader is None:
            try:
                import easyocr
                self._easyocr_reader = easyocr.Reader(
                    settings.OCR_LANGUAGES.split(","),
                    gpu=settings.OCR_GPU,
                )
            except ImportError:
                logger.warning("EasyOCR not installed, falling back to Tesseract")
                self._easyocr_reader = None
        return self._easyocr_reader

    def _check_tesseract(self) -> bool:
        """Check if Tesseract is available."""
        if self._tesseract_available is None:
            try:
                import pytesseract
                pytesseract.get_tesseract_version()
                self._tesseract_available = True
            except Exception:
                self._tesseract_available = False
        return self._tesseract_available

    def _preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """
        Preprocess dark-themed screenshot for better OCR accuracy.

        Steps:
          1. Convert to grayscale
          2. Apply adaptive threshold (handles dark backgrounds)
          3. Invert if needed (text should be dark on light)
        """
        import cv2

        # Convert to grayscale
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()

        # Adaptive threshold for dark backgrounds
        processed = cv2.adaptiveThreshold(
            gray, 255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            blockSize=11,
            C=2,
        )

        # Invert if text is light (common in dark themes)
        # Check if majority of pixels are white (inverted)
        white_ratio = np.sum(processed > 128) / processed.size
        if white_ratio < 0.5:
            processed = cv2.bitwise_not(processed)

        return processed

    async def extract_from_image(
        self,
        image_path: str,
        engine: Optional[str] = None,
    ) -> dict:
        """
        Extract account data from a trading screenshot.

        Returns:
        {
            "balance": float,
            "equity": float,
            "margin": float,
            "free_margin": float,
            "margin_level_percent": float | None,
            "credit": float,
            "positions": [...],
            "raw_ocr_text": str,
            "confidence": float,
            "validation_passed": bool,
            "validation_errors": [...]
        }
        """
        engine = engine or settings.OCR_ENGINE

        # Load image
        import cv2
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError(f"Failed to load image: {image_path}")

        # Preprocess
        processed = self._preprocess_image(image)

        # Run OCR
        if engine == "easyocr":
            raw_text, confidence = self._run_easyocr(processed)
        elif engine == "tesseract":
            raw_text, confidence = self._run_tesseract(processed)
        else:  # "both"
            raw_text_e, conf_e = self._run_easyocr(processed)
            raw_text_t, conf_t = self._run_tesseract(processed)
            # Use the one with higher confidence
            if conf_e >= conf_t:
                raw_text, confidence = raw_text_e, conf_e
            else:
                raw_text, confidence = raw_text_t, conf_t

        # Parse extracted data
        parsed = self._parse_account_data(raw_text)
        parsed["raw_ocr_text"] = raw_text
        parsed["confidence"] = confidence

        # Validate
        validation_errors = self._validate_extracted_data(parsed)
        parsed["validation_passed"] = len(validation_errors) == 0
        parsed["validation_errors"] = validation_errors

        return parsed

    def _run_easyocr(self, image: np.ndarray) -> tuple[str, float]:
        """Run EasyOCR on preprocessed image."""
        reader = self._get_easyocr_reader()
        if reader is None:
            raise RuntimeError("EasyOCR not available")

        results = reader.readtext(image)
        text_lines = [r[1] for r in results]
        raw_text = "\n".join(text_lines)
        confidence = sum(r[2] for r in results) / len(results) if results else 0.0

        return raw_text, confidence

    def _run_tesseract(self, image: np.ndarray) -> tuple[str, float]:
        """Run Tesseract OCR on preprocessed image."""
        if not self._check_tesseract():
            raise RuntimeError("Tesseract not available")

        import pytesseract
        raw_text = pytesseract.image_to_string(image)
        # Tesseract doesn't provide per-word confidence easily, use overall
        confidence = 0.85  # Default estimate

        return raw_text, confidence

    def _parse_account_data(self, raw_text: str) -> dict:
        """
        Parse MT5 terminal text to extract account fields and positions.

        MT5 Trade tab format (typical):
          Balance: 10,000.00
          Equity: 10,250.00
          Margin: 1,080.00
          Free margin: 9,170.00
          Margin level: 949.07%

        Positions table:
          Symbol  Type  Volume  Open price  Current price  Profit  Swap  Commission
          EURUSD  buy   1.00    1.0850      1.0875         250.00  0.00  0.00
        """
        result = {
            "balance": 0.0,
            "equity": 0.0,
            "margin": 0.0,
            "free_margin": 0.0,
            "margin_level_percent": None,
            "credit": 0.0,
            "positions": [],
        }

        lines = raw_text.split("\n")

        for line in lines:
            line_lower = line.lower().strip()

            # Account fields
            if "balance" in line_lower:
                result["balance"] = self._extract_number(line)
            elif "equity" in line_lower:
                result["equity"] = self._extract_number(line)
            elif "margin" in line_lower and "level" not in line_lower and "free" not in line_lower:
                result["margin"] = self._extract_number(line)
            elif "free" in line_lower and "margin" in line_lower:
                result["free_margin"] = self._extract_number(line)
            elif "margin level" in line_lower or "margin_level" in line_lower:
                result["margin_level_percent"] = self._extract_number(line)
            elif "credit" in line_lower:
                result["credit"] = self._extract_number(line)

        # Parse positions (simplified — real implementation would use table detection)
        result["positions"] = self._parse_positions(raw_text)

        return result

    def _extract_number(self, text: str) -> float:
        """Extract the first number from a text line."""
        # Match patterns like "10,000.00" or "949.07%"
        match = re.search(r"[\d,]+\.?\d*", text.replace(",", ""))
        if match:
            try:
                return float(match.group())
            except ValueError:
                return 0.0
        return 0.0

    def _parse_positions(self, raw_text: str) -> list[dict]:
        """
        Parse position rows from OCR text.

        This is a simplified parser. A production implementation would use
        table detection (e.g., OpenCV contour detection or layout analysis).
        """
        positions = []

        # Look for patterns like: EURUSD buy 1.00 1.0850 1.0875 250.00
        # This regex is a starting point — real MT5 output varies
        pattern = re.compile(
            r"([A-Z]{6})\s+(buy|sell)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([-\d.]+)",
            re.IGNORECASE,
        )

        for match in pattern.finditer(raw_text):
            positions.append({
                "symbol": match.group(1).upper(),
                "type": match.group(2).lower(),
                "volume": float(match.group(3)),
                "open_price": float(match.group(4)),
                "current_price": float(match.group(5)),
                "profit": float(match.group(6)),
                "swap": 0.0,
                "commission": 0.0,
            })

        return positions

    def _validate_extracted_data(self, data: dict) -> list[str]:
        """
        Validate extracted data for internal consistency.

        Checks:
          1. Equity ≈ Balance + Credit + Sum(PL)
          2. Free Margin ≈ Equity − Margin
          3. Margin Level ≈ (Equity / Margin) × 100
          4. All values are non-negative (except P/L)
        """
        errors = []

        balance = data.get("balance", 0.0)
        equity = data.get("equity", 0.0)
        credit = data.get("credit", 0.0)
        margin = data.get("margin", 0.0)
        free_margin = data.get("free_margin", 0.0)
        ml_percent = data.get("margin_level_percent")
        positions = data.get("positions", [])

        # Check 1: Equity ≈ Balance + Credit + Sum(PL)
        total_pl = sum(p.get("profit", 0.0) for p in positions)
        expected_equity = balance + credit + total_pl
        if equity > 0 and abs(equity - expected_equity) > 1.0:  # $1 tolerance
            errors.append(
                f"Equity validation failed: {equity:.2f} ≠ "
                f"Balance({balance:.2f}) + Credit({credit:.2f}) + PL({total_pl:.2f}) = {expected_equity:.2f}"
            )

        # Check 2: Free Margin ≈ Equity − Margin
        expected_free = equity - margin
        if free_margin > 0 and abs(free_margin - expected_free) > 1.0:
            errors.append(
                f"Free margin validation failed: {free_margin:.2f} ≠ "
                f"Equity({equity:.2f}) − Margin({margin:.2f}) = {expected_free:.2f}"
            )

        # Check 3: Margin Level ≈ (Equity / Margin) × 100
        if ml_percent is not None and margin > 0:
            expected_ml = (equity / margin) * 100.0
            if abs(ml_percent - expected_ml) > 1.0:  # 1% tolerance
                errors.append(
                    f"Margin level validation failed: {ml_percent:.2f}% ≠ "
                    f"(Equity({equity:.2f}) / Margin({margin:.2f})) × 100 = {expected_ml:.2f}%"
                )

        # Check 4: Non-negative values
        if balance < 0:
            errors.append(f"Balance is negative: {balance:.2f}")
        if equity < 0:
            errors.append(f"Equity is negative: {equity:.2f}")
        if margin < 0:
            errors.append(f"Margin is negative: {margin:.2f}")

        return errors
