#!/usr/bin/env node
// Experiment: print the actual longevity-escape-velocity numbers computed from
// the committed OWID snapshot, mirroring app/src/analytics.ts. Useful to sanity
// check what the dashboard will display.

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const snapshotPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'app',
  'public',
  'data',
  'life-expectancy.json'
);
const snapshot = JSON.parse(await readFile(snapshotPath, 'utf8'));

const olsSlope = (points) => {
  const n = points.length;
  const my = points.reduce((s, p) => s + p.year, 0) / n;
  const mv = points.reduce((s, p) => s + p.value, 0) / n;
  let cov = 0;
  let variance = 0;
  for (const p of points) {
    cov += (p.year - my) * (p.value - mv);
    variance += (p.year - my) ** 2;
  }
  return variance === 0 ? NaN : cov / variance;
};

const rollingSlope = (points, windowYears) =>
  points
    .map((p) => {
      const window = points.filter((q) => q.year > p.year - windowYears && q.year <= p.year);
      return window.length < 3 ? null : { year: p.year, value: olsSlope(window) };
    })
    .filter(Boolean);

for (const entity of snapshot.entities) {
  const series = snapshot.series[entity].map(([year, value]) => ({ year, value }));
  const v = rollingSlope(series, 10);
  const a = rollingSlope(v, 10);
  const latest = series[series.length - 1];
  const vLatest = v[v.length - 1];
  const aLatest = a[a.length - 1];
  const peak = v.reduce((best, p) => (p.value > best.value ? p : best), v[0]);
  const fit = v.filter((p) => p.year > vLatest.year - 30);
  const trend = olsSlope(fit);
  const eta =
    vLatest.value >= 1
      ? 'REACHED'
      : trend > 1e-6
        ? Math.round(vLatest.year + (1 - vLatest.value) / trend)
        : 'never (trend flat/negative)';
  console.log(
    `${entity.padEnd(15)} e(${latest.year})=${latest.value.toFixed(1)}y  ` +
      `v=${vLatest.value.toFixed(3)} yr/yr (${(vLatest.value * 100).toFixed(1)}% of LEV)  ` +
      `a=${aLatest.value.toFixed(4)}  peak v=${peak.value.toFixed(3)}@${peak.year}  ` +
      `30y trend=${trend.toFixed(5)}/yr  ETA: ${eta}`
  );
}
