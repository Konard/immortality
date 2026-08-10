import type { Point } from '../analytics';
import { Frame } from './Frame';

interface DataTableProps {
  entity: string;
  series: Point[];
  velocity: Point[];
  acceleration: Point[];
}

const find = (points: Point[], year: number) => points.find((p) => p.year === year);

/** Accessible table twin of the charts — every plotted value, readable without hover. */
export function DataTable({ entity, series, velocity, acceleration }: DataTableProps) {
  return (
    <Frame>
      <details className="panel-details">
        <summary>Data table — {entity}</summary>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Year</th>
                <th scope="col">Life expectancy (years)</th>
                <th scope="col">Velocity (yr / yr)</th>
                <th scope="col">Acceleration (yr / yr²)</th>
              </tr>
            </thead>
            <tbody>
              {[...series].reverse().map((point) => {
                const v = find(velocity, point.year);
                const a = find(acceleration, point.year);
                return (
                  <tr key={point.year}>
                    <td>{point.year}</td>
                    <td>{point.value.toFixed(2)}</td>
                    <td>{v ? v.value.toFixed(3) : '—'}</td>
                    <td>{a ? a.value.toFixed(4) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    </Frame>
  );
}
