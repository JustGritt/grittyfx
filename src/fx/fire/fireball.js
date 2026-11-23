import { tileFbm, rand } from '../../core/index.js';

export const meta = {
  name: 'Fireball',
  desc: 'A flying fireball: a white-hot core, flame tails streaming back, licks that tear off and sparks left behind',
  tags: ['fire', 'projectile', 'magic'],
  size: [50, 28],
  origin: [36, 14],
  duration: 0.5,
  loop: true,
  fps: 16,
  views: ['side', 'top'],
  top: { directions: 8 },
  ramps: { palette: 8 },
  options: { palette: 'fire', seed: 1 },
  sound: [{ t: 0, kind: 'crackle', pitch: 0.55 }], // a low roar
};

const TAU = Math.PI * 2;
const R = 6; // the head's radius
const L = 34; // the longest tail
// Tails: drift off the axis at the tip, length, width at the head, waves per loop, phase, heat (side tails run cooler).
const TAILS = [[0, 1, 5, 2, 0, 1], [-2.5, 0.55, 3, 3, 0.3, 0.85], [2.5, 0.65, 3, 2, 0.65, 0.85]];
const BANDS = [[0.9, 7], [0.72, 6], [0.55, 5], [0.38, 4], [0.25, 3], [0.15, 2]];

export function draw(p, t, o) {
  const C = o.palette, s = o.seed, ph = t / meta.duration;

  p.glowLine(-26, 0, 0, 0, 8, C[5], (u, d) => 0.4 * u * (1 - d) ** 2);
  p.glow(0, 0, 13, C[5], 0.6);

  const wisps = [0, 1, 2].map(j => { // licks torn off the tail, shrinking as they fall behind
    const u = (ph * (1 + (j % 2)) + j / 3) % 1;
    return { x: -14 - u * 18, y: (j - 1) * 3 + Math.sin(TAU * (u + j * 0.3)) * 1.5, r: 2.6 * (1 - u) };
  });
  p.shade(-L - 2, -9, L + R + 4, 18, (x, y) => {
    const cx = x + 0.5, cy = y + 0.5, u = Math.max(0, -cx / L);
    let e = 1 - Math.hypot(cx < 0 ? cx / 1.4 : cx, cy) / R; // the head, drawn out a little behind
    for (const [dy, len, w, k, phase, hot] of TAILS) {
      const v = -cx / (L * len);
      if (v <= 0 || v >= 1) continue;
      const mid = dy * v * v + Math.sin(TAU * (v * 1.3 - ph * k + phase)) * 2 * v; // a wave running back along it
      const half = w * (1 - v) ** 1.4;
      if (half > 0.6) e = Math.max(e, hot * (1 - Math.abs(cy - mid) / half)); // thinner, it would break into lone pixels
    }
    for (const q of wisps) if (q.r > 1.2) e = Math.max(e, 1.6 * (1 - Math.hypot(cx - q.x, cy - q.y) / q.r)); // hotter than the trail around it
    if (e <= 0) return 0;
    const n = tileFbm(cx * 0.15 + ph * 12, cy * 0.45, 6, 2, s); // streaks, streaming back two whole tiles per loop
    const heat = e * (1.2 - u) - (n - 0.45) * (0.1 + 0.4 * u) * Math.min(1, e * 4); // noise alone lights no lone pixel
    const band = BANDS.find(([min]) => heat > min);
    return band ? C[band[1]] : 0;
  });
  p.circle(0.5, 0.5, 2.6 + 0.4 * Math.sin(TAU * ph * 2), C[7]);

  for (let j = 0; j < 7; j++) { // sparks left behind: drag slows them in the world, so they fall back ever faster
    const u = (ph * (1 + (j % 2)) + rand(j, s)) % 1;
    if (u > 0.8) continue;
    const side = rand(j, s, 1) < 0.5 ? -1 : 1, x = -8 - 26 * u ** 1.6, y = side * (2 + rand(j, s, 2) * 2.5 + 4 * (1 - (1 - u) ** 2));
    p.line(x, y, x + 1 + 2 * u, y, q => C[q < 0.5 ? (u < 0.25 ? 7 : 6) : 4]);
    p.light(x, y, C[5], 0.35 * (1 - u));
  }
}
