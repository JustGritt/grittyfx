import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROOT } from '../tools/lib.mjs';

const run = (...args) => spawnSync(process.execPath, ['tools/export.mjs', ...args], { cwd: ROOT, encoding: 'utf8' });
const FILES = ['torch.json', 'torch_data.png', 'torch_pal.png', 'torch.png', 'torch.wav'];

test('export writes the bundle into Godot and Unity projects and leaves other files alone', () => {
  const dir = mkdtempSync(join(tmpdir(), 'grittyfx-export-')), godot = join(dir, 'godot'), unity = join(dir, 'unity');
  try {
    mkdirSync(godot);
    writeFileSync(join(godot, 'project.godot'), '');
    mkdirSync(join(unity, 'Assets'), { recursive: true });
    mkdirSync(join(unity, 'ProjectSettings'));
    let r = run('fire/torch', '--godot', godot, '--unity', unity);
    assert.equal(r.status, 0, r.stderr);
    const g = join(godot, 'grittyfx', 'fire', 'torch'), u = join(unity, 'Assets', 'GrittyFx', 'fire', 'torch');
    const imports = ['torch_data.png.import', 'torch_pal.png.import'];
    assert.deepEqual(r.stdout.trim().split(/\r?\n/), [...[...FILES, ...imports].map(f => join(g, f)), ...FILES.map(f => join(u, f))]);
    const { id, sound } = JSON.parse(readFileSync(join(u, 'torch.json'), 'utf8')).meta.grittyfx;
    assert.deepEqual([id, sound], ['fire/torch', 'torch.wav']);
    for (const f of FILES) assert.deepEqual(readFileSync(join(g, f)), readFileSync(join(u, f)), f);
    for (const f of imports) assert.match(readFileSync(join(g, f), 'utf8'), /process\/fix_alpha_border=false/);

    writeFileSync(join(g, 'torch.png.import'), 'keep');
    writeFileSync(join(g, 'torch_data.png.import'), 'keep: godot added its uid');
    writeFileSync(join(u, 'torch.png.meta'), 'keep');
    writeFileSync(join(u, 'torch.json'), 'stale');
    r = run('fire', '--unity', unity, '--godot', godot);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(readFileSync(join(g, 'torch.png.import'), 'utf8'), 'keep');
    assert.equal(readFileSync(join(g, 'torch_data.png.import'), 'utf8'), 'keep: godot added its uid');
    assert.equal(readFileSync(join(u, 'torch.png.meta'), 'utf8'), 'keep');
    assert.notEqual(readFileSync(join(u, 'torch.json'), 'utf8'), 'stale');
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test('export refuses a directory that is not a project, and needs a target', () => {
  const dir = mkdtempSync(join(tmpdir(), 'grittyfx-export-'));
  try {
    let r = run('fire/torch', '--godot', dir);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /is not a Godot project \(no project.godot\)/);
    r = run('fire/torch', '--unity', dir);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /is not a Unity project/);
    assert.ok(!existsSync(join(dir, 'grittyfx')) && !existsSync(join(dir, 'Assets')));
    r = run('fire/torch');
    assert.equal(r.status, 1);
    assert.match(r.stderr, /usage/);
  } finally {
    rmSync(dir, { recursive: true });
  }
});
