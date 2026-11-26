/**
 * Charte "L'Énigme Vraie" pour le moteur de motion design.
 *
 * Format de la chaîne : histoire vraie et étrange, illustrations au trait
 * animées, fiches "dossier", sous-titres mot à mot, verdict final en tampon
 * (PROUVÉ / DÉBATTU / LÉGENDE), 62–65 s pour être éligible aux Creator Rewards.
 */
import type { KeyframeInput, LayerInput, PaintInput, SceneInput, StoryboardInput, TransitionInput } from '../../src/types/storyboard.ts';
import { alpha } from '../../src/components/util.ts';
import { timeWords } from '../../src/components/captions.ts';

export { alpha, timeWords };

export const W = 1080;
export const H = 1920;
export const CX = W / 2;
export const SAFE = { top: 220, bottom: 320, left: 0, right: 110 };
/** Ligne des sous-titres (au-dessus de l'UI basse de TikTok). */
export const CAPTION_Y = H - SAFE.bottom - 230;

export const P = {
  background: '#0b0c10',
  night: '#151821',
  gold: '#d8a84e',
  goldLight: '#f3d792',
  red: '#d63a2f',
  paper: '#efe3c8',
  paperDark: '#d9c7a1',
  ink: '#2b2117',
  text: '#ffffff',
  accent: '#f3d792',
  // Couleurs des verdicts.
  prouve: '#4fbf7f',
  debattu: '#e8a23a',
  legende: '#d63a2f',
};

export const F = { title: 'Playfair Display', ui: 'Inter', typewriter: 'Special Elite' };

const r1 = (v: number) => Math.round(v * 10) / 10;
/** Keyframe ; un temps négatif (mot prononcé très tôt dans la scène) est ramené à 0. */
export const kf = (t: number, props: Omit<KeyframeInput, 't'> = {}): KeyframeInput => ({ t: Math.max(0, Math.round(t * 1000) / 1000), ...props });
export const gradient = (angle: number, ...stops: [string, number][]): PaintInput => ({ type: 'linear', angle, stops });

/* ═══════════════════════ Narration ═══════════════════════ */

export interface Segment {
  id: string;
  start: number;
  end: number;
  /** Texte dit par la voix ; `*mot*` = mot surligné dans les sous-titres. */
  text: string;
  /** Instants réels des mots (s, relatifs au segment), issus de l'alignement de la voix. */
  times?: number[];
}

/** Instant (s, absolu) où un mot de la narration est prononcé — pour synchroniser l'image. */
export function wordTime(seg: Segment, needle: string): number {
  const words = timeWords(seg.text, seg.end - seg.start, seg.times);
  const norm = (v: string) => v.toLowerCase().replace(/[^\p{L}\d]/gu, '');
  const w = words.find((x) => norm(x.word).startsWith(norm(needle)));
  if (!w) throw new Error(`mot « ${needle} » introuvable dans le segment ${seg.id}`);
  return seg.start + w.t;
}

/* ═══════════════════════ Décor & habillage ═══════════════════════ */

export const sceneBackground: PaintInput = gradient(175, [P.night, 0], [P.background, 0.65], ['#08080b', 1]);

export function vignette(): LayerInput {
  return {
    type: 'path',
    id: 'vignette',
    shape: { type: 'rect', x: 0, y: 0, width: W, height: H },
    fill: { type: 'radial', center: { x: CX, y: H * 0.45 }, radius: H * 0.7, stops: [['rgba(0,0,0,0)', 0.5], ['rgba(0,0,0,0.75)', 1]] },
  };
}

/** Halo doré qui respire lentement derrière l'illustration. */
export function glow(id: string, x: number, y: number, r: number, dur: number, color = P.gold): LayerInput {
  return {
    type: 'path',
    id,
    shape: { type: 'circle', cx: x, cy: y, r },
    fill: { type: 'radial', stops: [[alpha(color, 26), 0], [alpha(color, 8), 0.5], [alpha(color, 0), 1]] },
    blend: 'screen',
    pivot: 'center',
    keyframes: [kf(0, { scale: 0.9, opacity: 0 }), kf(0.8, { opacity: 1, easing: 'ease-out' }), kf(dur, { scale: 1.08, easing: 'ease-in-out' })],
  };
}

/** Poussières dorées qui montent (positions déterministes). */
export function dust(id: string, dur: number, seed = 11): LayerInput {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  return {
    type: 'group',
    id,
    layers: Array.from({ length: 18 }, (_, k): LayerInput => ({
      type: 'path',
      id: `${id}-${k}`,
      shape: { type: 'circle', cx: r1(80 + rnd() * (W - 160)), cy: r1(420 + rnd() * 900), r: r1(1.5 + rnd() * 3) },
      fill: alpha(P.goldLight, 30 + Math.round(rnd() * 40)),
      keyframes: [kf(0, { y: 0, opacity: 0 }), kf(1, { opacity: 1, easing: 'ease-out' }), kf(dur, { y: -120 - rnd() * 160, easing: 'linear' })],
    })),
  };
}

/** Fiche papier (parchemin) avec ombre — conteneur des documents d'époque. */
export function paper(id: string, x: number, y: number, w: number, h: number, extra: Partial<LayerInput> = {}): LayerInput {
  return {
    type: 'path',
    id,
    shape: { type: 'rect', x, y, width: w, height: h, radius: 14 },
    fill: gradient(160, ['#f6ecd6', 0], [P.paper, 0.5], [P.paperDark, 1]),
    stroke: 'rgba(90,64,30,0.35)',
    strokeWidth: 2,
    shadow: { color: 'rgba(0,0,0,0.55)', blur: 40, y: 18 },
    ...extra,
  } as LayerInput;
}

/** Trait au crayon doré qui se dessine (illustrations au trait). */
export function drawn(id: string, d: string, t0: number, dur: number, o: { width?: number; color?: PaintInput; easing?: string } = {}): LayerInput {
  return {
    type: 'path',
    id,
    d,
    fill: 'none',
    stroke: o.color ?? P.gold,
    strokeWidth: o.width ?? 4,
    pathLength: 1,
    keyframes: [kf(t0, { strokeDashoffset: 1 }), kf(t0 + dur, { strokeDashoffset: 0, easing: o.easing ?? 'cubic-bezier(0.65,0,0.35,1)' })],
  };
}

/* ═══════════════════════ Illustrations ═══════════════════════ */

/** Silhouette de la Bastille au trait : 5 tours crénelées reliées par des courtines. */
export function bastilleD(baseY: number): string {
  const towers = [150, 330, 540, 750, 930];
  const tw = 112;
  const parts: string[] = [];
  const pts: [number, number][] = [];
  const crenels = (x0: number, x1: number, y: number, n: number, depth: number) => {
    const seg = (x1 - x0) / (2 * n - 1);
    for (let i = 0; i < 2 * n - 1; i++) {
      const xa = x0 + i * seg;
      const up = i % 2 === 0;
      pts.push([xa, up ? y - depth : y], [xa + seg, up ? y - depth : y]);
    }
  };
  towers.forEach((cx, k) => {
    const top = baseY - (k === 2 ? 400 : 340);
    const wallTop = baseY - 250;
    const x0 = cx - tw / 2, x1 = cx + tw / 2;
    if (k === 0) pts.push([x0, baseY]);
    pts.push([x0, top]);
    crenels(x0, x1, top, 4, 16);
    pts.push([x1, top], [x1, wallTop]);
    if (k < towers.length - 1) crenels(x1, towers[k + 1]! - tw / 2, wallTop, 3, 12);
    else pts.push([x1, baseY]);
    // Meurtrières.
    for (let j = 0; j < 2; j++) parts.push(`M${cx},${top + 60 + j * 90} v34`);
  });
  parts.unshift('M' + pts.map(([x, y]) => `${r1(x)},${r1(y)}`).join(' L'));
  // Porte en arc sur la tour centrale + ligne de sol.
  parts.push(`M${CX - 30},${baseY} V${baseY - 70} A30,30 0 0 1 ${CX + 30},${baseY - 70} V${baseY}`);
  parts.push(`M60,${baseY} H${W - 60}`);
  return parts.join(' ');
}

/** Sapin de taïga (contour fermé), pied en (bx, by), hauteur h, incliné de `deg` degrés (sens horaire). */
export function sapinD(bx: number, by: number, h: number, deg = 0): string {
  const pts: [number, number][] = [[-0.04, 0], [-0.04, -0.12], [-0.3, -0.12], [-0.11, -0.4], [-0.24, -0.4], [-0.08, -0.66], [-0.17, -0.66], [0, -1], [0.17, -0.66], [0.08, -0.66], [0.24, -0.4], [0.11, -0.4], [0.3, -0.12], [0.04, -0.12], [0.04, 0]];
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return 'M' + pts.map(([x, y]) => `${r1(bx + (x * c - y * s) * h)},${r1(by + (x * s + y * c) * h)}`).join(' L') + ' Z';
}

/**
 * Rangée de sapins entre x0 et x1 (positions et tailles déterministes).
 * `fall(x)` donne l'inclinaison de chaque arbre : même graine + autre `fall`
 * = même forêt couchée, d'où un morphing propre (arbres soufflés).
 */
export function foretD(baseY: number, x0: number, x1: number, n: number, seed: number, fall: (x: number) => number = () => 0, hMin = 70, hMax = 150): string {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const step = (x1 - x0) / (n - 1);
  return Array.from({ length: n }, (_, k) => {
    const x = x0 + k * step + (rnd() - 0.5) * step * 0.5;
    const h = hMin + rnd() * (hMax - hMin);
    return sapinD(x, baseY, h, fall(x));
  }).join(' ');
}

/** Contour du masque de velours (ovale) — sans les yeux. */
export function velvetOutline(cx: number, cy: number, s = 1): string {
  const p = (dx: number, dy: number) => `${r1(cx + dx * s)},${r1(cy + dy * s)}`;
  return `M${p(0, -170)} C${p(130, -170)} ${p(140, -40)} ${p(120, 60)} C${p(100, 150)} ${p(50, 178)} ${p(0, 178)} C${p(-50, 178)} ${p(-100, 150)} ${p(-120, 60)} C${p(-140, -40)} ${p(-130, -170)} ${p(0, -170)} Z`;
}

/** Contour anguleux du "masque de fer" (même nombre de points : morphing propre). */
export function ironOutline(cx: number, cy: number, s = 1): string {
  const p = (dx: number, dy: number) => `${r1(cx + dx * s)},${r1(cy + dy * s)}`;
  return `M${p(0, -175)} L${p(128, -150)} L${p(138, 30)} L${p(70, 170)} L${p(0, 182)} L${p(-70, 170)} L${p(-138, 30)} L${p(-128, -150)} Z`;
}

/** Trous des yeux (deux amandes). */
export function eyesD(cx: number, cy: number, s = 1): string {
  return [-55, 55]
    .map((dx) => {
      const ex = cx + dx * s, ey = cy - 20 * s, w = 36 * s, h = 17 * s;
      return `M${r1(ex - w)},${r1(ey)} C${r1(ex - w / 2)},${r1(ey - h)} ${r1(ex + w / 2)},${r1(ey - h)} ${r1(ex + w)},${r1(ey)} C${r1(ex + w / 2)},${r1(ey + h * 0.8)} ${r1(ex - w / 2)},${r1(ey + h * 0.8)} ${r1(ex - w)},${r1(ey)} Z`;
    })
    .join(' ');
}

/* ═══════════════════════ Habillage fixe (overlays) ═══════════════════════ */

export function header(dossier: string, total: number): LayerInput[] {
  return [
    { type: 'path', id: 'progress-track', shape: { type: 'rect', x: 60, y: 234, width: W - 120, height: 5, radius: 2.5 }, fill: 'rgba(255,255,255,0.12)' },
    {
      type: 'path',
      id: 'progress',
      shape: { type: 'rect', x: 60, y: 234, width: W - 120, height: 5, radius: 2.5 },
      fill: gradient(90, [P.gold, 0], [P.goldLight, 1]),
      clipDirection: 'left-to-right',
      keyframes: [kf(0, { clipProgress: 0 }), kf(total, { clipProgress: 1, easing: 'linear' })],
    },
    {
      type: 'group',
      id: 'brand',
      keyframes: [kf(0.2, { opacity: 0 }), kf(0.8, { opacity: 1, easing: 'ease-out' })],
      layers: [
        { type: 'image', id: 'brand-logo', src: '@logo', width: 66, anchor: { x: 104, y: 292 } },
        { type: 'text', id: 'brand-name', content: 'L’ÉNIGME VRAIE', font: F.title, size: 32, weight: 700, color: P.gold, letterSpacing: 2, align: 'left', anchor: { x: 152, y: 278 } },
        { type: 'text', id: 'brand-file', content: dossier, font: F.typewriter, size: 24, weight: 400, color: '$text/60', align: 'left', anchor: { x: 152, y: 312 } },
      ],
    },
  ];
}

/* ═══════════════════════ Briques de scène ═══════════════════════ */

/** Texte machine à écrire (documents d'époque). */
export const typewriter = (id: string, content: string, x: number, y: number, size: number, t0: number, o: Partial<{ color: string; maxWidth: number; stagger: number; align: 'left' | 'center' }> = {}): LayerInput => ({
  type: 'text',
  id,
  content,
  font: F.typewriter,
  size,
  weight: 400,
  color: o.color ?? P.ink,
  align: o.align ?? 'left',
  anchor: { x, y },
  maxWidth: o.maxWidth ?? 700,
  lineHeight: 1.35,
  split: { mode: 'typewriter', start: t0, stagger: o.stagger ?? 0.03, cursor: false },
});

/** Tampon (composant `stamp`) qui s'abat à l'instant t (local à la scène). */
export const stampAt = (id: string, text: string, t: number, x: number, y: number, color: string, o: { size?: number; rotate?: number; sub?: string } = {}): LayerInput => {
  return { type: 'component', ref: 'stamp', id, start: t, props: { text, x, y, color, size: o.size ?? 80, rotate: o.rotate ?? -9, font: F.typewriter, weight: 400, ...(o.sub ? { sub: o.sub } : {}) } };
};

/* ═══════════════════════ Atelier d'épisode ═══════════════════════ */

export type AudioCueType = 'whoosh' | 'stamp' | 'tick-start' | 'tick-stop' | 'riser' | 'hit' | 'seal';
export interface AudioCue { t: number; type: AudioCueType }
/** `voix/alignement.json` écrit par audio/voix_elevenlabs.py. */
export interface Alignement { segments: { id: string; duree: number; mots: { mot: string; t: number }[] }[] }
export interface VerdictRow { label: string; stamp: 'PROUVÉ' | 'DÉBATTU' | 'LÉGENDE'; word: string }

/** Chevauchement des transitions entre scènes (s). */
export const X = 0.3;

/**
 * Outils communs à tous les épisodes, liés à leur narration : recalage sur la
 * voix, scènes calées sur les segments, sous-titres, verdict et carte de fin.
 */
export function atelier(narration: Segment[], totalPrevu: number) {
  const planned = narration.map((s) => s.end - s.start);
  const cues: AudioCue[] = [];
  let total = totalPrevu;

  const seg = (id: string): Segment => {
    const s = narration.find((x) => x.id === id);
    if (!s) throw new Error(`segment « ${id} » introuvable`);
    return s;
  };
  /** Instant LOCAL (relatif au début de la scène) où un mot est prononcé. */
  const at = (id: string, word: string) => +(wordTime(seg(id), word) - seg(id).start).toFixed(2);

  /**
   * Recale l'épisode sur la vraie voix (alignement ElevenLabs) : chaque segment
   * dure le temps de sa voix + 0,3 s de respiration, et ses mots prennent leurs
   * instants réels (sous-titres, tampons et transitions tombent sur la voix).
   */
  function applyVoice(al: Alignement): void {
    let t = 0;
    narration.forEach((s, k) => {
      const v = al.segments.find((x) => x.id === s.id);
      const dur = v ? Math.max(2, v.duree + 0.3) : planned[k]!;
      s.start = +t.toFixed(3);
      s.end = +(t + dur).toFixed(3);
      t += dur;
      const nWords = s.text.split(/\s+/).filter(Boolean).length;
      s.times = v && v.mots.length === nWords ? v.mots.map((m) => m.t) : undefined;
    });
    // Creator Rewards : jamais moins de 61 s (on allonge la carte de fin si besoin).
    total = +Math.max(t + 1.4, 61).toFixed(3); // carte de fin après la dernière phrase
  }

  /** Scène calée sur un segment : fond, halo, poussières, calques, vignette. */
  function sceneFor(id: string, layers: LayerInput[], out?: TransitionInput, endAt?: number): SceneInput {
    const s = seg(id);
    const i = narration.indexOf(s);
    const next = narration[i + 1];
    const end = endAt ?? (next ? next.start + (out ? X : 0) : total);
    if (out && next) cues.push({ t: next.start, type: 'whoosh' });
    return {
      id,
      start: s.start,
      duration: +(end - s.start).toFixed(3),
      background: sceneBackground,
      ...(out ? { transitionOut: out } : {}),
      layers: [glow(`${id}-glow`, CX, 820, 620, end - s.start), dust(`${id}-dust`, end - s.start, i + 3), ...layers, vignette()],
    };
  }

  /** Sous-titres mot à mot de toute la narration (sur les vrais instants si la voix existe). */
  const captions = (): LayerInput[] =>
    narration.map((s) => ({
      type: 'component',
      ref: 'captions',
      id: `sous-titres-${s.id}`,
      start: s.start,
      props: { text: s.text, duration: +(s.end - s.start).toFixed(3), y: CAPTION_Y, size: 60, font: F.ui, highlight: '$gold', wordsPerChunk: 4, ...(s.times ? { wordTimes: s.times.join(',') } : {}) },
    }));

  /** Dernière scène : tableau du verdict (un tampon par mot prononcé), puis carte de fin. */
  function verdictScene(id: string, rows: VerdictRow[], cta = 'Ton hypothèse ? *En commentaire.*'): SceneInput {
    const color = { 'PROUVÉ': P.prouve, 'DÉBATTU': P.debattu, 'LÉGENDE': P.legende } as const;
    const rowsT = rows.map((r) => ({ ...r, t: at(id, r.word) }));
    rowsT.forEach((r) => cues.push({ t: seg(id).start + r.t, type: 'stamp' }));
    const tEnd = seg(id).end - seg(id).start; // fin de la narration (local)
    cues.push({ t: seg(id).end, type: 'hit' });
    const layers: LayerInput[] = [
      {
        type: 'group',
        id: 'verdict-tableau',
        keyframes: [kf(tEnd - 0.2, { opacity: 1, scale: 1 }), kf(tEnd + 0.3, { opacity: 0, scale: 0.94, easing: 'ease-in' })],
        pivot: { x: CX, y: 800 },
        layers: [
          { type: 'text', id: 'verdict-titre', content: 'LE VERDICT', font: F.title, size: 96, weight: 900, letterSpacing: 6, color: gradient(180, [P.goldLight, 0], [P.gold, 1]), anchor: { x: CX, y: 450 }, keyframes: [kf(0, { scale: 1.6, opacity: 0 }), kf(0.45, { scale: 1, opacity: 1, easing: 'back(1.8)' })] },
          drawn('verdict-regle', `M240,530 H${W - 240}`, 0.3, 0.6, { width: 3 }),
          ...rowsT.flatMap((r, k): LayerInput[] => {
            const y = 660 + k * 190;
            return [
              { type: 'text', id: `verdict-label-${k}`, content: r.label, font: F.ui, size: 40, weight: 700, align: 'left', anchor: { x: 120, y }, maxWidth: 470, keyframes: [kf(r.t - 0.8, { opacity: 0, x: -30 }), kf(r.t - 0.3, { opacity: 1, x: 0, easing: 'ease-out' })] },
              stampAt(`verdict-stamp-${k}`, r.stamp, r.t, 790, y, color[r.stamp], { size: 64, rotate: k === 1 ? 7 : -8 }),
            ];
          }),
        ],
      },
      // Carte de fin : logo + appel aux commentaires.
      {
        type: 'group',
        id: 'fin',
        pivot: { x: CX, y: 820 },
        keyframes: [kf(tEnd + 0.1, { scale: 0.6, opacity: 0 }), kf(tEnd + 0.7, { scale: 1, opacity: 1, easing: 'spring(200,13)' })],
        layers: [
          { type: 'image', id: 'fin-logo', src: '@logo', width: 240, anchor: { x: CX, y: 740 } },
          { type: 'text', id: 'fin-nom', content: 'L’ÉNIGME VRAIE', font: F.title, size: 70, weight: 900, color: P.gold, letterSpacing: 4, anchor: { x: CX, y: 940 } },
          { type: 'text', id: 'fin-cta', content: cta, font: F.ui, size: 44, weight: 700, highlight: P.goldLight, anchor: { x: CX, y: 1030 } },
        ],
      },
    ];
    return sceneFor(id, layers, undefined, total);
  }

  /** Repères audio triés (musique et bruitages). */
  const sortedCues = () => [...cues].sort((a, b) => a.t - b.t);

  return {
    cues, seg, at, applyVoice, sceneFor, captions, verdictScene, sortedCues,
    get total() { return total; },
  };
}

/* ═══════════════════════ Storyboard ═══════════════════════ */

export function episode(title: string, scenes: SceneInput[], overlays: LayerInput[]): StoryboardInput {
  return {
    meta: { title, width: W, height: H, fps: 60, background: P.background, safeArea: { ...SAFE }, grain: 0.06 },
    theme: { palette: { ...P }, fonts: [F.title, F.ui, F.typewriter] },
    assets: { logo: './assets/enigme/logo.svg' },
    scenes,
    overlays,
  };
}
