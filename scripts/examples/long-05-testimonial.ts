/**
 * long-05-testimonial — "Témoignages / social proof" (~68 s)
 * Alternance citations (avatar + étoiles + lower-third) et stats animées
 * (compteurs, anneau, barres). Transitions variées.
 * Composants : title-card, lower-third (×3), logo-reveal.
 */
import type { LayerInput, TransitionInput } from '../../src/types/storyboard.ts';
import { CX, W, alpha, cta, gradient, icon, image, kf, keys, leave, orb, particles, ring, scene, storyboard, vignette } from './kit.ts';

const P = { primary: '#f5c66b', accent: '#ff8fa3', blue: '#7cc4ff', text: '#fff7ec', background: '#081120' };
const F = { serif: 'DM Serif Display', body: 'Inter' };
const bg = gradient(180, ['#0e1b33', 0], ['#081120', 1]);

function stars(id: string, y: number, t0: number, size = 56, gap = 76): LayerInput {
  return {
    type: 'group',
    id,
    layers: [0, 1, 2, 3, 4].map((k) =>
      icon(`${id}-${k}`, 'star', CX - 2 * gap + k * gap, y, size, gradient(180, ['#ffe2a3', 0], [P.primary, 1]), {
        keyframes: [kf(t0 + k * 0.1, { scale: 0, rotate: -72 }), kf(t0 + 0.7 + k * 0.1, { scale: 1, rotate: 0, easing: 'elastic' })],
      }),
    ),
  };
}

function quoteScene(o: { avatar: string; quote: string; name: string; role: string; accent: string; dur: number }): LayerInput[] {
  return [
    orb('q-orb', 880, 560, 520, o.accent, { dur: o.dur, dx: -120, dy: 80, opacity: 0.55 }),
    orb('q-orb2', 180, 1500, 480, P.blue, { dur: o.dur, dx: 120, dy: -60, opacity: 0.35 }),
    // Avatar + anneau qui se dessine.
    {
      type: 'path',
      id: 'avatar-ring',
      shape: { type: 'circle', cx: CX, cy: 520, r: 128 },
      stroke: gradient(135, [P.primary, 0], [o.accent, 1]),
      strokeWidth: 5,
      fill: 'none',
      pathLength: 1,
      keyframes: [kf(0.4, { strokeDashoffset: 1 }), kf(1.4, { strokeDashoffset: 0, easing: 'cubic-bezier(0.65,0,0.35,1)' })],
    },
    image('avatar', o.avatar, CX, 520, 220, keys([kf(0.2, { scale: 0.4, opacity: 0 }), kf(1.1, { scale: 1, opacity: 1, easing: 'spring(180,13)' })], leave(o.dur - 0.9, { scale: 0.9 }))),
    stars('stars', 720, 0.9),
    {
      type: 'text',
      id: 'quote',
      content: `« ${o.quote} »`,
      font: F.serif,
      size: 82,
      weight: 400,
      highlight: gradient(90, [P.primary, 0], [o.accent, 1]),
      anchor: { x: CX, y: 1060 },
      maxWidth: 840,
      lineHeight: 1.12,
      split: { by: 'word', start: 1.6, stagger: 0.12, duration: 0.8, easing: 'ease-in-out', from: { y: 30, opacity: 0 } },
      keyframes: leave(o.dur - 0.9, { y: -40 }),
    },
    { type: 'component', ref: 'lower-third', start: 3.6, props: { name: o.name, role: o.role, font: F.serif, size: 56, accent: o.accent.startsWith('#') ? o.accent : '$accent', y: 1460, duration: o.dur - 4.3 } },
  ];
}

const T: Record<string, TransitionInput> = {
  fade: { type: 'fade', duration: 0.5, easing: 'ease-in-out' },
  wipe: { type: 'wipe-left', duration: 0.5, easing: 'cubic-bezier(0.65,0,0.35,1)' },
  circle: { type: 'circle', duration: 0.5, easing: 'cubic-bezier(0.65,0,0.35,1)' },
  slide: { type: 'slide-up', duration: 0.5, easing: 'cubic-bezier(0.7,0,0.2,1)' },
  zoom: { type: 'zoom', duration: 0.45, easing: 'ease-in' },
  flash: { type: 'flash', duration: 0.3, easing: 'ease-out' },
};

export default storyboard(
  'Lumen — Ils en parlent',
  { palette: P, fonts: [F.serif, F.body] },
  { logo: './assets/logo-lumen.svg', a1: './assets/avatar-1.svg', a2: './assets/avatar-2.svg', a3: './assets/avatar-3.svg' },
  [
    /* ───────── intro ───────── */
    scene(
      'intro',
      7,
      [
        orb('i1', 220, 640, 560, P.primary, { dur: 7, dx: 120, opacity: 0.6 }),
        orb('i2', 860, 1400, 560, P.accent, { dur: 7, dx: -120, opacity: 0.5 }),
        particles('dust', P.primary, 22, 3, 7),
        stars('intro-stars', 560, 0.2, 64, 88),
        { type: 'component', ref: 'title-card', start: 0.6, props: { kicker: '4,9 / 5 · 2 000 avis', title: 'Ils en parlent\n*mieux* que nous.', style: 'mask', weight: 400, size: 122, y: 930, accent: '$primary', accent2: '$accent', exit: 6.3 } },
        vignette(),
      ],
      { background: bg, out: T.fade },
    ),

    /* ───────── citation 1 ───────── */
    scene('citation-1', 11.5, quoteScene({ avatar: '@a1', quote: 'En trois mois, notre audience a *doublé*. Sans recruter.', name: 'Sarah K.', role: 'Fondatrice · Maison Céleste', accent: P.accent, dur: 11.5 }), { background: bg, in: T.fade, out: T.wipe }),

    /* ───────── stats 1 : compteur de clients ───────── */
    scene(
      'stats-1',
      9.5,
      [
        orb('s1', CX, 900, 700, P.primary, { dur: 9.5, dx: 0, dy: -60, opacity: 0.45 }),
        ring('clients-ring', CX, 820, 300, { color: gradient(90, [P.primary, 0], [P.accent, 1]), width: 18, t0: 0.4, t1: 3.2, to: 0.92, easing: 'cubic-bezier(0.33,1,0.68,1)' }),
        {
          type: 'text',
          id: 'clients',
          content: '+{value}',
          font: F.serif,
          size: 160,
          weight: 400,
          thousandsSeparator: ' ',
          color: gradient(180, ['#ffffff', 0], [P.primary, 1]),
          anchor: { x: CX, y: 800 },
          keyframes: keys([kf(0.4, { value: 0, scale: 0.6, opacity: 0 }), kf(0.8, { opacity: 1, easing: 'linear' }), kf(1.3, { scale: 1, easing: 'back' }), kf(3.2, { value: 12400, easing: 'ease-out-expo' })], leave(8.8)),
        },
        {
          type: 'text',
          id: 'clients-label',
          content: 'CLIENTS ACCOMPAGNÉS',
          font: F.body,
          size: 34,
          weight: 700,
          letterSpacing: 6,
          color: '$text/70',
          anchor: { x: CX, y: 950 },
          keyframes: keys([kf(1.2, { opacity: 0, y: 20 }), kf(1.8, { opacity: 1, y: 0, easing: 'ease-out' })], leave(8.8)),
        },
        // Mini histogramme de croissance.
        ...[0.35, 0.5, 0.45, 0.7, 0.85, 1].map((h, k): LayerInput => ({
          type: 'path',
          id: `growth-${k}`,
          shape: { type: 'rect', x: 230 + k * 110, y: 1420 - 260 * h, width: 70, height: 260 * h, radius: 14 },
          fill: gradient(180, [k === 5 ? P.accent : P.primary, 0], [alpha(P.primary, 20), 1]),
          clipDirection: 'bottom-to-top',
          keyframes: keys([kf(2 + k * 0.15, { clipProgress: 0 }), kf(2.6 + k * 0.15, { clipProgress: 1, easing: 'back' })], leave(8.8)),
        })),
        {
          type: 'text',
          id: 'growth-label',
          content: '2019 → 2025',
          font: F.body,
          size: 28,
          weight: 500,
          color: '$text/45',
          anchor: { x: CX, y: 1470 },
          keyframes: [kf(3, { opacity: 0 }), kf(3.6, { opacity: 1, easing: 'ease-in' })],
        },
        vignette(),
      ],
      { background: bg, in: T.wipe, out: T.circle },
    ),

    /* ───────── citation 2 ───────── */
    scene('citation-2', 11.5, quoteScene({ avatar: '@a2', quote: 'Le meilleur investissement de l’année. On aurait dû commencer *plus tôt*.', name: 'Thomas L.', role: 'Directeur marketing · Atelier Nord', accent: P.blue, dur: 11.5 }), { background: bg, in: T.circle, out: T.slide }),

    /* ───────── stats 2 : note + recommandation ───────── */
    scene(
      'stats-2',
      9.5,
      [
        orb('s2', 860, 700, 600, P.accent, { dur: 9.5, dx: -100, dy: 60, opacity: 0.45 }),
        {
          type: 'text',
          id: 'rating',
          content: '{value}',
          font: F.serif,
          size: 260,
          weight: 400,
          decimals: 1,
          decimalSeparator: ',',
          color: gradient(180, ['#ffffff', 0], [P.primary, 1]),
          anchor: { x: CX - 70, y: 640 },
          keyframes: keys([kf(0.3, { value: 0, opacity: 0 }), kf(0.6, { opacity: 1, easing: 'linear' }), kf(2.4, { value: 4.9, easing: 'cubic-bezier(0.16,1,0.3,1)' })], leave(8.8)),
        },
        { type: 'text', id: 'rating-max', content: '/ 5', font: F.serif, size: 90, weight: 400, color: '$text/50', align: 'left', anchor: { x: CX + 140, y: 690 }, keyframes: keys([kf(0.8, { opacity: 0, x: 30 }), kf(1.4, { opacity: 1, x: 0, easing: 'ease-out' })], leave(8.8)) },
        // Étoiles qui se remplissent (clip gauche → droite) par-dessus un contour.
        {
          type: 'group',
          id: 'fill-stars',
          keyframes: leave(8.8),
          layers: [
            stars('outline-stars', 860, 0.4, 70, 96),
            {
              type: 'path',
              id: 'stars-sheen',
              shape: { type: 'rect', x: CX - 260, y: 810, width: 520, height: 100, radius: 20 },
              fill: gradient(90, [alpha('#ffffff', 0), 0], [alpha('#ffffff', 35), 0.5], [alpha('#ffffff', 0), 1]),
              blend: 'add',
              clipDirection: 'left-to-right',
              keyframes: [kf(1.4, { clipProgress: 0, opacity: 1 }), kf(2.4, { clipProgress: 1, easing: 'ease-in-out' }), kf(2.4, { opacity: 1 }), kf(3, { opacity: 0, easing: 'ease-out' })],
            },
          ],
        },
        // Recommandation : barre horizontale + pourcentage.
        {
          type: 'group',
          id: 'reco',
          keyframes: keys([kf(2.6, { opacity: 0, y: 40 }), kf(3.2, { opacity: 1, y: 0, easing: 'ease-out' })], leave(8.8)),
          layers: [
            { type: 'path', id: 'reco-track', shape: { type: 'rect', x: 140, y: 1180, width: W - 280, height: 28, radius: 14 }, fill: 'rgba(255,255,255,0.1)' },
            {
              type: 'path',
              id: 'reco-bar',
              shape: { type: 'rect', x: 140, y: 1180, width: (W - 280) * 0.98, height: 28, radius: 14 },
              fill: gradient(90, [P.primary, 0], [P.accent, 1]),
              clipDirection: 'left-to-right',
              keyframes: [kf(3, { clipProgress: 0 }), kf(5, { clipProgress: 1, easing: 'cubic-bezier(0.33,1,0.68,1)' })],
            },
            { type: 'text', id: 'reco-value', content: '{value} %', font: F.serif, size: 110, weight: 400, color: P.primary, anchor: { x: CX, y: 1340 }, keyframes: [kf(3, { value: 0 }), kf(5, { value: 98, easing: 'cubic-bezier(0.33,1,0.68,1)' })] },
            { type: 'text', id: 'reco-label', content: 'nous recommandent à un proche', font: F.body, size: 36, weight: 500, color: '$text/70', anchor: { x: CX, y: 1440 } },
          ],
        },
        vignette(),
      ],
      { background: bg, in: T.slide, out: T.zoom },
    ),

    /* ───────── citation 3 ───────── */
    scene('citation-3', 11.45, quoteScene({ avatar: '@a3', quote: 'Enfin une équipe qui comprend *notre marque*.', name: 'Nadia B.', role: 'Créatrice · 310k abonnés', accent: P.accent, dur: 11.45 }), { background: bg, in: T.zoom, out: T.flash }),

    /* ───────── outro ───────── */
    scene(
      'outro',
      10.3,
      [
        orb('o1', CX, 700, 700, P.primary, { dur: 10.3, dx: 0, dy: 60, opacity: 0.6 }),
        particles('dust2', P.primary, 22, 9, 10.3),
        { type: 'component', ref: 'logo-reveal', start: 0.2, props: { src: '@logo', text: 'LUMEN', tagline: 'Rejoins *2 000 marques* qui ont osé.', y: 680, size: 230, font: F.serif, textSize: 120, accent: '$primary', accent2: '$accent' } },
        cta('cta', 'Réserver un appel', { y: 1300, from: P.primary, to: P.accent, font: F.body, t0: 2.2, w: 740, size: 44, color: '#1a1020' }),
        vignette(),
      ],
      { background: { type: 'radial', center: { x: CX, y: 700 }, radius: 1300, stops: [['#18284a', 0], ['#081120', 1]] }, in: T.flash, out: { type: 'fade', duration: 0.8, easing: 'ease-in-out' } },
    ),
  ],
);
