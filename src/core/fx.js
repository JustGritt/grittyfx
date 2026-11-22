// Frames, compositing and live effects.

/** A frame: per pixel, a color index and alpha in `color`, a light index and intensity in `light` (bytes). */
export function createFrame(w, h, ox = 0, oy = 0) {
  return { w, h, ox, oy, color: new Uint8Array(w * h * 2), light: new Uint8Array(w * h * 2) };
}

export function clearFrame(frame) {
  frame.color.fill(0);
  frame.light.fill(0);
  return frame;
}
