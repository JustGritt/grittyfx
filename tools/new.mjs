// node tools/new.mjs <category>/<name> [--loop]: a new effect that renders and passes check.mjs as generated.
// A simulated one-shot by default; --loop gives a pure loop.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ONE_SHOT = `import { Rng, Particles, Lights, SPARK } from '../../core/index.js';

export const meta = {
  name: '%NAME%',
  desc: 'TODO: what it is, in one line',
  tags: [],
  size: [64, 48],
  origin: [32, 36],
  duration: 0.5,
  loop: false,
  fps: 30,
  views: ['side'],
  ramps: { palette: 8 },
  options: { palette: 'fire', seed: 1 },
};

export function create(o) {
  const rng = new Rng(o.seed), C = o.palette;
  const parts = new Particles({ rng, palette: C, ground: 0 });
  const lights = new Lights();
  lights.add(0, -6, 14, C[5], 0.9, 0.3);
  for (let i = 0; i < 10; i++) {
    const a = rng.range(Math.PI * 1.15, Math.PI * 1.85), v = rng.range(40, 70);
    parts.spawn(SPARK, 0, -6, Math.cos(a) * v, Math.sin(a) * v, rng.range(0.2, 0.4));
  }
  return {
    update(dt) {
      parts.update(dt);
      lights.update(dt);
    },
    draw(p) {
      lights.draw(p);
      parts.draw(p);
    },
  };
}
`;

const LOOP = `export const meta = {
  name: '%NAME%',
  desc: 'TODO: what it is, in one line',
  tags: [],
  size: [32, 32],
  origin: [16, 24],
  duration: 1,
  loop: true,
  fps: 12,
  views: ['side'],
  ramps: { palette: 8 },
  options: { palette: 'fire', seed: 1 },
};

// Pure: the frame from t alone, periodic in t, so the loop has no seam.
export function draw(p, t, o) {
  const C = o.palette, r = 5 + Math.sin((t / meta.duration) * Math.PI * 2) * 1.5;
  p.glow(0, -8, r * 2.5, C[5], 0.6);
  p.disc(0, -8, r, (dx, dy, d) => C[Math.round(7 - d * 4)], (dx, dy, d) => 1 - d * d);
}
`;

/** The source of a new effect. */
export function template(id, loop = false) {
  const name = id.split('/').pop().replace(/-/g, ' ');
  return (loop ? LOOP : ONE_SHOT).replace('%NAME%', name[0].toUpperCase() + name.slice(1));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const id = process.argv.slice(2).find(a => !a.startsWith('--')), loop = process.argv.includes('--loop');
  if (!/^[a-z0-9-]+\/[a-z0-9-]+$/.test(id ?? '')) {
    console.error('usage: node tools/new.mjs <category>/<name> [--loop]   (lowercase, digits and dashes)');
    process.exit(1);
  }
  const file = fileURLToPath(new URL(`../src/fx/${id}.js`, import.meta.url));
  if (existsSync(file)) {
    console.error(`${file} already exists`);
    process.exit(1);
  }
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, template(id, loop));
  console.log(`${file}\nnext: node tools/render.mjs ${id}   then   node tools/check.mjs ${id}`);
}
