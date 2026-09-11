"""
Calculation Service — Core margin level formulas.

Implements:
  1. Equity = Balance + Credit + Floating_PL
  2. ML% = (Equity / Used_Margin) × 100
  3. Liquidation Price (where ML% = 100%)
  4. Required Balance to maintain ML% = 100% at target price

Critical Rule: If Balance == Equity → STOPPED OUT (no further calculation).
"""

import logging
from dataclasses import dataclass, field
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.instrument import Instrument

logger = logging.getLogger(__name__)


@dataclass
class PositionData:
    """Position data for calculations."""
    symbol: str
    type: str  # "buy" or "sell"
    volume: float  # lots
    open_price: float
    current_price: Optional[float] = None  # if None, uses open_price

    @property
    def price(self) -> float:
        return self.current_price if self.current_price else self.open_price


@dataclass
class InstrumentSpec:
    """Instrument specification loaded from DB."""
    symbol: str
    contract_size: float
    tick_size: float
    tick_value: float
    point_value: float  # = tick_value / tick_size

    @classmethod
    def from_model(cls, inst: Instrument) -> "InstrumentSpec":
        return cls(
            symbol=inst.symbol,
            contract_size=inst.contract_size,
            tick_size=inst.tick_size,
            tick_value=inst.tick_value,
            point_value=inst.point_value,
        )


@dataclass
class CalculationResult:
    """Result of a margin level calculation."""
    equity: float
    floating_pl: float
    margin_level_percent: float
    is_stopped_out: bool = False
    stopped_out_reason: Optional[str] = None
    liquidation_price: Optional[float] = None
    balance_required: Optional[float] = None
    additional_deposit: Optional[float] = None
    details: dict = field(default_factory=dict)


class CalculationService:
    """
    Core calculation engine for margin level, liquidation price,
    and required balance adjustments.
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self._instrument_cache: dict[str, InstrumentSpec] = {}

    async def get_instrument(self, symbol: str) -> InstrumentSpec:
        """Fetch instrument spec from DB (with in-memory cache)."""
        symbol_upper = symbol.upper()
        if symbol_upper in self._instrument_cache:
            return self._instrument_cache[symbol_upper]

        result = await self.db.execute(
            select(Instrument).where(
                Instrument.symbol == symbol_upper,
                Instrument.is_active == True,
            )
        )
        inst = result.scalar_one_or_none()

        if inst is None:
            raise ValueError(f"Instrument '{symbol_upper}' not found in database")

        spec = InstrumentSpec.from_model(inst)
        self._instrument_cache[symbol_upper] = spec
        return spec

    def calculate_floating_pl(
        self,
        position: PositionData,
        instrument: InstrumentSpec,
        price: Optional[float] = None,
    ) -> float:
        """
        Calculate floating P/L for a single position.

        PL_long  = (Current_Price − Open_Price) × Volume × Contract_Size × Point_Value
        PL_short = (Open_Price − Current_Price) × Volume × Contract_Size × Point_Value

        Point_Value = Tick_Value / Tick_Size
        """
        current_price = price if price is not None else position.price
        price_diff = current_price - position.open_price

        if position.type.lower() == "buy":
            pl = price_diff * position.volume * instrument.contract_size * instrument.point_value
        else:  # sell
            pl = -price_diff * position.volume * instrument.contract_size * instrument.point_value

        return pl

    def calculate_equity(
        self,
        balance: float,
        credit: float,
        positions: list[PositionData],
        instruments: dict[str, InstrumentSpec],
        prices: Optional[dict[str, float]] = None,
    ) -> tuple[float, float]:
        """
        Calculate Equity = Balance + Credit + Σ(Floating PL).

        Returns: (equity, total_floating_pl)
        """
        total_pl = 0.0

        for pos in positions:
            inst = instruments.get(pos.symbol.upper())
            if inst is None:
                logger.warning(f"Instrument {pos.symbol} not found, skipping P/L calc")
                continue

            price = prices.get(pos.symbol.upper()) if prices else None
            pl = self.calculate_floating_pl(pos, inst, price)
            total_pl += pl

        equity = balance + credit + total_pl
        return equity, total_pl

    def calculate_margin_level(self, equity: float, used_margin: float) -> float:
        """
        Calculate Margin Level % = (Equity / Used_Margin) × 100.
        """
        if used_margin <= 0:
            return float("inf")  # No margin used = infinite ML%
        return (equity / used_margin) * 100.0

    def check_stopped_out(
        self,
        balance: float,
        equity: float,
        tolerance: float = 0.01,
    ) -> tuple[bool, Optional[str]]:
        """
        Critical Rule: If Balance == Equity → STOPPED OUT.

        This means Credit + Floating_PL = 0, indicating the account
        has been fully liquidated by the broker.
        """
        if abs(balance - equity) < tolerance:
            return True, "Balance equals Equity — account has been stopped out"

        if equity <= 0:
            return True, "Equity is zero or negative — account is bankrupt"

        return False, None

    async def calculate_liquidation_price(
        self,
        balance: float,
        credit: float,
        used_margin: float,
        positions: list[PositionData],
    ) -> CalculationResult:
        """
        Calculate the price at which ML% = 100% (liquidation).

        At liquidation: Equity = Used_Margin
        → Balance + Credit + Floating_PL_liq = Used_Margin
        → Floating_PL_liq = Used_Margin − Balance − Credit

        For a single LONG:
          (P_liq − P_open) × Volume × Contract_Size × Point_Value = Used_Margin − Balance − Credit
          P_liq = P_open + (Used_Margin − Balance − Credit) / (Volume × Contract_Size × Point_Value)

        For a single SHORT:
          P_liq = P_open − (Used_Margin − Balance − Credit) / (Volume × Contract_Size × Point_Value)
        """
        # Load instrument specs
        instruments = {}
        for pos in positions:
            sym = pos.symbol.upper()
            if sym not in instruments:
                instruments[sym] = await self.get_instrument(sym)

        # Calculate current equity and ML%
        equity, floating_pl = self.calculate_equity(balance, credit, positions, instruments)
        ml_percent = self.calculate_margin_level(equity, used_margin)

        # Check STOPPED OUT condition
        is_stopped, reason = self.check_stopped_out(balance, equity)
        if is_stopped:
            return CalculationResult(
                equity=equity,
                floating_pl=floating_pl,
                margin_level_percent=ml_percent,
                is_stopped_out=True,
                stopped_out_reason=reason,
            )

        # Calculate allowable loss before liquidation
        allowable_loss = equity - used_margin  # How much we can lose before ML% = 100%

        if allowable_loss <= 0:
            # Already at or below liquidation
            return CalculationResult(
                equity=equity,
                floating_pl=floating_pl,
                margin_level_percent=ml_percent,
                is_stopped_out=True,
                stopped_out_reason="ML% already at or below 100%",
            )

        # For multi-position, solve for the price that makes total PL = -(allowable_loss)
        # Each position's PL is linear in price, so we can solve analytically.
        #
        # Total PL(P) = Σᵢ [dir_i × (P − Open_i) × Vol_i × CS_i × PV_i]
        # We want: Total PL(P_liq) = current_PL − allowable_loss
        #
        # For simplicity, if all positions are on the same symbol:
        #   P_liq = weighted average based on directional exposure

        # Group positions by symbol
        by_symbol: dict[str, list[PositionData]] = {}
        for pos in positions:
            sym = pos.symbol.upper()
            if sym not in by_symbol:
                by_symbol[sym] = []
            by_symbol[sym].append(pos)

        # Calculate liquidation price per symbol group
        liquidation_prices = {}
        details = {}

        for sym, sym_positions in by_symbol.items():
            inst = instruments[sym]

            # Calculate net directional exposure
            # For each position: dir × Volume × Contract_Size × Point_Value
            total_exposure = 0.0
            weighted_open = 0.0
            current_pl_sym = 0.0

            for pos in sym_positions:
                direction = 1.0 if pos.type.lower() == "buy" else -1.0
                exposure = direction * pos.volume * inst.contract_size * inst.point_value
                total_exposure += exposure
                weighted_open += exposure * pos.open_price
                current_pl_sym += self.calculate_floating_pl(pos, inst)

            if abs(total_exposure) < 1e-10:
                # Hedged or zero exposure — no liquidation price for this symbol
                liquidation_prices[sym] = None
                details[sym] = {"status": "hedged_or_zero_exposure"}
                continue

            # Target PL for this symbol group
            # We need total PL to drop by allowable_loss from current
            target_pl_sym = current_pl_sym - allowable_loss

            # Solve: target_pl = (P_liq × total_exposure) − weighted_open
            # P_liq = (target_pl + weighted_open) / total_exposure
            p_liq = (target_pl_sym + weighted_open) / total_exposure

            liquidation_prices[sym] = p_liq
            details[sym] = {
                "liquidation_price": p_liq,
                "net_exposure": total_exposure,
                "current_pl": current_pl_sym,
                "positions_count": len(sym_positions),
            }

        # If single symbol, return that price directly
        if len(liquidation_prices) == 1:
            sym = list(liquidation_prices.keys())[0]
            liq_price = liquidation_prices[sym]
        else:
            # Multi-symbol: return the closest liquidation price (most urgent)
            # For now, return None and let the frontend handle multi-symbol display
            liq_price = None
            details["multi_symbol"] = True
            details["per_symbol_liquidation"] = liquidation_prices

        return CalculationResult(
            equity=equity,
            floating_pl=floating_pl,
            margin_level_percent=ml_percent,
            liquidation_price=liq_price,
            details=details,
        )

    async def calculate_required_balance(
        self,
        balance: float,
        credit: float,
        used_margin: float,
        target_price: float,
        positions: list[PositionData],
    ) -> CalculationResult:
        """
        Calculate the minimum balance needed to survive at target_price.

        At ML% = 100%: Balance_req + Credit + PL(target_price) = Used_Margin
        → Balance_req = Used_Margin − Credit − PL(target_price)
        """
        # Load instrument specs
        instruments = {}
        for pos in positions:
            sym = pos.symbol.upper()
            if sym not in instruments:
                instruments[sym] = await self.get_instrument(sym)

        # Calculate current equity
        equity, floating_pl = self.calculate_equity(balance, credit, positions, instruments)
        ml_percent = self.calculate_margin_level(equity, used_margin)

        # Check STOPPED OUT condition
        is_stopped, reason = self.check_stopped_out(balance, equity)
        if is_stopped:
            return CalculationResult(
                equity=equity,
                floating_pl=floating_pl,
                margin_level_percent=ml_percent,
                is_stopped_out=True,
                stopped_out_reason=reason,
            )

        # Calculate P/L at target price
        pl_at_target = 0.0
        details = {}

        for pos in positions:
            inst = instruments.get(pos.symbol.upper())
            if inst is None:
                continue

            pl = self.calculate_floating_pl(pos, inst, price=target_price)
            pl_at_target += pl

            sym = pos.symbol.upper()
            if sym not in details:
                details[sym] = {"pl_at_target": 0.0, "positions": []}
            details[sym]["pl_at_target"] += pl
            details[sym]["positions"].append({
                "type": pos.type,
                "volume": pos.volume,
                "open_price": pos.open_price,
                "pl_at_target": pl,
            })

        # Calculate required balance
        equity_at_target = balance + credit + pl_at_target
        balance_required = used_margin - credit - pl_at_target
        additional_deposit = max(0.0, balance_required - balance)
        ml_at_target = self.calculate_margin_level(equity_at_target, used_margin)

        return CalculationResult(
            equity=equity_at_target,
            floating_pl=pl_at_target,
            margin_level_percent=ml_at_target,
            balance_required=max(0.0, balance_required),
            additional_deposit=additional_deposit,
            details=details,
        )
