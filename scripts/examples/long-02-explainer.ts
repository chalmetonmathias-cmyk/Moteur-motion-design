/**
 * long-02-explainer — "Explainer produit" (~68 s)
 * Intro → 3 features → démo visuelle (stroke-dashoffset massif + clip
 * reveals) → outro CTA. Composants : title-card, lower-third, logo-reveal.
 */
import type { LayerInput } from '../../src/types/storyboard.ts';
import { CX, W, alpha, chip, cta, gradient, grid, icon, image, kf, keys, leave, orb, ring, scene, storyboard, vignette } from './kit.ts';

const P = { primary: '#3d7bff', accent: '#2ee6c5', amber: '#ffb547', text: '#ffffff', background: '#050d14' };
const F = { display: 'Space Grotesk', body: 'Inter' };
const bg = gradient(180, ['#071722', 0], ['#050d14', 1]);

/** Grand numéro de feature en contour (stroke) qui se remplit par un clip. */
function featureNumber(n: string, y = 400): LayerInput[] {
  return [
    {
      type: 'text',
      id: `num-outline-${n}`,
      content: n,
      font: F.display,
      size: 190,
      weight: 700,
      align: 'left',
      fill: 'none',
      stroke: alpha(P.accent, 70),
      strokeWidth: 3,
      anchor: { x: 104, y },
      keyframes: [kf(0, { opacity: 0, x: -60 }), kf(0.6, { opacity: 1, x: 0, easing: 'ease-out' })],
    },
    {
      type: 'text',
      id: `num-fill-${n}`,
      content: n,
      font: F.display,
      size: 190,
      weight: 700,
      align: 'left',
      color: gradient(180, [P.accent, 0], [P.primary, 1]),
      anchor: { x: 104, y },
      clipDirection: 'bottom-to-top',
      keyframes: [kf(0.6, { clipProgress: 0 }), kf(1.4, { clipProgress: 1, easing: 'cubic-bezier(0.65,0,0.35,1)' })],
    },
  ];
}

const featureTitle = (title: string, sub: string, y = 600): LayerInput => ({
  type: 'component',
  ref: 'title-card',
  start: 0.4,
  props: { title, subtitle: sub, style: 'rise', size: 76, align: 'left', x: 110, y, maxWidth: 860, underline: false, accent: '$accent', subtitleSize: 34 },
});

/* ── Démo : tableau de bord en dessin au trait ── */
const D = { x: 120, y: 560, w: W - 240, h: 860 };
const chartBase = D.y + 640;
const BARS = [110, 170, 140, 220, 200, 270, 250, 320];

function demoLayers(): LayerInput[] {
  const layers: LayerInput[] = [];
  // Cadre + séparateurs : tous dessinés au trait (strokeDashoffset).
  layers.push({
    type: 'path',
    id: 'frame',
    shape: { type: 'rect', x: D.x, y: D.y, width: D.w, height: D.h, radius: 36 },
    stroke: gradient(90, [P.accent, 0], [P.primary, 1]),
    strokeWidth: 3,
    fill: 'none',
    pathLength: 1,
    keyframes: [kf(0.2, { strokeDashoffset: 1 }), kf(1.6, { strokeDashoffset: 0, easing: 'cubic-bezier(0.65,0,0.35,1)' })],
  });
  const gridD = Array.from({ length: 4 }, (_, k) => `M${D.x + 60},${chartBase - k * 110} H${D.x + D.w - 60}`).join(' ');
  layers.push({
    type: 'path',
    id: 'chart-grid',
    d: gridD,
    stroke: 'rgba(255,255,255,0.12)',
    strokeWidth: 2,
    pathLength: 1,
    keyframes: [kf(0.9, { strokeDashoffset: 1 }), kf(2.1, { strokeDashoffset: 0, easing: 'ease-in-out' })],
  });
  // Barres : clip reveal bas → haut, en cascade.
  BARS.forEach((h, k) => {
    const bx = D.x + 90 + k * 92;
    layers.push({
      type: 'path',
      id: `bar-${k}`,
      shape: { type: 'rect', x: bx, y: chartBase - h, width: 56, height: h, radius: 14 },
      fill: gradient(180, [alpha(P.primary, 95), 0], [alpha(P.primary, 25), 1]),
      clipDirection: 'bottom-to-top',
      keyframes: [kf(1.6 + k * 0.12, { clipProgress: 0 }), kf(2.3 + k * 0.12, { clipProgress: 1, easing: 'back' })],
    });
  });
  // Courbe de tendance : longue ligne qui se dessine + points qui éclosent.
  const pts = BARS.map((h, k) => [D.x + 118 + k * 92, chartBase - h - 60] as const);
  const curve = pts.map(([x, y], k) => (k === 0 ? `M${x},${y}` : `L${x},${y}`)).join(' ');
  layers.push({
    type: 'path',
    id: 'trend',
    d: curve,
    stroke: P.accent,
    strokeWidth: 7,
    pathLength: 1,
    shadow: { color: alpha(P.accent, 70), blur: 24 },
    keyframes: [kf(2.8, { strokeDashoffset: 1 }), kf(4.4, { strokeDashoffset: 0, easing: 'cubic-bezier(0.33,1,0.68,1)' })],
  });
  pts.forEach(([x, y], k) =>
    layers.push({
      type: 'path',
      id: `dot-${k}`,
      shape: { type: 'circle', cx: x, cy: y, r: 13 },
      fill: '#ffffff',
      stroke: P.accent,
      strokeWidth: 5,
      pivot: 'center',
      keyframes: [kf(2.9 + k * 0.19, { scale: 0 }), kf(3.5 + k * 0.19, { scale: 1, easing: 'elastic' })],
    }),
  );
  // KPI en haut du tableau : cartes révélées gauche → droite + compteur.
  ([
    ['Tâches finies', '{value}', 128, P.accent],
    ['Productivité', '+{value} %', 184, P.amber],
  ] as const).forEach(([label, content, value, c], k) => {
    const kx = D.x + 50 + k * 400;
    layers.push({
      type: 'group',
      id: `kpi-${k}`,
      layers: [
        {
          type: 'path',
          id: `kpi-bg-${k}`,
          shape: { type: 'rect', x: kx, y: D.y + 50, width: 360, height: 190, radius: 28 },
          fill: 'rgba(255,255,255,0.06)',
          stroke: alpha(c, 50),
          strokeWidth: 2,
          clipDirection: 'left-to-right',
          keyframes: [kf(1.2 + k * 0.25, { clipProgress: 0 }), kf(1.9 + k * 0.25, { clipProgress: 1, easing: 'ease-out-expo' })],
        },
        { type: 'text', id: `kpi-label-${k}`, content: label, font: F.body, size: 30, weight: 500, color: '$text/60', align: 'left', anchor: { x: kx + 36, y: D.y + 105 }, keyframes: [kf(1.6 + k * 0.25, { opacity: 0 }), kf(2 + k * 0.25, { opacity: 1, easing: 'ease-out' })] },
        {
          type: 'text',
          id: `kpi-value-${k}`,
          content,
          font: F.display,
          size: 76,
          weight: 700,
          color: c,
          align: 'left',
          anchor: { x: kx + 36, y: D.y + 180 },
          keyframes: [kf(1.8 + k * 0.25, { value: 0, opacity: 0 }), kf(2.1 + k * 0.25, { opacity: 1, easing: 'linear' }), kf(4.6, { value, easing: 'ease-out-expo' })],
        },
      ],
    });
  });
  // Donut : deux arcs dessinés.
  layers.push(
    ring('donut-a', D.x + D.w - 150, D.y + D.h - 95, 62, { color: P.accent, width: 26, t0: 3.6, t1: 4.8, to: 0.68, easing: 'ease-in-out' }),
    { type: 'text', id: 'donut-label', content: '{value}%', font: F.display, size: 34, weight: 700, anchor: { x: D.x + D.w - 150, y: D.y + D.h - 95 }, keyframes: [kf(3.6, { value: 0, opacity: 0 }), kf(3.9, { opacity: 1, easing: 'linear' }), kf(4.8, { value: 68, easing: 'ease-in-out' })] },
    { type: 'text', id: 'legend', content: 'Objectif du sprint', font: F.body, size: 32, weight: 500, color: '$text/60', align: 'left', anchor: { x: D.x + 60, y: D.y + D.h - 95 }, keyframes: [kf(4.2, { opacity: 0, x: -20 }), kf(4.8, { opacity: 1, x: 0, easing: 'ease-out' })] },
  );
  return layers;
}

export default storyboard(
  'Flowdesk — Explainer',
  { palette: P, fonts: [F.display, F.body] },
  { logo: './assets/logo-flow.svg', phone: './assets/phone-app.svg', a1: './assets/avatar-1.svg', a2: './assets/avatar-2.svg', a3: './assets/avatar-3.svg' },
  [
    /* ───────── 0–9 s : intro ───────── */
    scene(
      'intro',
      9,
      [
        grid('grid', P.accent),
        orb('o1', 900, 500, 520, P.primary, { dur: 9, dx: -100 }),
        orb('o2', 200, 1400, 480, P.accent, { dur: 9, dx: 80, opacity: 0.6 }),
        { type: 'component', ref: 'title-card', start: 0.2, props: { kicker: 'Flowdesk', title: 'Ton travail,\n*expliqué* en 60 s.', style: 'rise', size: 96, y: 500, accent: '$accent', accent2: '$primary', exit: 8.4 } },
        image('phone', '@phone', CX, 1170, 330, keys(
          [kf(0.8, { y: 700, rotate: 8 }), kf(2.2, { y: 0, rotate: 0, easing: 'spring(120,14)' })],
          [kf(2.4, { rotate: 0 }), kf(4.4, { rotate: -2, easing: 'ease-in-out' }), kf(6.4, { rotate: 2, easing: 'ease-in-out' })],
          leave(8.3, { y: 300, dur: 0.5 }),
        ), { shadow: { color: alpha(P.primary, 40), blur: 90, y: 30 } }),
        vignette(),
      ],
      { background: bg, out: { type: 'slide-left', duration: 0.5, easing: 'cubic-bezier(0.7,0,0.2,1)' } },
    ),

    /* ───────── 8.5–20.5 s : feature 1 — capture ───────── */
    scene(
      'capture',
      12,
      [
        orb('o3', 860, 1200, 520, P.accent, { dur: 12, dx: -80, dy: -100, opacity: 0.55 }),
        ...featureNumber('01'),
        featureTitle('Capture tout.', 'Idées, mails, notes vocales : un seul endroit.'),
        {
          type: 'group',
          id: 'inbox',
          pivot: { x: CX, y: 1110 },
          keyframes: keys(
            [kf(0.8, { scale: 0 }), kf(1.6, { scale: 1, easing: 'back' })],
            // Rebond à chaque arrivée (ressort).
            [0, 1, 2, 3, 4, 5].flatMap((k) => [kf(3 + k * 0.9, { scaleY: 0.88, scaleX: 1.08, easing: 'ease-in' }), kf(3.5 + k * 0.9, { scaleY: 1, scaleX: 1, easing: 'spring(300,10)' })]),
          ),
          layers: [
            { type: 'path', id: 'inbox-bg', shape: { type: 'circle', cx: CX, cy: 1110, r: 170 }, fill: gradient(135, [alpha(P.accent, 30), 0], [alpha(P.primary, 30), 1]), stroke: alpha(P.accent, 60), strokeWidth: 3 },
            icon('inbox-icon', 'inbox', CX, 1110, 170, '#ffffff', { strokeWidth: 1.6 }),
          ],
        },
        // Éléments qui volent vers la boîte (ease-in = accélération vers la cible).
        ...([
          ['IDÉE', -380, -320],
          ['EMAIL', 380, -280],
          ['NOTE VOCALE', -400, 120],
          ['LIEN', 400, 160],
          ['PHOTO', -260, 380],
          ['TÂCHE', 260, 400],
        ] as const).map(([label, dx, dy], k): LayerInput => ({
          ...chip(`item-${k}`, label, CX, 1110, { font: F.body, color: k % 2 ? P.accent : P.amber, t0: 1.6 + k * 0.15 }),
          keyframes: [
            kf(1.6 + k * 0.15, { x: dx, y: dy, scale: 0.4, opacity: 0 }),
            kf(2.1 + k * 0.15, { scale: 1, opacity: 1, easing: 'back' }),
            kf(2.4 + k * 0.9, { x: dx, y: dy, scale: 1 }),
            kf(3 + k * 0.9, { x: 0, y: 0, scale: 0.2, easing: 'ease-in' }),
            kf(3.05 + k * 0.9, { opacity: 0, easing: 'linear' }),
          ],
        })),
        {
          type: 'text',
          id: 'captured',
          content: '{value} / 6 capturés',
          font: F.display,
          size: 46,
          weight: 600,
          color: P.accent,
          anchor: { x: CX, y: 1450 },
          keyframes: [kf(2.6, { value: 0, opacity: 0 }), kf(3, { opacity: 1, easing: 'ease-out' }), kf(8.4, { value: 6, easing: 'steps(6)' }), ...leave(11.3)],
        },
        vignette(),
      ],
      { background: bg, in: { type: 'slide-left', duration: 0.5, easing: 'cubic-bezier(0.7,0,0.2,1)' }, out: { type: 'wipe-up', duration: 0.5, easing: 'cubic-bezier(0.65,0,0.35,1)' } },
    ),

    /* ───────── 20–32 s : feature 2 — organisation automatique ───────── */
    scene(
      'organise',
      12,
      [
        ...featureNumber('02'),
        featureTitle('Range tout\nautomatiquement.', 'Les tâches trouvent leur colonne.', 640),
        // Colonnes kanban : révélées de haut en bas (clip).
        ...(['À faire', 'En cours', 'Fait'] as const).flatMap((label, k): LayerInput[] => {
          const x = 110 + k * 295;
          return [
            {
              type: 'path',
              id: `col-${k}`,
              shape: { type: 'rect', x, y: 860, width: 270, height: 640, radius: 30 },
              fill: 'rgba(255,255,255,0.05)',
              stroke: 'rgba(255,255,255,0.1)',
              strokeWidth: 2,
              clipDirection: 'top-to-bottom',
              keyframes: [kf(0.9 + k * 0.15, { clipProgress: 0 }), kf(1.7 + k * 0.15, { clipProgress: 1, easing: 'ease-out-expo' })],
            },
            { type: 'text', id: `col-label-${k}`, content: label.toUpperCase(), font: F.body, size: 26, weight: 700, letterSpacing: 3, color: [P.amber, P.primary, P.accent][k]!, anchor: { x: x + 135, y: 910 }, keyframes: [kf(1.3 + k * 0.15, { opacity: 0 }), kf(1.8 + k * 0.15, { opacity: 1, easing: 'ease-out' })] },
          ];
        }),
        // 4 cartes qui naissent dans "À faire" puis migrent (ressort).
        ...[0, 1, 2, 3].map((k): LayerInput => {
          const y0 = 975 + k * 125;
          const path = [
            [0, 0],
            [k < 2 ? 295 : 0, 0],
            [k < 1 ? 590 : k < 3 ? 295 : 0, 0],
          ] as const;
          return {
            type: 'group',
            id: `task-${k}`,
            pivot: { x: 245, y: y0 + 50 },
            keyframes: keys(
              [kf(2 + k * 0.2, { scale: 0, opacity: 0 }), kf(2.5 + k * 0.2, { scale: 1, opacity: 1, easing: 'back' })],
              [kf(4.2 + k * 0.3, { x: path[0][0] }), kf(5 + k * 0.3, { x: path[1][0], easing: 'spring(160,15)' }), kf(7 + k * 0.3, { x: path[1][0] }), kf(7.8 + k * 0.3, { x: path[2][0], easing: 'spring(160,15)' })],
            ),
            layers: [
              { type: 'path', id: `task-bg-${k}`, shape: { type: 'rect', x: 130, y: y0, width: 230, height: 100, radius: 20 }, fill: 'rgba(255,255,255,0.1)', stroke: alpha([P.amber, P.primary, P.accent, '#ffffff'][k]!, 60), strokeWidth: 2 },
              { type: 'path', id: `task-l1-${k}`, shape: { type: 'rect', x: 156, y: y0 + 28, width: 150 - k * 14, height: 14, radius: 7 }, fill: 'rgba(255,255,255,0.8)' },
              { type: 'path', id: `task-l2-${k}`, shape: { type: 'rect', x: 156, y: y0 + 58, width: 100, height: 10, radius: 5 }, fill: 'rgba(255,255,255,0.35)' },
            ],
          };
        }),
        vignette(),
      ],
      { background: bg, in: { type: 'wipe-up', duration: 0.5, easing: 'cubic-bezier(0.65,0,0.35,1)' }, out: { type: 'circle', duration: 0.6, easing: 'cubic-bezier(0.65,0,0.35,1)' } },
    ),

    /* ───────── 31.4–43 s : feature 3 — équipe ───────── */
    scene(
      'equipe',
      11.6,
      [
        orb('o4', CX, 1080, 620, P.primary, { dur: 11.6, dx: 0, dy: -60 }),
        ...featureNumber('03'),
        featureTitle('Avance en équipe.', 'Tout le monde voit où on en est.'),
        {
          type: 'path',
          id: 'links',
          d: `M${CX},900 L270,1320 L${W - 270},1320 Z`,
          stroke: gradient(90, [P.accent, 0], [P.primary, 1]),
          strokeWidth: 4,
          strokeDasharray: [0.02, 0.015],
          pathLength: 1,
          keyframes: [kf(1, { opacity: 0 }), kf(1.5, { opacity: 1, easing: 'ease-out' }), kf(1.5, { strokeDashoffset: 0 }), kf(11.6, { strokeDashoffset: -0.35, easing: 'linear' })],
        },
        ...([
          ['@a1', CX, 900],
          ['@a2', 270, 1320],
          ['@a3', W - 270, 1320],
        ] as const).map(([src, x, y], k) => image(`member-${k}`, src, x, y, 170, [kf(0.8 + k * 0.25, { scale: 0, opacity: 0 }), kf(1.6 + k * 0.25, { scale: 1, opacity: 1, easing: 'spring(200,12)' })])),
        ring('team-progress', CX, 1180, 120, { color: gradient(90, [P.accent, 0], [P.primary, 1]), width: 18, t0: 2.4, t1: 5, to: 0.78, easing: 'ease-in-out' }),
        {
          type: 'text',
          id: 'team-value',
          content: '{value}%',
          font: F.display,
          size: 64,
          weight: 700,
          anchor: { x: CX, y: 1180 },
          keyframes: [kf(2.4, { value: 0, opacity: 0 }), kf(2.7, { opacity: 1, easing: 'linear' }), kf(5, { value: 78, easing: 'ease-in-out' })],
        },
        chip('sync', 'SYNCHRO EN DIRECT', CX, 1500, { font: F.body, color: P.accent, t0: 5.2 }),
        vignette(),
      ],
      { background: bg, in: { type: 'circle', duration: 0.6, easing: 'cubic-bezier(0.65,0,0.35,1)' }, out: { type: 'zoom', duration: 0.45, easing: 'ease-in' } },
    ),

    /* ───────── 42.55–58 s : démo ───────── */
    scene(
      'demo',
      15.45,
      [
        grid('grid2', P.primary, { step: 60, opacity: 0.6 }),
        {
          type: 'text',
          id: 'demo-title',
          content: 'Ton tableau de bord,\n*en direct*.',
          font: F.display,
          size: 64,
          weight: 700,
          highlight: P.accent,
          anchor: { x: CX, y: 420 },
          maxWidth: 820,
          split: { by: 'word', start: 0.1, stagger: 0.07, duration: 0.6, easing: 'cubic-bezier(0.16,1,0.3,1)', from: { y: 40, opacity: 0 } },
        },
        { type: 'group', id: 'dashboard', keyframes: leave(14.8, { scale: 0.96, dur: 0.5 }), pivot: { x: CX, y: 1000 }, layers: demoLayers() },
        // Deuxième passe : l'écran se "recalibre" (re-dessin complet en sens inverse).
        {
          type: 'path',
          id: 'scanline',
          shape: { type: 'rect', x: D.x, y: D.y, width: D.w, height: 6, radius: 3 },
          fill: gradient(90, [alpha(P.accent, 0), 0], [P.accent, 0.5], [alpha(P.accent, 0), 1]),
          keyframes: [kf(6, { y: 0, opacity: 0 }), kf(6.2, { opacity: 1, easing: 'linear' }), kf(8.2, { y: D.h - 6, easing: 'ease-in-out' }), kf(8.4, { opacity: 0, easing: 'linear' })],
        },
        {
          type: 'text',
          id: 'demo-caption',
          content: 'Chiffres, courbes, objectifs : à jour, sans effort.',
          font: F.body,
          size: 36,
          weight: 500,
          color: '$text/70',
          anchor: { x: CX, y: 1520 },
          maxWidth: 820,
          keyframes: [kf(5, { opacity: 0, y: 20 }), kf(5.6, { opacity: 1, y: 0, easing: 'ease-out' })],
        },
        vignette(),
      ],
      { background: bg, in: { type: 'zoom', duration: 0.45 }, out: { type: 'flash', duration: 0.3, easing: 'ease-out' } },
    ),

    /* ───────── 57.7–68 s : outro ───────── */
    scene(
      'outro',
      10.3,
      [
        orb('o5', CX, 760, 700, P.accent, { dur: 10.3, dx: 0, dy: 60, opacity: 0.6 }),
        { type: 'component', ref: 'logo-reveal', start: 0.2, props: { src: '@logo', text: 'Flowdesk', tagline: 'Ton travail, *enfin fluide*.', y: 700, size: 230, textSize: 104, accent: '$accent', accent2: '$primary' } },
        cta('cta', 'Essai gratuit', { y: 1290, from: P.primary, to: P.accent, font: F.display, t0: 2.2 }),
        { type: 'component', ref: 'lower-third', start: 3, props: { name: 'iOS · Android · Web', role: 'Disponible maintenant', size: 46, accent: '$accent', y: 1490 } },
        vignette(),
      ],
      { background: { type: 'radial', center: { x: CX, y: 700 }, radius: 1300, stops: [['#0b2230', 0], ['#050d14', 1]] }, in: { type: 'flash', duration: 0.3 }, out: { type: 'fade', duration: 0.8, easing: 'ease-in-out' } },
    ),
  ],
);

