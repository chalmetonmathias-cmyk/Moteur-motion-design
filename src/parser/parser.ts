/**
 * Parser du storyboard : JSON brut → modèle normalisé (types/storyboard.ts).
 *
 * Étapes :
 *   1. JSON.parse avec message localisé (ligne/colonne).
 *   2. theme  → palette résolue (nécessaire pour les "$couleurs").
 *   3. meta, assets.
 *   4. scènes : calcul des débuts (chaînage auto + chevauchement des transitions).
 *   5. calques : validation, valeurs par défaut, expansion des composants.
 *   6. lints : safe-areas, durée.
 *
 * Toutes les erreurs portent un chemin JSON exact. Le parsing va jusqu'au
 * bout pour remonter un maximum de problèmes en une passe.
 */
import type {
  ClipDirection,
  EasingSpec,
  FontRequest,
  GroupLayer,
  ImageLayer,
  Issue,
  Keyframe,
  Layer,
  LayerBase,
  NumberProp,
  Paint,
  ParseResult,
  PathLayer,
  RGBA,
  SafeArea,
  Scene,
  Shadow,
  ShapeInput,
  SplitSpec,
  TextLayer,
  Transition,
  TransitionType,
  Vec2,
} from '../types/storyboard.ts';
import { NONE, parseColor } from '../engine/color.ts';
import { EASING_NAMES, parseEasing } from '../engine/easing.ts';
import { PathSyntaxError, parsePath, shapeToD } from '../engine/path.ts';
import { getComponent, listComponents } from '../components/index.ts';
import type { ResolvedProps } from '../components/types.ts';
import {
  BLEND_MODES,
  CLIP_DIRECTIONS,
  COMMON_ANIMATABLE,
  DEFAULTS,
  KEYFRAME_KEYS,
  LAYER_KEYS,
  LAYER_TYPES,
  META_KEYS,
  ROOT_KEYS,
  SAFE_AREA_KEYS,
  SCENE_KEYS,
  SHADOW_KEYS,
  SHAPE_TYPES,
  SPLIT_FROM_KEYS,
  SPLIT_KEYS,
  THEME_KEYS,
  TRANSITION_KEYS,
  TRANSITION_TYPES,
  TYPE_ANIMATABLE,
  Validator,
  checkKeys,
  describe,
  isObj,
  join,
  optNumber,
  readArray,
  readBool,
  readEnum,
  readNumber,
  readString,
  readVec2,
  reqNumber,
  suggest,
  type LayerType,
  type Obj,
} from './schema.ts';

const MAX_DEPTH = 24;

/** État partagé pendant un parsing. */
interface Ctx {
  v: Validator;
  palette: Record<string, RGBA>;
  fonts: string[];
  assets: Record<string, string>;
  width: number;
  height: number;
  safeArea: SafeArea;
  fontFaces: Map<string, FontRequest>;
  images: Set<string>;
  depth: number;
}

/* ═══════════════════════════ Point d'entrée ═══════════════════════════ */

export function parseStoryboardText(text: string): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (e) {
    return {
      ok: false,
      errors: [{ path: '(racine)', message: jsonErrorMessage(text, e), severity: 'error' }],
      warnings: [],
    };
  }
  return parseStoryboard(json);
}

function jsonErrorMessage(text: string, e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  const lc = /line (\d+) column (\d+)/i.exec(msg);
  if (lc) return `JSON invalide (ligne ${lc[1]}, colonne ${lc[2]}) : ${msg}`;
  const pos = /position (\d+)/i.exec(msg);
  if (pos) {
    const before = text.slice(0, Number(pos[1]));
    const line = before.split('\n').length;
    const col = before.length - before.lastIndexOf('\n');
    return `JSON invalide (ligne ${line}, colonne ${col}) : ${msg}`;
  }
  return `JSON invalide : ${msg}`;
}

export function parseStoryboard(json: unknown): ParseResult {
  const v = new Validator();
  if (!isObj(json)) {
    v.error('', `le storyboard doit être un objet JSON (reçu : ${describe(json)}).`);
    return { ok: false, errors: v.errors, warnings: v.warnings };
  }
  checkKeys(v, json, '', ROOT_KEYS);

  /* ── theme ── */
  const themeRaw = json.theme === undefined ? {} : json.theme;
  const palette: Record<string, RGBA> = {};
  for (const [k, c] of Object.entries(DEFAULTS.palette)) palette[k] = parseColor(c)!;
  let fonts: string[] = [];
  if (!isObj(themeRaw)) v.error('theme', `doit être un objet (reçu : ${describe(themeRaw)}).`);
  else {
    checkKeys(v, themeRaw, 'theme', THEME_KEYS);
    if (themeRaw.palette !== undefined) {
      if (!isObj(themeRaw.palette)) v.error('theme.palette', 'doit être un objet { nom: couleur }.');
      else
        for (const [name, raw] of Object.entries(themeRaw.palette)) {
          const p = join('theme.palette', name);
          if (typeof raw !== 'string') v.error(p, `couleur attendue (reçu : ${describe(raw)}).`);
          else {
            const c = parseColor(raw);
            if (!c) v.error(p, `couleur invalide « ${raw} ». Formats : #rrggbb, #rrggbbaa, rgb(), rgba(), hsl().`);
            else palette[name] = c;
          }
        }
    }
    const fr = readArray(v, themeRaw, 'fonts', 'theme', false);
    if (fr)
      fonts = fr.filter((f, i) => {
        if (typeof f !== 'string' || !f.trim()) {
          v.error(join('theme.fonts', i), 'nom de police attendu (chaîne).');
          return false;
        }
        return true;
      }) as string[];
  }

  /* ── meta ── */
  if (!isObj(json.meta)) {
    v.error('meta', json.meta === undefined ? 'section obligatoire manquante.' : `doit être un objet (reçu : ${describe(json.meta)}).`);
    return { ok: false, errors: v.errors, warnings: v.warnings };
  }
  const m = json.meta;
  checkKeys(v, m, 'meta', META_KEYS);
  const width = readNumber(v, m, 'width', 'meta', DEFAULTS.width, { integer: true, min: 16, max: 4096 });
  const height = readNumber(v, m, 'height', 'meta', DEFAULTS.height, { integer: true, min: 16, max: 4096 });
  const fps = readNumber(v, m, 'fps', 'meta', DEFAULTS.fps, { integer: true, min: 1, max: 120 });
  const safeArea: SafeArea = { ...DEFAULTS.safeArea };
  if (m.safeArea !== undefined) {
    if (!isObj(m.safeArea)) v.error('meta.safeArea', 'doit être un objet { top, bottom, left, right }.');
    else {
      checkKeys(v, m.safeArea, 'meta.safeArea', SAFE_AREA_KEYS);
      for (const k of SAFE_AREA_KEYS) safeArea[k] = readNumber(v, m.safeArea, k, 'meta.safeArea', safeArea[k], { min: 0 });
    }
  }

  const ctx: Ctx = {
    v,
    palette,
    fonts,
    assets: {},
    width,
    height,
    safeArea,
    fontFaces: new Map(),
    images: new Set(),
    depth: 0,
  };

  const background = m.background === undefined ? solid(parseColor(DEFAULTS.background)!) : (resolvePaint(ctx, m.background, 'meta.background') ?? NONE);
  const grain = readNumber(v, m, 'grain', 'meta', 0, { min: 0, max: 1 });
  const title = readString(v, m, 'title', 'meta', 'Sans titre');

  /* ── assets ── */
  if (json.assets !== undefined) {
    if (!isObj(json.assets)) v.error('assets', 'doit être un objet { clé: url }.');
    else
      for (const [k, url] of Object.entries(json.assets)) {
        if (typeof url !== 'string') v.error(join('assets', k), `URL attendue (reçu : ${describe(url)}).`);
        else ctx.assets[k] = url;
      }
  }

  /* ── scènes ── */
  const scenesRaw = readArray(v, json, 'scenes', '', true) ?? [];
  if (Array.isArray(json.scenes) && scenesRaw.length === 0) v.error('scenes', 'au moins une scène est requise.');
  const scenes: Scene[] = [];
  const sceneIds = new Set<string>();
  scenesRaw.forEach((raw, i) => {
    const s = parseScene(ctx, raw, join('scenes', i), i, scenes[scenes.length - 1]);
    if (!s) return;
    if (sceneIds.has(s.id)) v.warn(join(join('scenes', i), 'id'), `id de scène dupliqué « ${s.id} ».`);
    sceneIds.add(s.id);
    scenes.push(s);
  });

  /* ── overlays ── */
  const overlaysRaw = readArray(v, json, 'overlays', '', false) ?? [];
  const overlays = parseLayers(ctx, overlaysRaw, 'overlays');

  /* ── durée ── */
  const contentEnd = scenes.reduce((acc, s) => Math.max(acc, s.end), 0);
  let duration = contentEnd;
  if (m.duration !== undefined) {
    const d = optNumber(v, m, 'duration', 'meta', { gt: 0 });
    if (d !== undefined) {
      duration = d;
      if (d < contentEnd - 1e-6)
        v.warn('meta.duration', `les scènes se terminent à ${fmt(contentEnd)} s mais meta.duration = ${fmt(d)} s : la fin sera coupée.`);
      else if (d > contentEnd + 0.5) v.warn('meta.duration', `${fmt(d - contentEnd)} s vides après la dernière scène (fin à ${fmt(contentEnd)} s).`);
    }
  }
  if (duration <= 0) v.error('meta.duration', 'durée totale nulle : ajoutez des scènes ou meta.duration.');

  /* ── polices du thème (préchargées même si non utilisées) ── */
  for (const f of fonts) addFont(ctx, f, 400, false);

  /* ── lint safe-areas ── */
  for (const s of scenes) lintSafeArea(ctx, s.layers, true);
  lintSafeArea(ctx, overlays, true);

  if (v.errors.length > 0) return { ok: false, errors: v.errors, warnings: v.warnings };

  return {
    ok: true,
    warnings: v.warnings,
    storyboard: {
      meta: { title, width, height, fps, duration, background, safeArea, grain },
      theme: { palette, fonts },
      assets: ctx.assets,
      scenes,
      overlays,
      fontFaces: [...ctx.fontFaces.values()],
      images: [...ctx.images],
    },
  };
}

const fmt = (n: number) => String(+n.toFixed(3));
const solid = (color: RGBA): Paint => ({ kind: 'solid', color });

/* ═══════════════════════════ Scènes & transitions ═══════════════════════════ */

function parseScene(ctx: Ctx, raw: unknown, path: string, index: number, prev: Scene | undefined): Scene | null {
  const { v } = ctx;
  if (!isObj(raw)) {
    v.error(path, `une scène doit être un objet (reçu : ${describe(raw)}).`);
    return null;
  }
  checkKeys(v, raw, path, SCENE_KEYS);
  const id = readString(v, raw, 'id', path, `scene-${index + 1}`);
  const duration = reqNumber(v, raw, 'duration', path, { gt: 0 }) ?? 1;
  const transitionIn = raw.transitionIn === undefined ? undefined : parseTransition(ctx, raw.transitionIn, join(path, 'transitionIn'));
  const transitionOut = raw.transitionOut === undefined ? undefined : parseTransition(ctx, raw.transitionOut, join(path, 'transitionOut'));
  for (const [tr, key] of [
    [transitionIn, 'transitionIn'],
    [transitionOut, 'transitionOut'],
  ] as const) {
    if (tr && tr.duration > duration / 2 + 1e-9)
      v.warn(join(path, key), `transition de ${fmt(tr.duration)} s pour une scène de ${fmt(duration)} s : elle occupe plus de la moitié de la scène.`);
  }

  // Chaînage automatique : la scène démarre à la fin de la précédente, moins
  // le chevauchement nécessaire aux transitions (sortie de l'une / entrée de l'autre).
  let start: number;
  const explicit = optNumber(v, raw, 'start', path, { min: 0 });
  if (explicit !== undefined) start = explicit;
  else if (!prev) start = 0;
  else {
    const overlap = Math.min(Math.max(prev.transitionOut?.duration ?? 0, transitionIn?.duration ?? 0), prev.duration, duration);
    start = Math.max(0, prev.end - overlap);
  }

  const background = raw.background === undefined ? undefined : resolvePaint(ctx, raw.background, join(path, 'background'));
  const layersRaw = readArray(v, raw, 'layers', path, true) ?? [];
  const layers = parseLayers(ctx, layersRaw, join(path, 'layers'));

  return { id, index, path, start, duration, end: start + duration, background, transitionIn, transitionOut, layers };
}

function parseTransition(ctx: Ctx, raw: unknown, path: string): Transition | undefined {
  const { v } = ctx;
  if (typeof raw === 'string') {
    if (!TRANSITION_TYPES.includes(raw as TransitionType)) {
      v.error(path, `transition inconnue « ${raw} ». Attendu : ${TRANSITION_TYPES.join(', ')}.${suggest(raw, TRANSITION_TYPES)}`);
      return undefined;
    }
    return raw === 'none' ? undefined : { type: raw as TransitionType, duration: DEFAULTS.transitionDuration, easing: DEFAULTS.transitionEasing };
  }
  if (!isObj(raw)) {
    v.error(path, `transition attendue : chaîne ("fade") ou objet { type, duration, easing } (reçu : ${describe(raw)}).`);
    return undefined;
  }
  checkKeys(v, raw, path, TRANSITION_KEYS);
  if (raw.type === undefined) v.error(join(path, 'type'), 'propriété obligatoire manquante.');
  const type = readEnum(v, raw, 'type', path, TRANSITION_TYPES, 'fade');
  const duration = readNumber(v, raw, 'duration', path, DEFAULTS.transitionDuration, { gt: 0 });
  const easing = resolveEasing(ctx, raw.easing, join(path, 'easing'), DEFAULTS.transitionEasing);
  return type === 'none' ? undefined : { type, duration, easing };
}

/* ═══════════════════════════ Calques ═══════════════════════════ */

function parseLayers(ctx: Ctx, raws: unknown[], path: string): Layer[] {
  const out: Layer[] = [];
  const ids = new Set<string>();
  raws.forEach((raw, i) => {
    const l = parseLayer(ctx, raw, join(path, i), i);
    if (!l) return;
    if (ids.has(l.id)) ctx.v.warn(join(join(path, i), 'id'), `id de calque dupliqué « ${l.id} » dans ce niveau.`);
    ids.add(l.id);
    out.push(l);
  });
  return out;
}

function parseLayer(ctx: Ctx, raw: unknown, path: string, index: number): Layer | null {
  const { v } = ctx;
  if (!isObj(raw)) {
    v.error(path, `un calque doit être un objet (reçu : ${describe(raw)}).`);
    return null;
  }
  if (ctx.depth > MAX_DEPTH) {
    v.error(path, `imbrication trop profonde (> ${MAX_DEPTH} niveaux) — boucle de composants ?`);
    return null;
  }
  if (raw.type === undefined) {
    v.error(join(path, 'type'), `propriété obligatoire manquante. Attendu : ${LAYER_TYPES.join(', ')}.`);
    return null;
  }
  const type = readEnum<LayerType | ''>(v, raw, 'type', path, LAYER_TYPES, '');
  if (type === '') return null;
  checkKeys(v, raw, path, LAYER_KEYS[type]);

  ctx.depth++;
  try {
    switch (type) {
      case 'text':
        return parseText(ctx, raw, path, index);
      case 'path':
        return parsePathLayer(ctx, raw, path, index);
      case 'image':
        return parseImage(ctx, raw, path, index);
      case 'group':
        return parseGroup(ctx, raw, path, index);
      case 'component':
        return parseComponent(ctx, raw, path, index);
    }
  } finally {
    ctx.depth--;
  }
}

/** Propriétés communes (position, temps, valeurs statiques, keyframes, clip, blend, ombre). */
function parseBase(ctx: Ctx, o: Obj, path: string, type: Exclude<LayerType, 'component'>, index: number, defaultAnchor?: Vec2): LayerBase {
  const { v } = ctx;
  const id = readString(v, o, 'id', path, `${type}-${index + 1}`);

  let anchor: Vec2 | undefined = defaultAnchor;
  if (o.anchor !== undefined && o.position !== undefined) v.warn(join(path, 'position'), '« anchor » et « position » sont des alias : « anchor » est utilisé.');
  const anchorRaw = o.anchor ?? o.position;
  if (anchorRaw !== undefined) anchor = readVec2(v, anchorRaw, join(path, o.anchor !== undefined ? 'anchor' : 'position')) ?? anchor;

  let pivot: Vec2 | 'center' = { x: 0, y: 0 };
  if (o.pivot === 'center') pivot = 'center';
  else if (o.pivot !== undefined) pivot = readVec2(v, o.pivot, join(path, 'pivot')) ?? pivot;

  const start = readNumber(v, o, 'start', path, 0);
  const end = optNumber(v, o, 'end', path);
  if (end !== undefined && end <= start) v.warn(join(path, 'end'), `end (${end}) ≤ start (${start}) : le calque ne sera jamais visible.`);

  const base: Record<NumberProp, number> = {
    x: readNumber(v, o, 'x', path, 0),
    y: readNumber(v, o, 'y', path, 0),
    scale: readNumber(v, o, 'scale', path, 1),
    scaleX: readNumber(v, o, 'scaleX', path, 1),
    scaleY: readNumber(v, o, 'scaleY', path, 1),
    rotate: readNumber(v, o, 'rotate', path, 0),
    opacity: readNumber(v, o, 'opacity', path, 1, { min: 0, max: 1 }),
    clipProgress: readNumber(v, o, 'clipProgress', path, 1, { min: 0, max: 1 }),
    strokeWidth: 0,
    strokeDashoffset: 0,
    value: 0,
  };

  const keyframes = o.keyframes === undefined ? [] : parseKeyframes(ctx, o.keyframes, join(path, 'keyframes'), type);
  const clipDirection = readEnum<ClipDirection>(v, o, 'clipDirection', path, CLIP_DIRECTIONS, 'left-to-right');

  let clipRect: LayerBase['clipRect'];
  if (o.clipRect !== undefined) {
    const cp = join(path, 'clipRect');
    if (!isObj(o.clipRect)) v.error(cp, 'doit être un objet { x, y, width, height }.');
    else {
      checkKeys(v, o.clipRect, cp, ['x', 'y', 'width', 'height']);
      const x = reqNumber(v, o.clipRect, 'x', cp);
      const y = reqNumber(v, o.clipRect, 'y', cp);
      const w = reqNumber(v, o.clipRect, 'width', cp, { min: 0 });
      const h = reqNumber(v, o.clipRect, 'height', cp, { min: 0 });
      if (x !== undefined && y !== undefined && w !== undefined && h !== undefined) clipRect = { x, y, width: w, height: h };
    }
  }

  const blend = o.blend === undefined ? undefined : readEnum(v, o, 'blend', path, BLEND_MODES, 'normal');

  let shadow: Shadow | undefined;
  if (o.shadow !== undefined) {
    const sp = join(path, 'shadow');
    if (!isObj(o.shadow)) v.error(sp, 'doit être un objet { color, blur, x, y }.');
    else {
      checkKeys(v, o.shadow, sp, SHADOW_KEYS);
      shadow = {
        color: o.shadow.color === undefined ? { r: 0, g: 0, b: 0, a: 0.5 } : (resolveColor(ctx, o.shadow.color, join(sp, 'color')) ?? { r: 0, g: 0, b: 0, a: 0.5 }),
        blur: readNumber(v, o.shadow, 'blur', sp, 24, { min: 0 }),
        x: readNumber(v, o.shadow, 'x', sp, 0),
        y: readNumber(v, o.shadow, 'y', sp, 0),
      };
    }
  }

  return { id, path, anchor, pivot, start, end, base, keyframes, clipDirection, clipRect, blend, shadow };
}

/* ─────────────── text ─────────────── */

function parseText(ctx: Ctx, o: Obj, path: string, index: number): TextLayer {
  const { v } = ctx;
  const base = parseBase(ctx, o, path, 'text', index, { x: ctx.width / 2, y: ctx.height / 2 });

  let content = '';
  if (o.content === undefined) v.error(join(path, 'content'), 'propriété obligatoire manquante.');
  else if (typeof o.content === 'string') content = o.content;
  else if (typeof o.content === 'number') content = String(o.content);
  else v.error(join(path, 'content'), `doit être une chaîne (reçu : ${describe(o.content)}).`);

  const font = readString(v, o, 'font', path, ctx.fonts[0] ?? DEFAULTS.font);
  const size = readNumber(v, o, 'size', path, 64, { gt: 0 });
  const weight = readNumber(v, o, 'weight', path, 700, { min: 1, max: 1000 });
  const italic = readBool(v, o, 'italic', path, false);
  addFont(ctx, font, weight, italic);

  if (o.color !== undefined && o.fill !== undefined) v.warn(join(path, 'fill'), '« color » et « fill » sont des alias : « color » est utilisé.');
  const fillKey = o.color !== undefined ? 'color' : 'fill';
  const fill = o[fillKey] === undefined ? solid(ctx.palette.text!) : (resolvePaint(ctx, o[fillKey], join(path, fillKey)) ?? NONE);
  const stroke = o.stroke === undefined ? NONE : (resolvePaint(ctx, o.stroke, join(path, 'stroke')) ?? NONE);
  base.base.strokeWidth = readNumber(v, o, 'strokeWidth', path, stroke.kind === 'none' ? 0 : 2, { min: 0 });
  base.base.value = readNumber(v, o, 'value', path, 0);

  const split = o.split === undefined ? undefined : parseSplit(ctx, o.split, join(path, 'split'), size);

  return {
    ...base,
    type: 'text',
    content,
    font,
    size,
    weight,
    italic,
    fill,
    stroke,
    align: readEnum(v, o, 'align', path, ['left', 'center', 'right'] as const, 'center'),
    verticalAlign: readEnum(v, o, 'verticalAlign', path, ['top', 'middle', 'bottom'] as const, 'middle'),
    letterSpacing: readNumber(v, o, 'letterSpacing', path, 0),
    lineHeight: readNumber(v, o, 'lineHeight', path, 1.15, { gt: 0 }),
    maxWidth: optNumber(v, o, 'maxWidth', path, { gt: 0 }),
    highlight: o.highlight === undefined ? solid(ctx.palette.accent!) : (resolvePaint(ctx, o.highlight, join(path, 'highlight')) ?? NONE),
    split,
    decimals: readNumber(v, o, 'decimals', path, 0, { integer: true, min: 0, max: 6 }),
    thousandsSeparator: readString(v, o, 'thousandsSeparator', path, ''),
    decimalSeparator: readString(v, o, 'decimalSeparator', path, '.'),
  };
}

const SPLIT_SHORTHANDS: Record<string, Pick<SplitSpec, 'by' | 'mode'>> = {
  chars: { by: 'char', mode: 'stagger' },
  words: { by: 'word', mode: 'stagger' },
  lines: { by: 'line', mode: 'stagger' },
  typewriter: { by: 'char', mode: 'typewriter' },
};

function parseSplit(ctx: Ctx, raw: unknown, path: string, size: number): SplitSpec | undefined {
  const { v } = ctx;
  let o: Obj;
  if (typeof raw === 'string') {
    const sh = SPLIT_SHORTHANDS[raw];
    if (!sh) {
      v.error(path, `raccourci inconnu « ${raw} ». Attendu : ${Object.keys(SPLIT_SHORTHANDS).join(', ')} ou un objet.${suggest(raw, Object.keys(SPLIT_SHORTHANDS))}`);
      return undefined;
    }
    o = { ...sh };
  } else if (isObj(raw)) {
    checkKeys(v, raw, path, SPLIT_KEYS);
    o = raw;
  } else {
    v.error(path, `doit être un objet ou un raccourci ("chars", "words", "lines", "typewriter") (reçu : ${describe(raw)}).`);
    return undefined;
  }

  const by = readEnum(v, o, 'by', path, ['char', 'word', 'line'] as const, 'char');
  const mode = readEnum(v, o, 'mode', path, ['stagger', 'typewriter'] as const, 'stagger');
  const typewriter = mode === 'typewriter';
  const defStagger = typewriter ? 0.045 : by === 'char' ? 0.035 : by === 'word' ? 0.09 : 0.16;

  const from = { opacity: 0, x: 0, y: typewriter ? 0 : Math.round(size * 0.45), scale: 1, rotate: 0 };
  if (o.from !== undefined) {
    const fp = join(path, 'from');
    if (!isObj(o.from)) v.error(fp, 'doit être un objet { opacity, x, y, scale, rotate }.');
    else {
      checkKeys(v, o.from, fp, SPLIT_FROM_KEYS);
      for (const k of SPLIT_FROM_KEYS) from[k] = readNumber(v, o.from, k, fp, from[k]);
    }
  }

  return {
    by,
    mode,
    start: readNumber(v, o, 'start', path, 0, { min: 0 }),
    stagger: readNumber(v, o, 'stagger', path, defStagger, { min: 0 }),
    duration: readNumber(v, o, 'duration', path, typewriter ? 0 : 0.6, { min: 0 }),
    easing: resolveEasing(ctx, o.easing, join(path, 'easing'), 'cubic-bezier(0.16,1,0.3,1)'),
    order: readEnum(v, o, 'order', path, ['forward', 'reverse', 'center', 'random'] as const, 'forward'),
    from,
    cursor: readBool(v, o, 'cursor', path, typewriter),
    mask: readBool(v, o, 'mask', path, false),
  };
}

/* ─────────────── path ─────────────── */

function parsePathLayer(ctx: Ctx, o: Obj, path: string, index: number): PathLayer {
  const { v } = ctx;
  const base = parseBase(ctx, o, path, 'path', index);

  let d = '';
  if (o.d !== undefined && o.shape !== undefined) v.warn(join(path, 'shape'), '« d » et « shape » fournis : « d » est utilisé.');
  if (o.d !== undefined) d = validateD(ctx, o.d, join(path, 'd')) ?? '';
  else if (o.shape !== undefined) d = parseShape(ctx, o.shape, join(path, 'shape')) ?? '';
  else v.error(path, 'un calque path nécessite « d » (tracé SVG) ou « shape » (forme simple).');

  const stroke = o.stroke === undefined ? NONE : (resolvePaint(ctx, o.stroke, join(path, 'stroke')) ?? NONE);
  let fill: Paint;
  if (o.fill !== undefined) fill = resolvePaint(ctx, o.fill, join(path, 'fill')) ?? NONE;
  else fill = stroke.kind === 'none' ? solid(ctx.palette.text!) : NONE;

  base.base.strokeWidth = readNumber(v, o, 'strokeWidth', path, stroke.kind === 'none' ? 0 : 2, { min: 0 });
  base.base.strokeDashoffset = readNumber(v, o, 'strokeDashoffset', path, 0);
  const pathLength = optNumber(v, o, 'pathLength', path, { gt: 0 });

  let dashArray: number[] | undefined;
  const da = readArray(v, o, 'strokeDasharray', path, false);
  if (da) {
    dashArray = [];
    da.forEach((n, i) => {
      if (typeof n !== 'number' || n < 0 || !Number.isFinite(n)) v.error(join(join(path, 'strokeDasharray'), i), `nombre ≥ 0 attendu (reçu : ${describe(n)}).`);
      else dashArray!.push(n);
    });
    if (dashArray.length === 0) dashArray = undefined;
  } else if (pathLength !== undefined) {
    // Raccourci "trait qui se dessine" : pathLength seul ⇒ dasharray = [L, L].
    dashArray = [pathLength, pathLength];
  }

  return {
    ...base,
    type: 'path',
    d,
    fill,
    stroke,
    lineCap: readEnum(v, o, 'lineCap', path, ['butt', 'round', 'square'] as const, 'round'),
    lineJoin: readEnum(v, o, 'lineJoin', path, ['miter', 'round', 'bevel'] as const, 'round'),
    fillRule: readEnum(v, o, 'fillRule', path, ['nonzero', 'evenodd'] as const, 'nonzero'),
    dashArray,
    pathLength,
  };
}

function validateD(ctx: Ctx, raw: unknown, path: string): string | undefined {
  if (typeof raw !== 'string') {
    ctx.v.error(path, `tracé SVG attendu (chaîne) (reçu : ${describe(raw)}).`);
    return undefined;
  }
  try {
    if (parsePath(raw).length === 0) ctx.v.warn(path, 'tracé vide.');
    return raw;
  } catch (e) {
    ctx.v.error(path, `tracé SVG invalide : ${e instanceof PathSyntaxError ? e.message : String(e)}.`);
    return undefined;
  }
}

function parseShape(ctx: Ctx, raw: unknown, path: string): string | undefined {
  const { v } = ctx;
  if (!isObj(raw)) {
    v.error(path, `forme attendue { "type": "rect" | "circle" | … } (reçu : ${describe(raw)}).`);
    return undefined;
  }
  const type = readEnum<(typeof SHAPE_TYPES)[number] | ''>(v, raw, 'type', path, SHAPE_TYPES, '');
  if (type === '') {
    if (raw.type === undefined) v.error(join(path, 'type'), `propriété obligatoire manquante. Attendu : ${SHAPE_TYPES.join(', ')}.`);
    return undefined;
  }
  const fields: Record<typeof type, string[]> = {
    rect: ['x', 'y', 'width', 'height'],
    circle: ['cx', 'cy', 'r'],
    ellipse: ['cx', 'cy', 'rx', 'ry'],
    line: ['x1', 'y1', 'x2', 'y2'],
    polygon: [],
    star: ['cx', 'cy', 'points', 'outer', 'inner'],
  };
  const optional: Record<typeof type, string[]> = { rect: ['radius'], circle: [], ellipse: [], line: [], polygon: ['points'], star: ['rotation'] };
  checkKeys(v, raw, path, ['type', ...fields[type], ...optional[type]]);
  let ok = true;
  for (const f of fields[type]) if (reqNumber(v, raw, f, path) === undefined) ok = false;
  for (const f of optional[type]) if (f !== 'points' && raw[f] !== undefined && optNumber(v, raw, f, path) === undefined) ok = false;
  if (type === 'polygon') {
    const pts = raw.points;
    if (!Array.isArray(pts) || pts.length < 2 || !pts.every((p) => Array.isArray(p) && p.length === 2 && p.every((n) => typeof n === 'number'))) {
      v.error(join(path, 'points'), 'tableau de points [[x,y], …] (au moins 2) attendu.');
      ok = false;
    }
  }
  return ok ? shapeToD(raw as unknown as ShapeInput) : undefined;
}

/* ─────────────── image ─────────────── */

function parseImage(ctx: Ctx, o: Obj, path: string, index: number): ImageLayer {
  const { v } = ctx;
  const base = parseBase(ctx, o, path, 'image', index, { x: ctx.width / 2, y: ctx.height / 2 });
  let src = '';
  if (typeof o.src !== 'string' || !o.src) v.error(join(path, 'src'), o.src === undefined ? 'propriété obligatoire manquante.' : `URL attendue (reçu : ${describe(o.src)}).`);
  else src = resolveAsset(ctx, o.src, join(path, 'src')) ?? '';
  if (src) ctx.images.add(src);

  let width = optNumber(v, o, 'width', path, { gt: 0 });
  let height = optNumber(v, o, 'height', path, { gt: 0 });
  if (o.size !== undefined) {
    const sp = join(path, 'size');
    if (!isObj(o.size)) v.error(sp, 'doit être un objet { width, height }.');
    else {
      checkKeys(v, o.size, sp, ['width', 'height']);
      width ??= optNumber(v, o.size, 'width', sp, { gt: 0 });
      height ??= optNumber(v, o.size, 'height', sp, { gt: 0 });
    }
  }
  return { ...base, type: 'image', src, width, height };
}

function resolveAsset(ctx: Ctx, src: string, path: string): string | undefined {
  if (!src.startsWith('@')) return src;
  const key = src.slice(1);
  const url = ctx.assets[key];
  if (url === undefined) {
    ctx.v.error(path, `asset inconnu « ${src} » : déclarez-le dans « assets ».${suggest(key, Object.keys(ctx.assets))}`);
    return undefined;
  }
  return url;
}

/* ─────────────── group ─────────────── */

function parseGroup(ctx: Ctx, o: Obj, path: string, index: number): GroupLayer {
  const base = parseBase(ctx, o, path, 'group', index);
  const layersRaw = readArray(ctx.v, o, 'layers', path, true) ?? [];
  if (Array.isArray(o.layers) && layersRaw.length === 0) ctx.v.warn(join(path, 'layers'), 'groupe vide.');
  return { ...base, type: 'group', layers: parseLayers(ctx, layersRaw, join(path, 'layers')) };
}

/* ─────────────── component ─────────────── */

function parseComponent(ctx: Ctx, o: Obj, path: string, index: number): GroupLayer | null {
  const { v } = ctx;
  if (typeof o.ref !== 'string') {
    v.error(join(path, 'ref'), o.ref === undefined ? 'propriété obligatoire manquante (nom du composant).' : `nom de composant attendu (reçu : ${describe(o.ref)}).`);
    return null;
  }
  const def = getComponent(o.ref);
  if (!def) {
    const names = listComponents().map((c) => c.name);
    v.error(join(path, 'ref'), `composant inconnu « ${o.ref} ». Disponibles : ${names.join(', ')}.${suggest(o.ref, names)}`);
    return null;
  }
  const propsRaw = o.props === undefined ? {} : o.props;
  const pp = join(path, 'props');
  if (!isObj(propsRaw)) {
    v.error(pp, `doit être un objet (reçu : ${describe(propsRaw)}).`);
    return null;
  }

  // Validation des props selon la spec du composant.
  checkKeys(v, propsRaw, pp, Object.keys(def.props));
  const props: ResolvedProps = {};
  let ok = true;
  for (const [name, spec] of Object.entries(def.props)) {
    const raw = propsRaw[name];
    const p = join(pp, name);
    if (raw === undefined) {
      if (spec.required) {
        v.error(p, `prop obligatoire manquante — ${spec.description}`);
        ok = false;
      }
      props[name] = spec.default;
      continue;
    }
    switch (spec.type) {
      case 'string':
        if (typeof raw !== 'string') {
          v.error(p, `chaîne attendue (reçu : ${describe(raw)}).`);
          ok = false;
        } else props[name] = raw;
        break;
      case 'boolean':
        if (typeof raw !== 'boolean') {
          v.error(p, `booléen attendu (reçu : ${describe(raw)}).`);
          ok = false;
        } else props[name] = raw;
        break;
      case 'number': {
        const n = optNumber(v, propsRaw, name, pp, { min: spec.min, max: spec.max });
        if (n === undefined) ok = false;
        else props[name] = n;
        break;
      }
      case 'color':
        if (resolveColor(ctx, raw, p) === undefined) ok = false;
        else props[name] = raw as string;
        break;
      case 'enum': {
        const values = spec.values ?? [];
        if (typeof raw !== 'string' || !values.includes(raw)) {
          v.error(p, `valeur invalide (${describe(raw)}). Attendu : ${values.join(', ')}.${typeof raw === 'string' ? suggest(raw, values) : ''}`);
          ok = false;
        } else props[name] = raw;
        break;
      }
    }
  }
  if (!ok) return null;

  const id = typeof o.id === 'string' ? o.id : `${def.name}-${index + 1}`;
  let children: unknown[];
  try {
    children = def.expand(props, { id, width: ctx.width, height: ctx.height, safeArea: ctx.safeArea, fonts: ctx.fonts });
  } catch (e) {
    v.error(path, `le composant « ${def.name} » a échoué : ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }

  // Le composant devient un groupe qui porte les propriétés de base de l'instance.
  const groupRaw: Obj = { ...o, id, type: 'group', layers: children };
  delete groupRaw.ref;
  delete groupRaw.props;
  const group = parseGroup(ctx, groupRaw, `${path}<${def.name}>`, index);
  return { ...group, path, component: def.name };
}

/* ═══════════════════════════ Keyframes ═══════════════════════════ */

function parseKeyframes(ctx: Ctx, raw: unknown, path: string, type: Exclude<LayerType, 'component'>): Keyframe[] {
  const { v } = ctx;
  if (!Array.isArray(raw)) {
    v.error(path, `doit être un tableau de keyframes (reçu : ${describe(raw)}).`);
    return [];
  }
  const allowed = new Set<string>([...COMMON_ANIMATABLE, ...TYPE_ANIMATABLE[type]]);
  const out: Keyframe[] = [];

  raw.forEach((kr, i) => {
    const p = join(path, i);
    if (!isObj(kr)) {
      v.error(p, `une keyframe doit être un objet { "t": …, propriétés… } (reçu : ${describe(kr)}).`);
      return;
    }
    checkKeys(v, kr, p, KEYFRAME_KEYS);
    const t = reqNumber(v, kr, 't', p, { min: 0 });
    if (t === undefined) return;
    const kf: Keyframe = { t, easing: resolveEasing(ctx, kr.easing, join(p, 'easing'), DEFAULTS.keyframeEasing), numbers: {}, paints: {} };

    let props = 0;
    for (const key of Object.keys(kr)) {
      if (key === 't' || key === 'easing' || !(KEYFRAME_KEYS as readonly string[]).includes(key)) continue;
      const kp = join(p, key);
      if (!allowed.has(key)) {
        v.warn(kp, `« ${key} » n'est pas animable sur un calque ${type}, ignoré.`);
        continue;
      }
      props++;
      const val = kr[key];
      if (key === 'fill' || key === 'color' || key === 'stroke') {
        const paint = resolvePaint(ctx, val, kp);
        if (paint) kf.paints[key === 'stroke' ? 'stroke' : 'fill'] = paint;
      } else if (key === 'd') {
        const d = typeof val === 'string' ? validateD(ctx, val, kp) : parseShape(ctx, val, kp);
        if (d !== undefined) kf.d = d;
      } else {
        if (typeof val !== 'number' || !Number.isFinite(val)) v.error(kp, `nombre attendu (reçu : ${describe(val)}).`);
        else kf.numbers[key as NumberProp] = val;
      }
    }
    if (props === 0) v.warn(p, 'keyframe sans propriété animée.');
    out.push(kf);
  });

  // Tri stable par temps (les keyframes peuvent être écrites dans le désordre).
  return out.map((k, i) => [k, i] as const).sort((a, b) => a[0].t - b[0].t || a[1] - b[1]).map(([k]) => k);
}

/* ═══════════════════════════ Valeurs : couleurs, peintures, easings ═══════════════════════════ */

function resolveColor(ctx: Ctx, raw: unknown, path: string): RGBA | undefined {
  if (typeof raw !== 'string') {
    ctx.v.error(path, `couleur attendue (reçu : ${describe(raw)}).`);
    return undefined;
  }
  const s = raw.trim();
  if (s.startsWith('$')) {
    const m = /^\$([\w-]+)(?:\/(\d{1,3}))?$/.exec(s);
    if (!m) {
      ctx.v.error(path, `référence de palette invalide « ${s} ». Formats : "$nom" ou "$nom/40" (alpha 40 %).`);
      return undefined;
    }
    const base = ctx.palette[m[1]!];
    if (!base) {
      ctx.v.error(path, `couleur de palette inconnue « $${m[1]} ». Palette : ${Object.keys(ctx.palette).map((k) => '$' + k).join(', ')}.${suggest(m[1]!, Object.keys(ctx.palette))}`);
      return undefined;
    }
    return m[2] === undefined ? { ...base } : { ...base, a: base.a * Math.min(100, Number(m[2])) / 100 };
  }
  const c = parseColor(s);
  if (!c) ctx.v.error(path, `couleur invalide « ${s} ». Formats : #rrggbb, #rrggbbaa, rgb(), rgba(), hsl(), $palette.`);
  return c ?? undefined;
}

function resolvePaint(ctx: Ctx, raw: unknown, path: string): Paint | undefined {
  const { v } = ctx;
  if (raw === 'none' || raw === null) return NONE;
  if (typeof raw === 'string') {
    const c = resolveColor(ctx, raw, path);
    return c ? solid(c) : undefined;
  }
  if (!isObj(raw)) {
    v.error(path, `couleur ou gradient attendu (reçu : ${describe(raw)}).`);
    return undefined;
  }
  const type = readEnum<'solid' | 'linear' | 'gradient' | 'radial' | ''>(v, raw, 'type', path, ['solid', 'linear', 'gradient', 'radial'], '');
  if (type === '') {
    if (raw.type === undefined) v.error(join(path, 'type'), 'propriété obligatoire manquante ("solid", "linear", "radial").');
    return undefined;
  }
  if (type === 'solid') {
    checkKeys(v, raw, path, ['type', 'color']);
    const c = resolveColor(ctx, raw.color, join(path, 'color'));
    return c ? solid(c) : undefined;
  }

  const stopsRaw = readArray(v, raw, 'stops', path, true);
  if (!stopsRaw) return undefined;
  if (stopsRaw.length < 2) v.error(join(path, 'stops'), 'au moins 2 stops sont nécessaires.');
  const stops = stopsRaw
    .map((s, i) => {
      const sp = join(join(path, 'stops'), i);
      let color: unknown, offset: unknown;
      if (Array.isArray(s) && s.length === 2) [color, offset] = s;
      else if (isObj(s)) ({ color, offset } = s);
      else {
        v.error(sp, `stop attendu sous la forme ["#couleur", offset] (reçu : ${describe(s)}).`);
        return null;
      }
      const c = resolveColor(ctx, color, sp);
      if (typeof offset !== 'number' || offset < 0 || offset > 1) {
        v.error(sp, `offset entre 0 et 1 attendu (reçu : ${describe(offset)}).`);
        return null;
      }
      return c ? { color: c, offset } : null;
    })
    .filter((s): s is { color: RGBA; offset: number } => s !== null)
    .sort((a, b) => a.offset - b.offset);

  if (type === 'radial') {
    checkKeys(v, raw, path, ['type', 'stops', 'center', 'radius']);
    const center = raw.center === undefined ? undefined : readVec2(v, raw.center, join(path, 'center'));
    const radius = optNumber(v, raw, 'radius', path, { gt: 0 });
    return { kind: 'radial', stops, center, radius };
  }
  checkKeys(v, raw, path, ['type', 'stops', 'angle', 'from', 'to']);
  const angle = readNumber(v, raw, 'angle', path, 180);
  const from = raw.from === undefined ? undefined : readVec2(v, raw.from, join(path, 'from'));
  const to = raw.to === undefined ? undefined : readVec2(v, raw.to, join(path, 'to'));
  if ((from === undefined) !== (to === undefined)) v.warn(path, '« from » et « to » doivent être fournis ensemble : « angle » est utilisé.');
  return from && to ? { kind: 'linear', stops, angle, from, to } : { kind: 'linear', stops, angle };
}

function resolveEasing(ctx: Ctx, raw: unknown, path: string, def: EasingSpec): EasingSpec {
  const { v } = ctx;
  if (raw === undefined) return def;
  let spec: string;
  if (typeof raw === 'string') spec = raw;
  else if (isObj(raw)) {
    const n = (k: string, d: number) => (typeof raw[k] === 'number' ? raw[k] : d);
    switch (raw.type) {
      case 'spring':
        checkKeys(v, raw, path, ['type', 'stiffness', 'damping', 'mass']);
        spec = `spring(${n('stiffness', 170)},${n('damping', 12)},${n('mass', 1)})`;
        break;
      case 'elastic':
        checkKeys(v, raw, path, ['type', 'amplitude', 'period']);
        spec = `elastic(${n('amplitude', 1)},${n('period', 0.35)})`;
        break;
      case 'back':
        checkKeys(v, raw, path, ['type', 'overshoot']);
        spec = `back(${n('overshoot', 1.70158)})`;
        break;
      case 'cubic-bezier':
        checkKeys(v, raw, path, ['type', 'x1', 'y1', 'x2', 'y2']);
        spec = `cubic-bezier(${n('x1', 0.25)},${n('y1', 0.1)},${n('x2', 0.25)},${n('y2', 1)})`;
        break;
      case 'steps':
        checkKeys(v, raw, path, ['type', 'count']);
        spec = `steps(${n('count', 1)})`;
        break;
      default:
        v.error(join(path, 'type'), `type d'easing inconnu (${describe(raw.type)}). Attendu : spring, elastic, back, cubic-bezier, steps.`);
        return def;
    }
  } else {
    v.error(path, `easing attendu : chaîne ("spring", "cubic-bezier(.2,.8,.2,1)"…) ou objet (reçu : ${describe(raw)}).`);
    return def;
  }
  const r = parseEasing(spec);
  if (!r.ok) {
    v.error(path, `${r.error}.${suggest(spec.replace(/\(.*$/, ''), EASING_NAMES)}`);
    return def;
  }
  return r.canonical;
}

/* ═══════════════════════════ Divers ═══════════════════════════ */

function addFont(ctx: Ctx, family: string, weight: number, italic: boolean): void {
  const key = `${family}|${weight}|${italic}`;
  if (!ctx.fontFaces.has(key)) ctx.fontFaces.set(key, { family, weight, italic });
}

/**
 * Lint : un texte dont l'ancre est dans une zone d'UI TikTok risque d'être masqué.
 * On ne vérifie que les textes non transformés par un parent positionné.
 */
function lintSafeArea(ctx: Ctx, layers: Layer[], identityParent: boolean): void {
  if (!identityParent) return;
  const { top, bottom } = ctx.safeArea;
  for (const l of layers) {
    if (l.type === 'group') {
      lintSafeArea(ctx, l.layers, l.anchor === undefined && !l.keyframes.some((k) => k.numbers.y !== undefined || k.numbers.x !== undefined));
    } else if (l.type === 'text' && l.anchor) {
      const y = l.anchor.y + l.base.y;
      if (y < top || y > ctx.height - bottom) {
        const zone = y < top ? `bandeau du haut (< ${top}px)` : `zone basse (> ${ctx.height - bottom}px)`;
        ctx.v.warn(l.path, `le texte « ${l.content.slice(0, 24)} » est ancré dans la ${zone} : risque d'être masqué par l'UI TikTok.`);
      }
    }
  }
}

/** Utilitaire pour l'UI : regroupe les issues par sévérité. */
export function summarize(issues: Issue[]): { errors: number; warnings: number } {
  return {
    errors: issues.filter((i) => i.severity === 'error').length,
    warnings: issues.filter((i) => i.severity === 'warning').length,
  };
}
