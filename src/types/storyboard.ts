/**
 * Types du storyboard.
 *
 * Deux familles de types cohabitent ici :
 *
 *  1. `*Input`  — ce que l'auteur écrit dans storyboard.json (souple : alias,
 *                 valeurs par défaut implicites, références "$palette" / "@asset").
 *  2. Modèle normalisé — ce que le parser produit et que le moteur consomme :
 *                 toutes les valeurs par défaut sont résolues, les couleurs sont
 *                 parsées, les composants sont expansés et les débuts de scène
 *                 sont calculés. Le moteur ne voit JAMAIS de JSON brut.
 */

/* ════════════════════════════════════════════════════════════════════
   Primitives
   ════════════════════════════════════════════════════════════════════ */

export interface Vec2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/* ════════════════════════════════════════════════════════════════════
   1. ENTRÉE JSON
   ════════════════════════════════════════════════════════════════════ */

/** "#fff", "#4f9cffcc", "rgb(…)", "hsl(…)", "$primary", "$accent/40" (alpha 40 %). */
export type ColorInput = string;

export type GradientStopInput = [color: ColorInput, offset: number];

export type PaintInput =
  | ColorInput
  | { type: 'solid'; color: ColorInput }
  | {
      /** "gradient" est un alias de "linear". */
      type: 'linear' | 'gradient';
      stops: GradientStopInput[];
      /** Angle CSS en degrés (0 = vers le haut, 90 = vers la droite, 180 = vers le bas — défaut). */
      angle?: number;
      /** Points explicites (coordonnées locales du calque) — prioritaires sur `angle`. */
      from?: Vec2;
      to?: Vec2;
    }
  | {
      type: 'radial';
      stops: GradientStopInput[];
      /** Centre en coordonnées locales (défaut : centre des bounds du calque). */
      center?: Vec2;
      /** Rayon (défaut : demi-côté le plus court des bounds — "closest-side"). */
      radius?: number;
    };

/**
 * Easing : nom ("spring", "back", "ease-out"…), forme paramétrée
 * ("spring(200,14)", "cubic-bezier(.2,.8,.2,1)", "elastic(1,0.35)", "back(2.2)", "steps(4)")
 * ou objet ({ "type": "spring", "stiffness": 200, "damping": 14 }).
 */
export type EasingInput =
  | string
  | { type: 'spring'; stiffness?: number; damping?: number; mass?: number }
  | { type: 'elastic'; amplitude?: number; period?: number }
  | { type: 'back'; overshoot?: number }
  | { type: 'cubic-bezier'; x1: number; y1: number; x2: number; y2: number }
  | { type: 'steps'; count: number };

/** Formes simplifiées converties en path SVG au parsing. */
export type ShapeInput =
  | { type: 'rect'; x: number; y: number; width: number; height: number; radius?: number }
  | { type: 'circle'; cx: number; cy: number; r: number }
  | { type: 'ellipse'; cx: number; cy: number; rx: number; ry: number }
  | { type: 'line'; x1: number; y1: number; x2: number; y2: number }
  | { type: 'polygon'; points: [number, number][] }
  | { type: 'star'; cx: number; cy: number; points: number; outer: number; inner: number; rotation?: number };

export interface KeyframeInput {
  /** Temps en secondes, relatif au début du calque (lui-même relatif à sa scène). */
  t: number;
  /** Easing du segment qui ARRIVE sur cette keyframe (depuis la précédente). */
  easing?: EasingInput;
  x?: number;
  y?: number;
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  rotate?: number;
  opacity?: number;
  fill?: PaintInput;
  /** Alias de `fill` (pratique pour les calques texte). */
  color?: PaintInput;
  stroke?: PaintInput;
  strokeWidth?: number;
  strokeDashoffset?: number;
  clipProgress?: number;
  /** Valeur numérique injectée dans `{value}` d'un texte (compteurs). */
  value?: number;
  /** Morphing : nouveau tracé (path) — chaîne SVG ou forme. */
  d?: string | ShapeInput;
}

export type ClipDirection =
  | 'left-to-right'
  | 'right-to-left'
  | 'top-to-bottom'
  | 'bottom-to-top'
  | 'center-x'
  | 'center-y'
  | 'center';

export type BlendMode =
  | 'normal'
  | 'add'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion';

export interface ShadowInput {
  color?: ColorInput;
  blur?: number;
  x?: number;
  y?: number;
}

/** Propriétés communes à tous les calques. */
export interface LayerBaseInput {
  id?: string;
  /** Position du calque (point d'ancrage). Alias : `position`. */
  anchor?: Vec2;
  position?: Vec2;
  /** Point local autour duquel s'appliquent scale/rotate. "center" = centre des bounds. */
  pivot?: Vec2 | 'center';
  /** Apparition (s, relatif au parent). Les keyframes sont relatives à ce `start`. */
  start?: number;
  /** Disparition (s, relatif au parent). */
  end?: number;
  keyframes?: KeyframeInput[];
  /* Valeurs statiques (utilisées quand la propriété n'est pas animée) */
  x?: number;
  y?: number;
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  rotate?: number;
  opacity?: number;
  clipProgress?: number;
  clipDirection?: ClipDirection;
  /** Rectangle de clip explicite (coordonnées locales). Défaut : bounds du calque. */
  clipRect?: Rect;
  blend?: BlendMode;
  shadow?: ShadowInput;
}

export interface SplitInput {
  by?: 'char' | 'word' | 'line';
  mode?: 'stagger' | 'typewriter';
  start?: number;
  stagger?: number;
  duration?: number;
  easing?: EasingInput;
  order?: 'forward' | 'reverse' | 'center' | 'random';
  from?: { opacity?: number; x?: number; y?: number; scale?: number; rotate?: number };
  cursor?: boolean;
  /** Chaque unité est masquée par sa propre boîte (effet "ligne qui monte derrière un masque"). */
  mask?: boolean;
}

export interface TextLayerInput extends LayerBaseInput {
  type: 'text';
  /** Texte. `\n` = retour à la ligne, `*mot*` = surlignage (couleur `highlight`), `{value}` = compteur. */
  content: string | number;
  font?: string;
  size?: number;
  weight?: number;
  italic?: boolean;
  color?: PaintInput;
  fill?: PaintInput;
  stroke?: PaintInput;
  strokeWidth?: number;
  align?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  letterSpacing?: number;
  lineHeight?: number;
  maxWidth?: number;
  highlight?: PaintInput;
  /** Animation par lettre / mot / ligne. Raccourcis : "chars", "words", "lines", "typewriter". */
  split?: SplitInput | 'chars' | 'words' | 'lines' | 'typewriter';
  value?: number;
  decimals?: number;
  thousandsSeparator?: string;
  /** Séparateur décimal des compteurs ("." par défaut, "," en français). */
  decimalSeparator?: string;
}

export interface PathLayerInput extends LayerBaseInput {
  type: 'path';
  d?: string;
  shape?: ShapeInput;
  fill?: PaintInput;
  stroke?: PaintInput;
  strokeWidth?: number;
  lineCap?: 'butt' | 'round' | 'square';
  lineJoin?: 'miter' | 'round' | 'bevel';
  fillRule?: 'nonzero' | 'evenodd';
  strokeDasharray?: number[];
  strokeDashoffset?: number;
  /** Longueur virtuelle du tracé (comme l'attribut SVG) : dasharray/offset s'expriment dans cette unité. */
  pathLength?: number;
}

export interface ImageLayerInput extends LayerBaseInput {
  type: 'image';
  /** URL, data-URI ou référence d'asset "@logo". */
  src: string;
  width?: number;
  height?: number;
  size?: { width?: number; height?: number };
}

export interface GroupLayerInput extends LayerBaseInput {
  type: 'group';
  layers: LayerInput[];
}

export interface ComponentLayerInput extends LayerBaseInput {
  type: 'component';
  ref: string;
  props?: Record<string, unknown>;
}

export type LayerInput = TextLayerInput | PathLayerInput | ImageLayerInput | GroupLayerInput | ComponentLayerInput;

export type TransitionType =
  | 'none'
  | 'fade'
  | 'slide-up'
  | 'slide-down'
  | 'slide-left'
  | 'slide-right'
  | 'zoom'
  | 'wipe-up'
  | 'wipe-down'
  | 'wipe-left'
  | 'wipe-right'
  | 'circle'
  | 'flash'
  | 'glitch';

export type TransitionInput = TransitionType | { type: TransitionType; duration?: number; easing?: EasingInput };

export interface SceneInput {
  id?: string;
  /** Début absolu (s). Optionnel : par défaut la scène suit la précédente (chevauchement = transitions). */
  start?: number;
  duration: number;
  background?: PaintInput;
  transitionIn?: TransitionInput;
  transitionOut?: TransitionInput;
  layers: LayerInput[];
}

export interface StoryboardInput {
  $schema?: string;
  meta: {
    title?: string;
    width?: number;
    height?: number;
    fps?: number;
    /** Optionnel : calculé à partir des scènes si absent. */
    duration?: number;
    background?: PaintInput;
    safeArea?: { top?: number; bottom?: number; left?: number; right?: number };
    /** Grain filmique 0..1 (0 = désactivé). */
    grain?: number;
  };
  theme?: {
    palette?: Record<string, ColorInput>;
    fonts?: string[];
  };
  assets?: Record<string, string>;
  scenes: SceneInput[];
  /** Calques globaux dessinés au-dessus de toutes les scènes (temps absolu). */
  overlays?: LayerInput[];
}

/* ════════════════════════════════════════════════════════════════════
   2. MODÈLE NORMALISÉ (sortie du parser)
   ════════════════════════════════════════════════════════════════════ */

/** Couleur RGBA : canaux 0..255, alpha 0..1. */
export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface GradientStop {
  color: RGBA;
  offset: number;
}

export type Paint =
  | { kind: 'none' }
  | { kind: 'solid'; color: RGBA }
  | { kind: 'linear'; stops: GradientStop[]; angle: number; from?: Vec2; to?: Vec2 }
  | { kind: 'radial'; stops: GradientStop[]; center?: Vec2; radius?: number };

/** Easing canonique validé (ex. "spring(170,12,1)"). Compilé par engine/easing.ts. */
export type EasingSpec = string;

export const NUMBER_PROPS = [
  'x',
  'y',
  'scale',
  'scaleX',
  'scaleY',
  'rotate',
  'opacity',
  'strokeWidth',
  'strokeDashoffset',
  'clipProgress',
  'value',
] as const;
export type NumberProp = (typeof NUMBER_PROPS)[number];

export const PAINT_PROPS = ['fill', 'stroke'] as const;
export type PaintProp = (typeof PAINT_PROPS)[number];

export type AnimatableProp = NumberProp | PaintProp | 'd';

export interface Keyframe {
  t: number;
  easing: EasingSpec;
  numbers: Partial<Record<NumberProp, number>>;
  paints: Partial<Record<PaintProp, Paint>>;
  /** Tracé SVG (déjà converti depuis une forme si besoin). */
  d?: string;
}

export interface Shadow {
  color: RGBA;
  blur: number;
  x: number;
  y: number;
}

export interface LayerBase {
  id: string;
  /** Chemin JSON d'origine — utile pour le debug et les messages. */
  path: string;
  /** Position. `undefined` (path/group) = confondue avec le pivot → coordonnées absolues. */
  anchor?: Vec2;
  pivot: Vec2 | 'center';
  start: number;
  end?: number;
  /** Valeurs statiques de toutes les propriétés numériques animables. */
  base: Record<NumberProp, number>;
  keyframes: Keyframe[];
  clipDirection: ClipDirection;
  clipRect?: Rect;
  blend?: BlendMode;
  shadow?: Shadow;
}

export interface SplitSpec {
  by: 'char' | 'word' | 'line';
  mode: 'stagger' | 'typewriter';
  start: number;
  stagger: number;
  duration: number;
  easing: EasingSpec;
  order: 'forward' | 'reverse' | 'center' | 'random';
  from: { opacity: number; x: number; y: number; scale: number; rotate: number };
  cursor: boolean;
  mask: boolean;
}

export interface TextLayer extends LayerBase {
  type: 'text';
  content: string;
  font: string;
  size: number;
  weight: number;
  italic: boolean;
  fill: Paint;
  stroke: Paint;
  align: 'left' | 'center' | 'right';
  verticalAlign: 'top' | 'middle' | 'bottom';
  letterSpacing: number;
  lineHeight: number;
  maxWidth?: number;
  highlight: Paint;
  split?: SplitSpec;
  decimals: number;
  thousandsSeparator: string;
  decimalSeparator: string;
}

export interface PathLayer extends LayerBase {
  type: 'path';
  d: string;
  fill: Paint;
  stroke: Paint;
  lineCap: CanvasLineCap;
  lineJoin: CanvasLineJoin;
  fillRule: CanvasFillRule;
  dashArray?: number[];
  pathLength?: number;
}

export interface ImageLayer extends LayerBase {
  type: 'image';
  src: string;
  width?: number;
  height?: number;
}

export interface GroupLayer extends LayerBase {
  type: 'group';
  layers: Layer[];
  /** Nom du composant d'origine si ce groupe provient d'une expansion. */
  component?: string;
}

export type Layer = TextLayer | PathLayer | ImageLayer | GroupLayer;

export interface Transition {
  type: TransitionType;
  duration: number;
  easing: EasingSpec;
}

export interface Scene {
  id: string;
  index: number;
  path: string;
  start: number;
  duration: number;
  end: number;
  background?: Paint;
  transitionIn?: Transition;
  transitionOut?: Transition;
  layers: Layer[];
}

export interface SafeArea {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface Meta {
  title: string;
  width: number;
  height: number;
  fps: number;
  duration: number;
  background: Paint;
  safeArea: SafeArea;
  grain: number;
}

export interface Theme {
  palette: Record<string, RGBA>;
  fonts: string[];
}

export interface Storyboard {
  meta: Meta;
  theme: Theme;
  assets: Record<string, string>;
  scenes: Scene[];
  overlays: Layer[];
  /** Polices réellement utilisées (famille + graisse + italique) — pour le préchargement. */
  fontFaces: FontRequest[];
  /** URLs d'images à précharger. */
  images: string[];
}

export interface FontRequest {
  family: string;
  weight: number;
  italic: boolean;
}

/* ════════════════════════════════════════════════════════════════════
   Diagnostics
   ════════════════════════════════════════════════════════════════════ */

export interface Issue {
  /** Chemin JSON, ex. "scenes[2].layers[0].keyframes[1].easing". */
  path: string;
  message: string;
  severity: 'error' | 'warning';
}

export type ParseResult =
  | { ok: true; storyboard: Storyboard; warnings: Issue[] }
  | { ok: false; errors: Issue[]; warnings: Issue[] };
