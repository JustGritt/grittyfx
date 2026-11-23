import { rand } from '../../core/index.js';

export const meta = {
  name: 'Heal aura',
  desc: 'A soft ring of light at the feet, sparkles and little plus signs rising through a gentle glow',
  tags: ['magic', 'heal', 'aura', 'buff', 'status'],
  size: [48, 56],
  origin: [24, 48],
  duration: 2,
  loop: true,
  fps: 15,
  views: ['side'],
  ramps: { palette: 8 },
  options: { palette: 'heal', seed: 1 },
  sound: [
    // a soft rising major chord each time a ripple leaves the ring
    { t: 0.05, kind: 'chime', gain: 0.3, pitch: 0.75 },
    { t: 0.2, kind: 'chime', gain: 0.26, pitch: 0.945 },
    { t: 0.35, kind: 'chime', gain: 0.22, pitch: 1.125 },
    { t: 1.05, kind: 'chime', gain: 0.3, pitch: 0.75 },
    { t: 1.2, kind: 'chime', gain: 0.26, pitch: 0.945 },
    { t: 1.35, kind: 'chime', gain: 0.22, pitch: 1.125 },
  ],
};

const TAU = Math.PI * 2;
const RX = 13, RY = 4; // the ring at the feet, seen at a slant
const RISE = 38;
const MOTES = 16, PLUSES = 4;

// An ellipse at scale s as short segments; front is the half nearer the viewer (below the anchor).
function ellipse(p, s, front, c, a = 1) {
  const N = 40;
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * TAU, a1 = ((i + 1) / N) * TAU, am = (a0 + a1) / 2;
    if (Math.sin(am) > 0 !== front) continue;
    p.line(Math.cos(a0) * RX * s, Math.sin(a0) * RY * s, Math.cos(a1) * RX * s, Math.sin(a1) * RY * s, c(am), a);
  }
}

// Motes ride up from the ring: k rises a loop, a new start each rise, so the loop is exact.
function mote(j, ph, s, k, off, spread = 1) {
  const v = ph * k + off, u = v % 1, cycle = Math.floor(v) % k, r = rand(j, cycle, s);
  const a = TAU * (off + r * spread), h = 1 - (1 - u) ** 1.7, x0 = Math.cos(a) * RX * 0.85;
  return {
    u, front: Math.sin(a) > 0,
    x: x0 * (1 - 0.35 * h) + Math.sin(TAU * (u * 1.5 + r)) * 2.5 * u,
    y: Math.sin(a) * RY * 0.85 - RISE * (0.55 + 0.45 * rand(j, cycle, s + 1)) * h,
    tw: rand(j, Math.floor(u * 9), s + cycle) < 0.18,
  };
}

function layer(p, t, o, front) {
  const C = o.palette, s = o.seed, ph = t / meta.duration;
  const crest = am => Math.cos(am - TAU * ph * 2); // runs around the ring twice a loop
  ellipse(p, 1, front, am => (crest(am) > 0.85 ? C[7] : crest(am) > 0.4 ? C[6] : front ? C[5] : C[3]));
  const rip = (ph * 2) % 1; // a ripple leaves the ring twice a loop, darkening as it spreads
  if (rip > 0.05 && rip < 0.75) ellipse(p, 1.04 + 0.42 * (1 - (1 - rip) ** 2), front, () => C[(front ? 6 : 5) - Math.floor(rip * 3)], Math.min(1, (0.75 - rip) / 0.2));

  for (let j = 0; j < MOTES; j++) {
    const m = mote(j, ph, s, 1 + (j % 2), rand(j, s, 7));
    if (m.front !== front || m.u > 0.85) continue;
    const c = C[(m.tw ? 7 : front ? 6 : 5) - Math.floor((m.u / 0.85) * 3)];
    p.px(m.x, m.y, c);
    if (m.tw && m.u < 0.6) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.px(m.x + dx, m.y + dy, C[front ? 5 : 4]);
    p.light(m.x, m.y, C[6], 0.4 * (1 - m.u));
  }

  for (let j = 0; j < PLUSES; j++) {
    const m = mote(j + 50, ph, s, 1, j / PLUSES + rand(j, s, 9) * 0.15, 0.2);
    if (m.front !== front || m.u > 0.9) continue;
    const arm = m.u < 0.1 || m.u > 0.75 ? 1 : 2, hot = m.u < 0.5;
    for (let d = 1; d <= arm; d++) {
      for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d]]) p.px(m.x + dx, m.y + dy, C[front ? (hot ? 6 : 5) : 4]);
    }
    p.px(m.x, m.y, C[front ? 7 : 5]);
    p.glow(m.x, m.y, 5, C[5], 0.35 * (1 - m.u));
  }
}

export function drawBack(p, t, o) {
  const C = o.palette, breathe = 0.5 + 0.5 * Math.sin((TAU * t) / meta.duration);
  p.glow(0, -16, 24, C[5], 0.2 + 0.08 * breathe);
  p.glowLine(-12, 0, 12, 0, 6, C[5], 0.3 + 0.1 * breathe);
  layer(p, t, o, false);
}

export function draw(p, t, o) {
  layer(p, t, o, true);
}
