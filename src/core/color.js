// Color ramps and the palette table. Colors are [r, g, b, a] byte arrays; effects only ever see palette indices.

/** Named ramps, dark to bright. */
export const PAL = {
  fire: ['#1f0a12', '#4a1015', '#8a1c12', '#c9380f', '#ef6a14', '#ffa02a', '#ffd35a', '#fff6c8'],
  ember: ['#140808', '#2e0e0c', '#521610', '#7c2010', '#a8320e', '#d04e12', '#ec7a22', '#fcae4a'],
  ice: ['#0c1428', '#14305a', '#1c5288', '#2a7fb8', '#4fb0dc', '#8ad6ee', '#c4eef8', '#f2fcff'],
  water: ['#0b1030', '#11235e', '#163d94', '#1c5ec0', '#2a86dc', '#4eaeec', '#8ad2f6', '#d6f2ff'],
  electric: ['#120a2e', '#22186a', '#2e36b0', '#3a6ee8', '#52a8ff', '#8ad8ff', '#c8f4ff', '#ffffff'],
  arcane: ['#140a24', '#2e1050', '#4f1a86', '#7a2cb8', '#a64ade', '#cc7cf2', '#eab4fc', '#fbe8ff'],
  holy: ['#3a2a14', '#6a5022', '#a07c30', '#d0aa44', '#f0d266', '#fcea98', '#fff8d0', '#ffffff'],
  heal: ['#08201a', '#0e3d2a', '#14603a', '#20884a', '#3cb05a', '#72d478', '#b2f0a4', '#ecffe0'],
  poison: ['#141028', '#1f2a2a', '#244420', '#3a6a1a', '#5e9418', '#8cc020', '#bfe24a', '#effc9a'],
  shadow: ['#06040c', '#120c20', '#201636', '#30224c', '#443266', '#5c4682', '#7a62a0', '#a08cc4'],
  blood: ['#12040a', '#2c0810', '#4e0c14', '#78101a', '#a01a22', '#c4302e', '#e05a4a', '#f4907a'],
  smoke: ['#1c1a22', '#2e2b36', '#45414e', '#5e5968', '#7a7584', '#9893a0', '#b8b4be', '#dcd9e0'],
  dust: ['#2a1e16', '#423024', '#5c4632', '#7a5e44', '#987a58', '#b4986e', '#d0b88c', '#ecdcb4'],
  gold: ['#2a1406', '#542a08', '#80460c', '#ac6a12', '#d4921c', '#eeb834', '#fcdc62', '#fff4b0'],
  stone: ['#141418', '#24242a', '#36363e', '#4a4a54', '#60606c', '#7a7a86', '#9898a2', '#bcbcc4'],
  leaf: ['#0a1a0e', '#12301a', '#1c4a22', '#2a6628', '#448430', '#66a23a', '#90c04e', '#c2de72'],
};

/** Parses `#rgb`, `#rrggbb` or `#rrggbbaa` to [r, g, b, a]. */
export function hex(s) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(s);
  if (!m) throw new Error(`hex: not a color: ${s}`);
  let h = m[1].length === 3 ? [...m[1]].map(c => c + c).join('') : m[1];
  if (h.length === 6) h += 'ff';
  return [0, 2, 4, 6].map(i => parseInt(h.slice(i, i + 2), 16));
}

/** A ramp name from PAL, or an array of hex strings or [r, g, b, a], as [r, g, b, a] colors. */
export function ramp(v) {
  if (typeof v === 'string') {
    if (!PAL[v]) throw new Error(`ramp: unknown ramp "${v}" (known: ${Object.keys(PAL).join(', ')})`);
    return PAL[v].map(hex);
  }
  if (!Array.isArray(v) || !v.length) throw new Error('ramp: expected a ramp name or an array of colors');
  return v.map(c => (typeof c === 'string' ? hex(c) : c));
}

const lum = c => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];

/** Resamples a ramp to `n` steps, dark to bright, keeping both ends. Fewer steps pick existing colors. */
export function fit(r, n) {
  r = ramp(r);
  if (lum(r[0]) > lum(r[r.length - 1])) r = [...r].reverse();
  if (n === 1) return [r[r.length - 1]];
  return Array.from({ length: n }, (_, i) => {
    const t = (i * (r.length - 1)) / (n - 1);
    if (n <= r.length) return r[Math.round(t)];
    const k = Math.floor(t), a = r[k], b = r[Math.min(k + 1, r.length - 1)];
    return a.map((v, j) => Math.round(v + (b[j] - v) * (t - k)));
  });
}

/**
 * Lays an effect's ramps ({ name: colors }, `palette` first, then the others in order) into a 256-entry RGBA table.
 * Index 0 is reserved for "nothing". Returns the table, each ramp as an array of indices, and each ramp's span.
 */
export function paletteTable(ramps) {
  const names = Object.keys(ramps).sort((a, b) => (b === 'palette') - (a === 'palette'));
  const table = new Uint8Array(256 * 4), index = {}, spans = [];
  let next = 1;
  for (const name of names) {
    const colors = ramp(ramps[name]);
    if (next + colors.length > 256) throw new Error(`paletteTable: ramps need ${next - 1 + colors.length} entries, the table holds 255`);
    index[name] = colors.map((c, i) => {
      table.set([c[0], c[1], c[2], c[3] ?? 255], (next + i) * 4);
      return next + i;
    });
    spans.push({ name, from: next, steps: colors.length });
    next += colors.length;
  }
  return { table, index, ramps: spans };
}
