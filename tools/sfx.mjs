// node tools/sfx.mjs <id | category | glob>... [--seed N]
// Writes records/<id>/<name>.wav, the effect's sound from frame 0 (mono 16-bit PCM, 22050 Hz), with its length, peak
// and loudness, so a sound can be judged without listening. Effects without sound are listed as silent.
import { parseArgs } from 'node:util';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { SAMPLE_RATE, synth } from '../src/core/index.js';
import { ROOT, matchIds, loadEffect } from './lib.mjs';

/** A mono 16-bit PCM WAV of `samples` (-1 to 1). A loop gets a smpl chunk looping the whole sound: Godot's default
 * import (loop mode "Detect From WAV") reads it. */
export function encodeWav(samples, loop = false) {
  const n = samples.length, size = 2 * n, smpl = loop ? 68 : 0, b = Buffer.alloc(44 + size + smpl);
  b.write('RIFF', 0);
  b.writeUInt32LE(36 + size + smpl, 4);
  b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16);
  [1, 1].forEach((v, i) => b.writeUInt16LE(v, 20 + 2 * i)); // PCM, mono
  b.writeUInt32LE(SAMPLE_RATE, 24);
  b.writeUInt32LE(SAMPLE_RATE * 2, 28); // bytes per second
  [2, 16].forEach((v, i) => b.writeUInt16LE(v, 32 + 2 * i)); // bytes per frame, bits per sample
  b.write('data', 36);
  b.writeUInt32LE(size, 40);
  samples.forEach((s, i) => b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), 44 + 2 * i));
  if (loop) {
    b.write('smpl', 44 + size);
    // Chunk size, the sampler header (sample period in ns, MIDI note 60, one loop), then the loop: forward, every sample.
    [60, 0, 0, Math.round(1e9 / SAMPLE_RATE), 60, 0, 0, 0, 1, 0, 0, 0, 0, n - 1, 0, 0].forEach((v, i) => b.writeUInt32LE(v, 48 + size + 4 * i));
  }
  return b;
}

/** Length, peak and RMS of samples, for a line of output. */
export function describe(samples) {
  const peak = samples.reduce((m, v) => Math.max(m, Math.abs(v)), 0), rms = Math.sqrt(samples.reduce((s, v) => s + v * v, 0) / samples.length);
  const db = v => `${(20 * Math.log10(v || 1e-9)).toFixed(1)} dB`;
  return `${(samples.length / SAMPLE_RATE).toFixed(3)} s, peak ${db(peak)}, rms ${db(rms)}`;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { values: a, positionals } = parseArgs({ allowPositionals: true, options: { seed: { type: 'string' } } });
  if (!positionals.length) {
    console.error('usage: node tools/sfx.mjs <id | category | glob>... [--seed N]');
    process.exit(1);
  }
  for (const id of matchIds(positionals)) {
    const { meta } = await loadEffect(id), samples = synth(meta, a.seed ? Number(a.seed) : undefined);
    if (!samples) {
      console.log(`${id}: silent`);
      continue;
    }
    const dir = join(ROOT, 'records', id), file = join(dir, `${id.split('/').pop()}.wav`);
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, encodeWav(samples, meta.loop));
    console.log(`${file}  ${describe(samples)}`);
  }
}
