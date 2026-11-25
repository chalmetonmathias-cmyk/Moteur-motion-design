/**
 * Gestion des scènes : quelles scènes sont actives à l'instant t, dans quel
 * ordre les dessiner, où en sont leurs transitions — et chargement /
 * déchargement des structures runtime.
 *
 * Chargement paresseux : une scène est compilée quand elle devient active
 * (ou va l'être dans la seconde), et libérée quand on s'en éloigne. Tout est
 * fonction de t uniquement : seeker en arrière recompile simplement la scène,
 * le rendu reste identique (déterminisme).
 */
import type { Scene, Storyboard, TransitionType } from '../types/storyboard.ts';
import type { AssetStore } from './assets.ts';
import { getEasing } from './easing.ts';
import { compileLayer, type RuntimeLayer } from './runtime.ts';

export interface ActiveScene {
  scene: Scene;
  layers: RuntimeLayer[];
  /** Temps local de la scène (s). */
  localT: number;
  transition?: {
    type: TransitionType;
    phase: 'in' | 'out';
    /** Progression easée de la transition, 0 → 1. */
    p: number;
  };
}

const PREFETCH = 1.0; // s : compile les scènes qui démarrent bientôt
const KEEP_BEHIND = 2.0; // s : garde un peu les scènes passées (scrub arrière)

export class SceneManager {
  private readonly storyboard: Storyboard;
  private readonly assets: AssetStore;
  private readonly compiled = new Map<number, RuntimeLayer[]>();

  constructor(storyboard: Storyboard, assets: AssetStore) {
    this.storyboard = storyboard;
    this.assets = assets;
  }

  get loadedScenes(): number {
    return this.compiled.size;
  }

  /** Scènes actives à t, triées dans l'ordre de dessin (la dernière est au-dessus). */
  activeAt(t: number): ActiveScene[] {
    const out: ActiveScene[] = [];
    for (const scene of this.storyboard.scenes) {
      const near = t >= scene.start - PREFETCH && t < scene.end + KEEP_BEHIND;
      if (!near) {
        this.compiled.delete(scene.index); // déchargement
        continue;
      }
      const layers = this.ensure(scene); // préchargement
      if (t < scene.start || t >= scene.end) continue;

      const localT = t - scene.start;
      const active: ActiveScene = { scene, layers, localT };
      const tin = scene.transitionIn;
      const tout = scene.transitionOut;
      if (tout && localT >= scene.duration - tout.duration) {
        const raw = (localT - (scene.duration - tout.duration)) / tout.duration;
        active.transition = { type: tout.type, phase: 'out', p: getEasing(tout.easing)(Math.min(1, raw)) };
      } else if (tin && localT < tin.duration) {
        active.transition = { type: tin.type, phase: 'in', p: getEasing(tin.easing)(localT / tin.duration) };
      }
      out.push(active);
    }
    // Une scène en transition de SORTIE passe au-dessus : c'est elle qui
    // "s'efface" pour révéler la suivante (fondu, iris, wipe, glitch…).
    return out.sort((a, b) => Number(a.transition?.phase === 'out') - Number(b.transition?.phase === 'out') || a.scene.index - b.scene.index);
  }

  /** Index de la scène "principale" à t (pour l'UI). */
  sceneIndexAt(t: number): number {
    let idx = -1;
    for (const s of this.storyboard.scenes) if (t >= s.start && t < s.end) idx = s.index;
    return idx;
  }

  private ensure(scene: Scene): RuntimeLayer[] {
    let layers = this.compiled.get(scene.index);
    if (!layers) {
      layers = scene.layers.map((l) => compileLayer(l, this.assets));
      this.compiled.set(scene.index, layers);
    }
    return layers;
  }
}
