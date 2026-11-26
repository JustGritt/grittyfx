import { Rng, Bits, Lights } from '../../core/index.js';

export const meta = {
  name: 'Shell casing',
  desc: 'A brass casing kicked up and back out of a rifle, tumbling end over end, bouncing twice with a tink, glinting, then lying still and fading',
  tags: ['firearm', 'military', 'gun', 'rifle', 'casing', 'shell', 'brass', 'cartridge', 'eject', 'bullet', 'debris'],
  size: [44, 40],
  origin: [36, 34],
  duration: 1.8,
  loop: false,
  fps: 30,
  views: ['side'],
  ramps: { palette: 8 },
  options: { palette: 'gold', seed: 1 },
  // The anchor is on the floor under the ejection port; the casing leaves the port PORT px above it.
  stage: { at: 'caster', ground: 0, x: 6 },
  sound: [ // a tink on each bounce, the last as it settles
    { t: 0.5, kind: 'chime', gain: 0.3, pitch: 3 },
    { t: 0.76, kind: 'chime', gain: 0.22, pitch: 3.3 },
    { t: 0.91, kind: 'chime', gain: 0.1, pitch: 3.6 },
  ],
};

const PORT = 20; // px above the floor
const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]]; // the casing's axis, snapped to 45 degrees

export function create(o) {
  const rng = new Rng(o.seed), C = o.palette, lights = new Lights();
  let landings = 0, restAt = Infinity, t = 0, n = 0;
  const bits = new Bits({
    rng,
    ground: 0,
    gravity: 520,
    onLand: b => {
      landings++;
      if (landings === 2) b.vy *= 1.5; // brass is springy: a second hop you can see
      if (landings === 3) b.vy = 0; // then it settles
      else lights.add(b.x, -1, 5, C[6], 0.5, 0.1);
      if (b.vy < 35) restAt = t;
    },
  });
  const shell = bits.spawn(0, -PORT, -40, -90, { c: C[5], size: 3, life: 2 });
  shell.angle = 0;
  shell.spin = -24; // end over end, tumbling backward

  return {
    update(dt) {
      t = ++n * dt; // counted, not summed: a sum of 1/120 steps drifts below the frame times
      bits.update(dt);
      lights.update(dt);
    },
    draw(p) {
      lights.draw(p);
      const u = (t - restAt - 0.55) / 0.3; // lying still, then fading: down the ramp and dithered out
      if (u >= 1) return;
      const fade = u > 0 ? Math.round(u * 2) : 0, a = u > 0.5 ? 2 * (1 - u) : 1;
      const k = ((Math.round(shell.angle / (Math.PI / 4)) % 8) + 8) % 8, [dx, dy] = DIRS[k];
      const x = shell.x, y = shell.y - 1 - Math.abs(dy); // its lowest pixel sits on the floor
      p.dot(x - dx, y - dy, C[Math.max(0, 3 - fade)], a); // the base, darker
      p.dot(x, y, C[Math.max(0, 6 - fade)], a);
      p.dot(x + dx, y + dy, C[Math.max(0, 5 - fade)], a); // the mouth
      if (restAt === Infinity) p.light(x, y, C[6], 0.6 * Math.max(0, Math.cos(2 * shell.angle)) ** 6); // catching the light as it turns
      const g = (t - restAt - 0.12) / 0.2; // the glint, once it lies still: a star that opens and closes on its middle
      if (g > 0 && g < 1) {
        const r = Math.round(Math.sin(Math.PI * g) * 3);
        for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let i = 1; i <= (ay > 0 ? Math.min(r, 1) : r); i++) p.px(x + ax * i, y + ay * i, C[i < r ? 6 : 5]); // short below: the floor
        if (r >= 3) for (const [ax, ay] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) p.px(x + ax, y + ay, C[5]);
        p.px(x, y, C[7]);
        p.glow(x + 0.5, y + 0.5, 6, C[6], 0.7 * Math.sin(Math.PI * g));
      }
    },
  };
}
