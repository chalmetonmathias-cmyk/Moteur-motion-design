/**
 * lower-third — bandeau d'identification (nom + rôle) façon "verre dépoli",
 * placé juste au-dessus de la zone d'UI basse de TikTok.
 *
 *   { "type": "component", "ref": "lower-third", "start": 1.2,
 *     "props": { "name": "Léa Martin", "role": "Fondatrice · Studio Nova", "duration": 4 } }
 */
import type { LayerInput } from '../types/storyboard.ts';
import type { ComponentDefinition } from './types.ts';
import { alpha, estimateWidth, num, str } from './util.ts';

export const lowerThird: ComponentDefinition = {
  name: 'lower-third',
  description: 'Bandeau nom + rôle : panneau qui se déploie, barre d’accent à ressort, textes révélés.',
  props: {
    name: { type: 'string', required: true, description: 'Nom (ligne principale).' },
    role: { type: 'string', description: 'Rôle / sous-ligne (affichée en capitales).' },
    x: { type: 'number', description: 'Bord gauche du bandeau. Défaut : 64 px dans la zone sûre.' },
    y: { type: 'number', description: 'Centre vertical. Défaut : juste au-dessus de la safe-area basse.' },
    width: { type: 'number', min: 120, description: 'Largeur du panneau (défaut : estimée d’après le texte).' },
    size: { type: 'number', default: 52, min: 8, description: 'Taille du nom (px).' },
    font: { type: 'string', description: 'Police du nom (défaut : 1re police du thème).' },
    roleFont: { type: 'string', description: 'Police du rôle (défaut : 2e police du thème).' },
    color: { type: 'color', default: '$text', description: 'Couleur du nom.' },
    accent: { type: 'color', default: '$accent', description: 'Couleur de la barre et du rôle.' },
    panel: { type: 'color', default: 'rgba(255,255,255,0.08)', description: 'Fond du panneau.' },
    duration: { type: 'number', min: 0.5, description: 'Durée d’affichage (s) ; si absent, le bandeau reste affiché.' },
  },

  expand(p, ctx) {
    const id = ctx.id;
    const name = str(p.name);
    const role = str(p.role).toUpperCase();
    const size = num(p.size, 52);
    const roleSize = Math.round(size * 0.5);
    const font = str(p.font, ctx.fonts[0] ?? 'Inter');
    const roleFont = str(p.roleFont, ctx.fonts[1] ?? font);
    const accent = str(p.accent, '$accent');
    const padX = 44;
    const contentW = Math.max(estimateWidth(name, size), role ? estimateWidth(role, roleSize, 3) : 0);
    const w = num(p.width, Math.min(ctx.width - 128, contentW + padX * 2 + 24));
    const h = role ? size * 2.55 : size * 1.9;
    const x = num(p.x, 64 + ctx.safeArea.left);
    const y = num(p.y, ctx.height - ctx.safeArea.bottom - h / 2 - 40);
    const top = y - h / 2;
    const nameY = role ? y - size * 0.36 : y;
    const roleY = y + size * 0.58;

    const layers: LayerInput[] = [
      // Panneau qui se déploie de gauche à droite.
      {
        type: 'path',
        id: `${id}/panel`,
        shape: { type: 'rect', x, y: top, width: w, height: h, radius: 22 },
        fill: { type: 'linear', angle: 90, stops: [[str(p.panel, 'rgba(255,255,255,0.08)'), 0], ['rgba(255,255,255,0.03)', 1]] },
        stroke: 'rgba(255,255,255,0.14)',
        strokeWidth: 2,
        clipDirection: 'left-to-right',
        shadow: { color: 'rgba(0,0,0,0.35)', blur: 40, y: 12 },
        keyframes: [
          { t: 0, clipProgress: 0 },
          { t: 0.55, clipProgress: 1, easing: 'ease-out-expo' },
        ],
      },
      // Barre d'accent : jaillit avec un ressort.
      {
        type: 'path',
        id: `${id}/bar`,
        shape: { type: 'rect', x: x + 18, y: top + 20, width: 8, height: h - 40, radius: 4 },
        fill: { type: 'linear', angle: 180, stops: [[accent, 0], [alpha(accent, 55), 1]] },
        pivot: 'center',
        shadow: { color: alpha(accent, 70), blur: 18 },
        keyframes: [
          { t: 0.1, scaleY: 0 },
          { t: 0.7, scaleY: 1, easing: 'spring(260,14)' },
        ],
      },
      // Nom : révélé par un clip + léger glissement.
      {
        type: 'text',
        id: `${id}/name`,
        content: name,
        font,
        size,
        weight: 700,
        color: str(p.color, '$text'),
        align: 'left',
        anchor: { x: x + padX + 8, y: nameY },
        clipDirection: 'left-to-right',
        keyframes: [
          { t: 0.22, clipProgress: 0, x: -24 },
          { t: 0.8, clipProgress: 1, x: 0, easing: 'cubic-bezier(0.22,1,0.36,1)' },
        ],
      },
    ];
    if (role) {
      layers.push({
        type: 'text',
        id: `${id}/role`,
        content: role,
        font: roleFont,
        size: roleSize,
        weight: 600,
        letterSpacing: 3,
        color: accent,
        align: 'left',
        anchor: { x: x + padX + 8, y: roleY },
        keyframes: [
          { t: 0.42, opacity: 0, x: -16 },
          { t: 0.9, opacity: 1, x: 0, easing: 'ease-out' },
        ],
      });
    }

    if (typeof p.duration === 'number') {
      const out = p.duration;
      return [
        {
          type: 'group',
          id: `${id}/life`,
          end: out,
          keyframes: [
            { t: out - 0.35, opacity: 1, x: 0 },
            { t: out, opacity: 0, x: -40, easing: 'ease-in' },
          ],
          layers,
        },
      ];
    }
    return layers;
  },
};
