import { rand } from '../../core/index.js';

// The volley: where each arrow lands (px from the anchor), when, whether it is behind the target, px right per row
// fallen (steep, from the archer's side), rows its point sinks into the floor, and its hit's shake when it strikes the
// target: three do, two behind it and the last pinning it from in front, sunk deep; the rest stand clear either side.
const VOLLEY = [
  [-13, 0.14, false, 1 / 2, 4], [2, 0.2, true, 1 / 2, 3, 1], [12, 0.25, false, 1 / 3, 5], [-5, 0.3, true, 2 / 5, 4, 1],
  [7, 0.34, true, 1 / 2, 6], [-19, 0.39, false, 1 / 3, 3], [-1, 0.44, false, 2 / 5, 7, 2], [17, 0.48, true, 2 / 5, 4],
];
const HITS = VOLLEY.filter(v => v[5]);

export const meta = {
  name: 'Arrow rain',
  desc: 'A volley falling out of the sky: arrows streak down steeply across the target one after another and thud into the floor around it, quivering, dust and grit kicked up, then stand there and fade',
  tags: ['projectile', 'arrow', 'bow', 'volley', 'rain', 'physical'],
  size: [82, 70],
  origin: [52, 66],
  duration: 1.2,
  loop: false,
  fps: 30,
  views: ['side'],
  ramps: { palette: 8, wood: 6, steel: 6, dust: 8 },
  options: { palette: 'blood', wood: 'dust', steel: 'stone', dust: 'dust', seed: 1 },
  // falls round the target from its feet; nobody acts it (in the Arrow rain move, the archer has shot it up just before)
  stage: { at: 'target', ground: 0, cast: 'archer', pose: null },
  act: { hits: HITS.map(([, t, , , , shake]) => ({ t, freeze: 0.02 + 0.02 * shake, shake })) },
  sound: [
    { t: 0, kind: 'whoosh', gain: 0.4, pitch: 1.1 }, // the volley whistling in
    ...VOLLEY.map(([, t], i) => ({ t, kind: 'crack', gain: 0.3, pitch: 1.6 + 0.15 * (i % 3) })), // thuds into the floor
    ...HITS.map(([, t]) => ({ t, kind: 'thump', gain: 0.5, pitch: 1.3 })),
  ],
};

const TOP = -meta.origin[1];
const LEN = 15; // rows from point to nock
const V = 420; // px/s down
const FADE = [0.95, 1.15]; // the stuck arrows darken and dissolve

const out = (t, k) => 1 - Math.exp(-t / k);

// One arrow falling, its point at (x, y): a steel point and barbs, the shaft, fletching, a streak of air above it.
// Rows above the canvas or in the floor are left out. `wob` bends the shaft above the floor (it quivers once it
// sticks); `a` fades it, two steps down its ramps and dissolving.
function arrow(p, x, y, m, o, air, wob = 0, a = 1) {
  const dim = Math.round(2 * (1 - a)), at = (R, i) => R[Math.max(0, i - dim)], C = o.palette, W = o.wood, S = o.steel;
  for (let k = 0; k <= LEN + air; k++) {
    const py = y - k, px = Math.floor(x - m * k + (wob * Math.max(0, -py)) / LEN);
    if (py < TOP || py >= 0) continue;
    if (k > LEN) p.blend(px, py, S[5], 0.5 * (1 - (k - LEN) / (air + 1)));
    else if (k === 0) p.dot(px, py, at(S, 5), a);
    else if (k === 1) [[-1, 2], [0, 4], [1, 3]].forEach(([d, i]) => p.dot(px + d, py, at(S, i), a));
    else if (k === LEN) p.dot(px, py, at(W, 1), a);
    else {
      p.dot(px, py, at(W, 4), a);
      if (k >= LEN - 4) (p.dot(px - 1, py, at(C, k < LEN - 1 ? 3 : 4), a), p.dot(px + 1, py, at(C, k < LEN - 1 ? 5 : 6), a));
    }
  }
}

// A puff of dust lit from up-left.
function puff(p, D, x, y, r, a) {
  p.disc(x, y, r, (dx, dy) => D[dx + dy < -r * 0.5 ? 4 : Math.hypot(dx, dy) > r * 0.8 ? 2 : 3], (dx, dy, d) => a * (1 - d * d * d));
}

function volley(p, t, o, back) {
  const D = o.dust, s = o.seed;
  const fade = t < FADE[0] ? 1 : Math.max(0, 1 - (t - FADE[0]) / (FADE[1] - FADE[0]));
  VOLLEY.forEach(([lx, T, behind, m, depth], j) => {
    if (behind !== back) return;
    const a = t - T; // age since it landed
    if (a < 0) {
      const fall = -a * V; // rows still to fall
      arrow(p, lx - m * fall, -fall, m, o, Math.min(14, Math.round(((T + a) * V) / 4)));
      return;
    }
    // stuck: the point sunk in the floor, the shaft quivering for a few frames
    const wob = 1.8 * Math.exp(-a / 0.07) * Math.cos(a * Math.PI * 30);
    if (fade > 0) arrow(p, lx + m * depth, depth, m, o, 0, wob, fade);
    if (fade > 0) p.dot(lx, 0, D[1], 0.7 * fade), p.dot(lx + 1, 0, D[2], 0.5 * fade); // dirt round the hole
    // dust kicked up either side of it, on along the way it was going more
    if (a < 0.3) {
      for (const [side, k] of [[1, 1], [-1, 0.6]]) {
        const d = (1 + 4 * k * out(a, 0.05)) * side, r = (1.2 + 0.8 * k * out(a, 0.08)) * (0.8 + 0.4 * rand(j, s, side));
        puff(p, D, lx + d, -1 - (0.5 + 2.5 * k) * out(a, 0.08), r, 0.95 * (1 - a / 0.3) ** 1.5);
      }
    }
    // grit thrown up, falling back
    if (!back && a < 0.3) {
      for (let g = 0; g < 2; g++) {
        const vx = (g ? 26 : -14) * (0.7 + 0.6 * rand(j, g, s)), vy = -70 - 30 * rand(j, g, s + 1);
        const y = vy * a + 450 * a * a;
        if (y < 0) p.px(lx + 1 + vx * a, y, D[g ? 2 : 3]);
      }
    }
  });
}

export function drawBack(p, t, o) {
  volley(p, t, o, true);
}

export function draw(p, t, o) {
  volley(p, t, o, false);
}
