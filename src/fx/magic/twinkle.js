import { rand } from '../../core/index.js';

export const meta = {
  name: 'Twinkle',
  desc: 'Star glints that pop up around a collectible one after another: a white core, four arms, a soft glow',
  tags: ['magic', 'sparkle', 'glint', 'pickup', 'idle'],
  size: [36, 36],
  origin: [18, 18],
  duration: 1.5,
  loop: true,
  fps: 16,
  views: ['side'],
  ramps: { palette: 8 },
  options: { palette: 'gold', seed: 1 },
  stage: { ground: 14 }, // around the body
  sound: [
    // one glint every quarter second, on a pentatonic scale
    { t: 0, kind: 'chime', gain: 0.3, pitch: 1.5 },
    { t: 0.25, kind: 'chime', gain: 0.25, pitch: 1.88 },
    { t: 0.5, kind: 'chime', gain: 0.3, pitch: 2.25 },
    { t: 0.75, kind: 'chime', gain: 0.22, pitch: 1.69 },
    { t: 1, kind: 'chime', gain: 0.3, pitch: 2.5 },
    { t: 1.25, kind: 'chime', gain: 0.25, pitch: 3 },
  ],
};

const TAU = Math.PI * 2;
// Six glints a loop, each in its own sixth of the ring. Glints overlap only with the next one, so the order keeps
// neighbours in time at least a third of a turn apart.
const SECTORS = [0, 2, 5, 3, 1, 4], LIFE = 0.25; // of the loop

export function draw(p, t, o) {
  const C = o.palette, s = o.seed, ph = t / meta.duration;
  SECTORS.forEach((sector, m) => {
    const u = ((ph - m / SECTORS.length + 1) % 1) / LIFE;
    if (u >= 1) return;
    const a = ((sector + 0.25 + rand(m, s) * 0.5) / SECTORS.length) * TAU, r = 6 + rand(m, s, 1) * 6;
    const x = Math.round(Math.cos(a) * r), y = Math.round(Math.sin(a) * r * 0.85);
    const big = 0.6 + 0.4 * rand(m, s, 2), k = (u < 0.16 ? u / 0.16 : 1 - (u - 0.16) / 0.84) * big; // fast attack, slow release
    p.glow(x + 0.5, y + 0.5, 3 + 4 * k, C[5], 0.5 * k);
    if (k < 0.15) return p.px(x, y, C[5]); // dies down to a dot
    const L = Math.round(1 + 4 * k);
    const arm = d => C[Math.abs(d - 0.5) < 0.15 ? 7 : Math.abs(d - 0.5) < 0.32 ? 6 : 4]; // white core, warm tips
    p.line(x - L, y, x + L, y, arm);
    p.line(x, y - L - 1, x, y + L + 1, arm);
    if (k > 0.75) for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) p.line(x + dx, y + dy, x + dx * 2, y + dy * 2, C[4]);
    p.px(x, y, C[7]);
  });
}
