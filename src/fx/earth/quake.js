import { Rng, Particles, Lights, Bits, DUST, rand } from '../../core/index.js';

export const meta = {
  name: 'Quake',
  desc: 'A shockwave runs along the floor from the caster to the target: slabs heave up and drop back behind a glowing crack, dust kicked up at its front, and a burst of rock where it reaches the target',
  tags: ['earth', 'quake', 'shockwave', 'rock', 'ground', 'magic', 'spell'],
  size: [100, 54],
  origin: [10, 40],
  duration: 1.2,
  loop: false,
  fps: 30,
  views: ['side', 'top'],
  top: { size: [168, 168], directions: 8 },
  ramps: { palette: 8, dust: 5 },
  options: { palette: 'stone', dust: 'dust', seed: 1 },
  act: { hits: [{ t: 11 / 30, freeze: 0.08, shake: 4 }] },
  stage: { at: 'target', x: -62, ground: 0 }, // from the caster's front, along the floor to the goblin's feet
  sound: [
    { t: 0, kind: 'thump', gain: 0.7, pitch: 0.6 }, // the blow into the floor
    { t: 0, kind: 'crack', gain: 0.5, pitch: 0.3 }, // the rumble running ahead
    { t: 0.12, kind: 'crack', gain: 0.25, pitch: 1.6 }, // slabs breaking
    { t: 0.24, kind: 'crack', gain: 0.25, pitch: 1.9 },
    { t: 11 / 30, kind: 'thump', gain: 0.9, pitch: 0.75 }, // the burst at the target
    { t: 11 / 30, kind: 'crack', gain: 0.8, pitch: 0.8 },
    { t: 0.62, kind: 'crack', gain: 0.15, pitch: 2.4 }, // debris landing
  ],
};

const L = 62; // the run, from the anchor to the target
const HIT = 11 / 30; // the front reaches the target
const G = 900; // a slab's fall
const F = 1 / 30;
const FLAT = 0.4;
const front = t => L * Math.min(1, t / HIT) ** 0.85; // fast off the mark, steady after
// the ridge of earth the wave pushes: growing as it runs, surging at the target, then collapsing
const crest = t => (t < HIT ? 5 + 5 * (t / HIT) : 13 * Math.max(0, 1 - (t - HIT) / 0.2) ** 1.5);
// its height d px behind the front: a steep face ahead, a long tail behind
const bump = d => (d < 0 ? 0 : d < 3 ? d / 3 : Math.exp(-(d - 3) / 6));

// The ridge: columns of broken earth, a jagged lit top, a shaded face toward the way it runs. From above, a band across
// the run that brightens where it rises toward the eye.
function ridge(p, t, C, s, top) {
  const xf = front(t), H = crest(t);
  if (H < 0.5) return;
  if (top) {
    p.shade(Math.floor(xf - 22), -7, 25, 14, (px, py) => {
      const h = H * bump(xf - px - 0.5) * (1 - ((py + 0.5) / 7) ** 2);
      return h < 1 || px < 0 ? 0 : C[h > 6 ? 6 : h > 3 ? 5 : 4];
    });
    return;
  }
  p.shade(Math.floor(xf - 22), -16, 25, 17, (px, py) => {
    const d = xf - px - 0.5, h = (H + 1.5 * rand(px, 1, s)) * bump(d), y = -(py + 0.5);
    if (y > h || h < 1 || px < 0) return 0;
    return C[y > h - 1 ? 7 : d < 2 ? 4 : y > h - 3 ? 6 : y < 1.5 ? 3 : 5];
  });
}

// A slab of floor heaved up: a block w x th that jumps `h` px, tilting as it goes, lands and lies jutting a little, then
// sinks back into the floor. Top lit, side shaded, dark edges.
function slab(p, k, t, C, top) {
  const s = t - k.at, T = (2 * Math.sqrt(2 * G * k.h)) / G;
  if (s < 0 || t > k.end) return;
  const fly = Math.min(s, T), lift = Math.sqrt(2 * G * k.h) * fly - (G * fly * fly) / 2;
  const tilt = s < T ? k.tilt * Math.sin((Math.PI * s) / T) : k.tilt * 0.25, a = Math.min(1, (k.end - t) / 0.15);
  if (top) { // from above it rises toward the eye: bigger and brighter at its peak
    const g = 1 + lift / 24, r = (k.w / 2) * g;
    p.shade(Math.floor(k.x - r - 2), Math.floor(k.z - r - 2), 2 * r + 5, 2 * r + 5, (px, py) => {
      const dx = px + 0.5 - k.x, dy = py + 0.5 - k.z, c = Math.cos(k.tilt * 3), sn = Math.sin(k.tilt * 3);
      const u = dx * c + dy * sn, v = dy * c - dx * sn, e = Math.max(Math.abs(u), Math.abs(v));
      if (e > r) return 0;
      return C[e > r - 1 ? 2 : lift > k.h * 0.5 ? 6 : u + v < 0 ? 5 : 4];
    }, a);
    return;
  }
  const cx = k.x, cy = -lift - k.th / 2, c = Math.cos(tilt), sn = Math.sin(tilt), R = k.w;
  if (lift > 0.5) p.line(k.x - k.w / 2, 0, k.x + k.w / 2, 0, C[0]); // the hole it left
  p.shade(Math.floor(cx - R), Math.floor(cy - R), 2 * R + 1, 2 * R + 1, (px, py) => {
    const dx = px + 0.5 - cx, dy = py + 0.5 - cy, u = dx * c + dy * sn, v = dy * c - dx * sn;
    if (Math.abs(u) > k.w / 2 || Math.abs(v) > k.th / 2 || py + 0.5 > 0.5) return 0;
    if (Math.abs(u) > k.w / 2 - 1 || v > k.th / 2 - 1) return C[2];
    return C[v < -k.th / 2 + 1 ? 6 : 4];
  }, a);
}

export function create(o) {
  const rng = new Rng(o.seed), C = o.palette, s = o.seed, top = o.view === 'top';
  const parts = new Particles({ rng, palette: C, dust: o.dust, ...(top ? { top: true } : { ground: 0 }) });
  const lights = new Lights();
  const bits = new Bits({ rng, gravity: 600, ...(top ? { top: true } : { ground: 0 }) });
  const when = x => HIT * (x / L) ** (1 / 0.85); // the front passes x

  // the floor broken along the run: slabs every few px, the burst at the target bigger
  const slabs = [];
  for (let x = 5; x < L - 6; x += rng.range(4.5, 6.5)) {
    slabs.push({ x, z: rng.range(-4, 4), w: rng.range(5, 7), th: 3, h: rng.range(6, 10) * (0.7 + 0.5 * (x / L)), tilt: rng.range(-0.6, 0.6), at: when(x), end: rng.range(0.85, 1) });
  }
  for (const dx of [-5, 0, 5]) {
    slabs.push({ x: L + dx + rng.range(-1, 1), z: dx * 0.6, w: rng.range(7, 9), th: 4, h: rng.range(14, 18) - Math.abs(dx), tilt: dx * 0.12 + rng.range(-0.2, 0.2), at: HIT, end: rng.range(0.95, 1.05) });
  }
  // the crack the front leaves: a zigzag along the run
  const crack = [[0, 0]];
  for (let x = 0, z = 0; x < L + 4; ) (x += rng.range(2, 3.5)), (z = Math.max(-3, Math.min(3, z + rng.range(-1.6, 1.6)))), crack.push([x, z]);

  // dust and grit kicked up at the front as it passes
  for (let x = 4; x < L; x += 6) {
    const at = when(x);
    parts.spawn(DUST, x, top ? rng.range(-3, 3) : -1, rng.range(-10, 25), top ? rng.range(-15, 15) : -rng.range(8, 20), rng.range(0.35, 0.5), { size: rng.range(1.1, 1.7), delay: at, back: rng.chance(0.5) });
    bits.spawn(x, top ? rng.range(-2, 2) : -1, rng.range(-15, 30), top ? rng.range(-40, 40) : -rng.range(50, 90), { c: C[rng.int(3, 5)], size: 1.5, life: rng.range(0.3, 0.4), delay: at });
  }
  // the blow at the start
  lights.add(2, -3, 12, C[6], 0.7, 0.2);
  for (let i = 0; i < 4; i++) parts.spawn(DUST, rng.range(-2, 3), top ? rng.range(-3, 3) : -1, rng.range(-25, 10), top ? rng.range(-20, 20) : -rng.range(5, 15), rng.range(0.3, 0.45), { size: rng.range(1.5, 2.2) });
  // the burst at the target
  lights.add(L, -8, 22, C[7], 1, 0.3, { delay: HIT });
  for (let i = 0; i < 10; i++) {
    const a = top ? rng.range(0, Math.PI * 2) : rng.range(-Math.PI * 0.85, -Math.PI * 0.15), v = rng.range(70, 130);
    bits.spawn(L + rng.range(-3, 3), top ? 0 : -2, Math.cos(a) * v * (top ? 0.3 : 0.4), Math.sin(a) * v * (top ? 0.3 : 1), { c: C[rng.int(3, 6)], size: rng.range(1.5, 3), life: rng.range(0.55, 0.75), delay: HIT });
  }
  for (let i = 0; i < 12; i++) {
    const side = i % 2 ? 1 : -1, a = rng.range(0, Math.PI * 2);
    if (top) parts.spawn(DUST, L + Math.cos(a) * 3, Math.sin(a) * 3, Math.cos(a) * rng.range(30, 60), Math.sin(a) * rng.range(30, 60), rng.range(0.45, 0.65), { size: rng.range(1.8, 2.8), delay: HIT });
    else parts.spawn(DUST, L + side * rng.range(2, 8), -1, side * rng.range(25, 60), -rng.range(8, 25), rng.range(0.45, 0.65), { size: rng.range(1.6, 2.6), delay: HIT + rng.range(0, 0.06), back: i % 3 === 0 });
  }

  let n = 0, t = 0;
  const flat = top ? 1 : FLAT;
  return {
    update(dt) {
      t = ++n * dt; // counted, not summed, so the burst lands on its frame
      parts.update(dt);
      lights.update(dt);
      bits.update(dt);
    },
    drawBack(p) {
      parts.draw(p, 'back');
      // the crack: white hot at the front, cooling to a dark split with a lit lip behind it, fading at the end
      const xf = front(t), a = Math.min(1, (1.1 - t) / 0.25);
      if (a <= 0) return;
      for (let i = 1; i < crack.length && crack[i - 1][0] < xf; i++) {
        const [x0, z0] = crack[i - 1], [x1, z1] = crack[i], x = Math.min(x1, xf), u = (x - x0) / (x1 - x0 || 1);
        const pts = [[x0, z0 * flat], [x, (z0 + (z1 - z0) * u) * flat]], behind = xf - x0 + (t - HIT > 0 ? (t - HIT) * 120 : 0);
        const c = behind < 6 ? 7 : behind < 14 ? 6 : behind < 24 ? 4 : 0;
        if (c) p.polyline(pts, C[c], a);
        else p.polyline(pts.map(([x, y]) => [x, y - 1]), C[3], a), p.polyline(pts, C[0], a);
      }
      if (t < HIT + 0.2) p.glowLine(Math.max(0, xf - 12), 0, xf, 0, 5, C[6], 0.3 * Math.min(1, (HIT + 0.2 - t) / 0.15));
    },
    draw(p) {
      lights.draw(p);
      ridge(p, t, C, s, top);
      for (const k of slabs) slab(p, k, t, C, top);
      if (t >= HIT && t < HIT + F) {
        p.ellipse(L + 0.5, top ? 0.5 : -0.5, 14, top ? 14 : 2.5, C[7]); // the floor bursting under the target
        p.glow(L, top ? 0 : -6, 16, C[7], 1);
      }
      if (t < F) p.ellipse(1.5, top ? 0.5 : -0.5, 5, top ? 5 : 1.5, C[7]); // the blow
      bits.draw(p);
      parts.draw(p);
    },
  };
}
