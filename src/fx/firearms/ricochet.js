import { Rng, Particles, Lights, SPARK } from '../../core/index.js';

export const meta = {
  name: 'Ricochet',
  desc: 'A round glancing off metal: a white-gold star on contact, a spray of hot sparks, and the round skipping away up and back as a short streak that arcs off',
  tags: ['impact', 'hit', 'firearm', 'military', 'ricochet', 'bullet', 'deflect', 'armor', 'shield', 'metal', 'spark', 'gun'],
  size: [64, 48],
  origin: [44, 30],
  duration: 0.42, // the ping rings to the end
  loop: false,
  fps: 30,
  views: ['side'],
  ramps: { palette: 8 },
  options: { palette: 'gold', seed: 1 },
  act: { windup: 0.12, hits: [{ t: 1 / 30, freeze: 0.06, shake: 2 }] },
  sound: [
    { t: 1 / 30, kind: 'crack', gain: 0.7, pitch: 2.2 },
    { t: 1 / 30, kind: 'chime', gain: 0.55, pitch: 2.6 }, // the metallic ping
    { t: 1 / 30 + 0.02, kind: 'whoosh', gain: 0.18, pitch: 2.4 }, // the round whining off
  ],
};

const HERO = 1 / 30; // the white frame, where the round strikes
const AT = HERO - 1 / 240; // half a step early, so what flares on the hero frame is there on it
const GROUND = 11; // the floor, below the contact
const V = [-200, -150], G = 700, LIFE = 0.19, TRAIL = 0.05; // the round skipping off: px/s, fall px/s², s, streak in s
const STAR = 0.14; // the star's life after the hero frame
const HOT = 0.32; // how long the struck spot glows

const off = s => [V[0] * s, V[1] * s + (G * s * s) / 2]; // where the skipping round is, s after it leaves

// The star: the round arriving, the white-gold hero star, then a star that shrinks and cools, and the struck spot
// cooling after it.
function flash(p, t, C) {
  if (t < HERO) return p.line(-8, 0, 0, 0, u => C[u < 0.5 ? 5 : 7]);
  const s = t - HERO;
  if (s < HOT) p.px(0, 0, C[Math.round(6 - 3 * (s / HOT))]);
  if (t < HERO * 2) {
    p.circle(0.5, 0.5, 2.2, C[7]);
    for (const [dx, dy] of [[-10, 0], [8, 0], [0, -8], [0, 8]]) p.line(0, 0, dx, dy, u => C[u < 0.5 ? 7 : 6]);
    for (const [dx, dy] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) p.line(0, 0, dx, dy, C[6]);
  } else if (s < STAR) { // it twinkles: a smaller +, then an x, shrinking and cooling
    const u = s / STAR, l = (1 - u) ** 1.2, x = u >= 0.5;
    p.px(0, 0, C[u < 0.5 ? 7 : 6]);
    for (const [dx, dy] of x ? [[-4, -4], [4, -4], [-4, 4], [4, 4]] : [[-6, 0], [5, 0], [0, -5], [0, 5]]) {
      p.line(0, 0, dx * l, dy * l, w => C[w < 0.4 ? 6 : 5]);
    }
  }
}

// The round skipping away: a streak along its arc, white-hot at the head, cooling behind, thinning out at the end.
function skip(p, t, C) {
  const s = t - HERO;
  if (s <= 0 || s >= LIFE) return;
  const fade = Math.min(1, (LIFE - s) / (LIFE * 0.4)), [hx, hy] = off(s);
  const cool = Math.round(2 * (1 - fade)); // dying, it shortens and cools rather than breaking up
  for (let k = 0; k <= 16; k++) {
    const u = k / 16, [x, y] = off(Math.max(0, s - TRAIL * (0.4 + 0.6 * fade) * u));
    p.dot(x, y, C[(u < 0.15 ? 7 : u < 0.4 ? 6 : u < 0.7 ? 5 : 4) - cool], u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3);
    if (u < 0.2 && fade > 0.5) p.px(x, y - 1, C[6 - cool]); // the head 2 px thick: it is the round, not a spark
  }
  const [tx, ty] = off(Math.max(0, s - TRAIL * 0.6));
  p.glowLine(tx, ty, hx, hy, 4, C[6], (u, d) => 0.4 * fade * u * (1 - d) ** 2);
}

export function create(o) {
  const rng = new Rng(o.seed), C = o.palette;
  const parts = new Particles({ rng, palette: C, ground: GROUND });
  const lights = new Lights();
  lights.add(0, 0, 14, C[6], 0.8, 0.16, { delay: AT });
  lights.add(0, 0, 7, C[7], 1, 0.06, { delay: AT });
  for (let i = 0; i < 12; i++) { // hot sparks, each in its own slot of a fan: most up the metal's face, a few down
    const up = i < 8, a = up ? -2.3 + (1.2 * (i + rng.next())) / 8 : 1.85 + (0.8 * (i - 8 + rng.next())) / 4;
    const v = rng.range(80, 160);
    parts.spawn(SPARK, Math.cos(a) * 3, Math.sin(a) * 3, Math.cos(a) * v, Math.sin(a) * v, rng.range(0.12, 0.26), { delay: HERO + (i % 3) / 120 });
  }
  let t = 0, n = 0;
  return {
    update(dt) {
      t = ++n * dt; // counted, not summed: a sum of 1/120 steps drifts below the frame times
      parts.update(dt);
      lights.update(dt);
    },
    draw(p) {
      lights.draw(p);
      parts.draw(p);
      skip(p, t, C);
      flash(p, t, C);
    },
  };
}
