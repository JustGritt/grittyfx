import { rand } from '../../core/index.js';

export const meta = {
  name: 'Blessing',
  desc: 'A buff on the caster: a glint over the head opens into a ring of light that settles down over the body to the feet, golden motes spiral up, a gentle shine',
  tags: ['buff', 'holy', 'light', 'magic', 'spell'],
  size: [52, 72],
  origin: [26, 64],
  duration: 1.1,
  loop: false,
  fps: 30,
  views: ['side'],
  ramps: { palette: 8 },
  options: { palette: 'holy', seed: 1 },
  sound: [
    // a rising arpeggio as the ring comes down, and a higher note as it lands
    { t: 0, kind: 'chime', gain: 0.35, pitch: 1.5 },
    { t: 0.08, kind: 'whoosh', gain: 0.18, pitch: 0.6 },
    { t: 0.16, kind: 'chime', gain: 0.3 },
    { t: 0.3, kind: 'chime', gain: 0.28, pitch: 1.26 },
    { t: 0.44, kind: 'chime', gain: 0.26, pitch: 1.5 },
    { t: 0.62, kind: 'chime', gain: 0.35, pitch: 2 },
  ],
};

const TAU = Math.PI * 2;
const TOP = -48; // where the ring opens, over the head
const RX = 13, SQ = 0.3; // the ring's width and its slant
const OPEN = 0.12, LAND = 0.62, GONE = 0.9;
const MOTES = 14;
const smooth = u => u * u * (3 - 2 * u);

// The ring at time t: its height, width and brightness, or null before it opens and after it is gone.
function ring(t) {
  if (t < OPEN || t >= GONE) return null;
  if (t < LAND) {
    const u = (t - OPEN) / (LAND - OPEN);
    return { y: TOP - TOP * smooth(u), rx: RX * Math.min(1, 0.15 + u * 5), a: 1, hot: u < 0.15 };
  }
  const v = (t - LAND) / (GONE - LAND); // landed: it flares out over the ground and fades
  return { y: 0, rx: RX * (1 + 0.4 * (1 - (1 - v) ** 2)), a: (1 - v) ** 1.5, hot: v < 0.15 };
}

// A slanted ellipse as short segments; c(am) colors each by its angle. front is the half nearer the viewer.
function ellipse(p, y, rx, front, c, a) {
  const N = 40;
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * TAU, a1 = ((i + 1) / N) * TAU, am = (a0 + a1) / 2;
    if (Math.sin(am) > 0 === front) p.line(Math.cos(a0) * rx, y + Math.sin(a0) * rx * SQ, Math.cos(a1) * rx, y + Math.sin(a1) * rx * SQ, c(am), a);
  }
}

// Mote j spirals up round the body from the feet, each a little after the last.
function mote(j, t, s) {
  const u = (t - 0.15 - j * 0.03) / 0.5;
  if (u <= 0 || u >= 1) return null;
  const a = TAU * (rand(j, s) + 0.8 * u), r = RX * (0.95 - 0.35 * u);
  return { u, front: Math.sin(a) > 0, x: Math.cos(a) * r, y: Math.sin(a) * r * SQ - 2 - 46 * (1 - (1 - u) ** 1.6), tw: rand(j, Math.floor(u * 8), s) < 0.3 };
}

function layer(p, t, o, front) {
  const C = o.palette, s = o.seed, q = ring(t);
  if (q) {
    // brightest at the front, where it faces the viewer; the far side dimmer
    ellipse(p, q.y, q.rx, front, am => C[q.hot ? 7 : !front ? 4 : Math.abs(Math.cos(am)) < 0.55 ? 7 : 6], q.a);
    if (front) ellipse(p, q.y + 1, q.rx, true, am => C[Math.abs(Math.cos(am)) < 0.55 ? 6 : 5], q.a); // the near side is thicker
  }
  for (let j = 0; j < MOTES; j++) {
    const m = mote(j, t, s);
    if (!m || m.front !== front) continue;
    const c = C[(front ? 7 : 6) - Math.floor(m.u * 3)], tail = mote(j, t - 0.012, s);
    if (tail) p.line(tail.x, tail.y, m.x, m.y, w => (w < 0.5 ? C[front ? 4 : 3] : c)); // a short streak shows the spiral
    p.px(m.x, m.y, c);
    if (m.tw && m.u < 0.7) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.px(m.x + dx, m.y + dy, C[front ? 5 : 4]);
    p.light(m.x, m.y, C[4], 0.5 * (1 - m.u));
  }
}

export function drawBack(p, t, o) {
  const C = o.palette, q = ring(t);
  // the shine: a soft glow over the body that swells as the ring passes and fades after
  const shine = t < LAND ? smooth(Math.min(1, t / LAND)) : Math.max(0, 1 - (t - LAND) / 0.38) ** 2;
  if (shine > 0) p.glow(0, -22, 24, C[4], 0.2 * shine);
  if (q) { // the ring lights the air just round its near side, not a disc
    for (const [a0, a1] of [[0, 1], [1, 2.14], [2.14, Math.PI]]) {
      p.glowLine(Math.cos(a0) * q.rx, q.y + Math.sin(a0) * q.rx * SQ, Math.cos(a1) * q.rx, q.y + Math.sin(a1) * q.rx * SQ, 4, C[4], (u, d) => 0.4 * q.a * (1 - d) ** 2 * (0.5 + 0.5 * Math.sin(Math.PI * u)));
    }
  }
  if (t < OPEN + 0.04) { // the glint over the head that the ring opens from
    const u = Math.min(1, t / OPEN);
    p.glow(0, TOP, 6 + 4 * u, C[4], 0.6);
  }
  layer(p, t, o, false);
}

export function draw(p, t, o) {
  const C = o.palette;
  if (t < OPEN + 0.04) {
    const u = Math.min(1, t / OPEN), arm = Math.round(1 + 3 * u * (t < OPEN ? 1 : 0.5));
    for (let d = 1; d <= arm; d++) for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d]]) p.px(dx, TOP + dy, C[d === arm ? 5 : 7]);
    p.px(0, TOP, C[7]);
  }
  layer(p, t, o, true);
}
