/**
 * Géométrie des tracés SVG.
 *
 * - `parsePath` : parse un attribut `d` complet (M L H V C S Q T A Z, absolu/relatif)
 *   et le normalise en sous-tracés de courbes de Bézier CUBIQUES absolues.
 *   Cette représentation unique sert à :
 *     · calculer les bounds exactes (clip, pivot "center", gradients) ;
 *     · mesurer la longueur (pour `pathLength` / tracés qui se dessinent) ;
 *     · le MORPHING entre deux tracés (même nombre de segments → lerp).
 * - `shapeToD` : convertit les formes simplifiées (rect, circle, star…) en `d`.
 *
 * Module pur : seul `shapeToPath2D` touche au DOM (appelé uniquement au rendu).
 */
import type { Rect, ShapeInput } from '../types/storyboard.ts';

/** Segment cubique : [c1x, c1y, c2x, c2y, x, y] (le point de départ est la fin du segment précédent). */
export type Cubic = [number, number, number, number, number, number];

export interface Subpath {
  x: number;
  y: number;
  segs: Cubic[];
  closed: boolean;
}

export type Shape = Subpath[];

export class PathSyntaxError extends Error {
  readonly index: number;
  constructor(message: string, index: number) {
    super(message);
    this.index = index;
  }
}

/* ═══════════════════════════ Parsing ═══════════════════════════ */

const NUMBER_RE = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/y;
const ARITY: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };

const lineCubic = (x0: number, y0: number, x1: number, y1: number): Cubic => [
  x0 + (x1 - x0) / 3,
  y0 + (y1 - y0) / 3,
  x0 + ((x1 - x0) * 2) / 3,
  y0 + ((y1 - y0) * 2) / 3,
  x1,
  y1,
];

export function parsePath(d: string): Shape {
  const shape: Shape = [];
  let i = 0;
  const n = d.length;

  const skipSeparators = () => {
    while (i < n && /[\s,]/.test(d[i]!)) i++;
  };
  const readNumber = (): number => {
    skipSeparators();
    NUMBER_RE.lastIndex = i;
    const m = NUMBER_RE.exec(d);
    if (!m) throw new PathSyntaxError(`nombre attendu à l'index ${i} (trouvé « ${d.slice(i, i + 8) || 'fin'} »)`, i);
    i = NUMBER_RE.lastIndex;
    return parseFloat(m[0]);
  };
  const readFlag = (): number => {
    skipSeparators();
    const c = d[i];
    if (c !== '0' && c !== '1') throw new PathSyntaxError(`drapeau d'arc (0 ou 1) attendu à l'index ${i}`, i);
    i++;
    return c === '1' ? 1 : 0;
  };
  const nextIsNumber = () => {
    skipSeparators();
    return i < n && /[0-9+\-.]/.test(d[i]!);
  };

  let cx = 0, cy = 0; // point courant
  let sx = 0, sy = 0; // départ du sous-tracé
  let current: Subpath | null = null;
  let lastC2: [number, number] | null = null; // pour S
  let lastQ: [number, number] | null = null; // pour T

  const ensureSubpath = () => {
    if (!current || current.closed) {
      current = { x: cx, y: cy, segs: [], closed: false };
      shape.push(current);
    }
    return current;
  };

  skipSeparators();
  if (i < n && !/[Mm]/.test(d[i]!)) throw new PathSyntaxError(`le tracé doit commencer par « M » (trouvé « ${d[i]} »)`, i);

  while (true) {
    skipSeparators();
    if (i >= n) break;
    const letter = d[i]!;
    if (!/[MmLlHhVvCcSsQqTtAaZz]/.test(letter)) {
      throw new PathSyntaxError(`commande inconnue « ${letter} » à l'index ${i}`, i);
    }
    i++;
    let cmd = letter;
    let first = true;

    do {
      const rel = cmd === cmd.toLowerCase();
      const up = cmd.toUpperCase();
      const ox = rel ? cx : 0;
      const oy = rel ? cy : 0;

      switch (up) {
        case 'M': {
          const x = readNumber() + ox;
          const y = readNumber() + oy;
          if (first) {
            cx = sx = x;
            cy = sy = y;
            current = { x, y, segs: [], closed: false };
            shape.push(current);
            // Les paires suivantes sont des L implicites.
            cmd = rel ? 'l' : 'L';
          } else {
            ensureSubpath().segs.push(lineCubic(cx, cy, x, y));
            cx = x;
            cy = y;
          }
          lastC2 = lastQ = null;
          break;
        }
        case 'L':
        case 'H':
        case 'V': {
          let x = cx, y = cy;
          if (up === 'L') {
            x = readNumber() + ox;
            y = readNumber() + oy;
          } else if (up === 'H') x = readNumber() + ox;
          else y = readNumber() + oy;
          ensureSubpath().segs.push(lineCubic(cx, cy, x, y));
          cx = x;
          cy = y;
          lastC2 = lastQ = null;
          break;
        }
        case 'C':
        case 'S': {
          let x1: number, y1: number;
          if (up === 'C') {
            x1 = readNumber() + ox;
            y1 = readNumber() + oy;
          } else {
            // Réflexion du 2e point de contrôle précédent.
            x1 = lastC2 ? 2 * cx - lastC2[0] : cx;
            y1 = lastC2 ? 2 * cy - lastC2[1] : cy;
          }
          const x2 = readNumber() + ox;
          const y2 = readNumber() + oy;
          const x = readNumber() + ox;
          const y = readNumber() + oy;
          ensureSubpath().segs.push([x1, y1, x2, y2, x, y]);
          cx = x;
          cy = y;
          lastC2 = [x2, y2];
          lastQ = null;
          break;
        }
        case 'Q':
        case 'T': {
          let qx: number, qy: number;
          if (up === 'Q') {
            qx = readNumber() + ox;
            qy = readNumber() + oy;
          } else {
            qx = lastQ ? 2 * cx - lastQ[0] : cx;
            qy = lastQ ? 2 * cy - lastQ[1] : cy;
          }
          const x = readNumber() + ox;
          const y = readNumber() + oy;
          // Quadratique → cubique (élévation de degré).
          ensureSubpath().segs.push([
            cx + ((qx - cx) * 2) / 3,
            cy + ((qy - cy) * 2) / 3,
            x + ((qx - x) * 2) / 3,
            y + ((qy - y) * 2) / 3,
            x,
            y,
          ]);
          cx = x;
          cy = y;
          lastQ = [qx, qy];
          lastC2 = null;
          break;
        }
        case 'A': {
          const rx = readNumber();
          const ry = readNumber();
          const rot = readNumber();
          const large = readFlag();
          const sweep = readFlag();
          const x = readNumber() + ox;
          const y = readNumber() + oy;
          ensureSubpath().segs.push(...arcToCubics(cx, cy, rx, ry, rot, large, sweep, x, y));
          cx = x;
          cy = y;
          lastC2 = lastQ = null;
          break;
        }
        case 'Z': {
          const sp = ensureSubpath();
          if (Math.hypot(cx - sx, cy - sy) > 1e-9) sp.segs.push(lineCubic(cx, cy, sx, sy));
          sp.closed = true;
          cx = sx;
          cy = sy;
          lastC2 = lastQ = null;
          break;
        }
      }
      first = false;
    } while (ARITY[cmd.toUpperCase()]! > 0 && nextIsNumber());
  }

  return shape.filter((sp) => sp.segs.length > 0);
}

/** Conversion d'un arc elliptique SVG en cubiques (spécification SVG, annexe F.6). */
function arcToCubics(
  x1: number,
  y1: number,
  rxIn: number,
  ryIn: number,
  rotDeg: number,
  large: number,
  sweep: number,
  x2: number,
  y2: number,
): Cubic[] {
  if (x1 === x2 && y1 === y2) return [];
  let rx = Math.abs(rxIn);
  let ry = Math.abs(ryIn);
  if (rx === 0 || ry === 0) return [lineCubic(x1, y1, x2, y2)];

  const phi = (rotDeg * Math.PI) / 180;
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const dx2 = (x1 - x2) / 2;
  const dy2 = (y1 - y2) / 2;
  const x1p = cos * dx2 + sin * dy2;
  const y1p = -sin * dx2 + cos * dy2;

  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) {
    rx *= Math.sqrt(lambda);
    ry *= Math.sqrt(lambda);
  }
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  const coef = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, num / den));
  const cxp = (coef * rx * y1p) / ry;
  const cyp = (-coef * ry * x1p) / rx;
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2;
  const cy = sin * cxp + cos * cyp + (y1 + y2) / 2;

  const angle = (ux: number, uy: number, vx: number, vy: number) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const ux = (x1p - cxp) / rx;
  const uy = (y1p - cyp) / ry;
  const theta1 = angle(1, 0, ux, uy);
  let dtheta = angle(ux, uy, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!sweep && dtheta > 0) dtheta -= 2 * Math.PI;
  if (sweep && dtheta < 0) dtheta += 2 * Math.PI;

  const segments = Math.max(1, Math.ceil(Math.abs(dtheta) / (Math.PI / 2) - 1e-9));
  const delta = dtheta / segments;
  const k = (4 / 3) * Math.tan(delta / 4);
  const map = (u: number, v: number): [number, number] => [cx + rx * u * cos - ry * v * sin, cy + rx * u * sin + ry * v * cos];

  const out: Cubic[] = [];
  for (let s = 0; s < segments; s++) {
    const t1 = theta1 + s * delta;
    const t2 = t1 + delta;
    const [c1x, c1y] = map(Math.cos(t1) - k * Math.sin(t1), Math.sin(t1) + k * Math.cos(t1));
    const [c2x, c2y] = map(Math.cos(t2) + k * Math.sin(t2), Math.sin(t2) - k * Math.cos(t2));
    let [ex, ey] = map(Math.cos(t2), Math.sin(t2));
    if (s === segments - 1) {
      ex = x2; // évite l'accumulation d'erreurs numériques
      ey = y2;
    }
    out.push([c1x, c1y, c2x, c2y, ex, ey]);
  }
  return out;
}

/* ═══════════════════════════ Mesures ═══════════════════════════ */

function cubicAt(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

/** Racines dans ]0,1[ de la dérivée d'une cubique 1D (extrema). */
function extremaT(p0: number, p1: number, p2: number, p3: number): number[] {
  const a = -p0 + 3 * p1 - 3 * p2 + p3;
  const b = 2 * (p0 - 2 * p1 + p2);
  const c = p1 - p0;
  const out: number[] = [];
  if (Math.abs(a) < 1e-12) {
    if (Math.abs(b) > 1e-12) out.push(-c / b);
  } else {
    const disc = b * b - 4 * a * c;
    if (disc >= 0) {
      const sq = Math.sqrt(disc);
      out.push((-b + sq) / (2 * a), (-b - sq) / (2 * a));
    }
  }
  return out.filter((t) => t > 0 && t < 1);
}

/** Bounds exactes (extrema des cubiques). */
export function shapeBounds(shape: Shape): Rect {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const add = (x: number, y: number) => {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  };
  for (const sp of shape) {
    let px = sp.x, py = sp.y;
    add(px, py);
    for (const [c1x, c1y, c2x, c2y, x, y] of sp.segs) {
      add(x, y);
      for (const t of extremaT(px, c1x, c2x, x)) add(cubicAt(px, c1x, c2x, x, t), cubicAt(py, c1y, c2y, y, t));
      for (const t of extremaT(py, c1y, c2y, y)) add(cubicAt(px, c1x, c2x, x, t), cubicAt(py, c1y, c2y, y, t));
      px = x;
      py = y;
    }
  }
  if (!Number.isFinite(minX)) return { x: 0, y: 0, width: 0, height: 0 };
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** Longueur approchée (polyligne de 24 points par segment — largement suffisant pour les dashes). */
export function shapeLength(shape: Shape): number {
  let len = 0;
  const STEPS = 24;
  for (const sp of shape) {
    let px = sp.x, py = sp.y;
    for (const [c1x, c1y, c2x, c2y, x, y] of sp.segs) {
      let lx = px, ly = py;
      for (let s = 1; s <= STEPS; s++) {
        const t = s / STEPS;
        const qx = cubicAt(px, c1x, c2x, x, t);
        const qy = cubicAt(py, c1y, c2y, y, t);
        len += Math.hypot(qx - lx, qy - ly);
        lx = qx;
        ly = qy;
      }
      px = x;
      py = y;
    }
  }
  return len;
}

/* ═══════════════════════════ Morphing ═══════════════════════════ */

const cloneSub = (sp: Subpath): Subpath => ({ x: sp.x, y: sp.y, closed: sp.closed, segs: sp.segs.map((s) => [...s] as Cubic) });

/** Coupe une cubique en deux à t=0.5 (de Casteljau). */
function splitCubic(x0: number, y0: number, c: Cubic): [Cubic, Cubic] {
  const [c1x, c1y, c2x, c2y, x, y] = c;
  const ax = (x0 + c1x) / 2, ay = (y0 + c1y) / 2;
  const bx = (c1x + c2x) / 2, by = (c1y + c2y) / 2;
  const cx = (c2x + x) / 2, cy = (c2y + y) / 2;
  const dx = (ax + bx) / 2, dy = (ay + by) / 2;
  const ex = (bx + cx) / 2, ey = (by + cy) / 2;
  const mx = (dx + ex) / 2, my = (dy + ey) / 2;
  return [
    [ax, ay, dx, dy, mx, my],
    [ex, ey, cx, cy, x, y],
  ];
}

/** Subdivise les segments les plus longs jusqu'à atteindre `count` segments. */
function subdivideTo(sp: Subpath, count: number): Subpath {
  const out = cloneSub(sp);
  while (out.segs.length < count) {
    let best = 0, bestLen = -1, px = out.x, py = out.y, bestX = out.x, bestY = out.y;
    out.segs.forEach((s, idx) => {
      const l = Math.hypot(s[4] - px, s[5] - py) + Math.hypot(s[0] - px, s[1] - py) + Math.hypot(s[2] - s[4], s[3] - s[5]);
      if (l > bestLen) {
        bestLen = l;
        best = idx;
        bestX = px;
        bestY = py;
      }
      px = s[4];
      py = s[5];
    });
    const [a, b] = splitCubic(bestX, bestY, out.segs[best]!);
    out.segs.splice(best, 1, a, b);
  }
  return out;
}

/** Inverse le sens de parcours d'un sous-tracé. */
function reverseSub(sp: Subpath): Subpath {
  const pts: [number, number][] = [[sp.x, sp.y]];
  for (const s of sp.segs) pts.push([s[4], s[5]]);
  const segs: Cubic[] = [];
  for (let k = sp.segs.length - 1; k >= 0; k--) {
    const s = sp.segs[k]!;
    const [sx, sy] = pts[k]!;
    segs.push([s[2], s[3], s[0], s[1], sx, sy]);
  }
  const last = pts[pts.length - 1]!;
  return { x: last[0], y: last[1], closed: sp.closed, segs };
}

/** Fait démarrer un sous-tracé fermé au segment `k`. */
function rotateSub(sp: Subpath, k: number): Subpath {
  if (k === 0) return sp;
  const segs = [...sp.segs.slice(k), ...sp.segs.slice(0, k)];
  const prev = sp.segs[k - 1]!;
  return { x: prev[4], y: prev[5], closed: sp.closed, segs };
}

/**
 * Pour un sous-tracé fermé `b`, choisit le point de départ et le sens de
 * parcours qui minimisent la distance aux points de `a` → morphing sans "vrille".
 */
function alignClosed(a: Subpath, b: Subpath): Subpath {
  let best = b, bestCost = Infinity;
  for (const cand of [b, reverseSub(b)]) {
    for (let k = 0; k < cand.segs.length; k++) {
      let cost = 0;
      for (let s = 0; s < a.segs.length; s++) {
        const pa = a.segs[s]!;
        const pb = cand.segs[(s + k) % cand.segs.length]!;
        cost += (pa[4] - pb[4]) ** 2 + (pa[5] - pb[5]) ** 2;
      }
      if (cost < bestCost) {
        bestCost = cost;
        best = rotateSub(cand, k);
      }
    }
  }
  return best;
}

function degenerateAt(x: number, y: number): Subpath {
  return { x, y, closed: true, segs: [[x, y, x, y, x, y]] };
}

/**
 * Prépare deux formes pour l'interpolation : même nombre de sous-tracés,
 * même nombre de segments par sous-tracé, départs alignés.
 * Calcul coûteux → mis en cache par le moteur (une fois par paire de keyframes).
 */
export function prepareMorph(a: Shape, b: Shape): [Shape, Shape] {
  const A = a.map(cloneSub);
  const B = b.map(cloneSub);
  // Les sous-tracés manquants "poussent" depuis le centre de leur homologue.
  while (A.length < B.length) {
    const r = shapeBounds([B[A.length]!]);
    A.push(degenerateAt(r.x + r.width / 2, r.y + r.height / 2));
  }
  while (B.length < A.length) {
    const r = shapeBounds([A[B.length]!]);
    B.push(degenerateAt(r.x + r.width / 2, r.y + r.height / 2));
  }
  for (let k = 0; k < A.length; k++) {
    const count = Math.max(A[k]!.segs.length, B[k]!.segs.length);
    A[k] = subdivideTo(A[k]!, count);
    B[k] = subdivideTo(B[k]!, count);
    if (A[k]!.closed && B[k]!.closed) B[k] = alignClosed(A[k]!, B[k]!);
  }
  return [A, B];
}

/** Interpolation linéaire de deux formes préparées par `prepareMorph`. */
export function lerpShape(a: Shape, b: Shape, p: number): Shape {
  return a.map((sa, k) => {
    const sb = b[k]!;
    return {
      x: sa.x + (sb.x - sa.x) * p,
      y: sa.y + (sb.y - sa.y) * p,
      closed: sa.closed || sb.closed,
      segs: sa.segs.map((s, j) => {
        const t = sb.segs[j]!;
        return [
          s[0] + (t[0] - s[0]) * p,
          s[1] + (t[1] - s[1]) * p,
          s[2] + (t[2] - s[2]) * p,
          s[3] + (t[3] - s[3]) * p,
          s[4] + (t[4] - s[4]) * p,
          s[5] + (t[5] - s[5]) * p,
        ] as Cubic;
      }),
    };
  });
}

/** Construit un Path2D depuis la représentation cubique (navigateur uniquement). */
export function shapeToPath2D(shape: Shape): Path2D {
  const p = new Path2D();
  for (const sp of shape) {
    p.moveTo(sp.x, sp.y);
    for (const s of sp.segs) p.bezierCurveTo(s[0], s[1], s[2], s[3], s[4], s[5]);
    if (sp.closed) p.closePath();
  }
  return p;
}

/* ═══════════════════════════ Formes → d ═══════════════════════════ */

const f = (v: number) => +v.toFixed(3);

export function shapeToD(s: ShapeInput): string {
  switch (s.type) {
    case 'rect': {
      const { x, y, width: w, height: h } = s;
      const r = Math.max(0, Math.min(s.radius ?? 0, w / 2, h / 2));
      if (r === 0) return `M${f(x)},${f(y)} H${f(x + w)} V${f(y + h)} H${f(x)} Z`;
      return (
        `M${f(x + r)},${f(y)} H${f(x + w - r)} A${f(r)},${f(r)} 0 0 1 ${f(x + w)},${f(y + r)} ` +
        `V${f(y + h - r)} A${f(r)},${f(r)} 0 0 1 ${f(x + w - r)},${f(y + h)} H${f(x + r)} ` +
        `A${f(r)},${f(r)} 0 0 1 ${f(x)},${f(y + h - r)} V${f(y + r)} A${f(r)},${f(r)} 0 0 1 ${f(x + r)},${f(y)} Z`
      );
    }
    case 'circle':
      return shapeToD({ type: 'ellipse', cx: s.cx, cy: s.cy, rx: s.r, ry: s.r });
    case 'ellipse': {
      const { cx, cy, rx, ry } = s;
      return (
        `M${f(cx)},${f(cy - ry)} A${f(rx)},${f(ry)} 0 0 1 ${f(cx + rx)},${f(cy)} A${f(rx)},${f(ry)} 0 0 1 ${f(cx)},${f(cy + ry)} ` +
        `A${f(rx)},${f(ry)} 0 0 1 ${f(cx - rx)},${f(cy)} A${f(rx)},${f(ry)} 0 0 1 ${f(cx)},${f(cy - ry)} Z`
      );
    }
    case 'line':
      return `M${f(s.x1)},${f(s.y1)} L${f(s.x2)},${f(s.y2)}`;
    case 'polygon':
      return s.points.map(([x, y], k) => `${k === 0 ? 'M' : 'L'}${f(x)},${f(y)}`).join(' ') + ' Z';
    case 'star': {
      const pts: string[] = [];
      const count = Math.max(2, Math.round(s.points)) * 2;
      const rot = ((s.rotation ?? 0) - 90) * (Math.PI / 180);
      for (let k = 0; k < count; k++) {
        const r = k % 2 === 0 ? s.outer : s.inner;
        const a = rot + (k * Math.PI * 2) / count;
        pts.push(`${k === 0 ? 'M' : 'L'}${f(s.cx + Math.cos(a) * r)},${f(s.cy + Math.sin(a) * r)}`);
      }
      return pts.join(' ') + ' Z';
    }
  }
}
