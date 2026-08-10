export interface Snapshot {
  source: string;
  sourceUrl: string;
  fetchedAt: string;
  entities: string[];
  series: Record<string, [number, number][]>;
}

export interface RangePreset {
  id: string;
  label: string;
  /** Inclusive first year to display, given the latest year in the data. */
  fromYear: (latestYear: number) => number;
}

export const RANGE_PRESETS: RangePreset[] = [
  { id: 'all', label: 'Full record', fromYear: () => -Infinity },
  { id: '1900', label: 'Since 1900', fromYear: () => 1900 },
  { id: '1950', label: 'Since 1950', fromYear: () => 1950 },
  { id: 'last50', label: 'Last 50 years', fromYear: (latest) => latest - 50 },
];
