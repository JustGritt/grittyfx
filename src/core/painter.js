// The painter. Effects draw in local coordinates around their anchor (x right, y down, 1 unit = 1 px); the painter
// places, mirrors and rotates them, and writes palette indices into a frame's color and light buffers.
//
// Coordinates are positions: integer positions are pixel corners, pixel (i, j) has its center at (i + 0.5, j + 0.5).
// Single-cell ops (px, dot, blend, light, line) take the cell a position falls in. Shapes take every pixel whose center
// is inside them, so circle(0, 0, 2) is 4 px wide and circle(0.5, 0.5, 2) 5 px wide.
//
// Colors are palette indices; 0 (or any falsy value) draws nothing and never erases. A color or alpha argument may be
// a function of the shape's own coordinates, given with each shape below.

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(b => (b + 0.5) / 16);
const MIN = 0.5 / 255; // below this, a byte rounds to 0
const TAU = Math.PI * 2;
const val = (v, a, b, c) => (typeof v === 'function' ? v(a, b, c) : v);
const snap = v => Math.round(v * 1e9) / 1e9; // so cos(90 degrees) is 0, not 6e-17

export class Painter {
  constructor(frame) {
    this.frame = frame;
    this.fade = 1; // multiplies every alpha and light; set by the runtime
    this.lightK = 1; // multiplies light; set by the runtime
    this.maxIndex = 255; // the last index of the effect's palette
    this.outside = 0; // writes that fell outside the frame
    this.bad = 0; // colors that aren't palette indices (an RGB value, a fraction)
    this.place(frame.ox, frame.oy);
  }

  /** Puts the anchor at frame pixel position (x, y), mirrored if `flip`, turned `angle` radians clockwise. */
  place(x, y, flip = false, angle = 0) {
    this.X = x;
    this.Y = y;
    this.f = flip ? -1 : 1;
    this.c = snap(Math.cos(angle));
    this.s = snap(Math.sin(angle));
    return this;
  }

  // ---- writes in frame space, alpha and light final ----

  _put(x, y, c, a) {
    if (!c || !(a >= MIN)) return;
    if (c !== (c | 0) || c < 0 || c > this.maxIndex) return void this.bad++;
    const { w, h, color } = this.frame;
    if (x < 0 || y < 0 || x >= w || y >= h) return void this.outside++;
    const i = (y * w + x) * 2, under = (color[i + 1] / 255) * (1 - Math.min(a, 1));
    if (a >= under) color[i] = c; // the layer that contributes more keeps its index
    color[i + 1] = Math.round(Math.min(1, a + under) * 255);
  }

  _lit(x, y, c, k) {
    if (!c || !(k >= MIN)) return;
    if (c !== (c | 0) || c < 0 || c > this.maxIndex) return void this.bad++;
    const { w, h, light } = this.frame;
    if (x < 0 || y < 0 || x >= w || y >= h) return void this.outside++;
    const i = (y * w + x) * 2, under = light[i + 1] / 255;
    if (k >= under) light[i] = c; // the brighter light keeps its index
    light[i + 1] = Math.round(Math.min(1, k + under) * 255);
  }

  _dot(x, y, c, a) {
    if (a * this.fade > BAYER[(y & 3) * 4 + (x & 3)]) this._put(x, y, c, 1);
  }

  _blend(x, y, c, a) {
    this._put(x, y, c, a * this.fade);
  }

  _light(x, y, c, k) {
    this._lit(x, y, c, k * this.fade * this.lightK);
  }

  /** The frame cell that local position (x, y) lands in. */
  cell(x, y) {
    const lx = this.f * (Math.floor(x) + 0.5), ly = Math.floor(y) + 0.5;
    return [Math.floor(this.X + this.c * lx - this.s * ly), Math.floor(this.Y + this.s * lx + this.c * ly)];
  }

  // Calls fn(lx, ly, X, Y) for every frame cell around the local box [x0, x1] x [y0, y1], with the local position of
  // the cell's center. Not clipped to the frame, so drawing outside it is counted.
  _area(x0, y0, x1, y1, fn) {
    const { X, Y, f, c, s } = this, xs = [], ys = [];
    for (const [lx, ly] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) {
      xs.push(X + c * f * lx - s * ly);
      ys.push(Y + s * f * lx + c * ly);
    }
    for (let sy = Math.floor(Math.min(...ys)); sy <= Math.ceil(Math.max(...ys)); sy++) {
      for (let sx = Math.floor(Math.min(...xs)); sx <= Math.ceil(Math.max(...xs)); sx++) {
        const dx = sx + 0.5 - X, dy = sy + 0.5 - Y;
        fn(f * (c * dx + s * dy), -s * dx + c * dy, sx, sy);
      }
    }
  }

  // ---- pixels ----

  /** A solid pixel. */
  px(x, y, c) {
    const [X, Y] = this.cell(x, y);
    this._dot(X, Y, c, 1);
  }

  /** A pixel at alpha `a` by 4x4 Bayer dither: on or off, never in between. */
  dot(x, y, c, a = 1) {
    const [X, Y] = this.cell(x, y);
    this._dot(X, Y, c, a);
  }

  /** A pixel at true alpha `a`. */
  blend(x, y, c, a = 1) {
    const [X, Y] = this.cell(x, y);
    this._blend(X, Y, c, a);
  }

  // ---- lines; c and a may be functions of t, 0 to 1 from the first point to the last ----

  line(x0, y0, x1, y1, c, a = 1) {
    this.polyline([[x0, y0], [x1, y1]], c, a);
  }

  /** Lines through `points` ([[x, y], ...]); t runs 0 to 1 along each segment. */
  polyline(points, c, a = 1) {
    // Each point is placed from the first one by its turned offset, rounded once, so lines keep their angle.
    const [x0, y0] = points[0], [X0, Y0] = this.cell(x0, y0), { f, c: cos, s: sin } = this;
    const at = ([x, y]) => {
      const dx = f * (Math.floor(x) - Math.floor(x0)), dy = Math.floor(y) - Math.floor(y0);
      return [X0 + Math.round(cos * dx - sin * dy), Y0 + Math.round(sin * dx + cos * dy)];
    };
    for (let i = 1; i < points.length; i++) this._line(...at(points[i - 1]), ...at(points[i]), c, a, i > 1);
  }

  _line(X, Y, X1, Y1, c, a, skipFirst) {
    const dx = Math.abs(X1 - X), dy = -Math.abs(Y1 - Y), sx = X < X1 ? 1 : -1, sy = Y < Y1 ? 1 : -1;
    const len = Math.max(dx, -dy) || 1;
    for (let err = dx + dy, n = 0; ; n++) {
      if (n || !skipFirst) this._dot(X, Y, val(c, n / len), val(a, n / len));
      if (X === X1 && Y === Y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; X += sx; }
      if (e2 <= dx) { err += dx; Y += sy; }
    }
  }

  /** A thick line with round ends, `w` px wide. c and a: (t along 0 to 1, d from the axis 0 to 1). */
  beam(x0, y0, x1, y1, w, c, a = 1) {
    this._capsule(x0, y0, x1, y1, w / 2, (X, Y, t, d) => this._dot(X, Y, val(c, t, d), val(a, t, d)));
  }

  _capsule(x0, y0, x1, y1, r, fn) {
    const vx = x1 - x0, vy = y1 - y0, l2 = vx * vx + vy * vy || 1;
    this._area(Math.min(x0, x1) - r, Math.min(y0, y1) - r, Math.max(x0, x1) + r, Math.max(y0, y1) + r, (lx, ly, X, Y) => {
      const t = Math.max(0, Math.min(1, ((lx - x0) * vx + (ly - y0) * vy) / l2));
      const d = Math.hypot(x0 + vx * t - lx, y0 + vy * t - ly) / r;
      if (d <= 1) fn(X, Y, t, d);
    });
  }

  // ---- shapes; solid ones dither their alpha, disc and shade blend it ----

  /** A filled circle. c and a: (dx, dy from the center, d from the center 0 to 1). */
  circle(cx, cy, r, c, a = 1) {
    this._round(cx, cy, r, r, c, a, false);
  }

  ellipse(cx, cy, rx, ry, c, a = 1) {
    this._round(cx, cy, rx, ry, c, a, false);
  }

  /** A translucent volume (smoke, fire, mist): a circle at true alpha. */
  disc(cx, cy, r, c, a = 1) {
    this._round(cx, cy, r, r, c, a, true);
  }

  _round(cx, cy, rx, ry, c, a, soft) {
    this._area(cx - rx, cy - ry, cx + rx, cy + ry, (lx, ly, X, Y) => {
      const dx = lx - cx, dy = ly - cy, d = Math.hypot(dx / rx, dy / ry);
      if (d > 1) return;
      if (soft) this._blend(X, Y, val(c, dx, dy, d), val(a, dx, dy, d));
      else this._dot(X, Y, val(c, dx, dy, d), val(a, dx, dy, d));
    });
  }

  /** A circle outline `w` px wide. c and a: (dx, dy, e across the band, -1 inside to 1 outside). */
  ring(cx, cy, r, w, c, a = 1) {
    const R = r + w / 2;
    this._area(cx - R, cy - R, cx + R, cy + R, (lx, ly, X, Y) => {
      const dx = lx - cx, dy = ly - cy, e = (Math.hypot(dx, dy) - r) / (w / 2);
      if (Math.abs(e) <= 1) this._dot(X, Y, val(c, dx, dy, e), val(a, dx, dy, e));
    });
  }

  /**
   * Part of a ring from angle a0 to a1 (radians, clockwise from +x; a1 < a0 goes the other way). A number `w` is
   * the widest point of a crescent, w * sin(pi t); a function w(t) gives the width along the arc.
   * c and a: (t along 0 to 1, e across -1 inside to 1 outside).
   */
  arc(cx, cy, r, a0, a1, w, c, a = 1) {
    const span = a1 - a0, width = typeof w === 'function' ? w : t => w * Math.sin(Math.PI * t);
    const R = r + Math.max(...Array.from({ length: 33 }, (_, i) => width(i / 32))) / 2;
    this._area(cx - R, cy - R, cx + R, cy + R, (lx, ly, X, Y) => {
      const dx = lx - cx, dy = ly - cy;
      const t = ((((Math.atan2(dy, dx) - a0) * Math.sign(span)) % TAU) + TAU) % TAU / Math.abs(span);
      if (t > 1) return;
      const e = (Math.hypot(dx, dy) - r) / (width(t) / 2);
      if (Math.abs(e) <= 1) this._dot(X, Y, val(c, t, e), val(a, t, e));
    });
  }

  /** Every pixel of the w x h box at (x, y), at true alpha. c and a: (x, y) of the local pixel. */
  shade(x, y, w, h, c, a = 1) {
    this._area(x, y, x + w, y + h, (lx, ly, X, Y) => {
      const px = Math.floor(lx), py = Math.floor(ly);
      if (px >= x && py >= y && px < x + w && py < y + h) this._blend(X, Y, val(c, px, py), val(a, px, py));
    });
  }

  // ---- light: an index and an intensity, added over the color when composited ----

  light(x, y, c, k = 1) {
    const [X, Y] = this.cell(x, y);
    this._light(X, Y, c, k);
  }

  /** A round pool of light. A number `k` falls off as k * (1 - d)^2; a function k(d) sets it. c may be c(d). */
  glow(cx, cy, r, c, k = 1) {
    const kf = typeof k === 'function' ? k : d => k * (1 - d) ** 2;
    this._area(cx - r, cy - r, cx + r, cy + r, (lx, ly, X, Y) => {
      const d = Math.hypot(lx - cx, ly - cy) / r;
      if (d < 1) this._light(X, Y, val(c, d), kf(d));
    });
  }

  /** Light around a segment, falling off over `r` px. k as in glow, or k(t, d); c may be c(t, d). */
  glowLine(x0, y0, x1, y1, r, c, k = 1) {
    const kf = typeof k === 'function' ? k : (t, d) => k * (1 - d) ** 2;
    this._capsule(x0, y0, x1, y1, r, (X, Y, t, d) => d < 1 && this._light(X, Y, val(c, t, d), kf(t, d)));
  }
}
