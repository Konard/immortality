#!/usr/bin/env node
// Fetches period life expectancy at birth from Our World in Data and writes a
// JSON snapshot consumed by the dashboard. The snapshot is committed to the
// repository so builds never depend on OWID availability; CI re-runs this
// script before every deploy to keep the published site fresh.
//
// Source: https://ourworldindata.org/grapher/life-expectancy
// (UN World Population Prospects; historical estimates by Riley/HMD via OWID)

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CSV_URL =
  'https://ourworldindata.org/grapher/life-expectancy.csv?csvType=full&useColumnShortNames=true';

// Curated set of entities: the world, most-populous countries across regions,
// and the longevity frontier (Japan). Keeps the snapshot small and the
// entity selector meaningful.
const ENTITIES = [
  'World',
  'Japan',
  'United States',
  'China',
  'India',
  'Nigeria',
  'Brazil',
  'Russia',
  'United Kingdom',
  'France',
  'Australia',
];

const OUT_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'public',
  'data',
  'life-expectancy.json'
);

function parseCsv(text) {
  // The OWID grapher CSV quotes fields containing commas (e.g. "Korea, South").
  const rows = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    const fields = [];
    let field = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (quoted) {
        if (ch === '"' && line[i + 1] === '"') {
          field += '"';
          i++;
        } else if (ch === '"') {
          quoted = false;
        } else {
          field += ch;
        }
      } else if (ch === '"') {
        quoted = true;
      } else if (ch === ',') {
        fields.push(field);
        field = '';
      } else {
        field += ch;
      }
    }
    fields.push(field);
    rows.push(fields);
  }
  return rows;
}

async function main() {
  console.log(`Fetching ${CSV_URL}`);
  const response = await fetch(CSV_URL);
  if (!response.ok) {
    throw new Error(`OWID request failed: ${response.status} ${response.statusText}`);
  }
  const csv = await response.text();
  const [header, ...rows] = parseCsv(csv);
  const entityIdx = header.indexOf('entity');
  const yearIdx = header.indexOf('year');
  const valueIdx = header.indexOf('life_expectancy_0');
  if (entityIdx < 0 || yearIdx < 0 || valueIdx < 0) {
    throw new Error(`Unexpected CSV header: ${header.join(',')}`);
  }

  const series = {};
  for (const name of ENTITIES) series[name] = [];
  for (const row of rows) {
    const entity = row[entityIdx];
    if (!(entity in series)) continue;
    const year = Number(row[yearIdx]);
    const value = Number(row[valueIdx]);
    if (!Number.isFinite(year) || !Number.isFinite(value)) continue;
    series[entity].push([year, Number(value.toFixed(4))]);
  }

  for (const [name, points] of Object.entries(series)) {
    if (points.length === 0) {
      throw new Error(`No data found for entity "${name}" — has OWID renamed it?`);
    }
    points.sort((a, b) => a[0] - b[0]);
  }

  const snapshot = {
    source: 'Our World in Data — Life expectancy at birth (period)',
    sourceUrl: 'https://ourworldindata.org/grapher/life-expectancy',
    fetchedAt: new Date().toISOString(),
    entities: ENTITIES,
    series,
  };

  await mkdir(dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(snapshot, null, 1) + '\n');
  const worldPoints = series.World;
  console.log(
    `Wrote ${OUT_PATH}: ${ENTITIES.length} entities, ` +
      `World ${worldPoints[0][0]}–${worldPoints[worldPoints.length - 1][0]} ` +
      `(${worldPoints.length} points)`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
