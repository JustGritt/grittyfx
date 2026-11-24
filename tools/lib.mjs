// Shared by the tools: finding effects, rendering their frames, building bundles.
import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createFx, createFrame, composite, layout, HEADINGS, synth } from '../src/core/index.js';
import { encodePng } from './png.mjs';
import { encodeWav } from './sfx.mjs';
import { encodeAseprite, decodeAseprite, BLEND } from './aseprite.mjs';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));
const FX = new URL('../src/fx/', import.meta.url);
const VERSION = JSON.parse(readFileSync(new URL('../package.json', import.meta.url))).version;

/** Every effect id ("category/name"), sorted. */
export function listIds() {
  if (!existsSync(FX)) return [];
  return readdirSync(FX, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .flatMap(d => readdirSync(new URL(`${d.name}/`, FX)).filter(f => f.endsWith('.js')).map(f => `${d.name}/${f.slice(0, -3)}`))
    .sort();
}

/** Ids matching each pattern: an id, a category, or a glob where * matches anything. */
export function matchIds(patterns) {
  const all = listIds(), out = new Set();
  for (const pat of patterns) {
    const re = new RegExp(`^${pat.split('*').map(s => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`);
    const hits = all.filter(id => re.test(id) || id.startsWith(`${pat}/`));
    if (!hits.length) throw new Error(`no effect matches "${pat}" (try node tools/list.mjs)`);
    hits.forEach(id => out.add(id));
  }
  return [...out];
}

export const loadEffect = id => import(new URL(`${id}.js`, FX));

/** Every effect's id and meta: the gallery's fx-list.json. */
export const manifest = () => Promise.all(listIds().map(async id => ({ id, meta: (await loadEffect(id)).meta })));

/** The views an effect bakes: meta.views, side when left out. */
export const views = meta => meta.views ?? ['side'];

/**
 * Steps a live effect to time t and draws its back then front layer into a new frame of layout `v` (the side one when
 * left out), turned to heading `dir` (0 to 7, 45 degrees apart clockwise from east).
 */
export function drawAt(fx, t, { size: [w, h], origin: [ox, oy] } = layout(fx.meta), dir = 0) {
  const frame = createFrame(w, h, ox, oy);
  fx.update(t - fx.t);
  fx.angle = (dir * Math.PI) / 4;
  // shortcut: back and front share one frame, so a bundle can't put a character between them; split when engines need it.
  return { frame, painters: [fx.draw(frame, 'back'), fx.draw(frame, 'front')] };
}

/**
 * Every frame of an effect at `fps` in a view: one period of a loop, or a one-shot up to (not at) its duration; `n`
 * per direction. A top view's directions come row by row: frames[d * n + i] is frame i at heading d.
 */
export function renderFrames(mod, { fps = mod.meta.fps ?? 30, opts = {}, view = 'side' } = {}) {
  const v = layout(mod.meta, view), fx = createFx(mod, { ...opts, view }), n = Math.max(1, Math.round(mod.meta.duration * fps)), frames = [];
  for (let i = 0; i < n; i++) for (let d = 0; d < v.directions; d++) frames[d * n + i] = drawAt(fx, i / fps, v, d).frame;
  return { fx, frames, fps, n, ...v };
}

/** Copies a w x h RGBA image into a bigger one at (x, y), each pixel scaled to zoom x zoom. */
export function blit(dst, dw, src, w, h, x, y, zoom = 1) {
  for (let sy = 0; sy < h * zoom; sy++) {
    for (let sx = 0; sx < w * zoom; sx++) {
      const s = (Math.floor(sy / zoom) * w + Math.floor(sx / zoom)) * 4;
      dst.set(src.subarray(s, s + 4), ((y + sy) * dw + x + sx) * 4);
    }
  }
}

/**
 * The bundle of a view: data sheet, palette, baked sheet (PNG buffers), sound (a WAV buffer, null when silent) and the
 * Aseprite JSON with meta.grittyfx. A top view is its own bundle, <name>_top.*, with one row per direction (E, SE, ...
 * NE), each tagged with its heading; it shares the side's <name>.wav, as the sound doesn't depend on the view.
 * `r` (renderFrames' result) bundles given frames instead of rendering them: an edited .aseprite's.
 */
export function makeBundle(id, mod, { fps, opts, view = 'side', r = renderFrames(mod, { fps, opts, view }) } = {}) {
  const { meta } = mod, { fx, frames, n, directions } = r;
  const base = id.split('/').pop(), name = base + (view === 'top' ? '_top' : ''), [w, h] = r.size;
  const columns = directions > 1 ? n : Math.min(n, 8), W = columns * w, H = Math.ceil(frames.length / columns) * h;
  const data = new Uint8Array(W * H * 4), baked = new Uint8Array(W * H * 4);
  frames.forEach((f, i) => {
    const x = (i % columns) * w, y = Math.floor(i / columns) * h, rgba = new Uint8Array(w * h * 4);
    for (let p = 0; p < w * h; p++) rgba.set([f.color[p * 2], f.color[p * 2 + 1], f.light[p * 2], f.light[p * 2 + 1]], p * 4);
    blit(data, W, rgba, w, h, x, y);
    blit(baked, W, composite(f, fx.palette), w, h, x, y);
  });
  const sound = synth(meta, fx.o.seed);
  const files = { data: `${name}_data.png`, palette: `${name}_pal.png`, sheet: `${name}.png`, json: `${name}.json`, ...(sound && { sound: `${base}.wav` }) };
  const act = meta.act && {
    ...meta.act,
    hits: (meta.act.hits ?? []).map(hit => ({ frame: Math.min(n - 1, Math.round(hit.t * r.fps)), ...hit })),
  };
  const json = {
    frames: frames.map((_, i) => ({
      filename: String(i), // Phaser's createFromAseprite finds frames by index
      frame: { x: (i % columns) * w, y: Math.floor(i / columns) * h, w, h },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w, h },
      sourceSize: { w, h },
      duration: Math.round(1000 / r.fps),
    })),
    meta: {
      app: 'grittyfx',
      version: VERSION,
      image: files.sheet,
      format: 'RGBA8888',
      size: { w: W, h: H },
      scale: '1',
      frameTags: directions > 1
        ? HEADINGS.map((tag, d) => ({ name: tag, from: d * n, to: d * n + n - 1, direction: 'forward' }))
        : [{ name, from: 0, to: n - 1, direction: 'forward' }],
      grittyfx: {
        id, fps: r.fps, frames: n, frameSize: [w, h], columns, pivot: r.origin,
        loop: !!meta.loop, end: meta.end ?? (meta.loop ? 'loop' : 'remove'),
        data: files.data, palette: files.palette, sheet: files.sheet, ramps: fx.ramps, light_gain: 1,
        // a mirrored top view would swing the other way: its headings are all baked
        view, directions, mirror: view === 'side' && (meta.mirror ?? true),
        ...(act && { act }),
        ...(sound && { sound: files.sound }),
      },
    },
  };
  return {
    files,
    json,
    png: { data: encodePng(W, H, data), palette: encodePng(256, 1, fx.palette), sheet: encodePng(W, H, baked) },
    wav: sound && encodeWav(sound, meta.loop),
  };
}

/**
 * An effect's palette as [r, g, b] per index, up to its last ramp entry. A color repeated in two ramps has its blue
 * nudged one step on the repeat, so every color in an .aseprite file finds its index.
 */
function uniquePalette(fx) {
  const last = fx.ramps.reduce((n, r) => Math.max(n, r.from + r.steps - 1), 0), seen = new Set(), out = [[0, 0, 0]];
  for (let i = 1; i <= last; i++) {
    const c = [...fx.palette.subarray(i * 4, i * 4 + 3)], step = c[2] < 128 ? 1 : -1;
    while (seen.has(c.join())) c[2] += step;
    seen.add(c.join());
    out.push(c);
  }
  return out;
}

/**
 * The side view as an .aseprite file to edit by hand: a color layer and a light layer (Addition, so the glow shows),
 * each pixel its palette color with its alpha or intensity; the effect's palette; a one-frame `hit freeze=.. shake=..`
 * tag per act hit; and on the color layer, user data naming the effect, fps and options for fromAseprite.
 */
export function asepriteFile(id, mod, { fps, opts = {} } = {}) {
  const r = renderFrames(mod, { fps, opts }), [w, h] = r.size, pal = uniquePalette(r.fx);
  const cel = buf => {
    const rgba = new Uint8Array(w * h * 4);
    for (let p = 0; p < w * h; p++) if (buf[p * 2] && buf[p * 2 + 1]) rgba.set([...pal[buf[p * 2]], buf[p * 2 + 1]], p * 4);
    return { x: 0, y: 0, w, h, rgba };
  };
  const tags = (mod.meta.act?.hits ?? []).map(({ t, ...hit }) => {
    const f = Math.min(r.n - 1, Math.round(t * r.fps));
    return { from: f, to: f, name: ['hit', ...Object.entries(hit).map(([k, v]) => `${k}=${v}`)].join(' ') };
  });
  return encodeAseprite({
    w, h, tags,
    palette: pal.map((c, i) => [...c, i ? 255 : 0]),
    layers: [{ name: 'color', userData: JSON.stringify({ grittyfx: id, fps: r.fps, opts }) }, { name: 'light', blend: BLEND.addition }],
    frames: r.frames.map(f => ({ duration: Math.round(1000 / r.fps), cels: [cel(f.color), cel(f.light)] })),
  });
}

/** Maps time t through anchors [[old, new], ...] sorted by old: linear between two, extended past the ends. */
export function warp(anchors, t) {
  let i = 1;
  while (i < anchors.length - 1 && anchors[i][0] <= t) i++;
  const [[a0, b0], [a1, b1]] = [anchors[i - 1], anchors[i]];
  return a1 > a0 ? b0 + ((t - a0) * (b1 - b0)) / (a1 - a0) : b1;
}

/**
 * The bundle of an .aseprite file that asepriteFile wrote, after editing: each frame held for its duration (rounded
 * to whole frames at the effect's fps), its `hit` tags as the act hits, and the sound's cues moved with the hits. It
 * is named `name` (the file's), in the effect's category. Returns { id, bundle, warnings }; pixels whose color isn't
 * in the palette throw, as they would have no index to recolor.
 */
export async function fromAseprite(buf, name) {
  const ase = decodeAseprite(buf), layer = n => ase.layers.findIndex(l => l.name === n && l.type === 0);
  const color = layer('color'), light = layer('light'), data = ase.layers[color]?.userData ?? '';
  const info = data.includes('"grittyfx"') && JSON.parse(data);
  if (!info || !(info.fps > 0) || light < 0) throw new Error('not a grittyfx file: it needs the color layer (with its grittyfx user data) and the light layer that render.mjs --aseprite writes');
  const extra = ase.layers.find((l, i) => i !== color && i !== light && !(l.flags & 64)); // 64: a reference layer
  if (extra) throw new Error(`layer "${extra.name}": only the color and light layers are read; merge it into one of them (Layer > Merge Down) or delete it`);
  // the id is imported as a module: only one of the library's, whatever a shared file says
  if (!listIds().includes(info.grittyfx)) throw new Error(`the file is made from "${info.grittyfx}", which isn't an effect here (try node tools/list.mjs)`);
  const mod = await loadEffect(info.grittyfx), { fps } = info, fx = createFx(mod, { ...info.opts, view: 'side' });
  const { size: [w, h], origin } = layout(mod.meta);
  if (ase.w !== w || ase.h !== h) throw new Error(`the canvas is ${ase.w} x ${ase.h} but ${info.grittyfx} is ${w} x ${h}: set it back with Sprite > Canvas Size`);
  const index = new Map(uniquePalette(fx).map((c, i) => [c.join(), i]).slice(1)), bad = [], warnings = [], frames = [], starts = [];
  ase.frames.forEach((f, k) => {
    const frame = createFrame(w, h, ...origin);
    for (const [l, out] of [[color, frame.color], [light, frame.light]]) {
      const cel = f.cels[l], k255 = cel && (cel.opacity * ase.layers[l].opacity) / 65025;
      for (let y = 0; cel && y < cel.h; y++) {
        for (let x = 0; x < cel.w; x++) {
          const X = cel.x + x, Y = cel.y + y, s = (y * cel.w + x) * 4, a = Math.round(cel.rgba[s + 3] * k255), rgb = cel.rgba.subarray(s, s + 3);
          if (!a || X < 0 || Y < 0 || X >= w || Y >= h) continue;
          const i = index.get(rgb.join());
          if (i === undefined) bad.push(`frame ${k + 1}, ${ase.layers[l].name} (${X}, ${Y}) #${Buffer.from(rgb).toString('hex')}`);
          else out.set([i, a], (Y * w + X) * 2);
        }
      }
    }
    const held = (f.duration * fps) / 1000, n = Math.max(1, Math.round(held));
    if (Math.abs(held - n) > 0.05) warnings.push(`frame ${k + 1} lasts ${f.duration} ms, played as ${n} frame(s) at ${fps} fps: ${Math.round((n * 1000) / fps)} ms`);
    starts.push(frames.length);
    for (let j = 0; j < n; j++) frames.push(frame);
  });
  if (bad.length) throw new Error(`${bad.length} pixel(s) use colors outside the effect's palette, so they couldn't be recolored; paint with the file's palette: ${bad.slice(0, 5).join('; ')}${bad.length > 5 ? '; ...' : ''}`);
  const { meta } = mod, old = (meta.act?.hits ?? []).map(hit => hit.t).sort((a, b) => a - b), n0 = Math.max(1, Math.round(meta.duration * fps));
  const tags = ase.tags.filter(t => /^hit(\s|$)/.test(t.name)).sort((a, b) => a.from - b.from), paired = tags.length === old.length;
  // A hit paired with one of the effect's keeps its offset into its frame, so an untouched file keeps its timing exactly.
  const hits = tags.map((tag, i) => ({
    t: paired ? old[i] + (starts[tag.from] - Math.min(n0 - 1, Math.round(old[i] * fps))) / fps : starts[tag.from] / fps,
    ...Object.fromEntries([...tag.name.matchAll(/\b(freeze|shake)=(-?[\d.]+)/g)].map(([, k, v]) => [k, Number(v)])),
  }));
  const duration = meta.duration + (frames.length - n0) / fps; // keeps a part frame at the end
  // The sound's cues keep their place relative to the hits: moved hits pull them along, added frames stretch them.
  const anchors = [[0, 0], ...(paired ? old.map((t, i) => [t, hits[i].t]) : []), [meta.duration, duration]];
  const edited = {
    ...meta, duration,
    ...((meta.act || hits.length) && { act: { ...meta.act, hits } }),
    ...(Array.isArray(meta.sound) && { sound: meta.sound.map(cue => ({ ...cue, t: warp(anchors, cue.t) })) }),
  };
  const id = [...info.grittyfx.split('/').slice(0, -1), name].join('/');
  const r = { fx, frames, n: frames.length, fps, size: [w, h], origin, directions: 1 };
  return { id, bundle: makeBundle(id, { ...mod, meta: edited }, { r }), warnings };
}

const esc = s => String(s).replace(/[&<>"]/g, c => `&#${c.charCodeAt(0)};`);
const inline = f => readFileSync(new URL(f, import.meta.url), 'utf8').replace(/^import .*$/gm, '').replace(/^export /gm, '');

/**
 * A bundle as one HTML page that opens from disk and plays it with the sheet player. file:// pages can't import
 * modules, so the player, color.js and the bundle are all inlined.
 */
export function htmlPage(id, meta, b) {
  const b64 = k => Buffer.from(b.png[k]).toString('base64'), [w, h] = meta.size;
  const sound = b.wav ? `'data:audio/wav;base64,${Buffer.from(b.wav).toString('base64')}'` : 'undefined';
  const script = `${inline('../src/core/color.js')}${inline('../runtime/sheet-player.js')}
{ // the page, in a block so its names can't clash with the inlined modules'
  const B = s => Uint8Array.from(atob(s), c => c.charCodeAt(0)), json = ${JSON.stringify(b.json)};
  const bundle = { json, data: await decodePng(B('${b64('data')}')), palette: (await decodePng(B('${b64('palette')}'))).rgba, sound: ${sound} };
  const g = json.meta.grittyfx, [w, h] = g.frameSize, f = document.forms[0], cv = document.querySelector('canvas');
  const ctx = cv.getContext('2d'), calm = matchMedia('(prefers-reduced-motion: reduce)');
  const BG = { dark: '#1b1d26', mid: '#575b6b', light: '#d8d5cd' }, GAP = 0.8, SHAKE = 0.2; // as in the gallery
  for (const name of Object.keys(PAL)) f.pal.add(new Option(name));
  let fx, wait = 0, freeze = 0, shake = 0, amp = 0, n = 0, last;
  const start = () => {
    const onHit = (i, s, px) => f.hit.checked && ((freeze = s ?? 0), (amp = px ?? 0), (shake = SHAKE));
    fx = createPlayer(bundle, { flip: f.flip.checked, onHit });
    if (f.pal.value) fx.recolor({ palette: f.pal.value });
    fx.play();
  };
  const size = () => (cv.style.width = w * Math.max(1, Math.min(6, Math.floor((innerWidth - 32) / w))) + 'px');
  const tick = now => {
    const dt = Math.min(0.1, (now - (last ?? now)) / 1000);
    last = now;
    if (freeze > 0) freeze -= dt; // hit-stop: the effect waits, the shake goes on
    else if (!fx.finished) fx.update(dt);
    else if ((wait += dt) >= GAP) (wait = 0), start();
    ctx.fillStyle = BG[f.bg.value];
    ctx.fillRect(0, 0, w, h);
    const k = shake > 0 && !calm.matches ? Math.ceil((amp * (shake -= dt)) / SHAKE) * (n++ % 2 ? 1 : -1) : 0;
    fx.draw(ctx, (fx.flip ? w - g.pivot[0] : g.pivot[0]) + k, g.pivot[1]); // a flipped frame fills the canvas too
    requestAnimationFrame(tick);
  };
  f.onchange = e => e.target.name !== 'bg' && start();
  cv.onclick = start; // browsers only play sound after a click, so the first play is silent
  addEventListener('resize', size);
  size();
  start();
  requestAnimationFrame(tick);
}`.replace(/<\/script/gi, '<\\/script');
  return `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(meta.name)} · grittyfx</title>
<style>
  body { margin: 0; min-height: 100vh; box-sizing: border-box; padding: 16px; display: grid; place-content: center; gap: 12px;
    background: #101117; color: #c9c7c1; font: 14px/1.4 system-ui, sans-serif; }
  canvas { justify-self: center; image-rendering: pixelated; }
  form { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px 16px; }
  p { margin: 0; max-width: 60ch; text-align: center; }
</style>
<canvas width="${w}" height="${h}" aria-label="${esc(meta.name)}"></canvas>
<form>
  <label>Palette <select name="pal"><option value="">default</option></select></label>
  <label>Background <select name="bg"><option>dark</option><option>mid</option><option>light</option></select></label>
  <label><input type="checkbox" name="flip"> Flip</label>
  <label><input type="checkbox" name="hit" checked> Hit-stop</label>
</form>
<p><b>${esc(id)}</b>: ${esc(meta.desc ?? '')}${b.wav ? ' Click it to replay with sound.' : ''}</p>
<script type="module">
${script}
</script>
</html>
`;
}
