export const meta = {
  name: 'Curse',
  desc: 'A status over the target\'s head (the anchor): a ghostly skull turns side to side with glinting eye sockets inside a ring of runes and drips shadow onto it',
  tags: ['status', 'shadow', 'curse', 'debuff', 'skull', 'magic'],
  size: [30, 40],
  origin: [15, 38],
  duration: 2,
  loop: true,
  fps: 12,
  views: ['side'],
  ramps: { palette: 8, rim: 8 },
  options: { palette: 'shadow', rim: 'arcane', seed: 1 },
  sound: [
    // a low murmur and a dark bell, quiet: it plays for as long as the curse lasts; a plink as each drip lands
    { t: 0, kind: 'whoosh', gain: 0.2, pitch: 0.3 },
    { t: 1, kind: 'whoosh', gain: 0.16, pitch: 0.33 },
    { t: 0.2, kind: 'chime', gain: 0.12, pitch: 0.36 },
    ...[0.6, 0.27, 0.93].map(ph => ({ t: ph * 2, kind: 'chime', gain: 0.08, pitch: 3 })),
  ],
};

const TAU = Math.PI * 2;
const SY = -22; // the skull's center
// The skull's rows from y = -5 to 4: [left, right] in px from its center. Rounded cranium, cheekbones, a narrow jaw.
const ROWS = [[-3, 3], [-4, 4], [-5, 5], [-5, 5], [-5, 5], [-5, 5], [-4, 4], [-3, 3], [-3, 3], [-2, 2]];
// Runes on the ring: a few pixels each, [dx, dy] from the rune's center.
const GLYPHS = [[[0, -1], [0, 1], [-1, -1], [1, -1]], [[0, -1], [0, 1], [-1, 0], [1, 1]], [[-1, -1], [1, -1], [0, 1], [-1, 1]]];
const DRIPS = [[0, -1], [1 / 3, 1], [2 / 3, 0]]; // phase in the loop, which strand of the tail it falls from

// Where the skull is this frame: it bobs and turns its head from side to side, in whole pixels.
const pose = ph => ({ y: SY + Math.round(Math.sin(TAU * ph * 2)), ox: Math.round(1.4 * Math.sin(TAU * ph)) });

// The ring of runes round the skull, seen at a slant; front is the half nearer the viewer.
function ring(p, ph, y, front, S, R) {
  for (let i = 0; i < 32; i++) {
    const a0 = (i / 32) * TAU, a1 = ((i + 1) / 32) * TAU;
    if (Math.sin((a0 + a1) / 2) > 0 === front && i % 2) p.line(Math.cos(a0) * 11, y + Math.sin(a0) * 3, Math.cos(a1) * 11, y + Math.sin(a1) * 3, S[front ? 5 : 3]);
  }
  for (let i = 0; i < 3; i++) {
    const a = TAU * (ph + i / 3), x = Math.round(Math.cos(a) * 11), ry = Math.round(y + Math.sin(a) * 3) - 1;
    if (Math.sin(a) > 0 !== front) continue;
    for (const [dx, dy] of GLYPHS[i]) p.px(x + dx, ry + dy, front ? R[4] : S[5]);
    p.px(x, ry, front ? R[6] : S[6]);
    if (front) p.glow(x + 0.5, ry + 0.5, 4, R[5], 0.3);
  }
}

export function drawBack(p, t, o) {
  const S = o.palette, R = o.rim, ph = t / meta.duration, { y } = pose(ph);
  p.glow(0, y, 13, R[4], 0.22 + 0.06 * Math.sin(TAU * ph * 2));
  ring(p, ph, y + 1, false, S, R);
}

export function draw(p, t, o) {
  const S = o.palette, R = o.rim, ph = t / meta.duration, { y: Y, ox } = pose(ph);

  // wisps of shadow curling up off the crown, each rising twice a loop
  for (let j = 0; j < 3; j++) {
    const u = (ph * 2 + j / 3) % 1, x = (j - 1) * 3 + Math.sin(TAU * (u + j / 3)) * 1.5, y = Y - 5 - u * 9;
    p.blend(x, y, S[u < 0.4 ? 5 : 4], 0.9 * (1 - u));
    p.blend(x - Math.cos(TAU * (u + j / 3)), y + 1, S[3], 0.6 * (1 - u));
  }

  // the skull, pale bone with dark holes: the features shift with the turn and fall off the side it turns toward
  ROWS.forEach(([l, r], i) => {
    const y = Y - 5 + i, row = i - 5;
    for (let x = l; x <= r; x++) {
      const ex = x - ox, rim = x === l || x === r || i === 0 || i === ROWS.length - 1;
      let c = rim ? (x < 0 && row < 1 ? S[6] : S[4]) : x + row > 3 ? S[5] : S[x + row < -4 ? 7 : 6]; // lit from up-left
      const ax = Math.abs(ex);
      if (row >= -2 && row <= 0 && ax >= 1 && ax <= (row === -2 ? 2 : 3)) c = S[0]; // big sockets, one bone apart
      if (row === 1 && ax <= 1 && ex !== 0) c = S[1]; // the nose, two holes
      if (row === 3 && ax <= 2) c = (ex + 10) % 2 ? S[1] : S[6]; // teeth
      if (x - ox > r || x - ox < l) c = S[3]; // the far side, turned away
      p.px(x, y, c);
    }
  });
  for (const side of [-1, 1]) { // a cold spark deep in each socket, blinking now and then
    const x = ox + side * 2, blink = (ph * 4 + 0.15) % 1 < 0.12;
    if (Math.abs(x) <= 3 && !blink) {
      p.px(x, Y, R[5]);
      p.light(x, Y, R[6], 0.35);
    }
  }

  ring(p, ph, Y + 1, true, S, R);

  // shadow drips from the tail onto the head below: a bead swells, lets go, falls faster and faster, splashes
  for (const [off, side] of DRIPS) {
    const u = (ph + 1 - off) % 1, x = ox * 0.5 + side * 1.5, top = Y + 4;
    if (u < 0.35) {
      if (u > 0.15) p.px(x, top + 1, S[u > 0.27 ? 5 : 4]);
    } else if (u < 0.6) {
      const v = (u - 0.35) / 0.25, dy = top + 1 + v * v * (-1 - top - 1);
      p.line(x, dy - 1 - 2 * v, x, dy, w => S[w > 0.6 ? 6 : 4]);
    } else if (u < 0.7) {
      const sp = u < 0.65 ? 1 : 2, h = u < 0.65 ? 2 : 1;
      p.px(x - sp, -h, S[5]);
      p.px(x + sp, -h, S[5]);
    }
  }
}
