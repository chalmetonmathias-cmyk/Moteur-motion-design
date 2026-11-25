/**
 * Mise en page du texte pour Canvas 2D.
 *
 * Le canvas ne sait dessiner qu'une ligne à la fois et n'expose pas la
 * position des glyphes. On calcule donc nous-mêmes :
 *   - le retour à la ligne (`\n` + `maxWidth`) ;
 *   - la position X de chaque caractère via la largeur des PRÉFIXES
 *     (measureText("Bonj")) → le crénage (kerning) est préservé ;
 *   - le letter-spacing (identique sur tous les navigateurs) ;
 *   - les "unités" animables (lettre / mot / ligne) pour le split ;
 *   - le surlignage `*mot*` (runs de couleur).
 *
 * Le résultat est mis en cache par contenu : la mise en page n'est refaite que
 * si le texte change (ex. compteur {value}).
 */
import type { Rect, SplitSpec, TextLayer } from '../types/storyboard.ts';

export interface Run {
  text: string;
  /** X local (déjà aligné) du début du run. */
  x: number;
  highlight: boolean;
}

export interface Unit {
  line: number;
  /** Centre de l'unité (pivot de ses transformations). */
  cx: number;
  cy: number;
  baseline: number;
  /** Bords gauche / droit (curseur typewriter, masque). */
  left: number;
  right: number;
  runs: Run[];
  /** Rang d'apparition (selon split.order). */
  order: number;
}

export interface TextLayout {
  font: string;
  units: Unit[];
  bounds: Rect;
  capHeight: number;
}

/** Police CSS complète, avec repli système. */
export function cssFont(layer: Pick<TextLayer, 'font' | 'size' | 'weight' | 'italic'>): string {
  return `${layer.italic ? 'italic ' : ''}${layer.weight} ${layer.size}px "${layer.font}", system-ui, -apple-system, "Segoe UI", sans-serif`;
}

/** Retire la syntaxe `*…*` et renvoie les caractères + drapeau de surlignage. */
function parseMarkup(content: string): { chars: string[]; hl: boolean[] } {
  const chars: string[] = [];
  const hl: boolean[] = [];
  let on = false;
  const cps = Array.from(content);
  for (let i = 0; i < cps.length; i++) {
    const c = cps[i]!;
    if (c === '\\' && cps[i + 1] === '*') {
      chars.push('*');
      hl.push(on);
      i++;
    } else if (c === '*') on = !on;
    else {
      chars.push(c);
      hl.push(on);
    }
  }
  return { chars, hl };
}

/** PRNG déterministe (mulberry32) — pour l'ordre "random" du split. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

interface LineDraft {
  chars: string[];
  hl: boolean[];
}

export function layoutText(ctx: CanvasRenderingContext2D, layer: TextLayer, content: string): TextLayout {
  const font = cssFont(layer);
  ctx.font = font;
  const ls = layer.letterSpacing;
  const measure = (chars: string[]) => (chars.length === 0 ? 0 : ctx.measureText(chars.join('')).width + ls * (chars.length - 1));

  /* 1. Découpage en lignes (\n + retour automatique sur maxWidth). */
  const { chars, hl } = parseMarkup(content);
  const paragraphs: LineDraft[] = [{ chars: [], hl: [] }];
  chars.forEach((c, i) => {
    if (c === '\n') paragraphs.push({ chars: [], hl: [] });
    else {
      paragraphs[paragraphs.length - 1]!.chars.push(c);
      paragraphs[paragraphs.length - 1]!.hl.push(hl[i]!);
    }
  });

  const lines: LineDraft[] = [];
  for (const para of paragraphs) {
    if (!layer.maxWidth || measure(para.chars) <= layer.maxWidth) {
      lines.push(para);
      continue;
    }
    // Retour à la ligne glouton, mot par mot.
    let cur: LineDraft = { chars: [], hl: [] };
    let i = 0;
    while (i < para.chars.length) {
      let j = i;
      while (j < para.chars.length && para.chars[j] !== ' ') j++;
      const word = para.chars.slice(i, j);
      const wordHl = para.hl.slice(i, j);
      const candidate = cur.chars.length ? [...cur.chars, ' ', ...word] : word;
      if (cur.chars.length && measure(candidate) > layer.maxWidth) {
        lines.push(cur);
        cur = { chars: [...word], hl: [...wordHl] };
      } else {
        if (cur.chars.length) {
          cur.chars.push(' ');
          cur.hl.push(wordHl[0] ?? false);
        }
        cur.chars.push(...word);
        cur.hl.push(...wordHl);
      }
      i = j + 1;
    }
    lines.push(cur);
  }

  /* 2. Métriques verticales. */
  const m = ctx.measureText('H');
  const capHeight = m.actualBoundingBoxAscent > 0 ? m.actualBoundingBoxAscent : layer.size * 0.7;
  const step = layer.size * layer.lineHeight;
  const n = lines.length;
  const centerY = (k: number) => {
    if (layer.verticalAlign === 'top') return k * step + layer.size * 0.5;
    if (layer.verticalAlign === 'bottom') return -(n - 1 - k) * step - layer.size * 0.5;
    return (k - (n - 1) / 2) * step;
  };

  /* 3. Positions des caractères et unités. */
  const units: Unit[] = [];
  let minX = Infinity, maxX = -Infinity;
  const by = layer.split?.by ?? 'line';
  const perGlyph = ls !== 0;

  lines.forEach((line, li) => {
    const cs = line.chars;
    // xs[i] = position du i-ème caractère (largeur du préfixe + espacement).
    const xs: number[] = [0];
    for (let i = 1; i <= cs.length; i++) xs.push(ctx.measureText(cs.slice(0, i).join('')).width + ls * i);
    const width = cs.length ? xs[cs.length]! - ls : 0;
    const x0 = layer.align === 'left' ? 0 : layer.align === 'right' ? -width : -width / 2;
    minX = Math.min(minX, x0);
    maxX = Math.max(maxX, x0 + width);
    const cy = centerY(li);
    const baseline = cy + capHeight / 2;

    // Plages [from, to) de chaque unité.
    const ranges: [number, number][] = [];
    if (by === 'line') {
      let a = 0, b = cs.length;
      while (a < b && cs[a] === ' ') a++;
      while (b > a && cs[b - 1] === ' ') b--;
      if (b > a) ranges.push([a, b]);
    } else if (by === 'word') {
      let i = 0;
      while (i < cs.length) {
        while (i < cs.length && cs[i] === ' ') i++;
        const a = i;
        while (i < cs.length && cs[i] !== ' ') i++;
        if (i > a) ranges.push([a, i]);
      }
    } else {
      cs.forEach((c, i) => {
        if (c !== ' ') ranges.push([i, i + 1]);
      });
    }

    for (const [a, b] of ranges) {
      const runs: Run[] = [];
      let k = a;
      while (k < b) {
        let e = k + 1;
        if (!perGlyph) while (e < b && line.hl[e] === line.hl[k]) e++;
        runs.push({ text: cs.slice(k, e).join(''), x: x0 + xs[k]!, highlight: line.hl[k]! });
        k = e;
      }
      const left = x0 + xs[a]!;
      const right = x0 + xs[b]! - ls;
      units.push({ line: li, cx: (left + right) / 2, cy, baseline, left, right, runs, order: units.length });
    }
  });

  if (layer.split) assignOrder(units, layer.split, layer.id);

  const top = centerY(0) - layer.size * 0.62;
  const bottom = centerY(n - 1) + layer.size * 0.62;
  const bounds = Number.isFinite(minX) ? { x: minX, y: top, width: maxX - minX, height: bottom - top } : { x: 0, y: 0, width: 0, height: 0 };
  return { font, units, bounds, capHeight };
}

function assignOrder(units: Unit[], split: SplitSpec, seedKey: string): void {
  const n = units.length;
  switch (split.order) {
    case 'forward':
      break;
    case 'reverse':
      units.forEach((u, i) => (u.order = n - 1 - i));
      break;
    case 'center':
      units.forEach((u, i) => (u.order = Math.round(Math.abs(i - (n - 1) / 2))));
      break;
    case 'random': {
      const rnd = mulberry32(hashString(seedKey));
      const perm = units.map((_, i) => i);
      for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [perm[i], perm[j]] = [perm[j]!, perm[i]!];
      }
      units.forEach((u, i) => (u.order = perm[i]!));
      break;
    }
  }
}

/** Formate la valeur d'un compteur `{value}`. */
export function formatValue(value: number, decimals: number, thousands: string, decimalSep = '.'): string {
  const fixed = value.toFixed(decimals);
  if (!thousands) return decimalSep === '.' ? fixed : fixed.replace('.', decimalSep);
  const [int, dec] = fixed.split('.');
  const sign = int!.startsWith('-') ? '-' : '';
  const digits = sign ? int!.slice(1) : int!;
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, thousands);
  return sign + grouped + (dec !== undefined ? decimalSep + dec : '');
}
