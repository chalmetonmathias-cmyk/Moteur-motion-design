import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EASING_NAMES, parseEasing } from '../src/engine/easing.ts';
import { compileTracks, sampleNumber, sampleShape } from '../src/engine/keyframe.ts';
import { Timeline } from '../src/engine/timeline.ts';
import { parsePath, prepareMorph, shapeBounds, shapeLength, shapeToD } from '../src/engine/path.ts';
import type { Keyframe } from '../src/types/storyboard.ts';

const close = (a: number, b: number, eps = 1e-3) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);

test('tous les easings valent 0 en 0 et 1 en 1', () => {
  const specs = [...EASING_NAMES, 'cubic-bezier(0.16,1,0.3,1)', 'spring(300,10)', 'elastic(1.2,0.4)', 'back(2.5)', 'steps(4)'];
  for (const s of specs) {
    const r = parseEasing(s);
    assert.ok(r.ok, s);
    if (!r.ok) continue;
    close(r.fn(0), 0);
    close(r.fn(1), 1);
  }
});

test('spring / elastic / back dépassent la cible (overshoot)', () => {
  for (const s of ['spring', 'elastic', 'back']) {
    const r = parseEasing(s);
    assert.ok(r.ok);
    if (!r.ok) continue;
    let max = 0;
    for (let p = 0; p <= 1; p += 0.01) max = Math.max(max, r.fn(p));
    assert.ok(max > 1.02, `${s} max=${max}`);
  }
});

test('cubic-bezier : ease-in-out symétrique', () => {
  const r = parseEasing('ease-in-out');
  assert.ok(r.ok);
  if (r.ok) close(r.fn(0.5), 0.5);
});

test('easings invalides', () => {
  assert.equal(parseEasing('cubic-bezier(2,0,0,1)').ok, false);
  assert.equal(parseEasing('spring(-1)').ok, false);
  assert.equal(parseEasing('wobble').ok, false);
});

test('pistes éparses + easing de la clé d’arrivée + hold', () => {
  const kfs: Keyframe[] = [
    { t: 0, easing: 'linear', numbers: { opacity: 0, y: 40 }, paints: {} },
    { t: 1, easing: 'linear', numbers: { opacity: 1 }, paints: {} },
    { t: 2, easing: 'ease-in', numbers: { y: 0 }, paints: {} },
  ];
  const tr = compileTracks(kfs);
  close(sampleNumber(tr.numbers.opacity!, 0.5), 0.5);
  close(sampleNumber(tr.numbers.opacity!, 5), 1); // hold après la fin
  close(sampleNumber(tr.numbers.y!, -1), 40); // hold avant le début
  // y n'a que 2 clés (0 et 2) : à t=1, ease-in(0.5) < 0.5 → y > 20
  assert.ok(sampleNumber(tr.numbers.y!, 1) > 20);
});

test('timeline : temps quantifié à la frame et déterministe', () => {
  const tl = new Timeline(10, 60);
  assert.equal(tl.totalFrames, 600);
  tl.play(1000);
  tl.update(1000 + 1234.5);
  assert.equal(tl.frame, 74);
  close(tl.time, 74 / 60, 1e-9);
  tl.seekFrame(599);
  assert.equal(tl.frame, 599);
  tl.loop = false;
  tl.play(0);
  tl.update(100_000);
  assert.equal(tl.isPlaying, false);
  assert.equal(tl.frame, 599);
});

test('path : parsing complet (relatif, arcs, raccourcis)', () => {
  const s = parsePath('m10 10 h 80 v80 h-80 z M 200,200 a50 50 0 1 0 100 0 a50 50 0 1 0 -100 0z q10-20 20 0 t20 0');
  assert.equal(s.length, 3);
  const b = shapeBounds([s[0]!]);
  assert.deepEqual([b.x, b.y, b.width, b.height].map((n) => Math.round(n)), [10, 10, 80, 80]);
  const circle = shapeBounds([s[1]!]);
  close(circle.width, 100, 0.01);
  close(circle.height, 100, 0.01);
  close(shapeLength(parsePath(shapeToD({ type: 'circle', cx: 0, cy: 0, r: 100 }))), 2 * Math.PI * 100, 0.5);
});

test('morphing : formes appariées (même nombre de segments)', () => {
  const a = parsePath(shapeToD({ type: 'circle', cx: 0, cy: 0, r: 100 }));
  const b = parsePath(shapeToD({ type: 'star', cx: 0, cy: 0, points: 5, outer: 120, inner: 50 }));
  const [A, B] = prepareMorph(a, b);
  assert.equal(A[0]!.segs.length, B[0]!.segs.length);
  const tr = compileTracks([
    { t: 0, easing: 'linear', numbers: {}, paints: {}, d: shapeToD({ type: 'circle', cx: 0, cy: 0, r: 100 }) },
    { t: 1, easing: 'linear', numbers: {}, paints: {}, d: shapeToD({ type: 'star', cx: 0, cy: 0, points: 5, outer: 120, inner: 50 }) },
  ]);
  const mid = sampleShape(tr.d!, 0.5);
  assert.ok('shape' in mid);
  assert.deepEqual(sampleShape(tr.d!, 1), { key: 1 });
});
