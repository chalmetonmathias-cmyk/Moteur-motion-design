/**
 * long-01-brand-story — "Brand story" (~66 s)
 * Problème → solution → révélation de marque → 3 bénéfices → CTA.
 * Composants réutilisés : title-card (×3), logo-reveal, lower-third.
 */
import type { LayerInput } from '../../src/types/storyboard.ts';
import { CX, MID, W, alpha, card, corners, cta, gradient, grid, icon, ICONS, image, kf, keys, leave, orb, particles, punch, scene, storyboard, vignette } from './kit.ts';

const P = { primary: '#4f9cff', accent: '#ff5e8a', violet: '#8b7bff', gold: '#ffc46b', text: '#ffffff', background: '#04050c' };
const F = { display: 'Syne', body: 'Inter' };

/** Tuiles "d'applications" — en désordre (chaos) puis rangées (solution). */
const TILE_ICONS: (keyof typeof ICONS)[] = ['chart', 'code', 'palette', 'text', 'inbox', 'users', 'clock', 'eye', 'layers'];
const TILE_COLORS = [P.primary, P.accent, P.violet, P.gold];

function tile(k: number, x: number, y: number): LayerInput[] {
  const c = TILE_COLORS[k % TILE_COLORS.length]!;
  return [
    { type: 'path', id: `tile-bg-${k}`, shape: { type: 'rect', x: x - 80, y: y - 80, width: 160, height: 160, radius: 40 }, fill: gradient(135, [alpha(c, 35), 0], ['rgba(255,255,255,0.04)', 1]), stroke: alpha(c, 60), strokeWidth: 2 },
    icon(`tile-icon-${k}`, TILE_ICONS[k % TILE_ICONS.length]!, x, y, 72, '#ffffff', { strokeWidth: 2 }),
  ];
}

// Positions "chaos" (déterministes) et positions "grille" 3×3.
const CHAOS = [
  [210, 560, -14], [520, 470, 8], [860, 600, 18], [300, 860, 10], [760, 900, -20],
  [180, 1180, 22], [560, 1120, -6], [900, 1260, 12], [420, 1420, -18],
] as const;
const GRID = Array.from({ length: 9 }, (_, k) => [CX - 220 + (k % 3) * 220, 820 + Math.floor(k / 3) * 220] as const);

export default storyboard(
  'NOVA — Brand story',
  { palette: P, fonts: [F.display, F.body] },
  { logo: './assets/logo-nova.svg', camille: './assets/avatar-1.svg' },
  [
    /* ───────── 0–8 s : le problème ───────── */
    scene(
      'probleme',
      8,
      [
        orb('o1', 200, 500, 520, P.accent, { dur: 8, dx: 80 }),
        orb('o2', 900, 1400, 520, P.violet, { dur: 8, dx: -80 }),
        grid('grid', '#ffffff'),
        corners('corners', '#ffffff', 0.2),
        {
          type: 'component',
          ref: 'title-card',
          start: 0.3,
          props: { kicker: 'Le problème', title: 'Créer\ndu contenu,\nc’est *épuisant*.', subtitle: 'Et tu le sais déjà.', style: 'mask', size: 100, weight: 700, accent: '$accent', exit: 7.1 },
        },
        vignette(),
      ],
      { background: gradient(170, ['#0c0716', 0], ['#04050c', 1]), out: { type: 'wipe-left', duration: 0.5, easing: 'cubic-bezier(0.65,0,0.35,1)' } },
    ),

    /* ───────── 7.5–19 s : le chaos ───────── */
    scene(
      'chaos',
      11.5,
      [
        orb('o3', CX, MID, 700, P.accent, { dur: 11.5, dx: 0, dy: 0, opacity: 0.5 }),
        // 9 tuiles éparpillées qui tremblent (secousses linéaires) : la surcharge.
        ...CHAOS.map(([x, y, r], k): LayerInput => ({
          type: 'group',
          id: `chaos-${k}`,
          pivot: { x, y },
          rotate: r,
          keyframes: keys(
            [kf(0.2 + k * 0.12, { scale: 0 }), kf(0.8 + k * 0.12, { scale: 1, easing: 'back(2.2)' }), kf(10.6, { scale: 1 }), kf(11.1, { scale: 0.6, easing: 'ease-in' })],
            // Opacité : apparition, puis s'estompe sous les constats, puis sortie.
            [kf(0.2 + k * 0.12, { opacity: 0 }), kf(0.6 + k * 0.12, { opacity: 1, easing: 'ease-out' }), kf(3.8, { opacity: 1 }), kf(4.4, { opacity: 0.25, easing: 'ease-in-out' }), kf(10.6, { opacity: 0.25 }), kf(11.1, { opacity: 0, easing: 'ease-in' })],
            Array.from({ length: 16 }, (_, j) => kf(2 + j * 0.25 + (k % 3) * 0.05, { x: ((j + k) % 2 ? 6 : -6), y: ((j + k * 2) % 3) - 1, easing: 'linear' })),
          ),
          layers: [
            ...tile(k, x, y),
            // Pastille de notification.
            {
              type: 'group',
              id: `badge-${k}`,
              pivot: { x: x + 70, y: y - 70 },
              keyframes: [kf(1.6 + k * 0.35, { scale: 0 }), kf(2.1 + k * 0.35, { scale: 1, easing: 'elastic' })],
              layers: [
                { type: 'path', id: `badge-bg-${k}`, shape: { type: 'circle', cx: x + 70, cy: y - 70, r: 26 }, fill: P.accent },
                { type: 'text', id: `badge-n-${k}`, content: String(((k * 7) % 9) + 1), font: F.body, size: 28, weight: 700, anchor: { x: x + 70, y: y - 70 } },
              ],
            },
          ],
        })),
        // Trois constats qui tombent l'un après l'autre (chacun a son propre start).
        ...['Trop d’outils.', 'Trop d’onglets.', 'Pas assez d’idées.'].map((txt, k): LayerInput => {
          const start = 4.2 + k * 1.3;
          return {
            ...punch(`stmt-${k}`, txt, {
              y: 700 + k * 260,
              size: 92,
              font: F.display,
              weight: 700,
              by: 'word',
              stagger: 0.08,
              dur: 0.5,
              easing: 'ease-out',
              from: { y: 50, opacity: 0, scale: 0.7 },
              keyframes: leave(10.4 - start, { dur: 0.3 }),
            }),
            start,
          };
        }),
        {
          type: 'text',
          id: 'hours',
          content: '{value} h par vidéo',
          font: F.body,
          size: 44,
          weight: 600,
          color: P.gold,
          anchor: { x: CX, y: 1500 },
          keyframes: keys([kf(5, { value: 0, opacity: 0 }), kf(5.5, { opacity: 1, easing: 'ease-out' }), kf(8.5, { value: 6, easing: 'ease-out' })], leave(10.4)),
        },
        vignette(),
      ],
      { background: gradient(180, ['#14060f', 0], ['#04050c', 1]), in: { type: 'wipe-left', duration: 0.5, easing: 'cubic-bezier(0.65,0,0.35,1)' }, out: { type: 'glitch', duration: 0.45 } },
    ),

    /* ───────── 18.55–30 s : la solution ───────── */
    scene(
      'solution',
      11.45,
      [
        orb('o4', 220, 700, 540, P.primary, { dur: 11.45, dx: 100 }),
        orb('o5', 880, 1500, 520, P.violet, { dur: 11.45, dx: -100 }),
        {
          type: 'component',
          ref: 'title-card',
          start: 0.2,
          props: { kicker: 'La solution', title: 'Un seul *flux*.', style: 'rise', size: 104, weight: 700, y: 470, underline: false, accent: '$primary' },
        },
        // Connexions dessinées entre les tuiles rangées.
        {
          type: 'path',
          id: 'links',
          d: GRID.flatMap(([x, y], k) => [k % 3 < 2 ? `M${x + 80},${y} H${x + 140}` : '', k < 6 ? `M${x},${y + 80} V${y + 140}` : '']).filter(Boolean).join(' '),
          stroke: gradient(90, [P.primary, 0], [P.accent, 1]),
          strokeWidth: 4,
          pathLength: 1,
          keyframes: [kf(3, { strokeDashoffset: 1 }), kf(4.6, { strokeDashoffset: 0, easing: 'cubic-bezier(0.65,0,0.35,1)' })],
        },
        // Les tuiles du chaos viennent se ranger en grille (ressort).
        ...GRID.map(([gx, gy], k): LayerInput => {
          const [cx0, cy0, r0] = CHAOS[k]!;
          return {
            type: 'group',
            id: `ordered-${k}`,
            pivot: { x: gx, y: gy },
            keyframes: [
              kf(0.6, { x: cx0 - gx, y: cy0 - gy, rotate: r0, opacity: 0 }),
              kf(0.9, { opacity: 1, easing: 'linear' }),
              kf(1.2 + k * 0.1, { x: cx0 - gx, y: cy0 - gy, rotate: r0 }),
              kf(2.2 + k * 0.1, { x: 0, y: 0, rotate: 0, easing: 'spring(180,16)' }),
              ...leave(10.7, { scale: 0.8, dur: 0.3 }),
            ],
            layers: tile(k, gx, gy),
          };
        }),
        punch('flow-sub', 'Idées, montage, publication :\n*tout au même endroit.*', {
          y: 1520,
          size: 46,
          font: F.body,
          weight: 500,
          by: 'word',
          t0: 4.6,
          stagger: 0.05,
          dur: 0.5,
          easing: 'ease-out',
          from: { y: 20, opacity: 0 },
          highlight: P.primary,
          lineHeight: 1.3,
          letterSpacing: 0,
        }),
        vignette(),
      ],
      { background: gradient(180, ['#060b1c', 0], ['#04050c', 1]), in: { type: 'glitch', duration: 0.45 }, out: { type: 'flash', duration: 0.3, easing: 'ease-out' } },
    ),

    /* ───────── 29.7–41 s : révélation de marque ───────── */
    scene(
      'revelation',
      11.3,
      [
        orb('o6', CX, 800, 760, P.violet, { dur: 11.3, dx: 0, dy: 60 }),
        particles('stars', '#ffffff', 30, 42, 11.3),
        { type: 'component', ref: 'logo-reveal', start: 0.3, props: { src: '@logo', text: 'NOVA', tagline: 'Ton studio créatif, *en un geste*.', y: 780, size: 280, textSize: 120, accent: '$accent', accent2: '$primary', font: F.display } },
        {
          type: 'text',
          id: 'since',
          content: 'CRÉÉ PAR DES CRÉATEURS · DEPUIS 2024',
          font: F.body,
          size: 26,
          weight: 600,
          letterSpacing: 6,
          color: '$text/50',
          anchor: { x: CX, y: 1440 },
          keyframes: [kf(2.6, { opacity: 0 }), kf(3.4, { opacity: 1, easing: 'ease-in-out' })],
        },
        vignette(),
      ],
      { background: { type: 'radial', center: { x: CX, y: 800 }, radius: 1300, stops: [['#120f2e', 0], ['#04050c', 1]] }, in: { type: 'flash', duration: 0.3 }, out: { type: 'zoom', duration: 0.45, easing: 'ease-in' } },
    ),

    /* ───────── 40.55–56 s : bénéfices ───────── */
    scene(
      'benefices',
      15.45,
      [
        orb('o7', 900, 600, 480, P.primary, { dur: 15.45, dx: -120, dy: 100 }),
        orb('o8', 160, 1500, 480, P.accent, { dur: 15.45, dx: 120, dy: -100, opacity: 0.6 }),
        {
          type: 'component',
          ref: 'title-card',
          start: 0.2,
          props: { kicker: 'Pourquoi NOVA', title: 'Trois\n*super-pouvoirs*', style: 'pop', size: 70, weight: 700, y: 420, underline: false, accent: '$accent', exit: 14.6 },
        },
        ...([
          ['sparkle', 'Idées en 1 clic', 'Des concepts adaptés à ta niche', P.gold],
          ['layers', 'Montage automatique', 'Rythme, sous-titres, transitions', P.primary],
          ['arrow', 'Publié partout', 'TikTok, Reels, Shorts — d’un coup', P.accent],
        ] as const).map(([ic, title, body, accent], k) =>
          card(`benefit-${k}`, {
            x: 100,
            y: 580 + k * 220,
            w: W - 220,
            h: 180,
            title,
            body,
            iconName: ic,
            accent,
            font: F.display,
            bodyFont: F.body,
            keyframes: keys(
              [kf(1 + k * 0.45, { y: 120, opacity: 0, scale: 0.9 }), kf(1.7 + k * 0.45, { y: 0, opacity: 1, scale: 1, easing: 'back(1.6)' })],
              leave(14.6 - k * 0.08, { dur: 0.35 }),
            ),
          }),
        ),
        // Preuve sociale : avatar + lower-third.
        image('camille', '@camille', 150, 1340, 120, [kf(6.2, { scale: 0, opacity: 0 }), kf(7, { scale: 1, opacity: 1, easing: 'spring(220,14)' }), ...leave(14.4, { dur: 0.3 })]),
        {
          type: 'text',
          id: 'camille-quote',
          content: '« Je publie 3× plus,\n*sans y passer mes nuits.* »',
          font: F.body,
          size: 40,
          weight: 500,
          italic: true,
          align: 'left',
          highlight: P.gold,
          anchor: { x: 240, y: 1340 },
          lineHeight: 1.3,
          split: { by: 'word', start: 7, stagger: 0.06, duration: 0.5, easing: 'ease-out', from: { opacity: 0, x: -10, y: 0 } },
          keyframes: leave(14.4, { dur: 0.3 }),
        },
        { type: 'component', ref: 'lower-third', start: 8.2, props: { name: 'Camille R.', role: 'Créatrice · 240k abonnés', font: F.display, accent: '$gold', y: 1500, duration: 6.4 } },
        vignette(),
      ],
      { background: gradient(180, ['#08081c', 0], ['#04050c', 1]), in: { type: 'zoom', duration: 0.45 }, out: { type: 'slide-up', duration: 0.5, easing: 'cubic-bezier(0.7,0,0.2,1)' } },
    ),

    /* ───────── 55.5–66 s : appel à l'action ───────── */
    scene(
      'cta',
      10.5,
      [
        orb('o9', CX, 700, 720, P.accent, { dur: 10.5, dx: 0, dy: 80, opacity: 0.7 }),
        grid('grid2', '#ffffff', { t: 0.2 }),
        image('logo-small', '@logo', CX, 470, 140, [kf(0.1, { scale: 0, rotate: 90 }), kf(0.9, { scale: 1, rotate: 0, easing: 'elastic' })]),
        {
          type: 'component',
          ref: 'title-card',
          start: 0.4,
          props: { title: 'Essaie *NOVA*\ngratuitement.', subtitle: '14 jours offerts. Sans carte bancaire.', style: 'rise', size: 84, weight: 700, y: 820, accent: '$accent', accent2: '$primary' },
        },
        cta('cta', 'Télécharger', { y: 1340, from: P.primary, to: P.accent, font: F.display, t0: 2.4 }),
        {
          type: 'text',
          id: 'bio',
          content: 'Lien en bio ↑',
          font: F.body,
          size: 36,
          weight: 600,
          color: '$text/70',
          anchor: { x: CX, y: 1490 },
          keyframes: [kf(3.2, { opacity: 0, y: 20 }), kf(3.8, { opacity: 1, y: 0, easing: 'ease-out' })],
        },
        vignette(),
      ],
      { background: gradient(180, ['#0d0716', 0], ['#04050c', 1]), in: { type: 'slide-up', duration: 0.5, easing: 'cubic-bezier(0.7,0,0.2,1)' }, out: { type: 'fade', duration: 0.8, easing: 'ease-in-out' } },
    ),
  ],
);
