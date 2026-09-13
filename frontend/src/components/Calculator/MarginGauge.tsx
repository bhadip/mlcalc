/**
 * MarginGauge — Visual indicator (green/yellow/red) for Margin Level %.
 */

interface MarginGaugeProps {
  marginLevel: number;
  isStoppedOut: boolean;
}

export default function MarginGauge({ marginLevel, isStoppedOut }: MarginGaugeProps) {
  const getColor = () => {
    if (isStoppedOut) return 'bg-red-600';
    if (marginLevel >= 500) return 'bg-green-500';
    if (marginLevel >= 200) return 'bg-yellow-500';
    if (marginLevel >= 100) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getLabel = () => {
    if (isStoppedOut) return 'STOPPED OUT';
    if (marginLevel >= 500) return 'SAFE';
    if (marginLevel >= 200) return 'CAUTION';
    if (marginLevel >= 100) return 'WARNING';
    return 'CRITICAL';
  };

  const getTextColor = () => {
    if (isStoppedOut) return 'text-red-400';
    if (marginLevel >= 500) return 'text-green-400';
    if (marginLevel >= 200) return 'text-yellow-400';
    if (marginLevel >= 100) return 'text-orange-400';
    return 'text-red-400';
  };

  // Calculate gauge width (logarithmic scale for better visualization)
  // Guard against NaN/Infinity
  const safeMarginLevel = Number.isFinite(marginLevel) && marginLevel > 0 ? marginLevel : 0;
  const gaugeWidth = Math.min(Math.max((Math.log10(Math.max(safeMarginLevel, 1)) / Math.log10(1000)) * 100, 0), 100);

  return (
    <div className="bg-slate-800 rounded-xl p-6 shadow-2xl border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-white">Margin Level</h3>
        <span className={`text-sm font-bold px-3 py-1 rounded-full ${getColor()} text-white`}>
          {getLabel()}
        </span>
      </div>

      <div className="mb-4">
        <div className={`text-5xl font-bold ${getTextColor()} font-mono`}>
          {Number.isFinite(marginLevel) ? marginLevel.toFixed(2) : '0.00'}%
        </div>
      </div>

      {/* Gauge Bar */}
      <div className="relative mb-8">
        <div className="w-full h-4 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${getColor()} transition-all duration-500`}
            style={{ width: `${gaugeWidth}%` }}
          />
        </div>

        {/* Markers */}
        <div className="absolute top-6 left-0 right-0 flex justify-between text-xs text-slate-500">
          <span>0%</span>
          <span>100%</span>
          <span>200%</span>
          <span>500%</span>
          <span>1000%+</span>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="bg-red-900/30 rounded-lg p-3 border border-red-600/30">
          <div className="text-xs text-red-300 mb-1">Stop Out</div>
          <div className="text-lg font-bold text-red-400">50%</div>
        </div>
        <div className="bg-yellow-900/30 rounded-lg p-3 border border-yellow-600/30">
          <div className="text-xs text-yellow-300 mb-1">Margin Call</div>
          <div className="text-lg font-bold text-yellow-400">100%</div>
        </div>
        <div className="bg-green-900/30 rounded-lg p-3 border border-green-600/30">
          <div className="text-xs text-green-300 mb-1">Safe Zone</div>
          <div className="text-lg font-bold text-green-400">500%+</div>
        </div>
      </div>
    </div>
  );
}
