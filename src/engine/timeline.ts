/**
 * Horloge déterministe.
 *
 * Principe : le temps courant n'est JAMAIS obtenu en accumulant des deltas de
 * requestAnimationFrame (ce qui dérive et dépend de la machine). Pendant la
 * lecture, on mémorise un couple d'ancrage (heure murale, temps timeline) et
 * le temps courant vaut :
 *
 *     timeMs = anchorMs + (now - anchorWall)
 *
 * Le temps est ensuite QUANTIFIÉ à la frame : frame = ⌊timeMs·fps/1000⌋ et
 * t = frame / fps. La preview affiche donc exactement les mêmes images que
 * l'export (qui, lui, parcourt directement frame = 0…N-1).
 */

export type TimelineListener = (timeline: Timeline) => void;

export class Timeline {
  readonly fps: number;
  readonly durationMs: number;
  loop = true;

  private timeMs = 0;
  private playing = false;
  private anchorWall = 0;
  private anchorMs = 0;
  private readonly listeners = new Set<TimelineListener>();

  constructor(durationSeconds: number, fps: number) {
    this.fps = fps;
    this.durationMs = durationSeconds * 1000;
  }

  /** Nombre total de frames (la dernière a l'index totalFrames - 1). */
  get totalFrames(): number {
    return Math.max(1, Math.round((this.durationMs / 1000) * this.fps));
  }

  /** Index de la frame courante. */
  get frame(): number {
    return this.frameAt(this.timeMs);
  }

  /** Temps courant en secondes, aligné sur la frame (c'est ce temps qu'on rend). */
  get time(): number {
    return Timeline.timeOfFrame(this.frame, this.fps);
  }

  /** Temps brut en millisecondes (non quantifié). */
  get rawMs(): number {
    return this.timeMs;
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  static timeOfFrame(frame: number, fps: number): number {
    return frame / fps;
  }

  frameAt(ms: number): number {
    // Le +1e-6 absorbe les erreurs d'arrondi flottant (ex. 1000/60·60).
    return Math.min(this.totalFrames - 1, Math.max(0, Math.floor((ms * this.fps) / 1000 + 1e-6)));
  }

  play(now: number = performance.now()): void {
    if (this.playing) return;
    if (this.frame >= this.totalFrames - 1) this.timeMs = 0;
    this.playing = true;
    this.anchorWall = now;
    this.anchorMs = this.timeMs;
    this.emit();
  }

  pause(): void {
    if (!this.playing) return;
    this.playing = false;
    this.emit();
  }

  toggle(now: number = performance.now()): void {
    if (this.playing) this.pause();
    else this.play(now);
  }

  seekMs(ms: number, now: number = performance.now()): void {
    this.timeMs = Math.min(Math.max(0, ms), this.durationMs);
    this.anchorWall = now;
    this.anchorMs = this.timeMs;
    this.emit();
  }

  seekFrame(frame: number, now?: number): void {
    const f = Math.min(Math.max(0, Math.round(frame)), this.totalFrames - 1);
    // On vise le milieu de la frame pour éviter tout arrondi vers la précédente.
    this.seekMs(((f + 0.5) * 1000) / this.fps, now);
  }

  /**
   * À appeler à chaque rAF avec l'heure murale. Met à jour le temps à partir
   * de l'ancrage (jamais de delta cumulé) et gère boucle / fin.
   * Renvoie true si la frame affichée a changé.
   */
  update(now: number): boolean {
    if (!this.playing) return false;
    const before = this.frame;
    let ms = this.anchorMs + (now - this.anchorWall);
    if (ms >= this.durationMs) {
      if (this.loop) {
        ms %= this.durationMs;
        this.anchorWall = now;
        this.anchorMs = ms;
      } else {
        ms = this.durationMs;
        this.timeMs = ms;
        this.pause();
        return true;
      }
    }
    this.timeMs = ms;
    return this.frame !== before;
  }

  onChange(fn: TimelineListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    for (const fn of this.listeners) fn(this);
  }
}

/** Formate un temps en "MM:SS.cc". */
export function formatTime(seconds: number): string {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const rest = s - m * 60;
  return `${String(m).padStart(2, '0')}:${rest.toFixed(2).padStart(5, '0')}`;
}
