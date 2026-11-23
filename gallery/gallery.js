// The gallery: plays every effect live from its module, or one large with ?fx=<id> (the preview page).
import { PAL, hex, createFx, createFrame, clearFrame, composite, layout, HEADINGS } from '../src/core/index.js';

const BG = { dark: '#1b1d26', mid: '#575b6b', light: '#d8d5cd' }; // the stage colors in index.html
const GAP = 0.8; // a one-shot rests this long, empty, before it plays again
const SHAKE = 0.2; // seconds a hit's shake takes to die down
const JIGGLE = [[1, 0], [-1, 1], [1, -1], [-1, 0]];
const calm = matchMedia('(prefers-reduced-motion: reduce)');
const form = document.getElementById('controls'), f = form.elements, main = document.getElementById('main');
const params = new URLSearchParams(location.search), only = params.get('fx');
const players = [];
let custom = null; // the last valid custom ramp

const el = (tag, props = {}, ...kids) => {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...kids);
  return e;
};

// Settings live in the form and the URL, so a preview link keeps them.
for (const name of Object.keys(PAL)) f.palette.add(new Option(name, name), f.palette.length - 1);
HEADINGS.forEach((name, d) => f.view.add(new Option(`top ${name}`, d))); // effects without a top view stay side
for (const [k, v] of params) {
  if (k === 'flip' || k === 'hitstop') f[k].checked = v === '1';
  else if (['palette', 'custom', 'seed', 'bg', 'view'].includes(k)) f[k].value = v;
}
f.custom.value ||= '#0b1a2e #14506a #1ca0a0 #6ff0c0 #f2fff6';
if (!BG[f.bg.value]) f.bg.value = 'dark';

function query(extra = {}) {
  const q = new URLSearchParams(extra), pal = f.palette.value;
  if (pal) q.set('palette', pal);
  if (pal === 'custom') q.set('custom', f.custom.value);
  if (f.seed.value) q.set('seed', f.seed.value);
  if (f.view.value) q.set('view', f.view.value);
  if (f.flip.checked) q.set('flip', 1);
  if (f.bg.value !== 'dark') q.set('bg', f.bg.value);
  if (!f.hitstop.checked) q.set('hitstop', 0);
  return String(q) ? `?${String(q).replaceAll('%2F', '/')}` : './';
}

function readCustom() {
  try {
    const colors = f.custom.value.trim().split(/[\s,]+/);
    colors.forEach(c => hex(c)); // throws on a bad color
    custom = colors;
    f.custom.removeAttribute('aria-invalid');
  } catch {
    f.custom.setAttribute('aria-invalid', 'true');
  }
}

function showSettings() {
  const pal = f.palette.value, colors = pal === 'custom' ? custom ?? [] : PAL[pal] ?? [];
  document.getElementById('custom-field').hidden = pal !== 'custom';
  document.getElementById('ramp').replaceChildren(...colors.map(c => {
    const s = el('span');
    s.style.background = `rgb(${hex(c).slice(0, 3)})`;
    return s;
  }));
  document.body.dataset.bg = f.bg.value;
  for (const a of document.querySelectorAll('a[data-fx]')) a.href = query({ fx: a.dataset.fx });
  for (const a of document.querySelectorAll('a.back')) a.href = query();
}

/** The options every effect is created with: the chosen palette and seed over its own. */
function options() {
  const o = {}, pal = f.palette.value === 'custom' ? custom : f.palette.value;
  if (pal) o.palette = pal;
  if (f.seed.value !== '') o.seed = Math.trunc(Number(f.seed.value));
  return o;
}

/**
 * Plays one effect on a canvas at its own frame rate, like its baked sheet. With hit-stop on, each hit in meta.act
 * freezes the effect for `freeze` seconds and shakes the view by `shake` pixels.
 */
function player(mod, canvas, big) {
  const { meta } = mod, fps = meta.fps ?? 30, hits = meta.act?.hits ?? [], ctx = canvas.getContext('2d');
  let fx, clock, base, next, freeze, shake, shown, w, h, ox, img, frame;
  const pl = {
    meta, canvas, zoom: 1, error: null,
    restart() {
      // the top view at the chosen heading, live, so any angle works; the canvas follows the view's size
      const view = f.view.value && meta.views?.includes('top') ? 'top' : 'side', v = layout(meta, view);
      if (w !== v.size[0] || h !== v.size[1]) {
        [canvas.width, canvas.height] = [w, h] = v.size;
        img = ctx.createImageData(w, h);
        if (frame) pl.fit();
      }
      frame = createFrame(w, h, (ox = v.origin[0]), v.origin[1]);
      fx = createFx(mod, { ...options(), view });
      fx.angle = view === 'top' ? (f.view.value * Math.PI) / 4 : 0;
      clock = base = next = freeze = 0;
      shake = null;
      shown = -1;
    },
    redraw() {
      shown = -1;
    },
    fit() {
      const room = canvas.parentElement.clientWidth - 24; // the stage's padding
      pl.zoom = Math.max(1, Math.floor(Math.min(room / w, big ? (innerHeight * 0.6) / h : 3, big ? 12 : 3)));
      canvas.style.width = `${w * pl.zoom}px`;
    },
    tick(dt) {
      if (freeze > 0) freeze -= dt;
      else {
        const hit = hits[next];
        if (hit && clock + dt >= base + hit.t) {
          clock = base + hit.t;
          next++;
          if (f.hitstop.checked) (freeze = hit.freeze ?? 0), (shake = { px: hit.shake ?? 0, left: SHAKE, n: 0 });
        } else clock += dt;
        if (meta.loop && next === hits.length && clock >= base + meta.duration) (base += meta.duration), (next = 0);
        if (!meta.loop && clock >= meta.duration + GAP) pl.restart();
      }
      let dx = 0, dy = 0;
      if (shake && (shake.left -= dt) > 0 && !calm.matches) {
        const k = Math.ceil((shake.px * shake.left) / SHAKE) * pl.zoom, [sx, sy] = JIGGLE[shake.n++ % 4];
        (dx = sx * k), (dy = sy * k);
      }
      canvas.style.transform = dx || dy ? `translate(${dx}px, ${dy}px)` : '';

      const t = Math.floor(clock * fps + 1e-6) / fps;
      if (t === shown) return;
      shown = t;
      fx.flip = f.flip.checked;
      frame.ox = fx.flip ? w - ox : ox; // mirror the anchor so the flipped effect stays in frame
      fx.update(t - fx.t);
      clearFrame(frame);
      fx.draw(frame, 'back');
      fx.draw(frame, 'front');
      composite(frame, fx.palette, img.data, BG[f.bg.value]);
      ctx.putImageData(img, 0, 0);
    },
    fail(e) {
      pl.error = e;
      broken(canvas.parentElement, e);
    },
  };
  return pl;
}

function broken(stage, e) {
  console.error(e);
  stage.replaceChildren(el('p', { className: 'error', textContent: String(e) }));
}

const describe = meta => [meta.loop ? 'loop' : 'one-shot', `${meta.size[0]}×${meta.size[1]}`, `${meta.duration} s`]
  .concat(meta.act?.hits?.length ? ['hits'] : []);

/** Imports an effect, captions `root` and plays it in root's canvas; a broken effect shows its error there instead. */
async function show(entry, root, big) {
  const canvas = root.querySelector('canvas'), name = root.querySelector(big ? 'h1' : 'h3 a');
  name.textContent = entry.id;
  if (!big) (name.href = query({ fx: entry.id })), (name.dataset.fx = entry.id);
  try {
    const mod = await import(`../src/fx/${entry.id}.js`), { meta } = mod, kind = meta.loop ? 'loop' : 'one-shot';
    name.textContent = meta.name;
    root.querySelector('.desc').textContent = meta.desc ?? '';
    canvas.setAttribute('aria-label', `${meta.name}, ${kind}`);
    if (big) {
      document.title = `${meta.name} · grittyfx`;
      const hits = (meta.act?.hits ?? []).map(x => `${+x.t.toFixed(3)} s (freeze ${x.freeze ?? 0} s, shake ${x.shake ?? 0} px)`);
      const rows = [
        ['id', entry.id], ['size', `${meta.size.join(' × ')} px`], ['anchor', meta.origin.join(', ')],
        ['plays', kind], ['duration', `${meta.duration} s at ${meta.fps ?? 30} fps`],
        ['ramps', Object.entries(meta.ramps ?? {}).map(([k, n]) => `${k} ${n} (${meta.options?.[k] ?? '?'})`).join(', ')],
        ['hits', hits.join(', ') || 'none'], ['tags', (meta.tags ?? []).join(', ')],
      ];
      root.querySelector('.meta').append(
        ...rows.flatMap(([k, v]) => [el('dt', { textContent: k }), el('dd', { textContent: v })]),
        el('dt', { textContent: 'source' }),
        el('dd', {}, el('a', { href: `../src/fx/${entry.id}.js`, textContent: `src/fx/${entry.id}.js` })),
      );
    } else {
      root.querySelector('.facts').append(
        ...describe(meta).map((s, i) => el('li', { className: i ? '' : 'kind', textContent: s })),
        el('li', {}, el('code', { textContent: entry.id })),
      );
    }
    const pl = player(mod, canvas, big);
    pl.restart();
    pl.fit();
    players.push(pl);
  } catch (e) {
    broken(root.querySelector('.stage'), e);
  }
}

const note = (...kids) => main.replaceChildren(el('p', { className: 'note', role: 'status' }, ...kids));
const clone = id => document.getElementById(id).content.firstElementChild.cloneNode(true);

async function start() {
  let list;
  try {
    const res = await fetch('fx-list.json');
    if (!res.ok) throw new Error(res.status);
    list = await res.json();
  } catch {
    return note('No effect list (fx-list.json). Run ', el('code', { textContent: 'node tools/serve.mjs' }), ' and open the URL it prints.');
  }
  if (only) {
    const entry = list.find(e => e.id === only);
    if (!entry) return note('No effect called ', el('code', { textContent: only }), '. ', el('a', { className: 'back', href: './', textContent: 'See them all.' }));
    const root = clone('preview-tpl');
    main.replaceChildren(root);
    await show(entry, root, true);
  } else {
    if (!list.length) return note('No effects yet.');
    const ul = el('ul', { className: 'grid' });
    main.replaceChildren(el('h2', { textContent: `${list.length} effects` }), ul);
    for (const entry of list) {
      const card = clone('card-tpl');
      ul.append(card);
      show(entry, card, false);
    }
  }
  showSettings();
}

form.addEventListener('submit', e => e.preventDefault());
form.addEventListener('input', e => {
  if (e.target === f.custom) readCustom();
  showSettings();
  history.replaceState(null, '', only ? query({ fx: only }) : query());
  const restart = [f.palette, f.custom, f.seed, f.view].includes(e.target);
  for (const pl of players) if (!pl.error) restart ? pl.restart() : pl.redraw();
});
document.getElementById('replay').addEventListener('click', () => players.forEach(pl => pl.error || pl.restart()));
addEventListener('resize', () => players.forEach(pl => pl.error || pl.fit()));

readCustom();
showSettings();
start();
let last = performance.now();
requestAnimationFrame(function loop(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  for (const pl of players) {
    if (pl.error) continue;
    try {
      pl.tick(dt);
    } catch (e) {
      pl.fail(e);
    }
  }
  requestAnimationFrame(loop);
});
