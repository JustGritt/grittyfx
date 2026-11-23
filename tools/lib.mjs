// Shared by the tools: finding effects, rendering their frames, building bundles.
import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createFx, createFrame, composite, layout, HEADINGS, synth } from '../src/core/index.js';
import { encodePng } from './png.mjs';
import { encodeWav } from './sfx.mjs';

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
 */
export function makeBundle(id, mod, { fps, opts, view = 'side' } = {}) {
  const { meta } = mod, r = renderFrames(mod, { fps, opts, view }), { fx, frames, n, directions } = r;
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
