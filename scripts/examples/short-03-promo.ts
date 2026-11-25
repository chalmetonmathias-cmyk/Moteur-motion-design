/**
 * short-03-promo — "Promo produit" (~44,5 s, < 45 s)
 * Produit (image SVG) qui arrive en scale élastique, 3 bénéfices en cartes
 * (groupes), compte à rebours visuel, CTA final avec logo-reveal.
 */
import type { LayerInput } from '../../src/types/storyboard.ts';
import { CX, MID, W, alpha, card, chip, cta, gradient, grid, image, kf, keys, leave, orb, ring, scene, storyboard, vignette } from './kit.ts';

const P = { primary: '#3de2ff', accent: '#c6ff3d', magenta: '#ff3df0', text: '#ffffff', background: '#040506' };
const F = { display: 'Unbounded', body: 'Inter' };
const PRODUCT_Y = 820;

/** Faisceaux lumineux qui tournent lentement derrière le produit (mode additif). */
function rays(id: string, cx: number, cy: number, color: string, dur: number): LayerInput {
  const beams: LayerInput[] = Array.from({ length: 10 }, (_, k) => {
    const a = (k / 10) * Math.PI * 2;
    const b = a + 0.12;
    const R = 1300;
    return {
      type: 'path' as const,
      id: `${id}-${k}`,
      d: `M${cx},${cy} L${(cx + Math.cos(a) * R).toFixed(1)},${(cy + Math.sin(a) * R).toFixed(1)} L${(cx + Math.cos(b) * R).toFixed(1)},${(cy + Math.sin(b) * R).toFixed(1)} Z`,
      fill: { type: 'radial', center: { x: cx, y: cy }, radius: R, stops: [[alpha(color, 22), 0], [alpha(color, 0), 1]] },
    };
  });
  return {
    type: 'group',
    id,
    blend: 'add',
    pivot: { x: cx, y: cy },
    keyframes: [kf(0, { rotate: 0, opacity: 0 }), kf(1, { opacity: 1, easing: 'ease-out' }), kf(dur, { rotate: 40, easing: 'linear' })],
    layers: beams,
  };
}

export default storyboard(
  'Promo — Pulse Air 2',
  { palette: P, fonts: [F.display, F.body] },
  { product: './assets/product-earbuds.svg', logo: './assets/logo-pulse.svg' },
  [
    /* ───────── 0–5.2 s : teaser ───────── */
    scene(
      'teaser',
      5.2,
      [
        rays('rays', CX, MID, P.accent, 5.2),
        orb('o1', 240, 600, 460, P.primary, { dur: 5.2, dx: 60 }),
        orb('o2', 860, 1300, 460, P.magenta, { dur: 5.2, dx: -60, opacity: 0.6 }),
        {
          type: 'component',
          ref: 'title-card',
          start: 0.2,
          props: { kicker: 'Nouveau', title: 'PULSE\n*AIR 2*', subtitle: 'Le son. Sans compromis.', style: 'rise', size: 150, weight: 800, accent: '$accent', accent2: '$primary', y: MID - 20, exit: 4.6 },
        },
        vignette(),
      ],
      { background: { type: 'radial', center: { x: CX, y: MID }, radius: 1100, stops: [['#10161a', 0], ['#040506', 1]] }, out: { type: 'glitch', duration: 0.4, easing: 'linear' } },
    ),

    /* ───────── 4.8–13.3 s : le produit ───────── */
    scene(
      'produit',
      8.5,
      [
        rays('rays2', CX, PRODUCT_Y, P.primary, 8.5),
        {
          type: 'path',
          id: 'halo',
          shape: { type: 'circle', cx: CX, cy: PRODUCT_Y, r: 420 },
          fill: { type: 'radial', stops: [[alpha(P.accent, 40), 0], [alpha(P.primary, 12), 0.5], [alpha(P.primary, 0), 1]] },
          blend: 'screen',
          pivot: 'center',
          keyframes: [kf(0.1, { scale: 0.3, opacity: 0 }), kf(1.3, { scale: 1, opacity: 1, easing: 'ease-out' })],
        },
        // Orbite : un groupe aplati (scaleY) contient un groupe qui tourne → ellipse en perspective.
        {
          type: 'group',
          id: 'orbit',
          pivot: { x: CX, y: PRODUCT_Y + 40 },
          scaleY: 0.32,
          keyframes: [kf(0.8, { opacity: 0 }), kf(1.4, { opacity: 1, easing: 'ease-out' })],
          layers: [
            {
              type: 'path',
              id: 'orbit-ring',
              shape: { type: 'circle', cx: CX, cy: PRODUCT_Y + 40, r: 400 },
              stroke: gradient(90, [alpha(P.accent, 90), 0], [alpha(P.primary, 20), 1]),
              strokeWidth: 6,
              fill: 'none',
              pathLength: 1,
              keyframes: [kf(0.8, { strokeDashoffset: 1 }), kf(2, { strokeDashoffset: 0, easing: 'cubic-bezier(0.65,0,0.35,1)' })],
            },
            {
              type: 'group',
              id: 'orbit-spin',
              pivot: { x: CX, y: PRODUCT_Y + 40 },
              keyframes: [kf(1, { rotate: 0 }), kf(8.5, { rotate: 540, easing: 'linear' })],
              layers: [{ type: 'path', id: 'orbit-dot', shape: { type: 'circle', cx: CX + 400, cy: PRODUCT_Y + 40, r: 22 }, fill: P.accent, shadow: { color: P.accent, blur: 30 } }],
            },
          ],
        },
        image('product', '@product', CX, PRODUCT_Y, 560, keys(
          [kf(0.2, { scale: 0, rotate: -25, opacity: 0 }), kf(0.35, { opacity: 1, easing: 'linear' }), kf(1.5, { scale: 1, rotate: 0, easing: 'elastic(1,0.4)' })],
          [kf(1.8, { y: 0 }), kf(3.3, { y: -18, easing: 'ease-in-out' }), kf(4.8, { y: 0, easing: 'ease-in-out' }), kf(6.3, { y: -18, easing: 'ease-in-out' }), kf(7.8, { y: 0, easing: 'ease-in-out' })],
        ), { shadow: { color: alpha(P.primary, 45), blur: 80, y: 20 } }),
        chip('spec-1', 'BLUETOOTH 5.4', 250, 470, { font: F.body, color: P.primary, t0: 1.9 }),
        chip('spec-2', 'IPX5', 860, 560, { font: F.body, color: P.accent, t0: 2.2 }),
        chip('spec-3', 'USB-C', 860, 1110, { font: F.body, color: P.magenta, t0: 2.5 }),
        {
          type: 'text',
          id: 'name',
          content: 'Pulse *Air 2*',
          font: F.display,
          size: 92,
          weight: 700,
          highlight: gradient(90, [P.accent, 0], [P.primary, 1]),
          anchor: { x: CX, y: 1330 },
          split: { by: 'char', start: 2.6, stagger: 0.04, duration: 0.6, easing: 'back', from: { y: 60, opacity: 0, scale: 0.5 } },
        },
        {
          type: 'text',
          id: 'price-hint',
          content: 'Réduction de bruit · 40 h · Son spatial',
          font: F.body,
          size: 34,
          weight: 500,
          color: '$text/65',
          anchor: { x: CX, y: 1430 },
          keyframes: [kf(3.4, { opacity: 0, y: 16 }), kf(4, { opacity: 1, y: 0, easing: 'ease-out' })],
        },
        vignette(),
      ],
      { background: { type: 'radial', center: { x: CX, y: PRODUCT_Y }, radius: 1200, stops: [['#0e1519', 0], ['#040506', 1]] }, in: { type: 'glitch', duration: 0.4 }, out: { type: 'slide-left', duration: 0.5, easing: 'cubic-bezier(0.7,0,0.2,1)' } },
    ),

    /* ───────── 12.8–28.8 s : 3 bénéfices ───────── */
    scene(
      'benefices',
      16,
      [
        grid('grid', P.primary, { step: 120 }),
        orb('o3', 900, 500, 420, P.accent, { dur: 16, dx: -100, dy: 120, opacity: 0.5 }),
        {
          type: 'component',
          ref: 'title-card',
          start: 0.3,
          props: { kicker: 'Pourquoi craquer', title: '3 raisons', style: 'pop', size: 96, weight: 800, y: 480, underline: false, accent: '$accent', exit: 8.6 },
        },
        ...([
          ['battery', '40 h d’autonomie', 'Avec le boîtier de charge', P.accent],
          ['wave', 'Zéro bruit', 'Réduction active et adaptative', P.primary],
          ['sparkle', 'Son spatial 3D', 'Suit les mouvements de ta tête', P.magenta],
        ] as const).map(([ic, title, body, accent], k) =>
          card(`card-${k}`, {
            x: 110,
            y: 640 + k * 230,
            w: W - 220,
            h: 190,
            title,
            body,
            iconName: ic,
            accent,
            font: F.display,
            bodyFont: F.body,
            keyframes: keys(
              [kf(1 + k * 0.9, { x: 700, opacity: 0, rotate: 4 }), kf(1.9 + k * 0.9, { x: 0, opacity: 1, rotate: 0, easing: 'spring(170,15)' })],
              [kf(4.6 + k * 1.1, { scale: 1 }), kf(4.9 + k * 1.1, { scale: 1.04, easing: 'ease-out' }), kf(5.4 + k * 1.1, { scale: 1, easing: 'ease-in-out' })],
              leave(8.6 + k * 0.1, { x: -300, y: 0, dur: 0.45 }),
            ),
          }),
        ),
        // Zoom sur l'autonomie : compteur + anneau.
        {
          type: 'group',
          id: 'battery-focus',
          start: 9,
          layers: [
            ring('battery-ring', CX, MID - 40, 260, { color: gradient(90, [P.accent, 0], [P.primary, 1]), width: 22, t0: 0.2, t1: 2.6, easing: 'cubic-bezier(0.33,1,0.68,1)' }),
            {
              type: 'text',
              id: 'hours',
              content: '{value} h',
              value: 0,
              font: F.display,
              size: 150,
              weight: 800,
              anchor: { x: CX, y: MID - 40 },
              keyframes: [kf(0.2, { value: 0, scale: 0.6, opacity: 0 }), kf(0.6, { opacity: 1, easing: 'linear' }), kf(1.2, { scale: 1, easing: 'back' }), kf(2.6, { value: 40, easing: 'ease-out' })],
            },
            {
              type: 'text',
              id: 'hours-sub',
              content: 'd’écoute, sans recharger',
              font: F.body,
              size: 40,
              weight: 500,
              color: '$text/70',
              anchor: { x: CX, y: MID + 300 },
              keyframes: [kf(1, { opacity: 0, y: 20 }), kf(1.6, { opacity: 1, y: 0, easing: 'ease-out' })],
            },
          ],
        },
        vignette(),
      ],
      { background: gradient(180, ['#071014', 0], ['#040506', 1]), in: { type: 'slide-left', duration: 0.5, easing: 'cubic-bezier(0.7,0,0.2,1)' }, out: { type: 'zoom', duration: 0.45, easing: 'ease-in' } },
    ),

    /* ───────── 28.35–37.8 s : compte à rebours ───────── */
    scene(
      'compte-a-rebours',
      9.45,
      [
        orb('o4', CX, MID, 700, P.magenta, { dur: 9.45, dx: 0, dy: 0, opacity: 0.45 }),
        {
          type: 'text',
          id: 'offer',
          content: 'OFFRE DE LANCEMENT',
          font: F.body,
          size: 34,
          weight: 700,
          letterSpacing: 8,
          color: P.accent,
          anchor: { x: CX, y: 400 },
          keyframes: [kf(0.1, { opacity: 0, y: -20 }), kf(0.6, { opacity: 1, y: 0, easing: 'ease-out' })],
        },
        {
          type: 'group',
          id: 'badge',
          pivot: { x: CX, y: 650 },
          keyframes: [kf(0.3, { scale: 0, rotate: -20 }), kf(1.4, { scale: 1, rotate: -6, easing: 'elastic(1.1,0.35)' })],
          layers: [
            { type: 'path', id: 'badge-star', shape: { type: 'star', cx: CX, cy: 650, points: 14, outer: 196, inner: 168 }, fill: gradient(135, [P.accent, 0], [P.primary, 1]), shadow: { color: alpha(P.accent, 60), blur: 50 } },
            { type: 'text', id: 'badge-txt', content: '-30%', font: F.display, size: 84, weight: 800, color: '#06080a', anchor: { x: CX, y: 650 } },
          ],
        },
        // Compte à rebours 5 → 0 : steps(5) donne des sauts nets, l'anneau se vide en linéaire.
        { type: 'path', id: 'timer-track', shape: { type: 'circle', cx: CX, cy: 1080, r: 190 }, stroke: 'rgba(255,255,255,0.1)', strokeWidth: 16, fill: 'none' },
        {
          type: 'path',
          id: 'timer-bar',
          shape: { type: 'circle', cx: CX, cy: 1080, r: 190 },
          stroke: gradient(90, [P.magenta, 0], [P.primary, 1]),
          strokeWidth: 16,
          fill: 'none',
          lineCap: 'round',
          pathLength: 1,
          keyframes: [kf(1.6, { strokeDashoffset: 0 }), kf(6.6, { strokeDashoffset: 1, easing: 'linear' })],
        },
        {
          type: 'text',
          id: 'timer',
          content: '{value}',
          value: 5,
          font: F.display,
          size: 200,
          weight: 800,
          anchor: { x: CX, y: 1080 },
          keyframes: keys(
            [kf(1.6, { value: 5 }), kf(6.6, { value: 0, easing: 'steps(5)' })],
            // Petit "battement" à chaque seconde.
            [0, 1, 2, 3, 4].flatMap((k) => [kf(1.6 + k, { scale: 1.18, easing: 'linear' }), kf(1.95 + k, { scale: 1, easing: 'back' })]),
          ),
        },
        {
          type: 'group',
          id: 'price',
          keyframes: [kf(6.7, { opacity: 0, scale: 0.8 }), kf(7.3, { opacity: 1, scale: 1, easing: 'back(2)' })],
          pivot: { x: CX, y: 1400 },
          layers: [
            { type: 'text', id: 'old', content: '129 €', font: F.display, size: 64, weight: 500, color: '$text/45', anchor: { x: CX - 170, y: 1400 } },
            {
              type: 'path',
              id: 'strike',
              d: `M${CX - 260},1404 L${CX - 80},1392`,
              stroke: P.magenta,
              strokeWidth: 7,
              pathLength: 1,
              keyframes: [kf(7.2, { strokeDashoffset: 1 }), kf(7.6, { strokeDashoffset: 0, easing: 'ease-out' })],
            },
            { type: 'text', id: 'new', content: '89 €', font: F.display, size: 110, weight: 800, color: P.accent, anchor: { x: CX + 140, y: 1400 } },
          ],
        },
        {
          type: 'text',
          id: 'timer-cap',
          content: 'Plus que quelques heures.',
          font: F.body,
          size: 36,
          weight: 500,
          color: '$text/70',
          anchor: { x: CX, y: 1320 },
          keyframes: keys([kf(1.8, { opacity: 0 }), kf(2.3, { opacity: 1, easing: 'ease-out' })], leave(6.2, { y: -10, dur: 0.3 })),
        },
        vignette(),
      ],
      { background: gradient(180, ['#12061a', 0], ['#040506', 1]), in: { type: 'zoom', duration: 0.45 }, out: { type: 'flash', duration: 0.3, easing: 'ease-out' } },
    ),

    /* ───────── 37.5–44.5 s : logo + CTA ───────── */
    scene(
      'cta',
      7,
      [
        rays('rays3', CX, 700, P.accent, 7),
        { type: 'component', ref: 'logo-reveal', start: 0.2, props: { src: '@logo', text: 'PULSE', tagline: '-30 % ce week-end · *lien en bio*', y: 680, size: 220, textSize: 96, accent: '$accent', accent2: '$primary' } },
        cta('cta', 'Je commande', { y: 1330, from: P.accent, to: P.primary, font: F.display, t0: 2.2, color: '#05080a', size: 44, w: 680 }),
        vignette(),
      ],
      { background: { type: 'radial', center: { x: CX, y: 700 }, radius: 1200, stops: [['#0d1418', 0], ['#040506', 1]] }, in: { type: 'flash', duration: 0.3 }, out: { type: 'fade', duration: 0.5, easing: 'ease-in-out' } },
    ),
  ],
);
