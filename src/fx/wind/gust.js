import { rand } from '../../core/index.js';

export const meta = {
  name: 'Gust',
  desc: 'A blast of air from the hand: wisps are sucked into the staff tip, then a widening cone of curling lines streams out to the target, its front slapping into it and splitting round it, dust and leaves kicked up from the floor below, the lines thinning and curling away',
  tags: ['wind', 'air', 'gust', 'magic', 'spell', 'push'],
  size: [88, 48],
  origin: [14, 26],
  duration: 0.8,
  loop: false,
  fps: 30,
  views: ['side', 'top'],
  top: { directions: 8 },
  ramps: { palette: 8, dust: 6, leaf: 4 },
  options: { palette: 'wind', dust: 'dust', leaf: 'leaf', seed: 1 },
  act: { hits: [{ t: 9 / 30, freeze: 0.05, shake: 2 }] },
  stage: { at: 'target', x: -54, ground: 19 }, // from the mage's staff tip to the goblin's chest
  sound: [
    { t: 0, kind: 'whoosh', gain: 0.25, pitch: 1.8 }, // air drawn in
    { t: 0.08, kind: 'whoosh', gain: 0.8, pitch: 0.8 }, // the release, peaking as the front flies
    { t: 9 / 30, kind: 'thump', gain: 0.45, pitch: 1.1 }, // the front slaps into the target
    { t: 9 / 30, kind: 'crack', gain: 0.25, pitch: 1.5 },
    { t: 0.34, kind: 'whoosh', gain: 0.3, pitch: 0.8 }, // the stream dying away
  ],
};

const L = 54; // from the staff tip to the target's chest
const FLOOR = 19; // the floor, below the anchor
const F = 1 / 30;
const REL = 5 * F; // the draw-in, then the release
const HIT = 9 * F; // the front reaches the target
const END = 0.76; // everything gone
const N = 12; // air lines
const AIM = 4; // seen from the side the cone dips this much by the target, from the staff tip to the chest

const clamp = v => Math.max(0, Math.min(1, v));
const smooth = (e0, e1, x) => {
  const u = clamp((x - e0) / (e1 - e0));
  return u * u * (3 - 2 * u);
};
const out = (t, k) => 1 - Math.exp(-Math.max(0, t) / k); // fast out, slow settle
const half = x => 2 + 10 * clamp(x / L) ** 0.85; // the cone's half-height: 4 px tall at the hand, 24 at the target

// The air: one flow out of the hand that dies away. A line released at b has run flow(t) - flow(b) px by t, so the
// first ones reach the target on the hit and the last ones stall part way and curl up where they are.
const K = 0.15, RUN = L / (1 - Math.exp(-(HIT - REL) / K));
const flow = t => RUN * out(t - REL, K);
const speed = t => Math.exp(-Math.max(0, t - REL) / K); // 1 on the release, falling
const passes = x => REL - K * Math.log(1 - Math.min(x, L) / RUN); // when the front passes x

// A curl: from (x, y) heading a0, turning toward side sg (1 down, -1 up) through th radians, tightening as it goes.
function curl(x, y, a0, sg, r, th) {
  const pts = [[x, y]], n = Math.max(3, Math.ceil(th * r / 1.2));
  for (let k = 0; k < n; k++) {
    const a = a0 + sg * th * ((k + 0.5) / n), step = (th / n) * r * (1 - 0.45 * (k / n));
    x += Math.cos(a) * step;
    y += Math.sin(a) * step;
    pts.push([x, y]);
  }
  return pts;
}

// Air line j: its lane across the cone, when it leaves the hand, which way it curls (outward), its curl's size.
function line(j, s, top) {
  const v = ((j * 0.618 + 0.3 * rand(j, s, 1)) % 1) * 2 - 1;
  const born = REL + 0.25 * (j / N) ** 1.4 + 0.015 * rand(j, s, 2);
  const sg = Math.abs(v) > 0.15 ? Math.sign(v) : rand(j, s, 4) < 0.5 ? -1 : 1;
  return { v, born, life: END - born - 0.1 * rand(j, s, 3), sg, top, m: 0.92 + 0.16 * rand(j, s, 5), ph: 6.3 * rand(j, s, 7), r: 1.5 + 2 * rand(j, s, 8) };
}

// The line's track: its lane across the widening cone, a gentle wave, split round the target, drifting out as it dies
// (and up, seen from the side).
function track(k, x, away) {
  const split = k.sg * (1 - Math.abs(k.v)) ** 2 * Math.min(7, Math.max(0, x - (L - 10)) ** 2 / 12);
  return k.v * half(x) + ((k.top ? 0 : AIM) + 1.2 * Math.sin(x / 5 + k.ph)) * clamp(x / L) + split + (k.sg * 2 - (k.top ? 0 : 6)) * away;
}

function airLine(p, C, k, t) {
  const tau = t - k.born, q = tau / k.life;
  if (tau < 0 || q >= 1) return;
  const sp = speed(t), xh = k.m * (flow(t) - flow(k.born)) + 14 * tau; // and a breeze that lingers
  const len = Math.min(22, 3 + 40 * sp) * out(tau, 0.03); // a streak as long as it is fast
  const away = smooth(0.35, 1, q), xt = Math.max(0, xh - len), body = [];
  for (let x = xt; x < xh; x += 2) body.push([x, track(k, x, away)]);
  const yh = track(k, xh, away);
  body.push([xh, yh]);
  const a0 = Math.atan2(yh - track(k, xh - 1, away), 1);
  const hook = curl(xh, yh, a0, k.sg, k.r, Math.PI * (0.4 + 1.1 * (1 - sp)));
  // dimmer and broken as it thins; gone once past the target
  const c = sp > 0.6 ? 7 : sp > 0.3 ? 6 : 5, a = (1 - smooth(0.6, 0.95, q)) * (1 - smooth(L + 2, L + 12, xh));
  const cut = Math.floor(body.length * 0.45);
  if (cut > 0) p.polyline(body.slice(0, cut + 1), C[c - 2], 0.7 * a);
  if (body.length > 1) p.polyline(body.slice(cut), C[c - 1], a);
  p.polyline(hook, C[c], a);
}

// A dust puff dragged out by the wind: a low lump with a smaller one trailing it, lit on top, soft at the edge.
function puff(p, D, x, y, r, a) {
  for (const [ox, k] of [[-1.1 * r, 0.7], [0, 1]]) {
    const R = r * k;
    p.disc(x + ox, y + r - R, R, (dx, dy) => D[dy < -R * 0.4 ? 4 : dy > R * 0.6 ? 2 : 3], (dx, dy, d) => a * smooth(1, 0.5, d));
  }
}

// Dust kicked up off the floor as the front passes over it, rolling on with the wind. From above it is under the cone.
function dust(p, t, o, back) {
  const D = o.dust, s = o.seed, top = o.view === 'top';
  for (let i = 0; i < 7; i++) {
    if ((i % 2 === 0) !== back) continue;
    const x0 = 14 + i * 6 + 4 * rand(i, s, 11), at = passes(x0) + 0.03 + 0.06 * rand(i, s, 10), tau = t - at;
    const life = Math.min(0.32 + 0.15 * rand(i, s, 12), END - at), q = tau / life;
    if (tau < 0 || q >= 1) continue;
    const r = (2 + 1.6 * rand(i, s, 13)) * (0.4 + 0.6 * out(tau, 0.08)) * (1 + 0.3 * q), x = x0 + (8 + 4 * rand(i, s, 9)) * out(tau, 0.15) + 6 * tau;
    const y = top ? (rand(i, s, 14) * 2 - 1) * half(x0) * 0.8 : FLOOR - r * 0.85 - (2 + 8 * rand(i, s, 15)) * out(tau, 0.25);
    puff(p, D, x, y, r, 0.6 * (1 - smooth(0.3, 1, q)));
  }
  if (back) return;
  // grit skittering along the floor
  for (let i = 0; i < 6; i++) {
    const x0 = 10 + i * 7 + 4 * rand(i, s, 16), at = passes(x0) + 0.02, tau = t - at, life = 0.25;
    if (tau < 0 || tau >= life) continue;
    const x = x0 + 20 * out(tau, 0.1), y = top ? (rand(i, s, 17) * 2 - 1) * half(x0) : FLOOR - 1 - Math.round(3 * rand(i, s, 17) * out(tau, 0.1));
    p.line(x - 2, y, x, y, D[tau < 0.1 ? 4 : 3], 1 - tau / life);
  }
}

// Two leaves lifted off the floor and carried up over the target, tumbling: a blade lit on its upper side.
function leaves(p, t, o) {
  const G = o.leaf, s = o.seed, top = o.view === 'top';
  for (const [i, x0, rise] of [[0, 16, 24], [1, 34, 14]]) {
    const at = passes(x0) + 0.02, tau = t - at, life = END - at, q = tau / life;
    if (tau < 0 || q >= 1) continue;
    const x = x0 + (46 - x0 * 0.5) * out(tau, 0.25) + 6 * tau, wob = Math.sin(tau * 17 + i * 2);
    const y = top ? (i ? 4 : -4) + 2 * wob : FLOOR - 1 - rise * out(tau, 0.3) + 1.5 * wob;
    // it spins (the blade's angle) and flips (face-on shows its width and lit side, edge-on a thin dark sliver)
    const a = tau * (10 + 4 * i) + rand(i, s, 20) * 6, face = Math.cos(tau * (23 + 5 * i) + i), alpha = 1 - smooth(0.7, 1, q);
    const cx = Math.cos(a) * 1.6, cy = Math.sin(a) * 1.6;
    p.line(x - cx, y - cy, x + cx, y + cy, G[face > 0.3 ? 3 : face > -0.3 ? 1 : 2], alpha);
    if (Math.abs(face) > 0.3) p.px(x - Math.sin(a) * 1.1, y + Math.cos(a) * 1.1, G[face > 0 ? 2 : 1], alpha);
  }
}

export function drawBack(p, t, o) {
  dust(p, t, o, true);
}

export function draw(p, t, o) {
  const C = o.palette, s = o.seed, top = o.view === 'top', aim = top ? 0 : AIM;
  if (t >= END) return;

  // ---- light, faint (air doesn't shine): a pool at the hand, then where the front lands ----
  const charge = clamp(t / REL);
  if (t < REL + 4 * F) p.glow(0, 0, 5 + 3 * charge, C[5], 0.3 * charge * (t < REL ? 1 : 1 - (t - REL) / (4 * F)));
  if (t >= HIT && t < HIT + 0.15) p.glow(L, aim, 12, C[6], 0.35 * (1 - (t - HIT) / 0.15) ** 2);

  // ---- the draw-in: wisps spiral into the tip ----
  if (t < REL) {
    for (let j = 0; j < 5; j++) {
      const u = clamp(t / REL + 0.2 - 0.3 * rand(j, s, 30)), a = Math.PI * (0.55 + 0.9 * (j / 4)) + 0.3 * rand(j, s, 31);
      const pts = [];
      for (let i = 0; i <= 4; i++) {
        const w = u - 0.3 + 0.075 * i, r = 12 * (1 - clamp(w)) ** 1.2;
        if (w >= 0 && r > 1.5) pts.push([Math.cos(a + w * 1.6) * r, Math.sin(a + w * 1.6) * r]);
      }
      if (pts.length > 1) p.polyline(pts, C[u > 0.6 ? 6 : 4]);
    }
  }

  // ---- the release: a burst of short rays fanning out of the tip, the cone's first breath ----
  if (t >= REL - F && t < REL + 2 * F) {
    const q = (t - REL + F) / (3 * F);
    for (let j = 0; j < 5; j++) {
      const a = (j - 2) * 0.3, r0 = 2 + 6 * q, r1 = r0 + 4 + 2 * (j % 2);
      p.line(Math.cos(a) * r0, Math.sin(a) * r0, Math.cos(a) * r1, Math.sin(a) * r1, C[q < 0.5 ? 7 : 5], 1 - q * 0.6);
    }
  }

  // ---- the front: a bowed line racing out across the cone with the first lines; on the target it splits round it ----
  if (t >= REL && t < HIT + F) {
    const xf = flow(Math.min(t, HIT)), h = half(xf), bow = 0.3 * h, hero = t >= HIT, dip = aim * clamp(xf / L);
    const pts = [];
    for (let y = -h; y <= h + 0.01; y += h / 4) pts.push([xf - bow * (y / h) ** 2, y + dip]);
    p.polyline(pts, C[hero ? 7 : 5], hero ? 1 : 0.8);
  }
  if (t >= HIT && t < HIT + 0.2) {
    const q = (t - HIT) / 0.2;
    for (const sg of [-1, 1]) {
      const hook = curl(L - 3 + 4 * q, aim + sg * (3 + 4 * q), sg * 0.7, sg, 2.5 + 2 * q, Math.PI * (0.8 + 0.5 * q));
      p.polyline(hook, C[q < 0.3 ? 7 : q < 0.6 ? 6 : 5], 1 - smooth(0.5, 1, q));
    }
  }

  // ---- the stream: air lines along the cone, each ending in a curl ----
  for (let j = 0; j < N; j++) airLine(p, C, line(j, s, top), t);

  dust(p, t, o, false);
  leaves(p, t, o);
}
