export const PALETTES = [
  { id: 'mission', label: 'Mission teal', description: 'The original dashboard colors.' },
  { id: 'glitchy', label: 'Glitchy violet', description: 'Violet chrome inspired by glitchy.website.' },
  { id: 'amber', label: 'Solar amber', description: 'Warm high-contrast instrument lighting.' },
  { id: 'monochrome', label: 'Signal mono', description: 'A restrained white and graphite display.' },
] as const;

export const BACKGROUNDS = [
  { id: 'stars', label: 'Deep stars' },
  { id: 'square-grid', label: 'Square grid' },
  { id: 'perspective-grid', label: 'Horizon grid' },
  { id: 'galaxy', label: 'Spiral galaxy' },
  { id: 'planet-orbit', label: 'Planet orbit' },
  { id: 'star-orbit', label: 'Stellar orbit' },
  { id: 'asteroids', label: 'Asteroid field' },
] as const;

const ARWES_BLEEP_SOURCE =
  'https://github.com/arwes/arwes/tree/bdbaa0324900ee978d42036d1304a053c1fe54b5/packages/bleeps';

export const SOUND_PRESETS = [
  { id: 'spark', label: 'Spark', sourceLabel: 'Arwes bleep source', sourceUrl: ARWES_BLEEP_SOURCE },
  {
    id: 'confirm',
    label: 'Confirm',
    sourceLabel: 'glitchy.website reference',
    sourceUrl: 'https://glitchy.website/',
  },
  {
    id: 'transmit',
    label: 'Transmit',
    sourceLabel: 'glitchy.website reference',
    sourceUrl: 'https://glitchy.website/',
  },
  { id: 'scanner', label: 'Scanner', sourceLabel: 'Arwes bleep source', sourceUrl: ARWES_BLEEP_SOURCE },
  { id: 'soft', label: 'Soft tone', sourceLabel: 'Arwes bleep source', sourceUrl: ARWES_BLEEP_SOURCE },
  { id: 'pulse', label: 'Low pulse', sourceLabel: 'Arwes bleep source', sourceUrl: ARWES_BLEEP_SOURCE },
  { id: 'silent', label: 'Silent', sourceLabel: null, sourceUrl: null },
] as const;

export const SOUND_EVENTS = [
  { id: 'hover', label: 'Hover' },
  { id: 'activate', label: 'Buttons' },
  { id: 'select', label: 'Selections' },
  { id: 'scan', label: 'Chart scanner' },
] as const;

export type PaletteId = (typeof PALETTES)[number]['id'];
export type BackgroundId = (typeof BACKGROUNDS)[number]['id'];
export type SoundPresetId = (typeof SOUND_PRESETS)[number]['id'];
export type SoundEventId = (typeof SOUND_EVENTS)[number]['id'];

export type SoundEffects = Record<SoundEventId, SoundPresetId>;

export interface UiSettings {
  palette: PaletteId;
  background: BackgroundId;
  animations: boolean;
  sound: boolean;
  effects: SoundEffects;
}

export const SETTINGS_STORAGE_KEY = 'immortality.ui-settings.v1';

export const DEFAULT_SETTINGS: UiSettings = {
  palette: 'mission',
  background: 'stars',
  animations: true,
  sound: true,
  effects: {
    hover: 'spark',
    activate: 'confirm',
    select: 'transmit',
    scan: 'scanner',
  },
};

const paletteIds = new Set<string>(PALETTES.map(({ id }) => id));
const backgroundIds = new Set<string>(BACKGROUNDS.map(({ id }) => id));
const soundPresetIds = new Set<string>(SOUND_PRESETS.map(({ id }) => id));

/** Safely upgrades a persisted, potentially stale settings object. */
export function parseStoredSettings(raw: string | null): UiSettings {
  if (!raw) return DEFAULT_SETTINGS;

  try {
    const saved = JSON.parse(raw) as Record<string, unknown>;
    const savedEffects =
      saved.effects && typeof saved.effects === 'object'
        ? (saved.effects as Record<string, unknown>)
        : {};
    const effects = { ...DEFAULT_SETTINGS.effects };

    for (const { id } of SOUND_EVENTS) {
      const value = savedEffects[id];
      if (typeof value === 'string' && soundPresetIds.has(value)) {
        effects[id] = value as SoundPresetId;
      }
    }

    return {
      palette:
        typeof saved.palette === 'string' && paletteIds.has(saved.palette)
          ? (saved.palette as PaletteId)
          : DEFAULT_SETTINGS.palette,
      background:
        typeof saved.background === 'string' && backgroundIds.has(saved.background)
          ? (saved.background as BackgroundId)
          : DEFAULT_SETTINGS.background,
      animations:
        typeof saved.animations === 'boolean' ? saved.animations : DEFAULT_SETTINGS.animations,
      sound: typeof saved.sound === 'boolean' ? saved.sound : DEFAULT_SETTINGS.sound,
      effects,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
