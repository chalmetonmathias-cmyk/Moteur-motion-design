/**
 * Couleurs & peintures (solid / gradients).
 *
 * Module pur (aucune dépendance DOM hors `paintToStyle`) : utilisé par le
 * parser pour valider, et par le renderer pour interpoler et dessiner.
 */
import type { GradientStop, Paint, RGBA, Rect } from '../types/storyboard.ts';

const NAMED: Record<string, RGBA> = {
  transparent: { r: 0, g: 0, b: 0, a: 0 },
  white: { r: 255, g: 255, b: 255, a: 1 },
  black: { r: 0, g: 0, b: 0, a: 1 },
};

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/** Parse une couleur CSS simple : #rgb(a), #rrggbb(aa), rgb(a)(), hsl(a)(), transparent/white/black. */
export function parseColor(input: string): RGBA | null {
  const s = input.trim().toLowerCase();
  if (s in NAMED) return { ...NAMED[s]! };

  if (s.startsWith('#')) {
    const hex = s.slice(1);
    if (!/^([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(hex)) return null;
    const full = hex.length <= 4 ? [...hex].map((c) => c + c).join('') : hex;
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16),
      a: full.length === 8 ? parseInt(full.slice(6, 8), 16) / 255 : 1,
    };
  }

  const fn = /^(rgba?|hsla?)\((.*)\)$/.exec(s);
  if (!fn) return null;
  const parts = fn[2]!.split(/[\s,/]+/).filter(Boolean);
  if (parts.length < 3 || parts.length > 4) return null;
  const alpha = parts[3] === undefined ? 1 : parseComponent(parts[3], 1);
  if (alpha === null) return null;

  if (fn[1]!.startsWith('rgb')) {
    const [r, g, b] = parts.slice(0, 3).map((p) => parseComponent(p, 255));
    if (r == null || g == null || b == null) return null;
    return { r: clamp(r, 0, 255), g: clamp(g, 0, 255), b: clamp(b, 0, 255), a: clamp(alpha, 0, 1) };
  }

  const h = parseFloat(parts[0]!);
  const sat = parseComponent(parts[1]!, 1);
  const lig = parseComponent(parts[2]!, 1);
  if (!Number.isFinite(h) || sat == null || lig == null) return null;
  return { ...hslToRgb(h, clamp(sat, 0, 1), clamp(lig, 0, 1)), a: clamp(alpha, 0, 1) };
}

/** "50%" → 0.5 × scale ; "128" → 128. */
function parseComponent(p: string, scale: number): number | null {
  const pct = p.endsWith('%');
  const n = parseFloat(pct ? p.slice(0, -1) : p);
  if (!Number.isFinite(n)) return null;
  return pct ? (n / 100) * scale : n;
}

function hslToRgb(h: number, s: number, l: number): Omit<RGBA, 'a'> {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return { r: f(0) * 255, g: f(8) * 255, b: f(4) * 255 };
}

export function rgbaToCss(c: RGBA): string {
  return `rgba(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)},${+clamp(c.a, 0, 1).toFixed(4)})`;
}

export function lerpColor(a: RGBA, b: RGBA, p: number): RGBA {
  return {
    r: a.r + (b.r - a.r) * p,
    g: a.g + (b.g - a.g) * p,
    b: a.b + (b.b - a.b) * p,
    a: a.a + (b.a - a.a) * p,
  };
}

export const NONE: Paint = { kind: 'none' };

export function isVisible(p: Paint): boolean {
  if (p.kind === 'none') return false;
  if (p.kind === 'solid') return p.color.a > 0.001;
  return p.stops.some((s) => s.color.a > 0.001);
}

/* ───────────────────────── Interpolation de peintures ───────────────────────── */

type GradientPaint = Extract<Paint, { kind: 'linear' | 'radial' }>;

/** Convertit une peinture "simple" en gradient ayant la même structure que `like`. */
function asGradientLike(p: Paint, like: GradientPaint): GradientPaint | null {
  if (p.kind === 'linear' || p.kind === 'radial') return p;
  const color: RGBA =
    p.kind === 'solid' ? p.color : { ...(like.stops[0]?.color ?? { r: 0, g: 0, b: 0, a: 0 }), a: 0 };
  const stops = like.stops.map((s) => ({ color: { ...color }, offset: s.offset }));
  return like.kind === 'linear' ? { ...like, stops } : { ...like, stops };
}

/**
 * Interpole deux peintures. Gère solid↔solid, solid↔gradient, none↔x et
 * gradient↔gradient (même type, même nombre de stops). Les combinaisons
 * incompatibles basculent à mi-parcours.
 */
export function lerpPaint(a: Paint, b: Paint, p: number): Paint {
  const t = clamp(p, 0, 1);
  if (t <= 0) return a;
  if (t >= 1) return b;
  if (a.kind === 'none' && b.kind === 'none') return a;

  if (a.kind !== 'linear' && a.kind !== 'radial' && b.kind !== 'linear' && b.kind !== 'radial') {
    const ca = a.kind === 'solid' ? a.color : b.kind === 'solid' ? { ...b.color, a: 0 } : null;
    const cb = b.kind === 'solid' ? b.color : a.kind === 'solid' ? { ...a.color, a: 0 } : null;
    if (!ca || !cb) return t < 0.5 ? a : b;
    return { kind: 'solid', color: lerpColor(ca, cb, t) };
  }

  const like = (a.kind === 'linear' || a.kind === 'radial' ? a : b) as GradientPaint;
  const ga = asGradientLike(a, like);
  const gb = asGradientLike(b, like);
  if (!ga || !gb || ga.kind !== gb.kind || ga.stops.length !== gb.stops.length) return t < 0.5 ? a : b;

  const stops: GradientStop[] = ga.stops.map((s, i) => ({
    color: lerpColor(s.color, gb.stops[i]!.color, t),
    offset: s.offset + (gb.stops[i]!.offset - s.offset) * t,
  }));
  const lerpV = (u?: { x: number; y: number }, v?: { x: number; y: number }) =>
    u && v ? { x: u.x + (v.x - u.x) * t, y: u.y + (v.y - u.y) * t } : (u ?? v);

  if (ga.kind === 'linear' && gb.kind === 'linear') {
    return {
      kind: 'linear',
      stops,
      angle: ga.angle + (gb.angle - ga.angle) * t,
      from: lerpV(ga.from, gb.from),
      to: lerpV(ga.to, gb.to),
    };
  }
  if (ga.kind === 'radial' && gb.kind === 'radial') {
    const radius =
      ga.radius !== undefined && gb.radius !== undefined ? ga.radius + (gb.radius - ga.radius) * t : (ga.radius ?? gb.radius);
    return { kind: 'radial', stops, center: lerpV(ga.center, gb.center), radius };
  }
  return t < 0.5 ? a : b;
}

/* ───────────────────────── Peinture → style Canvas ───────────────────────── */

/**
 * Transforme une peinture en `fillStyle`/`strokeStyle`. Les gradients sont
 * calculés en coordonnées LOCALES du calque, à partir de ses bounds.
 */
export function paintToStyle(
  ctx: CanvasRenderingContext2D,
  paint: Paint,
  bounds: Rect,
): string | CanvasGradient | null {
  switch (paint.kind) {
    case 'none':
      return null;
    case 'solid':
      return rgbaToCss(paint.color);
    case 'linear': {
      let x0: number, y0: number, x1: number, y1: number;
      if (paint.from && paint.to) {
        ({ x: x0, y: y0 } = paint.from);
        ({ x: x1, y: y1 } = paint.to);
      } else {
        // Convention CSS : 0° = vers le haut, 90° = vers la droite.
        const rad = (paint.angle * Math.PI) / 180;
        const dx = Math.sin(rad);
        const dy = -Math.cos(rad);
        const half = (Math.abs(bounds.width * dx) + Math.abs(bounds.height * dy)) / 2;
        const cx = bounds.x + bounds.width / 2;
        const cy = bounds.y + bounds.height / 2;
        x0 = cx - dx * half;
        y0 = cy - dy * half;
        x1 = cx + dx * half;
        y1 = cy + dy * half;
      }
      const g = ctx.createLinearGradient(x0, y0, x1, y1);
      addStops(g, paint.stops);
      return g;
    }
    case 'radial': {
      const c = paint.center ?? { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
      const r = Math.max(0.001, paint.radius ?? Math.min(bounds.width, bounds.height) / 2);
      const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r);
      addStops(g, paint.stops);
      return g;
    }
  }
}

function addStops(g: CanvasGradient, stops: GradientStop[]): void {
  for (const s of stops) g.addColorStop(clamp(s.offset, 0, 1), rgbaToCss(s.color));
}
