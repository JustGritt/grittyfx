// Seeded random numbers. Effects never use Math.random() or Date: frame N is the same on every machine.

/** A seeded generator (mulberry32). */
export class Rng {
  constructor(seed = 1) {
    this.s = Math.imul(seed | 0, 0x9e3779b9) ^ 0x5bd1e995;
  }
  /** A number in [0, 1). */
  next() {
    let t = (this.s = (this.s + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  /** A number in [a, b). */
  range(a, b) {
    return a + (b - a) * this.next();
  }
  /** An integer in [a, b], both included. */
  int(a, b) {
    return a + Math.floor((b - a + 1) * this.next());
  }
  pick(list) {
    return list[Math.floor(list.length * this.next())];
  }
  chance(p) {
    return this.next() < p;
  }
}

/** A stateless hash of up to three integers to [0, 1): per-pixel or per-index randomness. */
export function rand(x, k = 0, j = 0) {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(k | 0, 0x165667b1) ^ Math.imul(j | 0, 0x9e3779b9);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
