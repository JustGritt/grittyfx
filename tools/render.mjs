// node tools/render.mjs <id | category | glob>... [--all] [--sheet] [--gif] [--mp4] [--zoom N] [--seed N]
//   [--opts '<json>'] [--fps N] [--bg '#hex']
// Writes records/<id>/contact.png (sampled frames; --all for every frame), the bundle with --sheet, and a gif or mp4
// through ffmpeg.
import { parseArgs } from 'node:util';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { composite } from '../src/core/index.js';
import { encodePng } from './png.mjs';
import { ROOT, matchIds, loadEffect, renderFrames, makeBundle, blit } from './lib.mjs';

const { values: a, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    all: { type: 'boolean' }, sheet: { type: 'boolean' }, gif: { type: 'boolean' }, mp4: { type: 'boolean' },
    zoom: { type: 'string', default: '3' }, seed: { type: 'string' }, opts: { type: 'string' }, fps: { type: 'string' },
    bg: { type: 'string', default: '#1b1d26' },
  },
});
if (!positionals.length) {
  console.error('usage: node tools/render.mjs <id | category | glob>... [--all] [--sheet] [--gif] [--mp4] [--zoom N] [--seed N] [--opts json] [--fps N] [--bg #hex]');
  process.exit(1);
}
const zoom = Number(a.zoom), fps = a.fps && Number(a.fps);
const opts = { ...(a.opts && JSON.parse(a.opts)), ...(a.seed && { seed: Number(a.seed) }) };

function contact(frames, fx, all) {
  const { w, h } = frames[0], n = frames.length, k = all ? n : Math.min(n, 12);
  const picks = [...new Set(Array.from({ length: k }, (_, i) => Math.round((i * (n - 1)) / Math.max(1, k - 1))))];
  const cols = Math.min(picks.length, Math.max(1, Math.floor(1600 / (w * zoom)))), rows = Math.ceil(picks.length / cols), gap = 2 * zoom;
  const W = cols * (w * zoom + gap) + gap, H = rows * (h * zoom + gap) + gap, out = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) out.set([70, 70, 78, 255], i * 4);
  picks.forEach((f, i) => {
    const x = gap + (i % cols) * (w * zoom + gap), y = gap + Math.floor(i / cols) * (h * zoom + gap);
    blit(out, W, composite(frames[f], fx.palette, undefined, a.bg), w, h, x, y, zoom);
  });
  return encodePng(W, H, out);
}

function video(dir, frames, fx, fps, ext) {
  if (spawnSync('ffmpeg', ['-version']).error) return console.error(`--${ext}: ffmpeg not found on PATH; install it to write ${ext} files`);
  const tmp = join(dir, 'frames');
  mkdirSync(tmp, { recursive: true });
  frames.forEach((f, i) => writeFileSync(join(tmp, `${String(i).padStart(4, '0')}.png`), encodePng(f.w, f.h, composite(f, fx.palette, new Uint8Array(f.w * f.h * 4), a.bg))));
  const scale = `scale=iw*${zoom}:ih*${zoom}:flags=neighbor`;
  const vf = ext === 'gif' ? `${scale},split[a][b];[a]palettegen[p];[b][p]paletteuse=dither=none` : `${scale},pad=ceil(iw/2)*2:ceil(ih/2)*2,format=yuv420p`;
  const out = join(dir, `anim.${ext}`);
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', join(tmp, '%04d.png'), '-vf', vf, out], { stdio: 'inherit' });
  rmSync(tmp, { recursive: true });
  if (r.status === 0) console.log(out);
}

for (const id of matchIds(positionals)) {
  const mod = await loadEffect(id), dir = join(ROOT, 'records', id);
  mkdirSync(dir, { recursive: true });
  const { fx, frames, fps: rate } = renderFrames(mod, { fps, opts });
  writeFileSync(join(dir, 'contact.png'), contact(frames, fx, a.all));
  console.log(join(dir, 'contact.png'));
  if (a.sheet) {
    const b = makeBundle(id, mod, { fps, opts });
    for (const key of ['data', 'palette', 'sheet']) writeFileSync(join(dir, b.files[key]), b.png[key]);
    writeFileSync(join(dir, b.files.json), `${JSON.stringify(b.json, null, 2)}\n`);
    console.log(Object.values(b.files).map(f => join(dir, f)).join('\n'));
  }
  if (a.gif) video(dir, frames, fx, rate, 'gif');
  if (a.mp4) video(dir, frames, fx, rate, 'mp4');
}
