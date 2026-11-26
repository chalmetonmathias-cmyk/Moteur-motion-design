import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseStoryboard, parseStoryboardText } from '../src/parser/parser.ts';

const minimal = () => ({
  meta: { width: 1080, height: 1920, fps: 60 },
  theme: { palette: { primary: '#4f9cff', accent: '#ff5e8a', text: '#ffffff' } },
  scenes: [
    {
      id: 'intro',
      duration: 5,
      transitionOut: { type: 'fade', duration: 0.3 },
      layers: [
        {
          id: 'title',
          type: 'text',
          content: 'Bienvenue',
          font: 'Space Grotesk',
          size: 120,
          anchor: { x: 540, y: 960 },
          keyframes: [
            { t: 0, opacity: 0, y: 40, scale: 0.9 },
            { t: 0.6, opacity: 1, y: 0, scale: 1, easing: 'spring' },
          ],
        },
      ],
    },
    { id: 'outro', duration: 3, layers: [] },
  ],
});

test("l'exemple du cahier des charges est valide", () => {
  const r = parseStoryboard(minimal());
  assert.equal(r.ok, true, JSON.stringify(!r.ok && r.errors));
  if (!r.ok) return;
  const [a, b] = r.storyboard.scenes;
  assert.equal(a!.start, 0);
  // Chaînage auto : la 2e scène chevauche la transition de sortie de la 1re.
  assert.equal(b!.start, 4.7);
  assert.equal(r.storyboard.meta.duration, 7.7);
  assert.deepEqual(r.storyboard.fontFaces.map((f) => f.family), ['Space Grotesk']);
});

test('erreurs avec chemin JSON exact + suggestion', () => {
  const sb = minimal();
  const layer = sb.scenes[0]!.layers[0]! as Record<string, unknown>;
  (layer.keyframes as Record<string, unknown>[])[1]!.easing = 'sprng';
  layer.color = '$acent';
  layer.size = '120px';
  const r = parseStoryboard(sb);
  assert.equal(r.ok, false);
  if (r.ok) return;
  const byPath = Object.fromEntries(r.errors.map((e) => [e.path, e.message]));
  assert.match(byPath['scenes[0].layers[0].keyframes[1].easing']!, /Vouliez-vous dire « spring »/);
  assert.match(byPath['scenes[0].layers[0].color']!, /Vouliez-vous dire « accent »/);
  assert.match(byPath['scenes[0].layers[0].size']!, /doit être un nombre/);
});

test('clés inconnues → avertissement avec suggestion', () => {
  const sb = minimal();
  (sb.scenes[0]!.layers[0] as Record<string, unknown>).wieght = 800;
  const r = parseStoryboard(sb);
  assert.equal(r.ok, true);
  assert.ok(r.warnings.some((w) => w.path === 'scenes[0].layers[0].wieght' && /« weight »/.test(w.message)));
});

test('JSON invalide → ligne et colonne', () => {
  const r = parseStoryboardText('{\n  "meta": {,\n}');
  assert.equal(r.ok, false);
  if (r.ok) return;
  assert.match(r.errors[0]!.message, /ligne 2/);
});

test('tracé SVG invalide → message précis', () => {
  const sb = minimal();
  sb.scenes[1]!.layers.push({ type: 'path', d: 'M0,0 L10,10 X5' } as never);
  const r = parseStoryboard(sb);
  assert.equal(r.ok, false);
  if (r.ok) return;
  assert.equal(r.errors[0]!.path, 'scenes[1].layers[0].d');
  assert.match(r.errors[0]!.message, /commande inconnue « X »/);
});

test('composant inconnu → suggestion', () => {
  const sb = minimal();
  sb.scenes[1]!.layers.push({ type: 'component', ref: 'title-crad' } as never);
  const r = parseStoryboard(sb);
  assert.equal(r.ok, false);
  if (r.ok) return;
  assert.match(r.errors[0]!.message, /Vouliez-vous dire « title-card »/);
});

test('références de palette avec alpha et gradients', () => {
  const sb = minimal();
  sb.scenes[1]!.layers.push({
    type: 'path',
    shape: { type: 'rect', x: 0, y: 0, width: 1080, height: 1920 },
    fill: { type: 'gradient', stops: [['$primary/50', 0], ['#1a1a2e', 1]] },
  } as never);
  const r = parseStoryboard(sb);
  assert.equal(r.ok, true);
  if (!r.ok) return;
  const p = r.storyboard.scenes[1]!.layers[0]!;
  assert.equal(p.type, 'path');
  if (p.type !== 'path' || p.fill.kind !== 'linear') return assert.fail('gradient attendu');
  assert.equal(p.fill.stops[0]!.color.a, 0.5);
  assert.equal(p.fill.angle, 180);
});

test('composant captions : morceaux mot à mot, minutage croissant, surlignage conservé', async () => {
  const { timeWords } = await import('../src/components/captions.ts');
  const words = timeWords('Un masque… de *velours noir*. Fin.', 4);
  assert.equal(words[0]!.t, 0);
  assert.ok(words.every((w, i) => i === 0 || w.t > words[i - 1]!.t));
  assert.ok(words.at(-1)!.t < 4);
  assert.deepEqual(words.filter((w) => w.highlight).map((w) => w.word), ['velours', 'noir.']);

  const sb = minimal();
  sb.scenes[1]!.layers.push({ type: 'component', ref: 'captions', start: 1, props: { text: 'Un masque… de *velours noir*. Fin.', duration: 4 } } as never);
  const r = parseStoryboard(sb);
  assert.ok(r.ok, JSON.stringify(!r.ok && r.errors));
  if (!r.ok) return;
  const group = r.storyboard.scenes[1]!.layers[0]!;
  assert.equal(group.type, 'group');
  if (group.type !== 'group') return;
  assert.equal(group.layers.length, 3); // « Un masque… » · « de velours noir. » · « Fin. »
  assert.ok(group.layers.every((l, i) => i === 0 || l.start > group.layers[i - 1]!.start));
});

test('composant stamp : valide, props inconnues signalées', () => {
  const sb = minimal();
  sb.scenes[1]!.layers.push({ type: 'component', ref: 'stamp', props: { text: 'Légende', color: '$accent', rotate: -12, taille: 3 } } as never);
  const r = parseStoryboard(sb);
  assert.ok(r.ok);
  assert.ok(r.warnings.some((w) => w.path.endsWith('props.taille')));
});
