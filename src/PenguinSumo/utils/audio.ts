// Penguin Sumo audio — taiko-flavored synth BGM + sumo-themed SFX. The
// game-loop dispatches its own SfxKey set: charge / burst / bonk / ko / tick /
// cheer / win / fail.

type SfxKey = 'charge' | 'burst' | 'bonk' | 'ko' | 'yelp' | 'tick' | 'cheer' | 'win' | 'fail';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let bgmGain: GainNode | null = null;
let bgmFx: GainNode | null = null;
let bgmTimer: number | null = null;

function ensureCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC: typeof AudioContext | undefined =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.7;
    master.connect(ctx.destination);
  }
  return ctx;
}

export async function unlockAudio() {
  const c = ensureCtx();
  if (c && c.state === 'suspended') await c.resume();
}

function envelope(node: GainNode, peak: number, attack: number, decay: number, t0: number) {
  node.gain.setValueAtTime(0, t0);
  node.gain.linearRampToValueAtTime(peak, t0 + attack);
  node.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
}

function tone(freq: number, type: OscillatorType, dur: number, peak: number, t0: number, glideTo?: number, dst?: AudioNode) {
  if (!ctx || !master) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (glideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, glideTo), t0 + dur);
  envelope(g, peak, 0.01, dur, t0);
  osc.connect(g).connect(dst ?? master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noise(dur: number, peak: number, t0: number, lp = 2000, dst?: AudioNode) {
  if (!ctx || !master) return;
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filt = ctx.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.value = lp;
  const g = ctx.createGain();
  envelope(g, peak, 0.005, dur, t0);
  src.connect(filt).connect(g).connect(dst ?? master);
  src.start(t0);
  src.stop(t0 + dur + 0.05);
}

// Taiko drum hit — short sub-thump + transient noise. Doubles as the BGM kick.
function taiko(t: number, peak = 0.5, freq = 90, dst?: AudioNode) {
  if (!ctx || !master) return;
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(freq * 0.4, t + 0.18);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0008, t + 0.30);
  o.connect(g).connect(dst ?? master);
  o.start(t);
  o.stop(t + 0.32);
  noise(0.020, peak * 0.35, t, 3000, dst);
}

export function playSfx(key: SfxKey) {
  const c = ensureCtx();
  if (!c || !master) return;
  if (c.state === 'suspended') c.resume();
  const t = c.currentTime;
  switch (key) {
    case 'charge':
      // Rising sweep — "engine spinning up"
      tone(220, 'sawtooth', 0.30, 0.18, t, 520);
      break;
    case 'burst':
      // Whoosh release — saw sweep down + noise tail
      tone(640, 'sawtooth', 0.18, 0.30, t, 180);
      noise(0.22, 0.18, t, 2400);
      break;
    case 'bonk':
      // Body slam — fat taiko + crunch
      taiko(t, 0.55, 110);
      noise(0.10, 0.22, t, 1400);
      tone(180, 'square', 0.10, 0.18, t + 0.01, 60);
      break;
    case 'ko':
      // SPLASH ring-out — descending whoosh + low thud
      tone(800, 'sawtooth', 0.30, 0.20, t, 120);
      noise(0.35, 0.30, t, 1800);
      tone(70, 'sine', 0.40, 0.30, t + 0.04, 40);
      break;
    case 'yelp':
      // "AYE!" cartoon yelp — fast rise then dip, slight pitch jitter so
      // consecutive yelps in a multi-KO don't sound identical
      {
        const base = 480 + Math.random() * 160;
        tone(base, 'square', 0.05, 0.16, t, base * 1.9);
        tone(base * 1.9, 'square', 0.12, 0.14, t + 0.05, base * 0.85);
        // a small breath/raspy tail
        noise(0.10, 0.06, t + 0.05, 2400);
      }
      break;
    case 'tick':
      tone(2200, 'square', 0.04, 0.10, t, 2200);
      break;
    case 'cheer':
      tone(880, 'triangle', 0.10, 0.20, t, 1320);
      tone(1320, 'triangle', 0.16, 0.22, t + 0.06, 1760);
      tone(1760, 'triangle', 0.20, 0.20, t + 0.14, 2200);
      break;
    case 'win':
      tone(440, 'triangle', 0.22, 0.30, t,        660);
      tone(660, 'triangle', 0.22, 0.30, t + 0.20, 880);
      tone(880, 'triangle', 0.40, 0.30, t + 0.40, 1320);
      taiko(t + 0.5, 0.7, 80);
      break;
    case 'fail':
      tone(660, 'triangle', 0.30, 0.22, t,          440);
      tone(440, 'triangle', 0.30, 0.22, t + 0.22,   330);
      tone(330, 'triangle', 0.50, 0.22, t + 0.44,   180);
      taiko(t + 0.7, 0.4, 60);
      break;
  }
}

// BGM — taiko-flavored bouncy loop. 110 BPM, 16th-note grid, 16-step phrase.
// I — VI — IV — V across 4 bars. Festival vibe, kept under SFX threshold.

const BGM_BPM = 110;
const STEP_T = 60 / BGM_BPM / 4;
const BAR = 16;
const PHRASE_BARS = 4;
const ROOT_MIDI = 50; // D3

const MELODY: number[] = [
  // bar 1 — D walks up
   0, -1,  4, -1,  7, -1,  4, -1,   9, -1,  7,  4,  2, -1, -1, -1,
  // bar 2 — Bm
   2, -1,  7, -1, 12, -1,  9, -1,   7, -1, 12,  9,  7, -1, -1, -1,
  // bar 3 — G
   5, -1,  9, -1, 12, -1,  9, -1,  14, -1, 12,  9,  5, -1, -1, -1,
  // bar 4 — A (V) → resolve
   7, -1, 11, -1, 14, -1, 11, -1,   9,  7,  5,  4,  2,  0, -1, -1,
];

const BASS_PATTERN: { step: number; smOffset: number }[] = [
  { step: 0,  smOffset: 0 },  { step: 8,  smOffset: 0 },
  { step: 16, smOffset: -3 }, { step: 24, smOffset: -3 },
  { step: 32, smOffset: -7 }, { step: 40, smOffset: -7 },
  { step: 48, smOffset: -5 }, { step: 56, smOffset: -5 },
];

let bgmRunning = false;
let bgmNextStepT = 0;
let bgmStep = 0;
let bgmPeak = 0.07;

function midiToHz(sm: number): number {
  return 440 * Math.pow(2, (ROOT_MIDI + sm - 69) / 12);
}

function pluckMarimba(freq: number, t: number, dur: number, peak: number, dst?: AudioNode) {
  if (!ctx || !bgmGain) return;
  const dest = dst ?? bgmGain;
  const o1 = ctx.createOscillator();
  o1.type = 'triangle';
  o1.frequency.setValueAtTime(freq, t);
  const o2 = ctx.createOscillator();
  o2.type = 'sine';
  o2.frequency.setValueAtTime(freq * 2, t);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  const g2 = ctx.createGain();
  g2.gain.value = 0.30;
  o1.connect(g);
  o2.connect(g2).connect(g);
  g.connect(dest);
  o1.start(t); o1.stop(t + dur + 0.05);
  o2.start(t); o2.stop(t + dur + 0.05);
}

function bassSine(freq: number, t: number, dur: number, peak: number) {
  if (!ctx || !bgmGain) return;
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(freq * 1.03, t);
  o.frequency.exponentialRampToValueAtTime(freq, t + 0.05);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0006, t + dur);
  o.connect(g).connect(bgmGain);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function chat(t: number, peak: number, dst?: AudioNode) {
  if (!ctx || !master) return;
  const buf = ctx.createBuffer(1, Math.max(1, Math.ceil(ctx.sampleRate * 0.025)), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filt = ctx.createBiquadFilter();
  filt.type = 'bandpass';
  filt.frequency.value = 7500;
  filt.Q.value = 1.0;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.001);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);
  src.connect(filt).connect(g).connect(dst ?? master);
  src.start(t);
  src.stop(t + 0.045);
}

function scheduleBgmAhead() {
  if (!ctx || !bgmRunning || !bgmGain || !bgmFx) return;
  const horizon = ctx.currentTime + 0.4;
  while (bgmNextStepT < horizon) {
    const stepInPhrase = bgmStep % (BAR * PHRASE_BARS);
    const stepInBar = bgmStep % BAR;
    const t = bgmNextStepT;

    // Taiko on beats 1 & 3
    if (stepInBar === 0 || stepInBar === 8) {
      taiko(t, bgmPeak * 3.5, stepInBar === 0 ? 95 : 80, bgmGain);
    }
    // Soft kick on beats 2 & 4
    if (stepInBar === 4 || stepInBar === 12) {
      taiko(t, bgmPeak * 1.6, 110, bgmGain);
    }

    const note = MELODY[stepInPhrase];
    if (note >= 0) {
      pluckMarimba(midiToHz(note + 24), t, STEP_T * 2.4, bgmPeak * 1.1);
      pluckMarimba(midiToHz(note + 24), t, STEP_T * 1.8, bgmPeak * 0.35, bgmFx);
    }

    const bs = BASS_PATTERN.find(x => x.step === stepInPhrase);
    if (bs) {
      bassSine(midiToHz(bs.smOffset), t, STEP_T * 3.6, bgmPeak * 1.0);
    }

    if (stepInBar % 2 === 1) {
      chat(t, bgmPeak * 0.55, bgmFx);
    }

    bgmNextStepT += STEP_T;
    bgmStep++;
  }
}

export function startBgm(volume = 0.07) {
  const c = ensureCtx();
  if (!c || !master) return;
  if (c.state === 'suspended') c.resume();
  stopBgm();

  bgmGain = c.createGain();
  bgmGain.gain.value = 0;
  bgmGain.connect(master);
  bgmGain.gain.linearRampToValueAtTime(volume, c.currentTime + 1.2);

  bgmFx = c.createGain();
  const delay = c.createDelay(0.6);
  delay.delayTime.value = 0.20;
  const fb = c.createGain();
  fb.gain.value = 0.28;
  const wet = c.createGain();
  wet.gain.value = 0.55;
  bgmFx.connect(delay);
  delay.connect(fb);
  fb.connect(delay);
  delay.connect(wet);
  wet.connect(bgmGain);

  bgmPeak = volume;
  bgmRunning = true;
  bgmStep = 0;
  bgmNextStepT = c.currentTime + 0.05;

  bgmTimer = window.setInterval(() => scheduleBgmAhead(), 220) as unknown as number;
  scheduleBgmAhead();
}

export function stopBgm() {
  bgmRunning = false;
  if (bgmTimer !== null) { window.clearInterval(bgmTimer); bgmTimer = null; }
  if (bgmGain && ctx) {
    bgmGain.gain.cancelScheduledValues(ctx.currentTime);
    bgmGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
    const g = bgmGain;
    const fx = bgmFx;
    setTimeout(() => {
      g.disconnect();
      if (fx) fx.disconnect();
    }, 700);
    bgmGain = null;
    bgmFx = null;
  }
}
