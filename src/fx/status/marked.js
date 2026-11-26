const TAU = Math.PI * 2;
const DURATION = 2;
const LOCK = 0.4; // the brackets close in until here, then hold
const PULSES = [0.95, 1.5]; // the locked reticle throbs
const LET = 1.75; // it lets go: spreads and turns away, to close in again
const H = 7, WIDE = 12; // the brackets' half-size, locked and at their widest
const ARM = 3; // px along each edge from a corner
const LINE = 34; // the sight line, px back toward the shooter (-x)

export const meta = {
  name: 'Marked',
  desc: "A hunter's mark on a target: corner brackets close in on the chest and lock with a flash, then pulse, a faint sight line running back to the shooter",
  tags: ['status', 'debuff', 'mark', 'target', 'reticle', 'crosshair', 'sniper', 'hunter', 'lock'],
  size: [56, 38],
  origin: [36, 19],
  duration: DURATION,
  loop: true,
  fps: 20,
  views: ['side'],
  ramps: { palette: 8 },
  options: { palette: 'blood', seed: 1 },
  stage: { at: 'target', cast: 'archer' }, // on the chest; the archer marks it
  sound: [
    { t: 0.14, kind: 'crack', gain: 0.07, pitch: 4 }, // the brackets click in
    { t: 0.28, kind: 'crack', gain: 0.08, pitch: 4.4 },
    { t: LOCK, kind: 'crack', gain: 0.12, pitch: 3.2 }, // and lock: a tick and a ting
    { t: LOCK, kind: 'chime', gain: 0.22, pitch: 2 },
  ],
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// The brackets at t: half-size, turn (radians) and how bright (0 dim to 1 hot).
function reticle(t) {
  if (t < LOCK) { // closing in, slowing as it arrives
    const u = 1 - (1 - t / LOCK) ** 2;
    return { h: WIDE + (H - WIDE) * u, turn: (Math.PI / 4) * (1 - u), hot: 0.3 + 0.25 * u };
  }
  if (t >= LET) {
    const u = (t - LET) / (DURATION - LET), e = u * u;
    return { h: H + (WIDE - H) * e, turn: (-Math.PI / 4) * e, hot: 0.6 - 0.3 * u };
  }
  // the lock clamps one px tight and springs back; each pulse breathes out a px
  const clampIn = t - LOCK < 0.05 ? 1 : 0, throb = Math.max(...PULSES.map(p => (t >= p ? Math.exp(-(t - p) / 0.1) : 0)));
  return { h: H - clampIn + throb, turn: 0, hot: Math.max(0.6 + 0.4 * throb, 1 - (t - LOCK) / 0.25) };
}

// Four corner brackets round (0.5, 0.5), the pixel on the anchor; `rim` edges them below, for light backgrounds.
function brackets(p, h, turn, c, rim) {
  for (let i = 0; i < 4; i++) {
    const a = turn + Math.PI / 4 + (i * TAU) / 4, r = h * Math.SQRT2; // the corner
    const cx = Math.cos(a) * r, cy = Math.sin(a) * r;
    const e1 = a + (3 * Math.PI) / 4, e2 = a - (3 * Math.PI) / 4; // back along the two edges
    const pts = [[cx + Math.cos(e1) * ARM, cy + Math.sin(e1) * ARM], [cx, cy], [cx + Math.cos(e2) * ARM, cy + Math.sin(e2) * ARM]];
    if (rim) p.polyline(pts.map(([x, y]) => [x + 0.5, y + 1.5]), rim);
    p.polyline(pts.map(([x, y]) => [x + 0.5, y + 0.5]), c);
  }
}

export function drawBack(p, t, o) {
  const C = o.palette, { hot } = reticle(t), lock = t >= LOCK && t < LET;
  // the sight line: faint, brighter near the mark, a mote of light running in to land on the lock
  const k = 0.12 + 0.18 * hot, x1 = -H - 3, fall = x => clamp((x + LINE) / (LINE + x1), 0, 1) ** 2;
  p.shade(-LINE, 0, LINE + x1, 1, x => C[fall(x) > 0.5 ? 5 : 4], x => (0.25 + 1.5 * k) * fall(x));
  p.glowLine(-LINE, 0.5, x1, 0.5, 2, C[4], (u, d) => k * u * (1 - d) ** 2);
  const m = (t - (LOCK - 0.2)) / 0.2;
  if (m >= 0 && m < 1) {
    const x = -LINE + (LINE + x1) * m * m;
    p.line(Math.max(-LINE, x - 3), 0, x, 0, u => C[u > 0.6 ? 7 : 6]);
    p.light(x, 0, C[7], 0.6);
  }
  if (lock) p.glow(0.5, 0.5, 9, C[5], 0.12 + 0.2 * (hot - 0.6) / 0.4);
}

export function draw(p, t, o) {
  const C = o.palette, { h, turn, hot } = reticle(t), lock = t >= LOCK && t < LET;
  const c = C[hot > 0.85 ? 7 : hot > 0.55 ? 6 : 5];
  brackets(p, Math.round(h), turn, c, C[1]);
  if (lock) {
    p.px(0, 0, C[hot > 0.7 ? 7 : 6]); // the point it is locked on, and ticks pointing at it
    for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) p.line(dx * 3, dy * 3, dx * 4, dy * 4, C[hot > 0.85 ? 6 : 5]);
    p.light(0, 0, C[7], 0.5 * hot);
    const u = (t - LOCK) / 0.3;
    if (u < 1) p.ring(0.5, 0.5, H + 1 + 6 * (1 - (1 - u) ** 2), 1, C[u < 0.35 ? 7 : u < 0.7 ? 5 : 4], u < 0.5 ? 1 : 2 * (1 - u)); // the lock rings out
  }
}
