/**
 * Vérifie automatiquement le cahier des charges des 9 exemples :
 * durées (A ≤ 45 s, B ≥ 60 s), ≥ 2 composants, tous les types de calques,
 * toutes les familles d'easing, format TikTok, assets présents, zéro avertissement.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseStoryboard } from '../src/parser/parser.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'src', 'examples');
const files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort();

/** Parcourt tout le JSON brut et appelle `visit` sur chaque objet. */
function walk(v: unknown, visit: (o: Record<string, unknown>) => void): void {
  if (Array.isArray(v)) v.forEach((x) => walk(x, visit));
  else if (v && typeof v === 'object') {
    visit(v as Record<string, unknown>);
    Object.values(v).forEach((x) => walk(x, visit));
  }
}

const EASING_FAMILIES: [string, (e: string) => boolean][] = [
  ['linear', (e) => e === 'linear'],
  ['ease-in', (e) => e === 'ease-in'],
  ['ease-out', (e) => e === 'ease-out'],
  ['ease-in-out', (e) => e === 'ease-in-out'],
  ['cubic-bezier', (e) => e.startsWith('cubic-bezier(')],
  ['spring', (e) => e.startsWith('spring')],
  ['elastic', (e) => e.startsWith('elastic')],
  ['back', (e) => e.startsWith('back')],
];

test('9 exemples présents (3 courts + 6 longs)', () => {
  assert.equal(files.filter((f) => f.startsWith('short-')).length, 3);
  assert.equal(files.filter((f) => f.startsWith('long-')).length, 6);
});

for (const file of files) {
  test(`exemple ${file}`, () => {
    const raw = JSON.parse(readFileSync(join(dir, file), 'utf8')) as Record<string, unknown>;
    const r = parseStoryboard(raw);
    assert.ok(r.ok, `parsing : ${!r.ok ? JSON.stringify(r.errors.slice(0, 3)) : ''}`);
    if (!r.ok) return;
    assert.deepEqual(r.warnings, [], 'aucun avertissement attendu');

    const { meta } = r.storyboard;
    assert.equal(meta.width, 1080);
    assert.equal(meta.height, 1920);
    assert.equal(meta.fps, 60);
    assert.equal(meta.safeArea.top, 220);
    assert.equal(meta.safeArea.bottom, 320);

    // Contraintes de durée STRICTES (temps de timeline).
    if (file.startsWith('short-')) {
      assert.ok(meta.duration <= 45, `${file} : ${meta.duration} s > 45 s`);
      assert.ok(meta.duration >= 30, `${file} : ${meta.duration} s < 30 s`);
    } else {
      assert.ok(meta.duration >= 60, `${file} : ${meta.duration} s < 60 s`);
      assert.ok(meta.duration <= 75, `${file} : ${meta.duration} s > 75 s (cible 60–75 s)`);
    }

    // Couverture : types de calques, composants, easings (JSON écrit par l'auteur).
    const types = new Set<string>();
    const components = new Set<string>();
    const easings = new Set<string>();
    walk(raw, (o) => {
      if (typeof o.type === 'string' && ['text', 'path', 'image', 'group', 'component'].includes(o.type) && ('id' in o || 'ref' in o || 'layers' in o || 'content' in o || 'src' in o)) types.add(o.type);
      if (o.type === 'component' && typeof o.ref === 'string') components.add(o.ref);
      if (typeof o.easing === 'string') easings.add(o.easing.replace(/\s+/g, ''));
    });
    for (const t of ['text', 'path', 'image', 'group', 'component']) assert.ok(types.has(t), `${file} : type de calque « ${t} » absent`);
    assert.ok(components.size >= 2, `${file} : ${components.size} composant(s) seulement`);
    for (const [family, match] of EASING_FAMILIES) assert.ok([...easings].some(match), `${file} : easing « ${family} » absent`);

    // Assets : fichiers présents dans public/.
    for (const url of r.storyboard.images) assert.ok(existsSync(join(root, 'public', url.replace(/^\.\//, ''))), `${file} : asset manquant ${url}`);
  });
}
