// Simulation toolkit: particles, flaring lights and tumbling debris. Stepped by the runtime at a fixed 120 Hz; only
// update() takes random numbers (from the effect's Rng), so draw() can run any number of times.
import { rand } from './rng.js';

export const SPARK = 'spark', SMOKE = 'smoke', FIRE = 'fire', EMBER = 'ember', DUST = 'dust';
const ORDER = [SMOKE, DUST, FIRE, EMBER, SPARK]; // volumes under, bright bits on top

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
const step = (ramp, h) => ramp[clamp(Math.round((ramp.length - 1) * h), 0, ramp.length - 1)];

/**
 * Particles. `palette` (sparks, fire, embers), `smoke` and `dust` are ramps as palette indices, usually o.palette and
 * o.smoke. `ground` is the floor's y (sparks bounce on it, dust settles on it). `top`: seen from above, the floor is the
 * whole canvas, so nothing falls, rises or sinks; leave `ground` out.
 */
export class Particles {
  constructor({ rng, palette, smoke = palette, dust = smoke, ground = Infinity, gravity = 300, top = false }) {
    Object.assign(this, { rng, palette, smoke, dust, ground, gravity, top, list: [], ids: 0 });
  }

  /**
   * Adds a particle; life in seconds. Options: size (radius of volumes), delay (seconds before it appears), back
   * (draw on the back layer), ramp (instead of the kind's own), smoke (fire only: seconds of smoke once it burns out).
   */
  spawn(kind, x, y, vx, vy, life, { size = 1, delay = 0, back = false, ramp, smoke = 0 } = {}) {
    const q = { kind, x, y, vx, vy, life, age: 0, size, delay, back, ramp, smoke, id: this.ids++ };
    this.list.push(q);
    return q;
  }

  update(dt) {
    const { rng, ground, gravity: g, top } = this, born = [];
    for (const q of this.list) {
      if (q.delay > 0) {
        q.delay -= dt;
        continue;
      }
      q.age += dt;
      if (q.age >= q.life) {
        if (q.kind === FIRE && q.smoke > 0) born.push([SMOKE, q.x, q.y - 1, q.vx * 0.5, q.vy * 0.5, q.smoke, { size: q.size, back: q.back }]);
        continue;
      }
      let drag = 0.5, ay = 0; // falling (sparks, dust) or rising (smoke, fire, embers)
      if (q.kind === SPARK) ay = g;
      else if (q.kind === SMOKE) (ay = -25), (drag = 2.5);
      else if (q.kind === FIRE) (ay = -70), (drag = 3);
      else if (q.kind === EMBER) (ay = -18), (q.vx += (rng.next() - 0.5) * 120 * dt), (drag = 1.5);
      else if (q.kind === DUST) (ay = 40), (drag = 4);
      if (top && q.kind === EMBER) q.vy += (rng.next() - 0.5) * 120 * dt; // wanders both ways on the floor plane
      else if (!top) q.vy += ay * dt;
      q.vx *= 1 - drag * dt;
      q.vy *= 1 - drag * dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      if (q.y > ground && (q.kind === SPARK || q.kind === DUST)) {
        q.y = ground;
        q.vy *= q.kind === SPARK ? -0.35 : 0;
        q.vx *= 0.7;
      }
    }
    this.list = this.list.filter(q => q.age < q.life);
    for (const b of born) this.spawn(...b);
  }

  draw(p, layer = 'front') {
    for (const kind of ORDER) {
      for (const q of this.list) if (q.kind === kind && q.delay <= 0 && q.back === (layer === 'back')) this._draw(p, q);
    }
  }

  _draw(p, q) {
    const u = q.age / q.life, h = 1 - u;
    if (q.kind === SPARK) {
      const ramp = q.ramp ?? this.palette, k = 0.035; // streak length: the last 35 ms of motion
      const hot = step(ramp, 0.45 + 0.55 * h), warm = step(ramp, 0.3 + 0.55 * h), a = Math.min(1, h / 0.2);
      const tx = q.x - clamp(q.vx * k, -6, 6), ty = q.y - clamp(q.vy * k, -6, 6);
      p.line(tx, ty, q.x, q.y, t => (t > 0.6 ? hot : warm), a);
      p.glow(q.x, q.y, 3, step(ramp, 0.6), 0.35 * h);
    } else if (q.kind === EMBER) {
      const ramp = q.ramp ?? this.palette, flicker = rand(q.id, Math.floor(q.age * 20)) < 0.2 ? 0.15 : 0;
      p.dot(q.x, q.y, step(ramp, 0.35 + 0.6 * h - flicker), Math.min(1, h / 0.3));
      p.light(q.x, q.y, step(ramp, 0.6), 0.4 * h);
    } else if (q.kind === FIRE) {
      // Barely darker at the rim, so neighbouring puffs merge into one body, and never below a third of the ramp: fire
      // turns to smoke (or fades), not into dark blobs.
      const ramp = q.ramp ?? this.palette, r = q.size * (1 - 0.4 * u), heat = 0.3 + 0.75 * h;
      const c = (dx, dy, d) => step(ramp, heat - d * 0.12 + (-dx - dy) / (r * 10));
      p.disc(q.x, q.y, r, c, (dx, dy, d) => smooth(1, 0.6, d) * Math.min(1, h / 0.25));
      p.glow(q.x, q.y, r * 2.2, step(ramp, 0.5 + 0.4 * h), 0.45 * h);
    } else {
      // SMOKE and DUST: soft volumes that swell and thin; a highlight up-left, a shadow rim down-right
      const smoke = q.kind === SMOKE, ramp = q.ramp ?? (smoke ? this.smoke : this.dust);
      const r = q.size * (1 + (smoke ? 1.5 : 0.8) * u), a0 = (smoke ? 0.85 : 0.9) * h ** 1.4 * Math.min(1, q.age / 0.06);
      const c = (dx, dy) => {
        if (Math.hypot(dx + r * 0.3, dy + r * 0.35) < r * 0.6) return step(ramp, 0.62);
        return step(ramp, Math.hypot(dx + r * 0.2, dy + r * 0.25) > r * 0.92 ? 0.28 : 0.45);
      };
      p.disc(q.x, q.y, r, c, (dx, dy, d) => a0 * smooth(1, 0.55, d));
    }
  }
}

/** Lights that flare at a point and die off: full at once, then (1 - age / life)^2. */
export class Lights {
  constructor() {
    this.list = [];
  }

  add(x, y, r, c, k = 1, life = 0.2, { delay = 0 } = {}) {
    const l = { x, y, r, c, k, life, delay, age: 0 };
    this.list.push(l);
    return l;
  }

  update(dt) {
    for (const l of this.list) if ((l.delay -= dt) < 0) l.age += dt;
    this.list = this.list.filter(l => l.age < l.life);
  }

  draw(p) {
    for (const l of this.list) if (l.delay <= 0) p.glow(l.x, l.y, l.r, l.c, l.k * (1 - l.age / l.life) ** 2);
  }
}

/**
 * Debris: shards (thin lines) and chunks that tumble, bounce on the ground, come to rest and fade at the end of life.
 * onLand(bit) runs at each touch of the ground, before the bounce, with the bit's impact velocity (kick up dust there).
 * `top`: seen from above, bits skid across the floor plane and slow to a stop; no gravity, ground or onLand.
 */
export class Bits {
  constructor({ rng, ground = Infinity, gravity = 300, onLand, top = false }) {
    Object.assign(this, { rng, ground, gravity, onLand, top, list: [] });
  }

  /** c is a palette index; size the length in px. */
  spawn(x, y, vx, vy, { c, size = 2, life = 1, shard = false, delay = 0 } = {}) {
    const b = { x, y, vx, vy, c, size, life, shard, delay, age: 0, rest: false };
    b.angle = this.rng.range(0, Math.PI * 2);
    b.spin = this.rng.range(-14, 14);
    this.list.push(b);
    return b;
  }

  update(dt) {
    const { ground, gravity } = this;
    for (const b of this.list) {
      if (b.delay > 0) {
        b.delay -= dt;
        continue;
      }
      b.age += dt;
      if (b.rest) continue;
      if (this.top) {
        const k = 1 - 3 * dt;
        b.x += (b.vx *= k) * dt;
        b.y += (b.vy *= k) * dt;
        b.angle += (b.spin *= k) * dt;
        b.rest = Math.hypot(b.vx, b.vy) < 6;
        continue;
      }
      b.vy += gravity * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.angle += b.spin * dt;
      if (b.y >= ground) {
        b.y = ground;
        this.onLand?.(b);
        if (Math.abs(b.vy) < 35) {
          b.rest = true;
          b.angle = Math.round(b.angle / Math.PI) * Math.PI; // lie flat
        } else {
          b.vy *= -0.4;
          b.vx *= 0.6;
          b.spin *= 0.6;
        }
      }
    }
    this.list = this.list.filter(b => b.age < b.life);
  }

  draw(p) {
    for (const b of this.list) {
      if (b.delay > 0) continue;
      const a = Math.min(1, (1 - b.age / b.life) / 0.2), dx = (Math.cos(b.angle) * b.size) / 2, dy = (Math.sin(b.angle) * b.size) / 2;
      if (b.shard) p.line(b.x - dx, b.y - dy, b.x + dx, b.y + dy, b.c, a);
      else p.beam(b.x - dx / 2, b.y - dy / 2, b.x + dx / 2, b.y + dy / 2, b.size / 2, b.c, a);
    }
  }
}
