import type { ReactNode } from 'react';
import { Frame } from './Frame';

interface StatTileProps {
  label: string;
  value: string;
  unit?: string;
  hint?: ReactNode;
}

export function StatTile({ label, value, unit, hint }: StatTileProps) {
  return (
    <Frame className="stat-tile">
      <div className="label">{label}</div>
      <div className="value">
        {value}
        {unit && <span className="unit">{unit}</span>}
      </div>
      {hint && <div className="hint">{hint}</div>}
    </Frame>
  );
}
