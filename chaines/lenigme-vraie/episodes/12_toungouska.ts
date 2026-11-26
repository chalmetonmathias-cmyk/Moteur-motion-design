/**
 * L'Énigme Vraie — Dossier n°12 : l'explosion de la Toungouska (≈ 64 s).
 *
 * Verdict : l'explosion → PROUVÉE ; vaisseau extraterrestre → LÉGENDE ;
 * astéroïde ou comète → DÉBATTU (explosion dans l'atmosphère : consensus).
 *
 * Même mécanique que le n°11 : la narration est la source de vérité du
 * minutage, l'image est calée sur l'instant où chaque mot est prononcé.
 */
import type { LayerInput, SceneInput } from '../../../src/types/storyboard.ts';
import {
  CX, F, P, W, X, alpha, atelier, drawn, episode, foretD, gradient, header, kf, paper, stampAt, typewriter,
  type Segment,
} from '../charte.ts';

export const ID = '12_toungouska';

/* ───────────── Narration (≈ 2,6 mots/s avec la voix ElevenLabs à 1.15) ───────────── */
export const NARRATION: Segment[] = [
  { id: 'accroche', start: 0, end: 6.8, text: '30 juin 1908, Sibérie. Une explosion des centaines de fois plus forte qu’Hiroshima. Et pourtant : *aucun cratère*.' },
  { id: 'temoin', start: 6.8, end: 16, text: 'À soixante-cinq kilomètres, un témoin voit le ciel se *fendre en deux*. Sa chemise semble prendre feu, et le souffle le projette à plusieurs mètres.' },
  { id: 'foret', start: 16, end: 23.6, text: 'Quatre-vingts millions d’arbres couchés sur plus de deux mille kilomètres carrés : vingt fois Paris. Tous *dos à l’explosion*.' },
  { id: 'ciel', start: 23.6, end: 30.2, text: 'Les nuits suivantes, le ciel d’Europe brille tellement qu’on peut lire le journal dehors, *à minuit*.' },
  { id: 'expedition', start: 30.2, end: 39.4, text: 'Il faut attendre 1927 : le savant Leonid Kulik atteint enfin le site. Il cherche une météorite… et ne trouve *ni cratère, ni fragment*.' },
  { id: 'hypotheses', start: 39.4, end: 45.6, text: 'Alors on imagine tout : un vaisseau extraterrestre, de l’antimatière, même un *mini trou noir*.' },
  { id: 'explication', start: 45.6, end: 54.4, text: 'Pour les scientifiques, un astéroïde ou une comète a explosé *dans les airs*, à quelques kilomètres d’altitude. Rien n’a touché le sol.' },
  { id: 'verdict', start: 54.4, end: 62.8, text: 'L’explosion : *prouvée*. Un vaisseau extraterrestre : *légende*. Astéroïde ou comète : encore *débattu*. Et toi, ton hypothèse ?' },
];

/** Durée prévue 64,2 s ; recalculée par `applyVoice` quand la vraie voix est disponible. */
const A = atelier(NARRATION, 64.2);
export const applyVoice = A.applyVoice;
const { seg, at, sceneFor } = A;
const CUES = A.cues;
const cue = (id: string, tLocal: number, type: 'stamp' | 'hit' | 'riser') => CUES.push({ t: +(seg(id).start + tLocal).toFixed(3), type });

/* ───────────── Briques de l'épisode ───────────── */

/** Boule de feu (halo radial) qui naît à t puis décroît jusqu'à `fin`. */
function fireball(id: string, x: number, y: number, r: number, t: number, fin: number): LayerInput {
  return {
    type: 'path',
    id,
    shape: { type: 'circle', cx: x, cy: y, r },
    fill: { type: 'radial', stops: [['#fffaf0', 0], [alpha(P.goldLight, 90), 0.18], [alpha(P.gold, 45), 0.45], [alpha('#d6582f', 0), 1]] },
    blend: 'screen',
    pivot: { x, y },
    keyframes: [kf(t - 0.05, { scale: 0, opacity: 0 }), kf(t, { opacity: 1, easing: 'linear' }), kf(t + 0.55, { scale: 1, easing: 'ease-out' }), kf(fin, { scale: 1.12, opacity: 0.45, easing: 'ease-in-out' })],
  };
}

/** Onde de choc : anneau qui s'élargit et s'efface. */
const shockwave = (id: string, x: number, y: number, t: number, r = 110): LayerInput => ({
  type: 'path',
  id,
  shape: { type: 'circle', cx: x, cy: y, r },
  fill: 'none',
  stroke: P.goldLight,
  strokeWidth: 6,
  pivot: { x, y },
  keyframes: [kf(t, { scale: 0.2, opacity: 0 }), kf(t + 0.05, { opacity: 1, easing: 'linear' }), kf(t + 1.2, { scale: 4.2, opacity: 0, easing: 'ease-out' })],
});

/** Flash blanc plein écran. */
const flash = (id: string, t: number, max = 0.85): LayerInput => ({
  type: 'path',
  id,
  shape: { type: 'rect', x: 0, y: 0, width: W, height: 1920 },
  fill: '#fff7e0',
  keyframes: [kf(t - 0.03, { opacity: 0 }), kf(t + 0.04, { opacity: max, easing: 'linear' }), kf(t + 0.7, { opacity: 0, easing: 'ease-out' })],
});

/** Secousse horizontale (keyframes de x) à partir de t. */
const shake = (t: number, amp = 16) => [0, 1, -0.75, 0.5, -0.25, 0].map((v, k) => kf(t + k * 0.06, { x: v * amp, easing: 'linear' }));

/** Forêt de sapins qui se couche, soufflée depuis `blastX` (zone morte : arbres restés debout). */
function foretSoufflee(id: string, o: { baseY: number; x0: number; x1: number; n: number; seed: number; blastX: number; deadZone: number; t: number; hMin?: number; hMax?: number; reveal?: [number, number] }): LayerInput {
  const debout = foretD(o.baseY, o.x0, o.x1, o.n, o.seed, () => 0, o.hMin, o.hMax);
  const couchee = foretD(o.baseY, o.x0, o.x1, o.n, o.seed, (x) => (Math.abs(x - o.blastX) < o.deadZone ? 0 : Math.sign(x - o.blastX) * 78), o.hMin, o.hMax);
  return {
    type: 'path',
    id,
    d: debout,
    fill: '#07080b',
    stroke: P.gold,
    strokeWidth: 3,
    lineJoin: 'round',
    ...(o.reveal ? { clipDirection: 'left-to-right' as const } : {}),
    keyframes: [
      ...(o.reveal ? [kf(o.reveal[0], { clipProgress: 0 }), kf(o.reveal[1], { clipProgress: 1, easing: 'cubic-bezier(0.65,0,0.35,1)' })] : []),
      kf(o.t, { d: debout }),
      kf(o.t + 0.5, { d: couchee, easing: 'ease-out' }),
    ],
  };
}

/* ───────────── Scènes ───────────── */

function sceneAccroche(): SceneInput {
  const s = 'accroche';
  const tB = at(s, 'explosion');
  const tAucun = at(s, 'aucun');
  cue(s, tB, 'hit');
  cue(s, tAucun + 0.1, 'stamp');
  const fin = seg(s).end - seg(s).start + X;
  return sceneFor(s, [
    fireball('boule', CX, 1060, 300, tB, fin),
    shockwave('onde', CX, 1060, tB + 0.05),
    {
      type: 'group',
      id: 'secousse',
      keyframes: shake(tB + 0.05, 18),
      layers: [
        {
          type: 'text',
          id: 'annee',
          content: '1908',
          font: F.title,
          size: 250,
          weight: 900,
          color: gradient(180, [P.goldLight, 0], [P.gold, 1]),
          anchor: { x: CX, y: 520 },
          shadow: { color: alpha(P.gold, 45), blur: 50 },
          keyframes: [kf(0, { scale: 2.2, opacity: 0 }), kf(0.08, { opacity: 1, easing: 'linear' }), kf(0.7, { scale: 1, easing: 'spring(240,13)' })],
        },
        typewriter('lieu', 'SIBÉRIE · 30 JUIN', CX, 660, 40, Math.max(0.5, at(s, 'sibérie') - 0.3), { color: P.goldLight, align: 'center', stagger: 0.05 }),
        foretSoufflee('taiga', { baseY: 1160, x0: 50, x1: 1030, n: 24, seed: 7, blastX: CX, deadZone: 0, t: tB + 0.1, reveal: [0.1, 1.4] }),
        drawn('sol', 'M30,1160 H1050', 0.1, 1.2, { width: 2, color: alpha(P.gold, 60) }),
      ],
    },
    flash('eclair', tB),
    stampAt('aucun-cratere', 'Aucun cratère', tAucun + 0.1, CX, 840, P.red, { size: 74, rotate: -8 }),
  ], { type: 'fade', duration: X, easing: 'ease-in-out' });
}

function sceneTemoin(): SceneInput {
  const s = 'temoin';
  const tFend = at(s, 'fendre');
  const tChemise = at(s, 'chemise');
  const tSouffle = at(s, 'souffle');
  cue(s, tFend, 'hit');
  cue(s, tSouffle + 0.1, 'hit');
  const crack = 'M40,640 L170,606 L250,668 L370,598 L460,652 L580,588 L690,664 L790,604 L900,652 L1040,612';
  const tCarte = Math.max(tFend + 0.6, tChemise - 1.4);
  return sceneFor(s, [
    {
      type: 'text',
      id: 'distance',
      content: '{value} KM',
      font: F.title,
      size: 120,
      weight: 900,
      color: gradient(180, [P.goldLight, 0], [P.gold, 1]),
      anchor: { x: CX, y: 450 },
      keyframes: [kf(0, { value: 0, opacity: 0 }), kf(0.3, { opacity: 1, easing: 'ease-out' }), kf(1.6, { value: 65, easing: 'ease-out' })],
    },
    { type: 'text', id: 'distance-sous', content: 'de l’explosion', font: F.typewriter, size: 32, weight: 400, color: '$text/70', anchor: { x: CX, y: 530 }, keyframes: [kf(0.6, { opacity: 0 }), kf(1, { opacity: 1, easing: 'ease-out' })] },
    // Le ciel se fend : lueur puis éclair zigzag.
    {
      type: 'path',
      id: 'lueur-ciel',
      shape: { type: 'rect', x: 0, y: 540, width: W, height: 200 },
      fill: gradient(180, [alpha(P.goldLight, 0), 0], [alpha(P.goldLight, 55), 0.5], [alpha(P.goldLight, 0), 1]),
      blend: 'screen',
      keyframes: [kf(tFend - 0.2, { opacity: 0 }), kf(tFend + 0.1, { opacity: 1, easing: 'ease-out' }), kf(tFend + 1.6, { opacity: 0.35, easing: 'ease-in-out' })],
    },
    drawn('fissure', crack, tFend - 0.2, 0.45, { width: 7, color: '#fffaf0', easing: 'ease-out' }),
    drawn('fissure-halo', crack, tFend - 0.2, 0.45, { width: 22, color: alpha(P.gold, 35), easing: 'ease-out' }),
    {
      type: 'group',
      id: 'temoignage',
      pivot: { x: CX, y: 940 },
      rotate: -2,
      keyframes: [kf(tCarte, { y: 700, rotate: 6 }), kf(tCarte + 0.8, { y: 0, rotate: -2, easing: 'spring(140,16)' }), kf(tSouffle, { x: 0 }), kf(tSouffle + 0.08, { x: 70, easing: 'linear' }), kf(tSouffle + 0.9, { x: 0, easing: 'elastic(1,0.4)' })],
      layers: [
        paper('temoignage-papier', 130, 760, W - 260, 360),
        typewriter('temoignage-titre', 'Comptoir de Vanavara — témoignage', 190, 830, 28, tCarte + 0.4, { color: alpha(P.ink, 70) }),
        drawn('temoignage-trait', 'M190,868 H890', tCarte + 0.6, 0.5, { width: 2, color: alpha(P.ink, 35) }),
        typewriter('temoignage-citation', '« Le ciel s’est fendu en deux… J’ai eu si chaud, comme si ma chemise avait pris feu. »', 190, 960, 38, tCarte + 0.8, { maxWidth: 700, stagger: 0.026 }),
      ],
    },
    {
      type: 'component',
      ref: 'lower-third',
      start: Math.max(0.2, at(s, 'témoin') - 0.3),
      props: { name: 'S. Semenov', role: 'Témoin, à 65 km', font: F.title, roleFont: F.ui, size: 48, accent: '$gold', y: 1215, duration: 3 },
    },
  ], { type: 'slide-left', duration: X, easing: 'cubic-bezier(0.7,0,0.2,1)' });
}

function sceneForet(): SceneInput {
  const s = 'foret';
  const cx = CX, cy = 800, R = 380;
  const t0 = Math.max(0.2, at(s, 'couchés') - 0.5);
  const tDos = at(s, 'dos');
  const tParis = at(s, 'vingt');
  // Arbres couchés vus du ciel : traits radiaux (dos à l'explosion), par anneaux.
  let seed = 23;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const bands: string[][] = Array.from({ length: 6 }, () => []);
  for (let k = 0; k < 190; k++) {
    const r = 60 + Math.sqrt(rnd()) * (R - 70);
    const th = rnd() * Math.PI * 2;
    const len = 16 + rnd() * 16;
    const p = (rr: number) => `${Math.round((cx + rr * Math.cos(th)) * 10) / 10},${Math.round((cy + rr * Math.sin(th)) * 10) / 10}`;
    bands[Math.min(5, Math.floor(((r - 60) / (R - 60)) * 6))]!.push(`M${p(r)} L${p(r + len)}`);
  }
  const layers: LayerInput[] = [
    { type: 'text', id: 'vue', content: 'VUE DU CIEL', font: F.typewriter, size: 30, weight: 400, color: P.gold, letterSpacing: 4, align: 'left', anchor: { x: 70, y: 430 }, keyframes: [kf(0.1, { opacity: 0 }), kf(0.5, { opacity: 1, easing: 'ease-out' })] },
    { type: 'text', id: 'surface', content: '2 150 km²', font: F.title, size: 44, weight: 700, color: P.goldLight, align: 'right', anchor: { x: W - 70, y: 432 }, keyframes: [kf(at(s, 'deux') - 0.2, { opacity: 0, y: -12 }), kf(at(s, 'deux') + 0.3, { opacity: 1, y: 0, easing: 'ease-out' })] },
    { type: 'path', id: 'zone', shape: { type: 'circle', cx, cy, r: R + 20 }, fill: 'none', stroke: alpha(P.gold, 45), strokeWidth: 2, strokeDasharray: [10, 12], keyframes: [kf(at(s, 'deux') - 0.2, { opacity: 0 }), kf(at(s, 'deux') + 0.4, { opacity: 1, easing: 'ease-out' })] },
    ...bands.map((b, k): LayerInput => ({
      type: 'path',
      id: `arbres-${k}`,
      d: b.join(' '),
      fill: 'none',
      stroke: alpha(P.gold, 85 - k * 6),
      strokeWidth: 3.5,
      lineCap: 'round',
      pivot: { x: cx, y: cy },
      keyframes: [kf(t0 + k * 0.22, { opacity: 0, scale: 0.86 }), kf(t0 + k * 0.22 + 0.4, { opacity: 1, scale: 1, easing: 'ease-out' })],
    })),
    { type: 'path', id: 'epicentre-halo', shape: { type: 'circle', cx, cy, r: 34 }, fill: alpha(P.red, 30), pivot: { x: cx, y: cy }, keyframes: [kf(t0, { scale: 0.4, opacity: 0 }), kf(t0 + 0.4, { scale: 1, opacity: 1, easing: 'back(2)' }), kf(t0 + 2.4, { scale: 1.5, opacity: 0.4, easing: 'ease-in-out' })] },
    { type: 'path', id: 'epicentre', shape: { type: 'circle', cx, cy, r: 13 }, fill: P.red, stroke: '#0b0c10', strokeWidth: 3, keyframes: [kf(t0, { opacity: 0 }), kf(t0 + 0.2, { opacity: 1, easing: 'linear' })] },
    // Paris à la même échelle (105 km² contre 2 150 km²).
    {
      type: 'group',
      id: 'paris',
      pivot: { x: cx + 205, y: cy + 210 },
      keyframes: [kf(tParis - 0.2, { scale: 0, opacity: 0 }), kf(tParis, { opacity: 1, easing: 'linear' }), kf(tParis + 0.6, { scale: 1, easing: 'back(2.2)' })],
      layers: [
        { type: 'path', id: 'paris-zone', shape: { type: 'circle', cx: cx + 205, cy: cy + 210, r: 84 }, fill: 'rgba(11,12,16,0.82)', stroke: P.goldLight, strokeWidth: 3 },
        { type: 'text', id: 'paris-nom', content: 'Paris', font: F.typewriter, size: 34, weight: 400, color: P.goldLight, anchor: { x: cx + 205, y: cy + 212 } },
      ],
    },
    // Flèches : tous les arbres pointent vers l'extérieur.
    {
      type: 'path',
      id: 'fleches',
      d: Array.from({ length: 8 }, (_, k) => {
        const th = (k / 8) * Math.PI * 2 + Math.PI / 8;
        const pt = (rr: number, dth = 0) => `${Math.round((cx + rr * Math.cos(th + dth)) * 10) / 10},${Math.round((cy + rr * Math.sin(th + dth)) * 10) / 10}`;
        return `M${pt(R + 40)} L${pt(R + 92)} M${pt(R + 72, -0.05)} L${pt(R + 92)} L${pt(R + 72, 0.05)}`;
      }).join(' '),
      fill: 'none',
      stroke: P.red,
      strokeWidth: 5,
      lineCap: 'round',
      lineJoin: 'round',
      pivot: { x: cx, y: cy },
      keyframes: [kf(tDos - 0.15, { opacity: 0, scale: 0.9 }), kf(tDos + 0.35, { opacity: 1, scale: 1, easing: 'back(2)' })],
    },
    {
      type: 'text',
      id: 'compteur-arbres',
      content: '{value} MILLIONS D’ARBRES',
      font: F.ui,
      size: 54,
      weight: 800,
      color: P.goldLight,
      anchor: { x: CX, y: 1262 },
      keyframes: [kf(0, { value: 0, opacity: 0 }), kf(0.3, { opacity: 1, easing: 'ease-out' }), kf(at(s, 'd’arbres') + 0.4, { value: 80, easing: 'ease-out' })],
    },
  ];
  return sceneFor(s, layers, { type: 'wipe-up', duration: X, easing: 'cubic-bezier(0.65,0,0.35,1)' });
}

function sceneCiel(): SceneInput {
  const s = 'ciel';
  const tMinuit = at(s, 'minuit');
  const tJournal = at(s, 'journal');
  cue(s, tMinuit + 0.1, 'stamp');
  const ox = CX, oy = 700, R = 170;
  // Toits d'une ville européenne + clocher.
  const toits = 'M30,1180 V1060 L95,1010 L160,1060 V1180 M160,1180 V1030 H260 V1180 M260,1180 V1075 L330,1020 L400,1075 V1180 M400,1180 V900 L430,860 L460,900 V1180 M460,1180 V1045 H560 L600,1005 L640,1045 V1180 M640,1180 V1070 L720,1015 L800,1070 V1180 M800,1180 V1035 H900 V1180 M900,1180 V1060 L975,1005 L1050,1060 V1180';
  return sceneFor(s, [
    {
      type: 'path',
      id: 'ciel-lumineux',
      shape: { type: 'rect', x: 0, y: 0, width: W, height: 1200 },
      fill: gradient(180, ['rgba(60,40,110,0)', 0], ['rgba(140,90,170,0.32)', 0.6], ['rgba(243,190,130,0.55)', 1]),
      blend: 'screen',
      keyframes: [kf(0.2, { opacity: 0 }), kf(at(s, 'brille') + 0.6, { opacity: 1, easing: 'ease-in-out' })],
    },
    typewriter('nuit', 'Nuit du 30 juin au 1er juillet 1908', CX, 440, 30, 0.3, { color: P.goldLight, align: 'center', maxWidth: 900 }),
    { type: 'path', id: 'horloge', shape: { type: 'circle', cx: ox, cy: oy, r: R }, fill: 'rgba(0,0,0,0.35)', stroke: P.gold, strokeWidth: 5, pivot: { x: ox, y: oy }, keyframes: [kf(0.1, { scale: 0.6, opacity: 0 }), kf(0.7, { scale: 1, opacity: 1, easing: 'spring(200,14)' })] },
    {
      type: 'path',
      id: 'horloge-graduations',
      d: Array.from({ length: 12 }, (_, k) => {
        const a = (k / 12) * Math.PI * 2;
        const p = (rr: number) => `${Math.round((ox + rr * Math.sin(a)) * 10) / 10},${Math.round((oy - rr * Math.cos(a)) * 10) / 10}`;
        return `M${p(R - 26)} L${p(R - 10)}`;
      }).join(' '),
      fill: 'none',
      stroke: P.goldLight,
      strokeWidth: 5,
      lineCap: 'round',
      keyframes: [kf(0.4, { opacity: 0 }), kf(0.9, { opacity: 1, easing: 'ease-out' })],
    },
    { type: 'path', id: 'aiguille-heures', d: `M${ox},${oy + 14} L${ox},${oy - 92}`, fill: 'none', stroke: P.goldLight, strokeWidth: 11, lineCap: 'round', pivot: { x: ox, y: oy }, keyframes: [kf(0.4, { rotate: -22.5, opacity: 0 }), kf(0.9, { opacity: 1, easing: 'ease-out' }), kf(tMinuit, { rotate: 0, easing: 'cubic-bezier(0.5,0,0.2,1)' })] },
    { type: 'path', id: 'aiguille-minutes', d: `M${ox},${oy + 18} L${ox},${oy - 138}`, fill: 'none', stroke: P.gold, strokeWidth: 7, lineCap: 'round', pivot: { x: ox, y: oy }, keyframes: [kf(0.4, { rotate: 90, opacity: 0 }), kf(0.9, { opacity: 1, easing: 'ease-out' }), kf(tMinuit, { rotate: 360, easing: 'cubic-bezier(0.5,0,0.2,1)' })] },
    { type: 'path', id: 'horloge-axe', shape: { type: 'circle', cx: ox, cy: oy, r: 12 }, fill: P.red, keyframes: [kf(0.4, { opacity: 0 }), kf(0.9, { opacity: 1, easing: 'ease-out' })] },
    { type: 'path', id: 'ville', d: toits, fill: '#07080b', stroke: alpha(P.gold, 80), strokeWidth: 3, lineJoin: 'round', clipDirection: 'left-to-right', keyframes: [kf(0.1, { clipProgress: 0 }), kf(1.2, { clipProgress: 1, easing: 'cubic-bezier(0.65,0,0.35,1)' })] },
    {
      type: 'group',
      id: 'journal',
      pivot: { x: 290, y: 1010 },
      rotate: -6,
      keyframes: [kf(tJournal - 0.3, { y: 400, opacity: 0 }), kf(tJournal - 0.2, { opacity: 1, easing: 'linear' }), kf(tJournal + 0.5, { y: 0, easing: 'spring(170,15)' })],
      layers: [
        paper('journal-papier', 130, 900, 320, 220),
        { type: 'text', id: 'journal-titre', content: 'LE JOURNAL', font: F.title, size: 38, weight: 900, color: P.ink, anchor: { x: 290, y: 950 } },
        { type: 'path', id: 'journal-lignes', d: 'M160,985 H420 M160,1020 H420 M160,1050 H380 M160,1080 H400', fill: 'none', stroke: alpha(P.ink, 35), strokeWidth: 4 },
      ],
    },
    stampAt('minuit', 'Minuit', tMinuit + 0.1, 820, 930, P.gold, { size: 62, rotate: 9 }),
  ], { type: 'glitch', duration: X });
}

function sceneExpedition(): SceneInput {
  const s = 'expedition';
  const t1927 = at(s, '1927');
  const tSite = at(s, 'site');
  const tCherche = at(s, 'cherche');
  const tCratere = at(s, 'cratère');
  const tFragment = at(s, 'fragment');
  cue(s, tCratere + 0.1, 'stamp');
  cue(s, tFragment + 0.1, 'stamp');
  // Troncs restés debout, écorcés : la "forêt de poteaux télégraphiques".
  const poteaux = [150, 245, 345, 430, 540, 640, 730, 830, 930].map((x, k) => {
    const h = 170 + ((k * 53) % 90);
    const base = 1150;
    return `M${x},${base} V${base - h} M${x},${base - h * 0.55} l${k % 2 ? 26 : -26},-22 M${x},${base - h * 0.8} l${k % 2 ? -20 : 20},-16`;
  }).join(' ');
  return sceneFor(s, [
    {
      type: 'text',
      id: 'annee-1927',
      content: '1927',
      font: F.title,
      size: 200,
      weight: 900,
      color: gradient(180, [P.goldLight, 0], [P.gold, 1]),
      anchor: { x: CX, y: 500 },
      keyframes: [kf(Math.max(0, t1927 - 0.4), { scale: 2, opacity: 0 }), kf(Math.max(0.05, t1927 - 0.3), { opacity: 1, easing: 'linear' }), kf(t1927 + 0.3, { scale: 1, easing: 'spring(240,13)' })],
    },
    { type: 'text', id: 'annees-apres', content: '{value} ANS PLUS TARD', font: F.typewriter, size: 38, weight: 400, color: P.goldLight, letterSpacing: 3, anchor: { x: CX, y: 640 }, keyframes: [kf(t1927, { value: 0, opacity: 0 }), kf(t1927 + 0.3, { opacity: 1, easing: 'ease-out' }), kf(t1927 + 1.3, { value: 19, easing: 'ease-out' })] },
    { type: 'path', id: 'poteaux', d: poteaux, fill: 'none', stroke: P.goldLight, strokeWidth: 7, lineCap: 'round', clipDirection: 'bottom-to-top', keyframes: [kf(tSite - 0.6, { clipProgress: 0 }), kf(tSite + 0.6, { clipProgress: 1, easing: 'ease-out' })] },
    drawn('sol-1927', 'M60,1150 H1020', tSite - 0.7, 0.8, { width: 3, color: alpha(P.gold, 70) }),
    // Loupe qui balaie le site à la recherche de la météorite.
    {
      type: 'group',
      id: 'loupe',
      keyframes: [kf(tCherche - 0.3, { x: -330, y: 0, opacity: 0 }), kf(tCherche, { opacity: 1, easing: 'linear' }), kf(tFragment + 0.2, { x: 300, easing: 'ease-in-out' }), kf(tCherche + 0.9, { y: -30, easing: 'ease-in-out' }), kf(tFragment, { y: 10, easing: 'ease-in-out' })],
      layers: [
        { type: 'path', id: 'loupe-verre', shape: { type: 'circle', cx: CX, cy: 960, r: 78 }, fill: alpha(P.goldLight, 10), stroke: P.goldLight, strokeWidth: 7 },
        { type: 'path', id: 'loupe-manche', d: `M${CX + 56},${960 + 56} L${CX + 120},${960 + 120}`, fill: 'none', stroke: P.gold, strokeWidth: 16, lineCap: 'round' },
      ],
    },
    {
      type: 'component',
      ref: 'lower-third',
      start: Math.max(0.2, at(s, 'leonid') - 0.3),
      props: { name: 'Leonid Kulik', role: 'Spécialiste des météorites', font: F.title, roleFont: F.ui, size: 48, accent: '$gold', y: 1215, duration: 3 },
    },
    stampAt('ni-cratere', 'Ni cratère', tCratere + 0.1, 300, 800, P.red, { size: 56, rotate: -10 }),
    stampAt('ni-fragment', 'Ni fragment', tFragment + 0.1, 780, 860, P.red, { size: 56, rotate: 8 }),
  ], { type: 'fade', duration: X, easing: 'ease-in-out' });
}

function sceneHypotheses(): SceneInput {
  const s = 'hypotheses';
  const tEnd = seg(s).end - seg(s).start;
  const cartes = [
    { nom: 'Vaisseau extraterrestre', info: 'Né d’une nouvelle de science-fiction (1946)', t: at(s, 'vaisseau') },
    { nom: 'Antimatière', info: 'Article dans Nature (1965)', t: at(s, 'l’antimatière') },
    { nom: 'Mini trou noir', info: 'Article dans Nature (1973)', t: at(s, 'mini') },
  ];
  const layers: LayerInput[] = [
    { type: 'text', id: 'imagine', content: 'ON IMAGINE *TOUT*', font: F.title, size: 88, weight: 900, highlight: P.gold, anchor: { x: CX, y: 450 }, split: { by: 'word', start: 0.05, stagger: 0.12, duration: 0.5, easing: 'back(2)', from: { scale: 0.4, opacity: 0 } } },
  ];
  cartes.forEach((c, k) => {
    const y = 590 + k * 200;
    const tX = tEnd - 1.1 + k * 0.18;
    layers.push({
      type: 'group',
      id: `hypothese-${k}`,
      pivot: { x: CX, y: y + 80 },
      keyframes: [kf(c.t - 0.35, { x: 700, opacity: 0 }), kf(c.t + 0.35, { x: 0, opacity: 1, easing: 'spring(170,16)' })],
      layers: [
        { type: 'path', id: `hypothese-fond-${k}`, shape: { type: 'rect', x: 120, y, width: W - 240, height: 160, radius: 18 }, fill: 'rgba(255,255,255,0.05)', stroke: 'rgba(255,255,255,0.14)', strokeWidth: 2 },
        { type: 'path', id: `hypothese-pastille-${k}`, shape: { type: 'circle', cx: 200, cy: y + 80, r: 48 }, fill: '#20232c', stroke: alpha(P.gold, 60), strokeWidth: 3 },
        { type: 'text', id: `hypothese-q-${k}`, content: '?', font: F.title, size: 56, weight: 900, color: alpha(P.gold, 80), anchor: { x: 200, y: y + 82 } },
        { type: 'text', id: `hypothese-nom-${k}`, content: c.nom, font: F.ui, size: 40, weight: 700, align: 'left', anchor: { x: 280, y: y + 60 } },
        { type: 'text', id: `hypothese-info-${k}`, content: c.info, font: F.typewriter, size: 26, weight: 400, color: '$text/65', align: 'left', anchor: { x: 280, y: y + 108 }, maxWidth: 640 },
        drawn(`hypothese-croix-${k}`, `M270,${y + 62} H${270 + Math.min(600, c.nom.length * 22)}`, tX, 0.35, { width: 6, color: P.red }),
      ],
    });
    layers.push({ type: 'text', id: `hypothese-tag-${k}`, content: 'AUCUNE PREUVE', font: F.typewriter, size: 24, weight: 400, color: P.red, letterSpacing: 3, align: 'right', anchor: { x: 930, y: y + 40 }, keyframes: [kf(tX + 0.2, { opacity: 0 }), kf(tX + 0.5, { opacity: 1, easing: 'ease-out' })] });
  });
  cue(s, tEnd - 1.5, 'riser');
  return sceneFor(s, layers, { type: 'slide-left', duration: X, easing: 'cubic-bezier(0.7,0,0.2,1)' });
}

function sceneExplication(): SceneInput {
  const s = 'explication';
  const tA = at(s, 'astéroïde');
  const tAir = at(s, 'airs');
  const tAlt = at(s, 'quelques');
  const tSol = at(s, 'sol');
  cue(s, tAir, 'hit');
  cue(s, tSol + 0.1, 'stamp');
  const ground = 1150;
  const km = (v: number) => ground - v * 58.3;
  const bx = 600, by = km(8);
  // Roche irrégulière centrée sur le point d'explosion (déplacée par son groupe).
  const roche = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => {
    const a = (k / 8) * Math.PI * 2;
    const r = 24 + ((k * 7) % 5) * 3;
    return `${Math.round((bx + r * Math.cos(a)) * 10) / 10},${Math.round((by + r * Math.sin(a)) * 10) / 10}`;
  });
  const fin = seg(s).end - seg(s).start + X;
  return sceneFor(s, [
    // Échelle d'altitude.
    drawn('axe', `M130,${ground} V${km(11)}`, 0.1, 0.8, { width: 3, color: alpha(P.gold, 70) }),
    ...[0, 5, 10].map((v): LayerInput => ({ type: 'text', id: `alt-${v}`, content: `${v} km`, font: F.typewriter, size: 26, weight: 400, color: '$text/70', align: 'left', anchor: { x: 150, y: km(v) - (v ? 0 : 22) }, keyframes: [kf(0.5, { opacity: 0 }), kf(0.9, { opacity: 1, easing: 'ease-out' })] })),
    { type: 'path', id: 'alt-graduations', d: [0, 2, 4, 6, 8, 10].map((v) => `M118,${km(v)} H142`).join(' '), fill: 'none', stroke: alpha(P.gold, 70), strokeWidth: 3, keyframes: [kf(0.5, { opacity: 0 }), kf(0.9, { opacity: 1, easing: 'ease-out' })] },
    // Bande 5–10 km où l'objet s'est désintégré.
    { type: 'path', id: 'bande', shape: { type: 'rect', x: 130, y: km(10), width: 900, height: km(5) - km(10) }, fill: alpha(P.gold, 9), stroke: alpha(P.gold, 40), strokeWidth: 2, strokeDasharray: [10, 10], keyframes: [kf(tAlt - 0.3, { opacity: 0 }), kf(tAlt + 0.3, { opacity: 1, easing: 'ease-out' })] },
    { type: 'text', id: 'bande-label', content: '5 à 10 km d’altitude', font: F.typewriter, size: 30, weight: 400, color: P.goldLight, align: 'right', anchor: { x: 1010, y: km(5) - 28 }, keyframes: [kf(tAlt - 0.1, { opacity: 0 }), kf(tAlt + 0.4, { opacity: 1, easing: 'ease-out' })] },
    // Trajectoire + objet qui plonge.
    drawn('trajectoire', `M1060,${km(13)} L${bx},${by}`, tA - 0.3, tAir - tA + 0.25, { width: 4, color: alpha(P.goldLight, 70), easing: 'ease-in' }),
    {
      type: 'group',
      id: 'objet',
      keyframes: [kf(tA - 0.3, { x: 1060 - bx, y: km(13) - by, opacity: 0 }), kf(tA - 0.1, { opacity: 1, easing: 'linear' }), kf(tAir - 0.05, { x: 0, y: 0, easing: 'ease-in' }), kf(tAir + 0.05, { opacity: 0, easing: 'linear' })],
      layers: [{ type: 'path', id: 'roche', d: `M${roche.join(' L')} Z`, fill: gradient(135, ['#a08a6a', 0], ['#4b3f30', 1]), stroke: P.goldLight, strokeWidth: 3, shadow: { color: alpha(P.gold, 70), blur: 30 } }],
    },
    fireball('explosion', bx, by, 230, tAir, fin),
    shockwave('onde-1', bx, by, tAir + 0.02, 90),
    shockwave('onde-2', bx, by, tAir + 0.3, 90),
    flash('eclair-2', tAir, 0.55),
    // Le souffle couche les arbres… sauf juste en dessous : ils restent debout.
    foretSoufflee('taiga-2', { baseY: ground, x0: 180, x1: 1040, n: 20, seed: 31, blastX: bx, deadZone: 60, t: tAir + 0.45, hMin: 50, hMax: 95 }),
    drawn('sol-2', `M150,${ground} H1050`, 0.1, 0.9, { width: 3, color: alpha(P.gold, 70) }),
    stampAt('aucun-impact', 'Aucun impact', tSol + 0.1, 820, 1000, P.red, { size: 58, rotate: -8 }),
  ], { type: 'flash', duration: X, easing: 'ease-out' });
}

function sceneVerdict(): SceneInput {
  return A.verdictScene('verdict', [
    { label: 'L’explosion', stamp: 'PROUVÉ', word: 'prouvée' },
    { label: 'Un vaisseau extraterrestre', stamp: 'LÉGENDE', word: 'légende' },
    { label: 'Astéroïde ou comète ?', stamp: 'DÉBATTU', word: 'débattu' },
  ]);
}

/* ───────────── Storyboard final ───────────── */

export function build() {
  CUES.length = 0;
  const scenes = [sceneAccroche(), sceneTemoin(), sceneForet(), sceneCiel(), sceneExpedition(), sceneHypotheses(), sceneExplication(), sceneVerdict()];
  const storyboard = episode('L’Énigme Vraie — 12 · La Toungouska', scenes, [...header('DOSSIER N°12 · LA TOUNGOUSKA', A.total), ...A.captions()]);
  return { storyboard, narration: NARRATION, cues: A.sortedCues(), total: A.total };
}

/* ───────────── Fiche de publication (même format que BUSINESS TIKTOK/SCRIPTS) ───────────── */
export const fiche = () => `# 12 — L'explosion de la Toungouska

- **Titre (couverture)** : Une explosion… sans cratère
- **Durée** : ${A.total} s (> 60 s : éligible Creator Rewards)
- **Verdict** : explosion → PROUVÉ · vaisseau extraterrestre → LÉGENDE · astéroïde ou comète → DÉBATTU
- **Production** : moteur de motion design (storyboard.json) + voix ElevenLabs (audio/voix_elevenlabs.py) + musique originale (audio/musique.py)

## Script (voix)

${NARRATION.map((s) => `**[${s.start.toFixed(1)}–${s.end.toFixed(1)} s]** ${s.text.replace(/\*/g, '')}`).join('\n\n')}

## Description

\`\`\`
30 juin 1908 : une explosion rase 80 millions d'arbres en Sibérie… et personne ne trouve de cratère. Ce qui est prouvé, ce qui est légende. 🔎 Sources en commentaire épinglé.
#histoirevraie #mystere #toungouska #tunguska #siberie #asteroide #enigme #espace #apprendresurtiktok #faitsreels
\`\`\`

## Commentaire à épingler

\`\`\`
📚 Sources : témoignage de S. Semenov (comptoir de Vanavara) recueilli par l'expédition Kulik ; L. Kulik, expéditions de 1927-1930 ; Chyba, Thomas & Zahnle, Nature 361 (1993) : désintégration d'un astéroïde rocheux dans l'atmosphère. Antimatière : Cowan, Atluri & Libby, Nature (1965) ; trou noir : Jackson & Ryan, Nature (1973). Astéroïde ou comète ? 👇
\`\`\`

## Points vérifiés

- 30 juin 1908, vers 7 h 15 heure locale, près de la rivière Toungouska Pierreuse (Sibérie centrale).
- Énergie estimée de 10 à 15 mégatonnes (fourchette publiée : 3 à 30) ; Hiroshima ≈ 15 kilotonnes → des centaines de fois plus.
- Environ 80 millions d'arbres couchés sur environ 2 150 km² (Paris intra-muros : 105 km², soit ≈ 20 fois), disposés en éventail, dos à l'épicentre ; au centre, des arbres restés debout mais ébranchés.
- Témoin S. Semenov au comptoir de Vanavara, à ≈ 65 km au sud : ciel « fendu en deux », chaleur « comme si sa chemise prenait feu », projeté à plusieurs mètres (témoignage recueilli en 1930).
- Nuits anormalement claires sur l'Europe et l'Asie les jours suivants (maximum la nuit du 30 juin au 1er juillet) : lecture possible dehors vers minuit (observatoire d'Armagh, entre autres).
- Première expédition scientifique : Leonid Kulik, 1927 ; ni cratère ni fragment de météorite.
- Hypothèses non retenues : vaisseau extraterrestre (A. Kazantsev, nouvelle « L'Explosion », 1946), antimatière (Nature, 1965), mini trou noir (Nature, 1973).
- Explication retenue : explosion aérienne d'un astéroïde ou d'une comète entre 5 et 10 km d'altitude ; la nature exacte de l'objet reste débattue.
- Prudence : on lit souvent « à Londres » pour la lecture à minuit ; la source fiable cite l'observatoire d'Armagh (Irlande du Nord) → narration limitée à « le ciel d'Europe ».

## Miniature

Image extraite à 5 s (« 1908 », la taïga soufflée, la boule de feu, tampon « Aucun cratère ») : \`miniature.jpg\`.
`;
