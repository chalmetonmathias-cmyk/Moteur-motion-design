#!/usr/bin/env node
/**
 * Rendu en ligne de commande d'un storyboard → vidéo WebM (+ miniature).
 * Point d'entrée des chaînes automatisées (ex. chaines/lenigme-vraie).
 *
 *   node scripts/render.mjs <storyboard.json> <sortie.webm> [options]
 *
 * Options :
 *   --fps 60|30            cadence (défaut : celle du storyboard)
 *   --qualite 16000000     débit cible en bits/s (défaut 16 Mb/s)
 *   --rythme auto|1|2|4    mode d'export (défaut auto : calibrage, aucune image perdue)
 *   --miniature <t> <f>    enregistre la frame au temps t (s) en JPEG
 *   --sans-video           ne fait que la miniature (pas d'export)
 *
 * Prérequis : `npm install`, Playwright (`npm i -D playwright` puis
 * `npx playwright install chromium`). Variable PROXY optionnelle (polices).
 * Le script démarre lui-même un serveur Vite le temps du rendu.
 */
import { createServer } from 'vite';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : def;
};
const valued = new Set(['--fps', '--qualite', '--rythme', '--miniature']);
const [input, output] = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && valued.has(args[i - 1])) && !(i > 1 && args[i - 2] === '--miniature'));
if (!input || !output) {
  console.error('Usage : node scripts/render.mjs <storyboard.json> <sortie.webm> [--fps 60|30] [--qualite 16000000] [--rythme auto|1|2|4] [--miniature <t> <fichier.jpg>]');
  process.exit(2);
}
const mi = args.indexOf('--miniature');
const thumb = mi >= 0 ? { t: Number(args[mi + 1]), file: resolve(args[mi + 2]) } : null;

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const server = await createServer({ root, logLevel: 'error', server: { port: 5190, strictPort: false } });
await server.listen();
const url = server.resolvedUrls.local[0];

const browser = await chromium.launch(process.env.PROXY ? { proxy: { server: process.env.PROXY, bypass: 'localhost,127.0.0.1' } } : {});
let failed = false;
try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 }, acceptDownloads: true });
  page.on('pageerror', (e) => console.error('[page]', e.message));
  await page.goto(url);
  await page.waitForFunction(() => window.motionEngine);
  const ok = await page.evaluate(([text, name]) => window.motionEngine.loadText(text, name), [readFileSync(resolve(input), 'utf8'), input]);
  const diagnostics = await page.evaluate(() => [...document.querySelectorAll('#diagnostics li')].map((l) => l.textContent));
  if (!ok) throw new Error(`storyboard invalide :\n  ${diagnostics.join('\n  ')}`);
  for (const d of diagnostics) if (!d.startsWith('✓')) console.warn('⚠', d);

  if (thumb) {
    const data = await page.evaluate((t) => {
      window.motionEngine.renderAt(t);
      return document.getElementById('canvas').toDataURL('image/jpeg', 0.92);
    }, thumb.t);
    writeFileSync(thumb.file, Buffer.from(data.split(',')[1], 'base64'));
    console.log(`miniature → ${thumb.file}`);
  }

  if (args.includes('--sans-video')) throw Object.assign(new Error('fin'), { done: true });
  await page.selectOption('#export-fps', opt('--fps') ? String(opt('--fps')) : 'native').catch(() => page.selectOption('#export-fps', 'native'));
  await page.selectOption('#export-quality', String(opt('--qualite', '16000000'))).catch(() => {});
  await page.selectOption('#export-pace', String(opt('--rythme', 'auto')));
  const t0 = Date.now();
  let last = '';
  const timer = setInterval(async () => {
    const s = await page.textContent('#export-status').catch(() => '');
    if (s && s !== last) process.stdout.write(`\r  ${(last = s).padEnd(60)}`);
  }, 1000);
  const [download] = await Promise.all([page.waitForEvent('download', { timeout: 60 * 60 * 1000 }), page.click('#export-btn')]);
  clearInterval(timer);
  await download.saveAs(resolve(output));
  const toast = await page.textContent('#toast');
  console.log(`\n${toast}\nvidéo → ${resolve(output)} (${Math.round((Date.now() - t0) / 1000)} s)`);
} catch (e) {
  if (e && e.done) {
    // --sans-video : seule la miniature était demandée.
  } else {
  failed = true;
  console.error('✗', e instanceof Error ? e.message : e);
  }
} finally {
  await browser.close();
  await server.close();
}
process.exit(failed ? 1 : 0);
