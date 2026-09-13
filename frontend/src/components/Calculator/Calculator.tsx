/**
 * Calculator — Main interactive calculator with sliders and risk simulation.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import ScreenshotUpload from '../ScreenshotUpload/ScreenshotUpload';
import MarginGauge from './MarginGauge';
import StopOutAlert from './StopOutAlert';
import { simulationsApi } from '@/api/client';
import type { Position, LiquidationPriceResponse, BalanceAdjustmentResponse } from '@/types';
import { Upload, Edit3, Calculator, AlertTriangle, TrendingDown, DollarSign } from 'lucide-react';

interface AccountData {
  balance: number;
  equity: number;
  margin: number;
  credit: number;
  positions: Position[];
}

export default function Calculator() {
  const [accountData, setAccountData] = useState<AccountData>({
    balance: 10000,
    equity: 10500,
    margin: 1000,
    credit: 500,
    positions: [
      {
        symbol: 'EURUSD',
        type: 'buy',
        volume: 1.0,
        open_price: 1.085,
        current_price: 1.0875,
      },
    ],
  });

  const [activeTab, setActiveTab] = useState<'upload' | 'manual'>('manual');
  const [currentPrice, setCurrentPrice] = useState(1.0875);
  const [balanceAdjustment, setBalanceAdjustment] = useState(0);
  const [liquidationResult, setLiquidationResult] = useState<LiquidationPriceResponse | null>(null);
  const [balanceResult, setBalanceResult] = useState<BalanceAdjustmentResponse | null>(null);
  const [isStoppedOut, setIsStoppedOut] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isInitialMount = useRef(true);

  // Check for STOPPED OUT condition
  useEffect(() => {
    const equity = accountData.balance + accountData.credit;
    const stopped = Math.abs(accountData.balance - equity) < 0.01 && accountData.credit === 0;
    setIsStoppedOut(stopped);
  }, [accountData.balance, accountData.credit]);

  // Calculate liquidation price
  const calculateLiquidation = useCallback(async () => {
    if (isStoppedOut || accountData.positions.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const response = await simulationsApi.liquidationPrice({
        balance: accountData.balance,
        credit: accountData.credit,
        used_margin: accountData.margin,
        positions: accountData.positions.map((p) => ({
          symbol: p.symbol,
          type: p.type,
          volume: p.volume,
          open_price: p.open_price,
          current_price: currentPrice,
        })),
      });

      setLiquidationResult(response.data);

      if (response.data.is_stopped_out) {
        setIsStoppedOut(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Calculation failed');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountData.balance, accountData.credit, accountData.margin, accountData.positions.length, currentPrice, isStoppedOut]);

  // Calculate balance adjustment
  const calculateBalanceAdjustment = useCallback(async () => {
    if (isStoppedOut || accountData.positions.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const targetPrice = accountData.positions[0].open_price * 0.95; // 5% adverse move
      const response = await simulationsApi.balanceAdjustment({
        balance: accountData.balance + balanceAdjustment,
        credit: accountData.credit,
        used_margin: accountData.margin,
        target_price: targetPrice,
        positions: accountData.positions.map((p) => ({
          symbol: p.symbol,
          type: p.type,
          volume: p.volume,
          open_price: p.open_price,
          current_price: currentPrice,
        })),
      });

      setBalanceResult(response.data);

      if (response.data.is_stopped_out) {
        setIsStoppedOut(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Calculation failed');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountData.balance, accountData.credit, accountData.margin, accountData.positions.length, currentPrice, balanceAdjustment, isStoppedOut]);

  // Auto-calculate on slider changes only (not on function reference changes)
  useEffect(() => {
    // Skip initial mount to prevent render storm
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    if (accountData.positions.length > 0 && !isStoppedOut) {
      calculateLiquidation();
      calculateBalanceAdjustment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPrice, balanceAdjustment]);

  // Handle screenshot upload
  const handleScreenshotUpload = useCallback((data: any) => {
    if (data.extracted_data) {
      const extracted = data.extracted_data;
      setAccountData({
        balance: extracted.balance || 0,
        equity: extracted.equity || 0,
        margin: extracted.margin || 0,
        credit: extracted.credit || 0,
        positions: extracted.positions || [],
      });

      if (extracted.positions && extracted.positions.length > 0) {
        setCurrentPrice(extracted.positions[0].current_price || extracted.positions[0].open_price);
      }
    }
  }, []);

  // Handle manual entry
  const handleManualEntry = (data: AccountData) => {
    setAccountData(data);
    if (data.positions.length > 0) {
      setCurrentPrice(data.positions[0].current_price || data.positions[0].open_price);
    }
  };

  // Update position
  const updatePosition = (index: number, field: keyof Position, value: any) => {
    const updated = [...accountData.positions];
    updated[index] = { ...updated[index], [field]: value };
    setAccountData({ ...accountData, positions: updated });
  };

  // Add position
  const addPosition = () => {
    setAccountData({
      ...accountData,
      positions: [
        ...accountData.positions,
        {
          symbol: 'EURUSD',
          type: 'buy',
          volume: 0.1,
          open_price: 1.085,
          current_price: 1.085,
        },
      ],
    });
  };

  // Remove position
  const removePosition = (index: number) => {
    setAccountData({
      ...accountData,
      positions: accountData.positions.filter((_, i) => i !== index),
    });
  };

  return (
    <>
      {/* STOPPED OUT Alert */}
      <StopOutAlert isVisible={isStoppedOut} />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">MLCalc</h1>
          <p className="text-slate-400">Margin Level Calculator</p>
        </div>

        {/* Margin Level Gauge */}
        {liquidationResult && (
          <div className="mb-8">
            <MarginGauge
              marginLevel={liquidationResult.margin_level_percent || 0}
              isStoppedOut={isStoppedOut}
            />
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
              activeTab === 'upload'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <Upload className="w-5 h-5" />
            Upload Screenshot
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
              activeTab === 'manual'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <Edit3 className="w-5 h-5" />
            Manual Entry
          </button>
        </div>

        {/* Data Input Section */}
        <div className="bg-slate-800 rounded-xl p-6 mb-8 shadow-2xl border border-slate-700">
          {activeTab === 'upload' ? (
            <ScreenshotUpload onUploadComplete={handleScreenshotUpload} />
          ) : (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-blue-400" />
                Account Data
              </h3>

              {/* Account Summary */}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Balance ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={accountData.balance}
                    onChange={(e) =>
                      setAccountData({ ...accountData, balance: parseFloat(e.target.value) || 0 })
                    }
                    disabled={isStoppedOut}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Credit ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={accountData.credit}
                    onChange={(e) =>
                      setAccountData({ ...accountData, credit: parseFloat(e.target.value) || 0 })
                    }
                    disabled={isStoppedOut}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Used Margin ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={accountData.margin}
                    onChange={(e) =>
                      setAccountData({ ...accountData, margin: parseFloat(e.target.value) || 0 })
                    }
                    disabled={isStoppedOut}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Equity ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={accountData.equity}
                    disabled
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-400 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Positions */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-white">Open Positions</h4>
                  <button
                    onClick={addPosition}
                    disabled={isStoppedOut}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    + Add Position
                  </button>
                </div>

                {accountData.positions.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    No positions. Click "Add Position" to start.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {accountData.positions.map((pos, index) => (
                      <div
                        key={index}
                        className="bg-slate-700/50 rounded-lg p-4 border border-slate-600"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-white font-medium">Position #{index + 1}</span>
                          <button
                            onClick={() => removePosition(index)}
                            disabled={isStoppedOut}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-3">
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Symbol</label>
                            <input
                              type="text"
                              value={pos.symbol}
                              onChange={(e) => updatePosition(index, 'symbol', e.target.value)}
                              disabled={isStoppedOut}
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm disabled:opacity-50"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Type</label>
                            <select
                              value={pos.type}
                              onChange={(e) => updatePosition(index, 'type', e.target.value)}
                              disabled={isStoppedOut}
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm disabled:opacity-50"
                            >
                              <option value="buy">Buy</option>
                              <option value="sell">Sell</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Volume (Lots)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={pos.volume}
                              onChange={(e) =>
                                updatePosition(index, 'volume', parseFloat(e.target.value) || 0)
                              }
                              disabled={isStoppedOut}
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm disabled:opacity-50"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Open Price</label>
                            <input
                              type="number"
                              step="0.00001"
                              value={pos.open_price}
                              onChange={(e) =>
                                updatePosition(index, 'open_price', parseFloat(e.target.value) || 0)
                              }
                              disabled={isStoppedOut}
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm disabled:opacity-50"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Current Price</label>
                            <input
                              type="number"
                              step="0.00001"
                              value={pos.current_price}
                              onChange={(e) =>
                                updatePosition(index, 'current_price', parseFloat(e.target.value) || 0)
                              }
                              disabled={isStoppedOut}
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm disabled:opacity-50"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Calculators Section */}
        {accountData.positions.length > 0 && !isStoppedOut && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Liquidation Price Calculator */}
            <div className="bg-slate-800 rounded-xl p-6 shadow-2xl border border-slate-700">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-red-400" />
                Liquidation Price
              </h3>

              {/* Price Slider */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Current Price:{' '}
                  <span className="text-blue-400 font-mono">{currentPrice.toFixed(5)}</span>
                </label>
                <input
                  type="range"
                  min={currentPrice * 0.9}
                  max={currentPrice * 1.1}
                  step={0.00001}
                  value={currentPrice}
                  onChange={(e) => setCurrentPrice(parseFloat(e.target.value))}
                  disabled={isStoppedOut}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>{(currentPrice * 0.9).toFixed(5)}</span>
                  <span>{(currentPrice * 1.1).toFixed(5)}</span>
                </div>
              </div>

              {/* Results */}
              {liquidationResult && (
                <div className="space-y-3">
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <div className="text-sm text-slate-400 mb-1">Liquidation Price</div>
                    <div className="text-2xl font-bold text-red-400 font-mono">
                      {liquidationResult.liquidation_price?.toFixed(5) || 'N/A'}
                    </div>
                  </div>

                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <div className="text-sm text-slate-400 mb-1">Current Margin Level</div>
                    <div className="text-2xl font-bold text-blue-400 font-mono">
                      {liquidationResult.margin_level_percent?.toFixed(2) || 'N/A'}%
                    </div>
                  </div>

                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <div className="text-sm text-slate-400 mb-1">Floating P/L</div>
                    <div
                      className={`text-2xl font-bold font-mono ${
                        (liquidationResult.floating_pl || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      ${(liquidationResult.floating_pl || 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Balance Adjustment Calculator */}
            <div className="bg-slate-800 rounded-xl p-6 shadow-2xl border border-slate-700">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-400" />
                Balance Adjustment
              </h3>

              {/* Balance Slider */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Additional Deposit:{' '}
                  <span className="text-green-400 font-mono">${balanceAdjustment.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={5000}
                  step={100}
                  value={balanceAdjustment}
                  onChange={(e) => setBalanceAdjustment(parseFloat(e.target.value))}
                  disabled={isStoppedOut}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>$0</span>
                  <span>$5,000</span>
                </div>
              </div>

              {/* Results */}
              {balanceResult && (
                <div className="space-y-3">
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <div className="text-sm text-slate-400 mb-1">Required Balance</div>
                    <div className="text-2xl font-bold text-green-400 font-mono">
                      ${balanceResult.balance_required?.toFixed(2) || '0.00'}
                    </div>
                  </div>

                  {balanceResult.additional_deposit && balanceResult.additional_deposit > 0 && (
                    <div className="bg-red-900/30 border border-red-600 rounded-lg p-4">
                      <div className="text-sm text-red-300 mb-1">Additional Deposit Needed</div>
                      <div className="text-2xl font-bold text-red-400 font-mono">
                        ${balanceResult.additional_deposit.toFixed(2)}
                      </div>
                    </div>
                  )}

                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <div className="text-sm text-slate-400 mb-1">Equity at Target</div>
                    <div className="text-2xl font-bold text-blue-400 font-mono">
                      ${balanceResult.equity_at_target?.toFixed(2) || '0.00'}
                    </div>
                  </div>

                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <div className="text-sm text-slate-400 mb-1">Margin Level at Target</div>
                    <div className="text-2xl font-bold text-purple-400 font-mono">
                      {balanceResult.margin_level_at_target?.toFixed(2) || '0.00'}%
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* No Positions Warning */}
        {accountData.positions.length === 0 && !isStoppedOut && (
          <div className="bg-amber-900/30 border border-amber-600 rounded-xl p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
            <p className="text-amber-300 text-lg">
              No positions detected. Upload a screenshot or enter positions manually to see calculations.
            </p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-6 bg-red-900/30 border border-red-600 rounded-lg p-4">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
            Calculating...
          </div>
        )}
      </div>
    </>
  );
}
