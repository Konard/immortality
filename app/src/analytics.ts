// Longevity analytics: derivatives of life expectancy over calendar time.
//
// Definitions used across the dashboard:
//   e(t)  — period life expectancy at birth in calendar year t (years)
//   v(t)  — velocity: de/dt, life-expectancy years gained per calendar year
//   a(t)  — acceleration: dv/dt, change of that velocity per calendar year
//
// Longevity escape velocity (LEV) is the point where v(t) >= 1: every calendar
// year lived adds at least one more year of remaining life expectancy.

export interface Point {
  year: number;
  value: number;
}

export const LEV_THRESHOLD = 1;

export function toPoints(pairs: [number, number][]): Point[] {
  return pairs.map(([year, value]) => ({ year, value }));
}

/**
 * Numerical derivative on a possibly non-uniform year grid.
 * Interior points use the central difference across their neighbours; the two
 * endpoints use one-sided differences. Needs at least 2 points.
 */
export function derivative(points: Point[]): Point[] {
  if (points.length < 2) return [];
  return points.map((p, i) => {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    return { year: p.year, value: (next.value - prev.value) / (next.year - prev.year) };
  });
}

/** Ordinary-least-squares slope of value over year. Needs >= 2 distinct years. */
export function olsSlope(points: Point[]): number {
  const n = points.length;
  const meanYear = points.reduce((s, p) => s + p.year, 0) / n;
  const meanValue = points.reduce((s, p) => s + p.value, 0) / n;
  let cov = 0;
  let variance = 0;
  for (const p of points) {
    cov += (p.year - meanYear) * (p.value - meanValue);
    variance += (p.year - meanYear) ** 2;
  }
  return variance === 0 ? NaN : cov / variance;
}

/**
 * Smoothed derivative: for each point, the OLS slope over the trailing window
 * of `windowYears`. Robust to single-year shocks (wars, pandemics) that make
 * raw year-over-year differences noisy. Points whose trailing window holds
 * fewer than 3 samples are skipped, which naturally drops the sparse
 * pre-1950 part of the historical record.
 */
export function rollingSlope(points: Point[], windowYears: number): Point[] {
  const result: Point[] = [];
  for (let i = 0; i < points.length; i++) {
    const windowStart = points[i].year - windowYears;
    const window = points.filter((p) => p.year > windowStart && p.year <= points[i].year);
    if (window.length < 3) continue;
    result.push({ year: points[i].year, value: olsSlope(window) });
  }
  return result;
}

/** Velocity of life expectancy growth, smoothed over a trailing window. */
export function velocity(series: Point[], windowYears = 10): Point[] {
  return rollingSlope(series, windowYears);
}

/** Acceleration: derivative of the smoothed velocity, smoothed the same way. */
export function acceleration(series: Point[], windowYears = 10): Point[] {
  return rollingSlope(velocity(series, windowYears), windowYears);
}

export interface LevAssessment {
  /** Latest smoothed velocity, in years of life expectancy per calendar year. */
  currentVelocity: number;
  /** Year of the latest observation the assessment is based on. */
  asOfYear: number;
  /** Fraction of the LEV threshold currently reached (0..1+). */
  progress: number;
  /** Trend of the velocity itself over the fit window (per year). */
  velocityTrend: number;
  /** True when the latest velocity already meets the threshold. */
  reached: boolean;
  /**
   * Extrapolated calendar year when velocity reaches the threshold, following
   * the current trend. Null when the trend is flat or negative — on the
   * current trajectory the threshold is never reached.
   */
  etaYear: number | null;
}

/**
 * Assess progress toward longevity escape velocity from a smoothed velocity
 * series: how fast are we, is the velocity itself rising, and if the recent
 * trend holds, when does v(t) cross the threshold?
 */
export function assessLev(
  velocityPoints: Point[],
  fitWindowYears = 30,
  threshold = LEV_THRESHOLD
): LevAssessment | null {
  if (velocityPoints.length === 0) return null;
  const latest = velocityPoints[velocityPoints.length - 1];
  const fitWindow = velocityPoints.filter((p) => p.year > latest.year - fitWindowYears);
  if (fitWindow.length < 3) return null;

  const trend = olsSlope(fitWindow);
  const reached = latest.value >= threshold;
  let etaYear: number | null = null;
  if (reached) {
    etaYear = latest.year;
  } else if (trend > 1e-6) {
    etaYear = Math.round(latest.year + (threshold - latest.value) / trend);
  }

  return {
    currentVelocity: latest.value,
    asOfYear: latest.year,
    progress: Math.max(0, latest.value / threshold),
    velocityTrend: trend,
    reached,
    etaYear,
  };
}
