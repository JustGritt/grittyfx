// node tools/catalog.mjs [--check]: writes docs/CATALOG.md from every effect's meta. --check writes nothing and exits 1
// if the file is stale (for CI).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, listIds, loadEffect } from './lib.mjs';

export const FILE = join(ROOT, 'docs', 'CATALOG.md');

const cell = s => String(s).replace(/\|/g, '\\|');

/** The catalog as markdown: one table per category. */
export async function catalog() {
  const ids = listIds(), out = [
    '# Catalog',
    '',
    `${ids.length} effects. Generated from each effect's \`meta\` by \`node tools/catalog.mjs\`: don't edit by hand.`,
    'Ramps read `option: default (steps)`; pass another ramp name or a list of colors to recolor.',
  ];
  let category = null;
  for (const id of ids) {
    const { meta } = await loadEffect(id), cat = id.split('/')[0];
    if (cat !== category) {
      out.push('', `## ${(category = cat)}`, '', '| effect | kind | size | duration | ramps | tags | description |', '|---|---|---|---|---|---|---|');
    }
    const ramps = Object.entries(meta.ramps ?? {}).map(([name, steps]) => `${name}: ${meta.options?.[name]} (${steps})`);
    const row = [`\`${id}\``, meta.loop ? 'loop' : 'one-shot', meta.size.join('x'), `${meta.duration} s`, ramps.join(', '), (meta.tags ?? []).join(', '), meta.desc ?? ''];
    out.push(`| ${row.map(cell).join(' | ')} |`);
  }
  return `${out.join('\n')}\n`;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const md = await catalog();
  if (process.argv.includes('--check')) {
    // autocrlf checkouts hold CRLF; the content is what counts
    const stale = !existsSync(FILE) || readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n') !== md;
    console.log(stale ? 'docs/CATALOG.md is stale: run node tools/catalog.mjs' : 'docs/CATALOG.md is up to date');
    process.exitCode = stale ? 1 : 0;
  } else {
    mkdirSync(join(ROOT, 'docs'), { recursive: true });
    writeFileSync(FILE, md);
    console.log(FILE);
  }
}
