import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { role, plan, poseAt, looks, into, targetAt, realtime, createStage, along, heading, HIT, NEAR, FAR, FPS } from '../src/stage/stage.js';
import { CAST, BODY, frameOf, frameAt, tinted } from '../src/stage/actors.js';
import { PALETTES } from '../src/stage/cast.js';
import { fit } from '../src/core/index.js';
import { castModule, castFiles } from '../tools/cast.mjs';
import { MOVES } from '../src/stage/moves.js';
import { listIds, loadEffect } from '../tools/lib.mjs';

const mod = (meta = {}) => ({ meta: { name: 'x', size: [20, 20], origin: [10, 10], duration: 0.5, loop: false, options: {}, ...meta }, draw() {} });
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} is not ${b}`);

test('role: tags place an effect, the category when no tag does, meta.stage over both', () => {
  const at = (tags, id, stage) => role({ tags, stage }, id);
  assert.deepEqual(at(['fire', 'projectile']), { at: 'path', pose: 'point', cast: 'archer', x: 0, ground: HIT, speed: 200, scenery: undefined });
  assert.equal(at(['heal', 'aura', 'status']).at, 'caster', 'the first tag with a role wins');
  assert.deepEqual([at(['buff']).at, at(['pickup']).at, at(['status']).at, at(['nova']).at, at(['ambient']).at], ['caster', 'caster', 'above', 'ground', 'aside']);
  assert.deepEqual([at([], 'projectiles/arrow').at, at([], 'status/x').at, at([], 'pickups/gem').at, at([], 'fire/x').at], ['path', 'above', 'caster', 'target']);
  assert.deepEqual(at(['status'], '', { at: 'target', ground: 16, x: -3 }), { at: 'target', pose: 'point', cast: 'mage', x: -3, ground: 16, speed: 200, scenery: undefined });
  assert.equal(at(['ambient']).pose, null, 'an ambient effect is not acted');
  assert.deepEqual([at(['slash']).pose, at(['impact', 'melee']).pose, at(['impact']).pose, at(['nova']).pose], ['strike', 'strike', 'point', 'raise']);
  assert.equal(at(['landing'], '', { at: 'ground' }).pose, 'hop');
  assert.deepEqual([at(['jump'], '', { at: 'ground' }).pose, at(['landing', 'jump'], '', { at: 'ground' }).pose], ['leap', 'hop'], 'a jump takes off, a landing lands in it');
  assert.equal(at(['landing', 'hit']).pose, 'point', 'only a landing on the ground under the caster hops');
  assert.deepEqual([at(['impact'], '', { pose: 'raise' }).pose, at(['melee'], '', { pose: null }).pose], ['raise', null], 'meta.stage.pose over the tags');
  assert.deepEqual([at(['buff']).ground, at(['nova']).ground, at(['impact']).ground], [0, 0, HIT]);
  assert.equal(at(['status']).ground, -CAST.goblin.idle[0].y, "a status sits on top of the goblin's head");
});

test('role: the caster fits the effect, meta.stage.cast over it', () => {
  const cast = (tags, id, stage) => role({ tags, stage }, id).cast;
  assert.deepEqual([cast(['impact', 'melee']), cast(['landing'], '', { at: 'ground' }), cast(['pickup']), cast([], 'pickups/gem')], ['knight', 'knight', 'knight', 'knight']);
  assert.deepEqual([cast(['projectile']), cast(['projectile', 'magic']), cast(['projectile', 'spell']), cast([], 'projectiles/rock')], ['archer', 'mage', 'mage', 'archer']);
  assert.deepEqual([cast(['status']), cast(['nova']), cast(['aura']), cast(['impact']), cast(['ambient'])], ['mage', 'mage', 'mage', 'mage', 'mage']);
  assert.deepEqual([cast(['buff'], 'holy/blessing'), cast(['projectile', 'magic'], 'holy/holy-bolt'), cast(['melee'], 'holy/smite')], ['priest', 'priest', 'knight'], "holy/ is the priest's, a strike still the knight's");
  assert.deepEqual([cast(['slash', 'melee']), cast(['projectile', 'thrown']), cast(['smoke', 'vanish']), cast(['nova', 'magic'], 'shadow/dark-nova'), cast(['ambient'], 'shadow/portal')], ['kunoichi', 'kunoichi', 'kunoichi', 'kunoichi', 'kunoichi'], 'the kunoichi slashes, throws, vanishes and does shadow/');
  assert.equal(cast(['slash'], '', { cast: 'mage' }), 'mage');
});

test('cast.js is up to date with the Aseprite files, and every caster draws every pose', () => {
  const file = readFileSync(new URL('../src/stage/cast.js', import.meta.url), 'utf8').replaceAll('\r\n', '\n'); // a CRLF checkout
  assert.equal(file, castModule(castFiles()), 'run node tools/cast.mjs');
  for (const who of ['knight', 'mage', 'priest', 'archer', 'kunoichi']) {
    for (const pose of ['idle', 'ready', 'swing', 'follow', 'gather', 'point', 'raise', 'crouch', 'air']) assert.ok(frameOf(who, pose).rows.length, `${who} ${pose}`);
    assert.ok(frameOf(who, 'point').tip, `${who} shoots from a tip`);
    assert.ok(CAST[who].idle.length >= 2, `${who} breathes`);
  }
  assert.ok(CAST.goblin.hurt);
  for (const [who, poses] of Object.entries(CAST)) for (const [pose, run] of Object.entries(poses)) run.forEach((f, i) => {
    const n = (f.ms / 1000) * FPS; // a frame between two of the stage's would show for one or two of them unevenly
    assert.ok(Math.round(n) >= 1 && Math.abs(n - Math.round(n)) * (1000 / FPS) < 1, `${who} ${pose} frame ${i + 1} lasts ${f.ms} ms: make it 33, 67, 100...`);
  });
});

test('plan: an arcing projectile leaves the tip, peaks at its middle and lands where and when a straight one does', () => {
  const shot = stage => plan([{ mod: mod({ tags: ['projectile'], loop: true, stage }) }]).acts[0];
  const flat = shot(), lob = shot({ arc: 20 });
  assert.deepEqual([along(lob, 0), along(lob, 1)], [lob.from, lob.to]);
  near(along(lob, 0.5)[1], (lob.from[1] + lob.to[1]) / 2 - 20);
  assert.deepEqual(along(flat, 0.5), [(flat.from[0] + flat.to[0]) / 2, (flat.from[1] + flat.to[1]) / 2], 'no arc: a straight line');
  near(lob.contact, flat.contact);
  const st = createStage([{ mod: mod({ tags: ['projectile'], loop: true, stage: { arc: 40 } }), id: 'x' }]), act = st.plan.acts[0];
  assert.ok(-st.floor <= along(act, 0.5)[1] - act.mod.meta.origin[1], 'the canvas holds the effect at its peak');
});

test('plan: a projectile points where it flies, down its line to the chest, or climbing then falling over its arc', () => {
  const shot = stage => plan([{ mod: mod({ tags: ['projectile'], loop: true, stage }) }]).acts[0];
  const flat = shot(), lob = shot({ arc: 20 }), [dx, dy] = [flat.to[0] - flat.from[0], flat.to[1] - flat.from[1]];
  assert.ok(dy > 0, 'the tip is above the chest');
  near(heading(flat, 0), Math.atan2(dy, dx));
  near(heading(flat, 1), heading(flat, 0));
  assert.ok(heading(lob, 0) < 0 && heading(lob, 1) > 0, 'a lob climbs, then falls');
  near(heading(lob, 0.5), Math.atan2(dy, dx));
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

test('plan: a landing plays as the caster lands, a jump as they take off', () => {
  const lift = (tags, dt) => {
    const p = plan([{ mod: mod({ tags, stage: { at: 'ground' } }) }]);
    return poseAt(p.keys, p.acts[0].start + dt).lift;
  };
  assert.deepEqual([lift(['landing'], -0.15) > 0, lift(['landing'], 0)], [true, 0], 'in the air before, down on the effect');
  assert.deepEqual([lift(['jump'], -0.1), lift(['jump'], 0), lift(['jump'], 0.2)], [0, 0, 9], 'crouched, then up and away');
  assert.deepEqual([lift(['jump', 'air'], 0), lift(['jump', 'air'], 0.2)], [9, 18], 'a jump tagged air: already up, kicking higher');
});

test('plan: an effect hides or moves the caster, holds a cast or picks its own looks; a step on hit acts if acted', () => {
  const blink = mod({ tags: ['vanish'], act: { hits: [{ t: 0.1 }] }, stage: { at: 'caster', hide: [0, 0.1], move: [0.1, 54] } });
  const cut = mod({ tags: ['slash'], act: { hits: [{ t: 0.05 }] } });
  const p = plan([{ mod: blink }, { mod: cut, on: 'hit', acted: true }]), [a, b] = p.acts;
  assert.deepEqual([p.hidden, p.moves], [[[a.start, a.start + 0.1]], [[a.start + 0.1, 54]]]);
  assert.equal(poseAt(p.keys, b.contact).look, 'swing', 'she reappears swinging');
  assert.equal(poseAt(plan([{ mod: blink }, { mod: cut, on: 'hit' }]).keys, b.contact).look, 'raise', 'not acted: still on the blink');

  const ray = hold => { const q = plan([{ mod: mod({ duration: 0.8, stage: { hold } }) }]); return poseAt(q.keys, q.acts[0].start + 0.7).look; };
  assert.deepEqual([ray(true), ray(false)], ['point', 'idle'], 'a held cast points while the beam lasts');

  const ready = looks => { const q = plan([{ mod: mod({ tags: ['melee'], act: { hits: [{ t: 0.05 }] }, stage: { looks } }) }]); return poseAt(q.keys, q.acts[0].start).look; };
  assert.deepEqual([ready(undefined), ready({ ready: 'crouch' }), ready({ ready: ['undrawn', 'crouch'] }), ready({ ready: 'undrawn' })], ['ready', 'crouch', 'crouch', 'ready'], 'the first tag drawn, else the pose');
});

test('plan: a held charge stays raised while its loop plays, then winds straight up into the blow, in reach', () => {
  const charge = hold => mod({ tags: ['aura'], loop: true, duration: 0.8, stage: { cast: 'knight', hold } });
  const raised = hold => { const q = plan([{ mod: charge(hold) }]); return poseAt(q.keys, q.acts[0].end - 0.05).look; };
  assert.deepEqual([raised(true), raised(false)], ['raise', 'idle'], 'raised until the loop ends');
  const blow = mod({ tags: ['melee'], act: { windup: 0.2, hits: [{ t: 1 / 30 }] } });
  const p = plan([{ mod: charge(true) }, { mod: blow }]), [a, b] = p.acts;
  assert.equal(p.D, NEAR, 'a charge on the caster before a blow keeps the goblin in reach');
  const ls = looks(p.keys).filter(l => l.t > a.start - 1e-9 && l.t < b.contact + 1e-9).map(l => l.look);
  assert.deepEqual(ls, ['raise', 'ready', 'swing'], 'never idle between the charge and the blow');
  assert.equal(plan([{ mod: charge(true) }, { mod: mod({ act: { hits: [{ t: 0 }] } }) }]).D, FAR, 'a cast after it still needs room');
});

test('createStage: an effect that waits stands on its first frame before it plays', () => {
  const drawn = waits => {
    let n = 0;
    const st = createStage([{ mod: { ...mod({ tags: ['pickup'], stage: { waits } }), draw: () => n++ } }]);
    st.draw(0, new Uint8ClampedArray(st.size[0] * st.size[1] * 4));
    return n > 0;
  };
  assert.deepEqual([drawn(true), drawn(false)], [true, false]);
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

test('runs: each frame shows for its ms; a wind-up ends as the action comes in, which starts on its first frame', async () => {
  const run = [{ ms: 100 }, { ms: 100 }, { ms: 200 }], at = (u, loop) => run.indexOf(frameAt(run, u, loop));
  assert.deepEqual([-0.1, 0, 0.1, 0.35, 1].map(u => at(u)), [0, 0, 1, 2, 2], 'the first before it starts, the last once over');
  assert.deepEqual([0.45, -0.3].map(u => at(u, true)), [0, 1], 'a loop wraps round');
  const ls = [{ look: 'idle', t: -Infinity }, { look: 'ready', t: 1 }, { look: 'swing', t: 1.5 }, { look: 'idle', t: 2 }];
  assert.deepEqual([1, 1.05, 1.2, 1.45].map(t => at(into(ls, t, run))), [0, 0, 1, 2], 'a wind-up holds its first frame, then ends its run as the action comes in');
  near(into(ls, 1.6, run), 0.1);
  for (const id of listIds()) {
    const mod = await loadEffect(id);
    const hits = { strike: 'swing', thrust: 'lunge', uppercut: 'rise', spin: 'spin' }[role(mod.meta, id).pose];
    if (!hits) continue;
    const p = plan([{ mod, id }]);
    near(looks(p.keys).find(l => l.look === hits).t, p.acts[0].contact); // the swing or lunge lands with the hit
  }
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

test('the actors stand on the floor row; a background image stays put when the stage flips', async () => {
  const st = createStage([{ mod: await loadEffect('impacts/hit-spark'), id: 'impacts/hit-spark' }]), [w, h] = st.size;
  const out = new Uint8ClampedArray(w * h * 4), row = y => out.subarray(y * w * 4, (y + 1) * w * 4);
  st.draw(0, out, [100, 100, 100]); // before the effect: only the actors
  const drawn = y => row(y).some((v, i) => i % 4 < 3 && v !== 100);
  assert.ok(drawn(st.floor) && !drawn(st.floor + 1), 'their shadows are the lowest thing drawn, on the floor');
  const bg = new Uint8ClampedArray(w * h * 4).map((_, i) => (i % 4 === 3 ? 255 : (i >> 2) % w));
  st.draw(0, out, bg, true);
  assert.deepEqual(row(0), bg.subarray(0, w * 4), 'the empty top row is the background, unmirrored');
});

test('the goblin only stands in for effects that strike it: a buff, a pickup or a prop plays with the caster alone', () => {
  const foe = tags => plan([{ mod: mod({ tags }) }]).foe;
  assert.deepEqual([foe(['impact']), foe(['projectile']), foe(['status'])], [true, true, true]);
  assert.deepEqual([foe(['buff']), foe(['pickup']), foe(['nova']), foe(['ambient'])], [false, false, false, false]);
  assert.equal(plan([{ mod: mod({ tags: ['buff'] }) }, { mod: mod({ tags: ['impact'] }) }]).foe, true, 'a move with a blow in it');
  assert.equal(plan([{ mod: mod({ tags: ['ambient'] }) }]).acts[0].from[0], NEAR, 'a prop stands next to the caster');
  assert.equal(plan([{ mod: mod({ tags: ['ambient'] }) }]).acts[0].start, 0, 'from the start: nothing winds up for it');
  assert.equal(plan([{ mod: mod({ tags: ['buff'], stage: { ground: 5 } }), stage: { at: 'target' } }]).acts[0].role.at, 'target', "a step's stage over the effect's");
  assert.equal(plan([{ mod: mod({ tags: ['buff'], stage: { ground: 5 } }), stage: { at: 'target' } }]).acts[0].role.ground, 5, 'the rest of it kept');
  const width = tags => createStage([{ mod: mod({ tags }) }]).size[0];
  assert.ok(width(['buff']) < width(['impact']) - 20, 'the canvas fits the caster alone');
});

test('the wall slide: the kunoichi clings to the wall, her hand on the scrape in every frame, and the stage loops', async () => {
  const id = 'movement/wall-slide', fx = await loadEffect(id), r = role(fx.meta, id);
  assert.deepEqual([r.cast, r.pose, r.scenery], ['kunoichi', 'cling', 'wall']);
  const p = plan([{ mod: fx, id }]), [ax, ay] = p.acts[0].from, q = poseAt(p.keys, 1);
  assert.equal(q.look, 'cling');
  CAST.kunoichi.cling.forEach((f, i) => {
    const x = ax - q.x - f.x, y = ay + q.lift - f.y;
    assert.notEqual(f.rows[y][x], '.', `frame ${i + 1}: her hand on the anchor`);
    assert.equal(f.rows[0].length - 1, x, `frame ${i + 1}: nothing of her past the wall's face`);
  });
  const st = createStage([{ mod: fx, id }]), [w, h] = st.size, a = new Uint8ClampedArray(w * h * 4), b = new Uint8ClampedArray(w * h * 4);
  st.draw(0, a);
  st.draw(st.duration, b);
  assert.ok(st.loop);
  assert.deepEqual(b, a, 'its last frame runs into its first');
});

test("a tint swaps a character's body ramp and nothing else: the slime's outline, eyes and blush stay", () => {
  const ice = fit('ice', BODY.slime.length), out = tinted('slime', 'ice');
  PALETTES.slime.forEach((c, i) => assert.deepEqual(out[i], BODY.slime.includes(c) ? ice[BODY.slime.indexOf(c)] : c, c));
  assert.equal(tinted('slime', { ramp: 'ice', swap: { '#fc95a5': '#c4302e' } })[PALETTES.slime.indexOf('#fc95a5')], '#c4302e');
  assert.deepEqual(tinted('goblin', 'ice'), PALETTES.goblin, 'a character without a BODY keeps its colors');
});

test("another foe takes the hits: the slime in the goblin's place, tinted", async () => {
  const steps = [{ mod: await loadEffect('impacts/hit-spark'), id: 'impacts/hit-spark' }];
  const pixels = cast => {
    const st = createStage(steps, {}, { caster: false }, cast), [w, h] = st.size, out = new Uint8ClampedArray(w * h * 4);
    st.draw(0, out, [0, 0, 0]);
    return out;
  };
  const goblin = pixels(), slime = pixels({ foe: 'slime' }), ice = pixels({ foe: 'slime', tint: { slime: 'ice' } });
  assert.notDeepEqual(slime, goblin);
  assert.notDeepEqual(ice, slime);
  const lit = a => a.reduce((n, v, i) => n + (i % 4 < 3 && v > 0), 0);
  assert.equal(lit(ice), lit(slime), 'a tint changes colors, not the drawing');
});
