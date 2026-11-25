import { rand } from '../../core/index.js';

export const meta = {
  name: 'Double jump',
  desc: 'A kick off thin air: a flash under the feet, a flat ring of air that flares, spreads and breaks into gusts, streaks of air driven down',
  tags: ['jump', 'air', 'ring', 'movement'],
  size: [44, 30],
  origin: [22, 11],
  duration: 0.4,
  loop: false,
  fps: 30,
  views: ['side', 'top'],
  top: { size: [44, 44] },
  ramps: { palette: 8 },
  options: { palette: 'ice', seed: 1 },
  stage: { at: 'ground' }, // the knight kicks off it
  sound: [
    { t: 0, kind: 'whoosh', gain: 0.6, pitch: 1.9 }, // the kick, a short gust
    { t: 0, kind: 'chime', gain: 0.12, pitch: 1.5 },
  ],
};

const TAU = Math.PI * 2;
const out = (t, k) => 1 - Math.exp(-t / k); // fast out, slow settle
const FLAT = 0.3; // the ring seen from the side: its height over its width

// The ring: it flares, spreads and cools down the ramp, its band thinning, then breaks into gusts that blow out one by
// one. From the side it is a flat ellipse; `half` -1 draws its far half (behind the feet), 1 its near half.
function ring(p, t, o, half) {
  const C = o.palette, s = o.seed, grow = Math.min(1, t / 0.25), gone = Math.max(0, (t - 0.12) / 0.22);
  if (gone >= 1) return;
  const r = 3 + 16 * out(t, 0.07), band = 0.42 - 0.3 * grow, tone = Math.round(7 - 4 * grow);
  const keep = (dx, dy) => rand(Math.floor(((Math.atan2(dy, dx) + Math.PI) / TAU) * 12), s, 7) >= gone;
  if (o.view === 'top') return p.ring(0, 0, r * (1 - band / 2), r * band, (dx, dy, e) => C[e > 0 ? tone : tone - 1], (dx, dy) => +keep(dx, dy));
  p.ellipse(0, 0, r, r * FLAT, (dx, dy, d) => C[d > 1 - band / 2 ? tone : tone - 1],
    (dx, dy, d) => +(d > 1 - band && Math.sign(dy || 1) === half && keep(dx, dy / FLAT)));
}

export function drawBack(p, t, o) {
  if (o.view !== 'top') ring(p, t, o, -1);
}

export function draw(p, t, o) {
  const C = o.palette, s = o.seed, top = o.view === 'top';
  if (t < 0.2) p.glow(0, 0, 11, C[6], 0.6 * (1 - t / 0.2) ** 2);
  if (t < 1 / 30) (top ? p.circle(0.5, 0.5, 4, C[7]) : p.ellipse(0.5, 0.5, 6, 1.5, C[7])); // the kick
  ring(p, t, o, 1);
  if (top || t < 1 / 30) return;
  // streaks of air driven down from the feet, fanning out
  for (const [i, x] of [-6, -2, 2, 6].entries()) {
    const life = 0.18 + 0.06 * rand(i, s, 1), u = t / life;
    if (u >= 1) continue;
    const head = 3 + (9 + 5 * rand(i, s, 2)) * out(t, 0.06), tail = Math.max(2, head - 5 * (1 - u)), fan = x * 0.06;
    p.line(x + fan * tail, tail, x + fan * head, head, v => C[v > 0.5 ? 6 : 4], 1 - u * u);
  }
}
