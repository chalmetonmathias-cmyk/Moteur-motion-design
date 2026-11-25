/**
 * title-card — titre plein écran avec sur-titre (pastille), soulignement
 * qui se dessine et sous-titre. 4 styles d'entrée, sortie optionnelle.
 *
 *   { "type": "component", "ref": "title-card", "start": 0.2,
 *     "props": { "kicker": "Épisode 01", "title": "Le *motion*\ndesign", "style": "rise", "exit": 3.5 } }
 */
import type { LayerInput, SplitInput } from '../types/storyboard.ts';
import type { ComponentDefinition } from './types.ts';
import { alpha, bool, estimateBlockWidth, estimateWidth, lineCount, num, r2, str } from './util.ts';

const STYLES = ['rise', 'pop', 'typewriter', 'mask'] as const;

export const titleCard: ComponentDefinition = {
  name: 'title-card',
  description: 'Titre principal animé : sur-titre en pastille, titre (split), soulignement dessiné, sous-titre.',
  props: {
    title: { type: 'string', required: true, description: 'Titre. `\\n` = retour ligne, `*mot*` = mot en couleur accent.' },
    subtitle: { type: 'string', description: 'Sous-titre sous le titre.' },
    kicker: { type: 'string', description: 'Petit libellé en pastille au-dessus du titre.' },
    style: { type: 'enum', values: STYLES, default: 'rise', description: "Entrée du titre : rise (lettres qui montent), pop (mots qui rebondissent), typewriter, mask (lignes révélées)." },
    x: { type: 'number', description: 'Position X (centre, ou bord gauche si align=left). Défaut : centre.' },
    y: { type: 'number', description: 'Position Y du centre du titre. Défaut : milieu de la zone sûre.' },
    align: { type: 'enum', values: ['center', 'left'], default: 'center', description: 'Alignement du bloc.' },
    size: { type: 'number', default: 112, min: 8, description: 'Taille du titre (px).' },
    weight: { type: 'number', default: 700, min: 100, max: 1000, description: 'Graisse du titre.' },
    font: { type: 'string', description: 'Police du titre (défaut : 1re police du thème).' },
    subtitleFont: { type: 'string', description: 'Police du sous-titre (défaut : 2e police du thème).' },
    subtitleSize: { type: 'number', default: 44, min: 8, description: 'Taille du sous-titre (px).' },
    color: { type: 'color', default: '$text', description: 'Couleur du titre.' },
    subtitleColor: { type: 'color', default: '$text/70', description: 'Couleur du sous-titre.' },
    accent: { type: 'color', default: '$accent', description: 'Couleur d’accent (mots *surlignés*, pastille, soulignement).' },
    accent2: { type: 'color', default: '$primary', description: 'Seconde couleur du dégradé du soulignement.' },
    underline: { type: 'boolean', default: true, description: 'Trait d’accent qui se dessine sous le titre.' },
    maxWidth: { type: 'number', default: 900, min: 100, description: 'Largeur max du titre avant retour à la ligne automatique.' },
    exit: { type: 'number', min: 0, description: 'Instant (s, relatif au composant) où la carte sort de l’écran.' },
  },

  expand(p, ctx) {
    const title = str(p.title);
    const size = num(p.size, 112);
    const style = str(p.style, 'rise') as (typeof STYLES)[number];
    const left = p.align === 'left';
    const font = str(p.font, ctx.fonts[0] ?? 'Inter');
    const subFont = str(p.subtitleFont, ctx.fonts[1] ?? font);
    const subSize = num(p.subtitleSize, 44);
    const maxWidth = num(p.maxWidth, 900);
    const safeMid = ctx.safeArea.top + (ctx.height - ctx.safeArea.top - ctx.safeArea.bottom) / 2;
    const x = num(p.x, left ? 90 + ctx.safeArea.left : ctx.width / 2);
    const y = num(p.y, safeMid);
    const accent = str(p.accent, '$accent');
    const accent2 = str(p.accent2, '$primary');

    const lines = Math.max(lineCount(title), Math.ceil(estimateBlockWidth(title, size) / maxWidth));
    const lineHeight = 1.04;
    const titleH = lines * size * lineHeight;
    const titleW = Math.min(maxWidth, estimateBlockWidth(title, size));
    const align = left ? 'left' : 'center';
    const layers: LayerInput[] = [];
    const id = ctx.id;

    /* ── Sur-titre en pastille ── */
    const kicker = str(p.kicker).toUpperCase();
    if (kicker) {
      const kSize = 28;
      const kw = estimateWidth(kicker, kSize, 5) + 56;
      const kh = 58;
      const ky = y - titleH / 2 - 64;
      const kx = left ? x : x - kw / 2;
      layers.push({
        type: 'group',
        id: `${id}/kicker`,
        pivot: { x: kx + kw / 2, y: ky },
        keyframes: [
          { t: 0, opacity: 0, scale: 0.6, y: 16 },
          { t: 0.45, opacity: 1, scale: 1, y: 0, easing: 'back(2.2)' },
        ],
        layers: [
          {
            type: 'path',
            shape: { type: 'rect', x: kx, y: ky - kh / 2, width: kw, height: kh, radius: kh / 2 },
            fill: alpha(accent, 16),
            stroke: alpha(accent, 70),
            strokeWidth: 2,
          },
          { type: 'text', content: kicker, font: subFont, size: kSize, weight: 600, letterSpacing: 5, color: accent, anchor: { x: kx + kw / 2, y: ky }, align: 'center' },
        ],
      });
    }

    /* ── Titre ── */
    const t0 = kicker ? 0.18 : 0;
    const split: Record<(typeof STYLES)[number], SplitInput> = {
      rise: { by: 'char', start: t0, stagger: 0.028, duration: 0.75, easing: 'spring(190,15)', from: { y: size * 0.9, opacity: 0, rotate: 8 } },
      pop: { by: 'word', start: t0, stagger: 0.11, duration: 0.55, easing: 'back(2.4)', from: { scale: 0.2, opacity: 0, y: 30 } },
      typewriter: { mode: 'typewriter', start: t0, stagger: 0.05, cursor: true },
      mask: { by: 'line', start: t0, stagger: 0.14, duration: 0.8, easing: 'cubic-bezier(0.16,1,0.3,1)', from: { y: size * 1.05, opacity: 1 }, mask: true },
    };
    const titleLayer: LayerInput = {
      type: 'text',
      id: `${id}/title`,
      content: title,
      font,
      size,
      weight: num(p.weight, 700),
      color: str(p.color, '$text'),
      highlight: accent,
      align,
      anchor: { x, y },
      lineHeight,
      maxWidth,
      letterSpacing: -size * 0.02,
      split: split[style],
    };
    layers.push(titleLayer);

    /* ── Soulignement qui se dessine ── */
    let cursorBottom = y + titleH / 2;
    const tTitleEnd = t0 + (style === 'pop' ? 0.5 : style === 'typewriter' ? Math.min(1.6, title.length * 0.05) : 0.55);
    if (bool(p.underline, true)) {
      const uy = cursorBottom + 34;
      const uw = Math.max(160, titleW * 0.62);
      const ux = left ? x : x - uw / 2;
      layers.push({
        type: 'path',
        id: `${id}/underline`,
        d: `M${r2(ux)},${r2(uy)} C${r2(ux + uw * 0.3)},${r2(uy - 14)} ${r2(ux + uw * 0.7)},${r2(uy + 14)} ${r2(ux + uw)},${r2(uy)}`,
        stroke: { type: 'linear', angle: 90, stops: [[accent, 0], [accent2, 1]] },
        strokeWidth: 9,
        pathLength: 1,
        keyframes: [
          { t: tTitleEnd, strokeDashoffset: 1 },
          { t: tTitleEnd + 0.7, strokeDashoffset: 0, easing: 'cubic-bezier(0.65,0,0.35,1)' },
        ],
      });
      cursorBottom = uy;
    }

    /* ── Sous-titre ── */
    const subtitle = str(p.subtitle);
    if (subtitle) {
      const sy = cursorBottom + 34 + subSize * 0.75;
      layers.push({
        type: 'text',
        id: `${id}/subtitle`,
        content: subtitle,
        font: subFont,
        size: subSize,
        weight: 500,
        color: str(p.subtitleColor, '$text/70'),
        highlight: accent,
        align,
        anchor: { x, y: sy },
        maxWidth: maxWidth - 40,
        lineHeight: 1.3,
        split: { by: 'word', start: tTitleEnd + 0.15, stagger: 0.05, duration: 0.6, easing: 'ease-out-cubic', from: { y: 22, opacity: 0 } },
      });
    }

    /* ── Sortie ── */
    if (typeof p.exit === 'number') {
      return [
        {
          type: 'group',
          id: `${id}/exit`,
          pivot: { x, y },
          keyframes: [
            { t: p.exit, opacity: 1, y: 0, scale: 1 },
            { t: p.exit + 0.4, opacity: 0, y: -60, scale: 0.96, easing: 'back-in' },
          ],
          layers,
        },
      ];
    }
    return layers;
  },
};
