// Sound: an effect's cues synthesised into mono samples, seeded like its pixels (same cues and seed, same samples).
// Pure JS: tools/sfx.mjs writes the samples as a WAV.
import { Rng } from './rng.js';

export const SAMPLE_RATE = 22050;
const TAU = Math.PI * 2;
const XFADE = Math.round(0.04 * SAMPLE_RATE); // a sustained sound's fade in and out; round a loop, its ends crossfade
const TAPER = Math.round(0.01 * SAMPLE_RATE); // every sound's last samples fade to 0, so a cut never clicks

const lpk = hz => 1 - Math.exp((-TAU * hz) / SAMPLE_RATE); // one-pole low-pass coefficient for a cutoff in Hz
const decay = (t, tau) => Math.exp(-t / tau);

// White noise held for 1 / hz s at a time: below the sample rate it turns gritty, like an 8-bit noise channel.
function grit(rng, hz) {
  let v = 0, acc = 1;
  return () => {
    if ((acc += hz / SAMPLE_RATE) >= 1) (acc %= 1), (v = rng.next() * 2 - 1);
    return v;
  };
}

// Each recipe returns its samples at any level (synth scales them). `p` is a playback rate, as on a sampler:
// frequencies times p, lengths divided by p. `t` below is in the recipe's own seconds (real seconds times p).
// `room` is the samples left to the end of a one-shot, or a loop's period: only crackle, which lasts, uses it.
export const SOUNDS = {
  /** Impact: a sine dropping from 160 to 45 Hz under a noise click, driven into soft clipping. */
  thump(rng, p) {
    const n = Math.round((0.4 / p) * SAMPLE_RATE), out = new Float64Array(n), k = lpk(2500 * p);
    for (let i = 0, ph = 0, y = 0; i < n; i++) {
      const t = (i / SAMPLE_RATE) * p;
      ph += (TAU * p * (45 + 115 * decay(t, 0.035))) / SAMPLE_RATE;
      y += k * (rng.next() * 2 - 1 - y);
      const body = Math.sin(ph) * decay(t, 0.09);
      out[i] = Math.tanh(1.8 * (body + 1.2 * y * decay(t, 0.006))) * Math.min(1, t / 0.001);
    }
    return out;
  },
  /** A noise burst: a bright snap over a gritty body. */
  crack(rng, p) {
    const n = Math.round((0.45 / p) * SAMPLE_RATE), out = new Float64Array(n), noise = grit(rng, 9000 * p);
    const kh = lpk(1800 * p), kl = lpk(3000 * p);
    for (let i = 0, h = 0, l = 0; i < n; i++) {
      const t = (i / SAMPLE_RATE) * p, x = noise();
      h += kh * (x - h);
      l += kl * (x - l);
      const snap = (x - h) * decay(t, 0.012), body = l * decay(t, 0.07);
      out[i] = Math.tanh(1.5 * (snap + 1.6 * body)) * Math.min(1, t / 0.0008);
    }
    return out;
  },
  /** Air moving past: noise through a resonant band-pass that sweeps up and back down while it swells and fades. */
  whoosh(rng, p) {
    const n = Math.round((0.36 / p) * SAMPLE_RATE), out = new Float64Array(n);
    for (let i = 0, low = 0, band = 0; i < n; i++) {
      const u = i / n, swell = u < 0.35 ? u / 0.35 : (1 - u) / 0.65;
      const f = 2 * Math.sin((Math.PI * Math.min(3500, p * (300 + 2100 * swell ** 1.5))) / SAMPLE_RATE);
      const high = rng.next() * 2 - 1 - low - 0.6 * band; // a state-variable filter, Q about 1.7
      band += f * high;
      low += f * band;
      out[i] = (band + 0.3 * low) * swell ** 1.6;
    }
    return out;
  },
  /** Fire: a flickering low roar, a little hiss and random pops. It lasts to the end, or the whole of a loop. */
  crackle(rng, p, room) {
    const n = room + XFADE, out = new Float64Array(n), noise = grit(rng, 11000 * p);
    const kr = lpk(380 * p), kf = lpk(5), kh = lpk(2400 * p), rate = (14 * p) / SAMPLE_RATE;
    let roar = 0, flick = 0.6, target = 0.6, hi = 0, pop = 0, popK = 0, thock = 0, thockK = 0, ph = 0, hz = 0;
    for (let i = 0; i < n; i++) {
      const x = noise();
      roar += kr * (x - roar);
      if (rng.next() < 30 / SAMPLE_RATE) target = rng.range(0.25, 1);
      flick += kf * (target - flick);
      hi += kh * (x - hi);
      if (rng.next() < rate) {
        const a = rng.next() ** 2;
        pop += 0.4 + 1.1 * a;
        popK = Math.exp(-1 / (rng.range(0.0015, 0.006 + 0.01 * a) * SAMPLE_RATE / p));
        if (a > 0.45) (thock = a), (thockK = Math.exp(-1 / ((0.012 * SAMPLE_RATE) / p))), (hz = rng.range(160, 340) * p);
      }
      ph += (TAU * hz) / SAMPLE_RATE;
      const s = 1.6 * roar * flick + 0.02 * (x - hi) + pop * (x - hi) + 0.5 * thock * Math.sin(ph);
      pop *= popK;
      thock *= thockK;
      // Equal-power fades: wrapped round a loop, the fade out lands on the fade in and the level holds.
      out[i] = Math.tanh(s) * Math.sin((Math.PI / 2) * Math.min(1, i / XFADE, (n - i) / XFADE));
    }
    return out;
  },
  /** Electricity: a pulse wave jumping between random pitches, ring-modulated by noise and stuttering on and off. */
  zap(rng, p) {
    const n = Math.round((0.4 / p) * SAMPLE_RATE), out = new Float64Array(n), kh = lpk(1500 * p);
    let ph = 0, hz = 0, next = 0, gate = 1, on = 1, hi = 0;
    for (let i = 0; i < n; i++) {
      const t = (i / SAMPLE_RATE) * p, x = rng.next() * 2 - 1;
      if (i >= next) {
        next = i + Math.round((rng.range(0.004, 0.012) * SAMPLE_RATE) / p);
        hz = rng.range(70, 280) * p;
        on = i === 0 || rng.chance(0.78) ? 1 : 0.1;
      }
      ph = (ph + hz / SAMPLE_RATE) % 1;
      gate += 0.08 * (on - gate);
      hi += kh * (x - hi);
      const buzz = (ph < 0.3 ? 1 : -1) * (0.65 + 0.35 * x) + 0.5 * (x - hi);
      out[i] = Math.tanh(1.4 * buzz * gate) * Math.min(1, t / 0.001) * decay(t, 0.13);
    }
    return out;
  },
  /** Magic: a struck bell at 880 Hz, inharmonic partials ringing shorter the higher they are, a slow shimmer. */
  chime(rng, p) {
    const n = Math.round((1 / p) * SAMPLE_RATE), out = new Float64Array(n), f0 = 880 * p * rng.range(0.997, 1.003);
    const partials = [[1, 1, 0.28], [1.0025, 0.3, 0.25], [2.76, 0.4, 0.12], [5.4, 0.22, 0.06], [8.93, 0.12, 0.03]];
    for (const [r, a, tau] of partials) {
      if (f0 * r > SAMPLE_RATE * 0.45) continue; // above the Nyquist limit it would fold back as noise
      const w = (TAU * f0 * r) / SAMPLE_RATE, ph = rng.next() * TAU;
      for (let i = 0; i < n; i++) out[i] += a * Math.sin(ph + w * i) * decay((i / SAMPLE_RATE) * p, tau);
    }
    for (let i = 0; i < n; i++) out[i] *= Math.min(1, (i / SAMPLE_RATE) * p / 0.002);
    return out;
  },
};

/** The cues an effect's sound plays, defaults filled in: `meta.sound`, else a thump on each act hit; [] for silence. */
export function soundCues(meta) {
  const cues = meta.sound ?? (meta.act?.hits ?? []).map(hit => ({ t: hit.t, kind: 'thump' }));
  return (cues || []).map(cue => ({ gain: 1, pitch: 1, ...cue }));
}

/**
 * An effect's sound: mono samples in [-1, 1] at SAMPLE_RATE from frame 0, one duration long, or null when it has no
 * cues. Each cue's sound peaks at 0.8 times its gain. A one-shot cuts what rings past its end (with a short fade); a
 * loop wraps it round to the start, so the samples repeat seamlessly.
 */
export function synth(meta, seed = meta.options?.seed ?? 1) {
  const cues = soundCues(meta), N = Math.round(meta.duration * SAMPLE_RATE), loop = !!meta.loop;
  if (!cues.length) return null;
  const out = new Float64Array(N), rng = new Rng(seed);
  for (const { t, kind, gain, pitch } of cues) {
    const recipe = SOUNDS[kind];
    if (!recipe) throw new Error(`sound: unknown kind "${kind}" (${Object.keys(SOUNDS).join(', ')})`);
    const at = Math.round(t * SAMPLE_RATE), s = recipe(rng, pitch, loop ? N : Math.max(0, N - at));
    const k = (0.8 * gain) / (s.reduce((m, v) => Math.max(m, Math.abs(v)), 0) || 1);
    for (let i = 0; i < s.length; i++) {
      const j = loop ? (((at + i) % N) + N) % N : at + i;
      if (j >= 0 && j < N) out[j] += s[i] * k * Math.min(1, (s.length - i) / TAPER);
    }
  }
  // DC blocker, a 20 Hz high-pass. A loop runs it round twice, so the state it starts from is the one it ends with.
  let x1 = 0, y1 = 0;
  for (let pass = loop ? 2 : 1; pass--; ) {
    for (let i = 0; i < N; i++) {
      const y = out[i] - x1 + 0.9943 * y1;
      x1 = out[i];
      y1 = y;
      if (!pass) out[i] = y;
    }
  }
  const peak = out.reduce((m, v) => Math.max(m, Math.abs(v)), 0), k = peak > 0.9 ? 0.9 / peak : 1;
  for (let i = 0; i < N; i++) out[i] *= k * (loop ? 1 : Math.min(1, (N - 1 - i) / TAPER));
  return out;
}
