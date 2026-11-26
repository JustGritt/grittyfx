import { rand } from '../../core/index.js';

const TAU = Math.PI * 2;
const DURATION = 2.4;
// The crust, clockwise from the bottom left: rough sides, a crown of crystal points over the head.
const SHELL = [[-12, 0], [-13, -4], [-16, -9], [-12, -11], [-12, -16], [-15, -23], [-9, -21], [-7, -29], [-4, -24], [0, -33], [3, -25], [7, -29], [8, -21], [13, -20], [10, -14], [10, -9], [14, -6], [11, -3], [11, 0]];
const X0 = -17, Y0 = -34, BW = 33, BH = 34; // the box around it

function inPoly(x, y) {
  let c = false;
  for (let i = 0, j = SHELL.length - 1; i < SHELL.length; j = i++) {
    const [xi, yi] = SHELL[i], [xj, yj] = SHELL[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
// Depth of each pixel in the crust: 1 on its edge (the floor is not an edge), 2 next to it, 3 deeper; 0 outside.
const DEPTH = new Uint8Array(BW * BH);
const at = (x, y) => (x < X0 || y < Y0 || x >= X0 + BW || y >= Y0 + BH ? 0 : DEPTH[(y - Y0) * BW + x - X0]);
for (let y = Y0; y < Y0 + BH; y++) for (let x = X0; x < X0 + BW; x++) DEPTH[(y - Y0) * BW + x - X0] = inPoly(x + 0.5, y + 0.5) ? 3 : 0;
for (const d of [1, 2]) {
  const ring = [];
  for (let y = Y0; y < Y0 + BH; y++) {
    for (let x = X0; x < X0 + BW; x++) {
      const n = [at(x - 1, y), at(x + 1, y), at(x, y - 1), y === -1 ? 3 : at(x, y + 1)];
      if (at(x, y) === 3 && n.some(v => v === d - 1)) ring.push([x, y]);
    }
  }
  for (const [x, y] of ring) DEPTH[(y - Y0) * BW + x - X0] = d;
}
// Facets: the crust is cut into flat faces, each pixel belonging to the nearest of these centers [x, y, step of
// light, a point of the crown]. Two to each point, lit up-left and shadowed, so a ridge runs down its middle.
const FACETS = [
  [-1.5, -28, 6, 1], [1.5, -28, 4, 1], [-8.5, -25, 6, 1], [-5.5, -25, 4, 1], [5, -25, 5, 1], [7.5, -24, 3, 1],
  [-13, -21.5, 6, 1], [-12, -18.5, 4, 1], [11, -20.5, 5, 1], [11, -17, 3, 1], [-14, -10.5, 5, 1], [-14, -7, 4, 1],
  [12, -7, 4, 1], [12, -4.5, 3, 1],
  [-6, -15, 5, 0], [1, -18, 5, 0], [5, -12, 3, 0], [-6, -5, 4, 0], [3, -5, 3, 0],
];
const FACET = new Int8Array(BW * BH);
for (let y = Y0; y < Y0 + BH; y++) {
  for (let x = X0; x < X0 + BW; x++) {
    let best = 0, bd = Infinity;
    FACETS.forEach(([fx, fy], i) => {
      const d = (x + 0.5 - fx) ** 2 + (y + 0.5 - fy) ** 2;
      if (d < bd) (bd = d), (best = i);
    });
    FACET[(y - Y0) * BW + x - X0] = best;
  }
}
const facet = (x, y) => FACET[(y - Y0) * BW + x - X0];

// Glints: a point of the crust where light catches, and when in the loop it twinkles.
const GLINTS = [[0, -32, 0.05], [-14, -22, 0.3], [12, -19, 0.55], [-7, -28, 0.72], [-15, -9, 0.88]];

export const meta = {
  name: 'Frozen',
  desc: 'A frozen status over a body: a jagged crust of translucent ice from the feet up, light sliding across it, glints twinkling on its points, cold haze pouring off it',
  tags: ['status', 'ice', 'frozen', 'freeze', 'frost', 'debuff', 'cold'],
  size: [56, 46],
  origin: [28, 39],
  duration: DURATION,
  loop: true,
  fps: 15,
  views: ['side'],
  ramps: { palette: 8 },
  options: { palette: 'ice', seed: 1 },
  stage: { at: 'target', ground: 0 }, // over the whole body, from its feet
  sound: [
    ...GLINTS.map(([, , ph], i) => ({ t: ph * DURATION, kind: 'chime', gain: 0.2 + 0.06 * (i % 2), pitch: [2.6, 3, 2.3, 2.8, 3.3][i] })),
    { t: 0.4 * DURATION, kind: 'crack', gain: 0.15, pitch: 2.6 }, // the ice creaks
  ],
};

const ease = u => u * u * (3 - 2 * u);

// Cold air spills off the sides, sinks to the floor and creeps outward in flat wisps, swelling and thinning.
function haze(p, C, ph, s, back) {
  for (let j = 0; j < 6; j++) {
    if ((j % 3 !== 0) !== back) continue;
    const u = (ph + j / 6 + 0.1 * rand(j, s)) % 1, side = j % 2 ? 1 : -1, fall = ease(Math.min(1, u / 0.4));
    const x = side * (11 + 10 * ease(u)), y = -12 + 10.5 * fall, rx = 2 + 4.5 * u, ry = 1.5 + 1.2 * u;
    const a = (back ? 0.3 : 0.2) * Math.sin(Math.PI * u) ** 1.5;
    p.shade(Math.floor(x - rx), Math.floor(y - ry), Math.ceil(2 * rx) + 1, Math.ceil(2 * ry) + 1, (px, py) => {
      const dx = (px + 0.5 - x) / rx, dy = (py + 0.5 - y) / ry;
      return dx * dx + dy * dy < 1 ? C[dy < -0.2 ? 6 : 5] : 0;
    }, (px, py) => a * (1 - ((px + 0.5 - x) / rx) ** 2 - ((py + 0.5 - y) / ry) ** 2));
  }
}

export function drawBack(p, t, o) {
  const C = o.palette, s = o.seed, ph = t / DURATION;
  p.glow(-1, -14, 20, C[4], 0.16 + 0.04 * Math.sin(TAU * ph));
  p.glowLine(-14, 0, 13, 0, 4, C[5], (u, d) => 0.25 * Math.sin(Math.PI * u) * (1 - d) ** 2); // the floor, lit cold
  haze(p, C, ph, s, true);
}

export function draw(p, t, o) {
  const C = o.palette, s = o.seed, ph = t / DURATION;
  // the sheen: a band of light sliding down across the crust once a loop, quick through the middle
  const sweep = ph < 0.45 ? -42 + 56 * ease(ph / 0.45) : 99;
  p.shade(X0, Y0, BW, BH, (x, y) => {
    const d = at(x, y), q = x + y; // the band runs up-right, /
    if (!d) return 0;
    if (Math.abs(q - sweep) < 1) return C[7];
    if (d === 1) return C[!at(x - 1, y) || !at(x, y - 1) ? (y < -24 ? 7 : 6) : 3];
    if (Math.abs(q - sweep) < 2.5) return C[6];
    const [, , k, point] = FACETS[facet(x, y)];
    return C[d === 2 && !point ? Math.max(5, k) : k];
  }, (x, y) => {
    const d = at(x, y), q = x + y;
    if (Math.abs(q - sweep) < 1) return 0.75;
    if (Math.abs(q - sweep) < 2.5) return 0.5;
    return d === 1 ? 0.95 : FACETS[facet(x, y)][3] ? 0.6 : d === 2 ? 0.5 : 0.3;
  });
  // the glare: two streaks on the lit side
  p.line(-9, -12, -6, -15, C[7], 0.8);
  p.line(-9, -9, -4, -14, C[6], 0.6);
  for (let y = Y0; y < 0 && sweep < 99; y++) if (at(Math.round(sweep) - y, y)) p.light(Math.round(sweep) - y, y, C[7], 0.35);
  // frost on the floor round the feet
  p.line(-16, 0, 14, 0, u => C[u < 0.1 || u > 0.9 ? 4 : 5], u => Math.min(1, Math.sin(Math.PI * u) * 2.5));
  for (const [x, h] of [[-15, 2], [-14, 1], [12, 1], [13, 3]]) p.line(x, -1, x, -h, C[6]);
  // motes of frost drifting down around it
  for (let j = 0; j < 6; j++) {
    const u = (ph + rand(j, s)) % 1, x = (rand(j, s, 1) - 0.5) * 34 + Math.sin(TAU * (u + rand(j, s, 2))) * 1.5, y = -34 + 34 * u;
    p.dot(x, y, C[rand(j, Math.floor(u * 12), s) < 0.3 ? 7 : 6], Math.min(1, Math.sin(Math.PI * u) * 2));
  }
  // glints twinkling on the points of the crust, one after another
  for (const [x, y, t0] of GLINTS) {
    const u = ((((ph - t0) % 1) + 1) % 1) / 0.12;
    if (u >= 1) continue;
    const g = Math.sin(Math.PI * u), arm = g > 0.6 ? 2 : 1;
    for (let d = 1; d <= arm; d++) for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d]]) p.px(x + dx, y + dy, C[d === arm ? 5 : 6]);
    p.px(x, y, C[7]);
    p.light(x, y, C[7], 0.7 * g);
    p.glow(x + 0.5, y + 0.5, 5, C[6], 0.3 * g);
  }
  haze(p, C, ph, s, false);
}
