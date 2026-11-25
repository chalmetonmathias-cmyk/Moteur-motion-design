/**
 * logo-reveal — révélation de marque : halo, anneaux qui se dessinent,
 * étincelles radiales, logo qui jaillit (spring), nom et baseline.
 *
 *   { "type": "component", "ref": "logo-reveal", "start": 0.3,
 *     "props": { "src": "@logo", "text": "NOVA", "tagline": "Créez plus vite." } }
 */
import type { LayerInput } from '../types/storyboard.ts';
import type { ComponentDefinition } from './types.ts';
import { alpha, num, r2, str } from './util.ts';

export const logoReveal: ComponentDefinition = {
  name: 'logo-reveal',
  description: 'Révélation de logo : halo, double anneau dessiné, burst de traits, logo en ressort, nom + baseline.',
  props: {
    src: { type: 'string', description: 'Image du logo (URL ou "@asset"). Sans image : pastille dégradée.' },
    text: { type: 'string', description: 'Nom de marque sous le logo.' },
    tagline: { type: 'string', description: 'Baseline sous le nom.' },
    x: { type: 'number', description: 'Centre X (défaut : centre).' },
    y: { type: 'number', description: 'Centre Y du logo (défaut : 44 % de la hauteur).' },
    size: { type: 'number', default: 260, min: 40, description: 'Taille du logo (px).' },
    font: { type: 'string', description: 'Police du nom (défaut : 1re police du thème).' },
    taglineFont: { type: 'string', description: 'Police de la baseline (défaut : 2e police du thème).' },
    textSize: { type: 'number', default: 104, min: 8, description: 'Taille du nom (px).' },
    accent: { type: 'color', default: '$accent', description: 'Couleur principale (anneau, halo).' },
    accent2: { type: 'color', default: '$primary', description: 'Couleur secondaire (anneau, étincelles).' },
    color: { type: 'color', default: '$text', description: 'Couleur du nom.' },
    sparks: { type: 'number', default: 12, min: 0, max: 48, description: 'Nombre d’étincelles radiales.' },
  },

  expand(p, ctx) {
    const id = ctx.id;
    const size = num(p.size, 260);
    const cx = num(p.x, ctx.width / 2);
    const cy = num(p.y, ctx.height * 0.44);
    const accent = str(p.accent, '$accent');
    const accent2 = str(p.accent2, '$primary');
    const font = str(p.font, ctx.fonts[0] ?? 'Inter');
    const tagFont = str(p.taglineFont, ctx.fonts[1] ?? font);
    const textSize = num(p.textSize, 104);
    const R = size * 0.68;
    const layers: LayerInput[] = [];

    // Halo diffus (mode écran).
    layers.push({
      type: 'path',
      id: `${id}/glow`,
      shape: { type: 'circle', cx, cy, r: size * 1.7 },
      fill: { type: 'radial', stops: [[alpha(accent, 55), 0], [alpha(accent2, 18), 0.45], [alpha(accent2, 0), 1]] },
      blend: 'screen',
      pivot: 'center',
      keyframes: [
        { t: 0, scale: 0.2, opacity: 0 },
        { t: 0.9, scale: 1, opacity: 1, easing: 'ease-out-expo' },
        { t: 2.4, scale: 1.08, opacity: 0.75, easing: 'ease-in-out' },
      ],
    });

    // Deux anneaux qui se dessinent en sens opposés, puis s'expandent.
    for (const [k, color, r, w, delay] of [
      [0, accent2, R, 6, 0],
      [1, accent, R * 1.18, 3, 0.12],
    ] as const) {
      layers.push({
        type: 'path',
        id: `${id}/ring-${k}`,
        shape: { type: 'circle', cx, cy, r },
        stroke: color,
        strokeWidth: w,
        pathLength: 1,
        pivot: { x: cx, y: cy },
        rotate: k === 0 ? -90 : 90,
        keyframes: [
          { t: delay, strokeDashoffset: k === 0 ? 1 : -1, opacity: 1, scale: 0.85 },
          { t: delay + 0.75, strokeDashoffset: 0, scale: 1, easing: 'cubic-bezier(0.65,0,0.35,1)' },
          { t: delay + 1.1, opacity: 1 },
          { t: delay + 1.9, scale: 1.55, opacity: 0, easing: 'ease-out-cubic' },
        ],
      });
    }

    // Étincelles radiales : un trait court qui "file" vers l'extérieur.
    const n = Math.round(num(p.sparks, 12));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      const r1 = R * 1.05, r2_ = R * 1.65;
      layers.push({
        type: 'path',
        id: `${id}/spark-${i}`,
        d: `M${r2(cx + Math.cos(a) * r1)},${r2(cy + Math.sin(a) * r1)} L${r2(cx + Math.cos(a) * r2_)},${r2(cy + Math.sin(a) * r2_)}`,
        stroke: i % 2 ? accent : accent2,
        strokeWidth: i % 2 ? 5 : 7,
        pathLength: 1,
        strokeDasharray: [0.45, 1],
        // Opacité nulle hors du vol : évite le point laissé par l'extrémité arrondie.
        keyframes: [
          { t: 0.6, strokeDashoffset: 0.45, opacity: 0 },
          { t: 0.64, opacity: 1, easing: 'linear' },
          { t: 1.15, opacity: 1 },
          { t: 1.25, strokeDashoffset: -1, opacity: 0, easing: 'ease-out-cubic' },
        ],
      });
    }

    // Logo (ou pastille dégradée).
    const logoKeys = [
      { t: 0.3, scale: 0, rotate: -35, opacity: 0 },
      { t: 0.45, opacity: 1 },
      { t: 1.15, scale: 1, rotate: 0, easing: 'spring(220,13)' },
    ];
    const src = str(p.src);
    if (src) {
      layers.push({ type: 'image', id: `${id}/logo`, src, width: size, anchor: { x: cx, y: cy }, keyframes: logoKeys });
    } else {
      layers.push({
        type: 'path',
        id: `${id}/logo`,
        shape: { type: 'circle', cx, cy, r: size / 2 },
        fill: { type: 'linear', angle: 135, stops: [[accent2, 0], [accent, 1]] },
        pivot: { x: cx, y: cy },
        keyframes: logoKeys,
      });
    }

    // Nom de marque + baseline.
    const text = str(p.text);
    let below = cy + size / 2 + 40;
    if (text) {
      const ty = below + textSize * 0.6;
      layers.push({
        type: 'text',
        id: `${id}/name`,
        content: text,
        font,
        size: textSize,
        weight: 700,
        color: str(p.color, '$text'),
        anchor: { x: cx, y: ty },
        letterSpacing: textSize * 0.04,
        split: { by: 'char', start: 0.75, stagger: 0.045, duration: 0.8, easing: 'spring(200,14)', order: 'center', from: { y: textSize * 0.8, opacity: 0, scale: 0.6 } },
      });
      below = ty + textSize * 0.6;
    }
    const tagline = str(p.tagline);
    if (tagline) {
      layers.push({
        type: 'text',
        id: `${id}/tagline`,
        content: tagline,
        font: tagFont,
        size: Math.round(textSize * 0.4),
        weight: 500,
        color: '$text/75',
        highlight: accent,
        letterSpacing: 1,
        anchor: { x: cx, y: below + 36 },
        maxWidth: ctx.width - 200,
        split: { by: 'word', start: 1.15, stagger: 0.06, duration: 0.6, easing: 'ease-out-cubic', from: { y: 20, opacity: 0 } },
      });
    }
    return layers;
  },
};
