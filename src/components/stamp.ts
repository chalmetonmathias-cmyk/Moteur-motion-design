/**
 * stamp — tampon qui s'écrase sur l'écran (verdict, "SECRET", "CLASSÉ"…).
 *
 *   { "type": "component", "ref": "stamp", "start": 3,
 *     "props": { "text": "LÉGENDE", "color": "#d63a2f", "x": 540, "y": 900 } }
 */
import type { LayerInput } from '../types/storyboard.ts';
import type { ComponentDefinition } from './types.ts';
import { alpha, estimateWidth, num, str } from './util.ts';

export const stamp: ComponentDefinition = {
  name: 'stamp',
  description: 'Tampon encreur : arrive de très près, s’écrase (back) et vibre légèrement.',
  props: {
    text: { type: 'string', required: true, description: 'Texte du tampon (en capitales de préférence).' },
    sub: { type: 'string', description: 'Petite ligne sous le texte (ex. une date).' },
    x: { type: 'number', description: 'Centre X (défaut : centre).' },
    y: { type: 'number', description: 'Centre Y (défaut : milieu).' },
    size: { type: 'number', default: 96, min: 8, description: 'Taille du texte (px).' },
    font: { type: 'string', description: 'Police (défaut : 1re police du thème).' },
    weight: { type: 'number', default: 700, min: 100, max: 1000, description: 'Graisse du texte.' },
    color: { type: 'color', default: '$accent', description: 'Couleur de l’encre.' },
    rotate: { type: 'number', default: -10, description: 'Inclinaison (degrés).' },
    width: { type: 'number', min: 40, description: 'Largeur du cadre (défaut : estimée).' },
  },

  expand(p, ctx) {
    const text = str(p.text).toUpperCase();
    const size = num(p.size, 96);
    const x = num(p.x, ctx.width / 2);
    const y = num(p.y, ctx.height / 2);
    const color = str(p.color, '$accent');
    const sub = str(p.sub);
    const w = num(p.width, estimateWidth(text, size, size * 0.08) + size * 1.1);
    const h = size * (sub ? 1.9 : 1.55);
    const font = str(p.font, ctx.fonts[0] ?? 'Inter');
    const layers: LayerInput[] = [
      // Double cadre (épais + fin) façon tampon.
      { type: 'path', id: `${ctx.id}/frame`, shape: { type: 'rect', x: x - w / 2, y: y - h / 2, width: w, height: h, radius: size * 0.16 }, stroke: color, strokeWidth: size * 0.09, fill: alpha(color, 8) },
      { type: 'path', id: `${ctx.id}/frame-in`, shape: { type: 'rect', x: x - w / 2 + size * 0.17, y: y - h / 2 + size * 0.17, width: w - size * 0.34, height: h - size * 0.34, radius: size * 0.08 }, stroke: alpha(color, 80), strokeWidth: size * 0.03, fill: 'none' },
      { type: 'text', id: `${ctx.id}/text`, content: text, font, size, weight: num(p.weight, 700), color, letterSpacing: size * 0.08, anchor: { x, y: sub ? y - size * 0.22 : y } },
    ];
    if (sub) layers.push({ type: 'text', id: `${ctx.id}/sub`, content: sub.toUpperCase(), font, size: size * 0.3, weight: num(p.weight, 700), color, letterSpacing: size * 0.04, anchor: { x, y: y + size * 0.55 } });
    const rot = num(p.rotate, -10);
    return [
      {
        type: 'group',
        id: `${ctx.id}/stamp`,
        pivot: { x, y },
        rotate: rot,
        keyframes: [
          { t: 0, scale: 2.6, opacity: 0, rotate: rot - 8 },
          { t: 0.06, opacity: 1, easing: 'linear' },
          { t: 0.24, scale: 1, rotate: rot, easing: 'back(1.6)' },
          // Petit tremblement à l'impact.
          { t: 0.28, x: 5, easing: 'linear' },
          { t: 0.32, x: -4, easing: 'linear' },
          { t: 0.36, x: 0, easing: 'linear' },
        ],
        layers,
      },
    ];
  },
};
