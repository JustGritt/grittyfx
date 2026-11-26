import { rand, loopNoise } from '../../core/index.js';

const TAU = Math.PI * 2;
const BEAT = 0.8, BEATS = 2; // a pulse: motes drawn in, the glow building, a flare as they all arrive
const F = 1 / 20; // a frame

export const meta = {
  name: 'Charge-up',
  desc: 'A held charge on a fighter with the blade raised: motes drawn inward into the blade, its glow building to a flare each beat, a flickering rim round the body, grit drawn in along the floor',
  tags: ['aura', 'charge', 'charge-up', 'power', 'focus', 'weapon'],
  size: [64, 64],
  origin: [32, 58],
  duration: BEAT * BEATS,
  loop: true,
  fps: 20,
  views: ['side'],
  ramps: { palette: 8 },
  options: { palette: 'gold', seed: 1 },
  stage: { cast: 'knight', hold: true }, // raised until the loop ends, then the strike
  sound: [
    // a swell into each flare (a whoosh peaks a third of the way in), a soft chime on it
    ...[0, 1].flatMap(n => [
      { t: n * BEAT + BEAT - 0.27, kind: 'whoosh', gain: 0.3, pitch: 0.45 },
      { t: n * BEAT, kind: 'chime', gain: 0.22, pitch: n ? 1.5 : 1.26 },
    ]),
  ],
};

const FX = 1, FY = -30, TIP = -34, HILT = -27; // the raised blade, 30 px over the feet
const H = 44, W = 14, CX = -1.5; // the rim: how high, how wide, its axis
const MOTES = 9, GRIT = 5;
const clamp01 = v => Math.max(0, Math.min(1, v));

// The rim's half-width at height h (0 at the feet, 1 at its point): a flame shape, narrow at the floor, widest at the
// hips, closing to a point over the blade.
const half = h => W * (1 - h) ** 0.6 * Math.min(1, (h + 0.3) / 0.5);

// The glow at u through a beat: building as the motes come in, a flare as the beat turns over.
const build = u => u * u;
const flare = u => clamp01(1 - u / (2.5 * F / BEAT));

function rim(p, t, o, u) {
  const C = o.palette, s = o.seed, fl = flare(u), g = build(u), ph = t / meta.duration;
  const step = Math.floor(t / (2 * F)); // jitter on twos
  for (const side of [-1, 1]) {
    const off = side * 1.7, pts = [];
    for (let y = 0; y > -H; y--) {
      const h = -y / H;
      // tongues run up each side, licking out; gaps flicker open and shut
      const lick = Math.max(0, Math.sin(TAU * (h * 2.2 - ph * 4) + off)) ** 3;
      const n = loopNoise(h * 9 + (side > 0 ? 40 : 0), ph * 8, 8, s);
      const x = CX + side * (half(h) + 1.5 * lick + fl) + (rand(y, step, s + side) < 0.2 ? side : 0);
      const c = fl > 0.6 ? 7 : lick > 0.5 ? 6 : n > 0.65 ? 5 : h < 0.1 ? 3 : 4;
      pts.push(n < 0.42 - 0.3 * fl - 0.25 * lick ? null : [x, y, c, lick > 0.45 && h > 0.12]);
    }
    pts.forEach((q, i) => { // joined row to row, so the slope near the point stays unbroken
      if (!q) return;
      const prev = pts[i - 1];
      if (prev && Math.abs(prev[0] - q[0]) > 1) p.line(prev[0], prev[1], q[0], q[1], C[Math.min(prev[2], q[2])]);
      else p.px(q[0], q[1], C[q[2]]);
      if (q[3]) p.px(q[0] + side, q[1], C[q[2] - 2]); // a tongue is thicker, dark on its outer edge
      p.light(q[0], q[1], C[5], 0.15 + 0.3 * g + 0.4 * fl);
    });
  }
}

// Mote j of beat n at u: from its own spot on a ring round the blade, slow, then faster and curling in, arriving as the
// beat ends. null when it isn't out.
function mote(j, n, u, s) {
  const u0 = 0.5 * (j / MOTES) + 0.08 * rand(j, n, s), u1 = Math.max(u0 + 0.35, 0.62 + 0.38 * rand(j, n, s + 1)), q = (u - u0) / (u1 - u0);
  if (q < 0 || q >= 1) return null;
  const a0 = TAU * (j + 0.6 * rand(j, n, s + 2)) / MOTES + n * 1.3, R = 17 + 9 * rand(j, n, s + 3);
  const at = q => {
    const e = q * q, a = a0 + 0.7 * e, r = R * (1 - e);
    return [FX + Math.cos(a) * r, FY + Math.sin(a) * r * 0.9];
  };
  return { q, at, back: rand(j, n, s + 4) < 0.35 };
}

function motes(p, t, o, back) {
  const C = o.palette, s = o.seed;
  for (let n = 0; n < BEATS; n++) {
    const u = (t - n * BEAT) / BEAT;
    for (let j = 0; j < MOTES; j++) {
      const m = mote(j, n, u, s);
      if (!m || m.back !== back) continue;
      const [x, y] = m.at(m.q);
      if (m.q < 0.3) { // a dim speck fading in
        p.dot(x, y, C[back ? 2 : 3], 0.4 + 2 * m.q);
        continue;
      }
      const [tx, ty] = m.at(Math.max(0, m.q - 0.06 - 0.08 * m.q)), hot = back ? 5 : m.q > 0.7 ? 7 : 6;
      p.line(tx, ty, x, y, v => C[v > 0.6 ? hot : hot - 2]); // the head inward, hottest
      p.light(x, y, C[6], 0.3 + 0.5 * m.q);
    }
  }
}

// Grit on the floor, drawn in to the feet along it.
function grit(p, t, o) {
  const C = o.palette, s = o.seed;
  for (let n = 0; n < BEATS; n++) {
    for (let j = 0; j < GRIT; j++) {
      const u = (t - n * BEAT) / BEAT, u0 = 0.15 + 0.45 * rand(j, n, s + 5), q = (u - u0) / 0.4;
      if (q < 0 || q >= 1) continue;
      const side = j % 2 ? 1 : -1, x0 = side * (14 + 12 * rand(j, n, s + 6)), x = x0 * (1 - q * q) + side * 4 * q * q;
      p.px(x, -(rand(j, n, s + 7) < 0.4 ? 1 : 0), C[q > 0.6 ? 4 : 3]);
      if (q > 0.5) p.px(x + side, 0, C[2]);
    }
  }
}

export function drawBack(p, t, o) {
  const C = o.palette, u = (t % BEAT) / BEAT, g = build(u), fl = flare(u);
  p.glow(CX, -16, 20, C[4], 0.12 + 0.12 * g + 0.2 * fl); // the body lit from within
  p.glowLine(-12, 0, 12, 0, 5, C[5], 0.15 + 0.2 * g + 0.25 * fl); // and the floor under it
  rim(p, t, o, u);
  motes(p, t, o, true);
}

export function draw(p, t, o) {
  const C = o.palette, u = (t % BEAT) / BEAT, g = build(u), fl = flare(u);
  motes(p, t, o, false);
  grit(p, t, o);
  // the blade: lit along its length, brighter as the charge builds, a white flare as the motes arrive
  p.glowLine(FX, TIP, FX, HILT, 4 + 4 * g + 5 * fl, C[6], 0.35 + 0.45 * g + 0.3 * fl);
  p.glow(FX, FY, 8 + 6 * g + 6 * fl, C[5], 0.2 + 0.3 * g + 0.3 * fl);
  // the second beat's flare glints, a frame after its surge (the first's falls as the blade goes up, or comes down)
  const glint = t < BEAT ? 0 : u < F / BEAT ? 0 : u < 2 * F / BEAT ? 1 : u < 3 * F / BEAT ? 0.5 : 0;
  if (glint) {
    const L = Math.round(3 + 5 * glint);
    p.line(FX - L, TIP + 1, FX + L, TIP + 1, v => C[Math.abs(v - 0.5) < 0.2 ? 7 : 6]);
    p.line(FX, TIP + 1 - L, FX, TIP + 1 + L, v => C[Math.abs(v - 0.5) < 0.2 ? 7 : 6]);
    p.px(FX, TIP + 1, C[7]);
  }
}
