/**
 * short-02-quote — "Citation inspirante" (~40 s)
 * Fond en dégradé animé (scène "backdrop" de 40 s sous toutes les autres,
 * démarrages explicites), citation mot par mot, lower-third pour l'autrice,
 * fondu final.
 */
import { CX, H, MID, W, alpha, chip, icon, image, kf, keys, leave, orb, particles, punch, scene, storyboard, vignette } from './kit.ts';
import type { PaintInput } from '../../src/types/storyboard.ts';

const P = { primary: '#ffb36b', accent: '#ff6f61', rose: '#ff9ec4', plum: '#6b2d5c', text: '#fff4ea', background: '#120710' };
const F = { serif: 'Instrument Serif', body: 'Inter' };
const TOTAL = 40;

const g = (angle: number, a: string, b: string, c: string): PaintInput => ({ type: 'linear', angle, stops: [[a, 0], [b, 0.55], [c, 1]] });

export default storyboard(
  'Citation — La constance',
  { palette: P, fonts: [F.serif, F.body] },
  { logo: './assets/logo-lumen.svg' },
  [
    /* ───────── Fond animé sur toute la durée (dessiné sous les autres scènes) ───────── */
    scene(
      'backdrop',
      TOTAL,
      [
        {
          type: 'group',
          id: 'atmosphere',
          // Fondu au noir final du décor (la dernière scène s'efface au-dessus).
          keyframes: [kf(TOTAL - 1.2, { opacity: 1 }), kf(TOTAL, { opacity: 0, easing: 'ease-in' })],
          layers: [
            {
              type: 'path',
              id: 'sky',
              shape: { type: 'rect', x: 0, y: 0, width: W, height: H },
              keyframes: [
                kf(0, { fill: g(170, '#2a0f2e', '#14081a', '#0d0610') }),
                kf(10, { fill: g(190, '#3b1236', '#1a0a1e', '#120710'), easing: 'linear' }),
                kf(22, { fill: g(210, '#4a1a2c', '#22102a', '#0f0712'), easing: 'ease-in-out' }),
                kf(34, { fill: g(180, '#2c1640', '#140a22', '#0a0610'), easing: 'ease-in-out' }),
                kf(TOTAL, { fill: g(160, '#1a0b1e', '#0d0610', '#060306'), easing: 'linear' }),
              ],
            },
            orb('sun', 760, 520, 640, P.accent, { dx: -200, dy: 160, dur: TOTAL, opacity: 0.75 }),
            orb('dusk', 220, 1380, 620, P.plum, { dx: 160, dy: -220, dur: TOTAL }),
            orb('glow', 540, 1700, 520, P.primary, { dx: 0, dy: -300, dur: TOTAL, opacity: 0.5 }),
            particles('dust', P.primary, 26, 7, TOTAL),
            vignette('vignette', 60),
          ],
        },
      ],
      { start: 0 },
    ),

    /* ───────── 0–6.5 s : intro ───────── */
    scene(
      'intro',
      6.5,
      [
        {
          type: 'path',
          id: 'horizon-sun',
          shape: { type: 'circle', cx: CX, cy: 760, r: 150 },
          fill: { type: 'linear', angle: 180, stops: [[P.primary, 0], [P.accent, 1]] },
          shadow: { color: alpha(P.accent, 80), blur: 90 },
          pivot: 'center',
          keyframes: keys(
            [kf(0, { y: 260, opacity: 0 }), kf(1.6, { y: 0, opacity: 1, easing: 'cubic-bezier(0.22,1,0.36,1)' })],
            leave(5.6, { y: -80 }),
          ),
        },
        {
          type: 'path',
          id: 'horizon-line',
          d: `M120,930 H${W - 120}`,
          stroke: { type: 'linear', angle: 90, stops: [[alpha(P.text, 0), 0], [alpha(P.text, 70), 0.5], [alpha(P.text, 0), 1]] },
          strokeWidth: 2,
          pathLength: 1,
          keyframes: [kf(0.4, { strokeDashoffset: 1 }), kf(1.6, { strokeDashoffset: 0, easing: 'ease-in-out' })],
        },
        {
          type: 'component',
          ref: 'title-card',
          start: 0.8,
          props: {
            kicker: 'Pensée du jour',
            title: 'Une phrase\npour *ta journée*.',
            subtitle: 'Lis-la jusqu’au bout.',
            style: 'mask',
            font: F.serif,
            weight: 400,
            size: 128,
            y: 1180,
            accent: '$accent',
            accent2: '$primary',
            exit: 4.8,
          },
        },
      ],
      { start: 0, out: { type: 'fade', duration: 0.5, easing: 'ease-in-out' } },
    ),

    /* ───────── 6–26 s : la citation, mot par mot ───────── */
    scene(
      'citation',
      20,
      [
        {
          type: 'text',
          id: 'quote-mark',
          content: '“',
          font: F.serif,
          size: 420,
          weight: 400,
          color: { type: 'linear', angle: 180, stops: [[P.primary, 0], [P.accent, 1]] },
          anchor: { x: CX, y: 560 },
          pivot: { x: 0, y: -60 },
          keyframes: keys([kf(0.3, { scale: 0.4, opacity: 0, rotate: -12 }), kf(1.3, { scale: 1, opacity: 1, rotate: 0, easing: 'spring(140,11)' })], leave(18.6)),
        },
        {
          type: 'group',
          id: 'quote',
          keyframes: leave(18.6, { y: -50 }),
          layers: [
            punch('line-a', 'Le talent attire\nle regard.', {
              y: 820,
              size: 112,
              font: F.serif,
              weight: 400,
              by: 'word',
              t0: 1.0,
              stagger: 0.38,
              dur: 1.1,
              easing: 'ease-in-out',
              from: { y: 36, opacity: 0 },
              letterSpacing: -1,
              lineHeight: 1.08,
            }),
            {
              type: 'path',
              id: 'divider',
              d: `M${CX - 90},1000 C${CX - 30},985 ${CX + 30},1015 ${CX + 90},1000`,
              stroke: P.accent,
              strokeWidth: 4,
              pathLength: 1,
              keyframes: [kf(3.6, { strokeDashoffset: 1 }), kf(4.6, { strokeDashoffset: 0, easing: 'cubic-bezier(0.65,0,0.35,1)' })],
            },
            punch('line-b', '*La constance*\nle garde.', {
              y: 1180,
              size: 124,
              font: F.serif,
              weight: 400,
              italic: true,
              by: 'word',
              t0: 4.8,
              stagger: 0.42,
              dur: 1.2,
              easing: 'cubic-bezier(0.16,1,0.3,1)',
              from: { y: 40, opacity: 0, scale: 0.96 },
              highlight: { type: 'linear', angle: 90, stops: [[P.primary, 0], [P.accent, 1]] },
              letterSpacing: -1,
              lineHeight: 1.05,
            }),
          ],
        },
        { type: 'component', ref: 'lower-third', start: 9.5, props: { name: 'Inès Duval', role: 'Directrice artistique', font: F.serif, size: 58, accent: '$primary', duration: 8.6 } },
      ],
      { start: 6, in: { type: 'fade', duration: 0.5 }, out: { type: 'wipe-up', duration: 0.6, easing: 'cubic-bezier(0.65,0,0.35,1)' } },
    ),

    /* ───────── 25.4–34 s : la question ───────── */
    scene(
      'question',
      8.6,
      [
        ...[
          [260, 640, 0.6, -18],
          [830, 700, 0.9, 14],
          [200, 1300, 1.2, 10],
          [880, 1260, 1.5, -12],
        ].map(([x, y, t, r], k) =>
          icon(`heart-${k}`, 'heart', x!, y!, 70 + (k % 2) * 30, k % 2 ? P.rose : P.accent, {
            keyframes: keys(
              [kf(t!, { scale: 0, rotate: r! * 2 }), kf(t! + 0.9, { scale: 1, rotate: r!, easing: 'elastic' })],
              [kf(t! + 1, { y: 0 }), kf(t! + 3.5, { y: -30, easing: 'ease-in-out' }), kf(t! + 6, { y: 0, easing: 'ease-in-out' })],
            ),
          }),
        ),
        {
          type: 'component',
          ref: 'title-card',
          start: 0.3,
          props: {
            title: 'Et toi, qu’est-ce\nque tu *répètes*\nchaque jour ?',
            style: 'pop',
            font: F.serif,
            weight: 400,
            size: 116,
            y: MID - 20,
            underline: false,
            subtitle: 'Réponds en commentaire.',
            subtitleColor: '$text/75',
            accent: '$accent',
            exit: 7.7,
          },
        },
      ],
      { start: 25.4, in: { type: 'wipe-up', duration: 0.6, easing: 'cubic-bezier(0.65,0,0.35,1)' }, out: { type: 'zoom', duration: 0.5, easing: 'ease-in' } },
    ),

    /* ───────── 33.5–40 s : partage + fondu final ───────── */
    scene(
      'partage',
      6.5,
      [
        image('logo', '@logo', CX, 700, 180, [kf(0.2, { scale: 0, rotate: -30 }), kf(1.1, { scale: 1, rotate: 0, easing: 'spring(200,12)' })]),
        punch('share', 'Partage-la à quelqu’un\nqui en a *besoin*.', {
          y: 1000,
          size: 84,
          font: F.serif,
          weight: 400,
          by: 'word',
          t0: 0.7,
          stagger: 0.09,
          dur: 0.8,
          easing: 'ease-out',
          from: { y: 30, opacity: 0 },
          highlight: P.primary,
          letterSpacing: 0,
          lineHeight: 1.12,
        }),
        chip('save', 'ENREGISTRE ✦', CX, 1220, { font: F.body, color: P.primary, t0: 1.8, easing: 'back(2.4)' }),
        {
          type: 'text',
          id: 'handle',
          content: '@lumen.daily',
          font: F.body,
          size: 34,
          weight: 600,
          color: '$text/70',
          letterSpacing: 2,
          anchor: { x: CX, y: 1330 },
          keyframes: [kf(2.3, { opacity: 0 }), kf(2.9, { opacity: 1, easing: 'ease-in' })],
        },
      ],
      { start: 33.5, in: { type: 'zoom', duration: 0.5 }, out: { type: 'fade', duration: 1.0, easing: 'ease-in-out' } },
    ),
  ],
  { grain: 0.09, background: '#060306' },
);
