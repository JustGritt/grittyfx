// node tools/export.mjs <id | category | glob>... [--godot <project dir>] [--unity <project dir>]
// Renders each effect's bundle into the projects: <godot>/grittyfx/<id>/ and <unity>/Assets/GrittyFx/<id>/; an
// effect with a top view gets its <name>_top bundle beside the side one.
// Re-export overwrites the four bundle files only; .import, .meta, prefabs and anything else stay untouched.
// Godot also gets .import files for the two data PNGs, written once (Godot then keeps the file's uid in them).
import { parseArgs } from 'node:util';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { matchIds, loadEffect, makeBundle, views } from './lib.mjs';

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

const { values: a, positionals } = parseArgs({ allowPositionals: true, options: { godot: { type: 'string' }, unity: { type: 'string' } } });
const fail = msg => {
  console.error(msg);
  process.exit(1);
};
if (!positionals.length || !(a.godot || a.unity)) fail('usage: node tools/export.mjs <id | category | glob>... [--godot <project dir>] [--unity <project dir>]');
const roots = [];
if (a.godot) {
  if (!existsSync(join(a.godot, 'project.godot'))) fail(`--godot: ${a.godot} is not a Godot project (no project.godot)`);
  roots.push({ root: join(a.godot, 'grittyfx'), godot: true });
}
if (a.unity) {
  if (!existsSync(join(a.unity, 'Assets')) || !existsSync(join(a.unity, 'ProjectSettings'))) fail(`--unity: ${a.unity} is not a Unity project (needs Assets/ and ProjectSettings/)`);
  roots.push({ root: join(a.unity, 'Assets', 'GrittyFx'), godot: false });
}

for (const id of matchIds(positionals)) {
  const mod = await loadEffect(id);
  for (const view of views(mod.meta)) {
    const b = makeBundle(id, mod, { view });
    const out = { [b.files.json]: `${JSON.stringify(b.json, null, 2)}\n`, [b.files.data]: b.png.data, [b.files.palette]: b.png.palette, [b.files.sheet]: b.png.sheet };
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
}
