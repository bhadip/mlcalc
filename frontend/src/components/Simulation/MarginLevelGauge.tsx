/**
 * MarginLevelGauge — Visual gauge showing current ML% with color zones.
 * 
 * Zones:
 *   1000%+  = OPTIMAL (green)
 *   500-999% = SAFE (cyan)
 *   200-499% = CAUTION (yellow)
 *   100-199% = DANGER (orange)
 *   <100%   = LIQUIDATION (red)
 */

interface MarginLevelGaugeProps {
  marginLevelPercent?: number;
  stopOutPercent?: number;
  marginCallPercent?: number;
}

export default function MarginLevelGauge({
  marginLevelPercent,
  stopOutPercent = 50,
  marginCallPercent = 100,
}: MarginLevelGaugeProps) {
  if (marginLevelPercent === undefined || marginLevelPercent === null) {
    return (
      <div className="card text-center">
        <p className="text-slate-400">No positions open</p>
        <p className="text-xs text-slate-500 mt-1">Margin Level: N/A</p>
      </div>
    );
  }

  // Determine zone
  const getZone = (ml: number) => {
    if (ml >= 1000) return { label: 'OPTIMAL', color: 'text-emerald-400', bg: 'bg-emerald-500' };
    if (ml >= 500) return { label: 'SAFE', color: 'text-cyan-400', bg: 'bg-cyan-500' };
    if (ml >= 200) return { label: 'CAUTION', color: 'text-amber-400', bg: 'bg-amber-500' };
    if (ml >= 100) return { label: 'DANGER', color: 'text-orange-400', bg: 'bg-orange-500' };
    return { label: 'LIQUIDATION', color: 'text-red-400', bg: 'bg-red-500' };
  };

  const zone = getZone(marginLevelPercent);

  // Calculate gauge fill (logarithmic scale for better visualization)
  const logML = Math.log10(Math.max(marginLevelPercent, 1));
  const logMax = Math.log10(2000); // Max display = 2000%
  const fillPercent = Math.min((logML / logMax) * 100, 100);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-300">Margin Level</h3>
        <span className={`text-xs font-bold px-2 py-1 rounded ${zone.bg}/20 ${zone.color}`}>
          {zone.label}
        </span>
      </div>

      <div className="text-center mb-4">
        <div className={`text-4xl font-bold ${zone.color}`}>
          {marginLevelPercent.toFixed(2)}%
        </div>
      </div>

      {/* Gauge Bar */}
      <div className="relative h-4 bg-slate-700 rounded-full overflow-hidden mb-2">
        <div
          className={`absolute left-0 top-0 h-full ${zone.bg} transition-all duration-500`}
          style={{ width: `${fillPercent}%` }}
        />

        {/* Stop Out marker */}
        {stopOutPercent > 0 && (
          <div
            className="absolute top-0 h-full w-0.5 bg-red-500"
            style={{ left: `${(Math.log10(stopOutPercent) / logMax) * 100}%` }}
            title={`Stop Out: ${stopOutPercent}%`}
          />
        )}

        {/* Margin Call marker */}
        {marginCallPercent > 0 && (
          <div
            className="absolute top-0 h-full w-0.5 bg-amber-500"
            style={{ left: `${(Math.log10(marginCallPercent) / logMax) * 100}%` }}
            title={`Margin Call: ${marginCallPercent}%`}
          />
        )}
      </div>

      {/* Legend */}
      <div className="flex justify-between text-xs text-slate-500">
        <span>0%</span>
        <span className="text-red-400">Stop Out</span>
        <span className="text-amber-400">Margin Call</span>
        <span>2000%+</span>
      </div>
    </div>
  );
}
