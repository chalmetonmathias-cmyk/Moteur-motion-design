import { test } from 'node:test';
import assert from 'node:assert/strict';
import { patchWebmHead, retimeWebm } from '../src/player/exporter.ts';

/** Construit un WebM minimal "façon MediaRecorder" (Segment et Cluster de taille inconnue). */
function fakeWebm(blockTimes: number[]): Uint8Array {
  const UNKNOWN = [0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff];
  const bytes: number[] = [];
  bytes.push(0x1a, 0x45, 0xdf, 0xa3, 0x87, 0x42, 0x82, 0x84, ...Buffer.from('webm')); // EBML > DocType
  bytes.push(0x18, 0x53, 0x80, 0x67, ...UNKNOWN); // Segment
  bytes.push(0x15, 0x49, 0xa9, 0x66, 0x87, 0x2a, 0xd7, 0xb1, 0x83, 0x0f, 0x42, 0x40); // Info > TimecodeScale = 1e6
  bytes.push(0x1f, 0x43, 0xb6, 0x75, ...UNKNOWN); // Cluster
  bytes.push(0xe7, 0x82, 0x00, 0x00); // Timecode = 0 (2 octets)
  for (const t of blockTimes) bytes.push(0xa3, 0x86, 0x81, (t >> 8) & 0xff, t & 0xff, 0x80, 0xaa, 0xbb);
  return Uint8Array.from(bytes);
}

function readTimes(buf: Uint8Array): number[] {
  const out: number[] = [];
  for (let i = 0; i < buf.length - 3; i++) if (buf[i] === 0xa3 && buf[i + 1] === 0x86 && buf[i + 2] === 0x81) out.push((buf[i + 3]! << 8) | buf[i + 4]!);
  return out;
}

test('retiming : horodatages réalignés sur la grille 1/fps, pré-roll et pertes gérés', () => {
  const fps = 60;
  const slot = 2000 / fps; // mode "sûr" ×2
  const start = 5000; // horloge murale au démarrage
  const emitted = Float64Array.from({ length: 10 }, (_, i) => start + 120 + i * slot);
  // Capture : pré-roll à 0, puis frames avec gigue (0..12 ms) ; frame 6 perdue.
  const jitter = [3, 11, 0, 7, 12, 2, 0, 9, 4, 6];
  const captured = [0, ...[...emitted.keys()].filter((i) => i !== 6).map((i) => Math.round(emitted[i]! - start + jitter[i]!))];
  const buf = fakeWebm(captured);
  const r = retimeWebm(buf, emitted, fps, start);
  assert.ok(r);
  assert.equal(r.dropped, 1);
  const expected = [0, 1, 17, 33, 50, 67, 83, 117, 133, 150]; // frame 0 en double (+1 ms), frame 6 absente
  assert.deepEqual(readTimes(buf), expected);
});

test('durée WebM injectée dans Info', () => {
  const head = fakeWebm([0, 17, 33]);
  const patched = patchWebmHead(head, 1234);
  assert.ok(patched);
  const i = [...patched].findIndex((b, k) => b === 0x44 && patched[k + 1] === 0x89);
  assert.ok(i > 0);
  assert.equal(new DataView(patched.buffer).getFloat64(i + 3), 1234);
});
