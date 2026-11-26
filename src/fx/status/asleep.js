const TAU = Math.PI * 2;
const DURATION = 4.5;
const N = 3, LIFE = 0.8; // Zs, a third of a loop apart, each rising for most of a loop: two or three at a time
const BREATHS = 3; // a breath a Z: they surge up on the out-breath and hang on the in-breath

// Z bitmaps, growing: '7' the brightest step, lit from the top left, down to '4'.
const ZS = [
  ['7776', '..6.', '.6..', '6555'],
  ['77776', '...6.', '..6..', '.6...', '65554'],
  ['777776', '...76.', '..76..', '.76...', '76....', '665554'],
];

export const meta = {
  name: 'Asleep',
  desc: 'A sleep status over the head: Zs drift up and sideways one after another, growing, swaying and fading, in a slow breathing rhythm',
  tags: ['status', 'debuff', 'sleep', 'asleep', 'zzz', 'snore', 'drowsy'],
  size: [28, 26],
  origin: [8, 24],
  duration: DURATION,
  loop: true,
  fps: 12,
  views: ['side'],
  ramps: { palette: 8 },
  options: { palette: 'ice', seed: 1 },
  // a slow, low snore: a breath out as each Z surges up, a softer, higher breath in as they hang
  sound: Array.from({ length: BREATHS }, (_, j) => [
    { t: ((j + 0.5) / BREATHS) * DURATION - 0.4, kind: 'whoosh', gain: 0.25, pitch: 0.3 },
    { t: ((j + 0.9) / BREATHS) * DURATION - 0.33, kind: 'whoosh', gain: 0.14, pitch: 0.36 },
  ]).flat(),
};

// A bitmap with its top left at (x0, y0), its steps lowered by `shift`, at alpha `a`; `rim` edges it below and right.
function sprite(p, C, rows, x0, y0, shift, a, rim) {
  const h = rows.length, w = rows[0].length, at = (i, k) => rows[i]?.[k] > '.';
  if (rim) {
    for (let i = 0; i <= h; i++) for (let k = 0; k <= w; k++) if (!at(i, k) && (at(i - 1, k) || at(i, k - 1))) p.dot(x0 + k, y0 + i, rim, a);
  }
  rows.forEach((row, i) => [...row].forEach((ch, k) => ch !== '.' && p.dot(x0 + k, y0 + i, C[Math.max(1, +ch - shift)], a)));
}

export function draw(p, t, o) {
  const C = o.palette, ph = t / DURATION, out = 0.5 - 0.5 * Math.cos(TAU * BREATHS * ph); // 1 at the out-breath
  p.glow(1, -3, 5, C[4], 0.15 * out); // where they come from
  for (let j = 0; j < N; j++) {
    const u = (ph + j / N) % 1;
    if (u >= LIFE) continue;
    // On each out-breath they surge up and swing right, on the in-breath hang and drift back: the breath is the same
    // for all, and the higher a Z the wider it swings, so none swings back onto the one below it.
    const v = u / LIFE, b = TAU * BREATHS * u, rise = (u - (0.8 * Math.sin(b)) / (TAU * BREATHS)) / LIFE;
    const x = 12 * v - 2 * v * Math.sin(b), y = -3 - 16 * rise;
    if (v < 0.06) { // a dot first, then the Z
      p.px(x, y, C[6]);
      continue;
    }
    const rows = ZS[v < 0.3 ? 0 : v < 0.6 ? 1 : 2], w = rows[0].length;
    const shift = v < 0.7 ? 0 : v < 0.8 ? 1 : v < 0.9 ? 2 : 3; // fades by stepping down the ramp
    const X = Math.round(x - w / 2), Y = Math.round(y - w / 2);
    p.glow(X + w / 2, Y + w / 2, w / 2 + 3, C[5], (0.16 + 0.12 * out) * (1 - shift / 4));
    sprite(p, C, rows, X, Y, shift, v < 0.96 ? 1 : 0.5, shift < 2 && C[2]);
  }
}
