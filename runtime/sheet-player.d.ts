// Types for runtime/sheet-player.js; its header comment documents the behaviour.
/// <reference lib="dom" />
import type { Ramp } from '../src/core/index.js';

export interface Image { w: number; h: number; rgba: Uint8Array }
/** A loaded bundle: the Aseprite JSON (with meta.grittyfx), the decoded data sheet, the palette and the sound's URL. */
export interface Bundle { json: any; data: Image; palette: Uint8Array; sound?: string }

export interface PlayerOptions {
  flip?: boolean;
  gain?: number;
  /** Radians, screen space (y down): picks the row of a top-down bundle. */
  angle?: number;
  onHit?: ((index: number, freeze: number, shake: number) => void) | null;
  onFinished?: (() => void) | null;
}

export interface Player {
  bundle: Bundle;
  t: number;
  active: boolean;
  finished: boolean;
  flip: boolean;
  gain: number;
  angle: number;
  palette: Uint8Array;
  onHit: PlayerOptions['onHit'];
  onFinished: PlayerOptions['onFinished'];
  /** The frame shown now, or -1. */
  readonly index: number;
  readonly fade: number;
  play(): Player;
  update(dt: number): void;
  stop(): void;
  /** A whole 256-entry RGBA palette (1024 values), or ramps by name. */
  recolor(v: ArrayLike<number> | Record<string, Ramp>): Player;
  frame(): { w: number; h: number; ox: number; oy: number; color: Uint8ClampedArray; light: Uint8ClampedArray } | null;
  draw(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, x: number, y: number): void;
}

export function decodePng(bytes: Uint8Array): Promise<Image>;
export function loadBundle(url: string | URL): Promise<Bundle>;
export function createPlayer(bundle: Bundle, opts?: PlayerOptions): Player;
