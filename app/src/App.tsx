import { useEffect, useMemo, useState } from 'react';
import {
  acceleration,
  assessLev,
  toPoints,
  velocity,
  LEV_THRESHOLD,
  type Point,
} from './analytics';
import { RANGE_PRESETS, type Snapshot } from './types';
import { sounds } from './sound';
import { Starfield } from './components/Starfield';
import { Frame } from './components/Frame';
import { Gauge } from './components/Gauge';
import { StatTile } from './components/StatTile';
import { LineChart } from './components/LineChart';
import { DataTable } from './components/DataTable';

const SMOOTH_WINDOW = 10;

const inRange = (points: Point[], fromYear: number) => points.filter((p) => p.year >= fromYear);

export default function App() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [entity, setEntity] = useState('World');
  const [rangeId, setRangeId] = useState('all');
  const [soundOn, setSoundOn] = useState(false);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/life-expectancy.json`)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<Snapshot>;
      })
      .then(setSnapshot)
      .catch((error: unknown) => setLoadError(String(error)));
  }, []);

  const analysis = useMemo(() => {
    if (!snapshot) return null;
    const series = toPoints(snapshot.series[entity] ?? []);
    const v = velocity(series, SMOOTH_WINDOW);
    const a = acceleration(series, SMOOTH_WINDOW);
    const lev = assessLev(v);
    const peak = v.length > 0 ? v.reduce((best, p) => (p.value > best.value ? p : best)) : null;
    return { series, v, a, lev, peak };
  }, [snapshot, entity]);

  if (loadError) {
    return (
      <div className="layout">
        <p className="load-error">Data link failure — {loadError}</p>
      </div>
    );
  }
  if (!snapshot || !analysis) {
    return (
      <div className="layout">
        <Starfield />
        <p className="loading">Establishing data link…</p>
      </div>
    );
  }

  const { series, v, a, lev, peak } = analysis;
  const latestYear = series.length > 0 ? series[series.length - 1].year : 0;
  const preset = RANGE_PRESETS.find((r) => r.id === rangeId) ?? RANGE_PRESETS[0];
  const fromYear = preset.fromYear(latestYear);
  const latest = series[series.length - 1];

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    sounds.setEnabled(next);
  };

  return (
    <>
      <Starfield />
      <div className="layout">
        <header className="masthead">
          <div>
            <h1>Immortality</h1>
            <p className="subtitle">Longevity escape velocity monitor · mission year {latestYear}</p>
          </div>
          <button
            type="button"
            className="sound-toggle"
            aria-pressed={soundOn}
            onPointerEnter={() => sounds.hover()}
            onClick={toggleSound}
          >
            {soundOn ? '♪ Sound on' : '♪ Sound off'}
          </button>
        </header>

        {/* One filter row scoping everything below it */}
        <div className="filters" role="group" aria-label="Data filters">
          <label htmlFor="entity-select">Entity</label>
          <select
            id="entity-select"
            value={entity}
            onPointerEnter={() => sounds.hover()}
            onChange={(event) => {
              setEntity(event.target.value);
              sounds.select();
            }}
          >
            {snapshot.entities.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <label id="range-label">Range</label>
          <div className="range-group" role="group" aria-labelledby="range-label">
            {RANGE_PRESETS.map((r) => (
              <button
                key={r.id}
                type="button"
                aria-pressed={r.id === rangeId}
                onPointerEnter={() => sounds.hover()}
                onClick={() => {
                  setRangeId(r.id);
                  sounds.click();
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="hero">
          <Gauge entity={entity} lev={lev} />
          <StatTile
            label="Life expectancy"
            value={latest ? latest.value.toFixed(1) : '—'}
            unit="years"
            hint={latest ? `at birth, ${latest.year}` : undefined}
          />
          <StatTile
            label="Velocity"
            value={lev ? lev.currentVelocity.toFixed(3) : '—'}
            unit="yr / yr"
            hint={`${SMOOTH_WINDOW}-year smoothed`}
          />
          <StatTile
            label="Velocity trend"
            value={lev ? `${lev.velocityTrend >= 0 ? '+' : ''}${lev.velocityTrend.toFixed(4)}` : '—'}
            unit="yr / yr²"
            hint={
              lev ? (
                <span className={lev.velocityTrend >= 0 ? 'delta-up' : 'delta-down'}>
                  {lev.velocityTrend >= 0 ? '▲ accelerating' : '▼ decelerating'} (30-yr fit)
                </span>
              ) : undefined
            }
          />
          <StatTile
            label="ETA to escape velocity"
            value={lev?.reached ? 'Reached' : lev?.etaYear ? String(lev.etaYear) : 'Never'}
            hint={
              lev?.reached
                ? 'threshold crossed'
                : lev?.etaYear
                  ? 'if the current trend holds'
                  : 'on the current trajectory'
            }
          />
        </div>

        <LineChart
          title="Life expectancy"
          subtitle={`${entity} — period life expectancy at birth, years`}
          points={inRange(series, fromYear)}
          unit="years"
          precision={1}
        />

        <LineChart
          title="Velocity"
          subtitle={`${entity} — life-expectancy years gained per calendar year (${SMOOTH_WINDOW}-year smoothed)`}
          points={inRange(v, fromYear)}
          unit="yr / yr"
          precision={2}
          threshold={{ value: LEV_THRESHOLD, label: 'Escape velocity' }}
          zeroLine
          yClamp={[-2, 2.4]}
        />

        <LineChart
          title="Acceleration"
          subtitle={`${entity} — change of that velocity per year (${SMOOTH_WINDOW}-year smoothed)`}
          points={inRange(a, fromYear)}
          unit="yr / yr²"
          precision={3}
          zeroLine
          yClamp={[-1.2, 1.2]}
        />

        <Frame title="Mission assessment" className="verdict">
          {lev && latest && peak ? (
            <>
              <p>
                <strong>{entity}</strong> gains life expectancy at{' '}
                <strong>
                  {lev.currentVelocity.toFixed(3)} years per year — {(lev.progress * 100).toFixed(1)}
                  % of escape velocity
                </strong>{' '}
                (the point where each calendar year lived adds a full year of life expectancy, so
                remaining life expectancy stops shrinking).
              </p>
              <p>
                Velocity peaked at <strong>{peak.value.toFixed(2)} yr / yr around {peak.year}</strong>
                {' '}— the era of antibiotics, vaccines and falling child mortality — and the 30-year
                trend is currently{' '}
                <strong>
                  {lev.velocityTrend >= 0 ? 'positive' : 'negative'} (
                  {lev.velocityTrend >= 0 ? '+' : ''}
                  {lev.velocityTrend.toFixed(4)} yr / yr per year)
                </strong>
                .{' '}
                {lev.reached
                  ? 'Escape velocity is currently met — an extraordinary, likely transient, artifact of rebound years.'
                  : lev.etaYear
                    ? `If that trend simply continued, the threshold would be crossed around ${lev.etaYear}.`
                    : 'Extrapolated forward, that trend never crosses the threshold: on the current demographic trajectory, escape velocity is not being approached.'}
              </p>
              <p>
                Honest caveat: this instrument measures <strong>period life expectancy</strong> —
                the mortality of the present, not a forecast. Breakthroughs in aging biology
                (senolytics, partial reprogramming, gene therapy) would only register here once they
                measurably cut death rates at scale. The gauge tells us where we are, not what is
                about to be invented.
              </p>
            </>
          ) : (
            <p>Not enough data to assess this entity.</p>
          )}
        </Frame>

        <DataTable
          entity={entity}
          series={inRange(series, fromYear)}
          velocity={inRange(v, fromYear)}
          acceleration={inRange(a, fromYear)}
        />

        <Frame title="Methodology" className="methodology">
          <details className="panel-details">
            <summary>How these numbers are computed</summary>
            <ul>
              <li>
                <strong>Source:</strong>{' '}
                <a href={snapshot.sourceUrl} target="_blank" rel="noreferrer">
                  {snapshot.source}
                </a>{' '}
                (UN World Population Prospects; long-run historical estimates via Our World in
                Data). Snapshot fetched {new Date(snapshot.fetchedAt).toISOString().slice(0, 10)};
                refreshed automatically on every deployment.
              </li>
              <li>
                <strong>Velocity</strong> v(t) = de/dt: the slope of an ordinary-least-squares fit
                over a trailing {SMOOTH_WINDOW}-year window, which absorbs single-year shocks (wars,
                pandemics) that make raw year-over-year differences unreadable.
              </li>
              <li>
                <strong>Acceleration</strong> a(t) = dv/dt: the same trailing-window slope applied
                to the velocity series.
              </li>
              <li>
                <strong>Escape velocity:</strong> v(t) ≥ {LEV_THRESHOLD} year of life expectancy per
                calendar year. The ETA extrapolates the 30-year linear trend of the velocity; it is
                a trajectory readout, not a prophecy.
              </li>
              <li>
                <strong>Limitation:</strong> period life expectancy summarizes current death rates.
                A true immortality probability would need cohort projections and biological-aging
                biomarkers — this dashboard deliberately sticks to what is actually measured today.
              </li>
            </ul>
          </details>
        </Frame>

        <footer className="site-footer">
          <p>
            Data: <a href="https://ourworldindata.org/life-expectancy">Our World in Data</a> ·
            Source code: <a href="https://github.com/konard/immortality">konard/immortality</a> · UI
            inspired by <a href="https://arwes.dev">Arwes</a> and{' '}
            <a href="https://github.com/educlopez/thegridcn-ui">thegridcn-ui</a>
          </p>
        </footer>
      </div>
    </>
  );
}
