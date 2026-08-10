import type { LevAssessment } from '../analytics';
import { Frame } from './Frame';

interface GaugeProps {
  entity: string;
  lev: LevAssessment | null;
}

/** Hero figure + meter: how much of longevity escape velocity is reached. */
export function Gauge({ entity, lev }: GaugeProps) {
  if (!lev) {
    return (
      <Frame title="Escape velocity progress" subtitle={entity}>
        <p className="chart-note">Not enough data to assess.</p>
      </Frame>
    );
  }
  const percent = lev.progress * 100;
  const width = Math.max(0, Math.min(100, percent));
  return (
    <Frame
      title="Escape velocity progress"
      subtitle={`${entity} — share of the +1 year / year threshold, as of ${lev.asOfYear}`}
    >
      <div className="hero-number" aria-live="polite">
        {percent.toFixed(1)}
        <span className="unit">% of LEV</span>
      </div>
      <div
        className="meter"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Number(width.toFixed(1))}
        aria-label={`Progress toward longevity escape velocity: ${percent.toFixed(1)} percent`}
      >
        <div className="meter-track">
          <div className="meter-fill" style={{ width: `${width}%` }} />
        </div>
        <div className="meter-scale">
          <span>0</span>
          <span>escape velocity = +1 yr / yr</span>
        </div>
      </div>
    </Frame>
  );
}
