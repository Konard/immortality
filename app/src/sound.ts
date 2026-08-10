// Interactive UI bleeps synthesized with the Web Audio API — no audio assets.
// Inspired by the Arwes framework's "bleeps" system. Sound is opt-in: the
// AudioContext is only created after a user gesture (browser autoplay policy),
// and every bleep is gated on the enabled flag.

let ctx: AudioContext | null = null;
let enabled = false;

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

function bleep(spec: BleepSpec): void {
  if (!enabled) return;
  const audio = context();
  if (!audio) return;
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
  setEnabled(value: boolean): void {
    enabled = value;
    if (value) {
      context();
      // Confirmation sweep so the toggle is immediately audible.
      bleep({ type: 'sine', from: 320, to: 960, duration: 0.22, gain: 0.06 });
    }
  },
  isEnabled(): boolean {
    return enabled;
  },
  /** Soft high tick for hovering interactive elements. */
  hover(): void {
    bleep({ type: 'sine', from: 1400, to: 1250, duration: 0.045, gain: 0.015 });
  },
  /** Confident blip for clicks and selections. */
  click(): void {
    bleep({ type: 'square', from: 880, to: 590, duration: 0.09, gain: 0.03 });
  },
  /** Rising sweep for switching the observed entity. */
  select(): void {
    bleep({ type: 'triangle', from: 440, to: 1180, duration: 0.16, gain: 0.04 });
  },
  /** Low scanning tick for chart crosshair movement (very quiet, throttled). */
  scan(): void {
    bleep({ type: 'sine', from: 980, to: 940, duration: 0.025, gain: 0.008 });
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
