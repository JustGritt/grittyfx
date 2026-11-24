// .aseprite encoder and decoder for RGBA sprites, on node:zlib. Spec:
// https://github.com/aseprite/aseprite/blob/main/docs/ase-file-specs.md
// A sprite is { w, h, layers, frames, tags, palette? }: layers [{ name, blend, opacity, flags, type, userData }],
// frames [{ duration (ms), cels }] with one cel or null per layer, a cel { x, y, w, h, opacity, rgba } (decoding
// resolves linked cels; encoding takes { link: frame } for one), tags [{ from, to, name }], palette [[r, g, b, a]].
import { deflateSync, inflateSync } from 'node:zlib';

export const BLEND = { normal: 0, addition: 16 };
const LAYER = 0x2004, CEL = 0x2005, TAGS = 0x2018, PALETTE = 0x2019, USER_DATA = 0x2020;

const str = s => {
  const b = Buffer.from(s, 'utf8'), out = Buffer.alloc(2 + b.length);
  out.writeUInt16LE(b.length);
  b.copy(out, 2);
  return out;
};

function chunk(type, ...parts) {
  const data = Buffer.concat(parts), head = Buffer.alloc(6);
  head.writeUInt32LE(6 + data.length);
  head.writeUInt16LE(type, 4);
  return Buffer.concat([head, data]);
}

function layerChunk({ name, blend = 0, opacity = 255, flags = 3 }) {
  const b = Buffer.alloc(16); // flags (3: visible, editable), type 0 (image), child level 0, size 0 x 0, blend, opacity
  b.writeUInt16LE(flags);
  b.writeUInt16LE(blend, 10);
  b[12] = opacity;
  return chunk(LAYER, b, str(name));
}

function celChunk(layer, cel) {
  const b = Buffer.alloc(16);
  b.writeUInt16LE(layer);
  b.writeInt16LE(cel.x ?? 0, 2);
  b.writeInt16LE(cel.y ?? 0, 4);
  b[6] = cel.opacity ?? 255;
  if (cel.link !== undefined) {
    b.writeUInt16LE(1, 7);
    const link = Buffer.alloc(2);
    link.writeUInt16LE(cel.link);
    return chunk(CEL, b, link);
  }
  b.writeUInt16LE(2, 7); // compressed image
  const size = Buffer.alloc(4);
  size.writeUInt16LE(cel.w);
  size.writeUInt16LE(cel.h, 2);
  return chunk(CEL, b, size, deflateSync(cel.rgba));
}

/** Encodes a sprite (see the top of this file) as an .aseprite file. Empty cels (all zero) are left out. */
export function encodeAseprite({ w, h, layers, frames, tags = [], palette = [] }) {
  const first = [];
  if (palette.length) {
    const head = Buffer.alloc(20);
    head.writeUInt32LE(palette.length);
    head.writeUInt32LE(palette.length - 1, 8);
    first.push(chunk(PALETTE, head, ...palette.map(([r, g, b, a = 255]) => Buffer.from([0, 0, r, g, b, a]))));
  }
  for (const layer of layers) {
    first.push(layerChunk(layer));
    if (layer.userData !== undefined) first.push(chunk(USER_DATA, Buffer.from([1, 0, 0, 0]), str(layer.userData)));
  }
  if (tags.length) {
    const head = Buffer.alloc(10);
    head.writeUInt16LE(tags.length);
    first.push(chunk(TAGS, head, ...tags.map(t => {
      const b = Buffer.alloc(17); // from, to, direction 0 (forward), repeat 0, reserved, color, extra
      b.writeUInt16LE(t.from);
      b.writeUInt16LE(t.to, 2);
      return Buffer.concat([b, str(t.name)]);
    })));
  }
  const body = frames.map((f, i) => {
    const chunks = [...(i ? [] : first), ...f.cels.flatMap((cel, l) => (cel && (cel.link !== undefined || cel.rgba.some(v => v)) ? [celChunk(l, cel)] : []))];
    const head = Buffer.alloc(16);
    head.writeUInt32LE(16 + chunks.reduce((n, c) => n + c.length, 0));
    head.writeUInt16LE(0xf1fa, 4);
    head.writeUInt16LE(Math.min(chunks.length, 0xffff), 6);
    head.writeUInt16LE(f.duration, 8);
    head.writeUInt32LE(chunks.length, 12);
    return Buffer.concat([head, ...chunks]);
  });
  const head = Buffer.alloc(128);
  head.writeUInt16LE(0xa5e0, 4);
  head.writeUInt16LE(frames.length, 6);
  head.writeUInt16LE(w, 8);
  head.writeUInt16LE(h, 10);
  head.writeUInt16LE(32, 12); // RGBA
  head.writeUInt32LE(1, 14); // layer opacity is valid
  head.writeUInt16LE(frames[0]?.duration ?? 100, 18);
  head.writeUInt16LE(palette.length, 32);
  head[34] = head[35] = 1; // square pixels
  head.writeUInt16LE(16, 40); // Aseprite's default grid
  head.writeUInt16LE(16, 42);
  const out = Buffer.concat([head, ...body]);
  out.writeUInt32LE(out.length);
  return out;
}

/** Decodes an RGBA .aseprite file to a sprite (see the top of this file); tilemaps and other color modes throw. */
export function decodeAseprite(buf) {
  if (buf.length < 128 || buf.readUInt16LE(4) !== 0xa5e0) throw new Error('decodeAseprite: not an .aseprite file');
  const depth = buf.readUInt16LE(12), opacityValid = buf.readUInt32LE(14) & 1;
  if (depth !== 32) throw new Error(`decodeAseprite: the sprite is ${depth === 8 ? 'indexed' : 'grayscale'}; set Sprite > Color Mode > RGB Color and save again`);
  const sprite = { w: buf.readUInt16LE(8), h: buf.readUInt16LE(10), layers: [], frames: [], tags: [], palette: [] };
  let at = 128;
  for (let i = 0, n = buf.readUInt16LE(6); i < n; i++) {
    const end = at + buf.readUInt32LE(at), count = buf.readUInt32LE(at + 12) || buf.readUInt16LE(at + 6);
    const frame = { duration: buf.readUInt16LE(at + 8), cels: [] };
    sprite.frames.push(frame);
    let owner = null; // the layer a user data chunk right after it belongs to
    at += 16;
    for (let c = 0; c < count; c++) {
      const size = buf.readUInt32LE(at), type = buf.readUInt16LE(at + 4), d = at + 6;
      const text = o => buf.toString('utf8', o + 2, o + 2 + buf.readUInt16LE(o));
      if (type === LAYER) {
        owner = {
          flags: buf.readUInt16LE(d), type: buf.readUInt16LE(d + 2), blend: buf.readUInt16LE(d + 10),
          opacity: opacityValid ? buf[d + 12] : 255, name: text(d + 16),
        };
        sprite.layers.push(owner);
      } else if (type === USER_DATA && owner) {
        if (buf.readUInt32LE(d) & 1) owner.userData = text(d + 4);
        owner = null;
      } else {
        owner = null;
        if (type === CEL) {
          const layer = buf.readUInt16LE(d), kind = buf.readUInt16LE(d + 7);
          if (kind === 1) frame.cels[layer] = sprite.frames[buf.readUInt16LE(d + 16)]?.cels[layer] ?? null;
          else if (kind === 0 || kind === 2) {
            const w = buf.readUInt16LE(d + 16), h = buf.readUInt16LE(d + 18), px = buf.subarray(d + 20, at + size);
            frame.cels[layer] = {
              x: buf.readInt16LE(d + 2), y: buf.readInt16LE(d + 4), w, h, opacity: buf[d + 6],
              rgba: new Uint8Array(kind === 2 ? inflateSync(px) : px).subarray(0, w * h * 4),
            };
          } else throw new Error(`decodeAseprite: layer ${layer} is a tilemap; convert it to a normal layer`);
        } else if (type === TAGS) {
          for (let t = 0, o = d + 10, n = buf.readUInt16LE(d); t < n; t++, o += 19 + buf.readUInt16LE(o + 17)) {
            sprite.tags.push({ from: buf.readUInt16LE(o), to: buf.readUInt16LE(o + 2), name: text(o + 17) });
          }
        } else if (type === PALETTE) {
          for (let k = buf.readUInt32LE(d + 4), o = d + 20; k <= buf.readUInt32LE(d + 8); k++) {
            sprite.palette[k] = [...buf.subarray(o + 2, o + 6)];
            o += 6 + (buf.readUInt16LE(o) & 1 ? 2 + buf.readUInt16LE(o + 6) : 0);
          }
        }
      }
      at += size;
    }
    at = end;
  }
  for (const f of sprite.frames) for (let l = 0; l < sprite.layers.length; l++) f.cels[l] ??= null;
  return sprite;
}
