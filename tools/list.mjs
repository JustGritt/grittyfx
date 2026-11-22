// node tools/list.mjs [words]... [--json]: effects whose id, name, tags or description hold every word; no words lists
// all. --json prints them as [{ id, meta }], the gallery's fx-list.json.
import { manifest } from './lib.mjs';

const args = process.argv.slice(2), words = args.filter(a => a !== '--json').map(w => w.toLowerCase());
const found = (await manifest()).filter(({ id, meta }) => {
  const text = [id, meta.name, meta.desc, ...(meta.tags ?? [])].join(' ').toLowerCase();
  return words.every(w => text.includes(w));
});
if (args.includes('--json')) console.log(JSON.stringify(found));
else {
  let category = null;
  for (const { id, meta } of found) {
    const [cat, name] = id.split('/');
    if (cat !== category) console.log((category = cat));
    console.log(`  ${name.padEnd(22)} ${meta.loop ? 'loop    ' : 'one-shot'}  ${meta.desc ?? ''}${meta.tags?.length ? `  [${meta.tags.join(', ')}]` : ''}`);
  }
  if (!found.length) console.log(words.length ? `no effect matches "${words.join(' ')}"` : 'no effects yet');
}
