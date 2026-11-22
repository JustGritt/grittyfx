// node tools/list.mjs [words]...: effects whose id, name, tags or description hold every word; no words lists all.
import { listIds, loadEffect } from './lib.mjs';

const words = process.argv.slice(2).map(w => w.toLowerCase());
let category = null, shown = 0;
for (const id of listIds()) {
  const { meta } = await loadEffect(id);
  const text = [id, meta.name, meta.desc, ...(meta.tags ?? [])].join(' ').toLowerCase();
  if (!words.every(w => text.includes(w))) continue;
  const [cat, name] = id.split('/');
  if (cat !== category) console.log((category = cat));
  console.log(`  ${name.padEnd(22)} ${meta.loop ? 'loop    ' : 'one-shot'}  ${meta.desc ?? ''}${meta.tags?.length ? `  [${meta.tags.join(', ')}]` : ''}`);
  shown++;
}
if (!shown) console.log(words.length ? `no effect matches "${words.join(' ')}"` : 'no effects yet');
