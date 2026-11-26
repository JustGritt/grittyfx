import { Rng, Particles, Lights, SPARK, EMBER, rand, noise2 } from '../../core/index.js';

const FORM = 0.2, HIT = 0.75, DIE = 1.4, END = 1.85;

export const meta = {
  name: 'Barrier',
  desc: 'A wall of light raised before the caster: it unfurls from the staff, shimmers and holds, a hostile bolt bursts on its face as it flares and ripples, then it crumbles into rising motes',
  tags: ['barrier', 'shield', 'ward', 'holy', 'light', 'magic', 'spell'],
  size: [96, 68],
  origin: [32, 60],
  duration: END,
  loop: false,
  fps: 30,
  views: ['side'],
  ramps: { palette: 8, bolt: 8 },
  options: { palette: 'holy', bolt: 'arcane', seed: 1 },
  act: { hits: [{ t: HIT, freeze: 0.07, shake: 2 }] },
  // its foot on the floor before her, the staff held out to it until it goes
  stage: { at: 'caster', x: 24, ground: 0, pose: 'point', hold: true },
  sound: [
    { t: 0, kind: 'whoosh', gain: 0.3, pitch: 1.2 }, // it sweeps open
    { t: 0.04, kind: 'chime', gain: 0.3, pitch: 1.5 },
    { t: FORM, kind: 'chime', gain: 0.35, pitch: 2 },
    { t: HIT - 0.12, kind: 'whoosh', gain: 0.25, pitch: 1.7 }, // the bolt coming in
    { t: HIT, kind: 'crack', gain: 0.6, pitch: 1.1 },
    { t: HIT, kind: 'thump', gain: 0.5, pitch: 0.9 },
    { t: HIT, kind: 'chime', gain: 0.5, pitch: 1.26 }, // the wall rings
    { t: DIE, kind: 'chime', gain: 0.18, pitch: 2.5 },
  ],
};

const TAU = Math.PI * 2;
const CX = -22, CY = -20, R = 30; // the shell's arc, its center behind it, so it bulges toward the foe
const A0 = -0.82, A1 = 0.75; // its ends: the top over her head, the foot on the floor
const MID = 0.07; // where the staff points, and the wall opens from
const IY = -14, IA = Math.asin((IY - CY) / R), IX = CX + R * Math.cos(IA); // where the bolt strikes
const TIP = [-5, -18]; // the staff's tip, from the wall's foot
const BX = 50, FLY = 0.18; // the bolt comes in from here, this long before it strikes
const MOTES = 16;
const OUT = u => 1 - (1 - u) ** 3;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
// Its face: a web of light 6 px a cell, flowing slowly up.
const web = (x, y, t) => {
  const k = Math.floor(t * 10);
  return (((x + y + k) % 6) + 6) % 6 === 0 || (((x - y - k) % 6) + 6) % 6 === 0;
};

// The shell at time t: its open span, how thick, how bright, and how far it has crumbled.
function state(t) {
  const g = OUT(clamp((t - 0.04) / (FORM - 0.04)));
  return {
    lo: MID + (A0 - MID) * g,
    hi: MID + (A1 - MID) * g,
    g,
    flash: (t >= FORM - 1e-6 && t < FORM + 0.03) || (t >= HIT - 1e-6 && t < HIT + 0.03), // the frame it closes, and the frame it is struck
    crumble: clamp((t - DIE) / (END - 0.15 - DIE)),
  };
}

// How far the shell is pushed in at angle a: the blow dents it, it springs back past its rest and settles.
function dent(a, t) {
  const k = t - HIT;
  if (k < 0) return 0;
  return 3.5 * Math.exp(-k * 9) * Math.cos(k * 30) * Math.exp(-(((a - IA) / 0.28) ** 2));
}

// The shell's outer and inner radius at angle a: thickest mid-way, thin at its ends, thinner while it opens.
function radii(a, t, g) {
  const ro = R - dent(a, t);
  return [ro, ro - (2 + 5 * Math.sin((Math.PI * (a - A0)) / (A1 - A0)) ** 0.7) * (0.4 + 0.6 * g)];
}

export function create(o) {
  const rng = new Rng(o.seed), C = o.palette, B = o.bolt, s = o.seed;
  const parts = new Particles({ rng, palette: C, ground: 0 }), lights = new Lights();
  for (let i = 0; i < 10; i++) { // the bolt bursts on the face, its sparks thrown back
    const a = rng.range(-1.2, 1.2), v = rng.range(40, 110);
    parts.spawn(SPARK, IX + 1, IY, Math.cos(a) * v, Math.sin(a) * v - 20, rng.range(0.25, 0.45), { delay: HIT, ramp: B });
  }
  for (let i = 0; i < 5; i++) { // and light chips off the wall
    const a = rng.range(-1.4, 1.4), v = rng.range(50, 90);
    parts.spawn(SPARK, IX, IY, Math.cos(a) * v, Math.sin(a) * v - 30, rng.range(0.2, 0.35), { delay: HIT });
  }
  for (let i = 0; i < 6; i++) parts.spawn(EMBER, IX + rng.range(1, 5), IY + rng.range(-3, 3), rng.range(10, 40), rng.range(-30, 0), rng.range(0.35, 0.6), { delay: HIT, ramp: B });
  lights.add(IX, IY, 14, C[6], 1, 0.3, { delay: HIT });
  lights.add(IX - 2, -20, 16, C[5], 0.6, 0.25, { delay: FORM - 0.02 }); // it closes with a flash

  let n = 0, t = 0;

  // A pixel of the shell: its color, or 0 when it isn't on it.
  const shell = (x, y) => {
    const q = state(t), dx = x + 0.5 - CX, dy = y + 0.5 - CY, a = Math.atan2(dy, dx), r = Math.hypot(dx, dy);
    if (y >= 0 || a < q.lo || a > q.hi) return 0;
    const [ro, ri] = radii(a, t, q.g);
    if (r > ro || r < ri) return 0;
    if (q.crumble > 0) { // it crumbles from its ends in to the middle, a hot edge eating in
      const key = 0.55 * noise2(x * 0.45, y * 0.45, s) + 0.45 * (1 - Math.abs(a - MID) / 0.9);
      if (key < q.crumble) return 0;
      if (key < q.crumble + 0.08) return C[7];
    }
    // light running over it: the blow's ripple spreading over its face from where it landed, the web lit inside it,
    // and a highlight sweeping up from the foot while it holds
    const k = t - HIT, far = Math.hypot(x + 0.5 - IX, y + 0.5 - IY), front = 4 + 90 * k;
    const ripple = k > 0 && k < 0.3 && Math.abs(far - front) < 2.5, lit = k > 0 && k < 0.45 && far < front && far < 34 * (1 - k / 0.45);
    const hu = ((t - FORM) / 0.6) % 1, sweep = t > FORM && t < DIE && Math.abs(a - (A1 + (A0 - A1) * hu)) < 0.1;
    const rim = ro - r < 1.2, inner = r - ri < 1;
    if (q.flash) return C[rim || inner ? 7 : 6];
    if (rim) return C[ripple || sweep ? 7 : 6];
    if (inner) return C[ripple ? 6 : 5];
    // its face: a faint web of light, the lines brightening where the sweep passes
    return C[ripple ? 7 : web(x, y, t) ? (sweep || lit ? 7 : 5) : sweep || lit ? 5 : 3];
  };
  const alpha = (x, y) => {
    const q = state(t), dx = x + 0.5 - CX, dy = y + 0.5 - CY, r = Math.hypot(dx, dy), [ro, ri] = radii(Math.atan2(dy, dx), t, q.g);
    if (ro - r < 1.2 || q.flash) return 1;
    return r - ri < 1 || web(x, y, t) ? 0.8 : 0.3;
  };

  return {
    update(dt) {
      t = ++n * dt;
      parts.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      const q = state(t), level = q.g * (1 - q.crumble);
      if (level > 0) {
        // the wall lights the air along it and a pool on the floor at its foot
        const N = 5;
        for (let i = 0; i < N; i++) {
          const a0 = q.lo + ((q.hi - q.lo) * i) / N, a1 = q.lo + ((q.hi - q.lo) * (i + 1)) / N;
          p.glowLine(CX + R * Math.cos(a0) - 2, CY + R * Math.sin(a0), CX + R * Math.cos(a1) - 2, CY + R * Math.sin(a1), 6, C[4], 0.3 * level);
        }
        if (q.hi > A1 - 0.05) p.glowLine(-5, -1, 6, -1, 5, C[4], 0.35 * level);
      }
      lights.draw(p);
      parts.draw(p, 'back');
    },
    draw(p) {
      if (t < 0.1) { // a ray leaps from the staff to where the wall will stand
        const u = clamp(t / 0.05), x = TIP[0] + (IX + 1 - TIP[0]) * u;
        p.line(TIP[0], TIP[1], x, TIP[1] - 1, C[t < 0.07 ? 7 : 5]);
        p.px(x, TIP[1] - 1, C[7]);
      }
      if (t > 0.04 && t < END) p.shade(-6, -46, 18, 46, shell, alpha);

      // the bolt, flying in from the foe's side
      const u = (t - (HIT - FLY)) / FLY;
      if (u >= 0 && u < 1) {
        const x = BX + (IX + 2 - BX) * u, y = IY;
        p.glow(x, y, 9, B[5], 0.6);
        p.beam(x, y, x + 12, y, 3, (v, d) => B[v < 0.25 ? 6 : v < 0.55 ? 5 : 3], v => 1 - v * 0.6);
        for (const k of [-1, 1]) p.line(x + 2, y + k * 2, x + 11, y + k * (3 + Math.sin(TAU * (u * 2 + k * 0.25))), w => B[w < 0.5 ? 5 : 3], 0.8);
        p.circle(x + 0.5, y + 0.5, 2.2, d => B[d < 0.45 ? 7 : 6]);
      }

      // the blow: a star of light where it lands, shrinking
      const k = t - HIT;
      if (k >= 0 && k < 0.2) {
        const arm = Math.round(6 * (1 - k / 0.2)), x = IX, y = IY;
        p.circle(x + 0.5, y + 0.5, k < 0.04 ? 2.5 : 1.5, C[7]);
        for (let d = 1; d <= arm; d++) {
          const c = C[d > arm - 2 ? 5 : 7];
          p.px(x + d, y, c);
          p.px(x, y - d, c);
          p.px(x, y + d, c);
          if (d <= arm / 2) (p.px(x + d, y - d, c), p.px(x + d, y + d, c));
        }
      }

      // crumbling, it lets go of motes that drift up and fade
      for (let j = 0; j < MOTES; j++) {
        const b = DIE + 0.18 * rand(j, s, 1), v = (t - b) / 0.26;
        if (v < 0 || v >= 1) continue;
        const a = A0 + (A1 - A0) * (j + rand(j, s, 2)) / MOTES, x = CX + (R - 2) * Math.cos(a) + 2 * Math.sin(TAU * (v + rand(j, s))), y = CY + (R - 2) * Math.sin(a) - 14 * OUT(v);
        const c = C[7 - Math.floor(v * 3)];
        p.px(x, y, c);
        if (v < 0.3) for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.px(x + ox, y + oy, C[5]);
        p.light(x, y, C[5], 0.5 * (1 - v));
      }
      parts.draw(p);
    },
  };
}
