/**
 * UI du player : transport (play/pause, scrub, temps), panneau d'infos,
 * diagnostics, safe-areas, export.
 *
 * La boucle d'affichage (rAF) ne fait que demander le temps à la Timeline
 * (ancrée sur l'horloge murale) et rendre la frame correspondante : aucune
 * logique d'animation ici.
 */
import type { Issue, Storyboard } from '../types/storyboard.ts';
import type { Renderer } from '../engine/renderer.ts';
import { Timeline, formatTime } from '../engine/timeline.ts';
import { exportUnsupportedReason, exportVideo } from './exporter.ts';

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Élément #${id} introuvable`);
  return el as T;
};

export interface Diagnostic extends Issue {
  /** Origine : parser (avec chemin JSON) ou chargement d'assets. */
  source?: 'parser' | 'assets';
}

const sceneColor = (i: number) => `hsl(${(i * 47 + 220) % 360} 85% 65%)`;

export class PlayerControls {
  private readonly renderer: Renderer;
  private timeline?: Timeline;
  private storyboard?: Storyboard;
  private dirty = true;
  private lastFrameShown = -1;
  private lastSceneShown = -2;
  private exporting = false;
  private abort?: AbortController;
  private scrubbing = false;
  private wasPlayingBeforeScrub = false;
  private safeAreas = false;
  private toastTimer = 0;

  private readonly els = {
    stage: $<HTMLDivElement>('stage'),
    overlay: $<HTMLCanvasElement>('overlay'),
    play: $<HTMLButtonElement>('play-btn'),
    timeCurrent: $<HTMLSpanElement>('time-current'),
    timeTotal: $<HTMLSpanElement>('time-total'),
    frame: $<HTMLSpanElement>('frame-counter'),
    scrub: $<HTMLDivElement>('scrub'),
    scrubFill: $<HTMLDivElement>('scrub-fill'),
    scrubHandle: $<HTMLDivElement>('scrub-handle'),
    scrubScenes: $<HTMLDivElement>('scrub-scenes'),
    scrubTooltip: $<HTMLDivElement>('scrub-tooltip'),
    loop: $<HTMLButtonElement>('loop-btn'),
    safe: $<HTMLButtonElement>('safe-btn'),
    sbTitle: $<HTMLDivElement>('sb-title'),
    sbStats: $<HTMLDListElement>('sb-stats'),
    sceneList: $<HTMLOListElement>('scene-list'),
    diagnostics: $<HTMLUListElement>('diagnostics'),
    diagBadge: $<HTMLSpanElement>('diag-badge'),
    exportBtn: $<HTMLButtonElement>('export-btn'),
    exportFps: $<HTMLSelectElement>('export-fps'),
    exportQuality: $<HTMLSelectElement>('export-quality'),
    exportPace: $<HTMLSelectElement>('export-pace'),
    exportProgress: $<HTMLDivElement>('export-progress'),
    exportBar: $<HTMLDivElement>('export-bar'),
    exportStatus: $<HTMLSpanElement>('export-status'),
    exportCancel: $<HTMLButtonElement>('export-cancel'),
    loader: $<HTMLDivElement>('loader'),
    loaderText: $<HTMLParagraphElement>('loader-text'),
    toast: $<HTMLDivElement>('toast'),
  };

  constructor(renderer: Renderer) {
    this.renderer = renderer;
    this.bindTransport();
    this.bindKeyboard();
    this.bindExport();
    requestAnimationFrame(this.tick);
  }

  get currentTimeline(): Timeline | undefined {
    return this.timeline;
  }

  get isExporting(): boolean {
    return this.exporting;
  }

  /* ═══════════════════════ Chargement ═══════════════════════ */

  setLoading(on: boolean, text = 'Chargement…'): void {
    this.els.loader.hidden = !on;
    this.els.loaderText.textContent = text;
  }

  /** Installe un storyboard validé et prêt (assets chargés). */
  setStoryboard(sb: Storyboard, diagnostics: Diagnostic[], autoplay = true): void {
    const wasLoop = this.timeline?.loop ?? true;
    this.timeline?.pause();
    this.storyboard = sb;
    this.timeline = new Timeline(sb.meta.duration, sb.meta.fps);
    this.timeline.loop = wasLoop;
    this.timeline.onChange(() => this.syncPlayButton());
    this.lastFrameShown = -1;
    this.lastSceneShown = -2;

    const { width, height } = sb.meta;
    document.documentElement.style.setProperty('--ar', String(width / height));
    this.els.overlay.width = width;
    this.els.overlay.height = height;
    this.els.timeTotal.textContent = formatTime(sb.meta.duration);
    this.els.scrub.setAttribute('aria-valuemax', String(sb.meta.duration));

    this.renderInfo(sb);
    this.renderSceneMarkers(sb);
    this.showDiagnostics(diagnostics);
    this.drawSafeAreas();
    this.dirty = true;
    if (autoplay) this.timeline.play();
    this.syncPlayButton();
  }

  showDiagnostics(items: Diagnostic[], failedSource?: string): void {
    const ul = this.els.diagnostics;
    ul.replaceChildren();
    const errors = items.filter((i) => i.severity === 'error').length;
    const warnings = items.length - errors;
    const badge = this.els.diagBadge;
    badge.textContent = errors ? `${errors} erreur${errors > 1 ? 's' : ''}` : warnings ? `${warnings} avert.` : 'OK';
    badge.className = `badge ${errors ? 'err' : warnings ? 'warn' : 'ok'}`;

    if (failedSource) {
      const li = document.createElement('li');
      li.className = 'error';
      li.innerHTML = `<strong></strong>`;
      li.firstElementChild!.textContent = `« ${failedSource} » n'a pas pu être chargé — le storyboard précédent reste affiché.`;
      ul.append(li);
    }
    if (items.length === 0) {
      const li = document.createElement('li');
      li.className = 'ok';
      li.textContent = '✓ Storyboard valide, aucun problème détecté.';
      ul.append(li);
      return;
    }
    for (const it of items.slice(0, 200)) {
      const li = document.createElement('li');
      li.className = it.severity;
      const path = document.createElement('span');
      path.className = 'diag-path';
      path.textContent = it.source === 'assets' ? 'assets' : it.path;
      const msg = document.createElement('span');
      msg.textContent = it.message;
      li.append(path, msg);
      ul.append(li);
    }
  }

  toast(message: string, kind: 'info' | 'error' | 'success' = 'info', ms = 4200): void {
    const t = this.els.toast;
    t.textContent = message;
    t.className = `toast ${kind}`;
    t.hidden = false;
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => (t.hidden = true), ms);
  }

  /* ═══════════════════════ Boucle d'affichage ═══════════════════════ */

  private tick = (now: number): void => {
    requestAnimationFrame(this.tick);
    const tl = this.timeline;
    if (!tl || this.exporting) return;
    const changed = tl.update(now);
    if (changed || this.dirty || tl.frame !== this.lastFrameShown) {
      this.dirty = false;
      this.lastFrameShown = tl.frame;
      this.renderer.renderFrame(tl.time);
      this.updateTransportUI();
    }
  };

  private updateTransportUI(): void {
    const tl = this.timeline;
    const sb = this.storyboard;
    if (!tl || !sb) return;
    const t = tl.time;
    const ratio = sb.meta.duration > 0 ? Math.min(1, t / sb.meta.duration) : 0;
    this.els.timeCurrent.textContent = formatTime(t);
    this.els.frame.textContent = `#${String(tl.frame).padStart(4, '0')}`;
    this.els.scrubFill.style.width = `${ratio * 100}%`;
    this.els.scrubHandle.style.left = `${ratio * 100}%`;
    this.els.scrub.setAttribute('aria-valuenow', t.toFixed(2));

    const idx = this.renderer.sceneManager?.sceneIndexAt(t) ?? -1;
    if (idx !== this.lastSceneShown) {
      this.lastSceneShown = idx;
      this.els.sceneList.querySelectorAll('button').forEach((b, i) => b.classList.toggle('active', i === idx));
    }
    const renderEl = document.getElementById('stat-render');
    if (renderEl && tl.frame % 10 === 0) renderEl.textContent = `${this.renderer.lastRenderMs.toFixed(1)} ms`;
  }

  private syncPlayButton(): void {
    const playing = this.timeline?.isPlaying ?? false;
    this.els.play.classList.toggle('playing', playing);
    this.els.play.setAttribute('aria-pressed', String(playing));
  }

  /* ═══════════════════════ Panneau ═══════════════════════ */

  private renderInfo(sb: Storyboard): void {
    this.els.sbTitle.textContent = sb.meta.title;
    this.els.sbTitle.title = sb.meta.title;
    const countLayers = (ls: { type: string; layers?: unknown[] }[]): number =>
      ls.reduce((n, l) => n + 1 + (l.type === 'group' ? countLayers(l.layers as { type: string }[]) : 0), 0);
    const layers = sb.scenes.reduce((n, s) => n + countLayers(s.layers), countLayers(sb.overlays));
    const stats: [string, string, string?][] = [
      ['Durée', `${sb.meta.duration.toFixed(2)} s`],
      ['Cadence', `${sb.meta.fps} fps`],
      ['Format', `${sb.meta.width}×${sb.meta.height}`],
      ['Frames', String(Math.round(sb.meta.duration * sb.meta.fps))],
      ['Scènes', String(sb.scenes.length)],
      ['Calques', String(layers)],
      ['Rendu / frame', '—', 'stat-render'],
      ['Safe-area', `${sb.meta.safeArea.top} / ${sb.meta.safeArea.bottom} px`],
    ];
    this.els.sbStats.replaceChildren(
      ...stats.map(([k, v, id]) => {
        const div = document.createElement('div');
        const dt = document.createElement('dt');
        dt.textContent = k;
        const dd = document.createElement('dd');
        dd.textContent = v;
        if (id) dd.id = id;
        div.append(dt, dd);
        return div;
      }),
    );

    this.els.sceneList.replaceChildren(
      ...sb.scenes.map((s, i) => {
        const li = document.createElement('li');
        const b = document.createElement('button');
        b.type = 'button';
        b.title = `Aller à « ${s.id} » (${s.start.toFixed(2)} s)`;
        const dot = document.createElement('span');
        dot.className = 'scene-dot';
        dot.style.background = sceneColor(i);
        const name = document.createElement('span');
        name.className = 'scene-name';
        name.textContent = s.id;
        const time = document.createElement('span');
        time.className = 'scene-time';
        time.textContent = `${formatTime(s.start)} · ${s.duration.toFixed(1)}s`;
        b.append(dot, name, time);
        b.addEventListener('click', () => this.seek(s.start + 1e-4));
        li.append(b);
        return li;
      }),
    );
  }

  private renderSceneMarkers(sb: Storyboard): void {
    const d = sb.meta.duration;
    this.els.scrubScenes.replaceChildren(
      ...sb.scenes.map((s, i) => {
        const span = document.createElement('span');
        span.style.left = `${(s.start / d) * 100}%`;
        span.style.width = `${(Math.min(s.duration, d - s.start) / d) * 100}%`;
        span.style.background = sceneColor(i);
        span.title = s.id;
        return span;
      }),
    );
  }

  /* ═══════════════════════ Transport ═══════════════════════ */

  private seek(seconds: number): void {
    this.timeline?.seekMs(seconds * 1000);
    this.dirty = true;
  }

  private bindTransport(): void {
    this.els.play.addEventListener('click', () => this.togglePlay());
    this.els.loop.addEventListener('click', () => this.toggleLoop());
    this.els.safe.addEventListener('click', () => this.toggleSafeAreas());

    const scrub = this.els.scrub;
    const timeFromEvent = (e: PointerEvent) => {
      const r = scrub.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      return ratio * (this.storyboard?.meta.duration ?? 0);
    };
    const showTooltip = (e: PointerEvent) => {
      if (!this.storyboard) return;
      const r = scrub.getBoundingClientRect();
      const t = timeFromEvent(e);
      const idx = this.renderer.sceneManager?.sceneIndexAt(t) ?? -1;
      const tip = this.els.scrubTooltip;
      tip.hidden = false;
      tip.style.left = `${Math.min(r.width, Math.max(0, e.clientX - r.left))}px`;
      tip.textContent = `${formatTime(t)}${idx >= 0 ? ' · ' + this.storyboard.scenes[idx]!.id : ''}`;
    };
    scrub.addEventListener('pointerdown', (e) => {
      if (!this.timeline || this.exporting) return;
      this.scrubbing = true;
      this.wasPlayingBeforeScrub = this.timeline.isPlaying;
      this.timeline.pause();
      scrub.setPointerCapture(e.pointerId);
      this.seek(timeFromEvent(e));
      showTooltip(e);
    });
    scrub.addEventListener('pointermove', (e) => {
      showTooltip(e);
      if (this.scrubbing) this.seek(timeFromEvent(e));
    });
    const end = () => {
      if (!this.scrubbing) return;
      this.scrubbing = false;
      if (this.wasPlayingBeforeScrub) this.timeline?.play();
    };
    scrub.addEventListener('pointerup', end);
    scrub.addEventListener('pointercancel', end);
    scrub.addEventListener('pointerleave', () => {
      if (!this.scrubbing) this.els.scrubTooltip.hidden = true;
    });
    scrub.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        this.step(e.key === 'ArrowLeft' ? -1 : 1, e.shiftKey);
      }
    });
  }

  private bindKeyboard(): void {
    window.addEventListener('keydown', (e) => {
      if (this.exporting || e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          this.togglePlay();
          break;
        case 'ArrowLeft':
        case 'ArrowRight':
          e.preventDefault();
          this.step(e.key === 'ArrowLeft' ? -1 : 1, e.shiftKey);
          break;
        case 'Home':
          this.seek(0);
          break;
        case 'End':
          this.timeline?.seekFrame(this.timeline.totalFrames - 1);
          this.dirty = true;
          break;
        case 'l':
        case 'L':
          this.toggleLoop();
          break;
        case 's':
        case 'S':
          this.toggleSafeAreas();
          break;
      }
    });
  }

  /** Pas à pas : ±1 frame (ou ±1 s avec Maj). */
  private step(dir: -1 | 1, big: boolean): void {
    const tl = this.timeline;
    if (!tl) return;
    tl.pause();
    tl.seekFrame(tl.frame + dir * (big ? tl.fps : 1));
    this.dirty = true;
  }

  private togglePlay(): void {
    if (!this.timeline || this.exporting) return;
    this.timeline.toggle();
  }

  private toggleLoop(): void {
    if (!this.timeline) return;
    this.timeline.loop = !this.timeline.loop;
    this.els.loop.setAttribute('aria-pressed', String(this.timeline.loop));
  }

  private toggleSafeAreas(): void {
    this.safeAreas = !this.safeAreas;
    this.els.safe.setAttribute('aria-pressed', String(this.safeAreas));
    this.drawSafeAreas();
  }

  /* ═══════════════════════ Safe-areas (calque DOM séparé, jamais exporté) ═══════════════════════ */

  private drawSafeAreas(): void {
    const c = this.els.overlay;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, c.width, c.height);
    const sb = this.storyboard;
    if (!this.safeAreas || !sb) return;
    const { width: W, height: H, safeArea: sa } = sb.meta;

    // Hachures sur les zones masquées par l'UI TikTok.
    const hatch = document.createElement('canvas');
    hatch.width = hatch.height = 24;
    const h = hatch.getContext('2d')!;
    h.strokeStyle = 'rgba(255, 84, 112, 0.55)';
    h.lineWidth = 3;
    h.beginPath();
    h.moveTo(0, 24);
    h.lineTo(24, 0);
    h.stroke();
    const pattern = ctx.createPattern(hatch, 'repeat')!;
    const zones: [number, number, number, number][] = [
      [0, 0, W, sa.top],
      [0, H - sa.bottom, W, sa.bottom],
    ];
    if (sa.left > 0) zones.push([0, sa.top, sa.left, H - sa.top - sa.bottom]);
    if (sa.right > 0) zones.push([W - sa.right, sa.top, sa.right, H - sa.top - sa.bottom]);
    for (const [x, y, w, hh] of zones) {
      ctx.fillStyle = 'rgba(255, 84, 112, 0.14)';
      ctx.fillRect(x, y, w, hh);
      ctx.fillStyle = pattern;
      ctx.fillRect(x, y, w, hh);
    }

    // Cadre de la zone sûre.
    ctx.setLineDash([18, 12]);
    ctx.strokeStyle = 'rgba(61, 220, 151, 0.95)';
    ctx.lineWidth = 4;
    ctx.strokeRect(sa.left + 2, sa.top + 2, W - sa.left - sa.right - 4, H - sa.top - sa.bottom - 4);
    ctx.setLineDash([]);

    // Maquette schématique de l'UI TikTok (rail d'actions + légende).
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    const railX = W - 78;
    [0.5, 0.6, 0.68, 0.76, 0.84].forEach((r, i) => {
      ctx.beginPath();
      ctx.arc(railX, H * r, i === 0 ? 46 : 34, 0, Math.PI * 2);
      ctx.globalAlpha = 0.35;
      ctx.fill();
    });
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.roundRect(48, H - sa.bottom + 40, 420, 34, 17);
    ctx.roundRect(48, H - sa.bottom + 96, 640, 26, 13);
    ctx.roundRect(48, H - sa.bottom + 140, 520, 26, 13);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.font = '600 30px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'middle';
    ctx.fillText(`UI TikTok — haut · ${sa.top}px`, 40, sa.top / 2);
    ctx.fillText(`UI TikTok — bas · ${sa.bottom}px`, 40, H - sa.bottom / 2 + 90);
  }

  /* ═══════════════════════ Export ═══════════════════════ */

  private bindExport(): void {
    this.els.exportBtn.addEventListener('click', () => void this.runExport());
    this.els.exportCancel.addEventListener('click', () => this.abort?.abort());
  }

  async runExport(): Promise<void> {
    const sb = this.storyboard;
    const tl = this.timeline;
    if (!sb || !tl || this.exporting) return;
    const reason = exportUnsupportedReason(this.renderer.canvas);
    if (reason) {
      this.toast(`Export impossible : ${reason}`, 'error', 7000);
      return;
    }
    const fpsChoice = this.els.exportFps.value;
    const fps = fpsChoice === 'native' ? sb.meta.fps : Math.min(Number(fpsChoice), sb.meta.fps);
    const bitrate = Number(this.els.exportQuality.value);
    const paceChoice = this.els.exportPace.value;
    const pace: number | 'auto' = paceChoice === 'auto' ? 'auto' : Number(paceChoice) || 1;

    tl.pause();
    this.exporting = true;
    this.abort = new AbortController();
    this.setExportUI(true);
    const resumeAt = tl.rawMs;

    try {
      const result = await exportVideo(this.renderer.canvas, {
        fps,
        duration: sb.meta.duration,
        bitrate,
        pace,
        signal: this.abort.signal,
        render: (t) => this.renderer.renderFrame(t),
        onProgress: (p) => {
          if (p.phase === 'calibration') {
            this.els.exportBar.style.width = '0%';
            this.els.exportStatus.textContent = `Calibrage de l'encodeur (×${p.pace})…`;
            return;
          }
          this.els.exportBar.style.width = `${(p.frame / p.total) * 100}%`;
          const retry = p.attempt > 1 ? ` · essai ${p.attempt}` : '';
          this.els.exportStatus.textContent = `×${p.pace} · ${p.frame}/${p.total} · reste ${Math.ceil(p.etaMs / 1000)} s${retry}`;
        },
      });
      const name = `${slug(sb.meta.title)}_${sb.meta.width}x${sb.meta.height}_${fps}fps.${result.extension}`;
      download(result.blob, name);
      const mb = (result.blob.size / 1e6).toFixed(1);
      let msg = `Export terminé : ${name} (${mb} Mo, ${result.frames} frames, rythme ×${result.pace}, ${(result.elapsedMs / 1000).toFixed(0)} s)`;
      if (result.droppedFrames > Math.max(1, result.frames * 0.005))
        msg += ` — ${result.droppedFrames} image(s) perdue(s) par l'encodeur : ${pace === 'auto' ? 'essayez 30 fps' : 'utilisez le mode Auto'}.`;
      if (result.wasHidden) msg += " — l'onglet a été masqué pendant l'export, la vidéo peut saccader.";
      this.toast(msg, 'success', 9000);
      console.info('[export]', { ...result, blob: undefined, size: result.blob.size });
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') this.toast('Export annulé.');
      else this.toast(`Échec de l'export : ${e instanceof Error ? e.message : String(e)}`, 'error', 8000);
    } finally {
      this.exporting = false;
      this.setExportUI(false);
      tl.seekMs(resumeAt);
      this.dirty = true;
    }
  }

  private setExportUI(on: boolean): void {
    this.els.exportBtn.disabled = on;
    this.els.exportFps.disabled = on;
    this.els.exportQuality.disabled = on;
    this.els.exportPace.disabled = on;
    this.els.play.disabled = on;
    this.els.exportProgress.hidden = !on;
    this.els.exportBar.style.width = '0%';
    this.els.exportStatus.textContent = 'Préparation…';
    document.body.classList.toggle('is-exporting', on);
  }
}

function slug(s: string): string {
  return (
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'video'
  );
}

function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
