/**
 * short-01-hook — "Hook express" (~30 s)
 * 0–3 s accroche (spring + scale punch) · 3–20 s trois punchlines
 * (split-letters / typewriter / lignes) · 20–30 s logo-reveal + CTA.
 */
import { CX, MID, W, alpha, bar, corners, cta, grid, icon, image, kf, keys, leave, orb, punch, scene, shockwave, storyboard, vignette, gradient } from './kit.ts';

const P = { primary: '#4f9cff', accent: '#ff5e8a', violet: '#8b7bff', text: '#ffffff', background: '#05050b' };
const F = { display: 'Space Grotesk', body: 'Inter' };

const bgDeep = gradient(165, ['#0b0b1f', 0], ['#05050b', 0.6], ['#12071a', 1]);

export default storyboard(
  'Hook express — 3 règles pour capter',
  { palette: P, fonts: [F.display, F.body] },
  { logo: './assets/logo-nova.svg' },
  [
    /* ───────────── 0–3 s : accroche ───────────── */
    scene(
      'hook',
      3.3,
      [
        orb('orb-a', 220, 560, 520, P.violet, { dx: 80, dy: 60, dur: 3.3 }),
        orb('orb-b', 900, 1380, 560, P.accent, { dx: -60, dy: -90, dur: 3.3 }),
        grid('grid', '#ffffff'),
        shockwave('wave', CX, MID - 60, P.accent, 0.12),
        {
          // Le groupe "caméra" encaisse l'impact : micro-secousse linéaire.
          type: 'group',
          id: 'camera',
          keyframes: [kf(0.28, { x: 0, y: 0 }), kf(0.32, { x: -14, y: 8, easing: 'linear' }), kf(0.36, { x: 12, y: -6, easing: 'linear' }), kf(0.4, { x: -8, y: 4, easing: 'linear' }), kf(0.46, { x: 0, y: 0, easing: 'linear' })],
          layers: [
            {
              type: 'text',
              id: 'stop',
              content: 'STOP',
              font: F.display,
              size: 300,
              weight: 700,
              letterSpacing: -12,
              color: gradient(90, ['#ffffff', 0], ['#ffd1de', 1]),
              anchor: { x: CX, y: MID - 60 },
              shadow: { color: alpha(P.accent, 60), blur: 60 },
              keyframes: [
                kf(0.05, { scale: 2.8, opacity: 0 }),
                kf(0.12, { opacity: 1, easing: 'linear' }),
                kf(0.7, { scale: 1, easing: 'spring(260,12)' }),
                kf(2.6, { scale: 1.06, easing: 'ease-in-out' }),
              ],
            },
          ],
        },
        punch('hook-sub', 'Tu as *3 secondes*\npour accrocher.', {
          y: MID + 190,
          size: 64,
          font: F.display,
          weight: 600,
          by: 'word',
          t0: 0.85,
          stagger: 0.08,
          dur: 0.55,
          easing: 'back',
          from: { scale: 0.3, opacity: 0, y: 20 },
          highlight: P.accent,
          letterSpacing: 0,
          lineHeight: 1.15,
        }),
        vignette(),
      ],
      { background: bgDeep, out: { type: 'flash', duration: 0.3, easing: 'ease-out' } },
    ),

    /* ───────────── 3–8.7 s : punchline 1 (split letters) ───────────── */
    scene(
      'regle-1',
      6.2,
      [
        orb('orb-c', 860, 520, 480, P.primary, { dx: -90, dy: 40, dur: 6.2 }),
        orb('orb-d', 160, 1420, 420, P.violet, { dx: 70, dy: -60, dur: 6.2 }),
        corners('corners', '#ffffff', 0.1),
        icon('bolt', 'bolt', CX, 560, 120, gradient(180, [P.primary, 0], [P.accent, 1]), {
          keyframes: [kf(0.1, { scale: 0, rotate: -40 }), kf(1.0, { scale: 1, rotate: 0, easing: 'elastic' })],
        }),
        {
          type: 'component',
          ref: 'title-card',
          start: 0.25,
          props: { kicker: 'Règle n°1', title: 'Accroche\n*immédiate*', subtitle: 'Le premier mouvement décide de tout.', style: 'rise', size: 132, y: MID + 60, accent: '$accent', exit: 5.5 },
        },
        vignette(),
      ],
      { background: gradient(180, ['#060b1e', 0], ['#05050b', 1]), in: { type: 'flash', duration: 0.3 }, out: { type: 'slide-up', duration: 0.45, easing: 'cubic-bezier(0.7,0,0.2,1)' } },
    ),

    /* ───────────── 8.7–14.7 s : punchline 2 (typewriter + morphing) ───────────── */
    scene(
      'regle-2',
      6,
      [
        orb('orb-e', 540, 1500, 620, P.accent, { dx: 0, dy: -120, dur: 6 }),
        {
          type: 'path',
          id: 'morph',
          shape: { type: 'circle', cx: CX, cy: 600, r: 120 },
          fill: gradient(135, [P.primary, 0], [P.violet, 0.5], [P.accent, 1]),
          shadow: { color: alpha(P.violet, 70), blur: 70 },
          pivot: { x: CX, y: 600 },
          keyframes: [
            kf(0, { scale: 0, rotate: -90 }),
            kf(0.7, { scale: 1, rotate: 0, easing: 'back' }),
            kf(1.6, { d: { type: 'circle', cx: CX, cy: 600, r: 120 } }),
            kf(2.5, { d: { type: 'star', cx: CX, cy: 600, points: 5, outer: 160, inner: 70 }, easing: 'back(2.2)' }),
            kf(3.6, { d: { type: 'star', cx: CX, cy: 600, points: 5, outer: 160, inner: 70 } }),
            kf(4.5, { d: { type: 'rect', x: CX - 120, y: 480, width: 240, height: 240, radius: 56 }, easing: 'spring(220,16)' }),
            kf(5.4, { rotate: 0 }),
            kf(6, { rotate: 45, scale: 0.6, easing: 'ease-in' }),
          ],
        },
        {
          type: 'group',
          id: 'type-block',
          keyframes: leave(5.5),
          layers: [
            {
              type: 'text',
              id: 'kicker',
              content: 'RÈGLE N°2',
              font: F.body,
              size: 30,
              weight: 600,
              letterSpacing: 6,
              color: P.primary,
              anchor: { x: CX, y: MID + 10 },
              keyframes: [kf(0.3, { opacity: 0 }), kf(0.7, { opacity: 1, easing: 'ease-out' })],
            },
            {
              type: 'text',
              id: 'typed',
              content: 'Un mouvement\n= *une idée*.',
              font: F.display,
              size: 112,
              weight: 700,
              letterSpacing: -2,
              highlight: gradient(90, [P.primary, 0], [P.accent, 1]),
              anchor: { x: CX, y: MID + 170 },
              lineHeight: 1.05,
              split: { mode: 'typewriter', start: 0.7, stagger: 0.06, cursor: true },
            },
          ],
        },
        vignette(),
      ],
      { background: gradient(200, ['#0d0718', 0], ['#05050b', 1]), in: { type: 'slide-up', duration: 0.45, easing: 'cubic-bezier(0.7,0,0.2,1)' }, out: { type: 'zoom', duration: 0.4, easing: 'ease-in' } },
    ),

    /* ───────────── 14.7–20.3 s : punchline 3 (lignes + égaliseur) ───────────── */
    scene(
      'regle-3',
      6.2,
      [
        orb('orb-f', 900, 700, 520, P.violet, { dx: -120, dy: 80, dur: 6.2 }),
        orb('orb-g', 180, 1300, 480, P.primary, { dx: 80, dy: -40, dur: 6.2 }),
        {
          type: 'text',
          id: 'kicker3',
          content: 'RÈGLE N°3',
          font: F.body,
          size: 30,
          weight: 600,
          letterSpacing: 6,
          color: P.accent,
          anchor: { x: CX, y: 560 },
          keyframes: [kf(0.1, { opacity: 0, y: 20 }), kf(0.5, { opacity: 1, y: 0, easing: 'ease-out' })],
        },
        punch('trio', 'Rythme.\nContraste.\n*Répétition.*', {
          y: MID + 20,
          size: 136,
          font: F.display,
          by: 'line',
          t0: 0.35,
          stagger: 0.55,
          dur: 0.7,
          easing: 'back(2)',
          from: { x: -160, opacity: 0, scale: 0.85 },
          highlight: gradient(90, [P.accent, 0], [P.violet, 1]),
          lineHeight: 1.08,
          keyframes: leave(5.6, { y: -60 }),
        }),
        {
          // Égaliseur : 9 barres qui pulsent sur le "beat" (ease-in-out).
          type: 'group',
          id: 'eq',
          keyframes: keys([kf(1.8, { opacity: 0 }), kf(2.2, { opacity: 1, easing: 'ease-out' })], leave(5.6, { y: 40 })),
          layers: Array.from({ length: 9 }, (_, k) => {
            const x = CX - 4 * 56 + k * 56;
            const hgt = 60 + ((k * 37) % 5) * 26;
            return {
              type: 'path' as const,
              id: `eq-${k}`,
              shape: { type: 'rect' as const, x: x - 14, y: 1380 - hgt, width: 28, height: hgt, radius: 14 },
              fill: gradient(180, [P.accent, 0], [P.primary, 1]),
              pivot: { x, y: 1380 },
              keyframes: Array.from({ length: 8 }, (_, b) => kf(1.8 + b * 0.5 + (k % 3) * 0.08, { scaleY: b % 2 ? 1 : 0.35, easing: 'ease-in-out' })),
            };
          }),
        },
        vignette(),
      ],
      { background: gradient(160, ['#0a0615', 0], ['#05050b', 1]), in: { type: 'zoom', duration: 0.4 }, out: { type: 'circle', duration: 0.6, easing: 'cubic-bezier(0.65,0,0.35,1)' } },
    ),

    /* ───────────── 20–30 s : logo + CTA ───────────── */
    scene(
      'outro',
      10.05,
      [
        orb('orb-h', CX, 760, 700, P.violet, { dx: 0, dy: 40, dur: 10 }),
        grid('grid2', '#ffffff', { t: 0.2 }),
        { type: 'component', ref: 'logo-reveal', start: 0.4, props: { src: '@logo', text: 'NOVA', tagline: 'Des vidéos qui *captent*.', y: 700, size: 240, accent: '$accent', accent2: '$primary' } },
        cta('cta', 'Abonne-toi', { y: 1340, from: P.primary, to: P.accent, font: F.display, t0: 2.6 }),
        {
          type: 'text',
          id: 'teaser',
          content: 'Partie 2 demain — les transitions',
          font: F.body,
          size: 34,
          weight: 500,
          color: '$text/60',
          anchor: { x: CX, y: 1490 },
          keyframes: [kf(3.4, { opacity: 0, y: 20 }), kf(4, { opacity: 1, y: 0, easing: 'ease-out' })],
        },
        vignette(),
      ],
      { background: gradient(180, ['#08081a', 0], ['#05050b', 1]), out: { type: 'fade', duration: 0.6, easing: 'ease-in-out' } },
    ),
  ],
  {
    overlays: [
      // Barre de progression de rétention (haut de la zone sûre).
      { type: 'path', id: 'progress-track', shape: { type: 'rect', x: 60, y: 233, width: W - 120, height: 6, radius: 3 }, fill: 'rgba(255,255,255,0.12)' },
      bar('progress', 60, 236, W - 120, 6, gradient(90, [P.primary, 0], [P.accent, 1]), 0, 30, 'left-to-right', 'linear'),
      // Signature (image + texte).
      {
        type: 'group',
        id: 'signature',
        keyframes: [kf(0.6, { opacity: 0 }), kf(1.2, { opacity: 0.9, easing: 'ease-out' })],
        layers: [
          image('signature-logo', '@logo', 96, 300, 52),
          { type: 'text', id: 'signature-handle', content: '@nova.studio', font: F.body, size: 30, weight: 600, align: 'left', color: '$text/85', anchor: { x: 136, y: 300 } },
        ],
      },
    ],
  },
);

