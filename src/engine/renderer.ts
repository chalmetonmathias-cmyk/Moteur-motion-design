/**
 * Renderer Canvas 2D — dessine UNE frame à l'instant t.
 *
 * `renderFrame(t)` est une fonction pure du temps : même t ⇒ mêmes pixels.
 * Ni horloge, ni état d'animation interne, ni aléatoire non seedé. C'est ce
 * qui permet un export image par image fidèle à la preview.
 *
 * Ordre de dessin d'une frame :
 *   1. fond global (meta.background)
 *   2. scènes actives (avec transitions), cf. SceneManager.activeAt
 *   3. overlays globaux
 *   4. grain filmique (optionnel)
 *
 * Transformation d'un calque (ordre canvas) :
 *   translate(anchor + (x,y)) · rotate · scale · translate(-pivot)
 */
import type { NumberProp, Paint, Rect, Storyboard, Vec2 } from '../types/storyboard.ts';
import type { AssetStore } from './assets.ts';
import { isVisible, paintToStyle, rgbaToCss } from './color.ts';
import { getEasing } from './easing.ts';
import { samplePaint, sampleNumber, sampleShape } from './keyframe.ts';
import { shapeToPath2D } from './path.ts';
import { compileLayer, type RImage, type RPath, type RText, type RuntimeLayer } from './runtime.ts';
import { SceneManager, type ActiveScene } from './scene-manager.ts';
import { formatValue, layoutText, mulberry32, type TextLayout } from './text-layout.ts';
import { drawWithTransition, needsBuffer } from './transitions.ts';

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const DEG = Math.PI / 180;

const BLEND: Record<string, GlobalCompositeOperation> = {
  normal: 'source-over',
  add: 'lighter',
};

/** Seuil de signalement des frames lentes (budget 60 fps). */
const FRAME_BUDGET_MS = 16.7;

export class Renderer {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  /** Durée du dernier rendu (ms). */
  lastRenderMs = 0;
  /** Signale en console les frames > 16,7 ms (activé en dev). */
  perfWarnings = false;

  private storyboard?: Storyboard;
  private scenes?: SceneManager;
  private overlays: RuntimeLayer[] = [];
  private buffers: CanvasRenderingContext2D[] = [];
  private grain: CanvasPattern[] = [];
  private lastPerfWarn = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    // alpha:false → canvas opaque : composition plus rapide, et l'export
    // n'a pas de canal alpha à gérer.
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D indisponible dans ce navigateur.');
    this.ctx = ctx;
  }

  get sceneManager(): SceneManager | undefined {
    return this.scenes;
  }

  load(storyboard: Storyboard, assets: AssetStore): void {
    this.storyboard = storyboard;
    const { width, height, grain } = storyboard.meta;
    this.canvas.width = width;
    this.canvas.height = height;
    this.scenes = new SceneManager(storyboard, assets);
    this.overlays = storyboard.overlays.map((l) => compileLayer(l, assets));
    this.buffers = [];
    this.grain = grain > 0 ? makeGrain(this.ctx) : [];
  }

  /** Rend la frame à l'instant t (secondes). Renvoie la durée de rendu (ms). */
  renderFrame(t: number): number {
    const sb = this.storyboard;
    const scenes = this.scenes;
    if (!sb || !scenes) return 0;
    const t0 = performance.now();
    const { ctx } = this;
    const { width: W, height: H } = sb.meta;
    const full: Rect = { x: 0, y: 0, width: W, height: H };

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    fillPaint(ctx, sb.meta.background, full);

    let bufferIndex = 0;
    for (const active of scenes.activeAt(t)) {
      const draw = (c: CanvasRenderingContext2D) => this.drawSceneContent(c, active, full);
      if (!active.transition) {
        draw(ctx);
        continue;
      }
      let buffer: CanvasRenderingContext2D | null = null;
      if (needsBuffer(active.transition.type)) {
        buffer = this.getBuffer(bufferIndex++, W, H);
        buffer.setTransform(1, 0, 0, 1, 0, 0);
        buffer.globalAlpha = 1;
        buffer.globalCompositeOperation = 'source-over';
        buffer.clearRect(0, 0, W, H);
      }
      drawWithTransition(ctx, { ...active.transition, width: W, height: H, t }, draw, buffer);
    }

    for (const l of this.overlays) drawLayer(ctx, l, t, 1);

    if (this.grain.length > 0) {
      ctx.save();
      ctx.globalAlpha = sb.meta.grain;
      ctx.globalCompositeOperation = 'overlay';
      // 24 tirages de grain par seconde, choisis par le temps → déterministe.
      ctx.fillStyle = this.grain[Math.floor(t * 24) % this.grain.length]!;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    const dt = performance.now() - t0;
    this.lastRenderMs = dt;
    if (this.perfWarnings && dt > FRAME_BUDGET_MS && t0 - this.lastPerfWarn > 1000) {
      this.lastPerfWarn = t0;
      console.warn(`[perf] frame t=${t.toFixed(3)}s rendue en ${dt.toFixed(1)} ms (> ${FRAME_BUDGET_MS} ms)`);
    }
    return dt;
  }

  private drawSceneContent(ctx: CanvasRenderingContext2D, active: ActiveScene, full: Rect): void {
    if (active.scene.background) fillPaint(ctx, active.scene.background, full);
    for (const l of active.layers) drawLayer(ctx, l, active.localT, 1);
  }

  private getBuffer(i: number, w: number, h: number): CanvasRenderingContext2D {
    let b = this.buffers[i];
    if (!b || b.canvas.width !== w || b.canvas.height !== h) {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      b = c.getContext('2d')!;
      this.buffers[i] = b;
    }
    return b;
  }
}

/* ═══════════════════════════ Calques ═══════════════════════════ */

function fillPaint(ctx: CanvasRenderingContext2D, paint: Paint, rect: Rect): void {
  const style = paintToStyle(ctx, paint, rect);
  if (!style) return;
  ctx.fillStyle = style;
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
}

function num(rl: RuntimeLayer, prop: NumberProp, lt: number): number {
  const track = rl.tracks.numbers[prop];
  return track ? sampleNumber(track, lt) : rl.model.base[prop];
}

function paint(rl: RText | RPath, prop: 'fill' | 'stroke', lt: number): Paint {
  const track = rl.tracks.paints[prop];
  return track ? samplePaint(track, lt) : rl.model[prop];
}

/**
 * Dessine un calque.
 * @param t     temps du PARENT (s) ; le temps local du calque est t - start
 * @param alpha opacité héritée
 */
export function drawLayer(ctx: CanvasRenderingContext2D, rl: RuntimeLayer, t: number, alpha: number): void {
  const m = rl.model;
  if (t < m.start || (m.end !== undefined && t >= m.end)) return;
  const lt = t - m.start;

  const opacity = clamp01(num(rl, 'opacity', lt)) * alpha;
  if (opacity <= 0.002) return;
  const s = num(rl, 'scale', lt);
  const sx = s * num(rl, 'scaleX', lt);
  const sy = s * num(rl, 'scaleY', lt);
  if (Math.abs(sx) < 1e-4 || Math.abs(sy) < 1e-4) return;
  const clipP = clamp01(num(rl, 'clipProgress', lt));
  if (clipP <= 0) return;

  const needsBounds = m.pivot === 'center' || (clipP < 1 && !m.clipRect);
  const bounds = needsBounds ? layerBounds(ctx, rl, lt) : undefined;
  const pivot: Vec2 = m.pivot === 'center' ? (bounds ? { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 } : { x: 0, y: 0 }) : m.pivot;
  const anchor = m.anchor ?? pivot;

  ctx.save();
  ctx.translate(anchor.x + num(rl, 'x', lt), anchor.y + num(rl, 'y', lt));
  const rot = num(rl, 'rotate', lt);
  if (rot !== 0) ctx.rotate(rot * DEG);
  if (sx !== 1 || sy !== 1) ctx.scale(sx, sy);
  if (pivot.x !== 0 || pivot.y !== 0) ctx.translate(-pivot.x, -pivot.y);

  if (m.blend) ctx.globalCompositeOperation = BLEND[m.blend] ?? (m.blend as GlobalCompositeOperation);
  if (m.shadow) {
    ctx.shadowColor = rgbaToCss(m.shadow.color);
    ctx.shadowBlur = m.shadow.blur;
    ctx.shadowOffsetX = m.shadow.x;
    ctx.shadowOffsetY = m.shadow.y;
  }
  // Clip : progression < 1, ou rectangle explicite (masque permanent).
  if (clipP < 1 || m.clipRect) {
    const b = m.clipRect ?? pad(bounds ?? { x: 0, y: 0, width: 0, height: 0 }, 6);
    const r = clipRectFor(b, m.clipDirection, clipP);
    ctx.beginPath();
    ctx.rect(r.x, r.y, r.width, r.height);
    ctx.clip();
  }
  ctx.globalAlpha = opacity;

  switch (rl.kind) {
    case 'text':
      drawText(ctx, rl, lt, opacity);
      break;
    case 'path':
      drawPath(ctx, rl, lt);
      break;
    case 'image':
      drawImage(ctx, rl);
      break;
    case 'group':
      for (const child of rl.children) drawLayer(ctx, child, lt, opacity);
      break;
  }
  ctx.restore();
}

const pad = (r: Rect, p: number): Rect => ({ x: r.x - p, y: r.y - p, width: r.width + 2 * p, height: r.height + 2 * p });

function clipRectFor(b: Rect, dir: string, p: number): Rect {
  const w = b.width * p, h = b.height * p;
  switch (dir) {
    case 'right-to-left':
      return { x: b.x + b.width - w, y: b.y, width: w, height: b.height };
    case 'top-to-bottom':
      return { x: b.x, y: b.y, width: b.width, height: h };
    case 'bottom-to-top':
      return { x: b.x, y: b.y + b.height - h, width: b.width, height: h };
    case 'center-x':
      return { x: b.x + (b.width - w) / 2, y: b.y, width: w, height: b.height };
    case 'center-y':
      return { x: b.x, y: b.y + (b.height - h) / 2, width: b.width, height: h };
    case 'center':
      return { x: b.x + (b.width - w) / 2, y: b.y + (b.height - h) / 2, width: w, height: h };
    default: // left-to-right
      return { x: b.x, y: b.y, width: w, height: b.height };
  }
}

/** Bounds locales d'un calque (avant sa propre transformation). */
function layerBounds(ctx: CanvasRenderingContext2D, rl: RuntimeLayer, lt: number): Rect {
  switch (rl.kind) {
    case 'text':
      return getLayout(ctx, rl, lt).bounds;
    case 'path':
    case 'image':
      return rl.bounds!;
    case 'group': {
      if (rl.bounds) return rl.bounds;
      // Union des bounds des enfants, translatées par leur position (approximation
      // statique : rotation/échelle des enfants ignorées). Calculée une fois.
      let acc: Rect | undefined;
      for (const c of rl.children) {
        const b = layerBounds(ctx, c, 0);
        const piv = c.model.pivot === 'center' ? { x: b.x + b.width / 2, y: b.y + b.height / 2 } : c.model.pivot;
        const a = c.model.anchor ?? piv;
        const r = { x: b.x + a.x - piv.x + c.model.base.x, y: b.y + a.y - piv.y + c.model.base.y, width: b.width, height: b.height };
        acc = acc ? unionRect(acc, r) : r;
      }
      rl.bounds = acc ?? { x: 0, y: 0, width: 0, height: 0 };
      return rl.bounds;
    }
  }
}

function unionRect(a: Rect, b: Rect): Rect {
  const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
  return { x, y, width: Math.max(a.x + a.width, b.x + b.width) - x, height: Math.max(a.y + a.height, b.y + b.height) - y };
}

/* ─────────────── texte ─────────────── */

function textContent(rl: RText, lt: number): string {
  const m = rl.model;
  if (!rl.hasValue) return m.content;
  return m.content.split('{value}').join(formatValue(num(rl, 'value', lt), m.decimals, m.thousandsSeparator, m.decimalSeparator));
}

function getLayout(ctx: CanvasRenderingContext2D, rl: RText, lt: number): TextLayout {
  const content = textContent(rl, lt);
  let layout = rl.layouts.get(content);
  if (!layout) {
    if (rl.layouts.size > 96) rl.layouts.clear(); // compteurs : cache borné
    layout = layoutText(ctx, rl.model, content);
    rl.layouts.set(content, layout);
  }
  return layout;
}

function drawText(ctx: CanvasRenderingContext2D, rl: RText, lt: number, opacity: number): void {
  const m = rl.model;
  const layout = getLayout(ctx, rl, lt);
  const fill = paint(rl, 'fill', lt);
  const stroke = paint(rl, 'stroke', lt);
  const strokeWidth = num(rl, 'strokeWidth', lt);
  const fillStyle = paintToStyle(ctx, fill, layout.bounds);
  const hlStyle = isVisible(m.highlight) ? paintToStyle(ctx, m.highlight, layout.bounds) : fillStyle;
  const strokeStyle = isVisible(stroke) && strokeWidth > 0 ? paintToStyle(ctx, stroke, layout.bounds) : null;

  ctx.font = layout.font;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = strokeWidth;
    ctx.lineJoin = 'round';
  }

  const split = m.split;
  const ease = split ? getEasing(split.easing) : null;
  let cursor: { x: number; baseline: number } | null = null;
  let typing = false;

  for (const u of layout.units) {
    let uo = 1, dx = 0, dy = 0, us = 1, ur = 0;
    if (split) {
      const start = split.start + u.order * split.stagger;
      if (split.mode === 'typewriter') {
        if (lt < start) {
          typing = true;
          continue;
        }
        cursor = { x: u.right, baseline: u.baseline };
      } else {
        const raw = split.duration > 0 ? (lt - start) / split.duration : lt >= start ? 1 : 0;
        if (raw <= 0) continue;
        if (raw < 1) {
          const e = ease!(raw);
          const f = split.from;
          uo = f.opacity + (1 - f.opacity) * e;
          dx = f.x * (1 - e);
          dy = f.y * (1 - e);
          us = f.scale + (1 - f.scale) * e;
          ur = f.rotate * (1 - e);
        }
      }
    }
    const a = clamp01(uo) * opacity;
    if (a <= 0.002) continue;
    ctx.globalAlpha = a;
    const transformed = dx !== 0 || dy !== 0 || us !== 1 || ur !== 0;
    const masked = transformed && split?.mask === true;
    if (transformed) {
      ctx.save();
      if (masked) {
        // Masque = boîte de l'unité AU REPOS (avant sa transformation).
        const pad = m.size * 0.08;
        ctx.beginPath();
        ctx.rect(u.left - pad, u.cy - m.size * 0.62, u.right - u.left + 2 * pad, m.size * 1.24);
        ctx.clip();
      }
      ctx.translate(u.cx + dx, u.cy + dy);
      if (ur !== 0) ctx.rotate(ur * DEG);
      if (us !== 1) ctx.scale(us, us);
      ctx.translate(-u.cx, -u.cy);
    }
    for (const run of u.runs) {
      const style = run.highlight ? hlStyle : fillStyle;
      if (style) {
        ctx.fillStyle = style;
        ctx.fillText(run.text, run.x, u.baseline);
      }
      if (strokeStyle) ctx.strokeText(run.text, run.x, u.baseline);
    }
    if (transformed) ctx.restore();
  }

  // Curseur typewriter : plein pendant la frappe, clignotant ensuite (2 Hz).
  if (split?.mode === 'typewriter' && split.cursor && (typing || Math.floor(lt * 2) % 2 === 0)) {
    const first = layout.units[0];
    const c = cursor ?? (first?.runs[0] ? { x: first.runs[0].x - m.size * 0.14, baseline: first.baseline } : null);
    if (c && fillStyle) {
      ctx.globalAlpha = opacity;
      ctx.fillStyle = hlStyle ?? fillStyle;
      const w = Math.max(3, m.size * 0.07);
      ctx.fillRect(c.x + m.size * 0.08, c.baseline - layout.capHeight * 1.15, w, layout.capHeight * 1.3);
    }
  }
}

/* ─────────────── path ─────────────── */

function drawPath(ctx: CanvasRenderingContext2D, rl: RPath, lt: number): void {
  const m = rl.model;
  let p2d = rl.path2d;
  if (rl.tracks.d) {
    const s = sampleShape(rl.tracks.d, lt);
    p2d = 'key' in s ? rl.keyPaths[s.key]! : shapeToPath2D(s.shape);
  }
  const bounds = rl.bounds!;

  const fill = paint(rl, 'fill', lt);
  if (isVisible(fill)) {
    const style = paintToStyle(ctx, fill, bounds);
    if (style) {
      ctx.fillStyle = style;
      ctx.fill(p2d, m.fillRule);
    }
  }

  const stroke = paint(rl, 'stroke', lt);
  const width = num(rl, 'strokeWidth', lt);
  if (!isVisible(stroke) || width <= 0) return;

  if (m.dashArray) {
    // pathLength : dasharray/offset sont exprimés dans une unité virtuelle
    // (comme en SVG) ; on les convertit en pixels.
    const k = m.pathLength ? rl.length / m.pathLength : 1;
    const offset = num(rl, 'strokeDashoffset', lt);
    const total = m.dashArray.reduce((acc, v) => acc + v, 0);
    // Cas "trait qui se dessine" entièrement masqué : on ne dessine rien
    // (évite le point laissé par les extrémités arrondies).
    if (m.dashArray.length === 2 && m.dashArray[0] === m.dashArray[1] && Math.abs(offset) >= total / 2 - 1e-6 && Math.abs(offset) <= total / 2 + 1e-6) return;
    ctx.setLineDash(m.dashArray.map((v) => v * k));
    ctx.lineDashOffset = offset * k;
  }
  const style = paintToStyle(ctx, stroke, bounds);
  if (!style) return;
  ctx.strokeStyle = style;
  ctx.lineWidth = width;
  ctx.lineCap = m.lineCap;
  ctx.lineJoin = m.lineJoin;
  ctx.stroke(p2d);
}

/* ─────────────── image ─────────────── */

function drawImage(ctx: CanvasRenderingContext2D, rl: RImage): void {
  if (!rl.img) return;
  ctx.drawImage(rl.img, -rl.width / 2, -rl.height / 2, rl.width, rl.height);
}

/* ─────────────── grain ─────────────── */

/** 4 tuiles de bruit 256×256 générées avec une graine fixe (déterministe). */
function makeGrain(ctx: CanvasRenderingContext2D): CanvasPattern[] {
  const out: CanvasPattern[] = [];
  const rnd = mulberry32(1337);
  for (let k = 0; k < 4; k++) {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d')!;
    const img = g.createImageData(256, 256);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 128 + (rnd() - 0.5) * 200;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    const pattern = ctx.createPattern(c, 'repeat');
    if (pattern) out.push(pattern);
  }
  return out;
}

