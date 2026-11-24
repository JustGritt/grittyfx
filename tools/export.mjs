// node tools/export.mjs <id | category | glob | file.aseprite>... [--godot <project dir>] [--unity <project dir>] [--out <dir>]
// Renders each effect's bundle into the projects: <godot>/grittyfx/<id>/ and <unity>/Assets/GrittyFx/<id>/, or plain
// into <out>/<id>/ for any other engine; an effect with a top view gets its <name>_top bundle beside the side one.
// An .aseprite file (render.mjs --aseprite, then edited) is bundled from its frames instead, side view only, named
// after the file: <category>/<file name>.
// Re-export overwrites the bundle files only (four, and the .wav with sound); .import, .meta, prefabs and anything
// else stay untouched. Godot also gets .import files for the two data PNGs, written once (Godot then keeps the file's
// uid in them). A loop's .wav needs none: its smpl chunk tells Godot's default import to loop it.
import { parseArgs } from 'node:util';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { matchIds, loadEffect, makeBundle, views, fromAseprite } from './lib.mjs';

// Godot's PNG defaults (fix alpha border on, 3D detection may compress) would corrupt the raw index and alpha bytes.
const GODOT_IMPORT = `[remap]

importer="texture"
type="CompressedTexture2D"

[params]

compress/mode=0
mipmaps/generate=false
process/fix_alpha_border=false
process/premult_alpha=false
detect_3d/compress_to=0
`;

const { values: a, positionals } = parseArgs({ allowPositionals: true, options: { godot: { type: 'string' }, unity: { type: 'string' }, out: { type: 'string' } } });
const fail = msg => {
  console.error(msg);
  process.exit(1);
};
if (!positionals.length || !(a.godot || a.unity || a.out)) fail('usage: node tools/export.mjs <id | category | glob | file.aseprite>... [--godot <project dir>] [--unity <project dir>] [--out <dir>]');
const roots = [];
if (a.godot) {
  if (!existsSync(join(a.godot, 'project.godot'))) fail(`--godot: ${a.godot} is not a Godot project (no project.godot)`);
  roots.push({ root: join(a.godot, 'grittyfx'), godot: true });
}
if (a.unity) {
  if (!existsSync(join(a.unity, 'Assets')) || !existsSync(join(a.unity, 'ProjectSettings'))) fail(`--unity: ${a.unity} is not a Unity project (needs Assets/ and ProjectSettings/)`);
  roots.push({ root: join(a.unity, 'Assets', 'GrittyFx'), godot: false });
}
if (a.out) roots.push({ root: a.out, godot: false });

function write(id, b, sound) {
  const out = { [b.files.json]: `${JSON.stringify(b.json, null, 2)}\n`, [b.files.data]: b.png.data, [b.files.palette]: b.png.palette, [b.files.sheet]: b.png.sheet, ...(b.wav && sound && { [b.files.sound]: b.wav }) };
  for (const { root, godot } of roots) {
    const dir = join(root, ...id.split('/'));
    mkdirSync(dir, { recursive: true });
    const files = Object.entries(out);
    if (godot) files.push(...[b.files.data, b.files.palette].map(f => [`${f}.import`, GODOT_IMPORT]).filter(([f]) => !existsSync(join(dir, f))));
    for (const [name, content] of files) {
      writeFileSync(join(dir, name), content);
      console.log(join(dir, name));
    }
  }
}

const files = positionals.filter(p => p.endsWith('.aseprite'));
for (const id of matchIds(positionals.filter(p => !files.includes(p)))) {
  const mod = await loadEffect(id);
  for (const view of views(mod.meta)) write(id, makeBundle(id, mod, { view }), view === views(mod.meta)[0]); // the views share one sound
}
for (const file of files) {
  const { id, bundle, warnings } = await fromAseprite(readFileSync(file), basename(file, '.aseprite')).catch(e => fail(`${file}: ${e.message}`));
  for (const w of warnings) console.warn(`${file}: ${w}`);
  write(id, bundle, true);
}
