/**
 * captions — sous-titres "mot à mot" façon TikTok, calés sur une narration.
 *
 * Le texte est découpé en courts morceaux (≤ `wordsPerChunk` mots, coupés
 * aussi aux fins de phrase). Chaque mot reçoit un instant d'apparition
 * proportionnel à sa longueur (+ une pause après la ponctuation) sur la durée
 * donnée : c'est le même minutage que celui utilisé pour caler la voix.
 *
 *   { "type": "component", "ref": "captions", "start": 5.2,
 *     "props": { "text": "Un masque… de *velours noir*.", "duration": 7.4 } }
 */
import type { LayerInput } from '../types/storyboard.ts';
import type { ComponentDefinition } from './types.ts';
import { num, str } from './util.ts';

export interface TimedWord {
  /** Mot tel qu'affiché (sans les `*`). */
  word: string;
  highlight: boolean;
  /** Instant d'apparition (s, relatif au début). */
  t: number;
}

/** Poids temporel d'un mot : longueur + pause après la ponctuation. */
function weight(w: string): number {
  let p = 0;
  if (/[.!?…]$/.test(w)) p = 5;
  else if (/[,;:]$/.test(w)) p = 2.5;
  return Math.max(2, w.length) + p;
}

/**
 * Minutage des mots d'une narration sur `duration` secondes (exporté pour la voix).
 * `times` : instants réels de chaque mot (ex. alignement renvoyé par une synthèse
 * vocale) ; utilisés tels quels s'il y en a autant que de mots.
 */
export function timeWords(text: string, duration: number, times?: number[]): TimedWord[] {
  const raw = text.split(/\s+/).filter(Boolean);
  let on = false;
  const words = raw.map((w) => {
    const starts = w.startsWith('*');
    if (starts) on = true;
    const hl = on;
    if (w.replace(/[.,;:!?…»"]+$/, '').endsWith('*')) on = false;
    return { word: w.replace(/\*/g, ''), highlight: hl };
  });
  if (times && times.length === words.length) return words.map((w, i) => ({ ...w, t: Math.max(0, Math.min(duration, times[i]!)) }));
  const total = words.reduce((a, w) => a + weight(w.word), 0) || 1;
  let acc = 0;
  return words.map((w) => {
    const t = (acc / total) * duration;
    acc += weight(w.word);
    return { ...w, t };
  });
}

export const captions: ComponentDefinition = {
  name: 'captions',
  description: 'Sous-titres mot à mot (morceaux de quelques mots, apparition calée sur la narration).',
  props: {
    text: { type: 'string', required: true, description: 'Texte de la narration. `*mot*` = mot surligné.' },
    duration: { type: 'number', required: true, min: 0.2, description: 'Durée de la narration (s).' },
    wordTimes: { type: 'string', description: 'Instants réels des mots, séparés par des virgules (alignement de la voix). Sinon : minutage estimé.' },
    wordsPerChunk: { type: 'number', default: 4, min: 1, max: 12, description: 'Nombre max de mots affichés ensemble.' },
    y: { type: 'number', description: 'Centre vertical (défaut : au-dessus de la safe-area basse).' },
    size: { type: 'number', default: 62, min: 8, description: 'Taille (px).' },
    font: { type: 'string', description: 'Police (défaut : 2e police du thème).' },
    weight: { type: 'number', default: 800, min: 100, max: 1000, description: 'Graisse.' },
    color: { type: 'color', default: '$text', description: 'Couleur du texte.' },
    highlight: { type: 'color', default: '$accent', description: 'Couleur des mots *surlignés*.' },
    outline: { type: 'color', default: 'rgba(0,0,0,0.85)', description: 'Contour (lisibilité sur fond clair).' },
    maxWidth: { type: 'number', default: 900, min: 100, description: 'Largeur max.' },
  },

  expand(p, ctx) {
    const duration = num(p.duration, 1);
    const per = Math.round(num(p.wordsPerChunk, 4));
    const size = num(p.size, 62);
    const y = num(p.y, ctx.height - ctx.safeArea.bottom - 230);
    const times = str(p.wordTimes) ? str(p.wordTimes).split(',').map(Number) : undefined;
    const words = timeWords(str(p.text), duration, times?.every(Number.isFinite) ? times : undefined);

    // Découpage en morceaux : ≤ per mots, coupure après une fin de phrase.
    const chunks: TimedWord[][] = [];
    let cur: TimedWord[] = [];
    for (const w of words) {
      cur.push(w);
      if (cur.length >= per || /[.!?…:]$/.test(w.word)) {
        chunks.push(cur);
        cur = [];
      }
    }
    if (cur.length) chunks.push(cur);

    return chunks.map((c, k): LayerInput => {
      const start = c[0]!.t;
      const end = k + 1 < chunks.length ? chunks[k + 1]![0]!.t : duration;
      const content = c.map((w) => (w.highlight ? `*${w.word}*` : w.word)).join(' ');
      const stagger = c.length > 1 ? (c[c.length - 1]!.t - start) / (c.length - 1) : 0;
      return {
        type: 'text',
        id: `${ctx.id}/chunk-${k}`,
        content,
        start: +start.toFixed(3),
        end: +end.toFixed(3),
        font: str(p.font, ctx.fonts[1] ?? ctx.fonts[0] ?? 'Inter'),
        size,
        weight: num(p.weight, 800),
        color: str(p.color, '$text'),
        highlight: str(p.highlight, '$accent'),
        stroke: str(p.outline, 'rgba(0,0,0,0.85)'),
        strokeWidth: Math.max(4, size * 0.12),
        anchor: { x: ctx.width / 2, y },
        maxWidth: num(p.maxWidth, 900),
        lineHeight: 1.1,
        shadow: { color: 'rgba(0,0,0,0.55)', blur: 18, y: 4 },
        split: { by: 'word', start: 0, stagger: +stagger.toFixed(3), duration: 0.16, easing: 'back(2)', from: { opacity: 0, scale: 0.6, y: 14 } },
      };
    });
  },
};
