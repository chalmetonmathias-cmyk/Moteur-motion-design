/**
 * Compilation du modèle (données) en structures d'exécution (caches).
 *
 * Un `RuntimeLayer` associe le calque normalisé à tout ce qui est coûteux à
 * recalculer : pistes de keyframes compilées, Path2D natifs, longueur des
 * tracés, mises en page de texte, images décodées. Rien ici ne dépend du temps.
 */
import type { GroupLayer, ImageLayer, Layer, PathLayer, Rect, TextLayer } from '../types/storyboard.ts';
import type { AssetStore } from './assets.ts';
import { compileTracks, type Tracks } from './keyframe.ts';
import { parsePath, shapeBounds, shapeLength } from './path.ts';
import type { TextLayout } from './text-layout.ts';

interface RuntimeBase {
  tracks: Tracks;
  /** Bounds locales (statiques), calculées paresseusement si besoin. */
  bounds?: Rect;
}

export interface RText extends RuntimeBase {
  kind: 'text';
  model: TextLayer;
  /** Cache de mise en page, indexé par contenu (les compteurs changent le texte). */
  layouts: Map<string, TextLayout>;
  hasValue: boolean;
}

export interface RPath extends RuntimeBase {
  kind: 'path';
  model: PathLayer;
  path2d: Path2D;
  /** Longueur réelle du tracé (px) — pour `pathLength`. */
  length: number;
  /** Path2D natifs des clés de morphing (forme au repos sur une clé). */
  keyPaths: Path2D[];
}

export interface RImage extends RuntimeBase {
  kind: 'image';
  model: ImageLayer;
  img?: HTMLImageElement;
  width: number;
  height: number;
}

export interface RGroup extends RuntimeBase {
  kind: 'group';
  model: GroupLayer;
  children: RuntimeLayer[];
}

export type RuntimeLayer = RText | RPath | RImage | RGroup;

const union = (a: Rect, b: Rect): Rect => {
  const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
  return { x, y, width: Math.max(a.x + a.width, b.x + b.width) - x, height: Math.max(a.y + a.height, b.y + b.height) - y };
};

export function compileLayer(layer: Layer, assets: AssetStore): RuntimeLayer {
  const tracks = compileTracks(layer.keyframes);
  switch (layer.type) {
    case 'text':
      return { kind: 'text', model: layer, tracks, layouts: new Map(), hasValue: layer.content.includes('{value}') };

    case 'path': {
      const shape = parsePath(layer.d);
      let bounds = shapeBounds(shape);
      // Pour un morphing, les bounds couvrent toutes les formes (gradients stables).
      if (tracks.d) for (const k of tracks.d.keys) bounds = union(bounds, shapeBounds(k.v));
      return {
        kind: 'path',
        model: layer,
        tracks,
        bounds,
        path2d: new Path2D(layer.d),
        length: shapeLength(shape),
        keyPaths: tracks.d ? tracks.d.sources.map((d) => new Path2D(d)) : [],
      };
    }

    case 'image': {
      const img = assets.images.get(layer.src);
      const nw = img?.naturalWidth || 300;
      const nh = img?.naturalHeight || 150;
      // Une seule dimension fournie → l'autre suit le ratio naturel.
      const width = layer.width ?? (layer.height ? (nw * layer.height) / nh : nw);
      const height = layer.height ?? (layer.width ? (nh * layer.width) / nw : nh);
      return { kind: 'image', model: layer, tracks, img, width, height, bounds: { x: -width / 2, y: -height / 2, width, height } };
    }

    case 'group':
      return { kind: 'group', model: layer, tracks, children: layer.layers.map((l) => compileLayer(l, assets)) };
  }
}
