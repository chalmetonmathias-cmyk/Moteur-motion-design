/**
 * long-04-tutorial — "Tutoriel étape par étape" (~70 s)
 * 5 étapes numérotées (chacune avec son entrée propre), lower-third
 * persistant et barre de progression en overlay.
 * Composants : title-card, lower-third (overlay), logo-reveal.
 */
import type { LayerInput } from '../../src/types/storyboard.ts';
import { parseEasing } from '../../src/engine/easing.ts';
import { CX, W, alpha, chip, cta, gradient, grid, icon, kf, keys, leave, orb, ring, scene, storyboard, vignette } from './kit.ts';

const P = { primary: '#3d8bff', accent: '#2ee59d', yellow: '#ffd23f', pink: '#ff6b9a', text: '#ffffff', background: '#070b14' };
const F = { display: 'Plus Jakarta Sans', mono: 'JetBrains Mono' };

const INTRO = 8.2;
const STEP = 11.6;
const OVERLAP = 0.5;
const stepStart = (k: number) => INTRO - OVERLAP + k * (STEP - OVERLAP);
const push = { type: 'slide-left' as const, duration: OVERLAP, easing: 'cubic-bezier(0.7,0,0.2,1)' };
const bg = gradient(180, ['#0b1324', 0], ['#070b14', 1]);

const stepTitle = (n: number, title: string, style: 'rise' | 'pop' | 'mask' | 'typewriter'): LayerInput => ({
  type: 'component',
  ref: 'title-card',
  start: 0.3,
  props: { kicker: `Étape ${n}`, title, style, size: 84, weight: 800, y: 540, accent: '$accent', accent2: '$primary', underline: false, exit: STEP - 1.1 },
});

/* ── Étape 1 : le code du storyboard, tapé à la machine ── */
function codeCard(): LayerInput {
  const x = 100, y = 760, w = W - 200, h = 560;
  return {
    type: 'group',
    id: 'code',
    keyframes: keys([kf(0.6, { x: -W, rotate: -4 }), kf(1.5, { x: 0, rotate: 0, easing: 'spring(150,16)' })], leave(STEP - 1, { x: -200, y: 0 })),
    pivot: { x: CX, y: y + h / 2 },
    layers: [
      { type: 'path', id: 'code-bg', shape: { type: 'rect', x, y, width: w, height: h, radius: 32 }, fill: '#0d1628', stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2, shadow: { color: 'rgba(0,0,0,0.5)', blur: 50, y: 20 } },
      ...[P.pink, P.yellow, P.accent].map((c, k): LayerInput => ({ type: 'path', id: `code-dot-${k}`, shape: { type: 'circle', cx: x + 50 + k * 34, cy: y + 46, r: 10 }, fill: c })),
      { type: 'text', id: 'code-file', content: 'storyboard.json', font: F.mono, size: 26, weight: 400, color: '$text/45', anchor: { x: CX, y: y + 46 } },
      {
        type: 'text',
        id: 'code-text',
        content: '{\n  *"scenes"*: [{\n    *"duration"*: 3,\n    *"layers"*: [\n      { *"type"*: "text" }\n    ]\n  }]\n}',
        font: F.mono,
        size: 36,
        weight: 400,
        align: 'left',
        lineHeight: 1.45,
        highlight: P.accent,
        anchor: { x: x + 50, y: y + 300 },
        split: { mode: 'typewriter', start: 1.8, stagger: 0.035, cursor: true },
      },
    ],
  };
}

/* ── Étape 2 : palette ── */
const SWATCHES = [P.primary, P.accent, P.yellow, P.pink, '#ffffff'];
function palette(): LayerInput[] {
  return [
    ...SWATCHES.map((c, k): LayerInput => ({
      type: 'group',
      id: `swatch-${k}`,
      pivot: { x: 180 + k * 180, y: 900 },
      keyframes: keys([kf(0.8 + k * 0.18, { scale: 0, rotate: -90 }), kf(1.7 + k * 0.18, { scale: 1, rotate: 0, easing: 'elastic' })], leave(STEP - 1, { scale: 0.5 })),
      layers: [
        { type: 'path', id: `swatch-c-${k}`, shape: { type: 'circle', cx: 180 + k * 180, cy: 900, r: 70 }, fill: c, stroke: 'rgba(255,255,255,0.25)', strokeWidth: 3, shadow: { color: alpha(c, 50), blur: 40 } },
        { type: 'text', id: `swatch-t-${k}`, content: c.toUpperCase(), font: F.mono, size: 24, weight: 400, color: '$text/60', anchor: { x: 180 + k * 180, y: 1010 } },
      ],
    })),
    {
      type: 'path',
      id: 'palette-bar',
      shape: { type: 'rect', x: 110, y: 1110, width: W - 220, height: 90, radius: 45 },
      fill: gradient(90, ...SWATCHES.slice(0, 4).map((c, k): [string, number] => [c, k / 3])),
      clipDirection: 'center-x',
      keyframes: keys([kf(2.8, { clipProgress: 0 }), kf(3.6, { clipProgress: 1, easing: 'cubic-bezier(0.65,0,0.35,1)' })], leave(STEP - 1)),
    },
    chip('contrast', 'CONTRASTE AA ✓', CX, 1300, { font: F.mono, color: P.accent, t0: 3.9, easing: 'back(2.4)' }),
  ];
}

/* ── Étape 3 : keyframes sur une piste ── */
const KX = [170, 410, 670, 910];
function keyframesDemo(): LayerInput {
  const loop = (t: number) => [0, 1, 2].map((k) => t + k * 2.6);
  return {
    type: 'group',
    id: 'kf-demo',
    clipDirection: 'left-to-right',
    keyframes: keys([kf(0.6, { clipProgress: 0 }), kf(1.6, { clipProgress: 1, easing: 'ease-out-expo' })], leave(STEP - 1)),
    layers: [
      { type: 'path', id: 'track', d: `M${KX[0]},1200 H${KX[3]}`, stroke: 'rgba(255,255,255,0.25)', strokeWidth: 4, pathLength: 1, keyframes: [kf(0.8, { strokeDashoffset: 1 }), kf(1.8, { strokeDashoffset: 0, easing: 'ease-in-out' })] },
      ...KX.map((x, k): LayerInput => ({
        type: 'group',
        id: `diamond-${k}`,
        layers: [
          { type: 'path', id: `diamond-shape-${k}`, shape: { type: 'rect', x: x - 22, y: 1178, width: 44, height: 44, radius: 6 }, fill: k % 2 ? P.yellow : P.accent, pivot: 'center', rotate: 45, keyframes: [kf(1.4 + k * 0.2, { scale: 0 }), kf(2 + k * 0.2, { scale: 1, easing: 'back(2.5)' })] },
          { type: 'text', id: `diamond-label-${k}`, content: `t=${[0, 0.6, 1.4, 2][k]}`, font: F.mono, size: 26, weight: 400, color: '$text/55', anchor: { x, y: 1270 }, keyframes: [kf(1.8 + k * 0.2, { opacity: 0 }), kf(2.2 + k * 0.2, { opacity: 1, easing: 'ease-out' })] },
        ],
      })),
      // Tête de lecture : parcours linéaire, en boucle.
      {
        type: 'path',
        id: 'playhead',
        d: `M${KX[0]},1130 V1240`,
        stroke: P.pink,
        strokeWidth: 4,
        keyframes: loop(2.6).flatMap((t) => [kf(t, { x: 0, easing: 'hold' }), kf(t + 2.6, { x: KX[3]! - KX[0]!, easing: 'linear' })]),
      },
      // La balle "joue" les keyframes : position + échelle easées.
      {
        type: 'path',
        id: 'ball',
        shape: { type: 'circle', cx: KX[0]!, cy: 940, r: 46 },
        fill: gradient(135, [P.accent, 0], [P.primary, 1]),
        pivot: 'center',
        shadow: { color: alpha(P.accent, 60), blur: 40 },
        keyframes: loop(2.6).flatMap((t) => [
          kf(t, { x: 0, scale: 1, easing: 'hold' }),
          kf(t + 0.78, { x: KX[1]! - KX[0]!, scale: 1.4, easing: 'ease-in-out' }),
          kf(t + 1.82, { x: KX[2]! - KX[0]!, scale: 0.7, easing: 'spring(200,12)' }),
          kf(t + 2.6, { x: KX[3]! - KX[0]!, scale: 1, easing: 'back' }),
        ]),
      },
    ],
  };
}

/* ── Étape 4 : courbes d'easing, échantillonnées depuis le moteur ── */
function easingCurve(spec: string, cx: number, label: string, color: string, k: number): LayerInput {
  const fn = (parseEasing(spec) as { ok: true; fn: (p: number) => number }).fn;
  const size = 230, x0 = cx - size / 2, y0 = 1060;
  const pts = Array.from({ length: 49 }, (_, i) => {
    const p = i / 48;
    return `${i ? 'L' : 'M'}${(x0 + p * size).toFixed(1)},${(y0 - fn(p) * size * 0.8).toFixed(1)}`;
  }).join(' ');
  const t0 = 0.8 + k * 0.25;
  return {
    type: 'group',
    id: `curve-${k}`,
    keyframes: keys([kf(t0, { opacity: 0, y: 120 }), kf(t0 + 0.7, { opacity: 1, y: 0, easing: 'ease-out' })], leave(STEP - 1)),
    layers: [
      { type: 'path', id: `curve-box-${k}`, shape: { type: 'rect', x: x0 - 20, y: y0 - size - 20, width: size + 40, height: size + 60, radius: 24 }, fill: 'rgba(255,255,255,0.04)', stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 },
      { type: 'path', id: `curve-line-${k}`, d: pts, stroke: color, strokeWidth: 6, pathLength: 1, keyframes: [kf(t0 + 0.6, { strokeDashoffset: 1 }), kf(t0 + 1.8, { strokeDashoffset: 0, easing: 'cubic-bezier(0.65,0,0.35,1)' })] },
      { type: 'text', id: `curve-label-${k}`, content: label, font: F.mono, size: 30, weight: 400, color, anchor: { x: cx, y: y0 + 80 } },
      // Le point rejoue l'easing en boucle sur un rail.
      { type: 'path', id: `rail-${k}`, d: `M${x0},${y0 + 170} H${x0 + size}`, stroke: 'rgba(255,255,255,0.15)', strokeWidth: 4 },
      {
        type: 'path',
        id: `runner-${k}`,
        shape: { type: 'circle', cx: x0, cy: y0 + 170, r: 18 },
        fill: color,
        keyframes: [0, 1, 2, 3].flatMap((j) => [kf(3 + j * 1.8, { x: 0, easing: 'hold' }), kf(4.2 + j * 1.8, { x: size, easing: spec })]),
      },
    ],
  };
}

/* ── Étape 5 : export ── */
function exportDemo(): LayerInput[] {
  return [
    {
      type: 'group',
      id: 'export-ring',
      pivot: { x: CX, y: 1000 },
      keyframes: keys([kf(0.6, { scale: 0.3, opacity: 0 }), kf(1.5, { scale: 1, opacity: 1, easing: 'elastic(1,0.45)' })], leave(STEP - 1, { scale: 0.8 })),
      layers: [
        ring('progress', CX, 1000, 200, { color: gradient(90, [P.accent, 0], [P.primary, 1]), width: 24, t0: 1.6, t1: 5.6, easing: 'linear' }),
        icon('dl', 'download', CX, 960, 110, '#ffffff', { strokeWidth: 2, keyframes: [kf(5.6, { scale: 1 }), kf(5.9, { scale: 0, easing: 'back-in' })] }),
        { type: 'text', id: 'pct', content: '{value} %', font: F.mono, size: 44, weight: 600, anchor: { x: CX, y: 1080 }, keyframes: [kf(1.6, { value: 0 }), kf(5.6, { value: 100, easing: 'linear' }), kf(5.6, { opacity: 1 }), kf(5.8, { opacity: 0, easing: 'ease-in' })] },
        icon('done', 'check', CX, 1000, 150, P.accent, { strokeWidth: 3, keyframes: [kf(5.8, { scale: 0, rotate: -30 }), kf(6.7, { scale: 1, rotate: 0, easing: 'elastic' })] }),
      ],
    },
    ...(['1080×1920', '60 FPS', 'WEBM'] as const).map((txt, k) => chip(`spec-${k}`, txt, 250 + k * 290, 1300, { font: F.mono, color: [P.accent, P.yellow, P.primary][k]!, t0: 6.4 + k * 0.15, size: 28 })),
  ];
}

const steps: { title: string; style: 'rise' | 'pop' | 'mask' | 'typewriter'; layers: LayerInput[] }[] = [
  { title: 'Écris ton\n*storyboard*', style: 'rise', layers: [codeCard()] },
  { title: 'Choisis\nta *palette*', style: 'pop', layers: palette() },
  { title: 'Anime avec\ndes *keyframes*', style: 'mask', layers: [keyframesDemo()] },
  { title: 'Donne\ndu *rythme*', style: 'rise', layers: [easingCurve('linear', 230, 'linear', P.primary, 0), easingCurve('back', CX, 'back', P.yellow, 1), easingCurve('spring', 850, 'spring', P.pink, 2)] },
  { title: 'Exporte\nen *WebM*', style: 'typewriter', layers: exportDemo() },
];

export default storyboard(
  'Tutoriel — Ton premier motion design',
  { palette: P, fonts: [F.display, F.mono] },
  { logo: './assets/logo-studio.svg' },
  [
    scene(
      'intro',
      INTRO,
      [
        grid('grid', P.primary),
        orb('o1', 200, 600, 520, P.primary, { dur: INTRO, dx: 100 }),
        orb('o2', 880, 1400, 520, P.accent, { dur: INTRO, dx: -100, opacity: 0.6 }),
        { type: 'image', id: 'logo', src: '@logo', width: 150, anchor: { x: CX, y: 520 }, keyframes: keys([kf(0.1, { scale: 0, rotate: -45 }), kf(1, { scale: 1, rotate: 0, easing: 'spring(200,12)' })], leave(7.5)) },
        {
          type: 'component',
          ref: 'title-card',
          start: 0.5,
          props: { kicker: 'Tutoriel', title: 'Ton premier\n*motion design*\nen 5 étapes', subtitle: 'Du JSON à la vidéo, sans logiciel de montage.', style: 'rise', size: 100, weight: 800, y: 950, accent: '$accent', accent2: '$primary', exit: 7.4 },
        },
        vignette(),
      ],
      { background: bg, out: push },
    ),
    ...steps.map((s, k) =>
      scene(`etape-${k + 1}`, STEP, [orb(`so-${k}`, k % 2 ? 900 : 180, 760, 520, [P.primary, P.accent, P.yellow, P.pink, P.primary][k]!, { dur: STEP, dx: k % 2 ? -100 : 100, opacity: 0.55 }), stepTitle(k + 1, s.title, s.style), ...s.layers, vignette()], {
        background: bg,
        in: push,
        out: push,
      }),
    ),
    scene(
      'outro',
      7,
      [
        orb('o3', CX, 700, 700, P.accent, { dur: 7, dx: 0, dy: 60, opacity: 0.6 }),
        { type: 'component', ref: 'logo-reveal', start: 0.2, props: { src: '@logo', text: 'À toi de jouer !', tagline: 'Le projet complet est *en description*.', y: 680, size: 220, textSize: 92, accent: '$accent', accent2: '$primary' } },
        cta('cta', 'Télécharge le projet', { y: 1300, from: P.primary, to: P.accent, font: F.display, t0: 2.2, w: 760, size: 44 }),
        vignette(),
      ],
      { background: { type: 'radial', center: { x: CX, y: 700 }, radius: 1300, stops: [['#0f2236', 0], ['#070b14', 1]] }, in: push, out: { type: 'fade', duration: 0.6, easing: 'ease-in-out' } },
    ),
  ],
  {
    overlays: [
      // Progression : 5 segments qui se remplissent pendant leur étape (linéaire).
      {
        type: 'group',
        id: 'progress',
        start: stepStart(0),
        end: stepStart(5),
        keyframes: [kf(0, { opacity: 0 }), kf(0.5, { opacity: 1, easing: 'ease-out' })],
        layers: [
          ...[0, 1, 2, 3, 4].flatMap((k): LayerInput[] => {
            const x = 90 + k * 182;
            const t0 = stepStart(k) - stepStart(0);
            return [
              { type: 'path', id: `seg-track-${k}`, shape: { type: 'rect', x, y: 262, width: 168, height: 8, radius: 4 }, fill: 'rgba(255,255,255,0.15)' },
              {
                type: 'path',
                id: `seg-fill-${k}`,
                shape: { type: 'rect', x, y: 262, width: 168, height: 8, radius: 4 },
                fill: gradient(90, [P.accent, 0], [P.primary, 1]),
                clipDirection: 'left-to-right',
                keyframes: [kf(t0, { clipProgress: 0 }), kf(t0 + STEP - OVERLAP, { clipProgress: 1, easing: 'linear' })],
              },
            ];
          }),
          {
            type: 'text',
            id: 'step-counter',
            content: 'ÉTAPE {value} / 5',
            font: F.mono,
            size: 26,
            weight: 600,
            color: '$text/70',
            align: 'left',
            anchor: { x: 90, y: 316 },
            // "hold" : le chiffre saute net au début de chaque étape.
            keyframes: [1, 2, 3, 4, 5].map((n, k) => kf(stepStart(k) - stepStart(0), { value: n, easing: 'hold' })),
          },
        ],
      },
      // Lower-third persistant pendant tout le tutoriel.
      { type: 'component', ref: 'lower-third', start: stepStart(0) + 0.4, props: { name: 'Motion Engine', role: 'Tuto · 5 étapes', font: F.display, roleFont: F.mono, size: 46, accent: '$accent', duration: stepStart(5) - stepStart(0) - 0.4, y: 1500 } },
    ],
  },
);
