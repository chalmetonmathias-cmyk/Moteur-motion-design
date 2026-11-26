/**
 * L'Énigme Vraie — Dossier n°11 : l'Homme au masque de fer (64 s).
 *
 * Verdict : prisonnier masqué → PROUVÉ ; masque de fer / jumeau du roi →
 * LÉGENDE ; identité → DÉBATTUE (Eustache Dauger, valet, thèse principale).
 *
 * La narration est la source de vérité du minutage : chaque scène démarre
 * avec son segment, et les sous-titres comme les tampons sont calés sur
 * l'instant où le mot est prononcé (`wordTime`).
 */
import type { LayerInput, SceneInput } from '../../../src/types/storyboard.ts';
import {
  CX, F, P, W, X, alpha, atelier, bastilleD, drawn, episode, eyesD, gradient, header, ironOutline, kf, paper, stampAt, typewriter, velvetOutline,
  type Segment,
} from '../charte.ts';

export const ID = '11_masque-de-fer';

/* ───────────── Narration (≈ 2,75 mots/s, voix française) ───────────── */
export const NARRATION: Segment[] = [
  { id: 'accroche', start: 0, end: 5.2, text: 'Novembre 1703. Un prisonnier meurt à la Bastille. Personne n’a jamais vu *son visage*.' },
  { id: 'lettre', start: 5.2, end: 14.4, text: 'Trente-quatre ans plus tôt, en juillet 1669, le ministre Louvois écrit à son geôlier : s’il parle d’autre chose que de ses besoins, *menacez-le de mort*.' },
  { id: 'prisons', start: 14.4, end: 22, text: 'Le nom inscrit dans les lettres : *Eustache Dauger*. Pignerol, Exilles, l’île Sainte-Marguerite, puis la Bastille. Toujours le même geôlier : Saint-Mars.' },
  { id: 'journal', start: 22, end: 29.4, text: 'À la Bastille, un officier tient un journal. Il y décrit un prisonnier toujours masqué… d’un masque de *velours noir*.' },
  { id: 'legende', start: 29.4, end: 39.2, text: 'Le *masque de fer* ? Il apparaît un demi-siècle plus tard, sous la plume de Voltaire. Puis Alexandre Dumas en fait le *frère jumeau* de Louis XIV.' },
  { id: 'enterrement', start: 39.2, end: 45.4, text: 'Le 20 novembre 1703, on l’enterre sous un faux nom : *Marchioly*. Même mort, il reste un secret.' },
  { id: 'identite', start: 45.4, end: 54.9, text: 'Alors, qui était-il ? Pour la plupart des historiens, *un simple valet*, Eustache Dauger, qui en savait sans doute trop. Mais quoi ? Personne ne le sait.' },
  { id: 'verdict', start: 54.9, end: 63.6, text: 'Le prisonnier masqué : *prouvé*. Le masque de fer et le jumeau du roi : *légende*. Son identité : toujours *débattue*. Et toi, ton hypothèse ?' },
];

/** Durée prévue 65 s ; recalculée par `applyVoice` quand la vraie voix est disponible. */
const A = atelier(NARRATION, 65);
export const applyVoice = A.applyVoice;
const { seg, at, sceneFor } = A;
const AUDIO_CUES = A.cues;

/* ───────────── Scènes ───────────── */

function sceneAccroche(): SceneInput {
  return sceneFor('accroche', [
    drawn('bastille', bastilleD(1080), 0.15, 2.4, { width: 4 }),
    {
      type: 'text',
      id: 'annee',
      content: '1703',
      font: F.title,
      size: 250,
      weight: 900,
      color: gradient(180, [P.goldLight, 0], [P.gold, 1]),
      anchor: { x: CX, y: 520 },
      shadow: { color: alpha(P.gold, 45), blur: 50 },
      keyframes: [kf(0, { scale: 2.2, opacity: 0 }), kf(0.08, { opacity: 1, easing: 'linear' }), kf(0.7, { scale: 1, easing: 'spring(240,13)' })],
    },
    // Le masque surgit devant la forteresse quand la voix dit "visage".
    {
      type: 'group',
      id: 'masque',
      pivot: { x: CX, y: 860 },
      keyframes: [kf(at('accroche', 'visage') - 0.35, { scale: 0, opacity: 0 }), kf(at('accroche', 'visage') - 0.25, { opacity: 1, easing: 'linear' }), kf(at('accroche', 'visage') + 0.45, { scale: 1, easing: 'spring(220,12)' })],
      layers: [
        { type: 'path', id: 'masque-forme', d: `${velvetOutline(CX, 860, 0.9)} ${eyesD(CX, 860, 0.9)}`, fillRule: 'evenodd', fill: '#050506', stroke: P.gold, strokeWidth: 4, shadow: { color: alpha(P.gold, 50), blur: 40 } },
      ],
    },
  ], { type: 'fade', duration: X, easing: 'ease-in-out' });
}

function sceneLettre(): SceneInput {
  const t0 = 0.5;
  AUDIO_CUES.push({ t: seg('lettre').start + 0.6, type: 'tick-start' }, { t: seg('lettre').end - 0.4, type: 'tick-stop' });
  const tStamp = at('lettre', 'menacez');
  AUDIO_CUES.push({ t: seg('lettre').start + tStamp, type: 'stamp' }, { t: seg('lettre').start + 6.4, type: 'seal' });
  return sceneFor('lettre', [
    {
      type: 'group',
      id: 'lettre',
      pivot: { x: CX, y: 800 },
      rotate: -2,
      keyframes: [kf(0, { y: 900, rotate: 6 }), kf(0.9, { y: 0, rotate: -2, easing: 'spring(140,16)' })],
      layers: [
        paper('lettre-papier', 120, 450, W - 240, 700),
        typewriter('lettre-date', '19 juillet 1669', 180, 530, 30, t0, { color: alpha(P.ink, 75) }),
        typewriter('lettre-dest', 'À M. de Saint-Mars, à Pignerol', 180, 580, 30, t0 + 0.5, { color: alpha(P.ink, 75) }),
        drawn('lettre-trait', 'M180,625 H900', t0 + 1, 0.6, { width: 2, color: alpha(P.ink, 40) }),
        typewriter('lettre-citation', '« … le menaciez de le faire mourir s’il vous ouvre jamais la bouche pour vous parler d’autre chose que de ses nécessités. »', 180, 820, 38, t0 + 1.3, { maxWidth: 720, stagger: 0.028 }),
        {
          type: 'text',
          id: 'lettre-signature',
          content: 'Louvois',
          font: F.title,
          size: 64,
          weight: 700,
          italic: true,
          color: P.ink,
          align: 'left',
          anchor: { x: 200, y: 1060 },
          clipDirection: 'left-to-right',
          keyframes: [kf(5.2, { clipProgress: 0 }), kf(6.1, { clipProgress: 1, easing: 'ease-in-out' })],
        },
        // Cachet de cire.
        {
          type: 'group',
          id: 'cachet',
          pivot: { x: 840, y: 1060 },
          keyframes: [kf(6.3, { scale: 0, rotate: -40 }), kf(7.1, { scale: 1, rotate: 0, easing: 'elastic(1,0.4)' })],
          layers: [
            { type: 'path', id: 'cachet-cire', shape: { type: 'star', cx: 840, cy: 1060, points: 11, outer: 66, inner: 56 }, fill: gradient(135, ['#e2574c', 0], ['#8f1d16', 1]), shadow: { color: 'rgba(0,0,0,0.5)', blur: 16, y: 6 } },
            { type: 'path', id: 'cachet-anneau', shape: { type: 'circle', cx: 840, cy: 1060, r: 40 }, stroke: 'rgba(255,220,200,0.35)', strokeWidth: 3, fill: 'none' },
            { type: 'text', id: 'cachet-l', content: 'L', font: F.title, size: 54, weight: 900, color: 'rgba(255,225,210,0.75)', anchor: { x: 840, y: 1062 } },
          ],
        },
      ],
    },
    stampAt('secret', 'Secret d’État', tStamp, 700, 452, P.red, { size: 58, rotate: 8 }),
  ], { type: 'slide-left', duration: X, easing: 'cubic-bezier(0.7,0,0.2,1)' });
}

function scenePrisons(): SceneInput {
  // Itinéraire stylisé : Pignerol → Exilles → Sainte-Marguerite → Bastille (Paris).
  const nodes = [
    { name: 'Pignerol', year: '1669', x: 830, y: 930, word: 'pignerol', labelDx: -30, align: 'right' as const },
    { name: 'Exilles', year: '1681', x: 760, y: 790, word: 'exilles', labelDx: -30, align: 'right' as const },
    { name: 'Sainte-Marguerite', year: '1687', x: 650, y: 1100, word: 'sainte', labelDx: -30, align: 'right' as const },
    { name: 'La Bastille', year: '1698', x: 330, y: 560, word: 'bastille', labelDx: 30, align: 'left' as const },
  ];
  const tNode = nodes.map((n) => at('prisons', n.word));
  const route = `M${nodes[0]!.x},${nodes[0]!.y} Q${nodes[0]!.x + 40},${(nodes[0]!.y + nodes[1]!.y) / 2} ${nodes[1]!.x},${nodes[1]!.y} Q${nodes[1]!.x - 40},${(nodes[1]!.y + nodes[2]!.y) / 2 - 60} ${nodes[2]!.x},${nodes[2]!.y} C${nodes[2]!.x - 300},${nodes[2]!.y - 120} ${nodes[3]!.x + 80},${nodes[3]!.y + 380} ${nodes[3]!.x},${nodes[3]!.y}`;
  const layers: LayerInput[] = [
    { type: 'text', id: 'prisons-titre', content: '4 PRISONS · 1 GEÔLIER', font: F.typewriter, size: 34, weight: 400, color: P.gold, letterSpacing: 4, anchor: { x: CX, y: 440 }, keyframes: [kf(0.1, { opacity: 0, y: -16 }), kf(0.6, { opacity: 1, y: 0, easing: 'ease-out' })] },
    // Côte méditerranéenne suggérée + rose des vents.
    drawn('cote', 'M420,1185 C500,1160 560,1200 640,1170 S780,1150 860,1185 S960,1170 1000,1180', 0.2, 1.4, { width: 2, color: alpha(P.gold, 35) }),
    drawn('rose', 'M180,1020 V1140 M120,1080 H240 M150,1050 L210,1110 M210,1050 L150,1110', 0.3, 1.2, { width: 2, color: alpha(P.gold, 45) }),
    { type: 'text', id: 'rose-n', content: 'N', font: F.title, size: 26, weight: 700, color: alpha(P.gold, 70), anchor: { x: 180, y: 1000 }, keyframes: [kf(1, { opacity: 0 }), kf(1.4, { opacity: 1, easing: 'ease-out' })] },
    // Itinéraire en pointillés qui se dessine du premier au dernier lieu.
    { type: 'path', id: 'route', d: route, fill: 'none', stroke: alpha(P.goldLight, 90), strokeWidth: 4, strokeDasharray: [0.012, 0.012], pathLength: 1 },
    drawn('route-trace', route, tNode[0]!, tNode[3]! - tNode[0]!, { width: 5, color: P.gold, easing: 'linear' }),
  ];
  nodes.forEach((n, k) => {
    const t = tNode[k]!;
    layers.push({
      type: 'group',
      id: `lieu-${k}`,
      pivot: { x: n.x, y: n.y },
      keyframes: [kf(t - 0.1, { scale: 0, opacity: 0 }), kf(t, { opacity: 1, easing: 'linear' }), kf(t + 0.6, { scale: 1, easing: 'back(2.4)' })],
      layers: [
        { type: 'path', id: `lieu-halo-${k}`, shape: { type: 'circle', cx: n.x, cy: n.y, r: 30 }, fill: alpha(P.gold, 25) },
        { type: 'path', id: `lieu-point-${k}`, shape: { type: 'circle', cx: n.x, cy: n.y, r: 13 }, fill: k === 3 ? P.red : P.gold, stroke: '#0b0c10', strokeWidth: 3 },
        { type: 'text', id: `lieu-nom-${k}`, content: n.name, font: F.typewriter, size: 32, weight: 400, color: P.text, align: n.align, anchor: { x: n.x + n.labelDx, y: n.y - 18 } },
        { type: 'text', id: `lieu-an-${k}`, content: n.year, font: F.title, size: 36, weight: 700, color: P.gold, align: n.align, anchor: { x: n.x + n.labelDx, y: n.y + 22 } },
      ],
    });
  });
  // Compteur d'années de captivité.
  layers.push({
    type: 'text',
    id: 'annees',
    content: '{value} ANS',
    font: F.title,
    size: 74,
    weight: 900,
    color: P.goldLight,
    anchor: { x: 330, y: 720 },
    keyframes: [kf(tNode[0]!, { value: 0, opacity: 0 }), kf(tNode[0]! + 0.3, { opacity: 1, easing: 'ease-out' }), kf(tNode[3]! + 0.4, { value: 34, easing: 'ease-out' })],
  });
  layers.push({
    type: 'component',
    ref: 'lower-third',
    start: at('prisons', 'saint-mars') - 0.5,
    props: { name: 'Saint-Mars', role: 'Le même geôlier, 34 ans durant', font: F.title, roleFont: F.ui, size: 48, accent: '$gold', y: 1210, duration: 3.2 },
  });
  return sceneFor('prisons', layers, { type: 'wipe-up', duration: X, easing: 'cubic-bezier(0.65,0,0.35,1)' });
}

function sceneJournal(): SceneInput {
  const tMasque = at('journal', 'masqué');
  const tVelours = at('journal', 'velours');
  return sceneFor('journal', [
    {
      type: 'group',
      id: 'journal',
      pivot: { x: CX, y: 760 },
      rotate: 1.5,
      keyframes: [kf(0, { opacity: 0, y: 60 }), kf(0.6, { opacity: 1, y: 0, easing: 'ease-out' })],
      layers: [
        paper('journal-page', 150, 450, W - 300, 620),
        drawn('journal-lignes', Array.from({ length: 9 }, (_, k) => `M200,${560 + k * 56} H880`).join(' '), 0.3, 1.2, { width: 1.5, color: 'rgba(43,33,23,0.18)' }),
        typewriter('journal-titre', 'Journal de la Bastille', 200, 510, 34, 0.4, { color: P.ink }),
        typewriter('journal-date', '18 septembre 1698', 200, 600, 30, 1.1, { color: alpha(P.ink, 70) }),
        typewriter('journal-texte', 'Arrivée de M. de Saint-Mars avec un ancien prisonnier, toujours masqué.', 200, 720, 34, 1.8, { maxWidth: 650 }),
        drawn('journal-souligne', 'M460,768 C560,760 640,776 740,766', tMasque, 0.5, { width: 4, color: P.red }),
      ],
    },
    // Le masque de velours se dessine puis se remplit de noir.
    drawn('velours-contour', velvetOutline(CX, 1180, 0.62) + ' ' + eyesD(CX, 1180, 0.62), tMasque - 0.2, 1.2, { width: 4, color: P.goldLight }),
    {
      type: 'path',
      id: 'velours-remplissage',
      d: `${velvetOutline(CX, 1180, 0.62)} ${eyesD(CX, 1180, 0.62)}`,
      fillRule: 'evenodd',
      fill: '#050506',
      keyframes: [kf(tVelours - 0.2, { opacity: 0 }), kf(tVelours + 0.6, { opacity: 1, easing: 'ease-in' })],
    },
    { type: 'component', ref: 'stamp', start: tVelours + 0.3, props: { text: 'Velours noir', x: 830, y: 1110, size: 40, rotate: -12, color: '$gold', font: F.typewriter, weight: 400 } },
  ], { type: 'glitch', duration: X });
}

function sceneLegende(): SceneInput {
  const s = 'legende';
  const tFer = at(s, 'masque');
  const tVoltaire = at(s, 'voltaire');
  const tDumas = at(s, 'dumas');
  const tMorph = at(s, 'plume');
  const tStamp = at(s, 'jumeau');
  AUDIO_CUES.push({ t: seg(s).start + tStamp + 0.5, type: 'stamp' });
  const cy = 800;
  return sceneFor(s, [
    {
      type: 'text',
      id: 'legende-titre',
      content: 'LE MASQUE DE FER *?*',
      font: F.title,
      size: 84,
      weight: 900,
      highlight: P.gold,
      anchor: { x: CX, y: 450 },
      split: { by: 'word', start: Math.max(0, tFer - 0.2), stagger: 0.12, duration: 0.5, easing: 'back(2)', from: { scale: 0.4, opacity: 0 } },
    },
    // Masque de fer (anguleux, métal, rivets) → se morphe en masque de velours.
    {
      type: 'path',
      id: 'masque-morph',
      d: ironOutline(CX, cy, 1.25),
      fill: gradient(160, ['#9aa1ab', 0], ['#4a4f58', 0.6], ['#2b2e35', 1]),
      stroke: '#cfd5de',
      strokeWidth: 5,
      pivot: { x: CX, y: cy },
      keyframes: [
        kf(tFer - 0.3, { scale: 0.3, opacity: 0 }),
        kf(tFer, { opacity: 1, easing: 'linear' }),
        kf(tFer + 0.7, { scale: 1, easing: 'spring(200,13)' }),
        kf(tMorph, { d: ironOutline(CX, cy, 1.25), fill: gradient(160, ['#9aa1ab', 0], ['#4a4f58', 0.6], ['#2b2e35', 1]), stroke: '#cfd5de' }),
        kf(tMorph + 1.2, { d: velvetOutline(CX, cy, 1.15), fill: gradient(160, ['#1a1a1f', 0], ['#060607', 0.6], ['#000000', 1]), stroke: P.gold, easing: 'spring(140,14)' }),
      ],
    },
    // Bandes et rivets du "fer" : s'effacent pendant le morphing.
    {
      type: 'group',
      id: 'rivets',
      keyframes: [kf(tFer, { opacity: 0 }), kf(tFer + 0.5, { opacity: 1, easing: 'ease-out' }), kf(tMorph, { opacity: 1 }), kf(tMorph + 0.5, { opacity: 0, easing: 'ease-in' })],
      layers: [
        { type: 'path', id: 'bandes', d: `M${CX - 165},${cy - 90} H${CX + 165} M${CX - 170},${cy + 70} H${CX + 170} M${CX},${cy - 215} V${cy + 225}`, stroke: '#cfd5de', strokeWidth: 6, fill: 'none' },
        ...[-140, -70, 70, 140].flatMap((dx, k): LayerInput[] => [
          { type: 'path', id: `rivet-a-${k}`, shape: { type: 'circle', cx: CX + dx, cy: cy - 90, r: 9 }, fill: '#e3e8ef' },
          { type: 'path', id: `rivet-b-${k}`, shape: { type: 'circle', cx: CX + dx, cy: cy + 70, r: 9 }, fill: '#e3e8ef' },
        ]),
      ],
    },
    {
      type: 'path',
      id: 'yeux',
      d: eyesD(CX, cy, 1.2),
      fill: P.night,
      stroke: alpha(P.goldLight, 70),
      strokeWidth: 3,
      keyframes: [kf(tFer, { opacity: 0 }), kf(tFer + 0.5, { opacity: 1, easing: 'ease-out' })],
    },
    // Les deux livres responsables de la légende.
    ...([
      ['VOLTAIRE', '1751', 300, tVoltaire],
      ['DUMAS', '1847', 780, tDumas],
    ] as const).map(([auteur, an, x, t], k): LayerInput => ({
      type: 'group',
      id: `livre-${k}`,
      pivot: { x, y: 1130 },
      rotate: k ? 4 : -4,
      keyframes: [kf(t - 0.2, { scale: 0, opacity: 0 }), kf(t, { opacity: 1, easing: 'linear' }), kf(t + 0.6, { scale: 1, easing: 'spring(220,13)' })],
      layers: [
        { type: 'path', id: `livre-fond-${k}`, shape: { type: 'rect', x: x - 165, y: 1070, width: 330, height: 120, radius: 10 }, fill: gradient(180, ['#5a2a1e', 0], ['#3a1912', 1]), stroke: P.gold, strokeWidth: 3, shadow: { color: 'rgba(0,0,0,0.5)', blur: 24, y: 10 } },
        { type: 'path', id: `livre-dos-${k}`, shape: { type: 'rect', x: x - 165, y: 1070, width: 26, height: 120, radius: 6 }, fill: alpha(P.gold, 70) },
        { type: 'text', id: `livre-auteur-${k}`, content: auteur, font: F.title, size: 40, weight: 700, color: P.goldLight, anchor: { x: x + 12, y: 1112 } },
        { type: 'text', id: `livre-an-${k}`, content: an, font: F.typewriter, size: 28, weight: 400, color: '$text/80', anchor: { x: x + 12, y: 1155 } },
      ],
    })),
    stampAt('stamp-legende', 'Légende', tStamp + 0.5, CX + 150, cy + 90, P.legende, { size: 92, rotate: -14 }),
  ], { type: 'fade', duration: X, easing: 'ease-in-out' });
}

function sceneEnterrement(): SceneInput {
  const tNom = at('enterrement', 'marchioly');
  AUDIO_CUES.push({ t: seg('enterrement').start + tNom + 0.4, type: 'stamp' });
  return sceneFor('enterrement', [
    {
      type: 'group',
      id: 'registre',
      pivot: { x: CX, y: 800 },
      keyframes: [kf(0, { scale: 0.92, opacity: 0 }), kf(0.6, { scale: 1, opacity: 1, easing: 'ease-out' })],
      layers: [
        paper('registre-papier', 140, 520, W - 280, 560),
        typewriter('registre-titre', 'Registre de la paroisse Saint-Paul', 200, 590, 32, 0.3),
        typewriter('registre-date', '20 novembre 1703 — inhumation', 200, 650, 30, 1.0, { color: alpha(P.ink, 70) }),
        drawn('registre-trait', 'M200,700 H880', 1.3, 0.5, { width: 2, color: alpha(P.ink, 35) }),
        {
          type: 'text',
          id: 'registre-nom',
          content: 'Marchioly',
          font: F.title,
          size: 120,
          weight: 700,
          italic: true,
          color: P.ink,
          anchor: { x: CX, y: 860 },
          clipDirection: 'left-to-right',
          keyframes: [kf(tNom - 0.3, { clipProgress: 0 }), kf(tNom + 0.7, { clipProgress: 1, easing: 'ease-in-out' })],
        },
        typewriter('registre-age', 'âgé d’environ 45 ans', 200, 1000, 30, tNom + 0.6, { color: alpha(P.ink, 70) }),
      ],
    },
    stampAt('faux-nom', 'Faux nom', tNom + 0.4, 760, 1030, P.red, { size: 70, rotate: -8 }),
  ], { type: 'slide-left', duration: X, easing: 'cubic-bezier(0.7,0,0.2,1)' });
}

function sceneIdentite(): SceneInput {
  const s = 'identite';
  const suspects = [
    { nom: 'Le frère jumeau du roi', info: 'Inventé par la littérature', verdict: 'LÉGENDE', color: P.legende, ok: false, t: at(s, 'historiens') },
    { nom: 'Nicolas Fouquet', info: 'Mort à Pignerol en 1680', verdict: 'EXCLU', color: P.legende, ok: false, t: at(s, 'simple') },
    { nom: 'Eustache Dauger, valet', info: 'Thèse la plus solide', verdict: 'PROBABLE', color: P.prouve, ok: true, t: at(s, 'dauger') },
  ];
  const layers: LayerInput[] = [
    {
      type: 'text',
      id: 'qui',
      content: 'QUI ÉTAIT-IL *?*',
      font: F.title,
      size: 92,
      weight: 900,
      highlight: P.gold,
      anchor: { x: CX, y: 450 },
      split: { by: 'word', start: 0.1, stagger: 0.12, duration: 0.5, easing: 'back(2)', from: { scale: 0.4, opacity: 0 } },
    },
  ];
  suspects.forEach((sp, k) => {
    const y = 590 + k * 200;
    const tIn = 0.9 + k * 0.35;
    layers.push({
      type: 'group',
      id: `suspect-${k}`,
      pivot: { x: CX, y: y + 80 },
      keyframes: [kf(tIn, { x: 700, opacity: 0 }), kf(tIn + 0.7, { x: 0, opacity: 1, easing: 'spring(170,16)' }), ...(sp.ok ? [kf(sp.t, { scale: 1 }), kf(sp.t + 0.3, { scale: 1.04, easing: 'ease-out' })] : [])],
      layers: [
        { type: 'path', id: `suspect-fond-${k}`, shape: { type: 'rect', x: 120, y, width: W - 240, height: 160, radius: 18 }, fill: sp.ok ? gradient(90, [alpha(P.prouve, 22), 0], ['rgba(255,255,255,0.04)', 1]) : 'rgba(255,255,255,0.05)', stroke: sp.ok ? alpha(P.prouve, 80) : 'rgba(255,255,255,0.14)', strokeWidth: 2 },
        { type: 'path', id: `suspect-photo-${k}`, shape: { type: 'circle', cx: 200, cy: y + 80, r: 48 }, fill: '#20232c', stroke: alpha(P.gold, 60), strokeWidth: 3 },
        { type: 'text', id: `suspect-q-${k}`, content: '?', font: F.title, size: 56, weight: 900, color: alpha(P.gold, 80), anchor: { x: 200, y: y + 82 } },
        { type: 'text', id: `suspect-nom-${k}`, content: sp.nom, font: F.ui, size: 40, weight: 700, align: 'left', anchor: { x: 280, y: y + 60 } },
        { type: 'text', id: `suspect-info-${k}`, content: sp.info, font: F.typewriter, size: 28, weight: 400, color: '$text/65', align: 'left', anchor: { x: 280, y: y + 108 } },
        sp.ok
          ? drawn(`suspect-check-${k}`, `M845,${y + 82} l22,22 l44,-50`, sp.t, 0.45, { width: 9, color: P.prouve })
          : drawn(`suspect-croix-${k}`, `M270,${y + 62} H880`, sp.t, 0.4, { width: 6, color: P.red }),
      ],
    });
    if (!sp.ok) layers.push({ type: 'text', id: `suspect-tag-${k}`, content: sp.verdict, font: F.typewriter, size: 26, weight: 400, color: sp.color, letterSpacing: 3, align: 'right', anchor: { x: 930, y: y + 108 }, keyframes: [kf(sp.t + 0.3, { opacity: 0 }), kf(sp.t + 0.6, { opacity: 1, easing: 'ease-out' })] });
  });
  layers.push({
    type: 'text',
    id: 'pourquoi',
    content: 'Mais que savait-il ?',
    font: F.title,
    size: 56,
    weight: 700,
    italic: true,
    color: P.goldLight,
    anchor: { x: CX, y: 1210 },
    keyframes: [kf(at(s, 'quoi') - 0.1, { opacity: 0, y: 20 }), kf(at(s, 'quoi') + 0.4, { opacity: 1, y: 0, easing: 'ease-out' })],
  });
  AUDIO_CUES.push({ t: seg(s).end - 1.5, type: 'riser' });
  return sceneFor(s, layers, { type: 'flash', duration: X, easing: 'ease-out' });
}

function sceneVerdict(): SceneInput {
  return A.verdictScene('verdict', [
    { label: 'Le prisonnier masqué', stamp: 'PROUVÉ', word: 'prouvé' },
    { label: 'Masque de fer, jumeau du roi', stamp: 'LÉGENDE', word: 'légende' },
    { label: 'Son identité', stamp: 'DÉBATTU', word: 'débattue' },
  ]);
}

/* ───────────── Storyboard final ───────────── */

export function build() {
  AUDIO_CUES.length = 0;
  const scenes = [sceneAccroche(), sceneLettre(), scenePrisons(), sceneJournal(), sceneLegende(), sceneEnterrement(), sceneIdentite(), sceneVerdict()];
  const storyboard = episode('L’Énigme Vraie — 11 · Le masque de fer', scenes, [...header('DOSSIER N°11 · LE MASQUE DE FER', A.total), ...A.captions()]);
  return { storyboard, narration: NARRATION, cues: A.sortedCues(), total: A.total };
}

/* ───────────── Fiche de publication (même format que BUSINESS TIKTOK/SCRIPTS) ───────────── */
export const fiche = () => `# 11 — L'Homme au masque de fer

- **Titre (couverture)** : Le prisonnier sans visage
- **Durée** : ${A.total} s (> 60 s : éligible Creator Rewards)
- **Verdict** : prisonnier masqué → PROUVÉ · masque de fer / jumeau du roi → LÉGENDE · identité → DÉBATTU
- **Production** : moteur de motion design (storyboard.json) + voix de synthèse (audio/ajouter_voix.py) + musique originale (audio/musique.py)

## Script (voix)

${NARRATION.map((s) => `**[${s.start.toFixed(1)}–${s.end.toFixed(1)} s]** ${s.text.replace(/\*/g, '')}`).join('\n\n')}

## Description

\`\`\`
Novembre 1703 : un prisonnier masqué meurt à la Bastille. Ce qui est prouvé, ce qui est légende. 🔎 Sources en commentaire épinglé.
#histoirevraie #mystere #masquedefer #enigme #histoire #louisxiv #apprendresurtiktok #faitsreels
\`\`\`

## Commentaire à épingler

\`\`\`
📚 Sources : J.-C. Petitfils, « Le Masque de fer. Entre histoire et légende » (Perrin) ; journal d'Étienne du Junca, lieutenant du roi à la Bastille ; lettre de Louvois à Saint-Mars (19 juillet 1669). Le « fer » vient de Voltaire, le jumeau de Dumas. Ton hypothèse ? 👇
\`\`\`

## Points vérifiés

- Lettre de Louvois à Saint-Mars, 19 juillet 1669 : ordre de menacer de mort le prisonnier Eustache Dauger s'il parle « d'autre chose que de ses nécessités ».
- Parcours avec le même geôlier, Bénigne Dauvergne de Saint-Mars : Pignerol (1669), Exilles (1681), île Sainte-Marguerite (1687), Bastille (18 septembre 1698).
- Journal de du Junca : arrivée d'« un ancien prisonnier » toujours masqué (1698) ; à sa mort, masque de **velours noir** (19 novembre 1703).
- Inhumation le 20 novembre 1703 à Saint-Paul sous le nom de « Marchioly », âge déclaré d'environ 45 ans.
- Le masque « de fer » : Voltaire (*Le Siècle de Louis XIV*, 1751) ; le frère jumeau : Alexandre Dumas (*Le Vicomte de Bragelonne*, 1847-1850).
- Fouquet est mort à Pignerol en mars 1680 : il ne peut pas être le prisonnier de 1703.
- Identité : la thèse la plus solide (Petitfils notamment) est Eustache Dauger, un valet ; elle reste débattue.

## Miniature

Image extraite à ~3,5 s (« 1703 », la Bastille au trait, le masque) : \`miniature.jpg\`.
`;
