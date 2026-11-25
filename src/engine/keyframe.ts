/**
 * Interpolation entre keyframes.
 *
 * Les keyframes d'un calque sont "éparses" : chacune ne définit que certaines
 * propriétés. À la compilation, on les transforme en PISTES indépendantes
 * (une par propriété), chacune ne contenant que les keyframes qui la
 * définissent. Ainsi `{t:0, opacity:0}` puis `{t:1, y:0}` n'interfèrent pas.
 *
 * Règles d'échantillonnage d'une piste à l'instant t :
 *   - avant la 1re clé  → valeur de la 1re clé (hold) ;
 *   - après la dernière → valeur de la dernière (hold) ;
 *   - entre a et b      → lerp(a, b, easing_b((t - a.t) / (b.t - a.t))).
 *     L'easing appliqué est celui de la clé d'ARRIVÉE (b), comme dans
 *     l'exemple du cahier des charges.
 *
 * Tout est fonction pure de t : aucune dépendance à l'horloge → déterminisme.
 */
import type { Keyframe, NumberProp, Paint, PaintProp } from '../types/storyboard.ts';
import { getEasing, type EasingFn } from './easing.ts';
import { lerpPaint } from './color.ts';
import { lerpShape, parsePath, prepareMorph, type Shape } from './path.ts';

export interface Key<T> {
  t: number;
  v: T;
  ease: EasingFn;
}

export interface Track<T> {
  keys: Key<T>[];
}

export interface PathTrack extends Track<Shape> {
  /** Sources `d` d'origine (pour construire les Path2D natifs au repos). */
  sources: string[];
  /** Paires préparées pour le morphing, calculées paresseusement par segment. */
  pairs: ([Shape, Shape] | undefined)[];
}

export interface Tracks {
  numbers: Partial<Record<NumberProp, Track<number>>>;
  paints: Partial<Record<PaintProp, Track<Paint>>>;
  d?: PathTrack;
}

export function compileTracks(keyframes: Keyframe[]): Tracks {
  const tracks: Tracks = { numbers: {}, paints: {} };
  for (const kf of keyframes) {
    const ease = getEasing(kf.easing);
    for (const [prop, v] of Object.entries(kf.numbers) as [NumberProp, number][]) {
      (tracks.numbers[prop] ??= { keys: [] }).keys.push({ t: kf.t, v, ease });
    }
    for (const [prop, v] of Object.entries(kf.paints) as [PaintProp, Paint][]) {
      (tracks.paints[prop] ??= { keys: [] }).keys.push({ t: kf.t, v, ease });
    }
    if (kf.d !== undefined) {
      const track = (tracks.d ??= { keys: [], sources: [], pairs: [] });
      track.keys.push({ t: kf.t, v: parsePath(kf.d), ease });
      track.sources.push(kf.d);
    }
  }
  return tracks;
}

/** Résultat de la localisation de t dans une piste. */
type Locate = { at: number } | { i: number; p: number };

/**
 * Trouve le segment [i, i+1] contenant t (recherche dichotomique) et la
 * progression EASÉE dans ce segment.
 */
export function locate<T>(keys: Key<T>[], t: number): Locate {
  const n = keys.length;
  if (n === 1 || t <= keys[0]!.t) return { at: 0 };
  if (t >= keys[n - 1]!.t) return { at: n - 1 };
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (keys[mid]!.t <= t) lo = mid;
    else hi = mid;
  }
  const a = keys[lo]!, b = keys[lo + 1]!;
  const span = b.t - a.t;
  if (span <= 0) return { at: lo + 1 };
  return { i: lo, p: b.ease((t - a.t) / span) };
}

export function sampleNumber(track: Track<number>, t: number): number {
  const l = locate(track.keys, t);
  if ('at' in l) return track.keys[l.at]!.v;
  const a = track.keys[l.i]!.v, b = track.keys[l.i + 1]!.v;
  return a + (b - a) * l.p;
}

export function samplePaint(track: Track<Paint>, t: number): Paint {
  const l = locate(track.keys, t);
  if ('at' in l) return track.keys[l.at]!.v;
  return lerpPaint(track.keys[l.i]!.v, track.keys[l.i + 1]!.v, l.p);
}

/**
 * Échantillonne une piste de tracés. Renvoie soit l'index d'une clé (forme au
 * repos → le renderer réutilise un Path2D en cache), soit une forme morphée.
 */
export function sampleShape(track: PathTrack, t: number): { key: number } | { shape: Shape } {
  const l = locate(track.keys, t);
  if ('at' in l) return { key: l.at };
  // Préparation du morphing (subdivision + alignement) : une fois par segment.
  const pair = (track.pairs[l.i] ??= prepareMorph(track.keys[l.i]!.v, track.keys[l.i + 1]!.v));
  return { shape: lerpShape(pair[0], pair[1], l.p) };
}
