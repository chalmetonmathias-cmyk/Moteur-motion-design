/**
 * Charte "L'Énigme Vraie" pour le moteur de motion design.
 *
 * Format de la chaîne : histoire vraie et étrange, illustrations au trait
 * animées, fiches "dossier", sous-titres mot à mot, verdict final en tampon
 * (PROUVÉ / DÉBATTU / LÉGENDE), 62–65 s pour être éligible aux Creator Rewards.
 */
import type { KeyframeInput, LayerInput, PaintInput, SceneInput, StoryboardInput } from '../../src/types/storyboard.ts';
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
}

/** Instant (s, absolu) où un mot de la narration est prononcé — pour synchroniser l'image. */
export function wordTime(seg: Segment, needle: string): number {
  const words = timeWords(seg.text, seg.end - seg.start);
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
