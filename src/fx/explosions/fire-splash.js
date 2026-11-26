import { Rng, Particles, Lights, Bits, FIRE, EMBER, SMOKE, fbm, noise2 } from '../../core/index.js';

const DURATION = 2.5;
const CATCH = 0.12; // when the splashed fuel catches

export const meta = {
  name: 'Fire splash',
  desc: 'A fire bottle breaking on the floor: glass shards flung out, burning fuel splashing and spreading into a pool, flames whooshing up off it, licking and flickering, then burning down to embers and a scorch',
  tags: ['explosion', 'fire', 'molotov', 'military', 'splash', 'burn'],
  size: [112, 98],
  origin: [56, 76],
  duration: DURATION,
  loop: false,
  fps: 24,
  views: ['side'],
  ramps: { palette: 8, smoke: 6, glass: 6 },
  options: { palette: 'fire', smoke: 'smoke', glass: ['#0c2216', '#174430', '#266446', '#3f8c5e', '#7cc493', '#dcfbe6'], seed: 1 },
  act: { hits: [{ t: 0, freeze: 0.05, shake: 2 }, { t: CATCH + 1 / 24, freeze: 0, shake: 3 }] }, // the smash, then the whoomp
  stage: { ground: 0, looks: { gather: 'windup', point: 'throw', crouch: 'windup', raise: 'throw' } }, // on the floor at the target
  sound: [
    { t: 0, kind: 'crack', gain: 0.8, pitch: 2.6 }, // the glass smashing
    { t: 0, kind: 'crack', gain: 0.35, pitch: 1.4 },
    { t: CATCH - 0.08, kind: 'whoosh', gain: 0.9, pitch: 0.55 }, // the fuel catching
    { t: CATCH, kind: 'crackle', gain: 0.45, pitch: 0.8 }, // the fire burning
    { t: 0.42, kind: 'crack', gain: 0.12, pitch: 3.2 }, // shards landing
    { t: 0.6, kind: 'crack', gain: 0.08, pitch: 3.6 },
  ],
};

const TAU = Math.PI * 2;
const GRAVITY = 300;
const POOL = 26; // the pool's half width at its widest
const GAP = 5.5; // px between tongues along the pool
const N = 13, X0 = -((N - 1) / 2) * GAP; // the tongues, from X0
const clamp01 = v => Math.max(0, Math.min(1, v));
const smooth = (e0, e1, x) => {
  const u = clamp01((x - e0) / (e1 - e0));
  return u * u * (3 - 2 * u);
};
const drop = h => (h <= -0.22 || h >= 1 ? 0 : (Math.sqrt(h + 0.22) * (1 - h) ** 1.3) / 0.494); // teardrop, widest = 1
const BANDS = [[0.86, 7], [0.7, 6], [0.53, 5], [0.37, 4], [0.23, 3], [0.1, 2]];

// The pool's half width: spreading fast from the smash, then burning back from its edges as the fuel runs out.
const spread = t => POOL * (1 - (1 - clamp01(t / 0.4)) ** 3) * (1 - 0.75 * smooth(1.1, 2.1, t));
// How tall the flames stand: a whoosh up as the fuel catches, settling to a steady burn, dying down.
const tall = t => (t < CATCH ? 0 : t < CATCH + 0.1 ? 36 * ((t - CATCH) / 0.1) ** 0.6 : 20 + 16 * Math.exp(-(t - CATCH - 0.1) / 0.2)) * (1 - smooth(1.25, 2.15, t));

export function create(o) {
  const rng = new Rng(o.seed), C = o.palette, S = o.smoke, G = o.glass, s = o.seed;
  const parts = new Particles({ rng, palette: C, smoke: S.slice(0, 4), ground: 0 }); // fuel smoke: dark
  const lights = new Lights(), bits = new Bits({ rng, ground: 0 });

  lights.add(0, -4, 24, C[7], 0.9, 0.14); // the smash
  lights.add(0, -14, 34, C[6], 0.8, 0.5, { delay: CATCH }); // the whoomp

  // glass shards flung out and up, glinting as they tumble, then lying where they land
  const shards = [];
  for (let i = 0; i < 12; i++) {
    const side = i % 2 ? 1 : -1, v = rng.range(45, 95), a = rng.range(0.4, 1.3);
    shards.push(bits.spawn(side * rng.range(0, 2), -3, side * Math.cos(a) * v, -Math.sin(a) * v, { c: G[4], size: rng.range(1.5, 3), life: rng.range(1.3, 2.1), shard: i % 3 !== 2 }));
  }
  // burning fuel thrown out in low arcs, each lighting a small fire where it lands
  const drops = Array.from({ length: 10 }, (_, i) => {
    const side = i % 2 ? 1 : -1, vx = side * rng.range(25, 80), vy = -rng.range(25, 75), y0 = -3;
    const land = (-vy + Math.sqrt(vy * vy - 2 * GRAVITY * y0)) / GRAVITY;
    return { vx, vy, y0, land, x: vx * land, burn: rng.range(0.5, 1.1), r: rng.range(2.5, 4.5) };
  });
  // the whoomp: puffs of flame rolling up off the pool and turning to smoke
  for (let i = 0; i < 9; i++) {
    const x = ((i + rng.range(0, 1)) / 9 - 0.5) * 26;
    parts.spawn(FIRE, x, -8, x * 0.3, -rng.range(90, 115), rng.range(0.25, 0.35), { size: rng.range(6, 9), delay: CATCH + rng.range(0, 0.04), smoke: rng.range(0.5, 0.8), back: true, ramp: C.slice(3) });
  }
  for (let i = 0; i < 10; i++) { // smoke off the flames' tips while it burns
    const d = rng.range(0.35, 1.5);
    parts.spawn(SMOKE, rng.range(-1, 1) * spread(d) * 0.7, -tall(d) * 0.8, rng.range(-6, 6), -rng.range(20, 35), rng.range(0.7, 0.9), { size: rng.range(3, 5), delay: d, back: true });
  }
  for (let i = 0; i < 22; i++) {
    const d = rng.range(0.15, 1.6);
    parts.spawn(EMBER, rng.range(-1, 1) * spread(d), -rng.range(4, 14), rng.range(-15, 15), -rng.range(30, 60), rng.range(0.5, 0.8), { delay: d });
  }

  // fuel on the floor at x: the pool's, ragged at its edge, and the splashed drops' as they burn
  const fuel = (x, t) => {
    const w = spread(t) * (0.8 + 0.4 * noise2(x * 0.15, 0.5, s));
    let f = Math.abs(x) < w ? (1 - 0.6 * (x / w) ** 2) * (1 - smooth(1.75, 2.2, t)) : 0;
    for (const d of drops) {
      const u = (t - d.land) / d.burn;
      if (u > 0 && u < 1) f = Math.max(f, 0.6 * Math.min(1, u * 8) * (1 - u) * (1 - Math.abs(x - d.x) / d.r));
    }
    return f;
  };

  // The flames: a row of tongues along the floor, each as tall as the fuel under it and flickering on its own;
  // `odd` picks the front row (shorter) or the back. Noise scrolling up gives the licks.
  function flames(p, t, odd) {
    const H = tall(t);
    if (H < 1) return;
    const tongues = Array.from({ length: N }, (_, k) => {
      const x = X0 + k * GAP + (noise2(k, 3.5, s) - 0.5) * 2, f = k % 2 === odd ? fuel(x, t) : 0;
      return { x, w: 3.6 + 2.2 * noise2(k, 7.5, s), top: H * f * (odd ? 0.6 : 1) * (0.45 + 0.35 * noise2(k, 9.5, s) + 0.4 * noise2(t * 7 + k * 3.1, k, s)), lick: (t * 2.2 + noise2(k, 11.5, s) * 3) % 1 };
    });
    // the back row stands in a sheet of flame along the pool, so the tongues rise out of one body
    const L0 = Math.floor(X0 - 6), sheet = Array.from({ length: Math.ceil(-2 * X0) + 14 }, (_, i) => (odd ? 0 : 0.3 * H * fuel(L0 + i + 0.5, t) * (0.7 + 0.6 * noise2((L0 + i) * 0.3, t * 4, s))));
    const high = Math.max(...sheet, ...tongues.map(g => (g.top < 2 ? 0 : g.top * 1.4 + g.w * 0.5))) + 2; // the box only as tall as the fire
    const swayAt = new Map(); // per row: each tongue's sway noise
    p.shade(X0 - 6, -Math.ceil(high), -2 * X0 + 13, Math.ceil(high) + 1, (x, y) => {
      const cx = x + 0.5, cy = y + 0.5, k0 = Math.round((cx - X0) / GAP), sh = sheet[Math.floor(cx) - L0] ?? 0;
      let e = sh > 1 && -cy < sh ? 0.95 * Math.sqrt(1 + cy / sh) : 0, top = H, row = swayAt.get(cy);
      if (!row) swayAt.set(cy, (row = tongues.map((g, k) => noise2(cy * 0.12 - t * 5, k + 0.5, s) - 0.5)));
      for (let k = Math.max(0, k0 - 2); k <= Math.min(N - 1, k0 + 2); k++) {
        const g = tongues[k];
        if (g.top < 2) continue;
        const h = -cy / g.top, sway = row[k] * 6 * Math.max(0, h), half = g.w * drop(h);
        const v = half > 0 ? 1 - Math.abs(cx - g.x - sway) / half : 0;
        if (v > e) (e = v), (top = g.top);
        const r = g.w * 0.5 * (1 - g.lick), lx = g.x + sway * 1.5, ly = -g.top * (0.8 + 0.6 * g.lick); // a lick torn off its tip, rising and shrinking
        const l = r > 0.7 ? 0.7 * (1 - Math.hypot(cx - lx, cy - ly) / r) : 0;
        if (l > e) (e = l), (top = g.top);
      }
      if (e <= 0) return 0;
      const h = -cy / Math.max(top, 12), n = fbm(cx * 0.17, cy * 0.17 + t * 9, 2, s);
      const rise = h > 0.08 ? 1.05 - 0.6 * (h - 0.08) : 1.05 - 2.6 * (0.08 - h);
      const heat = e * rise - (n - 0.4) * (0.12 + 1.1 * h * h);
      const band = BANDS.find(([min]) => heat > min);
      return band ? C[band[1]] : 0;
    });
  }

  let t = 0, n = 0;
  return {
    update(dt) {
      t = ++n * dt;
      for (const b of shards) b.c = G[b.rest ? 3 : Math.abs(Math.cos(2 * b.angle)) > 0.8 ? 5 : 3]; // a glint as each turns to the light
      parts.update(dt);
      lights.update(dt);
      bits.update(dt);
    },
    drawBack(p) {
      // the scorch the fire leaves, darkening the floor as it burns and fading at the end
      const scorch = smooth(0.4, 1.4, t) * (1 - smooth(2.05, 2.45, t));
      if (scorch > 0) p.ellipse(0.5, -0.5, POOL + 2, 1.6, S[0], 0.85 * scorch);
      parts.draw(p, 'back');
      flames(p, t, 0);
    },
    draw(p) {
      const burn = smooth(CATCH, CATCH + 0.08, t) * (1 - smooth(1.3, 2.2, t));
      if (burn > 0) {
        p.glow(0, -14, 34, C[4], 0.35 * burn);
        p.glowLine(-POOL - 6, -1, POOL + 6, -1, 9, C[5], 0.5 * burn);
      }
      lights.draw(p);
      // the pool's burning surface, a line of fire on the floor, then embers glowing in it as it burns out
      const w = spread(t);
      for (let x = Math.floor(-w - 4); x <= w + 4; x++) {
        const f = fuel(x + 0.5, t), ember = smooth(1.2, 1.7, t) * (1 - smooth(2.1, 2.45, t)), cool = smooth(1.4, 2.1, t), hot = f * (1 - cool);
        if (f > 0.05 && t > CATCH && noise2(x * 0.6, t * 3, s) > 1.2 * cool - 0.2) p.px(x, -1, C[hot > 0.6 ? 6 : hot > 0.3 ? 5 : hot > 0.1 ? 4 : 3]); // breaking up as it burns out
        else if (ember > 0 && Math.abs(x) < POOL * 0.9 && noise2(x * 0.7, 1.5, s) > 0.45) {
          const glow = noise2(x * 0.5, t * 4, s);
          p.dot(x, -1, C[glow > 0.6 ? 5 : glow > 0.35 ? 4 : 3], ember);
          p.light(x, -1, C[4], 0.3 * ember * glow);
        }
      }
      // the drops in flight
      for (const d of drops) {
        if (t >= d.land) continue;
        const at = u => [d.vx * u, d.y0 + d.vy * u + 0.5 * GRAVITY * u * u], [x, y] = at(t), [bx, by] = at(Math.max(0, t - 0.04));
        p.line(bx, by, x, y, u => C[u > 0.6 ? 6 : 4]);
        p.light(x, y, C[5], 0.5);
      }
      bits.draw(p);
      parts.draw(p);
      flames(p, t, 1);
      // the smash: a white burst where the bottle broke
      if (t < 0.09) {
        const u = t / 0.09;
        p.circle(0.5, -2.5, 4 * (1 - u) + 1, C[7]);
        for (let i = 0; i < 6; i++) {
          const a = Math.PI * (1.08 + 0.168 * i), l = 5 + 7 * u;
          p.line(Math.cos(a) * 3, -2.5 + Math.sin(a) * 3, Math.cos(a) * l, -2.5 + Math.sin(a) * l, C[u < 0.5 ? 7 : 6]);
        }
      }
    },
  };
}
