import { describe, expect, it } from 'vitest';
import {
  acceleration,
  assessLev,
  derivative,
  olsSlope,
  rollingSlope,
  toPoints,
  velocity,
  type Point,
} from './analytics';

function linearSeries(startYear: number, endYear: number, intercept: number, slope: number): Point[] {
  const points: Point[] = [];
  for (let year = startYear; year <= endYear; year++) {
    points.push({ year, value: intercept + slope * (year - startYear) });
  }
  return points;
}

describe('toPoints', () => {
  it('converts [year, value] pairs', () => {
    expect(toPoints([[1950, 46.4]])).toEqual([{ year: 1950, value: 46.4 }]);
  });
});

describe('derivative', () => {
  it('returns the exact slope for a linear series', () => {
    const points = linearSeries(2000, 2010, 70, 0.25);
    for (const p of derivative(points)) {
      expect(p.value).toBeCloseTo(0.25, 10);
    }
  });

  it('handles non-uniform year spacing (sparse historical data)', () => {
    // e(t) = t / 10 sampled at irregular years still has slope 0.1 everywhere.
    const points: Point[] = [1770, 1800, 1820, 1900, 1950, 1951].map((year) => ({
      year,
      value: year / 10,
    }));
    for (const p of derivative(points)) {
      expect(p.value).toBeCloseTo(0.1, 10);
    }
  });

  it('approximates the analytic derivative of a quadratic at interior points', () => {
    // e(t) = t^2 → de/dt = 2t; central differences are exact for quadratics.
    const points: Point[] = [];
    for (let year = 0; year <= 10; year++) points.push({ year, value: year * year });
    const d = derivative(points);
    expect(d[5].value).toBeCloseTo(10, 10);
  });

  it('returns an empty array for fewer than 2 points', () => {
    expect(derivative([{ year: 2000, value: 70 }])).toEqual([]);
  });
});

describe('olsSlope', () => {
  it('recovers the slope of a noiseless line', () => {
    expect(olsSlope(linearSeries(1990, 2020, 60, 0.3))).toBeCloseTo(0.3, 10);
  });

  it('averages out symmetric noise', () => {
    const noisy = linearSeries(2000, 2020, 70, 0.2).map((p, i) => ({
      year: p.year,
      value: p.value + (i % 2 === 0 ? 0.5 : -0.5),
    }));
    expect(olsSlope(noisy)).toBeCloseTo(0.2, 1);
  });
});

describe('rollingSlope / velocity', () => {
  it('matches the true slope of a linear series', () => {
    const v = velocity(linearSeries(1950, 2023, 46, 0.3));
    expect(v.length).toBeGreaterThan(0);
    for (const p of v) expect(p.value).toBeCloseTo(0.3, 10);
  });

  it('skips points whose trailing window is too sparse', () => {
    // Decade-spaced points: a 10-year trailing window never holds 3 samples.
    const sparse: Point[] = [1770, 1800, 1820, 1850].map((year) => ({ year, value: 30 }));
    expect(rollingSlope(sparse, 10)).toEqual([]);
  });

  it('absorbs a single-year shock (pandemic-style dip)', () => {
    const series = linearSeries(2000, 2023, 70, 0.2);
    const shocked = series.map((p) => (p.year === 2020 ? { ...p, value: p.value - 1.5 } : p));
    const smoothed = velocity(shocked, 10);
    const raw = derivative(shocked);
    const at2021 = (points: Point[]) => points.find((p) => p.year === 2021)!.value;
    // The raw derivative swings wildly around the dip; the smoothed one stays
    // near the underlying 0.2 trend.
    expect(Math.abs(at2021(raw) - 0.2)).toBeGreaterThan(0.5);
    expect(Math.abs(at2021(smoothed) - 0.2)).toBeLessThan(0.15);
  });
});

describe('acceleration', () => {
  it('is zero for constant velocity', () => {
    for (const p of acceleration(linearSeries(1950, 2023, 46, 0.3))) {
      expect(p.value).toBeCloseTo(0, 8);
    }
  });

  it('is positive for accelerating growth', () => {
    // e(t) quadratic in t → constant positive acceleration.
    const points: Point[] = [];
    for (let year = 1950; year <= 2023; year++) {
      const t = year - 1950;
      points.push({ year, value: 40 + 0.1 * t + 0.002 * t * t });
    }
    const a = acceleration(points);
    expect(a.length).toBeGreaterThan(0);
    for (const p of a) expect(p.value).toBeGreaterThan(0);
  });
});

describe('assessLev', () => {
  it('projects the crossing year when velocity is rising', () => {
    // Velocity rises linearly from 0.2 in 2000 by 0.01/year → hits 1.0 at 2080.
    const v = linearSeries(2000, 2023, 0.2, 0.01);
    const lev = assessLev(v)!;
    expect(lev.reached).toBe(false);
    expect(lev.currentVelocity).toBeCloseTo(0.43, 10);
    expect(lev.velocityTrend).toBeCloseTo(0.01, 10);
    expect(lev.etaYear).toBe(2080);
  });

  it('returns null ETA when velocity is flat or falling', () => {
    const lev = assessLev(linearSeries(2000, 2023, 0.4, -0.005))!;
    expect(lev.reached).toBe(false);
    expect(lev.etaYear).toBeNull();
    expect(lev.velocityTrend).toBeLessThan(0);
  });

  it('reports the threshold as reached when current velocity >= 1', () => {
    const lev = assessLev(linearSeries(2000, 2023, 1.1, 0))!;
    expect(lev.reached).toBe(true);
    expect(lev.etaYear).toBe(2023);
    expect(lev.progress).toBeGreaterThanOrEqual(1);
  });

  it('returns null when there is not enough data', () => {
    expect(assessLev([])).toBeNull();
    expect(assessLev(linearSeries(2000, 2001, 0.2, 0))).toBeNull();
  });
});
