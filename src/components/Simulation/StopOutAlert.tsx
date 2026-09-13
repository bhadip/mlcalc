/**
 * StopOutAlert — CRITICAL component.
 * 
 * Displays a full-screen red modal when the backend returns is_stopped_out=true.
 * Completely locks the UI and disables all sliders/inputs.
 */

import { AlertTriangle, Lock } from 'lucide-react';

interface StopOutAlertProps {
  isStoppedOut: boolean;
  reason?: string;
}

export default function StopOutAlert({ isStoppedOut, reason }: StopOutAlertProps) {
  if (!isStoppedOut) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-danger-700 border-2 border-red-400 rounded-2xl p-8 max-w-md mx-4 shadow-2xl shadow-red-500/50 animate-pulse-danger">
        <div className="flex items-center justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-red-500/30 flex items-center justify-center">
            <AlertTriangle className="w-12 h-12 text-red-300" />
          </div>
        </div>

        <h2 className="text-3xl font-bold text-white text-center mb-4">
          ACCOUNT STOPPED OUT
        </h2>

        <div className="bg-black/40 rounded-lg p-4 mb-6">
          <p className="text-red-200 text-center font-mono text-sm">
            {reason || 'Credit exhausted — all positions liquidated'}
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-red-300 text-sm">
          <Lock className="w-4 h-4" />
          <span>UI Locked — No further calculations available</span>
        </div>

        <div className="mt-6 pt-6 border-t border-red-500/30">
          <p className="text-red-200 text-xs text-center">
            Balance equals Equity. The broker's liquidation engine has closed all positions.
            Deposit funds or contact your broker to restore trading.
          </p>
        </div>
      </div>
    </div>
  );
}
