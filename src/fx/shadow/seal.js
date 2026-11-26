import { rand } from '../../core/index.js';

export const meta = {
  name: 'Seal',
  desc: 'A hand seal released: motes drawn into the hands, a white flash with a cross of light, a ring of glyph ticks snapping outward and a thin shock ring',
  tags: ['shadow', 'seal', 'ninja', 'jutsu', 'buff', 'flash', 'glyph'],
  size: [56, 56],
  origin: [28, 28],
  duration: 0.6,
  loop: false,
  fps: 30,
  views: ['side'],
  ramps: { palette: 8 },
  options: { palette: 'arcane', seed: 1 },
  act: { windup: 0.3, hits: [{ t: 3 / 30, freeze: 0.04, shake: 1 }] },
  stage: { at: 'caster', ground: 24, x: 7 }, // at the kunoichi's hands in her seal pose
  sound: [
    { t: 0, kind: 'whoosh', gain: 0.5, pitch: 1.8 }, // the gather
    { t: 3 / 30, kind: 'chime', gain: 0.6, pitch: 1.3 }, // the release
    { t: 3 / 30, kind: 'crack', gain: 0.35, pitch: 1.6 },
  ],
};

const TAU = Math.PI * 2;
const HIT = 3 / 30; // the flash
const TICKS = 16;
const out = (u, k) => 1 - Math.exp(-u / k); // fast out, slow settle

export function draw(p, t, o) {
  const C = o.palette, s = o.seed;

  // the gather: motes streaking into the hands
  if (t < HIT) {
    const u = t / HIT;
    p.glow(0, 0, 6 + 4 * u, C[5], 0.3 + 0.4 * u);
    for (let i = 0; i < 6; i++) {
      const a = ((i + 0.4 * rand(i, s)) * TAU) / 6, r = 15 * (1 - u) + 2, c = Math.cos(a), n = Math.sin(a);
      p.line(c * (r + 4), n * (r + 4), c * r, n * r, w => C[w > 0.5 ? 7 : 5]);
    }
    p.px(0, 0, C[7]);
    return;
  }

  const u = t - HIT, life = meta.duration - HIT, k = 1 - u / life; // k: 1 at the flash, 0 at the end

  // light: a flare at the flash, dying fast, then a faint afterglow
  p.glow(0, 0, 22, C[5], 0.9 * Math.exp(-u / 0.06) + 0.15 * k * k);

  // the flash: a white core and a cross of light, longest on the hit frame
  if (u < 0.1) {
    const f = 1 - u / 0.1, arm = 4 + 12 * f;
    p.circle(0.5, 0.5, 2 + 2 * f, C[u < 1 / 30 ? 7 : 6]);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.line(dx * 2, dy * 2, dx * arm, dy * arm, w => C[w < 0.5 ? 7 : 5]);
    if (u < 0.05) for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) p.line(dx * 2, dy * 2, dx * arm * 0.4, dy * arm * 0.4, C[6]); // shorter diagonals on the hero frame
  } else if (u < 0.2) p.px(0, 0, C[6]);

  // the shock ring: thin and fast, out past the ticks and gone in a few frames
  if (u < 0.13) p.ring(0.5, 0.5, 6 + 20 * out(u, 0.04), 1, C[u < 0.07 ? 6 : 4]);

  // the glyph ticks: snapping out round the hands, turning a little, cooling down the ramp, shrinking to dots
  const r = 5 + 12 * out(u, 0.05) + 6 * u, turn = 0.35 * out(u, 0.15), step = Math.max(2, Math.round(7 * k ** 0.6));
  for (let i = 0; i < TICKS; i++) {
    const a = (i * TAU) / TICKS + turn, c = Math.cos(a), n = Math.sin(a), rr = r * (0.92 + 0.08 * rand(i, s));
    const left = k - 0.3 * rand(i, s, 1); // they go one by one at the end
    if (left <= 0) continue;
    if (i % 2) p.px(c * rr, n * rr, C[step]); // a rune dot between the dashes
    else {
      const len = left > 0.35 ? 3 : left > 0.15 ? 2 : 0;
      p.line(c * rr, n * rr, c * (rr + len), n * (rr + len), w => C[w > 0.5 ? step : Math.max(1, step - 1)]);
    }
    p.light(c * rr, n * rr, C[5], 0.3 * k);
  }
}
