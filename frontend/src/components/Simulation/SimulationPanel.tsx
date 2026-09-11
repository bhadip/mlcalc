/**
 * SimulationPanel — Main simulation interface.
 * 
 * CRITICAL: Listens for is_stopped_out flag from backend.
 * When triggered, displays StopOutAlert and disables all inputs.
 */

import { useState, useEffect } from 'react';
import { simulationsApi } from '@/api/client';
import { Position, LiquidationPriceResponse, BalanceAdjustmentResponse } from '@/types';
import StopOutAlert from './StopOutAlert';
import MarginLevelGauge from './MarginLevelGauge';
import { AlertCircle, Calculator, Target, DollarSign } from 'lucide-react';

interface SimulationPanelProps {
  initialBalance?: number;
  initialCredit?: number;
  initialMargin?: number;
  initialPositions?: Position[];
}

export default function SimulationPanel({
  initialBalance = 10000,
  initialCredit = 0,
  initialMargin = 1000,
  initialPositions = [],
}: SimulationPanelProps) {
  const [balance, setBalance] = useState(initialBalance);
  const [credit, setCredit] = useState(initialCredit);
  const [usedMargin, setUsedMargin] = useState(initialMargin);
  const [positions, setPositions] = useState<Position[]>(initialPositions);

  const [liquidationResult, setLiquidationResult] = useState<LiquidationPriceResponse | null>(null);
  const [balanceResult, setBalanceResult] = useState<BalanceAdjustmentResponse | null>(null);
  const [targetPrice, setTargetPrice] = useState<number>(0);

  const [isStoppedOut, setIsStoppedOut] = useState(false);
  const [stoppedOutReason, setStoppedOutReason] = useState<string | undefined>();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check STOPPED OUT condition on mount and when balance changes
  useEffect(() => {
    const stopped = Math.abs(balance - (balance + credit)) < 0.01;
    if (stopped) {
      setIsStoppedOut(true);
      setStoppedOutReason('Balance equals Equity — Credit exhausted, positions closed');
    } else {
      setIsStoppedOut(false);
      setStoppedOutReason(undefined);
    }
  }, [balance, credit]);

  // Calculate Liquidation Price
  const calculateLiquidationPrice = async () => {
    if (isStoppedOut) return;
    if (positions.length === 0) {
      setError('Add at least one position');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await simulationsApi.liquidationPrice({
        balance,
        credit,
        used_margin: usedMargin,
        positions: positions.map((p) => ({
          symbol: p.symbol,
          type: p.type,
          volume: p.volume,
          open_price: p.open_price,
          current_price: p.current_price,
        })),
      });

      const result = response.data;
      setLiquidationResult(result);

      // CRITICAL: Check STOPPED OUT flag
      if (result.is_stopped_out) {
        setIsStoppedOut(true);
        setStoppedOutReason(result.stopped_out_reason);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Calculation failed');
    } finally {
      setLoading(false);
    }
  };

  // Calculate Required Balance
  const calculateBalanceAdjustment = async () => {
    if (isStoppedOut) return;
    if (positions.length === 0) {
      setError('Add at least one position');
      return;
    }
    if (targetPrice <= 0) {
      setError('Enter a valid target price');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await simulationsApi.balanceAdjustment({
        balance,
        credit,
        used_margin: usedMargin,
        target_price: targetPrice,
        positions: positions.map((p) => ({
          symbol: p.symbol,
          type: p.type,
          volume: p.volume,
          open_price: p.open_price,
          current_price: p.current_price,
        })),
      });

      const result = response.data;
      setBalanceResult(result);

      // CRITICAL: Check STOPPED OUT flag
      if (result.is_stopped_out) {
        setIsStoppedOut(true);
        setStoppedOutReason(result.stopped_out_reason);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Calculation failed');
    } finally {
      setLoading(false);
    }
  };

  // Add position
  const addPosition = () => {
    setPositions([
      ...positions,
      {
        symbol: 'EURUSD',
        type: 'buy',
        volume: 1.0,
        open_price: 1.085,
        current_price: 1.085,
      },
    ]);
  };

  // Update position
  const updatePosition = (index: number, field: keyof Position, value: any) => {
    const updated = [...positions];
    updated[index] = { ...updated[index], [field]: value };
    setPositions(updated);
  };

  // Remove position
  const removePosition = (index: number) => {
    setPositions(positions.filter((_, i) => i !== index));
  };

  return (
    <>
      {/* CRITICAL: Stop Out Alert Modal */}
      <StopOutAlert isStoppedOut={isStoppedOut} reason={stoppedOutReason} />

      <div className="space-y-6">
        {/* Margin Level Gauge */}
        <MarginLevelGauge
          marginLevelPercent={liquidationResult?.margin_level_percent}
          stopOutPercent={50}
          marginCallPercent={100}
        />

        {/* Account Inputs */}
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary-400" />
            Account Parameters
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Balance</label>
              <input
                type="number"
                value={balance}
                onChange={(e) => setBalance(parseFloat(e.target.value) || 0)}
                disabled={isStoppedOut}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Credit</label>
              <input
                type="number"
                value={credit}
                onChange={(e) => setCredit(parseFloat(e.target.value) || 0)}
                disabled={isStoppedOut}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Used Margin</label>
              <input
                type="number"
                value={usedMargin}
                onChange={(e) => setUsedMargin(parseFloat(e.target.value) || 0)}
                disabled={isStoppedOut}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Positions */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Open Positions</h3>
            <button
              onClick={addPosition}
              disabled={isStoppedOut}
              className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + Add Position
            </button>
          </div>

          {positions.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">
              No positions. Click "Add Position" to begin.
            </p>
          ) : (
            <div className="space-y-3">
              {positions.map((pos, idx) => (
                <div key={idx} className="grid grid-cols-2 md:grid-cols-6 gap-2 items-end">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Symbol</label>
                    <input
                      type="text"
                      value={pos.symbol}
                      onChange={(e) => updatePosition(idx, 'symbol', e.target.value)}
                      disabled={isStoppedOut}
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white text-sm disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Type</label>
                    <select
                      value={pos.type}
                      onChange={(e) => updatePosition(idx, 'type', e.target.value)}
                      disabled={isStoppedOut}
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white text-sm disabled:opacity-50"
                    >
                      <option value="buy">Buy</option>
                      <option value="sell">Sell</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Volume</label>
                    <input
                      type="number"
                      step="0.01"
                      value={pos.volume}
                      onChange={(e) => updatePosition(idx, 'volume', parseFloat(e.target.value) || 0)}
                      disabled={isStoppedOut}
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white text-sm disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Open Price</label>
                    <input
                      type="number"
                      step="0.00001"
                      value={pos.open_price}
                      onChange={(e) => updatePosition(idx, 'open_price', parseFloat(e.target.value) || 0)}
                      disabled={isStoppedOut}
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white text-sm disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Current Price</label>
                    <input
                      type="number"
                      step="0.00001"
                      value={pos.current_price || ''}
                      onChange={(e) => updatePosition(idx, 'current_price', parseFloat(e.target.value) || 0)}
                      disabled={isStoppedOut}
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white text-sm disabled:opacity-50"
                    />
                  </div>

                  <button
                    onClick={() => removePosition(idx)}
                    disabled={isStoppedOut}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={calculateLiquidationPrice}
            disabled={isStoppedOut || loading}
            className="btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Target className="w-5 h-5" />
            Calculate Liquidation Price
          </button>

          <button
            onClick={calculateBalanceAdjustment}
            disabled={isStoppedOut || loading}
            className="btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <DollarSign className="w-5 h-5" />
            Calculate Required Balance
          </button>
        </div>

        {/* Target Price Input (for balance adjustment) */}
        <div className="card">
          <label className="block text-sm text-slate-400 mb-2">
            Target Price (for balance adjustment)
          </label>
          <input
            type="number"
            step="0.00001"
            value={targetPrice || ''}
            onChange={(e) => setTargetPrice(parseFloat(e.target.value) || 0)}
            disabled={isStoppedOut}
            placeholder="Enter adverse price to test"
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Results */}
        {liquidationResult && !liquidationResult.is_stopped_out && (
          <div className="card border-primary-500/30">
            <h3 className="text-lg font-semibold text-white mb-3">Liquidation Price</h3>
            <div className="text-3xl font-bold text-primary-400 mb-2">
              {liquidationResult.liquidation_price?.toFixed(5) || 'N/A'}
            </div>
            <p className="text-sm text-slate-400">
              If price reaches this level, ML% = 100% and positions will be liquidated.
            </p>
          </div>
        )}

        {balanceResult && !balanceResult.is_stopped_out && (
          <div className="card border-emerald-500/30">
            <h3 className="text-lg font-semibold text-white mb-3">Required Balance</h3>
            <div className="text-3xl font-bold text-emerald-400 mb-2">
              ${balanceResult.balance_required?.toFixed(2) || '0.00'}
            </div>
            {balanceResult.additional_deposit && balanceResult.additional_deposit > 0 && (
              <p className="text-sm text-amber-400">
                Additional deposit needed: ${balanceResult.additional_deposit.toFixed(2)}
              </p>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}
      </div>
    </>
  );
}
