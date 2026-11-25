/**
 * long-03-countdown — "Top 5" (~65 s)
 * Intro → 5 items (~10,5 s chacun, transitions rapides et variées) → outro.
 * Easings punchy : spring, back, elastic. Composants : title-card, logo-reveal.
 */
import type { EasingInput, LayerInput, TransitionInput } from '../../src/types/storyboard.ts';
import { ICONS, CX, W, alpha, chip, cta, gradient, icon, image, kf, keys, leave, orb, scene, shockwave, storyboard, vignette } from './kit.ts';

const P = { primary: '#ff7a1a', accent: '#ffd23f', red: '#ff3d5a', text: '#fff6ec', background: '#0c0606' };
const F = { display: 'Anton', body: 'Inter' };

interface Item {
  rank: number;
  title: string;
  why: string;
  fix: string;
  icon: keyof typeof ICONS;
  /** Easing d'entrée du grand chiffre (chaque item a sa signature). */
  entry: EasingInput;
  out: TransitionInput;
}

const ITEMS: Item[] = [
  { rank: 5, title: 'Une intro\n*trop lente*', why: 'Personne n’attend ta 4e seconde.', fix: 'Commence par le résultat.', icon: 'snail', entry: 'spring(240,11)', out: { type: 'slide-left', duration: 0.35, easing: 'cubic-bezier(0.7,0,0.2,1)' } },
  { rank: 4, title: 'Pas de\n*sous-titres*', why: 'La plupart regardent sans le son.', fix: 'Sous-titre chaque phrase.', icon: 'text', entry: 'back(2.6)', out: { type: 'glitch', duration: 0.35 } },
  { rank: 3, title: 'Un rythme\n*monotone*', why: 'Sans variation, le cerveau décroche.', fix: 'Change de plan toutes les 2 s.', icon: 'wave', entry: 'elastic(1.2,0.35)', out: { type: 'wipe-right', duration: 0.35, easing: 'ease-in-out' } },
  { rank: 2, title: 'Oublier\nles *safe-areas*', why: 'Ton texte finit sous les boutons.', fix: '220 px en haut, 320 px en bas.', icon: 'eye', entry: 'spring(320,14)', out: { type: 'zoom', duration: 0.35, easing: 'ease-in' } },
  { rank: 1, title: 'Aucune\n*accroche*', why: 'Pas de mouvement, pas d’arrêt du pouce.', fix: 'Un mouvement fort dès la frame 1.', icon: 'target', entry: 'elastic(1.4,0.3)', out: { type: 'flash', duration: 0.35, easing: 'ease-out' } },
];

/** Points de progression du classement (en haut de la zone sûre). */
function rankDots(current: number): LayerInput {
  return {
    type: 'group',
    id: 'rank-dots',
    keyframes: [kf(0, { opacity: 0 }), kf(0.3, { opacity: 1, easing: 'ease-out' })],
    layers: [5, 4, 3, 2, 1].map((r, k): LayerInput => {
      const x = CX - 160 + k * 80;
      const active = r === current;
      const done = r > current;
      return {
        type: 'path',
        id: `dot-${r}`,
        shape: active ? { type: 'rect', x: x - 26, y: 284, width: 52, height: 16, radius: 8 } : { type: 'circle', cx: x, cy: 292, r: 8 },
        fill: active ? gradient(90, [P.accent, 0], [P.primary, 1]) : done ? alpha(P.primary, 80) : 'rgba(255,255,255,0.18)',
        pivot: 'center',
        keyframes: active ? [kf(0.1, { scaleX: 0.3 }), kf(0.6, { scaleX: 1, easing: 'back' })] : [],
      };
    }),
  };
}

function itemScene(it: Item, k: number) {
  const rank = String(it.rank);
  const layers: LayerInput[] = [
    orb(`glow-${k}`, k % 2 ? 860 : 220, 620, 600, k % 2 ? P.red : P.primary, { dur: 10.6, dx: k % 2 ? -120 : 120, dy: 80 }),
    orb(`glow2-${k}`, k % 2 ? 200 : 880, 1450, 480, P.accent, { dur: 10.6, dx: 0, dy: -100, opacity: 0.35 }),
    rankDots(it.rank),
    shockwave(`shock-${k}`, CX, 650, P.accent, 0.15, 2),
    // Grand chiffre : contour + remplissage révélé, entrée signature.
    {
      type: 'group',
      id: `rank-${k}`,
      pivot: { x: CX, y: 650 },
      keyframes: keys(
        [kf(0.05, { scale: 0.2, rotate: k % 2 ? 18 : -18, opacity: 0 }), kf(0.12, { opacity: 1, easing: 'linear' }), kf(0.9, { scale: 1, rotate: 0, easing: it.entry })],
        leave(10, { scale: 1.2, y: -30, dur: 0.3 }),
      ),
      layers: [
        { type: 'text', id: `rank-outline-${k}`, content: rank, font: F.display, size: 560, weight: 400, fill: 'none', stroke: alpha(P.text, 55), strokeWidth: 4, anchor: { x: CX + 14, y: 664 } },
        {
          type: 'text',
          id: `rank-fill-${k}`,
          content: rank,
          font: F.display,
          size: 560,
          weight: 400,
          color: gradient(180, [P.accent, 0], [P.primary, 0.55], [P.red, 1]),
          anchor: { x: CX, y: 650 },
          shadow: { color: alpha(P.primary, 55), blur: 60 },
          clipDirection: 'bottom-to-top',
          keyframes: [kf(0.3, { clipProgress: 0 }), kf(1.1, { clipProgress: 1, easing: 'cubic-bezier(0.65,0,0.35,1)' })],
        },
      ],
    },
    {
      type: 'text',
      id: `hash-${k}`,
      content: 'N°',
      font: F.body,
      size: 40,
      weight: 800,
      color: P.accent,
      anchor: { x: CX - 200, y: 470 },
      keyframes: [kf(0.6, { opacity: 0, x: -30 }), kf(1, { opacity: 1, x: 0, easing: 'ease-out' }), ...leave(10, { dur: 0.3 })],
    },
    icon(`icon-${k}`, it.icon, CX + 230, 470, 84, P.accent, {
      strokeWidth: 2.2,
      keyframes: [kf(0.8, { scale: 0, rotate: -60 }), kf(1.6, { scale: 1, rotate: 0, easing: 'elastic' }), kf(10, { scale: 1 }), kf(10.3, { scale: 0, easing: 'back-in' })],
    }),
    {
      type: 'component',
      ref: 'title-card',
      start: 0.7,
      props: { title: it.title, subtitle: it.why, style: k % 2 ? 'pop' : 'rise', font: F.display, weight: 400, size: 120, y: 1120, accent: '$accent', accent2: '$red', subtitleSize: 38, exit: 9.6 },
    },
    // "Le fix" : la solution arrive en 2e temps.
    {
      type: 'group',
      id: `fix-${k}`,
      start: 5.2,
      pivot: { x: CX, y: 1460 },
      keyframes: keys([kf(0, { scale: 0.5, opacity: 0, y: 30 }), kf(0.55, { scale: 1, opacity: 1, y: 0, easing: 'back(2)' })], leave(4.4, { dur: 0.3 })),
      layers: [
        { type: 'path', id: `fix-bg-${k}`, shape: { type: 'rect', x: 110, y: 1395, width: W - 220, height: 130, radius: 65 }, fill: gradient(90, [alpha(P.accent, 22), 0], [alpha(P.primary, 22), 1]), stroke: alpha(P.accent, 70), strokeWidth: 2 },
        icon(`fix-check-${k}`, 'check', 190, 1460, 52, P.accent, { strokeWidth: 3 }),
        { type: 'text', id: `fix-label-${k}`, content: `*LE FIX :* ${it.fix}`, font: F.body, size: 36, weight: 600, align: 'left', highlight: P.accent, anchor: { x: 240, y: 1460 }, maxWidth: 700 },
      ],
    },
    vignette(),
  ];
  return { layers, out: it.out };
}

const items = ITEMS.map(itemScene);

export default storyboard(
  'Top 5 — Les erreurs qui tuent ta vidéo',
  { palette: P, fonts: [F.display, F.body] },
  { logo: './assets/logo-flame.svg' },
  [
    /* ───────── 0–7 s : intro ───────── */
    scene(
      'intro',
      7,
      [
        orb('i1', 240, 700, 620, P.red, { dur: 7, dx: 100 }),
        orb('i2', 860, 1300, 620, P.primary, { dur: 7, dx: -100 }),
        shockwave('i-shock', CX, 880, P.accent, 0.3, 3),
        {
          type: 'text',
          id: 'top',
          content: 'TOP',
          font: F.display,
          size: 200,
          weight: 400,
          letterSpacing: 20,
          color: P.text,
          anchor: { x: CX, y: 420 },
          keyframes: keys([kf(0, { y: -200, opacity: 0 }), kf(0.7, { y: 0, opacity: 1, easing: 'back' })], leave(6.4, { y: -60, dur: 0.4 })),
        },
        {
          type: 'text',
          id: 'five',
          content: '5',
          font: F.display,
          size: 560,
          weight: 400,
          color: gradient(180, [P.accent, 0], [P.primary, 0.5], [P.red, 1]),
          anchor: { x: CX, y: 880 },
          shadow: { color: alpha(P.red, 60), blur: 80 },
          keyframes: keys(
            [kf(0.3, { scale: 3, opacity: 0, rotate: -25 }), kf(0.4, { opacity: 1, easing: 'linear' }), kf(1.4, { scale: 1, rotate: 0, easing: 'elastic(1.3,0.32)' })],
            [kf(1.6, { rotate: 0 }), kf(3.6, { rotate: 4, easing: 'ease-in-out' }), kf(5.6, { rotate: -2, easing: 'ease-in-out' })],
            leave(6.4, { scale: 1.3, dur: 0.4 }),
          ),
        },
        {
          type: 'component',
          ref: 'title-card',
          start: 1.4,
          props: { title: 'des erreurs qui\n*tuent* ta vidéo', style: 'rise', font: F.display, weight: 400, size: 104, y: 1360, accent: '$accent', accent2: '$red', underline: true, exit: 5.9 },
        },
        vignette(),
      ],
      { background: gradient(180, ['#1a0707', 0], ['#0c0606', 1]), out: { type: 'glitch', duration: 0.4 } },
    ),

    ...items.map(({ layers, out }, k) =>
      scene(`n${ITEMS[k]!.rank}`, 10.6, layers, {
        background: gradient(180, [k % 2 ? '#180808' : '#1a0d05', 0], ['#0c0606', 1]),
        in: k === 0 ? { type: 'glitch', duration: 0.4 } : items[k - 1]!.out,
        out,
      }),
    ),

    /* ───────── outro ───────── */
    scene(
      'outro',
      7.15,
      [
        orb('o1', CX, 700, 700, P.primary, { dur: 7.15, dx: 0, dy: 60 }),
        { type: 'component', ref: 'logo-reveal', start: 0.2, props: { src: '@logo', text: 'FLAME TIPS', tagline: 'Laquelle tu fais *encore* ?', y: 680, size: 220, font: F.display, textSize: 110, accent: '$red', accent2: '$accent' } },
        cta('cta', 'Suis pour la suite', { y: 1300, from: P.accent, to: P.red, font: F.body, t0: 2, w: 720, size: 44 }),
        chip('comment', 'RÉPONDS EN COMMENTAIRE', CX, 1460, { font: F.body, color: P.accent, t0: 2.8, size: 28 }),
        vignette(),
      ],
      { background: { type: 'radial', center: { x: CX, y: 700 }, radius: 1300, stops: [['#2a0e08', 0], ['#0c0606', 1]] }, in: items[items.length - 1]!.out, out: { type: 'fade', duration: 0.6, easing: 'ease-in-out' } },
    ),
  ],
  {
    overlays: [
      // Signature (image + pseudo) pendant le classement.
      {
        type: 'group',
        id: 'signature',
        start: 6.6,
        end: 57.9,
        keyframes: [kf(0, { opacity: 0 }), kf(0.5, { opacity: 0.9, easing: 'ease-out' })],
        layers: [
          image('signature-logo', '@logo', 860, 296, 48),
          { type: 'text', id: 'signature-handle', content: '@flame.tips', font: F.body, size: 26, weight: 600, align: 'left', color: '$text/80', anchor: { x: 894, y: 296 } },
        ],
      },
    ],
  },
);

