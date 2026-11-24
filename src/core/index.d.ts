// Types for grittyfx's core. The JS beside this file is the source of truth; test/types.test.mjs keeps the names in step.

/** A color: '#rrggbb', [r, g, b] or [r, g, b, a], 0 to 255. */
export type Color = string | [number, number, number] | [number, number, number, number];
/** A ramp: a name from PAL, or colors dark to bright (bright to dark is reversed). */
export type Ramp = string | Color[];
/** A palette index, or a function giving one (its arguments depend on the shape: see each method). */
export type Paint<A extends number[]> = number | ((...args: A) => number);
/** An alpha or light intensity 0 to 1, or a function giving one. */
export type Amount<A extends number[]> = number | ((...args: A) => number);

export type SoundKind = 'thump' | 'crack' | 'whoosh' | 'crackle' | 'zap' | 'chime';
export interface Cue { t: number; kind: SoundKind; gain?: number; pitch?: number }
export interface Hit { t: number; freeze?: number; shake?: number }
export type View = 'side' | 'top';

/** An effect's description: what tools, players and the stage read. */
export interface Meta {
  name: string;
  desc?: string;
  tags?: string[];
  size: [number, number];
  /** The anchor inside the canvas. */
  origin: [number, number];
  duration: number;
  loop?: boolean;
  end?: 'remove' | 'hold' | 'loop';
  fps?: number;
  mirror?: boolean;
  views?: View[];
  top?: { size?: [number, number]; origin?: [number, number]; directions?: 1 | 8 };
  /** Color slots and their steps: { palette: 8, smoke: 6 }. */
  ramps?: Record<string, number>;
  /** Defaults: a ramp per slot, a seed, and the effect's own options. */
  options?: Record<string, unknown>;
  act?: { windup?: number; hits?: Hit[] };
  /** Cues; without it each act hit plays a thump; false is silence. */
  sound?: Cue[] | false;
  stage?: { at?: 'target' | 'caster' | 'ground' | 'path' | 'above' | 'aside'; cast?: 'knight' | 'mage' | 'priest' | 'archer' | 'kunoichi'; ground?: number; x?: number; speed?: number };
}

/** Options as an effect sees them: meta.options merged with yours, each ramp slot turned into palette indices. */
export type Options = Record<string, any> & { palette: number[]; seed?: number; view?: View };

/** A simulation: stepped at STEP, drawn any number of times. */
export interface Sim {
  update(dt: number): void;
  draw(p: Painter): void;
  drawBack?(p: Painter): void;
}

/** An effect module (`grittyfx/fx/<category>/<name>`): meta plus a pure draw or a simulation. */
export interface EffectModule {
  meta: Meta;
  draw?: (p: Painter, t: number, o: Options) => void;
  drawBack?: (p: Painter, t: number, o: Options) => void;
  create?: (o: Options) => Sim;
}

/** Per pixel, a color index and alpha in `color`, a light index and intensity in `light`. */
export interface Frame { w: number; h: number; ox: number; oy: number; color: Uint8Array; light: Uint8Array }

export const STEP: number;
export function createFrame(w: number, h: number, ox?: number, oy?: number): Frame;
export function clearFrame(frame: Frame): Frame;
/** RGBA through a 256-entry palette table; opaque over `bg` (one color, or an RGBA image the frame's size), straight
 * alpha without. */
export function composite<T extends Uint8Array | Uint8ClampedArray = Uint8ClampedArray>(
  frame: Frame, palette: ArrayLike<number>, out?: T, bg?: string | [number, number, number] | ArrayLike<number> | null, gain?: number,
): T;
export const HEADINGS: readonly ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
export function layout(meta: Meta, view?: View): { size: [number, number]; origin: [number, number]; directions: number };

export interface Fx {
  meta: Meta;
  o: Options;
  /** The palette table: 256 RGBA entries. */
  palette: Uint8Array;
  ramps: { name: string; from: number; steps: number }[];
  t: number;
  flip: boolean;
  /** Radians, clockwise. */
  angle: number;
  lightK: number;
  update(dt: number): void;
  /** Draws a layer at the current time; the painter it returns counts bad writes. */
  draw(frame: Frame, layer?: 'front' | 'back'): Painter;
  /** Fades out over 0.3 s. */
  stop(): void;
  done(): boolean;
}
export function createFx(mod: EffectModule, opts?: Record<string, unknown>): Fx;

export class Painter {
  constructor(frame: Frame);
  frame: Frame;
  fade: number;
  lightK: number;
  maxIndex: number;
  outside: number;
  outsideAt?: [number, number];
  bad: number;
  badAt?: [number, number, number];
  place(x: number, y: number, flip?: boolean, angle?: number): this;
  cell(x: number, y: number): [number, number];
  px(x: number, y: number, c: number): void;
  dot(x: number, y: number, c: number, a?: number): void;
  blend(x: number, y: number, c: number, a?: number): void;
  line(x0: number, y0: number, x1: number, y1: number, c: Paint<[t: number]>, a?: Amount<[t: number]>): void;
  polyline(points: [number, number][], c: Paint<[t: number]>, a?: Amount<[t: number]>): void;
  beam(x0: number, y0: number, x1: number, y1: number, w: number, c: Paint<[t: number, d: number]>, a?: Amount<[t: number, d: number]>): void;
  circle(cx: number, cy: number, r: number, c: Paint<[dx: number, dy: number, d: number]>, a?: Amount<[dx: number, dy: number, d: number]>): void;
  ellipse(cx: number, cy: number, rx: number, ry: number, c: Paint<[dx: number, dy: number, d: number]>, a?: Amount<[dx: number, dy: number, d: number]>): void;
  disc(cx: number, cy: number, r: number, c: Paint<[dx: number, dy: number, d: number]>, a?: Amount<[dx: number, dy: number, d: number]>): void;
  ring(cx: number, cy: number, r: number, w: number, c: Paint<[dx: number, dy: number, e: number]>, a?: Amount<[dx: number, dy: number, e: number]>): void;
  arc(cx: number, cy: number, r: number, a0: number, a1: number, w: number | ((t: number) => number), c: Paint<[t: number, e: number]>, a?: Amount<[t: number, e: number]>): void;
  shade(x: number, y: number, w: number, h: number, c: Paint<[x: number, y: number]>, a?: Amount<[x: number, y: number]>): void;
  light(x: number, y: number, c: number, k?: number): void;
  glow(cx: number, cy: number, r: number, c: Paint<[d: number]>, k?: Amount<[d: number]>): void;
  glowLine(x0: number, y0: number, x1: number, y1: number, r: number, c: Paint<[t: number, d: number]>, k?: Amount<[t: number, d: number]>): void;
}

export const PAL: Record<string, string[]>;
export function hex(s: string): [number, number, number, number];
export function ramp(v: Ramp): number[][];
/** A ramp resampled to `n` steps, dark to bright. */
export function fit(r: Ramp, n: number): number[][];
export function paletteTable(ramps: Record<string, Ramp>): {
  table: Uint8Array; index: Record<string, number[]>; ramps: { name: string; from: number; steps: number }[];
};

export class Rng {
  constructor(seed?: number);
  next(): number;
  range(a: number, b: number): number;
  int(a: number, b: number): number;
  pick<T>(list: readonly T[]): T;
  chance(p: number): boolean;
}
export function rand(x: number, k?: number, j?: number): number;

export function noise2(x: number, y: number, seed?: number): number;
export function fbm(x: number, y: number, n?: number, seed?: number): number;
export function loopNoise(x: number, t: number, period: number, seed?: number): number;
export function tileFbm(x: number, y: number, w: number, n?: number, seed?: number): number;

export type ParticleKind = 'spark' | 'smoke' | 'fire' | 'ember' | 'dust';
export const SPARK: 'spark';
export const SMOKE: 'smoke';
export const FIRE: 'fire';
export const EMBER: 'ember';
export const DUST: 'dust';
export class Particles {
  constructor(o: { rng: Rng; palette: number[]; smoke?: number[]; dust?: number[]; ground?: number; gravity?: number; top?: boolean });
  spawn(kind: ParticleKind, x: number, y: number, vx: number, vy: number, life: number,
    o?: { size?: number; delay?: number; back?: boolean; ramp?: number[]; smoke?: number }): void;
  update(dt: number): void;
  draw(p: Painter, layer?: 'front' | 'back'): void;
}
export class Lights {
  add(x: number, y: number, r: number, c: number, k?: number, life?: number, o?: { delay?: number }): void;
  update(dt: number): void;
  draw(p: Painter): void;
}
export class Bits {
  constructor(o: { rng: Rng; ground?: number; gravity?: number; onLand?: (bit: any) => void; top?: boolean });
  spawn(x: number, y: number, vx: number, vy: number, o: { c: number; size?: number; life?: number; shard?: boolean; delay?: number }): void;
  update(dt: number): void;
  draw(p: Painter): void;
}

export const SAMPLE_RATE: number;
export const SOUNDS: Record<SoundKind, (...args: any[]) => Float64Array>;
export function soundCues(meta: Meta): Required<Cue>[];
/** Mono samples in [-1, 1] at SAMPLE_RATE, one duration long, or null without cues. */
export function synth(meta: Meta, seed?: number): Float64Array | null;
