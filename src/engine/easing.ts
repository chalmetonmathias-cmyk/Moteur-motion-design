/**
 * Bibliothèque d'easings.
 *
 * Un easing est une fonction p ∈ [0,1] → valeur (0 en 0, 1 en 1). Les easings
 * "physiques" (spring, elastic, back) dépassent volontairement 1 : c'est
 * l'overshoot qui donne le côté punchy.
 *
 * Syntaxes acceptées (chaîne) :
 *   linear | ease | ease-in | ease-out | ease-in-out
 *   ease-{in,out,in-out}-{quad,cubic,quart,quint,expo,circ}
 *   cubic-bezier(x1,y1,x2,y2)
 *   spring | spring(stiffness, damping[, mass])
 *   elastic | elastic(amplitude, period) | elastic-in | elastic-in-out
 *   back | back(overshoot) | back-in | back-in-out
 *   steps(n) | hold
 */

export type EasingFn = (p: number) => number;

export type EasingParse = { ok: true; fn: EasingFn; canonical: string } | { ok: false; error: string };

/* ───────────────────────── Cubic Bézier (type CSS) ───────────────────────── */

/**
 * Résolution de la courbe cubic-bezier CSS : on cherche t tel que x(t) = p
 * (Newton-Raphson, repli sur dichotomie), puis on renvoie y(t).
 */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): EasingFn {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const sampleDX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  const solveT = (x: number): number => {
    let t = x;
    for (let k = 0; k < 8; k++) {
      const err = sampleX(t) - x;
      if (Math.abs(err) < 1e-7) return t;
      const d = sampleDX(t);
      if (Math.abs(d) < 1e-7) break;
      t -= err / d;
    }
    let lo = 0, hi = 1;
    t = x;
    while (lo < hi) {
      const v = sampleX(t);
      if (Math.abs(v - x) < 1e-7) return t;
      if (x > v) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
      if (hi - lo < 1e-9) break;
    }
    return t;
  };

  return (p) => (p <= 0 ? 0 : p >= 1 ? 1 : sampleY(solveT(p)));
}

/* ───────────────────────── Spring (oscillateur amorti) ───────────────────────── */

/**
 * Ressort masse-amortisseur résolu analytiquement (x(0)=0, v(0)=0, cible 1).
 * On calcule le temps d'établissement T (écart < 0,1 %) puis on "étire" la
 * solution sur la durée du segment : p ∈ [0,1] ↦ x(p·T). Plus `stiffness`
 * est grand, plus c'est nerveux ; plus `damping` est petit, plus ça rebondit.
 */
export function spring(stiffness = 170, damping = 12, mass = 1): EasingFn {
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  let x: (t: number) => number;

  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    x = (t) => 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t));
  } else if (zeta === 1) {
    x = (t) => 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  } else {
    const s = Math.sqrt(zeta * zeta - 1);
    const r1 = -w0 * (zeta - s);
    const r2 = -w0 * (zeta + s);
    x = (t) => 1 - (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r2 - r1);
  }

  // Temps d'établissement : dernier instant où |x-1| > 0,001 (balayage 1/600 s, max 10 s).
  let settle = 0;
  for (let t = 0; t <= 10; t += 1 / 600) if (Math.abs(x(t) - 1) > 1e-3) settle = t;
  const T = Math.max(settle, 1 / 60);

  return (p) => (p <= 0 ? 0 : p >= 1 ? 1 : x(p * T));
}

/* ───────────────────────── Elastic / Back ───────────────────────── */

export function elasticOut(amplitude = 1, period = 0.35): EasingFn {
  const a = Math.max(1, amplitude);
  const s = (period / (2 * Math.PI)) * Math.asin(1 / a);
  return (p) => (p <= 0 ? 0 : p >= 1 ? 1 : a * Math.pow(2, -10 * p) * Math.sin(((p - s) * (2 * Math.PI)) / period) + 1);
}

export function backOut(s = 1.70158): EasingFn {
  return (p) => (p <= 0 ? 0 : p >= 1 ? 1 : 1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2));
}

/* ───────────────────────── Helpers in/out ───────────────────────── */

const fromIn = (fin: EasingFn) => ({
  in: fin,
  out: ((p: number) => 1 - fin(1 - p)) as EasingFn,
  inOut: ((p: number) => (p < 0.5 ? fin(2 * p) / 2 : 1 - fin(2 - 2 * p) / 2)) as EasingFn,
});

const POWER: Record<string, EasingFn> = {
  quad: (p) => p * p,
  cubic: (p) => p * p * p,
  quart: (p) => p ** 4,
  quint: (p) => p ** 5,
  expo: (p) => (p <= 0 ? 0 : Math.pow(2, 10 * p - 10)),
  circ: (p) => 1 - Math.sqrt(1 - Math.min(1, p * p)),
};

const NAMED: Record<string, EasingFn> = {
  linear: (p) => p,
  ease: cubicBezier(0.25, 0.1, 0.25, 1),
  'ease-in': cubicBezier(0.42, 0, 1, 1),
  'ease-out': cubicBezier(0, 0, 0.58, 1),
  'ease-in-out': cubicBezier(0.42, 0, 0.58, 1),
  spring: spring(),
  elastic: elasticOut(),
  back: backOut(),
  hold: (p) => (p >= 1 ? 1 : 0),
};

for (const [name, fin] of Object.entries(POWER)) {
  const v = fromIn(fin);
  NAMED[`ease-in-${name}`] = v.in;
  NAMED[`ease-out-${name}`] = v.out;
  NAMED[`ease-in-out-${name}`] = v.inOut;
}
{
  const back = fromIn((p) => 1 - backOut()(1 - p));
  NAMED['back-in'] = back.in;
  NAMED['back-in-out'] = back.inOut;
  const el = fromIn((p) => 1 - elasticOut()(1 - p));
  NAMED['elastic-in'] = el.in;
  NAMED['elastic-in-out'] = el.inOut;
}

/** Liste des noms simples (utilisée pour la doc et les suggestions d'erreurs). */
export const EASING_NAMES: readonly string[] = Object.keys(NAMED);

/** Noms des familles paramétrables. */
export const EASING_FUNCTIONS = ['cubic-bezier', 'spring', 'elastic', 'back', 'steps'] as const;

/* ───────────────────────── Parsing + cache ───────────────────────── */

const cache = new Map<string, EasingParse>();

export function parseEasing(spec: string): EasingParse {
  const key = spec.replace(/\s+/g, '').toLowerCase();
  const hit = cache.get(key);
  if (hit) return hit;
  const res = parseUncached(key);
  cache.set(key, res);
  return res;
}

function parseUncached(s: string): EasingParse {
  if (s in NAMED) return { ok: true, fn: NAMED[s]!, canonical: s };

  const m = /^([a-z-]+)\((.*)\)$/.exec(s);
  if (!m) return { ok: false, error: `easing inconnu « ${s} »` };
  const name = m[1]!;
  const args = m[2] === '' ? [] : m[2]!.split(',').map(Number);
  if (args.some((a) => !Number.isFinite(a))) return { ok: false, error: `arguments numériques invalides dans « ${s} »` };
  const canonical = `${name}(${args.join(',')})`;

  switch (name) {
    case 'cubic-bezier': {
      if (args.length !== 4) return { ok: false, error: 'cubic-bezier attend 4 nombres : cubic-bezier(x1,y1,x2,y2)' };
      const [x1, y1, x2, y2] = args as [number, number, number, number];
      if (x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1) return { ok: false, error: 'cubic-bezier : x1 et x2 doivent être compris entre 0 et 1' };
      return { ok: true, fn: cubicBezier(x1, y1, x2, y2), canonical };
    }
    case 'spring': {
      if (args.length < 1 || args.length > 3) return { ok: false, error: 'spring attend spring(stiffness, damping[, mass])' };
      const [k, c = 12, mass = 1] = args as [number, number?, number?];
      if (k <= 0 || c < 0 || mass <= 0) return { ok: false, error: 'spring : stiffness > 0, damping ≥ 0, mass > 0' };
      return { ok: true, fn: spring(k, c, mass), canonical };
    }
    case 'elastic': {
      if (args.length > 2) return { ok: false, error: 'elastic attend elastic(amplitude, period)' };
      const [a = 1, per = 0.35] = args;
      if (per <= 0) return { ok: false, error: 'elastic : period doit être > 0' };
      return { ok: true, fn: elasticOut(a, per), canonical };
    }
    case 'back': {
      if (args.length !== 1) return { ok: false, error: 'back attend back(overshoot)' };
      return { ok: true, fn: backOut(args[0]), canonical };
    }
    case 'steps': {
      const n = args[0];
      if (args.length !== 1 || n === undefined || n < 1 || !Number.isInteger(n)) return { ok: false, error: 'steps attend un entier ≥ 1 : steps(4)' };
      return { ok: true, fn: (p) => (p >= 1 ? 1 : Math.floor(p * n) / n), canonical };
    }
    default:
      return { ok: false, error: `fonction d'easing inconnue « ${name}() »` };
  }
}

/** Version tolérante pour le moteur (le parser a déjà validé) : repli sur `linear`. */
export function getEasing(spec: string): EasingFn {
  const r = parseEasing(spec);
  return r.ok ? r.fn : NAMED['linear']!;
}
