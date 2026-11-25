/**
 * Point d'entrée : branche le parser, le moteur et le player.
 *
 *   texte JSON ──parse──▶ Storyboard ──assets──▶ Renderer ◀── PlayerControls (rAF)
 *                                                   ▲
 *                                                   └── Exporter (frame par frame)
 */
import './style.css';
import { parseStoryboardText } from './parser/parser.ts';
import { loadAssets } from './engine/assets.ts';
import { Renderer } from './engine/renderer.ts';
import { PlayerControls, type Diagnostic } from './player/controls.ts';
import type { Storyboard } from './types/storyboard.ts';

const DEFAULT_EXAMPLE = 'short-01-hook';

/** Exemples embarqués (texte brut, pour passer par le même parser que les fichiers utilisateur). */
const examples = import.meta.glob<string>('./examples/*.json', { query: '?raw', import: 'default' });
const exampleName = (path: string) => path.replace(/^.*\//, '').replace(/\.json$/, '');

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const renderer = new Renderer(canvas);
renderer.perfWarnings = import.meta.env.DEV;
const controls = new PlayerControls(renderer);

let current: Storyboard | undefined;
let loadToken = 0;

/**
 * Charge un storyboard depuis du texte JSON. En cas d'erreur, le storyboard
 * courant reste affiché et les erreurs (avec chemin JSON) sont listées.
 */
async function loadText(text: string, sourceName: string): Promise<boolean> {
  const token = ++loadToken;
  const result = parseStoryboardText(text);
  if (!result.ok) {
    controls.showDiagnostics([...result.errors, ...result.warnings], sourceName);
    controls.toast(`« ${sourceName} » contient ${result.errors.length} erreur(s) — voir Diagnostics.`, 'error', 6000);
    return false;
  }
  controls.setLoading(true, 'Chargement des polices et des images…');
  const assets = await loadAssets(result.storyboard.fontFaces, result.storyboard.images);
  if (token !== loadToken) return false; // un autre chargement a pris la main
  controls.setLoading(false);

  const diagnostics: Diagnostic[] = [
    ...result.warnings.map((w) => ({ ...w, source: 'parser' as const })),
    ...assets.problems.map((message) => ({ path: 'assets', message, severity: 'warning' as const, source: 'assets' as const })),
  ];
  current = result.storyboard;
  renderer.load(result.storyboard, assets);
  controls.setStoryboard(result.storyboard, diagnostics);
  document.title = `${result.storyboard.meta.title} · Motion Engine`;
  return true;
}

async function loadExample(name: string): Promise<boolean> {
  const entry = Object.entries(examples).find(([p]) => exampleName(p) === name);
  if (!entry) return false;
  const text = await entry[1]();
  return loadText(text, `${name}.json`);
}

/* ─────────────── Sélecteur d'exemples ─────────────── */

const select = document.getElementById('example-select') as HTMLSelectElement;
const names = Object.keys(examples).map(exampleName).sort();
const groups: [string, string[]][] = [
  ['Courts (≤ 45 s)', names.filter((n) => n.startsWith('short-'))],
  ['Longs (≥ 60 s)', names.filter((n) => n.startsWith('long-'))],
  ['Autres', names.filter((n) => !n.startsWith('short-') && !n.startsWith('long-'))],
];
for (const [label, list] of groups) {
  if (list.length === 0) continue;
  const og = document.createElement('optgroup');
  og.label = label;
  for (const n of list) og.append(new Option(n, n));
  select.append(og);
}
const custom = new Option('— fichier importé —', '__custom', false, false);
custom.disabled = true;
select.append(custom);
select.addEventListener('change', () => {
  if (select.value !== '__custom') void loadExample(select.value);
});

/* ─────────────── Fichier local : input + glisser-déposer ─────────────── */

async function loadFile(file: File): Promise<void> {
  if (!/\.json$/i.test(file.name) && file.type !== 'application/json') {
    controls.toast(`« ${file.name} » n'est pas un fichier .json`, 'error');
    return;
  }
  const ok = await loadText(await file.text(), file.name);
  if (ok) {
    custom.textContent = `📄 ${file.name}`;
    select.value = '__custom';
    controls.toast(`« ${file.name} » chargé.`, 'success');
  }
}

const input = document.getElementById('file-input') as HTMLInputElement;
input.addEventListener('change', () => {
  const f = input.files?.[0];
  if (f) void loadFile(f);
  input.value = '';
});

const dropzone = document.getElementById('dropzone') as HTMLDivElement;
let dragDepth = 0;
window.addEventListener('dragenter', (e) => {
  if (!e.dataTransfer?.types.includes('Files') || controls.isExporting) return;
  dragDepth++;
  dropzone.hidden = false;
});
window.addEventListener('dragleave', () => {
  dragDepth = Math.max(0, dragDepth - 1);
  if (dragDepth === 0) dropzone.hidden = true;
});
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => {
  e.preventDefault();
  dragDepth = 0;
  dropzone.hidden = true;
  const f = e.dataTransfer?.files[0];
  if (f && !controls.isExporting) void loadFile(f);
});

/* ─────────────── API de scripting (console, tests automatisés) ─────────────── */

declare global {
  interface Window {
    motionEngine: {
      loadText: (text: string, name?: string) => Promise<boolean>;
      loadExample: (name: string) => Promise<boolean>;
      renderAt: (t: number) => number;
      storyboard: () => Storyboard | undefined;
      exportVideo: () => Promise<void>;
      examples: string[];
    };
  }
}

window.motionEngine = {
  loadText: (text, name = 'script.json') => loadText(text, name),
  loadExample,
  renderAt: (t) => {
    controls.currentTimeline?.pause();
    controls.currentTimeline?.seekMs(t * 1000);
    return renderer.renderFrame(controls.currentTimeline?.time ?? t);
  },
  storyboard: () => current,
  exportVideo: () => controls.runExport(),
  examples: names,
};

/* ─────────────── Démarrage ─────────────── */

const fromUrl = new URLSearchParams(location.search).get('example');
const initial = fromUrl && names.includes(fromUrl) ? fromUrl : names.includes(DEFAULT_EXAMPLE) ? DEFAULT_EXAMPLE : names[0];
if (initial) {
  select.value = initial;
  void loadExample(initial);
} else {
  controls.showDiagnostics([]);
  controls.toast('Aucun exemple embarqué : glissez un storyboard.json.');
}
