// PNG encoder and decoder for 8-bit RGBA images, on node:zlib.
import { deflateSync, inflateSync } from 'node:zlib';

const SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'latin1');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

/** Encodes `rgba` (w * h * 4 bytes, row-major, straight alpha) as a PNG file. */
export function encodePng(w, h, rgba) {
  if (rgba.length !== w * h * 4) throw new Error(`encodePng: expected ${w * h * 4} bytes, got ${rgba.length}`);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr.set([8, 6, 0, 0, 0], 8); // 8-bit, RGBA, deflate, no filter method, no interlace
  const raw = Buffer.alloc(h * (w * 4 + 1)); // each row: filter type 0, then the pixels
  for (let y = 0; y < h; y++) raw.set(rgba.subarray(y * w * 4, (y + 1) * w * 4), y * (w * 4 + 1) + 1);
  return Buffer.concat([SIG, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

/** Decodes a PNG written by encodePng to `{ w, h, rgba }`. */
// shortcut: reads only 8-bit RGBA, unfiltered, non-interlaced (what encodePng writes); upgrade to read other tools' PNGs.
export function decodePng(buf) {
  if (!SIG.equals(buf.subarray(0, 8))) throw new Error('decodePng: not a PNG');
  let w = 0, h = 0;
  const idat = [];
  for (let at = 8; at < buf.length;) {
    const len = buf.readUInt32BE(at);
    const type = buf.toString('latin1', at + 4, at + 8);
    const data = buf.subarray(at + 8, at + 8 + len);
    if (crc32(buf.subarray(at + 4, at + 8 + len)) !== buf.readUInt32BE(at + 8 + len)) throw new Error(`decodePng: bad CRC in ${type}`);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      if (data[8] !== 8 || data[9] !== 6 || data[12] !== 0) throw new Error('decodePng: only 8-bit RGBA, non-interlaced');
    } else if (type === 'IDAT') idat.push(data);
    at += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const rgba = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    const row = y * (w * 4 + 1);
    if (raw[row] !== 0) throw new Error(`decodePng: row ${y} uses filter ${raw[row]}, only 0 is supported`);
    rgba.set(raw.subarray(row + 1, row + 1 + w * 4), y * w * 4);
  }
  return { w, h, rgba };
}
