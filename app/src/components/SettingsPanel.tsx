import { useEffect } from 'react';
import {
  BACKGROUNDS,
  PALETTES,
  SOUND_EVENTS,
  SOUND_PRESETS,
  type BackgroundId,
  type PaletteId,
  type SoundEventId,
  type SoundPresetId,
  type UiSettings,
} from '../settings';
import { sounds } from '../sound';

interface SettingsPanelProps {
  open: boolean;
  settings: UiSettings;
  onChange: (next: UiSettings) => void;
  onClose: () => void;
  onReset: () => void;
}

export function SettingsPanel({ open, settings, onChange, onClose, onReset }: SettingsPanelProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const updateEffect = (event: SoundEventId, preset: SoundPresetId) => {
    onChange({ ...settings, effects: { ...settings.effects, [event]: preset } });
    sounds.preview(preset);
  };

  return (
    <div
      className="settings-backdrop"
      onPointerDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="frame settings-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <span className="corner" aria-hidden="true" />
        <header className="settings-header">
          <div>
            <p className="settings-eyebrow">Interface control</p>
            <h2 id="settings-title">Display &amp; audio settings</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Close settings"
            onClick={onClose}
            autoFocus
          >
            ×
          </button>
        </header>

        <div className="settings-grid">
          <fieldset>
            <legend>Color system</legend>
            <div className="palette-options">
              {PALETTES.map((palette) => (
                <button
                  key={palette.id}
                  type="button"
                  className="choice-button"
                  aria-pressed={settings.palette === palette.id}
                  title={palette.description}
                  onPointerEnter={() => sounds.hover()}
                  onClick={() => {
                    onChange({ ...settings, palette: palette.id as PaletteId });
                    sounds.click();
                  }}
                >
                  <span
                    className={`palette-swatch palette-swatch--${palette.id}`}
                    aria-hidden="true"
                  />
                  {palette.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>Deep-space background</legend>
            <label className="select-label" htmlFor="background-select">
              Scene
            </label>
            <select
              id="background-select"
              value={settings.background}
              onChange={(event) => {
                onChange({ ...settings, background: event.target.value as BackgroundId });
                sounds.select();
              }}
            >
              {BACKGROUNDS.map((background) => (
                <option key={background.id} value={background.id}>
                  {background.label}
                </option>
              ))}
            </select>
          </fieldset>

          <fieldset>
            <legend>Experience</legend>
            <button
              type="button"
              className="switch-row"
              aria-pressed={settings.animations}
              onClick={() => onChange({ ...settings, animations: !settings.animations })}
            >
              <span>Animations</span>
              <span className="switch" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="switch-row"
              aria-pressed={settings.sound}
              onClick={() => onChange({ ...settings, sound: !settings.sound })}
            >
              <span>Audio effects</span>
              <span className="switch" aria-hidden="true" />
            </button>
            <p className="settings-note">
              Sound is on by default and begins after the first browser interaction.
            </p>
          </fieldset>

          <fieldset className="sound-map">
            <legend>Audio effect map</legend>
            <p className="settings-note">
              Every interaction can use a different synthesized cue. Inspiration:{' '}
              <a href="https://glitchy.website/" target="_blank" rel="noreferrer">
                glitchy.website
              </a>
              .
            </p>
            {SOUND_EVENTS.map((soundEvent) => {
              const preset = SOUND_PRESETS.find(({ id }) => id === settings.effects[soundEvent.id])!;
              return (
                <div className="sound-row" key={soundEvent.id}>
                  <label htmlFor={`sound-${soundEvent.id}`}>{soundEvent.label}</label>
                  <select
                    id={`sound-${soundEvent.id}`}
                    value={preset.id}
                    disabled={!settings.sound}
                    onChange={(event) =>
                      updateEffect(soundEvent.id, event.target.value as SoundPresetId)
                    }
                  >
                    {SOUND_PRESETS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {preset.sourceUrl ? (
                    <a href={preset.sourceUrl} target="_blank" rel="noreferrer">
                      {preset.sourceLabel} ↗
                    </a>
                  ) : (
                    <span className="source-placeholder">No sound</span>
                  )}
                </div>
              );
            })}
          </fieldset>
        </div>

        <footer className="settings-actions">
          <button type="button" className="secondary-button" onClick={onReset}>
            Restore defaults
          </button>
          <button type="button" className="primary-button" onClick={onClose}>
            Apply &amp; close
          </button>
        </footer>
      </section>
    </div>
  );
}
