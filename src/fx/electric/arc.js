import { rand } from '../../core/index.js';

export const meta = {
  name: 'Arc',
  desc: 'A standing electric arc across a gap, a tesla coil or a broken cable: a jagged bolt that re-forms every few frames, forks, hot contact points, sparks spitting off them and a flickering glow',
  tags: ['electric', 'arc', 'ambient', 'spark', 'tesla', 'prop'],
  size: [72, 40],
  origin: [36, 22],
  duration: 1.2,
  loop: true,
  fps: 20,
  views: ['side'],
  ramps: { palette: 8 },
  options: { palette: 'electric', seed: 1 },
  sound: [
    { t: 0, kind: 'crackle', gain: 0.3, pitch: 1.8 }, // the buzz and spit of the arc
    { t: 0.1, kind: 'zap', gain: 0.25, pitch: 1.2 },
    { t: 0.5, kind: 'zap', gain: 0.2, pitch: 0.9 },
    { t: 0.85, kind: 'zap', gain: 0.25, pitch: 1.4 },
  ],
};

const TAU = Math.PI * 2;
const G = 18; // the contact points sit at -G and G
const SLOTS = 12; // the bolt re-forms this many times a loop, held two frames each

// The bolt of one slot: a jagged path from contact to contact that bows up, as hot air rises, and a fork or two.
function bolt(slot, s, k = 0) {
  const r = j => rand(slot * 5 + k, j, s), n = 6, bow = 2 + 5 * r(0), coarse = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, end = i === 0 || i === n;
    coarse.push([-G + 2 * G * u + (end ? 0 : (r(i + 1) - 0.5) * 3), -bow * Math.sin(Math.PI * u) + (end ? 0 : (r(i + 10) - 0.5) * 9)]);
  }
  const main = [coarse[0]];
  for (let i = 1; i <= n; i++) { // a smaller kink between each pair
    const [x0, y0] = coarse[i - 1], [x1, y1] = coarse[i];
    main.push([(x0 + x1) / 2 + (r(i + 20) - 0.5) * 2, (y0 + y1) / 2 + (r(i + 30) - 0.5) * 5], coarse[i]);
  }
  const forks = [];
  for (let b = 0; b < 1 + (r(40) < 0.5); b++) {
    const dir = r(41 + b) < 0.5 ? -1 : 1, pts = [main[2 + Math.floor(r(43 + b) * (main.length - 4))]];
    for (let j = 0; j < 2 + (r(45 + b) < 0.5); j++) {
      const [x, y] = pts[pts.length - 1];
      pts.push([x + (r(50 + b * 4 + j) - 0.5) * 7, y + dir * (2 + r(60 + b * 4 + j) * 3)]);
    }
    forks.push(pts);
  }
  return { main, forks, fails: slot === 3 + 4 * Math.floor(rand(s, 71) * 2) };
}

// Light along a path, each segment dimmer at its ends so the joints add up to one light, not knots.
function glowPath(p, pts, r, c, k) {
  for (let i = 1; i < pts.length; i++) p.glowLine(...pts[i - 1], ...pts[i], r, c, (t, d) => k * (1 - d) ** 2 * (0.5 + 0.5 * Math.sin(Math.PI * t)));
}

const shift = (pts, dy) => pts.map(([x, y]) => [x, y + dy]);

export function draw(p, t, o) {
  const C = o.palette, s = o.seed, ph = t / meta.duration;
  const fi = Math.floor(ph * SLOTS * 2 + 1e-6) % (SLOTS * 2), slot = fi >> 1, fresh = fi % 2 === 0;
  const B = bolt(slot, s);

  // the contact points: hot, and flickering with the arc
  const hot = B.fails ? 0.5 : fresh ? 1 : 0.75;
  for (const x of [-G, G]) p.glow(x, 0, 7, C[5], 0.5 * hot);

  if (B.fails) {
    // the arc gutters out for a moment: stubs reach from each contact point and miss
    for (const side of [0, 1]) {
      const stub = side ? B.main.slice(-4).reverse() : B.main.slice(0, 4);
      p.polyline(shift(stub, 1), C[2]);
      p.polyline(stub, C[fresh ? 6 : 5]);
    }
  } else {
    glowPath(p, B.main, 6, C[5], fresh ? 0.35 : 0.2);
    // a dark underside under the white core: it holds on a light background
    p.polyline(shift(B.main.slice(1, -1), 1), C[fresh ? 3 : 2]);
    if (fresh) {
      for (const f of B.forks) p.polyline(f, u => C[u > 0.6 ? 4 : 6]);
      if (rand(slot, 99, s) < 0.35) p.polyline(bolt(slot, s, 1).main, C[3]); // a ghost strand beside it
    } else for (const f of B.forks) p.polyline(f.slice(0, 2), C[4]);
    p.polyline(B.main, C[fresh ? 7 : 6]);
  }
  for (const x of [-G, G]) {
    p.circle(x + 0.5, 0.5, fresh && !B.fails ? 2.2 : 1.6, (dx, dy, d) => C[d > 0.7 ? 4 : 7]);
  }

  // sparks spat off the contact points: thrown out and up, falling away as they cool
  for (let j = 0; j < 10; j++) {
    const k = 1 + (j % 3 === 0), v = (ph * k + rand(j, s)) % 1, life = 0.3;
    if (v > life) continue;
    const u = v / life, tau = v * meta.duration / k, x0 = j % 2 ? G : -G, out = j % 2 ? 1 : -1;
    const vx = out * (12 + 22 * rand(j, s, 1)) * (rand(j, s, 3) < 0.3 ? -1 : 1), vy = -35 - 30 * rand(j, s, 2);
    const at = q => [x0 + vx * q, vy * q + 180 * q * q];
    p.line(...at(Math.max(0, tau - 0.05)), ...at(tau), q => C[q > 0.5 ? (u < 0.4 ? 7 : 6) : u < 0.6 ? 5 : 4]);
  }
}
