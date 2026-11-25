import { rand } from '../../core/index.js';

export const meta = {
  name: 'Beam',
  desc: 'A ray held from the staff: light gathers at the tip, the beam snaps out to full length with a white hero frame, holds with a rippling core and a flaring contact point spitting sparks, then thins to a thread and breaks up',
  tags: ['magic', 'beam', 'ray', 'laser', 'spell'],
  size: [78, 36],
  origin: [11, 18],
  duration: 0.8,
  loop: false,
  fps: 30,
  views: ['side', 'top'],
  top: { directions: 8 },
  ramps: { palette: 8 },
  options: { palette: 'arcane', seed: 1 },
  act: { windup: 0.2, hits: [{ t: 0.2, freeze: 0.06, shake: 2 }] },
  stage: { at: 'target', x: -54, ground: 19 }, // from the mage's tip to the goblin
  sound: [
    { t: 0, kind: 'whoosh', gain: 0.5, pitch: 1.2 }, // the charge, peaking as the ray leaves
    { t: 0, kind: 'chime', gain: 0.25, pitch: 1.5 },
    { t: 0.2, kind: 'crack', gain: 0.6, pitch: 1.6 }, // the ray lands
    { t: 0.2, kind: 'zap', gain: 0.45, pitch: 0.8 },
    { t: 0.2, kind: 'thump', gain: 0.5, pitch: 0.9 },
    { t: 0.34, kind: 'zap', gain: 0.3, pitch: 0.7 }, // the hum while it holds
    { t: 0.5, kind: 'chime', gain: 0.2, pitch: 2 }, // it thins away
  ],
};

const TAU = Math.PI * 2;
const L = 54; // the ray's length: from the tip to where it lands
const T0 = 4 / 30; // the charge, then the ray snaps out
const HIT = 6 / 30; // full length: the hero frame
const THIN = 0.5, BREAK = 0.64, END = 0.74; // it thins to a thread, the thread breaks up, gone
const F = 1 / 30;

const clamp = v => Math.max(0, Math.min(1, v));
const smooth = u => u * u * (3 - 2 * u);

// The ray's half-width at time t, before its ripple.
function width(t) {
  if (t < HIT) return 1.6;
  if (t < HIT + F) return 4.5;
  if (t < THIN) return 2.8 + 1.7 * Math.exp(-(t - HIT - F) / 0.04);
  return 0.6 + 2.2 * (1 - smooth(clamp((t - THIN) / (BREAK - THIN))));
}

export function draw(p, t, o) {
  const C = o.palette, s = o.seed, top = o.view === 'top';
  if (t >= END) return;
  const frame = Math.floor(t / F + 1e-6);
  const len = t < T0 ? 0 : t < HIT ? L * (1 - (1 - (t - T0) / (HIT - T0 + F)) ** 2) : L;
  const hero = t >= HIT && t < HIT + F;
  const fade = t < BREAK ? 1 : 1 - (t - BREAK) / (END - BREAK); // the last frames dim out
  const w = width(t);

  // ---- light: along the ray, round the tip and the contact point ----
  if (len > 0) p.glowLine(0, 0, len, 0, hero ? 11 : 8, C[5], (u, d) => (hero ? 0.6 : 0.4) * fade * (1 - d) ** 2);
  const charge = t < T0 ? t / T0 : 1;
  p.glow(0, 0, 4 + 5 * charge, C[5], 0.55 * charge * fade);
  if (t >= HIT) p.glow(L, 0, hero ? 14 : 10, C[6], (hero ? 0.8 : 0.5) * fade);

  // ---- the charge: motes spiral into the tip ----
  if (t < HIT) {
    for (let j = 0; j < 6; j++) {
      const u = clamp(t / T0 + 0.15 - rand(j, s) * 0.3), r = 9 * (1 - u) ** 1.3;
      if (u >= 1 || r < 1.5) continue;
      const a = (j / 6) * TAU + rand(j, s, 1) + u * 2;
      const x = Math.cos(a) * r, y = Math.sin(a) * r, x2 = Math.cos(a - 0.35) * (r + 2), y2 = Math.sin(a - 0.35) * (r + 2);
      p.line(x2, y2, x, y, q => C[q > 0.5 ? 6 : 4]);
      p.light(x, y, C[5], 0.4);
    }
  }

  if (t < T0) p.ring(0.5, 0.5, 8 - 5 * charge, 1, C[charge > 0.5 ? 6 : 4], 0.4 + 0.6 * charge); // drawn in

  // ---- the ray: a white core in bright edges and a darker rim, rippling as pulses run down it ----
  if (len > 0) {
    p.shade(0, -6, Math.ceil(len) + 1, 12, (x, y) => {
      const cx = x + 0.5, cy = y + 0.5;
      if (cx > len) return 0;
      const pulse = 0.65 * Math.sin(TAU * (cx / 11 - t * 7)) + 0.35 * Math.sin(TAU * (cx / 6.5 - t * 4.3) + 1);
      const taper = Math.min(1, 0.55 + cx / 8) * (hero ? 0.65 + (0.35 * cx) / L : 1); // narrower as it leaves the orb
      const h = w * taper * (1 + (t >= HIT + F && t < THIN ? 0.13 * pulse : 0));
      const d = Math.abs(cy) / h;
      if (!(d <= 1)) return 0;
      if (t >= BREAK && rand(Math.floor(cx), 5, s) < (t - BREAK) / (END - BREAK) * 1.4) return 0; // the thread breaks up
      if (hero) return C[d > 0.85 ? 5 : d > 0.6 ? 6 : 7];
      if (h < 1.2) return C[t >= BREAK ? 5 : 6];
      return C[d < (pulse > 0.6 ? 0.5 : 0.3) ? 7 : d < 0.6 ? 6 : d < 0.78 ? 5 : 3];
    });
    if (t < HIT) p.circle(len + 0.5, 0.5, 2, C[7]); // the ray's head racing out
  }

  // ---- two strands winding round the ray while it holds: bright where they pass in front ----
  if (t >= HIT + F && t < BREAK) {
    const k = t < THIN ? 1 : 1 - (t - THIN) / (BREAK - THIN);
    for (const ph of [0, Math.PI]) {
      const at = x => TAU * (x / 21 - t * 3) + ph;
      for (let x = 3; x < L - 3; x++) {
        if (Math.cos(at(x + 0.5)) < 0.2) continue; // behind the ray it is hidden
        const y0 = Math.sin(at(x)) * (w + 1.5) * k, y1 = Math.sin(at(x + 1)) * (w + 1.5) * k;
        p.line(x, y0, x + 1, y1, C[Math.abs(y0) > w ? 6 : 7]);
      }
    }
  }

  // ---- the orb at the tip ----
  const orb = t < T0 ? 1 + 2 * charge : t < THIN ? 2.6 + 0.6 * Math.sin(TAU * t * 9) : 3 * (1 - clamp((t - THIN) / (BREAK - THIN)));
  if (orb > 0.8) p.circle(0.5, 0.5, orb, (dx, dy, d) => C[d > 0.75 ? 5 : 7]);

  if (t < HIT) return;
  const u = t - HIT;

  // ---- the contact point: a burst ring on the hit, then a flaring star ----
  if (u < 0.2) {
    const q = u / 0.2, r = 3 + 8 * Math.sqrt(q);
    p.ring(L + 0.5, 0.5, r, 1.5, C[q < 0.4 ? 6 : 4], q < 0.3 ? 1 : (1 - q) * 1.4);
  }
  if (t < BREAK) {
    const k = t < THIN ? 1 : 1 - (t - THIN) / (BREAK - THIN);
    const c = hero ? 6 : 4 + Math.floor(2.4 * rand(frame, 3, s)); // rays flicker between frames
    const rays = [[0, -1], [0, 1], [1, 0], [-0.7, -0.7], [-0.7, 0.7]];
    rays.forEach(([dx, dy], j) => {
      const n = Math.round(k * (hero ? 9 : 3 + 4 * rand(frame, j, s)));
      for (let i = 2; i <= n; i++) p.px(L + dx * i, dy * i, i > n - 2 ? C[c - 1] : C[c + 1]);
    });
    p.circle(L + 0.5, 0.5, hero ? 4 : 2 + k, (dx, dy, d) => C[d > 0.7 ? 6 : 7]);
  }

  // ---- sparks splashing back off the contact point while it holds ----
  for (let j = 0; j < 14; j++) {
    const born = HIT + (j / 14) * (THIN - HIT) + rand(j, s, 7) * 0.03, age = t - born, life = 0.16 + 0.08 * rand(j, s, 8);
    if (age < 0 || age > life) continue;
    const vx = -(30 + 50 * rand(j, s, 9)), vy = (rand(j, s, 10) - 0.7) * 100, g = top ? 0 : 200;
    const at = a => [L - 1 + vx * a, vy * a + g * a * a];
    const q = age / life;
    p.line(...at(Math.max(0, age - 0.03)), ...at(age), v => C[v > 0.5 ? (q < 0.4 ? 7 : 6) : q < 0.6 ? 5 : 4]);
  }

  // ---- motes flaking off the ray's edges ----
  if (t < BREAK) {
    for (let j = 0; j < 3; j++) {
      const x = 6 + rand(frame, j, s) * (L - 12), side = rand(frame, j + 9, s) < 0.5 ? -1 : 1;
      p.px(x, side * (w + 1.5 + 2 * rand(frame, j + 20, s)), C[rand(frame, j + 30, s) < 0.5 ? 6 : 5]);
    }
  }
}
