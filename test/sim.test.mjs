import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Rng, Particles, Lights, Bits, SPARK, SMOKE, FIRE, EMBER, DUST, Painter, createFrame, STEP } from 'grittyfx';

const ramp = [1, 2, 3, 4, 5];
function burst(seed) {
  const rng = new Rng(seed), ps = new Particles({ rng, palette: ramp, ground: 10 });
  for (const kind of [SPARK, SMOKE, FIRE, EMBER, DUST]) {
    for (let i = 0; i < 5; i++) ps.spawn(kind, 0, 0, rng.range(-80, 80), rng.range(-120, 0), rng.range(0.3, 1), { size: 3, smoke: 0.4 });
  }
  return ps;
}
const run = (ps, seconds) => { for (let i = 0; i < seconds / STEP; i++) ps.update(STEP); };

test('same seed, same particles', () => {
  const a = burst(4), b = burst(4), c = burst(5);
  run(a, 0.5);
  run(b, 0.5);
  run(c, 0.5);
  assert.deepEqual(a.list, b.list);
  assert.notDeepEqual(a.list, c.list);
});

test('particles die; burnt-out fire leaves smoke that dies too', () => {
  const ps = burst(1);
  run(ps, 1.05);
  assert.ok(ps.list.length > 0 && ps.list.every(q => q.kind === SMOKE), 'only the smoke left by fire remains');
  run(ps, 0.5);
  assert.equal(ps.list.length, 0);
});

test('delayed particles wait, then draw on their layer', () => {
  const ps = new Particles({ rng: new Rng(1), palette: ramp });
  ps.spawn(FIRE, 0, 0, 0, 0, 1, { size: 3, delay: 0.1, back: true });
  const drawn = layer => { const p = new Painter(createFrame(16, 16, 8, 8)); p.maxIndex = 5; ps.draw(p, layer); return p.frame.color.some(v => v); };
  assert.equal(drawn('back'), false);
  run(ps, 0.2);
  assert.equal(drawn('front'), false);
  assert.equal(drawn('back'), true);
});

test('bits bounce, come to rest on the ground and fade out', () => {
  const rng = new Rng(2), bits = new Bits({ rng, ground: 0 });
  for (let i = 0; i < 6; i++) bits.spawn(0, -5, rng.range(-60, 60), rng.range(-150, -50), { c: 1, life: 3 });
  run(bits, 2.5);
  assert.equal(bits.list.length, 6);
  assert.ok(bits.list.every(b => b.rest && b.y === 0));
  run(bits, 0.6);
  assert.equal(bits.list.length, 0);
});

test('seen from above, nothing rises or falls, and bits skid to a stop', () => {
  const rng = new Rng(3), ps = new Particles({ rng, palette: ramp, top: true }), bits = new Bits({ rng, top: true });
  for (const kind of [SPARK, SMOKE, FIRE, DUST]) ps.spawn(kind, 0, 0, 0, 0, 1, { size: 3 });
  bits.spawn(0, 0, 60, -80, { c: 1, life: 3 });
  run(ps, 0.5);
  run(bits, 2.5);
  assert.ok(ps.list.every(q => q.x === 0 && q.y === 0), JSON.stringify(ps.list));
  const [b] = bits.list;
  assert.ok(b.rest && b.x > 10 && b.x < 30 && b.y < -10 && b.y > -40, `${b.x}, ${b.y}`);
});

test('lights flare and die off', () => {
  const lights = new Lights();
  lights.add(0, 0, 4, 1, 1, 0.2, { delay: 0.05 });
  run(lights, 0.1);
  assert.equal(lights.list.length, 1);
  run(lights, 0.2);
  assert.equal(lights.list.length, 0);
});
