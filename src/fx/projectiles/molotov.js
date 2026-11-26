import { tileFbm, rand } from '../../core/index.js';

export const meta = {
  name: 'Molotov',
  desc: 'A thrown fire bottle tumbling end over end: green glass with a highlight down its side and dark fuel in its base, a rag stuffed in its neck burning, the flame streaming back and shedding embers',
  tags: ['projectile', 'thrown', 'molotov', 'fire', 'military'],
  stage: { arc: 24, speed: 120, looks: { gather: 'windup', point: 'throw', crouch: 'windup', raise: 'throw' } }, // the soldier lobs it
  size: [60, 48],
  origin: [38, 24],
  duration: 0.4,
  loop: true,
  fps: 20,
  views: ['side', 'top'],
  top: { directions: 8 },
  ramps: { palette: 8, glass: 6, rag: 4 },
  options: { palette: 'fire', glass: ['#0c2216', '#174430', '#266446', '#3f8c5e', '#7cc493', '#dcfbe6'], rag: 'dust', seed: 1 },
  sound: [{ t: 0, kind: 'crackle', gain: 0.4, pitch: 1.2 }, { t: 0.05, kind: 'whoosh', gain: 0.22, pitch: 1.2 }], // the rag burning, its flame roaring round once a turn
};

const TAU = Math.PI * 2;
const STEPS = 8; // eighth turns a loop, clockwise: it tumbles forward, one a frame
const TIP = 11; // the rag's burning end, from the pivot along the bottle
const L = 15; // the longest tongue, back from the rag
const LIGHT = [-0.6, -0.8]; // toward the light, upper left
// Tongues streaming back off the rag: rise at their end, length, width at the root, waves per loop, phase, heat.
const TONGUES = [[-6, 1, 3, 2, 0, 0.95], [-2, 0.75, 2.4, 3, 0.4, 0.9], [2, 0.5, 1.6, 2, 0.7, 0.8]];
const BANDS = [[0.92, 7], [0.74, 6], [0.56, 5], [0.4, 4], [0.26, 3], [0.15, 2]];

// The bottle's half width at `a` px along it from the pivot (base -5.6, lip 6): a round-shouldered body, a neck, a lip.
function half(a) {
  if (a < -5.6 || a > 6.2) return -1;
  if (a < 1.5) return 2.4;
  if (a < 3.5) return 2.4 - (a - 1.5) * 0.65;
  return a > 5.3 ? 1.5 : 1.1;
}
const inside = (a, b) => Math.abs(b) <= half(a) && !(a < -4.8 && Math.abs(b) > 1.6); // the base's corners rounded

// The bottle at angle th (its neck's direction, radians clockwise from +x), turned about the pixel at the anchor.
function bottle(p, th, G, R, C) {
  const c = Math.cos(th), s = Math.sin(th), nb = -s * LIGHT[0] + c * LIGHT[1]; // how much its +b side faces the light
  const ab = (x, y) => [x * c + y * s, -x * s + y * c];
  p.shade(-12, -12, 25, 25, (x, y) => {
    const [a, b] = ab(x, y), lit = (b / 2.4) * Math.sign(nb || 1); // -1 shadowed side to 1 lit side
    const glass = inside(a, b), rag = !glass && a > 5 && a < TIP - 0.5 && Math.abs(b - 0.3 * (a - 6)) < 1.05;
    if (rag) return a > TIP - 2 ? C[a > TIP - 1.3 ? 6 : 4] : R[lit > 0 ? 2 : 1]; // its end already burning
    if (!glass) return 0;
    const rim = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([u, v]) => !inside(...ab(x + u, y + v)));
    if (a > 3.5) return G[rim && lit < 0 ? 1 : lit > 0 ? 3 : 2]; // the neck
    if (rim) return G[lit > 0.3 ? 2 : 1];
    if (lit > 0.25 && lit < 0.75 && a > -4.5 && a < 2.5) return G[5]; // the highlight down the lit side
    if (a < -1.5) return G[lit > 0 ? 2 : 1]; // the fuel, dark
    if (a < -0.5) return G[4]; // its surface catching the light
    return G[lit > -0.2 ? 4 : 3]; // empty glass
  });
}

export function draw(p, t, o) {
  const C = o.palette, G = o.glass, R = o.rag, s = o.seed, ph = t / meta.duration, top = o.view === 'top';
  const step = v => ((Math.floor(v * STEPS + 1e-6) % STEPS) + STEPS) % STEPS;
  const angle = k => -Math.PI / 2 + (k * TAU) / STEPS, th = angle(step(ph));
  const tip = k => [0.5 + Math.cos(angle(k)) * TIP, 0.5 + Math.sin(angle(k)) * TIP];
  const [tx, ty] = tip(step(ph));
  const flick = 0.5 + 0.3 * Math.sin(TAU * (ph * 3 + 0.2)) + 0.2 * Math.sin(TAU * (ph * 5 + 0.6));

  p.glowLine(tx - L, ty - 3, tx, ty, 6, C[5], (u, d) => 0.35 * u * (1 - d) ** 2);
  p.glow(tx, ty, 11, C[5], 0.4 + 0.15 * flick);

  // embers peeling off where the rag was as they left, then left behind by the air, rising and cooling
  for (let j = 0; j < 10; j++) {
    const k = 3, u = (ph * k + (j + 0.6 * rand(j, s)) / 10) % 1;
    if (u > 0.9) continue;
    const [x0, y0] = tip(step(ph - u / k)), age = u * (meta.duration / k);
    const side = top ? (rand(j, s, 1) < 0.5 ? -1 : 1) : -1, wob = Math.sin(TAU * (u * 2 + rand(j, s, 2))) * 0.8;
    const x = x0 - 120 * age - 400 * age * age, y = y0 + side * (25 * age * (0.5 + rand(j, s, 3))) + wob;
    const c = C[u < 0.2 ? 7 : u < 0.4 ? 6 : u < 0.65 ? 5 : 4];
    if (u < 0.25) p.line(x, y, x + 1, y, c);
    else p.dot(x, y, c, 1 - Math.max(0, u - 0.65) / 0.25);
    p.light(x, y, C[5], 0.4 * (1 - u));
  }

  // the flame: a ball round the rag's end and tongues streaming back off it, a wave running down each; noise
  // streaming back two whole tiles a loop
  p.shade(tx - L - 4, ty - 9, L + 8, 14, (x, y) => {
    const cx = x + 0.5, cy = y + 0.5, v = (tx - cx) / L, r = 2.6 + 0.4 * flick;
    let e = 1 - Math.hypot((cx - tx) / (cx > tx ? 0.7 : 1.3), (cy - ty) / 1.1) / r;
    for (const [rise, len, w, k, phase, hot] of TONGUES) {
      const u = v / len;
      if (u <= 0 || u >= 1) continue;
      const dy = top ? 0.5 * rise : rise, mid = ty + dy * u ** 1.4 + Math.sin(TAU * (u * 1.2 - ph * k + phase)) * 1.1 * u;
      const hw = w * (1 - u) ** 1.1;
      if (hw > 0.55) e = Math.max(e, hot * (1 - Math.abs(cy - mid) / hw));
    }
    if (e <= 0) return 0;
    const n = tileFbm(cx * 0.2 + ph * 10, cy * 0.5, 5, 2, s);
    const heat = e * (1.2 - 0.6 * Math.max(0, v)) - (n - 0.45) * 0.35 * Math.min(1, e * 4);
    const band = BANDS.find(([min]) => heat > min);
    return band ? C[band[1]] : 0;
  });

  bottle(p, th, G, R, C);
  p.px(tx, ty, C[7]);
}
