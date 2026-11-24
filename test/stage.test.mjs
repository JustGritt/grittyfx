import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { role, plan, targetAt, realtime, createStage, HIT, NEAR, FAR, FPS } from '../src/stage/stage.js';
import { CAST, frameOf } from '../src/stage/actors.js';
import { castModule, castFiles } from '../tools/cast.mjs';
import { MOVES } from '../src/stage/moves.js';
import { listIds, loadEffect } from '../tools/lib.mjs';

const mod = (meta = {}) => ({ meta: { name: 'x', size: [20, 20], origin: [10, 10], duration: 0.5, loop: false, options: {}, ...meta }, draw() {} });
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} is not ${b}`);

test('role: tags place an effect, the category when no tag does, meta.stage over both', () => {
  const at = (tags, id, stage) => role({ tags, stage }, id);
  assert.deepEqual(at(['fire', 'projectile']), { at: 'path', pose: 'point', cast: 'archer', x: 0, ground: HIT, speed: 200 });
  assert.equal(at(['heal', 'aura', 'status']).at, 'caster', 'the first tag with a role wins');
  assert.deepEqual([at(['buff']).at, at(['pickup']).at, at(['status']).at, at(['nova']).at, at(['ambient']).at], ['caster', 'caster', 'above', 'ground', 'aside']);
  assert.deepEqual([at([], 'projectiles/arrow').at, at([], 'status/x').at, at([], 'pickups/gem').at, at([], 'fire/x').at], ['path', 'above', 'caster', 'target']);
  assert.deepEqual(at(['status'], '', { at: 'target', ground: 16, x: -3 }), { at: 'target', pose: 'point', cast: 'mage', x: -3, ground: 16, speed: 200 });
  assert.equal(at(['ambient']).pose, null, 'an ambient effect is not acted');
  assert.deepEqual([at(['slash']).pose, at(['impact', 'melee']).pose, at(['impact']).pose, at(['nova']).pose], ['strike', 'strike', 'point', 'raise']);
  assert.equal(at(['landing'], '', { at: 'ground' }).pose, 'hop');
  assert.equal(at(['landing', 'hit']).pose, 'point', 'only a landing on the ground under the caster hops');
  assert.deepEqual([at(['buff']).ground, at(['nova']).ground, at(['impact']).ground], [0, 0, HIT]);
  assert.equal(at(['status']).ground, -CAST.goblin.idle[0].y, "a status sits on top of the goblin's head");
});

test('role: the caster fits the effect, meta.stage.cast over it', () => {
  const cast = (tags, id, stage) => role({ tags, stage }, id).cast;
  assert.deepEqual([cast(['slash']), cast(['impact', 'melee']), cast(['landing'], '', { at: 'ground' }), cast(['pickup']), cast([], 'pickups/gem')], ['knight', 'knight', 'knight', 'knight', 'knight']);
  assert.deepEqual([cast(['projectile']), cast(['projectile', 'magic']), cast(['projectile', 'spell']), cast([], 'projectiles/rock')], ['archer', 'mage', 'mage', 'archer']);
  assert.deepEqual([cast(['status']), cast(['nova']), cast(['aura']), cast(['impact']), cast(['ambient'])], ['mage', 'mage', 'mage', 'mage', 'mage']);
  assert.deepEqual([cast(['buff'], 'holy/blessing'), cast(['projectile', 'magic'], 'holy/holy-bolt'), cast(['slash'], 'holy/smite')], ['priest', 'priest', 'knight'], "holy/ is the priest's, a strike still the knight's");
  assert.equal(cast(['slash'], '', { cast: 'mage' }), 'mage');
});

test('cast.js is up to date with the Aseprite files, and every caster draws every pose', () => {
  const file = readFileSync(new URL('../src/stage/cast.js', import.meta.url), 'utf8').replaceAll('\r\n', '\n'); // a CRLF checkout
  assert.equal(file, castModule(castFiles()), 'run node tools/cast.mjs');
  for (const who of ['knight', 'mage', 'priest', 'archer']) {
    for (const pose of ['idle', 'ready', 'swing', 'follow', 'gather', 'point', 'raise', 'crouch', 'air']) assert.ok(frameOf(who, pose).rows.length, `${who} ${pose}`);
    assert.ok(frameOf(who, 'point').tip, `${who} shoots from a tip`);
    assert.equal(CAST[who].idle.length, 2, `${who} breathes`);
  }
  assert.ok(CAST.goblin.hurt);
});

test('plan: the wind-up comes before the effect, its hits land after its start, on a frame', () => {
  const p = plan([{ mod: mod({ tags: ['melee'], act: { windup: 0.2, hits: [{ t: 0.05, freeze: 0.1, shake: 3 }] } }) }]);
  const [a] = p.acts;
  assert.equal(p.D, NEAR, 'melee alone: within reach');
  assert.deepEqual(a.from, [NEAR, -HIT]);
  near(a.start - p.keys[0][0], 0.2);
  assert.ok(p.keys[0][0] > 0, 'idle first');
  near(p.hits[0].t, Math.round((a.start + 0.05) * FPS) / FPS);
  assert.deepEqual(p.hits.map(h => [h.freeze, h.shake]), [[0.1, 3]]);
  assert.deepEqual(p.flinches.map(f => f.t), p.hits.map(h => h.t));
  assert.ok(p.duration > p.hits[0].t + 0.5, 'time for the goblin to recover');
});

test('plan: on hit, a step lands with the previous one and their hits merge; otherwise it follows its end', () => {
  const slash = mod({ tags: ['slash'], duration: 0.3, act: { windup: 0.1, hits: [{ t: 2 / 30, freeze: 0.05, shake: 1 }] } });
  const spark = mod({ act: { hits: [{ t: 1 / 30, freeze: 0.08, shake: 2 }] } });
  const p = plan([{ mod: slash }, { mod: spark, on: 'hit' }, { mod: spark }]);
  const [a, b, c] = p.acts;
  near(b.start + 1 / 30, a.start + 2 / 30);
  assert.deepEqual(p.hits.slice(0, 1).map(h => [h.freeze, h.shake]), [[0.08, 2]], 'one hit, the stronger freeze and shake');
  assert.equal(p.hits.length, 2);
  near(c.start, Math.round((b.end + 0.3) * FPS) / FPS); // after its own wind-up, a cast's by default
});

test("plan: a projectile flies from the caster's tip to the target and hits on arrival", () => {
  const orb = mod({ tags: ['projectile'], loop: true });
  const p = plan([{ mod: orb }, { mod: mod({ act: { hits: [{ t: 0, freeze: 0.05, shake: 4 }] } }), on: 'hit' }]);
  const [a, b] = p.acts;
  assert.equal(p.D, FAR);
  assert.equal(p.who, 'archer');
  assert.deepEqual(a.from, [frameOf('archer', 'point').tip[0] + 1, frameOf('archer', 'point').tip[1]], 'from the bow, a step forward');
  assert.deepEqual(a.to, [FAR, -HIT]);
  near(a.travel, (a.to[0] - a.from[0]) / 200);
  near(a.end, a.start + a.travel);
  near(b.start, a.contact);
  near(p.flinches[0].t, a.contact);
  near(p.hits[0].t, a.contact);

  const shot = plan([{ mod: mod({ tags: ['projectile'], duration: 0.8, act: { hits: [{ t: 0.6, freeze: 0.05 }] } }) }]).acts[0];
  near(shot.travel, 0.6);
});

test('the goblin is knocked back on the hit frame, flashes for one frame, hurts a while and recovers', () => {
  const f = [{ t: 1, k: 0.4 }];
  assert.deepEqual(targetAt(f, 0.99), { dx: 0, hit: false, hurt: false });
  assert.deepEqual(targetAt(f, 1), { dx: 3, hit: true, hurt: true });
  assert.deepEqual(targetAt(f, 1 + 1 / FPS), { dx: 3, hit: false, hurt: true });
  assert.deepEqual(targetAt(f, 2), { dx: 0, hit: false, hurt: false }, 'back where it stood');
  assert.equal(targetAt([{ t: 1, k: 0.5 }, { t: 1, k: 0.5 }, { t: 1, k: 0.5 }], 1).dx, 6, 'never knocked off the stage');
});

test('realtime: a hit holds its frame for its freeze and shakes the view', () => {
  const fr = realtime([{ t: 10 / FPS, freeze: 3 / FPS, shake: 2 }], 20 / FPS);
  const at = fr.map(f => Math.round(f.t * FPS));
  assert.deepEqual(at.slice(0, 15), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10, 11]);
  assert.equal(fr.length, 23);
  assert.ok(fr.slice(10, 15).every(f => f.dx || f.dy) && !fr[9].dx && !fr.at(-1).dx, 'from the hit frame, for 0.2 s');
});

test('every effect and move plays on the stage, and draws something', async () => {
  const stages = [
    ...await Promise.all(listIds().map(async id => [id, [{ mod: await loadEffect(id), id }]])),
    ...await Promise.all(Object.entries(MOVES).map(async ([k, m]) => [k, await Promise.all(m.steps.map(async s => ({ ...s, mod: await loadEffect(s.fx), id: s.fx })))])),
  ];
  for (const [name, steps] of stages) {
    const st = createStage(steps), [w, h] = st.size, out = new Uint8ClampedArray(w * h * 4);
    assert.ok(st.duration > 0 && st.duration < 10, name);
    let lit = 0;
    for (const { t } of realtime(st.hits, st.duration).filter((_, i) => i % 3 === 0)) {
      st.draw(t, out, [0, 0, 0]);
      lit = Math.max(lit, out.reduce((n, v, i) => n + (i % 4 < 3 && v > 0), 0));
    }
    assert.ok(lit > 400, `${name} draws the actors and the effect`);
  }
});

test('caster and target are layers: either can be left out, the layout stays', async () => {
  const steps = [{ mod: await loadEffect('impacts/hit-spark'), id: 'impacts/hit-spark' }];
  const count = show => {
    const st = createStage(steps, {}, show), [w, h] = st.size, out = new Uint8ClampedArray(w * h * 4);
    st.draw(0, out, [0, 0, 0]); // before the effect: only the actors
    return [st.size.join('x'), out.reduce((n, v, i) => n + (i % 4 < 3 && v > 0), 0)];
  };
  const [size, both] = count({}), [, caster] = count({ target: false }), [, target] = count({ caster: false }), [, none] = count({ caster: false, target: false });
  assert.deepEqual([count({ target: false })[0], count({ caster: false, target: false })[0]], [size, size]);
  assert.equal(none, 0);
  assert.ok(caster > 0 && target > 0 && Math.abs(caster + target - both) < 20, 'each draws its own actor');
});

test('the goblin only stands in for effects that strike it: a buff, a pickup or a prop plays with the caster alone', () => {
  const foe = tags => plan([{ mod: mod({ tags }) }]).foe;
  assert.deepEqual([foe(['impact']), foe(['projectile']), foe(['status'])], [true, true, true]);
  assert.deepEqual([foe(['buff']), foe(['pickup']), foe(['nova']), foe(['ambient'])], [false, false, false, false]);
  assert.equal(plan([{ mod: mod({ tags: ['buff'] }) }, { mod: mod({ tags: ['impact'] }) }]).foe, true, 'a move with a blow in it');
  assert.equal(plan([{ mod: mod({ tags: ['ambient'] }) }]).acts[0].from[0], NEAR, 'a prop stands next to the caster');
  const width = tags => createStage([{ mod: mod({ tags }) }]).size[0];
  assert.ok(width(['buff']) < width(['impact']) - 20, 'the canvas fits the caster alone');
});
