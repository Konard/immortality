import { describe, expect, it } from 'vitest';
import { sounds } from './sound';
import { DEFAULT_SETTINGS, SOUND_PRESETS, parseStoredSettings } from './settings';

describe('UI settings', () => {
  it('keeps the existing look while enabling sound and motion by default', () => {
    expect(DEFAULT_SETTINGS).toEqual({
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
    });
    expect(sounds.isEnabled()).toBe(true);
  });

  it('provides a direct reference or source link for every audible preset', () => {
    for (const preset of SOUND_PRESETS.filter(({ id }) => id !== 'silent')) {
      expect(preset.sourceUrl).toMatch(/^https:\/\//);
    }
  });

  it('merges a valid saved preference with new defaults', () => {
    expect(parseStoredSettings('{"palette":"glitchy","sound":false}')).toEqual({
      ...DEFAULT_SETTINGS,
      palette: 'glitchy',
      sound: false,
    });
  });

  it('rejects invalid and stale saved values without breaking the UI', () => {
    expect(
      parseStoredSettings(
        '{"palette":"removed","background":"black-hole","animations":"yes",' +
          '"effects":{"hover":"missing","activate":"soft"}}'
      )
    ).toEqual({
      ...DEFAULT_SETTINGS,
      effects: {
        ...DEFAULT_SETTINGS.effects,
        activate: 'soft',
      },
    });
    expect(parseStoredSettings('not-json')).toEqual(DEFAULT_SETTINGS);
  });
});
