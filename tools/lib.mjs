// Shared by the tools: finding effects, rendering their frames, building bundles.
import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createFx, createFrame, composite, layout, HEADINGS } from '../src/core/index.js';
import { encodePng } from './png.mjs';

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
 * The bundle of a view: data sheet, palette, baked sheet (PNG buffers) and the Aseprite JSON with meta.grittyfx. A top
 * view is its own bundle, <name>_top.*, with one row per direction (E, SE, ... NE), each tagged with its heading.
 */
export function makeBundle(id, mod, { fps, opts, view = 'side' } = {}) {
  const { meta } = mod, r = renderFrames(mod, { fps, opts, view }), { fx, frames, n, directions } = r;
  const name = id.split('/').pop() + (view === 'top' ? '_top' : ''), [w, h] = r.size;
  const columns = directions > 1 ? n : Math.min(n, 8), W = columns * w, H = Math.ceil(frames.length / columns) * h;
  const data = new Uint8Array(W * H * 4), baked = new Uint8Array(W * H * 4);
  frames.forEach((f, i) => {
    const x = (i % columns) * w, y = Math.floor(i / columns) * h, rgba = new Uint8Array(w * h * 4);
    for (let p = 0; p < w * h; p++) rgba.set([f.color[p * 2], f.color[p * 2 + 1], f.light[p * 2], f.light[p * 2 + 1]], p * 4);
    blit(data, W, rgba, w, h, x, y);
    blit(baked, W, composite(f, fx.palette), w, h, x, y);
  });
  const files = { data: `${name}_data.png`, palette: `${name}_pal.png`, sheet: `${name}.png`, json: `${name}.json` };
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
      },
    },
  };
  return {
    files,
    json,
    png: { data: encodePng(W, H, data), palette: encodePng(256, 1, fx.palette), sheet: encodePng(W, H, baked) },
  };
}
