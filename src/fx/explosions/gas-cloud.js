import { rand } from '../../core/index.js';

const TAU = Math.PI * 2;
const DURATION = 3;

export const meta = {
  name: 'Gas cloud',
  desc: 'Tear gas that lingers: a low, see-through green-grey cloud hugging the floor round the target, lobes creeping out along the ground and thin wisps curling off its top',
  tags: ['gas', 'teargas', 'military', 'cloud', 'zone', 'hazard', 'haze', 'grenade'],
  size: [120, 60],
  origin: [60, 56],
  duration: DURATION,
  loop: true,
  fps: 12,
  views: ['side'],
  ramps: { palette: 8 },
  options: { palette: ['#161a14', '#262d22', '#3a4433', '#525e45', '#6d7a58', '#8e9a70', '#b3bc90', '#dfe3c4'], seed: 1 },
  stage: { at: 'target', ground: 0, looks: { gather: 'windup', point: 'throw', crouch: 'windup', raise: 'throw' } }, // round the target, from its feet
  sound: Array.from({ length: 4 }, (_, i) => ({ t: (i * DURATION) / 4, kind: 'whoosh', gain: 0.12, pitch: i % 2 ? 0.36 : 0.32 })), // a faint hiss
};

const smooth = (e0, e1, x) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
// A see-through lobe on base tone `tone`, lit from above: a broad cap a step brighter over its top, the underside a
// step darker (`flat`: one tone), flat where it sits on the floor. Its edge is crisp, so it reads at 1x, and only the alpha says gas.
function puff(p, C, { x, y, r, a, tone, flat }) {
  if (a <= 0.01 || r < 0.5) return;
  p.disc(x, y, r, (dx, dy) => C[flat ? tone : dy < 0 && Math.hypot(dx + 0.1 * r, dy - 0.45 * r) > 0.9 * r ? tone + 1 : dy > 0.4 * r ? tone - 1 : tone],
    (dx, dy, d) => (y + dy > 0 ? 0 : a * smooth(1, 0.8, d)));
}

// Lobes in fixed slots along the floor, a mound highest round the target, each swaying and breathing on its own
// phase. [x, r]
const BACK = [[-44, 7], [-32, 10], [-18, 13], [-2, 16], [15, 14], [30, 10], [43, 7]];
const FRONT = [[-38, 5], [-23, 7], [-8, 6], [7, 8], [23, 6], [37, 5]];
function sway(list, ph, s, seed, lift, a, tone, flat) {
  return list.map(([x, r], j) => {
    const w = TAU * (ph + rand(j, s, seed)), R = r + Math.sin(w) * 1.2;
    return { x: x + Math.sin(w) * 2, y: -R * lift + Math.cos(2 * w) * 0.8, r: R, a, tone, flat };
  });
}

// The cloud's edges creep out along the floor both ways, swelling and thinning as they go.
function creep(ph, s) {
  const list = [];
  for (let j = 0; j < 6; j++) {
    const side = j % 2 ? 1 : -1, u = (ph + (j + 0.5 * rand(j, s, 6)) / 6) % 1, r = (4 + 2 * rand(j, s, 7)) * (0.7 + 0.6 * u);
    list.push({ x: side * (34 + 16 * u), y: -r * 0.5, r, a: 0.55 * smooth(0, 0.2, u) * (1 - smooth(0.5, 1, u)), tone: 3, flat: true });
  }
  return list;
}

// Wisps curling off the top: small puffs packed close along a curl, so they merge into one tapering tendril that
// rises from the cloud, drifts and thins away, each from its own slot on its own phase.
function wisps(ph, s) {
  const list = [];
  for (let j = 0; j < 3; j++) {
    const u = (ph + (j + 0.4 * rand(j, s, 12)) / 3) % 1, x0 = -18 + j * 18 + 4 * (rand(j, s, 13) - 0.5);
    const dir = rand(j, s, 14) < 0.5 ? -1 : 1, fade = smooth(0, 0.2, u) * (1 - smooth(0.4, 1, u));
    const top = -14 - 0.8 * Math.max(0, 16 - Math.abs(x0)); // the mound's top over this slot
    for (let i = 0; i < 7; i++) {
      const k = i / 6, h = (8 + 14 * u) * k; // the wisp stretches up as it rises
      list.push({
        x: x0 + dir * (4 * u + Math.sin(TAU * (k + 0.5 * u + rand(j, s, 15))) * 5 * k),
        y: top - 6 * u - h, r: (4 - 2.5 * k) * (0.8 + 0.4 * u), a: 0.6 * fade * (1 - 0.4 * k), tone: 4, flat: true,
      });
    }
  }
  return list;
}

export function drawBack(p, t, o) {
  const C = o.palette, s = o.seed, ph = t / DURATION;
  for (const q of wisps(ph, s)) puff(p, C, q);
  for (const q of sway(BACK, ph, s, 3, 0.6, 0.75, 3)) puff(p, C, q);
}

export function draw(p, t, o) {
  const C = o.palette, s = o.seed, ph = t / DURATION;
  for (const q of creep(ph, s)) puff(p, C, q);
  for (const q of sway(FRONT, ph, s, 8, 0.2, 0.55, 3, true)) puff(p, C, q);
}
