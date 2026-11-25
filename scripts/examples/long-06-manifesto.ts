/**
 * long-06-manifesto — "Manifeste de marque" (~64 s)
 * Punchlines plein écran, typographie forte, une forme centrale qui se
 * MORPHE d'un mot-clé à l'autre (cercle → étoile → carré → triangle → cœur
 * → hexagone → cercle). Chaque scène démarre sur la forme de la précédente :
 * le morphing est continu à travers les cuts. Final : logo-reveal + CTA.
 */
import type { EasingInput, KeyframeInput, LayerInput, PaintInput, ShapeInput, TransitionInput } from '../../src/types/storyboard.ts';
import { CX, alpha, cta, gradient, image, kf, keys, leave, scene, storyboard } from './kit.ts';

const P = { primary: '#7c5cff', accent: '#ff3b30', paper: '#f4f1ea', ink: '#0a0a0a', text: '#ffffff', background: '#000000' };
const F = { display: 'Bricolage Grotesque', body: 'Inter' };
const SY = 900; // centre de la forme

const SHAPES: Record<string, ShapeInput | string> = {
  circle: { type: 'circle', cx: CX, cy: SY, r: 300 },
  star: { type: 'star', cx: CX, cy: SY, points: 5, outer: 360, inner: 160 },
  square: { type: 'rect', x: CX - 270, y: SY - 270, width: 540, height: 540, radius: 48 },
  triangle: { type: 'polygon', points: [[CX, SY - 330], [CX + 330, SY + 250], [CX - 330, SY + 250]] },
  heart: `M${CX},${SY + 290} C${CX - 220},${SY + 150} ${CX - 330},${SY + 20} ${CX - 330},${SY - 120} C${CX - 330},${SY - 240} ${CX - 240},${SY - 320} ${CX - 140},${SY - 320} C${CX - 70},${SY - 320} ${CX - 25},${SY - 285} ${CX},${SY - 230} C${CX + 25},${SY - 285} ${CX + 70},${SY - 320} ${CX + 140},${SY - 320} C${CX + 240},${SY - 320} ${CX + 330},${SY - 240} ${CX + 330},${SY - 120} C${CX + 330},${SY + 20} ${CX + 220},${SY + 150} ${CX},${SY + 290} Z`,
  hexagon: { type: 'polygon', points: Array.from({ length: 6 }, (_, k) => [CX + Math.cos((k * Math.PI) / 3 - Math.PI / 2) * 330, SY + Math.sin((k * Math.PI) / 3 - Math.PI / 2) * 330] as [number, number]) },
};

interface Beat {
  id: string;
  text: string;
  size: number;
  bg: PaintInput;
  shapeFrom: keyof typeof SHAPES;
  shapeTo: keyof typeof SHAPES;
  shapeFill?: PaintInput;
  shapeStroke?: PaintInput;
  morph: EasingInput;
  textColor: PaintInput;
  /** Inversion du texte sur la forme (blend "difference"). */
  invert?: boolean;
  by: 'char' | 'word' | 'line';
  textEasing: EasingInput;
  caption: string;
  captionColor: string;
  out?: TransitionInput;
  in?: TransitionInput;
  extra?: LayerInput[];
  spin?: boolean;
}

const BEATS: Beat[] = [
  { id: 'tendances', text: 'On ne suit pas\nles tendances.', size: 108, bg: P.background, shapeFrom: 'circle', shapeTo: 'circle', shapeFill: P.text, morph: 'spring(160,14)', textColor: P.text, invert: true, by: 'word', textEasing: 'cubic-bezier(0.16,1,0.3,1)', caption: '01 — POSITION', captionColor: '#ffffff' },
  { id: 'creer', text: 'On les *crée*.', size: 150, bg: P.paper, shapeFrom: 'circle', shapeTo: 'star', shapeFill: P.accent, morph: 'back(1.8)', textColor: P.ink, by: 'char', textEasing: 'back', caption: '02 — AMBITION', captionColor: P.ink },
  { id: 'simple', text: 'Simple.', size: 212, bg: P.background, shapeFrom: 'star', shapeTo: 'square', shapeFill: P.text, morph: 'spring(200,15)', textColor: P.text, invert: true, by: 'char', textEasing: 'spring(260,13)', caption: '03 — CLARTÉ', captionColor: '#ffffff', out: { type: 'flash', duration: 0.3, easing: 'ease-out' } },
  { id: 'audacieux', text: 'Audacieux.', size: 150, bg: P.accent, shapeFrom: 'square', shapeTo: 'triangle', shapeFill: P.ink, morph: 'elastic(1,0.45)', textColor: P.text, by: 'char', textEasing: 'elastic', caption: '04 — AUDACE', captionColor: '#ffffff', in: { type: 'flash', duration: 0.3 } },
  { id: 'humain', text: 'Humain.', size: 196, bg: P.paper, shapeFrom: 'triangle', shapeTo: 'heart', shapeFill: P.accent, morph: 'ease-in-out', textColor: P.ink, by: 'char', textEasing: 'ease-out', caption: '05 — EMPATHIE', captionColor: P.ink, out: { type: 'glitch', duration: 0.35 } },
  {
    id: 'mouvement',
    text: 'Toujours en\n*mouvement.*',
    size: 124,
    bg: gradient(160, ['#2a1a6e', 0], [P.primary, 0.55], ['#140c3a', 1]),
    shapeFrom: 'heart',
    shapeTo: 'hexagon',
    shapeStroke: P.text,
    morph: 'cubic-bezier(0.65,0,0.35,1)',
    textColor: P.text,
    by: 'line',
    textEasing: 'back(2)',
    caption: '06 — ÉNERGIE',
    captionColor: '#ffffff',
    in: { type: 'glitch', duration: 0.35 },
    spin: true,
    // Satellites en orbite (groupe qui tourne linéairement).
    extra: [
      {
        type: 'group',
        id: 'satellites',
        pivot: { x: CX, y: SY },
        keyframes: [kf(0, { rotate: 0, opacity: 0 }), kf(0.8, { opacity: 1, easing: 'ease-out' }), kf(7.4, { rotate: 220, easing: 'linear' })],
        layers: [0, 1, 2].map((k): LayerInput => ({ type: 'path', id: `sat-${k}`, shape: { type: 'circle', cx: CX + Math.cos((k * 2 * Math.PI) / 3) * 420, cy: SY + Math.sin((k * 2 * Math.PI) / 3) * 420, r: 20 - k * 4 }, fill: k === 0 ? P.accent : P.text })),
      },
    ],
  },
];

/** Forme centrale : part de la forme de la scène précédente et se morphe. */
function morphShape(b: Beat, k: number): LayerInput {
  const keysList: KeyframeInput[] = [
    kf(0, { d: SHAPES[b.shapeFrom]! }),
    kf(0.25, { d: SHAPES[b.shapeFrom]! }),
    kf(1.15, { d: SHAPES[b.shapeTo]!, easing: b.morph }),
  ];
  const motion = b.spin
    ? [kf(0, { rotate: 0 }), kf(7.4, { rotate: 120, easing: 'linear' })]
    : [kf(1.2, { scale: 1 }), kf(4.3, { scale: 1.05, easing: 'ease-in-out' }), kf(7.4, { scale: 1, easing: 'ease-in-out' })];
  const first = k === 0 ? [kf(0, { scale: 0 }), kf(0.9, { scale: 1, easing: 'spring(160,12)' })] : [];
  return {
    type: 'path',
    id: `shape-${b.id}`,
    d: typeof SHAPES[b.shapeFrom] === 'string' ? (SHAPES[b.shapeFrom] as string) : '',
    ...(typeof SHAPES[b.shapeFrom] === 'string' ? {} : { shape: SHAPES[b.shapeFrom] as ShapeInput, d: undefined }),
    fill: b.shapeFill ?? 'none',
    ...(b.shapeStroke ? { stroke: b.shapeStroke, strokeWidth: 8 } : {}),
    pivot: { x: CX, y: SY },
    keyframes: keys(keysList, k === 0 ? first : motion),
  } as LayerInput;
}

function beatScene(b: Beat, k: number) {
  const layers: LayerInput[] = [
    morphShape(b, k),
    ...(b.extra ?? []),
    {
      type: 'text',
      id: `caption-${b.id}`,
      content: b.caption,
      font: F.body,
      size: 28,
      weight: 700,
      letterSpacing: 6,
      color: b.captionColor,
      align: 'left',
      anchor: { x: 90, y: 300 },
      keyframes: [kf(0.1, { opacity: 0, x: -20 }), kf(0.5, { opacity: 0.8, x: 0, easing: 'ease-out' })],
    },
    {
      type: 'path',
      id: `rule-${b.id}`,
      d: `M90,340 H${1080 - 90}`,
      stroke: alpha(b.captionColor, 35),
      strokeWidth: 2,
      pathLength: 1,
      keyframes: [kf(0.2, { strokeDashoffset: 1 }), kf(1.2, { strokeDashoffset: 0, easing: 'ease-in-out' })],
    },
    {
      type: 'text',
      id: `punch-${b.id}`,
      content: b.text,
      font: F.display,
      size: b.size,
      weight: 800,
      color: b.textColor,
      highlight: b.id === 'creer' ? P.ink : P.text,
      ...(b.invert ? { blend: 'difference' as const } : {}),
      anchor: { x: CX, y: SY },
      lineHeight: 1,
      letterSpacing: -b.size * 0.035,
      maxWidth: 900,
      split: {
        by: b.by,
        start: 0.55,
        stagger: b.by === 'char' ? 0.05 : b.by === 'word' ? 0.14 : 0.3,
        duration: 0.7,
        easing: b.textEasing,
        order: b.id === 'creer' ? 'random' : b.id === 'simple' ? 'center' : 'forward',
        from: b.by === 'line' ? { x: 220, opacity: 0 } : { y: b.size * 0.6, opacity: 0, scale: b.by === 'char' ? 0.5 : 1 },
      },
      keyframes: leave(6.9, { dur: 0.35, y: -30 }),
    },
  ];
  // Soulignement "crée" : trait qui se dessine sous le mot.
  if (b.id === 'creer')
    layers.push({
      type: 'path',
      id: 'cree-underline',
      d: `M${CX + 20},${SY + 100} C${CX + 120},${SY + 80} ${CX + 220},${SY + 120} ${CX + 330},${SY + 96}`,
      stroke: P.ink,
      strokeWidth: 12,
      pathLength: 1,
      keyframes: [kf(1.6, { strokeDashoffset: 1 }), kf(2.3, { strokeDashoffset: 0, easing: 'ease-out' })],
    });
  return { layers, bg: b.bg, in: b.in, out: b.out };
}

export default storyboard(
  'ORBIT — Manifeste',
  { palette: P, fonts: [F.display, F.body] },
  { logo: './assets/logo-orbit.svg' },
  [
    ...BEATS.map((b, k) => {
      const s = beatScene(b, k);
      return scene(b.id, 7.4, s.layers, { background: s.bg, ...(s.in ? { in: s.in } : {}), ...(s.out ? { out: s.out } : {}) });
    }),

    /* ───────── la promesse ───────── */
    scene(
      'promesse',
      8,
      [
        {
          type: 'path',
          id: 'shape-promesse',
          shape: SHAPES.hexagon as ShapeInput,
          stroke: alpha(P.text, 60),
          strokeWidth: 4,
          fill: 'none',
          pivot: { x: CX, y: SY },
          keyframes: [
            kf(0, { d: SHAPES.hexagon!, rotate: 120 }),
            kf(1.2, { d: SHAPES.circle!, rotate: 180, easing: 'cubic-bezier(0.65,0,0.35,1)' }),
            kf(1.2, { scale: 1 }),
            kf(2.4, { scale: 1.6, easing: 'ease-in-out' }),
            kf(7.6, { scale: 1.7, easing: 'linear' }),
          ],
        },
        {
          type: 'component',
          ref: 'title-card',
          start: 0.6,
          props: { title: 'Ce n’est pas un logo.\nC’est une *promesse*.', subtitle: 'Faire bouger les idées. Toujours.', style: 'mask', size: 92, weight: 800, y: SY, accent: '$accent', accent2: '$primary', exit: 7.4 },
        },
      ],
      { background: P.background },
    ),

    /* ───────── final ───────── */
    scene(
      'final',
      13,
      [
        {
          type: 'path',
          id: 'final-glow',
          shape: { type: 'circle', cx: CX, cy: 700, r: 640 },
          fill: { type: 'radial', stops: [[alpha(P.primary, 55), 0], [alpha(P.accent, 15), 0.5], [alpha(P.accent, 0), 1]] },
          blend: 'screen',
          keyframes: [kf(0, { opacity: 0 }), kf(2, { opacity: 1, easing: 'ease-in-out' })],
        },
        { type: 'component', ref: 'logo-reveal', start: 0.3, props: { src: '@logo', text: 'ORBIT', tagline: 'Le studio *en mouvement*.', y: 680, size: 240, textSize: 116, accent: '$accent', accent2: '$primary' } },
        cta('cta', 'Rejoins le mouvement', { y: 1300, from: P.primary, to: P.accent, font: F.display, t0: 2.4, w: 780, size: 46 }),
        {
          type: 'text',
          id: 'url',
          content: 'orbit.studio',
          font: F.body,
          size: 34,
          weight: 600,
          letterSpacing: 4,
          color: '$text/60',
          anchor: { x: CX, y: 1460 },
          keyframes: [kf(3.2, { opacity: 0 }), kf(3.8, { opacity: 1, easing: 'ease-in' })],
        },
      ],
      { background: gradient(180, ['#0b0716', 0], ['#000000', 1]), in: { type: 'circle', duration: 0.6, easing: 'cubic-bezier(0.65,0,0.35,1)' }, out: { type: 'fade', duration: 0.8, easing: 'ease-in-out' } },
    ),
  ],
  {
    grain: 0.1,
    overlays: [
      // Signature discrète, inversée automatiquement selon le fond (difference).
      image('mark', '@logo', 960, 300, 64, [kf(0.4, { opacity: 0 }), kf(1, { opacity: 1, easing: 'ease-out' }), kf(50.8, { opacity: 1 }), kf(51.3, { opacity: 0, easing: 'ease-in' })], { blend: 'difference' }),
    ],
  },
);
