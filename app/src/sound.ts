import { DEFAULT_SETTINGS, type SoundEffects, type SoundPresetId } from './settings';

// Interactive UI bleeps synthesized with the Web Audio API — no audio assets,
// tracking, or third-party requests. Audio is enabled by default, but the
// AudioContext remains lazy so browser autoplay policies are respected.

let ctx: AudioContext | null = null;
let enabled = DEFAULT_SETTINGS.sound;
let effects: SoundEffects = { ...DEFAULT_SETTINGS.effects };

function context(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null;
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

interface BleepSpec {
  type: OscillatorType;
  from: number;
  to: number;
  duration: number;
  gain: number;
}

const PRESET_SPECS: Record<SoundPresetId, BleepSpec | null> = {
  spark: { type: 'sine', from: 1400, to: 1250, duration: 0.045, gain: 0.015 },
  confirm: { type: 'square', from: 880, to: 590, duration: 0.09, gain: 0.03 },
  transmit: { type: 'triangle', from: 440, to: 1180, duration: 0.16, gain: 0.04 },
  scanner: { type: 'sine', from: 980, to: 940, duration: 0.025, gain: 0.008 },
  soft: { type: 'sine', from: 520, to: 420, duration: 0.08, gain: 0.018 },
  pulse: { type: 'sine', from: 220, to: 440, duration: 0.14, gain: 0.025 },
  silent: null,
};

function bleep(preset: SoundPresetId): void {
  if (!enabled) return;
  const spec = PRESET_SPECS[preset];
  if (!spec) return;
  const audio = context();
  if (!audio) return;
  if (audio.state === 'suspended') {
    void audio.resume().catch(() => {
      // A later user gesture will retry if this interaction was not eligible.
    });
  }
  const now = audio.currentTime;
  const osc = audio.createOscillator();
  const amp = audio.createGain();
  osc.type = spec.type;
  osc.frequency.setValueAtTime(spec.from, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, spec.to), now + spec.duration);
  amp.gain.setValueAtTime(0.0001, now);
  amp.gain.exponentialRampToValueAtTime(spec.gain, now + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + spec.duration);
  osc.connect(amp).connect(audio.destination);
  osc.start(now);
  osc.stop(now + spec.duration + 0.02);
}

export const sounds = {
  configure(soundEnabled: boolean, soundEffects: SoundEffects): void {
    enabled = soundEnabled;
    effects = { ...soundEffects };
  },
  setEnabled(value: boolean): void {
    enabled = value;
    if (value) bleep('transmit');
  },
  isEnabled(): boolean {
    return enabled;
  },
  preview(preset: SoundPresetId): void {
    bleep(preset);
  },
  hover(): void {
    bleep(effects.hover);
  },
  click(): void {
    bleep(effects.activate);
  },
  select(): void {
    bleep(effects.select);
  },
  scan(): void {
    bleep(effects.scan);
  },
};

let lastScan = 0;
export function throttledScan(): void {
  const now = performance.now();
  if (now - lastScan > 90) {
    lastScan = now;
    sounds.scan();
  }
}
