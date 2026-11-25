/**
 * Génère src/examples/*.json à partir de scripts/examples/*.ts, puis valide
 * chaque storyboard avec le vrai parser.
 *
 *   npm run examples
 *
 * Les JSON générés sont la référence livrée : on peut les éditer à la main
 * (ce script les écrase s'il est relancé).
 */
import { readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseStoryboard } from '../src/parser/parser.ts';
import type { StoryboardInput } from '../src/types/storyboard.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'scripts', 'examples');
const outDir = join(root, 'src', 'examples');

const only = process.argv[2];
const files = readdirSync(srcDir)
  .filter((f) => f.endsWith('.ts') && f !== 'kit.ts')
  .filter((f) => !only || f.startsWith(only))
  .sort();

let failed = false;
for (const file of files) {
  const name = file.replace(/\.ts$/, '');
  const mod = (await import(pathToFileURL(join(srcDir, file)).href)) as { default: StoryboardInput };
  const json = JSON.stringify(mod.default, null, 2) + '\n';
  writeFileSync(join(outDir, `${name}.json`), json);

  const r = parseStoryboard(JSON.parse(json));
  if (!r.ok) {
    failed = true;
    console.log(`✗ ${name}`);
    for (const e of r.errors) console.log(`   ${e.path} : ${e.message}`);
    continue;
  }
  const { meta, scenes } = r.storyboard;
  const kb = (json.length / 1024).toFixed(0);
  console.log(`✓ ${name.padEnd(24)} ${meta.duration.toFixed(2).padStart(6)} s · ${String(scenes.length).padStart(2)} scènes · ${kb} Ko`);
  for (const s of scenes) console.log(`     ${s.id.padEnd(16)} ${s.start.toFixed(2).padStart(6)} → ${s.end.toFixed(2).padStart(6)}`);
  for (const w of r.warnings) console.log(`   ⚠ ${w.path} : ${w.message}`);
}
if (failed) process.exitCode = 1;
