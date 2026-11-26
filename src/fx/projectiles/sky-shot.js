export const meta = {
  name: 'Sky shot',
  desc: 'Two arrows loosed high from the bow one after the other, fanning apart as they streak up out of the top of the frame, air streaming off behind',
  tags: ['projectile', 'arrow', 'bow', 'volley', 'physical'],
  size: [32, 52],
  origin: [6, 46],
  duration: 0.4,
  loop: false,
  fps: 30,
  views: ['side'],
  ramps: { palette: 8, wood: 6, steel: 6 },
  options: { palette: 'blood', wood: 'dust', steel: 'stone', seed: 1 },
  // the anchor is the bow (the archer's tip as she looses), 20 px over the floor; she draws and looses, holding it
  stage: { at: 'caster', cast: 'archer', pose: 'point', x: 15, ground: 20 },
  sound: [
    { t: 0, kind: 'crack', gain: 0.3, pitch: 2.6 }, // the string's snap
    { t: 0, kind: 'whoosh', gain: 0.5, pitch: 1.5 },
  ],
};

const TOP = -meta.origin[1], RIGHT = meta.size[0] - meta.origin[0];
const LEN = 15; // rows from point to nock
// Arrows: px right per row climbed, speed (px/s up), delay, px back on the string.
const ARROWS = [[1 / 3, 430, 0, 0], [1 / 6, 470, 0.033, -1]];

// One arrow climbing, its point at (x, y), `m` px right per row: a steel point and barbs, the shaft, fletching at its
// foot, a streak of air below it. Rows above the canvas are left out: it flies out of the frame.
function arrow(p, x, y, m, C, W, S, air) {
  for (let k = 0; k <= LEN + air; k++) {
    const py = y + k, px = Math.floor(x - m * k);
    if (py < TOP || px >= RIGHT) continue;
    if (k > LEN) p.blend(px, py, S[5], 0.5 * (1 - (k - LEN) / (air + 1)));
    else if (k === 0) p.px(px, py, S[5]);
    else if (k === 1) [[-1, S[3]], [0, S[4]], [1, S[2]]].forEach(([d, c]) => p.px(px + d, py, c));
    else if (k === LEN) p.px(px, py, W[1]);
    else {
      p.px(px, py, W[4]);
      if (k >= LEN - 4) (p.px(px - 1, py, C[k < LEN - 1 ? 5 : 6]), p.px(px + 1, py, C[k < LEN - 1 ? 3 : 4]));
    }
  }
}

export function draw(p, t, o) {
  const C = o.palette, W = o.wood, S = o.steel;
  for (const [m, v, delay, dx] of ARROWS) {
    const u = t - delay;
    if (u < 0) continue;
    const rise = v * u * (1 - u); // a little slower as it climbs; its nock leaves the string on the first frame
    arrow(p, dx + m * (rise + LEN), -LEN - rise, m, C, W, S, Math.min(12, Math.round(rise / 3)));
  }
}
