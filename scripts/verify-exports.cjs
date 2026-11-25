/**
 * Vérification navigateur des exemples (outil de dev, optionnel).
 *
 * Pour chaque exemple : chargement + diagnostics, déterminisme (même t ⇒ même
 * hash de pixels), puis export WebM réel via le bouton du player (réglages par
 * défaut : 60 fps, mode Auto) et contrôle du fichier avec ffprobe s'il existe.
 *
 * Prérequis : `npm run dev` lancé, Playwright installé (`npm i -D playwright`
 * puis `npx playwright install chromium`), ffprobe facultatif.
 *
 *   node scripts/verify-exports.cjs                    # les 9 exemples, avec export
 *   node scripts/verify-exports.cjs --no-export        # chargement + déterminisme seulement
 *   node scripts/verify-exports.cjs short-01-hook      # un exemple
 *
 * Variables : BASE_URL (défaut http://localhost:5173), OUT (défaut ./exports),
 * PROXY (proxy HTTP pour charger Google Fonts, si nécessaire).
 */
const { chromium } = require('playwright');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const BASE = process.env.BASE_URL || 'http://localhost:5173';
const OUT = path.resolve(process.env.OUT || 'exports');
const args = process.argv.slice(2);
const doExport = !args.includes('--no-export');
const only = args.filter((a) => !a.startsWith('--'));

function probe(file) {
  try {
    const json = execFileSync('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name,width,height,nb_read_frames:format=duration,size', '-of', 'json', file]).toString();
    const p = JSON.parse(json);
    return { codec: p.streams[0].codec_name, size: `${p.streams[0].width}x${p.streams[0].height}`, duration: +(+p.format.duration).toFixed(3), blocks: +p.streams[0].nb_read_frames, mb: +(p.format.size / 1e6).toFixed(1) };
  } catch {
    return { ffprobe: 'indisponible' };
  }
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch(process.env.PROXY ? { proxy: { server: process.env.PROXY, bypass: 'localhost,127.0.0.1' } } : {});
  const page0 = await browser.newPage();
  await page0.goto(BASE);
  await page0.waitForFunction(() => window.motionEngine);
  const names = only.length ? only : await page0.evaluate(() => window.motionEngine.examples);
  await page0.close();

  let failures = 0;
  for (const name of names) {
    const page = await browser.newPage({ viewport: { width: 1400, height: 1000 }, acceptDownloads: true });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(BASE);
    await page.waitForFunction(() => window.motionEngine);
    const loaded = await page.evaluate((n) => window.motionEngine.loadExample(n), name);
    const badge = await page.evaluate(() => document.querySelector('#diag-badge').textContent);
    const duration = await page.evaluate(() => window.motionEngine.storyboard().meta.duration);

    const hashAt = (t) =>
      page.evaluate(async (tt) => {
        window.motionEngine.renderAt(tt);
        const c = document.getElementById('canvas');
        const data = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        const h = await crypto.subtle.digest('SHA-256', data);
        return [...new Uint8Array(h)].slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('');
      }, t);
    const t1 = +(duration * 0.37).toFixed(3);
    const h1 = await hashAt(t1);
    await hashAt(duration * 0.8);
    const deterministic = h1 === (await hashAt(t1));

    const result = { name, loaded, diagnostics: badge, duration, deterministic, errors };
    if (doExport) {
      const t0 = Date.now();
      const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30 * 60 * 1000 }), page.click('#export-btn')]);
      const file = path.join(OUT, `${name}.webm`);
      await dl.saveAs(file);
      Object.assign(result, { exportSeconds: Math.round((Date.now() - t0) / 1000), toast: await page.textContent('#toast'), file: probe(file) });
    }
    if (!loaded || badge !== 'OK' || !deterministic || errors.length) failures++;
    console.log(JSON.stringify(result));
    await page.close();
  }
  await browser.close();
  process.exitCode = failures ? 1 : 0;
})();
