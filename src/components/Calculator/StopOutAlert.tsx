/**
 * StopOutAlert — Red warning modal that appears when Balance == Equity.
 * Locks all sliders and controls when triggered.
 */

interface StopOutAlertProps {
  isVisible: boolean;
}

export default function StopOutAlert({ isVisible }: StopOutAlertProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-red-900 border-4 border-red-500 rounded-2xl p-8 max-w-2xl w-full shadow-2xl animate-pulse">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-4xl font-bold text-red-400 mb-4">ACCOUNT STOPPED OUT</h2>
          <p className="text-xl text-red-300 mb-6">
            Credit exhausted — All positions have been liquidated
          </p>
          <div className="bg-red-950 rounded-lg p-4 mb-6">
            <p className="text-red-200 text-sm">
              Your account has reached the stop-out level. Balance equals Equity, meaning all credit
              has been consumed by losses. The broker's liquidation engine has closed all positions.
            </p>
          </div>
          <div className="space-y-2 text-red-300">
            <p className="text-lg font-semibold">All sliders and controls are locked.</p>
            <p className="text-sm">Deposit funds or contact your broker to restore trading.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
