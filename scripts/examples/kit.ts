/**
 * Kit d'écriture des storyboards d'exemple.
 *
 * Les exemples livrés (src/examples/*.json) sont du JSON pur, éditable à la
 * main. Ce kit n'est qu'un outil d'AUTEUR : des fonctions typées qui
 * produisent des calques JSON cohérents (décors, icônes, cartes…), pour
 * éviter les copier-coller entre les 9 storyboards.
 */
import type {
  EasingInput,
  KeyframeInput,
  LayerInput,
  PaintInput,
  SceneInput,
  StoryboardInput,
  TransitionInput,
} from '../../src/types/storyboard.ts';
import { alpha } from '../../src/components/util.ts';

export { alpha };
export const W = 1080;
export const H = 1920;
export const CX = W / 2;
export const SAFE = { top: 220, bottom: 320, left: 0, right: 110 };
/** Centre vertical de la zone sûre. */
export const MID = SAFE.top + (H - SAFE.top - SAFE.bottom) / 2;

const r3 = (v: number) => Math.round(v * 1000) / 1000;

export const kf = (t: number, props: Omit<KeyframeInput, 't'> = {}): KeyframeInput => ({ t: r3(t), ...props });

/* ═══════════════════════════ Entrées / sorties ═══════════════════════════ */

interface MoveOpts {
  dur?: number;
  x?: number;
  y?: number;
  scale?: number;
  rotate?: number;
  easing?: EasingInput;
}

/** Apparition : opacité 0→1 + décalage → 0. */
export function enter(t: number, o: MoveOpts = {}): KeyframeInput[] {
  const from: Omit<KeyframeInput, 't'> = { opacity: 0, y: o.y ?? 40 };
  const to: Omit<KeyframeInput, 't'> = { opacity: 1, y: 0, easing: o.easing ?? 'ease-out' };
  if (o.x !== undefined) {
    from.x = o.x;
    to.x = 0;
  }
  if (o.scale !== undefined) {
    from.scale = o.scale;
    to.scale = 1;
  }
  if (o.rotate !== undefined) {
    from.rotate = o.rotate;
    to.rotate = 0;
  }
  return [kf(t, from), kf(t + (o.dur ?? 0.6), to)];
}

/** Disparition : opacité 1→0 + décalage. */
export function leave(t: number, o: MoveOpts = {}): KeyframeInput[] {
  const from: Omit<KeyframeInput, 't'> = { opacity: 1, y: 0 };
  const to: Omit<KeyframeInput, 't'> = { opacity: 0, y: o.y ?? -40, easing: o.easing ?? 'ease-in' };
  if (o.x !== undefined) {
    from.x = 0;
    to.x = o.x;
  }
  if (o.scale !== undefined) {
    from.scale = 1;
    to.scale = o.scale;
  }
  return [kf(t, from), kf(t + (o.dur ?? 0.4), to)];
}

/** Combine des listes de keyframes (les pistes sont indépendantes par propriété). */
export const keys = (...lists: KeyframeInput[][]): KeyframeInput[] => lists.flat().sort((a, b) => a.t - b.t);

/* ═══════════════════════════ Scènes ═══════════════════════════ */

export function scene(
  id: string,
  duration: number,
  layers: LayerInput[],
  o: { background?: PaintInput; in?: TransitionInput; out?: TransitionInput; start?: number } = {},
): SceneInput {
  const s: SceneInput = { id, duration: r3(duration), layers };
  if (o.start !== undefined) s.start = o.start;
  if (o.background) s.background = o.background;
  if (o.in) s.transitionIn = o.in;
  if (o.out) s.transitionOut = o.out;
  return s;
}

export function storyboard(
  title: string,
  theme: { palette: Record<string, string>; fonts: string[] },
  assets: Record<string, string>,
  scenes: SceneInput[],
  o: { background?: PaintInput; grain?: number; overlays?: LayerInput[] } = {},
): StoryboardInput {
  return {
    meta: {
      title,
      width: W,
      height: H,
      fps: 60,
      background: o.background ?? theme.palette.background ?? '#06060a',
      safeArea: { ...SAFE },
      grain: o.grain ?? 0.07,
    },
    theme,
    assets,
    scenes,
    ...(o.overlays ? { overlays: o.overlays } : {}),
  };
}

/** Fond plein écran en dégradé linéaire. */
export const gradient = (angle: number, ...stops: [string, number][]): PaintInput => ({ type: 'linear', angle, stops });

/* ═══════════════════════════ Décors ═══════════════════════════ */

/** Orbe lumineuse (dégradé radial + mode écran) qui dérive lentement et respire. */
export function orb(
  id: string,
  x: number,
  y: number,
  r: number,
  color: string,
  o: { dx?: number; dy?: number; dur?: number; opacity?: number; delay?: number } = {},
): LayerInput {
  const dur = o.dur ?? 8;
  const d = o.delay ?? 0;
  return {
    type: 'path',
    id,
    shape: { type: 'circle', cx: x, cy: y, r },
    fill: { type: 'radial', stops: [[alpha(color, 85), 0], [alpha(color, 30), 0.45], [alpha(color, 0), 1]] },
    blend: 'screen',
    pivot: 'center',
    opacity: o.opacity ?? 0.9,
    keyframes: keys(
      [kf(d, { x: 0, y: 0 }), kf(d + dur, { x: o.dx ?? 60, y: o.dy ?? -80, easing: 'linear' })],
      [kf(d, { scale: 1 }), kf(d + dur / 2, { scale: 1.14, easing: 'ease-in-out' }), kf(d + dur, { scale: 1, easing: 'ease-in-out' })],
    ),
  };
}

/** Vignettage : assombrit les bords (rendu "cinéma"). */
export function vignette(id = 'vignette', strength = 70): LayerInput {
  return {
    type: 'path',
    id,
    shape: { type: 'rect', x: 0, y: 0, width: W, height: H },
    fill: { type: 'radial', center: { x: CX, y: H * 0.46 }, radius: H * 0.72, stops: [['rgba(0,0,0,0)', 0.45], [`rgba(0,0,0,${strength / 100})`, 1]] },
  };
}

/** Grille fine (lignes 1,5 px) qui apparaît en fondu. */
export function grid(id: string, color: string, o: { step?: number; t?: number; opacity?: number } = {}): LayerInput {
  const step = o.step ?? 108;
  const parts: string[] = [];
  for (let x = step; x < W; x += step) parts.push(`M${x},0 V${H}`);
  for (let y = step; y < H; y += step) parts.push(`M0,${y} H${W}`);
  return {
    type: 'path',
    id,
    d: parts.join(' '),
    stroke: alpha(color, 9),
    strokeWidth: 1.5,
    keyframes: [kf(o.t ?? 0, { opacity: 0 }), kf((o.t ?? 0) + 1.2, { opacity: o.opacity ?? 1, easing: 'ease-out' })],
  };
}

/** Coins de cadrage fins qui se dessinent (dans la zone sûre). */
export function corners(id: string, color: string, t = 0, o: { inset?: number; len?: number; top?: number; bottom?: number } = {}): LayerInput {
  const i = o.inset ?? 60;
  const l = o.len ?? 70;
  const top = o.top ?? SAFE.top + 20;
  const bottom = o.bottom ?? H - SAFE.bottom - 20;
  const d = [
    `M${i},${top + l} V${top} H${i + l}`,
    `M${W - i - l},${top} H${W - i} V${top + l}`,
    `M${W - i},${bottom - l} V${bottom} H${W - i - l}`,
    `M${i + l},${bottom} H${i} V${bottom - l}`,
  ].join(' ');
  return {
    type: 'path',
    id,
    d,
    stroke: alpha(color, 55),
    strokeWidth: 3,
    lineCap: 'square',
    pathLength: 1,
    keyframes: [kf(t, { strokeDashoffset: 1 }), kf(t + 0.9, { strokeDashoffset: 0, easing: 'cubic-bezier(0.65,0,0.35,1)' })],
  };
}

/** Particules (petits points) qui montent lentement — positions déterministes. */
export function particles(id: string, color: string, count: number, seed: number, dur: number): LayerInput {
  let s = seed;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  const layers: LayerInput[] = [];
  for (let k = 0; k < count; k++) {
    const x = 60 + rnd() * (W - 120);
    const y = 300 + rnd() * (H - 600);
    const r = 2 + rnd() * 4;
    layers.push({
      type: 'path',
      id: `${id}-${k}`,
      shape: { type: 'circle', cx: x, cy: y, r },
      fill: alpha(color, 40 + Math.round(rnd() * 50)),
      keyframes: [kf(0, { y: 0, opacity: 0 }), kf(0.8, { opacity: 1, easing: 'ease-out' }), kf(dur, { y: -160 - rnd() * 200, easing: 'linear' })],
    });
  }
  return { type: 'group', id, layers };
}

/* ═══════════════════════════ Icônes (grille 24×24) ═══════════════════════════ */

type IconPart = { d: string; mode: 'stroke' | 'fill' };

export const ICONS: Record<string, IconPart[]> = {
  check: [{ d: 'M5 12.5l4.5 4.5L19 7.5', mode: 'stroke' }],
  bolt: [{ d: 'M13.5 2L4.5 13.5h6.5l-1 8.5 9.5-12h-6.8l0.8-8z', mode: 'fill' }],
  heart: [{ d: 'M12 20.5s-7.6-4.6-9.4-9.3C1.3 7.7 3.5 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.5 0 5.7 3.2 4.4 6.7-1.8 4.7-9.4 9.3-9.4 9.3z', mode: 'fill' }],
  shield: [{ d: 'M12 2.5l8 3v6c0 5-3.4 9.2-8 10.8-4.6-1.6-8-5.8-8-10.8v-6l8-3z', mode: 'stroke' }, { d: 'M8.5 12l2.5 2.5 4.5-5', mode: 'stroke' }],
  clock: [{ d: 'M12 3a9 9 0 1 0 0.01 0z', mode: 'stroke' }, { d: 'M12 7.5V12l3 2', mode: 'stroke' }],
  arrow: [{ d: 'M4.5 12h15M13.5 6l6 6-6 6', mode: 'stroke' }],
  sparkle: [{ d: 'M12 2.5c0.7 4.6 2.9 6.8 7.5 7.5-4.6 0.7-6.8 2.9-7.5 7.5-0.7-4.6-2.9-6.8-7.5-7.5 4.6-0.7 6.8-2.9 7.5-7.5z', mode: 'fill' }, { d: 'M19 16.5c0.3 1.6 1 2.3 2.5 2.5-1.5 0.2-2.2 0.9-2.5 2.5-0.3-1.6-1-2.3-2.5-2.5 1.5-0.2 2.2-0.9 2.5-2.5z', mode: 'fill' }],
  battery: [{ d: 'M3 8.5h15v7H3z', mode: 'stroke' }, { d: 'M20.5 10.5v3', mode: 'stroke' }, { d: 'M5 10.5h9v3H5z', mode: 'fill' }],
  wave: [{ d: 'M3 12h2M7 8v8M11 5v14M15 8.5v7M19 10.5v3', mode: 'stroke' }],
  users: [{ d: 'M9 11a3.5 3.5 0 1 0 0.01 0z', mode: 'stroke' }, { d: 'M2.5 20c0.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5', mode: 'stroke' }, { d: 'M16 5.5a3.2 3.2 0 0 1 0 6.2M18 14.5c2 0.6 3.2 2.5 3.5 5', mode: 'stroke' }],
  chart: [{ d: 'M4 20V4M4 20h16', mode: 'stroke' }, { d: 'M8 16v-4M12 16V8M16 16v-6', mode: 'stroke' }],
  code: [{ d: 'M8.5 7l-5 5 5 5M15.5 7l5 5-5 5M13.5 4.5l-3 15', mode: 'stroke' }],
  palette: [{ d: 'M12 3a9 9 0 1 0 0 18c1.2 0 1.8-0.8 1.8-1.7 0-1-0.8-1.4-0.8-2.4 0-1.1 0.9-1.9 2-1.9h2.2A3.8 3.8 0 0 0 21 11.2C21 6.6 17 3 12 3z', mode: 'stroke' }, { d: 'M7.5 11.5a1.2 1.2 0 1 0 0.01 0zM10.5 7.5a1.2 1.2 0 1 0 0.01 0zM15 7.5a1.2 1.2 0 1 0 0.01 0z', mode: 'fill' }],
  play: [{ d: 'M7 4.5v15l12.5-7.5z', mode: 'fill' }],
  download: [{ d: 'M12 3.5v11M7 10l5 5 5-5M4.5 20h15', mode: 'stroke' }],
  inbox: [{ d: 'M3.5 13.5l2.5-8h12l2.5 8v6h-17z', mode: 'stroke' }, { d: 'M3.5 13.5h5l1.5 2.5h4l1.5-2.5h5', mode: 'stroke' }],
  layers: [{ d: 'M12 3.5l9 4.5-9 4.5-9-4.5z', mode: 'stroke' }, { d: 'M3 12.5l9 4.5 9-4.5M3 16.5l9 4.5 9-4.5', mode: 'stroke' }],
  target: [{ d: 'M12 3a9 9 0 1 0 0.01 0zM12 7.5a4.5 4.5 0 1 0 0.01 0z', mode: 'stroke' }, { d: 'M12 10.8a1.2 1.2 0 1 0 0.01 0z', mode: 'fill' }],
  eye: [{ d: 'M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12z', mode: 'stroke' }, { d: 'M12 9a3 3 0 1 0 0.01 0z', mode: 'fill' }],
  text: [{ d: 'M5 6.5V4.5h14v2M12 4.5v15M9 19.5h6', mode: 'stroke' }],
  snail: [{ d: 'M3 18.5h15a3 3 0 0 0 3-3v-2', mode: 'stroke' }, { d: 'M13 18.5a5.5 5.5 0 1 0-5.5-5.5c0 2 1.6 3.3 3.3 3.3s2.9-1.3 2.9-2.9-1.2-2.4-2.4-2.4', mode: 'stroke' }],
  star: [{ d: 'M12 2.8l2.8 5.9 6.4 0.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-0.8z', mode: 'fill' }],
};

/** Icône centrée en (x,y), taille `size` px, avec entrée optionnelle. */
export function icon(
  id: string,
  name: keyof typeof ICONS,
  x: number,
  y: number,
  size: number,
  color: PaintInput,
  o: { keyframes?: KeyframeInput[]; strokeWidth?: number; start?: number } = {},
): LayerInput {
  const s = size / 24;
  return {
    type: 'group',
    id,
    anchor: { x, y },
    pivot: { x: 12, y: 12 },
    scale: s,
    ...(o.start !== undefined ? { start: o.start } : {}),
    keyframes: (o.keyframes ?? []).map((k) => (k.scale !== undefined ? { ...k, scale: k.scale * s } : k)),
    layers: ICONS[name]!.map((part, k) =>
      part.mode === 'fill'
        ? { type: 'path', id: `${id}-${k}`, d: part.d, fill: color }
        : { type: 'path', id: `${id}-${k}`, d: part.d, stroke: color, strokeWidth: o.strokeWidth ?? 2, fill: 'none', lineCap: 'round', lineJoin: 'round' },
    ),
  };
}

/* ═══════════════════════════ Blocs d'interface ═══════════════════════════ */

/** Carte "verre dépoli" : icône + titre + texte. */
export function card(
  id: string,
  o: {
    x: number;
    y: number;
    w: number;
    h: number;
    title: string;
    body?: string;
    iconName?: keyof typeof ICONS;
    accent: string;
    font: string;
    bodyFont: string;
    keyframes?: KeyframeInput[];
    start?: number;
  },
): LayerInput {
  const { x, y, w, h, accent } = o;
  const layers: LayerInput[] = [
    {
      type: 'path',
      id: `${id}-bg`,
      shape: { type: 'rect', x, y, width: w, height: h, radius: 36 },
      fill: gradient(135, ['rgba(255,255,255,0.10)', 0], ['rgba(255,255,255,0.03)', 1]),
      stroke: gradient(135, [alpha(accent, 70), 0], ['rgba(255,255,255,0.08)', 0.6]),
      strokeWidth: 2,
      shadow: { color: 'rgba(0,0,0,0.45)', blur: 50, y: 20 },
    },
  ];
  const iconX = x + 70;
  const textX = o.iconName ? x + 140 : x + 48;
  if (o.iconName) {
    layers.push({
      type: 'path',
      id: `${id}-iconbg`,
      shape: { type: 'circle', cx: iconX, cy: y + h / 2, r: 42 },
      fill: alpha(accent, 18),
    });
    layers.push(icon(`${id}-icon`, o.iconName, iconX, y + h / 2, 44, accent, { strokeWidth: 2.2 }));
  }
  layers.push({
    type: 'text',
    id: `${id}-title`,
    content: o.title,
    font: o.font,
    size: 50,
    weight: 700,
    align: 'left',
    anchor: { x: textX, y: o.body ? y + h / 2 - 26 : y + h / 2 },
  });
  if (o.body)
    layers.push({
      type: 'text',
      id: `${id}-body`,
      content: o.body,
      font: o.bodyFont,
      size: 32,
      weight: 500,
      color: '$text/65',
      align: 'left',
      anchor: { x: textX, y: y + h / 2 + 30 },
    });
  return {
    type: 'group',
    id,
    pivot: { x: x + w / 2, y: y + h / 2 },
    ...(o.start !== undefined ? { start: o.start } : {}),
    keyframes: o.keyframes ?? [],
    layers,
  };
}

/** Bouton d'appel à l'action : pilule dégradée + flèche, qui "respire". */
export function cta(
  id: string,
  label: string,
  o: { x?: number; y: number; w?: number; h?: number; from: string; to: string; font: string; t0: number; color?: string; size?: number },
): LayerInput {
  const w = o.w ?? 640;
  const h = o.h ?? 132;
  const x = o.x ?? CX;
  const size = o.size ?? 48;
  return {
    type: 'group',
    id,
    pivot: { x, y: o.y },
    keyframes: keys(
      [kf(o.t0, { scale: 0, opacity: 0 }), kf(o.t0 + 0.12, { opacity: 1, easing: 'linear' }), kf(o.t0 + 0.8, { scale: 1, easing: 'elastic(1,0.45)' })],
      // Respiration en boucle (aller-retour ease-in-out).
      [0, 1, 2, 3, 4, 5].flatMap((k) => [
        kf(o.t0 + 1.2 + k * 1.2, { scaleX: 1, scaleY: 1, easing: 'ease-in-out' }),
        kf(o.t0 + 1.8 + k * 1.2, { scaleX: 1.04, scaleY: 1.04, easing: 'ease-in-out' }),
      ]),
    ),
    layers: [
      {
        type: 'path',
        id: `${id}-glow`,
        shape: { type: 'rect', x: x - w / 2, y: o.y - h / 2, width: w, height: h, radius: h / 2 },
        fill: gradient(90, [o.from, 0], [o.to, 1]),
        shadow: { color: alpha(o.to, 60), blur: 60, y: 10 },
      },
      {
        type: 'text',
        id: `${id}-label`,
        content: label,
        font: o.font,
        size,
        weight: 700,
        color: o.color ?? '#ffffff',
        anchor: { x: x - 34, y: o.y },
      },
      icon(`${id}-arrow`, 'arrow', x + w / 2 - 86, o.y, 46, o.color ?? '#ffffff', {
        strokeWidth: 2.6,
        keyframes: [0, 1, 2, 3, 4, 5].flatMap((k) => [kf(o.t0 + 1 + k * 1.2, { x: 0, easing: 'ease-in' }), kf(o.t0 + 1.6 + k * 1.2, { x: 14, easing: 'ease-out' })]),
      }),
    ],
  };
}

/** Anneau de progression qui se remplit entre t0 et t1. */
export function ring(
  id: string,
  cx: number,
  cy: number,
  r: number,
  o: { color: PaintInput; track?: string; width?: number; t0: number; t1: number; to?: number; easing?: EasingInput },
): LayerInput {
  return {
    type: 'group',
    id,
    layers: [
      { type: 'path', id: `${id}-track`, shape: { type: 'circle', cx, cy, r }, stroke: o.track ?? 'rgba(255,255,255,0.1)', strokeWidth: o.width ?? 14, fill: 'none' },
      {
        type: 'path',
        id: `${id}-bar`,
        shape: { type: 'circle', cx, cy, r },
        stroke: o.color,
        strokeWidth: o.width ?? 14,
        fill: 'none',
        pathLength: 1,
        lineCap: 'round',
        keyframes: [kf(o.t0, { strokeDashoffset: 1 }), kf(o.t1, { strokeDashoffset: 1 - (o.to ?? 1), easing: o.easing ?? 'ease-out' })],
      },
    ],
  };
}

/** Petite pastille texte (badge / chip). */
export function chip(
  id: string,
  text: string,
  x: number,
  y: number,
  o: { font: string; color: string; size?: number; t0: number; bg?: string; easing?: EasingInput },
): LayerInput {
  const size = o.size ?? 30;
  const w = text.length * size * 0.62 + 60;
  const h = size * 2;
  return {
    type: 'group',
    id,
    pivot: { x, y },
    keyframes: [kf(o.t0, { scale: 0.4, opacity: 0 }), kf(o.t0 + 0.5, { scale: 1, opacity: 1, easing: o.easing ?? 'back' })],
    layers: [
      { type: 'path', id: `${id}-bg`, shape: { type: 'rect', x: x - w / 2, y: y - h / 2, width: w, height: h, radius: h / 2 }, fill: o.bg ?? alpha(o.color, 16), stroke: alpha(o.color, 60), strokeWidth: 2 },
      { type: 'text', id: `${id}-t`, content: text, font: o.font, size, weight: 600, color: o.color, letterSpacing: 2, anchor: { x, y } },
    ],
  };
}

/** Texte "punchline" plein écran avec animation de split. */
export function punch(
  id: string,
  content: string,
  o: {
    y?: number;
    size?: number;
    font: string;
    weight?: number;
    color?: PaintInput;
    by?: 'char' | 'word' | 'line';
    t0?: number;
    stagger?: number;
    dur?: number;
    easing?: EasingInput;
    from?: { opacity?: number; x?: number; y?: number; scale?: number; rotate?: number };
    order?: 'forward' | 'reverse' | 'center' | 'random';
    maxWidth?: number;
    lineHeight?: number;
    italic?: boolean;
    letterSpacing?: number;
    keyframes?: KeyframeInput[];
    highlight?: PaintInput;
  },
): LayerInput {
  const size = o.size ?? 120;
  return {
    type: 'text',
    id,
    content,
    font: o.font,
    size,
    weight: o.weight ?? 700,
    italic: o.italic,
    color: o.color ?? '$text',
    ...(o.highlight ? { highlight: o.highlight } : {}),
    anchor: { x: CX, y: o.y ?? MID },
    lineHeight: o.lineHeight ?? 1.02,
    letterSpacing: o.letterSpacing ?? -size * 0.02,
    maxWidth: o.maxWidth ?? 860,
    split: {
      by: o.by ?? 'char',
      start: o.t0 ?? 0,
      stagger: o.stagger ?? 0.035,
      duration: o.dur ?? 0.7,
      easing: o.easing ?? 'spring(190,15)',
      from: o.from ?? { y: size * 0.8, opacity: 0 },
      ...(o.order ? { order: o.order } : {}),
    },
    keyframes: o.keyframes ?? [],
  };
}

/** Image centrée avec entrée. */
export function image(id: string, src: string, x: number, y: number, width: number, keyframes: KeyframeInput[] = [], extra: Partial<LayerInput> = {}): LayerInput {
  return { type: 'image', id, src, width, anchor: { x, y }, keyframes, ...extra } as LayerInput;
}

/** Barre horizontale révélée (clip) — soulignement, séparateur, progression. */
export function bar(id: string, x: number, y: number, w: number, h: number, fill: PaintInput, t0: number, dur = 0.6, dir: 'left-to-right' | 'center-x' = 'left-to-right', easing: EasingInput = 'cubic-bezier(0.65,0,0.35,1)'): LayerInput {
  return {
    type: 'path',
    id,
    shape: { type: 'rect', x, y: y - h / 2, width: w, height: h, radius: h / 2 },
    fill,
    clipDirection: dir,
    keyframes: [kf(t0, { clipProgress: 0 }), kf(t0 + dur, { clipProgress: 1, easing })],
  };
}

/** Anneaux concentriques qui s'expandent (onde de choc). */
export function shockwave(id: string, x: number, y: number, color: string, t0: number, count = 3): LayerInput {
  return {
    type: 'group',
    id,
    layers: Array.from({ length: count }, (_, k): LayerInput => ({
      type: 'path',
      id: `${id}-${k}`,
      shape: { type: 'circle', cx: x, cy: y, r: 120 },
      stroke: alpha(color, 80),
      strokeWidth: 6 - k * 1.5,
      fill: 'none',
      pivot: 'center',
      keyframes: [
        kf(t0 + k * 0.12, { scale: 0.2, opacity: 0 }),
        kf(t0 + k * 0.12 + 0.05, { opacity: 1, easing: 'linear' }),
        kf(t0 + k * 0.12 + 1.1, { scale: 4.5, opacity: 0, easing: 'ease-out-cubic' }),
      ],
    })),
  };
}
