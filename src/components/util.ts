import { parseColor, rgbaToCss } from '../engine/color.ts';

/**
 * Utilitaires partagés par les composants.
 *
 * Les composants sont expansés au PARSING, sans accès au canvas : la largeur
 * des textes est donc ESTIMÉE (chasse moyenne par type de caractère). C'est
 * suffisant pour dimensionner des fonds/soulignés ; chaque composant accepte
 * une largeur explicite pour un contrôle au pixel près.
 */

/** Largeur approximative d'un texte (px) — sans les marqueurs `*`. */
export function estimateWidth(text: string, size: number, letterSpacing = 0): number {
  let w = 0;
  let n = 0;
  for (const ch of text.replace(/\*/g, '')) {
    n++;
    if (ch === ' ') w += 0.28;
    else if (/[A-Z0-9%#@&]/.test(ch)) w += 0.66;
    else if (/[mwMW]/.test(ch)) w += 0.82;
    else if (/[iljtf.,:;'!|]/.test(ch)) w += 0.3;
    else w += 0.55;
  }
  return w * size + Math.max(0, n - 1) * letterSpacing;
}

/** Largeur de la plus longue ligne. */
export function estimateBlockWidth(text: string, size: number, letterSpacing = 0): number {
  return Math.max(...text.split('\n').map((l) => estimateWidth(l, size, letterSpacing)));
}

export const lineCount = (text: string) => text.split('\n').length;

export const str = (v: unknown, def = ''): string => (typeof v === 'string' ? v : def);
export const num = (v: unknown, def: number): number => (typeof v === 'number' ? v : def);
export const bool = (v: unknown, def: boolean): boolean => (typeof v === 'boolean' ? v : def);

/** Arrondi à 2 décimales (JSON lisible). */
export const r2 = (v: number) => Math.round(v * 100) / 100;

/**
 * Applique une opacité (en %) à une couleur d'entrée : "$accent" → "$accent/40",
 * "#ff5e8a" → "rgba(255,94,138,0.4)". Les références restent résolues par le parser.
 */
export function alpha(color: string, pct: number): string {
  const ref = /^\$([\w-]+)(?:\/(\d{1,3}))?$/.exec(color.trim());
  if (ref) return `$${ref[1]}/${Math.round(((ref[2] === undefined ? 100 : Number(ref[2])) * pct) / 100)}`;
  const c = parseColor(color);
  return c ? rgbaToCss({ ...c, a: (c.a * pct) / 100 }) : color;
}
