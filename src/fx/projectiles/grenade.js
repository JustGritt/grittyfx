import { rand } from '../../core/index.js';

export const meta = {
  name: 'Grenade',
  desc: 'A thrown grenade tumbling end over end a quarter turn at a time: an olive body lit from above, a pin ring and lever, a fuse spark fizzing and shedding sparks behind',
  tags: ['projectile', 'thrown', 'grenade', 'military', 'physical'],
  stage: { arc: 24, speed: 120, looks: { gather: 'windup', point: 'throw', crouch: 'windup', raise: 'throw' } }, // the soldier lobs it
  size: [44, 32],
  origin: [30, 16],
  duration: 0.4,
  loop: true,
  fps: 20,
  views: ['side', 'top'],
  top: { directions: 8 },
  ramps: { palette: 5, fire: 6, steel: 5 },
  options: { palette: ['#2a3018', '#4f5a30', '#727d49', '#8c9657', '#b5bd85'], fire: 'fire', steel: 'stone', seed: 1 },
  sound: [{ t: 0, kind: 'crackle', gain: 0.3, pitch: 2.2 }], // the fuse fizzing
};

const TURNS = 4; // quarter turns a loop, clockwise: it tumbles forward
// The grenade upright, fuse up, pixel (I0, J0) top left; it turns about the corner (0, 0) at the body's middle.
// # body, f fuse, L lever, o pin ring, p the pin.
const MAP = [
  'ooo.ffL..',
  'o.opffL..',
  'ooo.##.L.',
  '...####L.',
  '..######L',
  '..######L',
  '..######L',
  '..######.',
  '..######.',
  '...####..',
];
const I0 = -5, J0 = -6, FUSE = [0, -6.5]; // where the fuse burns, on top
const LIGHT = [-0.6, -0.8]; // toward the light, upper left
const at = (i, j) => MAP[j - J0]?.[i - I0] ?? '.';
// A pixel turned q quarter turns counterclockwise about the corner (0, 0): from the world back to the grenade.
const back = (i, j, q) => (q ? back(j, -i - 1, q - 1) : [i, j]);
// A position turned q quarter turns clockwise: from the grenade to the world.
const turn = (x, y, q) => (q ? turn(-y, x, q - 1) : [x, y]);

function grenade(p, q, B, S) {
  const [rx, ry] = q % 2 ? [4, 3] : [3, 4]; // the body's half size, in the world
  p.shade(-8, -8, 16, 16, (x, y) => {
    const X = Math.round(x), Y = Math.round(y), [i, j] = back(X, Y, q), k = at(i, j);
    if (k === '.') return 0;
    const cx = X + 0.5, cy = Y + 0.5; // the pixel's center in the world
    if (k === '#') {
      // lit as an egg from the upper left whichever way it points; a darker rim, the groove round its waist
      const nx = cx / rx, ny = cy / ry, lit = nx * LIGHT[0] + ny * LIGHT[1];
      const rim = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => at(i + a, j + b) !== '#');
      if (rim) return B[lit > 0.35 ? 2 : lit > -0.2 ? 1 : 0];
      const c = lit > 0.5 ? 4 : lit > 0 ? 3 : lit > -0.45 ? 2 : 1;
      return B[j === 0 && c > 1 ? c - 1 : c];
    }
    if (k === 'o') { // the ring, lit on its upper left
      const [ox, oy] = turn(-3.5, -4.5, q), lit = (cx - ox) * LIGHT[0] + (cy - oy) * LIGHT[1];
      return S[lit > 0.5 ? 4 : lit > -0.5 ? 3 : 2];
    }
    if (k === 'p') return S[1];
    if (k === 'f') { // the fuse head
      const [fx, fy] = turn(0, -5, q);
      return S[(cx - fx) * LIGHT[0] + (cy - fy) * LIGHT[1] > 0 ? 4 : 2];
    }
    return S[3]; // the lever
  });
}

export function draw(p, t, o) {
  const B = o.palette, F = o.fire, S = o.steel, s = o.seed, ph = t / meta.duration;
  const quarter = v => ((Math.floor(v * TURNS + 1e-6) % TURNS) + TURNS) % TURNS, q = quarter(ph);
  const g = o.view === 'top' ? 0 : 250; // seen from above, nothing falls

  // sparks spat out of the fuse where it pointed as they left, then left behind by the air as the grenade flies on,
  // falling and cooling to a dot
  for (let n = 0; n < 12; n++) {
    const k = 3, u = (ph * k + (n + 0.6 * rand(n, s)) / 12) % 1, qb = quarter(ph - u / k); // u: 0 at birth, 1 at death
    const [x0, y0] = turn(...FUSE, qb), [dx, dy] = turn(0, -1, qb), out = 20 + 35 * rand(n, s, 1), side = (rand(n, s, 2) - 0.5) * 40;
    const vx = dx * out - dy * side, vy = dy * out + dx * side;
    const pos = a => [x0 + vx * a - 700 * a * a, y0 + vy * a + 0.5 * g * a * a];
    const age = u * (meta.duration / k), [x, y] = pos(age);
    if (u < 0.75) p.line(...pos(Math.max(0, age - 0.025)), x, y, F[u < 0.3 ? 5 : u < 0.55 ? 4 : 3]);
    else p.px(x, y, F[2]);
  }

  grenade(p, q, B, S);

  // the fuse spark: a white-hot point in a star of yellow arms, now and then one shooting long, sputtering every frame
  const f = Math.floor(ph * 8 + 1e-6), fl = rand(f, s, 3), [fx, fy] = turn(...FUSE, q);
  p.glow(fx, fy, 5, F[4], 0.25 + 0.15 * fl);
  for (const [a, [ax, ay]] of [[1, 0], [-1, 0], [0, 1], [0, -1]].entries()) {
    const r = rand(a, f, s);
    if (r < 0.6) p.px(fx + ax, fy + ay, F[4]);
    if (r < 0.2) p.px(fx + 2 * ax, fy + 2 * ay, F[3]);
  }
  p.px(fx, fy, F[5]);
}
