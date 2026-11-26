/**
 * Génère les fichiers d'un épisode de L'Énigme Vraie :
 *
 *   node --experimental-strip-types chaines/lenigme-vraie/build.ts 11_masque-de-fer
 *
 * Sortie dans chaines/lenigme-vraie/sortie/<épisode>/ :
 *   storyboard.json  → à rendre avec le moteur (scripts/render.mjs)
 *   narration.json   → segments minutés (voix : audio/ajouter_voix.py)
 *   cues.json        → repères pour la musique et les bruitages (audio/musique.py)
 *   fiche.md         → titre, script, description, hashtags, commentaire épinglé, sources
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseStoryboard } from '../../src/parser/parser.ts';
import type { StoryboardInput } from '../../src/types/storyboard.ts';
import type { Segment } from './charte.ts';

interface EpisodeModule {
  ID: string;
  TOTAL: number;
  fiche(): string;
  applyVoice?(alignement: unknown): void;
  build(): { storyboard: StoryboardInput; narration: Segment[]; cues: { t: number; type: string }[] };
}

const here = dirname(fileURLToPath(import.meta.url));
const id = process.argv[2] ?? '11_masque-de-fer';
const mod = (await import(pathToFileURL(join(here, 'episodes', `${id}.ts`)).href)) as EpisodeModule;
// Voix déjà générée (voix_elevenlabs.py) → l'épisode se recale sur ses vrais instants.
const alignPath = join(here, 'sortie', id, 'voix', 'alignement.json');
if (existsSync(alignPath) && mod.applyVoice) {
  mod.applyVoice(JSON.parse(readFileSync(alignPath, 'utf8')));
  console.log('↻ minutage recalé sur la voix (voix/alignement.json)');
}
const { storyboard, narration, cues } = mod.build();

const parsed = parseStoryboard(JSON.parse(JSON.stringify(storyboard)));
if (!parsed.ok) {
  for (const e of parsed.errors) console.error(`✗ ${e.path} : ${e.message}`);
  process.exit(1);
}
for (const w of parsed.warnings) console.warn(`⚠ ${w.path} : ${w.message}`);

const out = join(here, 'sortie', id);
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'storyboard.json'), JSON.stringify(storyboard, null, 2) + '\n');
writeFileSync(join(out, 'narration.json'), JSON.stringify({ episode: id, duree: mod.TOTAL, segments: narration.map((s) => ({ ...s, texte_voix: s.text.replace(/\*/g, '') })) }, null, 2) + '\n');
writeFileSync(join(out, 'cues.json'), JSON.stringify({ duree: mod.TOTAL, cues }, null, 2) + '\n');
writeFileSync(join(out, 'fiche.md'), mod.fiche());

const words = narration.reduce((n, s) => n + s.text.split(/\s+/).length, 0);
console.log(`✓ ${id} : ${parsed.storyboard.meta.duration.toFixed(2)} s, ${parsed.storyboard.scenes.length} scènes, ${words} mots de narration, ${cues.length} repères audio → ${out}`);
