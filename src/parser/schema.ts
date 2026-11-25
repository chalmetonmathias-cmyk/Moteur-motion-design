/**
 * Schéma du storyboard + boîte à outils de validation.
 *
 * Choix : pas de zod. Le schéma est petit, les messages doivent être en
 * français, contextualisés (chemin JSON) et proposer des corrections
 * ("vouliez-vous dire « spring » ?"). Un mini-validateur maison de ~200 lignes
 * fait ça mieux qu'une dépendance générique, et reste à zéro dépendance.
 *
 * Toutes les fonctions `read*` ajoutent une issue au `Validator` en cas de
 * problème et renvoient une valeur de repli : le parsing continue pour
 * remonter TOUTES les erreurs d'un coup, pas seulement la première.
 */
import type { BlendMode, ClipDirection, Issue, TransitionType } from '../types/storyboard.ts';

/* ═══════════════════════════ Tables du schéma ═══════════════════════════ */

export const ROOT_KEYS = ['$schema', 'meta', 'theme', 'assets', 'scenes', 'overlays'] as const;
export const META_KEYS = ['title', 'width', 'height', 'fps', 'duration', 'background', 'safeArea', 'grain'] as const;
export const SAFE_AREA_KEYS = ['top', 'bottom', 'left', 'right'] as const;
export const THEME_KEYS = ['palette', 'fonts'] as const;
export const SCENE_KEYS = ['id', 'start', 'duration', 'background', 'transitionIn', 'transitionOut', 'layers'] as const;
export const TRANSITION_KEYS = ['type', 'duration', 'easing'] as const;

export const LAYER_TYPES = ['text', 'path', 'image', 'group', 'component'] as const;
export type LayerType = (typeof LAYER_TYPES)[number];

export const BASE_LAYER_KEYS = [
  'id',
  'type',
  'anchor',
  'position',
  'pivot',
  'start',
  'end',
  'keyframes',
  'x',
  'y',
  'scale',
  'scaleX',
  'scaleY',
  'rotate',
  'opacity',
  'clipProgress',
  'clipDirection',
  'clipRect',
  'blend',
  'shadow',
] as const;

export const LAYER_KEYS: Record<LayerType, readonly string[]> = {
  text: [
    ...BASE_LAYER_KEYS,
    'content',
    'font',
    'size',
    'weight',
    'italic',
    'color',
    'fill',
    'stroke',
    'strokeWidth',
    'align',
    'verticalAlign',
    'letterSpacing',
    'lineHeight',
    'maxWidth',
    'highlight',
    'split',
    'value',
    'decimals',
    'thousandsSeparator',
    'decimalSeparator',
  ],
  path: [
    ...BASE_LAYER_KEYS,
    'd',
    'shape',
    'fill',
    'stroke',
    'strokeWidth',
    'lineCap',
    'lineJoin',
    'fillRule',
    'strokeDasharray',
    'strokeDashoffset',
    'pathLength',
  ],
  image: [...BASE_LAYER_KEYS, 'src', 'width', 'height', 'size'],
  group: [...BASE_LAYER_KEYS, 'layers'],
  component: [...BASE_LAYER_KEYS, 'ref', 'props'],
};

/** Propriétés animables communes à tous les calques. */
export const COMMON_ANIMATABLE = ['x', 'y', 'scale', 'scaleX', 'scaleY', 'rotate', 'opacity', 'clipProgress'] as const;

/** Propriétés animables spécifiques par type. */
export const TYPE_ANIMATABLE: Record<Exclude<LayerType, 'component'>, readonly string[]> = {
  text: ['fill', 'color', 'stroke', 'strokeWidth', 'value'],
  path: ['fill', 'stroke', 'strokeWidth', 'strokeDashoffset', 'd'],
  image: [],
  group: [],
};

export const KEYFRAME_KEYS = [
  't',
  'easing',
  ...COMMON_ANIMATABLE,
  'fill',
  'color',
  'stroke',
  'strokeWidth',
  'strokeDashoffset',
  'value',
  'd',
] as const;

export const SPLIT_KEYS = ['by', 'mode', 'start', 'stagger', 'duration', 'easing', 'order', 'from', 'cursor', 'mask'] as const;
export const SPLIT_FROM_KEYS = ['opacity', 'x', 'y', 'scale', 'rotate'] as const;
export const SHADOW_KEYS = ['color', 'blur', 'x', 'y'] as const;

export const TRANSITION_TYPES: readonly TransitionType[] = [
  'none',
  'fade',
  'slide-up',
  'slide-down',
  'slide-left',
  'slide-right',
  'zoom',
  'wipe-up',
  'wipe-down',
  'wipe-left',
  'wipe-right',
  'circle',
  'flash',
  'glitch',
];

export const CLIP_DIRECTIONS: readonly ClipDirection[] = [
  'left-to-right',
  'right-to-left',
  'top-to-bottom',
  'bottom-to-top',
  'center-x',
  'center-y',
  'center',
];

export const BLEND_MODES: readonly BlendMode[] = [
  'normal',
  'add',
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
  'color-dodge',
  'color-burn',
  'hard-light',
  'soft-light',
  'difference',
  'exclusion',
];

export const SHAPE_TYPES = ['rect', 'circle', 'ellipse', 'line', 'polygon', 'star'] as const;

export const DEFAULTS = {
  width: 1080,
  height: 1920,
  fps: 60,
  background: '#0a0a0f',
  safeArea: { top: 220, bottom: 320, left: 0, right: 0 },
  palette: { primary: '#4f9cff', accent: '#ff5e8a', text: '#ffffff', background: '#0a0a0f' },
  font: 'Inter',
  transitionDuration: 0.4,
  transitionEasing: 'ease-in-out-cubic',
  keyframeEasing: 'ease-in-out',
} as const;

/* ═══════════════════════════ Validateur ═══════════════════════════ */

export type Obj = Record<string, unknown>;

export const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

export class Validator {
  readonly issues: Issue[] = [];

  error(path: string, message: string): void {
    this.issues.push({ path: path || '(racine)', message, severity: 'error' });
  }

  warn(path: string, message: string): void {
    this.issues.push({ path: path || '(racine)', message, severity: 'warning' });
  }

  get errors(): Issue[] {
    return this.issues.filter((i) => i.severity === 'error');
  }

  get warnings(): Issue[] {
    return this.issues.filter((i) => i.severity === 'warning');
  }
}

/** Concatène un chemin JSON : join("scenes", 0) → "scenes[0]", join("a", "b") → "a.b". */
export function join(path: string, key: string | number): string {
  if (typeof key === 'number') return `${path}[${key}]`;
  return path ? `${path}.${key}` : key;
}

/** Description lisible d'une valeur reçue, pour les messages d'erreur. */
export function describe(v: unknown): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return `un tableau (${v.length} éléments)`;
  if (typeof v === 'string') return `la chaîne « ${v.length > 40 ? v.slice(0, 40) + '…' : v} »`;
  if (typeof v === 'number') return `le nombre ${v}`;
  if (typeof v === 'boolean') return `le booléen ${v}`;
  if (typeof v === 'object') return 'un objet';
  return typeof v;
}

/** Distance de Levenshtein (suggestions "vouliez-vous dire"). */
export function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]!;
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j]!;
      dp[j] = Math.min(dp[j]! + 1, dp[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length]!;
}

export function suggest(input: string, candidates: readonly string[]): string {
  let best = '', bestD = Infinity;
  for (const c of candidates) {
    const d = levenshtein(input.toLowerCase(), c.toLowerCase());
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return bestD <= Math.max(2, Math.floor(input.length / 3)) ? ` Vouliez-vous dire « ${best} » ?` : '';
}

/** Signale les clés inconnues (fautes de frappe fréquentes : "colour", "easeing"…). */
export function checkKeys(v: Validator, obj: Obj, path: string, allowed: readonly string[]): void {
  for (const k of Object.keys(obj)) {
    if (!allowed.includes(k)) v.warn(join(path, k), `propriété inconnue « ${k} », ignorée.${suggest(k, allowed)}`);
  }
}

interface NumOpts {
  min?: number;
  max?: number;
  /** Borne inférieure stricte (> au lieu de ≥). */
  gt?: number;
  integer?: boolean;
}

function checkNumber(v: Validator, raw: unknown, path: string, o: NumOpts): number | undefined {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    v.error(path, `doit être un nombre (reçu : ${describe(raw)}).`);
    return undefined;
  }
  if (o.integer && !Number.isInteger(raw)) {
    v.error(path, `doit être un entier (reçu : ${raw}).`);
    return undefined;
  }
  if (o.gt !== undefined && !(raw > o.gt)) {
    v.error(path, `doit être > ${o.gt} (reçu : ${raw}).`);
    return undefined;
  }
  if (o.min !== undefined && raw < o.min) {
    v.error(path, `doit être ≥ ${o.min} (reçu : ${raw}).`);
    return undefined;
  }
  if (o.max !== undefined && raw > o.max) {
    v.error(path, `doit être ≤ ${o.max} (reçu : ${raw}).`);
    return undefined;
  }
  return raw;
}

/** Nombre obligatoire. */
export function reqNumber(v: Validator, obj: Obj, key: string, path: string, o: NumOpts = {}): number | undefined {
  const p = join(path, key);
  if (!(key in obj)) {
    v.error(p, 'propriété obligatoire manquante.');
    return undefined;
  }
  return checkNumber(v, obj[key], p, o);
}

/** Nombre optionnel → `def` si absent (ou invalide, l'erreur étant déjà signalée). */
export function readNumber(v: Validator, obj: Obj, key: string, path: string, def: number, o: NumOpts = {}): number {
  if (obj[key] === undefined) return def;
  return checkNumber(v, obj[key], join(path, key), o) ?? def;
}

export function optNumber(v: Validator, obj: Obj, key: string, path: string, o: NumOpts = {}): number | undefined {
  if (obj[key] === undefined) return undefined;
  return checkNumber(v, obj[key], join(path, key), o);
}

export function readString(v: Validator, obj: Obj, key: string, path: string, def: string): string {
  const raw = obj[key];
  if (raw === undefined) return def;
  if (typeof raw !== 'string') {
    v.error(join(path, key), `doit être une chaîne (reçu : ${describe(raw)}).`);
    return def;
  }
  return raw;
}

export function readBool(v: Validator, obj: Obj, key: string, path: string, def: boolean): boolean {
  const raw = obj[key];
  if (raw === undefined) return def;
  if (typeof raw !== 'boolean') {
    v.error(join(path, key), `doit être true ou false (reçu : ${describe(raw)}).`);
    return def;
  }
  return raw;
}

export function readEnum<T extends string>(v: Validator, obj: Obj, key: string, path: string, values: readonly T[], def: T): T {
  const raw = obj[key];
  if (raw === undefined) return def;
  if (typeof raw !== 'string' || !values.includes(raw as T)) {
    const hint = typeof raw === 'string' ? suggest(raw, values) : '';
    v.error(join(path, key), `valeur invalide (${describe(raw)}). Attendu : ${values.join(', ')}.${hint}`);
    return def;
  }
  return raw as T;
}

export function readVec2(v: Validator, raw: unknown, path: string): { x: number; y: number } | undefined {
  if (!isObj(raw)) {
    v.error(path, `doit être un objet { "x": nombre, "y": nombre } (reçu : ${describe(raw)}).`);
    return undefined;
  }
  checkKeys(v, raw, path, ['x', 'y']);
  const x = reqNumber(v, raw, 'x', path);
  const y = reqNumber(v, raw, 'y', path);
  return x === undefined || y === undefined ? undefined : { x, y };
}

export function readArray(v: Validator, obj: Obj, key: string, path: string, required: boolean): unknown[] | undefined {
  const raw = obj[key];
  if (raw === undefined) {
    if (required) v.error(join(path, key), 'propriété obligatoire manquante (tableau attendu).');
    return undefined;
  }
  if (!Array.isArray(raw)) {
    v.error(join(path, key), `doit être un tableau (reçu : ${describe(raw)}).`);
    return undefined;
  }
  return raw;
}
