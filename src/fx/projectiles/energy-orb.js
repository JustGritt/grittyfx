import { rand } from '../../core/index.js';

export const meta = {
  name: 'Energy orb',
  desc: 'A flying orb of energy: a pulsing core with a swirling shell, two sparks in orbit, echoes and motes trailing behind',
  tags: ['projectile', 'magic', 'energy', 'orb', 'arcane', 'bolt'],
  size: [40, 24],
  origin: [27, 12],
  duration: 0.6,
  loop: true,
  fps: 20,
  views: ['side', 'top'],
  top: { directions: 8 },
  ramps: { palette: 8 },
  options: { palette: 'arcane', seed: 1 },
  sound: [
    // a hum that swells with each pulse, and a buzz of static
    { t: 0, kind: 'whoosh', gain: 0.5, pitch: 1.2 },
    { t: 0.3, kind: 'whoosh', gain: 0.5, pitch: 1.2 },
    { t: 0.1, kind: 'zap', gain: 0.3, pitch: 0.7 },
  ],
};

const TAU = Math.PI * 2;
const R = 4.5; // the core's radius
// Sparks in orbit: radius across, radius along the flight (flattened: the orbit is tilted), turns per loop, phase.
const SPARKS = [[8, 3, 1, 0], [6.5, 4.5, -2, 0.5]];

function spark(p, C, ph, [rx, ry, k, phase], front) {
  const a = TAU * (ph * k + phase), z = Math.sin(a) * Math.sign(k); // z > 0: in front of the core
  if (z > 0 !== front) return;
  const pos = b => [Math.cos(b) * ry, Math.sin(b) * rx]; // the orbit stands across the flight
  const [x, y] = pos(a), dir = -Math.sign(k);
  for (let i = 4; i >= 1; i--) { // a short trail back along the orbit, cooling
    const [tx, ty] = pos(a + dir * i * 0.2);
    p.px(tx, ty, C[(front ? 6 : 4) - (i > 2 ? 1 : 0)]);
  }
  if (front) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.px(x + dx, y + dy, C[6]);
  p.px(x, y, C[front ? 7 : 5]);
  p.light(x, y, C[6], front ? 0.7 : 0.3);
}

export function draw(p, t, o) {
  const C = o.palette, s = o.seed, ph = t / meta.duration, pulse = Math.sin(TAU * ph * 2); // two pulses a loop
  const r = R + 0.6 * pulse;

  p.glow(0, 0, 11, C[5], 0.4 + 0.1 * pulse);
  p.glowLine(-20, 0, 0, 0, 6, C[4], (u, d) => 0.35 * u * (1 - d) ** 2);

  for (let i = 0; i < 2; i++) { // a pulse wave shed behind at each pulse: a crescent that falls back, shrinks and cools
    const u = (ph * 2 + i / 2) % 1, x = -2 - 16 * u, rr = r * (1.1 - 0.6 * u);
    if (u < 0.8) p.arc(x, 0.5, rr, Math.PI * 0.6, Math.PI * 1.4, 1.6 * (1 - u) + 0.6, C[u < 0.25 ? 6 : u < 0.5 ? 5 : 4]);
  }
  for (let j = 0; j < 6; j++) { // motes shed behind, drifting off the line
    const u = (ph * (1 + (j % 2)) + rand(j, s)) % 1, side = j % 2 ? 1 : -1;
    const x = -4 - 20 * u ** 1.2, y = side * (1 + 2 * rand(j, s, 1) + 3 * u);
    p.px(x, y, C[u < 0.3 ? 7 : u < 0.6 ? 6 : 4]);
  }

  for (const sp of SPARKS) spark(p, C, ph, sp, false);

  p.shade(-6, -6, 13, 13, (x, y) => { // the core: hot heart, a shell of energy swirling round once a loop
    const cx = x + 0.5, cy = y - 0.5 + 1, d = Math.hypot(cx, cy) / r;
    if (d > 1) return 0;
    const sw = Math.sin(2 * Math.atan2(cy, cx) - TAU * ph + d * 6); // two arms, wound into a spiral
    const e = 1 - d + 0.3 * sw * d;
    return C[e > 0.74 ? 7 : e > 0.5 ? 6 : e > 0.28 ? 5 : e > 0.1 ? 4 : 3];
  });
  for (let i = 0; i < 2; i++) { // crackling arcs on the shell
    const a0 = TAU * (i / 2 - ph * 2) + rand(i, s) * 0.5;
    p.arc(0, 0.5, r + 1.5, a0, a0 + 0.5, 1, C[6]);
  }

  for (const sp of SPARKS) spark(p, C, ph, sp, true);
}
