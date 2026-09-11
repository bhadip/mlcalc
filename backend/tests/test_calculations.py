"""
Test Calculations — Verify the core margin level formulas.

Tests:
  1. Equity = Balance + Credit + Floating PL
  2. ML% = (Equity / Used_Margin) × 100
  3. Liquidation Price (ML% = 100%)
  4. Required Balance at target price
  5. STOPPED OUT detection (Balance == Equity)
"""

import pytest
from unittest.mock import AsyncMock, MagicMock

from app.services.calculation_service import (
    CalculationService,
    PositionData,
    InstrumentSpec,
)


# ─── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture
def mock_db():
    """Mock async database session."""
    db = AsyncMock()
    return db


@pytest.fixture
def calc_service(mock_db):
    """CalculationService with mocked DB."""
    return CalculationService(mock_db)


@pytest.fixture
def eurusd_spec():
    """EURUSD instrument spec: contract_size=100000, tick_size=0.00001, tick_value=1.0"""
    return InstrumentSpec(
        symbol="EURUSD",
        contract_size=100000,
        tick_size=0.00001,
        tick_value=1.0,
        point_value=1.0 / 0.00001,  # = 100000 (i.e., $10/pip for 1 lot)
    )


@pytest.fixture
def xauusd_spec():
    """XAUUSD instrument spec: contract_size=100, tick_size=0.01, tick_value=1.0"""
    return InstrumentSpec(
        symbol="XAUUSD",
        contract_size=100,
        tick_size=0.01,
        tick_value=1.0,
        point_value=1.0 / 0.01,  # = 100
    )


# ─── Test: Floating P/L Calculation ───────────────────────────────────────────

class TestFloatingPL:
    """Test P/L calculation for Long and Short positions."""

    def test_long_profit(self, calc_service, eurusd_spec):
        """Long position: price goes up → profit.
        
        EURUSD: Point_Value = Tick_Value / Tick_Size = 1.0 / 0.00001 = 100,000
        PL = ΔPrice × Volume × Point_Value = 0.0025 × 1.0 × 100,000 = $250
        """
        pos = PositionData(
            symbol="EURUSD",
            type="buy",
            volume=1.0,
            open_price=1.0850,
            current_price=1.0875,
        )
        pl = calc_service.calculate_floating_pl(pos, eurusd_spec)
        # 25-pip move (0.0025) on 1 lot = $250
        expected = 0.0025 * 1.0 * 100000  # ΔPrice × Volume × Point_Value
        assert abs(pl - expected) < 0.01

    def test_long_loss(self, calc_service, eurusd_spec):
        """Long position: price goes down → loss.
        
        PL = -0.0025 × 1.0 × 100,000 = -$250
        """
        pos = PositionData(
            symbol="EURUSD",
            type="buy",
            volume=1.0,
            open_price=1.0850,
            current_price=1.0825,
        )
        pl = calc_service.calculate_floating_pl(pos, eurusd_spec)
        expected = -0.0025 * 1.0 * 100000  # -$250
        assert abs(pl - expected) < 0.01

    def test_short_profit(self, calc_service, eurusd_spec):
        """Short position: price goes down → profit.
        
        PL = -(-0.0025) × 1.0 × 100,000 = $250
        """
        pos = PositionData(
            symbol="EURUSD",
            type="sell",
            volume=1.0,
            open_price=1.0850,
            current_price=1.0825,
        )
        pl = calc_service.calculate_floating_pl(pos, eurusd_spec)
        expected = 0.0025 * 1.0 * 100000  # $250
        assert abs(pl - expected) < 0.01

    def test_short_loss(self, calc_service, eurusd_spec):
        """Short position: price goes up → loss.
        
        PL = -(0.0025) × 1.0 × 100,000 = -$250
        """
        pos = PositionData(
            symbol="EURUSD",
            type="sell",
            volume=1.0,
            open_price=1.0850,
            current_price=1.0875,
        )
        pl = calc_service.calculate_floating_pl(pos, eurusd_spec)
        expected = -0.0025 * 1.0 * 100000  # -$250
        assert abs(pl - expected) < 0.01

    def test_xauusd_profit(self, calc_service, xauusd_spec):
        """XAUUSD: $10 gold move on 1 lot = $1000.
        
        Point_Value = 1.0 / 0.01 = 100
        PL = 10.0 × 1.0 × 100 = $1000
        """
        pos = PositionData(
            symbol="XAUUSD",
            type="buy",
            volume=1.0,
            open_price=2000.0,
            current_price=2010.0,
        )
        pl = calc_service.calculate_floating_pl(pos, xauusd_spec)
        expected = 10.0 * 1.0 * 100  # $1000
        assert abs(pl - expected) < 0.01


# ─── Test: Equity Calculation ─────────────────────────────────────────────────

class TestEquity:
    """Test Equity = Balance + Credit + Σ(Floating PL)."""

    def test_equity_no_positions(self, calc_service, eurusd_spec):
        """No positions: Equity = Balance + Credit."""
        instruments = {"EURUSD": eurusd_spec}
        equity, pl = calc_service.calculate_equity(
            balance=10000.0,
            credit=500.0,
            positions=[],
            instruments=instruments,
        )
        assert equity == 10500.0
        assert pl == 0.0

    def test_equity_with_profit(self, calc_service, eurusd_spec):
        """Equity includes floating profit."""
        positions = [
            PositionData(
                symbol="EURUSD",
                type="buy",
                volume=1.0,
                open_price=1.0850,
                current_price=1.0875,
            )
        ]
        instruments = {"EURUSD": eurusd_spec}
        equity, pl = calc_service.calculate_equity(
            balance=10000.0,
            credit=0.0,
            positions=positions,
            instruments=instruments,
        )
        assert pl > 0  # Should have profit
        assert equity > 10000.0  # Equity should be higher than balance


# ─── Test: Margin Level ───────────────────────────────────────────────────────

class TestMarginLevel:
    """Test ML% = (Equity / Used_Margin) × 100."""

    def test_margin_level_basic(self, calc_service):
        """Basic ML% calculation."""
        ml = calc_service.calculate_margin_level(equity=10000.0, used_margin=1000.0)
        assert ml == 1000.0  # 10000 / 1000 × 100 = 1000%

    def test_margin_level_at_100(self, calc_service):
        """ML% = 100% when Equity == Used_Margin."""
        ml = calc_service.calculate_margin_level(equity=1000.0, used_margin=1000.0)
        assert ml == 100.0

    def test_margin_level_no_margin(self, calc_service):
        """No margin used → infinite ML%."""
        ml = calc_service.calculate_margin_level(equity=10000.0, used_margin=0.0)
        assert ml == float("inf")


# ─── Test: STOPPED OUT Detection ──────────────────────────────────────────────

class TestStoppedOut:
    """CRITICAL: Test the STOPPED OUT condition."""

    def test_stopped_out_balance_equals_equity(self, calc_service):
        """When Balance == Equity → STOPPED OUT."""
        is_stopped, reason = calc_service.check_stopped_out(
            balance=10000.0, equity=10000.0
        )
        assert is_stopped is True
        assert reason is not None
        assert "stopped out" in reason.lower()

    def test_not_stopped_out_normal(self, calc_service):
        """Normal case: Balance ≠ Equity → not stopped out."""
        is_stopped, reason = calc_service.check_stopped_out(
            balance=10000.0, equity=10250.0
        )
        assert is_stopped is False
        assert reason is None

    def test_stopped_out_negative_equity(self, calc_service):
        """Negative equity → STOPPED OUT."""
        is_stopped, reason = calc_service.check_stopped_out(
            balance=10000.0, equity=-100.0
        )
        assert is_stopped is True

    def test_not_stopped_out_with_credit(self, calc_service):
        """Equity > Balance due to credit → not stopped out."""
        is_stopped, reason = calc_service.check_stopped_out(
            balance=10000.0, equity=10500.0  # credit = 500
        )
        assert is_stopped is False


# ─── Test: Liquidation Price ──────────────────────────────────────────────────

class TestLiquidationPrice:
    """Test liquidation price calculation (ML% = 100%)."""

    @pytest.mark.asyncio
    async def test_liquidation_price_stopped_out(self, calc_service, mock_db, eurusd_spec):
        """If Balance == Equity, should return STOPPED OUT."""
        # Mock the instrument lookup
        mock_db.execute = AsyncMock(return_value=MagicMock(
            scalar_one_or_none=MagicMock(return_value=eurusd_spec)
        ))

        positions = [
            PositionData(
                symbol="EURUSD",
                type="buy",
                volume=1.0,
                open_price=1.0850,
                current_price=1.0850,  # No P/L
            )
        ]

        # Balance == Equity (no credit, no P/L)
        result = await calc_service.calculate_liquidation_price(
            balance=10000.0,
            credit=0.0,
            used_margin=1000.0,
            positions=positions,
        )

        assert result.is_stopped_out is True


# ─── Test: Required Balance ───────────────────────────────────────────────────

class TestRequiredBalance:
    """Test required balance calculation at target price."""

    @pytest.mark.asyncio
    async def test_required_balance_stopped_out(self, calc_service, mock_db, eurusd_spec):
        """If Balance == Equity, should return STOPPED OUT."""
        mock_db.execute = AsyncMock(return_value=MagicMock(
            scalar_one_or_none=MagicMock(return_value=eurusd_spec)
        ))

        positions = [
            PositionData(
                symbol="EURUSD",
                type="buy",
                volume=1.0,
                open_price=1.0850,
                current_price=1.0850,
            )
        ]

        result = await calc_service.calculate_required_balance(
            balance=10000.0,
            credit=0.0,
            used_margin=1000.0,
            target_price=1.0700,
            positions=positions,
        )

        assert result.is_stopped_out is True
