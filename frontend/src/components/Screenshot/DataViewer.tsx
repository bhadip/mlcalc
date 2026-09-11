/**
 * DataViewer — Displays extracted JSONB data from OCR in an editable table.
 * Allows manual corrections to OCR-extracted values.
 */

import { useState } from 'react';
import { ExtractedAccountData, Position } from '@/types';
import { Edit3, Check, X, AlertTriangle } from 'lucide-react';

interface DataViewerProps {
  data: ExtractedAccountData;
  onDataChange?: (updatedData: ExtractedAccountData) => void;
}

export default function DataViewer({ data, onDataChange }: DataViewerProps) {
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<ExtractedAccountData>(data);

  const handleSave = () => {
    onDataChange?.(editData);
    setEditing(false);
  };

  const handleCancel = () => {
    setEditData(data);
    setEditing(false);
  };

  const currentData = editing ? editData : data;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Edit3 className="w-5 h-5 text-primary-400" />
          Extracted Data
        </h3>

        {!editing ? (
          <button onClick={() => setEditing(true)} className="btn-primary text-sm">
            Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={handleSave} className="btn-primary text-sm flex items-center gap-1">
              <Check className="w-4 h-4" /> Save
            </button>
            <button onClick={handleCancel} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm flex items-center gap-1">
              <X className="w-4 h-4" /> Cancel
            </button>
          </div>
        )}
      </div>

      {/* Validation Status */}
      {!currentData.validation_passed && (
        <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-3 mb-4 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-300 text-sm font-medium">Validation warnings</p>
            <ul className="text-xs text-amber-400/80 mt-1 space-y-1">
              {currentData.validation_errors.map((err, i) => (
                <li key={i}>• {err}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Account Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <DataField label="Balance" value={currentData.balance} editing={editing} onChange={(v) => setEditData({ ...editData, balance: v })} />
        <DataField label="Equity" value={currentData.equity} editing={editing} onChange={(v) => setEditData({ ...editData, equity: v })} />
        <DataField label="Credit" value={currentData.credit} editing={editing} onChange={(v) => setEditData({ ...editData, credit: v })} />
        <DataField label="Margin" value={currentData.margin} editing={editing} onChange={(v) => setEditData({ ...editData, margin: v })} />
        <DataField label="Free Margin" value={currentData.free_margin} editing={editing} onChange={(v) => setEditData({ ...editData, free_margin: v })} />
        <DataField label="Margin Level %" value={currentData.margin_level_percent} editing={editing} onChange={(v) => setEditData({ ...editData, margin_level_percent: v })} />
      </div>

      {/* Positions Table */}
      {currentData.positions.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-slate-300 mb-2">
            Positions ({currentData.positions.length})
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2 px-2 text-slate-400 font-medium">Symbol</th>
                  <th className="text-left py-2 px-2 text-slate-400 font-medium">Type</th>
                  <th className="text-right py-2 px-2 text-slate-400 font-medium">Volume</th>
                  <th className="text-right py-2 px-2 text-slate-400 font-medium">Open</th>
                  <th className="text-right py-2 px-2 text-slate-400 font-medium">Current</th>
                  <th className="text-right py-2 px-2 text-slate-400 font-medium">Profit</th>
                </tr>
              </thead>
              <tbody>
                {currentData.positions.map((pos, i) => (
                  <tr key={i} className="border-b border-slate-800">
                    <td className="py-2 px-2 text-cyan-400 font-mono">{pos.symbol}</td>
                    <td className="py-2 px-2">
                      <span className={pos.type === 'buy' ? 'text-emerald-400' : 'text-red-400'}>
                        {pos.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right font-mono">{pos.volume.toFixed(2)}</td>
                    <td className="py-2 px-2 text-right font-mono">{pos.open_price.toFixed(5)}</td>
                    <td className="py-2 px-2 text-right font-mono">{pos.current_price?.toFixed(5) || '-'}</td>
                    <td className={`py-2 px-2 text-right font-mono ${pos.profit! >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {pos.profit?.toFixed(2) || '0.00'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* OCR Confidence */}
      {currentData.confidence !== undefined && (
        <div className="mt-4 text-xs text-slate-500">
          OCR Confidence: {(currentData.confidence * 100).toFixed(1)}%
        </div>
      )}
    </div>
  );
}

// Editable data field component
function DataField({
  label,
  value,
  editing,
  onChange,
}: {
  label: string;
  value?: number;
  editing: boolean;
  onChange: (v: number) => void;
}) {
  if (editing) {
    return (
      <div>
        <label className="block text-xs text-slate-500 mb-1">{label}</label>
        <input
          type="number"
          step="0.01"
          value={value ?? 0}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white text-sm"
        />
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 rounded-lg p-3">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className="text-white font-mono text-sm">
        {value !== undefined && value !== null ? value.toFixed(2) : '—'}
      </div>
    </div>
  );
}
