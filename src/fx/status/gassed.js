import { rand, tileFbm } from '../../core/index.js';

const TAU = Math.PI * 2;
const DURATION = 2.4;
// Coughs, in two fits: when each comes and how hard. Each throws puffs out of the mouth, forward (-x: the way the
// stage's goblin faces; flip it for a character facing right).
const COUGHS = [[0, 1], [0.2, 0.8], [0.42, 0.65], [1.35, 0.9], [1.56, 0.7]];
const MOUTH = [-5, -15];
const K = 5; // drag on a puff, 1/s: how fast its jet dies
const LIFE = 1.7; // seconds a puff lasts

export const meta = {
  name: 'Gassed',
  desc: 'A tear gas status over a body: fits of coughing throw grey puffs out of the mouth in jerks, a thin haze hangs round the body',
  tags: ['status', 'debuff', 'gas', 'teargas', 'cough', 'choke', 'smoke', 'haze'],
  size: [48, 40],
  origin: [29, 36],
  duration: DURATION,
  loop: true,
  fps: 15,
  views: ['side'],
  ramps: { palette: 8 },
  options: { palette: 'smoke', seed: 1 },
  stage: { at: 'target', ground: 0 }, // round the whole body, from its feet
  sound: COUGHS.flatMap(([t, k]) => [
    { t, kind: 'crack', gain: 0.22 * k, pitch: 0.85 }, // the bark of a cough
    { t, kind: 'thump', gain: 0.15 * k, pitch: 1.4 },
  ]),
};

const age = (t, t0) => (((t - t0) % DURATION) + DURATION) % DURATION;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// The puffs of a cough, [angle down from straight out, speed, radius it swells to]: the big one out front, the
// others up, down and trailing, so the cloud has a broken edge.
const PUFFS = [[0.1, 85, 4.6], [-0.3, 62, 3.4], [0.42, 52, 3], [0.05, 34, 3.6]];

// Puff j of cough c, a seconds after it.
function puff(c, j, a, s) {
  const k = COUGHS[c][1], r0 = rand(c, j, s), r1 = rand(c, j, s + 1), [dir, speed, size] = PUFFS[j];
  const ang = dir + (r0 - 0.5) * 0.25, v = k * speed * (0.85 + 0.3 * r1);
  const go = (1 - Math.exp(-K * a)) / K, u = a / LIFE;
  return {
    x: MOUTH[0] - Math.cos(ang) * v * go + 3 * u * u, // it stalls, then drifts back into the haze
    y: MOUTH[1] + Math.sin(ang) * v * go - 7 * u * u - 2 * u + Math.sin(TAU * (u + r0)) * 0.8,
    r: 1 + size * k * (1 - Math.exp(-2.4 * a)) + 2 * u, // it keeps swelling as it thins
    a: 0.8 * (1 - u) ** 1.6 * Math.min(1, a / 0.03),
    u,
  };
}

// A rolling puff, lit up-left and shadowed down-right; hot white as it is barked out, greying down the ramp as it thins.
function drawPuff(p, C, { x, y, r, a, u }) {
  const cool = u < 0.06 ? -1 : u < 0.25 ? 0 : u < 0.55 ? 1 : 2, lit = r > 2.5 ? -r * 0.5 : -Infinity; // small ones unlit, so a cluster isn't a bunch of grapes
  p.disc(x, y, r, (dx, dy) => C[(dx + dy < lit ? 6 : dx + dy > r * 0.35 ? 4 : 5) - cool], (dx, dy, d) => a * (1 - d * d));
}

// The haze: thin wisps of gas hanging round the body, drifting sideways, one layer each way. 0 to 1.
function mist(x, y, ph, s, dir) {
  const ex = x / 17, ey = (y + 11) / 12, e = ex * ex + ey * ey;
  if (e >= 1) return 0;
  return clamp((tileFbm(x * 0.09 + dir * ph * 3, y * 0.4, 3, 2, s) - 0.4) * 3, 0, 1) * (1 - e);
}

function haze(p, C, ph, s, back) {
  // in front, only low down and round the edges, so the face stays clear
  const veil = back ? () => 1 : (x, y) => clamp((y + 6) / 5, 0, 1) + clamp((Math.abs(x) - 8) / 4, 0, 1);
  const m = (x, y) => mist(x, y, ph, s + (back ? 0 : 9), back ? -1 : 1) * Math.min(1, veil(x, y));
  p.shade(-17, -23, 34, 24, (x, y) => C[m(x, y) > 0.4 ? 4 : 3], (x, y) => (back ? 0.4 : 0.3) * m(x, y));
}

export function drawBack(p, t, o) {
  haze(p, o.palette, t / DURATION, o.seed, true);
}

export function draw(p, t, o) {
  const C = o.palette, s = o.seed, ph = t / DURATION;
  haze(p, C, ph, s, false);
  // older puffs first, so the fresh ones come out on top
  const order = COUGHS.map((_, c) => c).sort((c, d) => age(t, COUGHS[d][0]) - age(t, COUGHS[c][0]));
  for (const c of order) {
    const a = age(t, COUGHS[c][0]);
    if (a >= LIFE) continue;
    for (let j = PUFFS.length - 1; j >= 0; j--) drawPuff(p, C, puff(c, j, a, s));
    if (a < 0.13) { // the bark: short strokes flung out of the mouth in a fan
      const k = a / 0.13, [mx, my] = MOUTH;
      for (const ang of [-0.6, 0, 0.6]) {
        const d0 = 3 + 3 * k, d1 = d0 + (ang ? 2 : 3), cx = -Math.cos(ang), cy = Math.sin(ang);
        p.line(mx + cx * d0, my + cy * d0 + 1, mx + cx * d1, my + cy * d1 + 1, C[2]); // a dark underside, for light backgrounds
        p.line(mx + cx * d0, my + cy * d0, mx + cx * d1, my + cy * d1, C[k < 0.5 ? 7 : 6]);
      }
    }
  }
  // a tear runs down from the eye and drips off the cheek
  const ta = age(t, 0.9);
  if (ta < 0.7) {
    const k = ta / 0.7, y = MOUTH[1] - 3 + (k < 0.6 ? 3 * k / 0.6 : 3 + 25 * (k - 0.6) ** 2);
    p.px(MOUTH[0] + 2, y, C[7]);
    if (k < 0.6) p.px(MOUTH[0] + 2, y - 1, C[5]);
  }
}
