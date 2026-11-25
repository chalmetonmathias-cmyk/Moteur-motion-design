/**
 * Transitions de scène.
 *
 * Convention : q ∈ [0,1] = "quantité de disparition" de la scène
 * (0 = pleinement visible, 1 = disparue). En sortie q = p, en entrée q = 1-p.
 * Les directions sont cohérentes entre sortie et entrée : un "slide-up" en
 * sortie suivi d'un "slide-up" en entrée donne un push vertical continu.
 *
 * Certaines transitions (fade, zoom, glitch) nécessitent de composer la scène
 * dans un buffer hors-écran pour que l'opacité s'applique à l'image finale et
 * non calque par calque.
 */
import type { TransitionType } from '../types/storyboard.ts';
import { mulberry32 } from './text-layout.ts';

export interface TransitionArgs {
  type: TransitionType;
  phase: 'in' | 'out';
  /** Progression easée 0 → 1. */
  p: number;
  width: number;
  height: number;
  /** Temps global (s) — graine déterministe du glitch. */
  t: number;
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

const SLIDE_DIR: Record<string, [number, number]> = {
  'slide-up': [0, -1],
  'slide-down': [0, 1],
  'slide-left': [-1, 0],
  'slide-right': [1, 0],
};

export function needsBuffer(type: TransitionType): boolean {
  return type === 'fade' || type === 'zoom' || type === 'glitch';
}

/**
 * Dessine une scène avec sa transition.
 * @param draw   dessine le contenu de la scène dans le contexte fourni
 * @param buffer contexte hors-écran (déjà vidé) si `needsBuffer(type)`
 */
export function drawWithTransition(
  ctx: CanvasRenderingContext2D,
  a: TransitionArgs,
  draw: (c: CanvasRenderingContext2D) => void,
  buffer: CanvasRenderingContext2D | null,
): void {
  const { width: W, height: H } = a;
  // Les slides acceptent l'overshoot (easings back/spring) ; le reste est borné.
  const qRaw = a.phase === 'out' ? a.p : 1 - a.p;
  const q = clamp01(qRaw);

  ctx.save();
  switch (a.type) {
    case 'none':
      draw(ctx);
      break;

    case 'fade':
      if (q < 1 && buffer) {
        draw(buffer);
        ctx.globalAlpha = 1 - q;
        ctx.drawImage(buffer.canvas, 0, 0);
      }
      break;

    case 'slide-up':
    case 'slide-down':
    case 'slide-left':
    case 'slide-right': {
      const [dx, dy] = SLIDE_DIR[a.type]!;
      const sign = a.phase === 'out' ? 1 : -1;
      ctx.translate(dx * W * qRaw * sign, dy * H * qRaw * sign);
      draw(ctx);
      break;
    }

    case 'zoom': {
      if (q >= 1 || !buffer) break;
      // "Zoom through" : la scène sortante grossit et s'efface, l'entrante arrive de plus petit.
      const s = a.phase === 'out' ? 1 + 0.35 * q : 1 - 0.15 * q;
      draw(buffer);
      ctx.translate(W / 2, H / 2);
      ctx.scale(s, s);
      ctx.translate(-W / 2, -H / 2);
      ctx.globalAlpha = 1 - q;
      ctx.drawImage(buffer.canvas, 0, 0);
      break;
    }

    case 'wipe-up':
    case 'wipe-down':
    case 'wipe-left':
    case 'wipe-right': {
      // La ligne de wipe se déplace dans la direction indiquée ; la nouvelle
      // scène est "derrière" la ligne.
      const vertical = a.type === 'wipe-up' || a.type === 'wipe-down';
      const forward = a.type === 'wipe-down' || a.type === 'wipe-right';
      const size = vertical ? H : W;
      const keepStart = a.phase === 'out' ? !forward : forward; // on garde le début [0, …] ?
      const visible = size * (1 - q);
      const from = keepStart ? 0 : size - visible;
      ctx.beginPath();
      if (vertical) ctx.rect(0, from, W, visible);
      else ctx.rect(from, 0, visible, H);
      ctx.clip();
      draw(ctx);
      break;
    }

    case 'circle': {
      const r = (Math.hypot(W, H) / 2) * (1 - q);
      if (r <= 0.5) break;
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, r, 0, Math.PI * 2);
      ctx.clip();
      draw(ctx);
      break;
    }

    case 'flash': {
      // Sortie : la scène blanchit (1re moitié) puis le blanc s'estompe en
      // révélant la scène suivante dessous (2e moitié). Entrée : flash décroissant.
      let white: number;
      if (a.phase === 'out') {
        if (q < 0.5) draw(ctx);
        white = q < 0.5 ? q * 2 : (1 - q) * 2;
      } else {
        draw(ctx);
        white = q;
      }
      ctx.globalAlpha = clamp01(white);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, H);
      break;
    }

    case 'glitch': {
      if (q >= 1 || !buffer) break;
      draw(buffer);
      // Bandes horizontales décalées aléatoirement — graine = temps quantifié
      // (30 changements/s) : déterministe et nerveux.
      const rnd = mulberry32(Math.floor(a.t * 30) * 7919 + 17);
      const amp = W * 0.14 * q;
      ctx.globalAlpha = 1 - q * q;
      let y = 0;
      while (y < H) {
        const h = Math.min(H - y, 18 + rnd() * 140);
        const off = rnd() < 0.35 + q * 0.5 ? (rnd() - 0.5) * 2 * amp : 0;
        ctx.drawImage(buffer.canvas, 0, y, W, h, off, y, W, h);
        y += h;
      }
      // Liseré chromatique sur quelques bandes.
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.35 * q;
      for (let k = 0; k < 4; k++) {
        const by = rnd() * H;
        const bh = 6 + rnd() * 30;
        ctx.fillStyle = k % 2 ? '#ff2d6f' : '#2de2ff';
        ctx.fillRect(0, by, W, bh);
      }
      break;
    }
  }
  ctx.restore();
}
