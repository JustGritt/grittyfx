import { rand } from '../../core/index.js';

const WASH = 0.5, FLOOR = 0.76, END = 1.7;

export const meta = {
  name: 'Cleanse',
  desc: 'A taint washed off the caster: sickly bubbles and fumes cling to her until light gathered over her head bursts and pours down over her, the taint flung off at her feet and gone in puffs, sparkles left on her',
  tags: ['cleanse', 'cure', 'purify', 'buff', 'holy', 'light', 'magic', 'spell'],
  size: [64, 64],
  origin: [32, 54],
  duration: END,
  loop: false,
  fps: 30,
  views: ['side'],
  ramps: { palette: 8, taint: 8 },
  options: { palette: 'holy', taint: 'poison', seed: 1 },
  act: { hits: [{ t: WASH, freeze: 0.04, shake: 0 }] },
  // on her, from her feet; tainted from the stage's start, before she raises her staff
  stage: { at: 'caster', ground: 0, pose: 'raise', waits: true },
  sound: [
    { t: 0.04, kind: 'thump', gain: 0.18, pitch: 2.8 }, // the taint's bubbles popping
    { t: 0.2, kind: 'thump', gain: 0.16, pitch: 3.2 },
    { t: 0.12, kind: 'chime', gain: 0.18, pitch: 1.5 }, // light gathering
    { t: WASH - 0.12, kind: 'whoosh', gain: 0.3, pitch: 0.9 },
    { t: WASH, kind: 'chime', gain: 0.5 },
    { t: WASH, kind: 'chime', gain: 0.35, pitch: 1.5 },
    { t: FLOOR, kind: 'crack', gain: 0.22, pitch: 1.8 }, // the splash at her feet
    { t: FLOOR, kind: 'chime', gain: 0.25, pitch: 2 },
    { t: FLOOR + 0.3, kind: 'chime', gain: 0.14, pitch: 2.5 },
  ],
};

const TAU = Math.PI * 2;
const F = 1 / 30;
const STAR = -42; // where the light gathers, over the staff held up
const SQ = 0.28;
const BUBBLES = 7, FLECKS = 10, GLINTS = 9;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = u => u * u * (3 - 2 * u);
const OUT = u => 1 - (1 - u) ** 3;

// The front of the light pouring down over her: above it the taint is gone. Before the burst it is over her head.
const front = t => (t < WASH ? STAR : STAR - STAR * clamp((t - WASH) / (FLOOR - WASH)) ** 1.4);

// Bubble j of the taint at time t: rising over her body in its own lane, swelling, popping at the top of its cycle.
function bubble(j, t, s) {
  const per = 0.42 + 0.1 * rand(j, s), v = (t / per + rand(j, s, 1)) % 1, c = Math.floor(t / per + rand(j, s, 1));
  const x = ((j / (BUBBLES - 1)) - 0.5) * 15 + (rand(j, c, s) - 0.5) * 2;
  const y0 = -3 - 21 * rand(j, c, s + 1);
  return { v, x, y: y0 - 9 * OUT(Math.min(1, v / 0.8)), r: 0.6 + 1.6 * smooth(Math.min(1, v * 1.6)) };
}

// Fleck j of the taint, flung off at her feet when the light lands: where it is, or null.
function fleck(j, t, s) {
  const k = t - FLOOR;
  if (k < 0) return null;
  const side = j % 2 ? 1 : -1, x0 = side * (3 + 5 * rand(j, s, 3)), vx = side * (20 + 20 * rand(j, s, 4)), vy = -(20 + 15 * rand(j, s, 5));
  const land = (-vy + Math.sqrt(vy * vy + 4 * 150 * 2)) / 300; // when it comes down to the floor from 2 px up
  const fl = Math.min(k, land);
  return { k, land, x: x0 + vx * fl * (k > land ? 1 : 1), y: Math.min(-1, -2 + vy * fl + 150 * fl * fl) };
}

export function drawBack(p, t, o) {
  const C = o.palette, T = o.taint, s = o.seed, y0 = front(t);
  // the sickly aura on her, washed down and out by the light
  const sick = t < WASH ? 1 : 1 - clamp((t - WASH) / (FLOOR - WASH + 0.1));
  if (sick > 0) p.glow(0, Math.min(-8, Math.max(-14, y0 / 2)), 18 * (0.6 + 0.4 * sick), T[4], 0.22 * sick);
  // fumes curling up off her, cut where the light has passed
  for (let j = 0; j < 5; j++) {
    const v = (t / 0.9 + j / 5) % 1, side = j % 2 ? 1 : -1, a = 0.22 * Math.sin(Math.PI * v) ** 1.5 * sick;
    const x = side * (3 + 4 * rand(j, s)) + Math.sin(TAU * (v + rand(j, s, 1))) * 2.5, y = -14 - v * 24, r = 2 + 3 * v;
    if (a > 0.01 && y > y0) p.disc(x, y, r, (dx, dy) => T[dx + dy < -r * 0.4 ? 5 : 3], (dx, dy, d) => a * (1 - d * d));
  }
  // the light: gathered over her head, then pouring down
  if (t > 0.06 && t < WASH) p.glow(0, STAR, 6 + 6 * smooth(clamp(t / WASH)), C[5], 0.6);
  else if (t >= WASH && t < FLOOR + 0.15) {
    const k = 1 - clamp((t - FLOOR) / 0.15);
    p.glowLine(0, -38, 0, Math.max(-34, Math.min(-6, y0)), 10, C[5], 0.3 * k);
  }
  if (t >= FLOOR && t < FLOOR + 0.4) p.glowLine(-12, -1, 12, -1, 5, C[5], 0.3 * (1 - (t - FLOOR) / 0.4) ** 2);
  if (t >= FLOOR) p.glow(0, -14, 16, C[4], 0.25 * (1 - clamp((t - FLOOR) / (END - 0.2 - FLOOR))) ** 2); // a clean shine
  ring(p, t, C, false);
}

// The ring flaring out over the floor where the light lands.
function ring(p, t, C, front) {
  const v = (t - FLOOR) / 0.4;
  if (v < 0 || v >= 1) return;
  const rx = 6 + 16 * OUT(v), N = 32;
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * TAU, a1 = ((i + 1) / N) * TAU;
    if (Math.sin((a0 + a1) / 2) > 0 === front) p.line(Math.cos(a0) * rx, Math.sin(a0) * rx * SQ - 1, Math.cos(a1) * rx, Math.sin(a1) * rx * SQ - 1, C[(front ? 7 : 6) - Math.floor(v * 4)], Math.min(1, (1 - v) / 0.3));
  }
}

export function draw(p, t, o) {
  const C = o.palette, T = o.taint, s = o.seed, y0 = front(t);

  // the taint's bubbles, below the light's front
  if (t < FLOOR) {
    for (let j = 0; j < BUBBLES; j++) {
      const b = bubble(j, t, s);
      if (b.y <= y0 + 1) {
        if (y0 - b.y < 4) p.px(b.x, b.y, C[7]); // caught by the light: a glint where it was
        continue;
      }
      if (b.v < 0.8) {
        const x = Math.round(b.x), y = Math.round(b.y);
        if (b.r < 1.3) p.px(x, y, T[6]);
        else {
          p.ring(x + 0.5, y + 0.5, b.r - 0.4, 0.9, (dx, dy) => T[dx + dy < -b.r * 0.5 ? 7 : dx + dy > b.r * 0.4 ? 4 : 5]);
          p.px(x, y - 1, T[7]);
        }
        p.light(x, y, T[6], 0.3);
      } else if (b.v < 0.9) { // popped: four bits flying off
        const d = b.r + 1 + 3 * (b.v - 0.8) / 0.1;
        for (let i = 0; i < 4; i++) p.px(b.x + Math.cos(i * TAU / 4 + 0.8) * d, b.y + Math.sin(i * TAU / 4 + 0.8) * d, T[5]);
      }
    }
  }

  // the light gathering over her head: motes drawn in to a star that grows
  if (t > 0.06 && t < WASH) { // not before she starts raising her staff: the stage shows the first frame till then
    const u = smooth(clamp(t / WASH)), arm = Math.round(1 + 3 * u);
    for (let j = 0; j < 6; j++) {
      const v = ((t / 0.3 + j / 6) % 1), a = TAU * (j / 6 + 0.1), r = 12 * (1 - v);
      if (r > 2) p.px(Math.cos(a) * r, STAR + Math.sin(a) * r * 0.8, C[v > 0.6 ? 7 : 5]);
    }
    for (let d = 1; d <= arm; d++) for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d]]) p.px(dx, STAR + dy, C[d === arm ? 5 : 7]);
    p.px(0, STAR, C[7]);
  } else if (t >= WASH && t < WASH + F) { // the burst
    p.circle(0.5, STAR + 0.5, 3.5, C[7]);
    for (let d = 4; d <= 8; d++) for (const [dx, dy] of [[d, 0], [-d, 0], [0, -d]]) p.px(dx, STAR + dy, C[d > 6 ? 5 : 7]);
  }

  // the light pouring down: a curtain of streaks spreading from the burst, their heads the ragged front, the last of
  // them running down into the floor once it lands
  if (t >= WASH && t < FLOOR + 0.15) {
    const tail = clamp((t - FLOOR) / 0.15), spread = 4 + 7 * clamp((y0 - STAR) / -STAR);
    for (let x = -10; x <= 10; x += 2) {
      if (Math.abs(x) > spread) continue;
      const len = 5 + 8 * rand(x + 20, s, 6), lead = Math.round(rand(x + 20, s, 7) * 4);
      const yb = Math.min(-1, Math.round(y0) - lead), ya = Math.max(STAR + 3, yb - Math.round(len * (1 - tail)));
      if (yb - ya < 1) continue;
      const dim = (x / 2) % 2 !== 0 || Math.abs(x) > 7; // every other one and the outer ones fainter, so it isn't a comb
      p.line(x, ya, x, yb, w => C[(w > 0.8 ? 7 : w > 0.4 ? 6 : 5) - (dim ? 1 : 0)]);
      p.light(x, yb, C[6], 0.5 * (1 - tail));
    }
  }

  ring(p, t, C, true);

  // the taint flung off at her feet: flecks that land and go up in small puffs
  for (let j = 0; j < FLECKS; j++) {
    const f = fleck(j, t, s);
    if (!f) continue;
    if (f.k < f.land) {
      p.px(f.x, f.y, T[f.k < f.land * 0.5 ? 7 : 6]);
      p.px(f.x - Math.sign(f.x), f.y + 1, T[4]);
    } else {
      const v = (f.k - f.land) / 0.45;
      if (v >= 1) continue;
      const r = 1 + 2.5 * v;
      p.disc(f.x, -1.5 - 5 * v, r, (dx, dy) => T[dx + dy < -r * 0.3 ? 5 : 3], (dx, dy, d) => 0.55 * (1 - v) * (1 - d * d));
    }
  }

  // clean: sparkles popping on her, one after another
  for (let j = 0; j < GLINTS; j++) {
    const v = (t - FLOOR - 0.05 - (j / GLINTS) * 0.55) / 0.3;
    if (v < 0 || v >= 1) continue;
    const x = Math.round((rand(j, s, 9) - 0.5) * 16), y = Math.round(-4 - 22 * rand(j, s, 10) - 6 * v), arm = v < 0.3 ? 2 : v < 0.6 ? 1 : 0;
    for (let d = 1; d <= arm; d++) for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d]]) p.px(x + dx, y + dy, C[d === arm ? 5 : 6]);
    p.px(x, y, C[v < 0.6 ? 7 : 5]);
    p.light(x, y, C[6], 0.5 * (1 - v));
  }
}
