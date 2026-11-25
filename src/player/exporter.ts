/**
 * Export vidéo : MediaRecorder + canvas.captureStream().
 *
 * ── Pourquoi c'est déterministe ──────────────────────────────────────────
 * On n'enregistre PAS la preview qui tourne. On crée un flux en capture
 * MANUELLE (`captureStream(0)`) et on pilote nous-mêmes chaque image :
 *
 *     pour i = 0 … N-1 :
 *       attendre son créneau d'émission      (horloge murale, rythme régulier)
 *       renderFrame(i / fps)                 (temps virtuel EXACT de la frame i)
 *       track.requestFrame()                 (pousse cette image dans le flux)
 *       céder une frame d'affichage          (le navigateur capture le canvas)
 *
 * Le contenu de chaque image ne dépend que de i, jamais de la vitesse de la
 * machine.
 *
 * ── Horodatages exacts (retiming) ───────────────────────────────────────
 * MediaRecorder horodate à l'heure de RÉCEPTION. Après l'enregistrement, on
 * réécrit chaque bloc du WebM : on sait à quel instant mural chaque frame i a
 * été émise, on retrouve donc l'index de chaque bloc et on lui donne son temps
 * idéal i/fps. Conséquence : on peut émettre PLUS LENTEMENT que le temps réel
 * (`pace` = 2, 4…) sans changer la vidéo produite.
 *
 * ── Pourquoi un mode "Auto" ─────────────────────────────────────────────
 * Quand le pipeline capture → encodeur du navigateur sature, Chrome ne
 * ralentit pas : il JETTE la plupart des images. Le débit soutenable dépend
 * de la machine ET du contenu (dégradés plein écran, grain…). Le mode Auto :
 *   1. calibre : encode quelques rafales de frames réparties dans la vidéo à
 *      ×1, ×2, ×4, ×8 et retient le premier rythme sans perte ;
 *   2. exporte à ce rythme ;
 *   3. vérifie : si des images ont malgré tout été jetées (comptées grâce au
 *      retiming), recommence automatiquement deux fois plus lentement.
 */

export interface ExportOptions {
  fps: number;
  /** Durée de la vidéo (s). */
  duration: number;
  /** Débit cible (bits/s, par seconde de VIDÉO). */
  bitrate: number;
  /**
   * Ralentissement de l'émission : 1 = temps réel, 2 = deux fois plus lent…
   * 'auto' = calibrage + vérification (recommandé). Sans effet sur la vidéo
   * produite, seulement sur la durée de l'export.
   */
  pace?: number | 'auto';
  /** Dessine la frame au temps t (s) dans le canvas capturé. */
  render: (t: number) => void;
  onProgress?: (p: ExportProgress) => void;
  signal?: AbortSignal;
}

export interface ExportProgress {
  phase: 'calibration' | 'export';
  /** Rythme en cours (×1, ×2…). */
  pace: number;
  frame: number;
  total: number;
  elapsedMs: number;
  etaMs: number;
  /** Numéro de tentative (1 = premier export). */
  attempt: number;
}

export interface ExportResult {
  blob: Blob;
  mimeType: string;
  extension: 'webm' | 'mp4';
  frames: number;
  /** Images jetées par l'encodeur (mesurées après coup ; -1 si inconnu). */
  droppedFrames: number;
  /** Horodatages réécrits avec succès (timing exact). */
  retimed: boolean;
  /** Rythme finalement utilisé. */
  pace: number;
  attempts: number;
  elapsedMs: number;
  /** L'onglet a été masqué pendant l'export (risque de saccades). */
  wasHidden: boolean;
}

const MIME_CANDIDATES: [string, 'webm' | 'mp4'][] = [
  ['video/webm;codecs=vp9', 'webm'],
  ['video/webm;codecs=vp8', 'webm'],
  ['video/webm', 'webm'],
  // Safari ne sait encoder que du MP4 : repli plutôt qu'un échec.
  ['video/mp4;codecs=avc1', 'mp4'],
  ['video/mp4', 'mp4'],
];

const PACES = [1, 2, 4, 8];
/** Tolérance de pertes (fraction des frames) pour valider un rythme. */
const MAX_DROP_RATIO = 0.01;

export function pickMimeType(): { mime: string; extension: 'webm' | 'mp4' } | null {
  if (typeof MediaRecorder === 'undefined') return null;
  for (const [mime, extension] of MIME_CANDIDATES) if (MediaRecorder.isTypeSupported(mime)) return { mime, extension };
  return null;
}

/** Raison pour laquelle l'export est impossible, ou null si tout va bien. */
export function exportUnsupportedReason(canvas: HTMLCanvasElement): string | null {
  if (typeof MediaRecorder === 'undefined') return "MediaRecorder n'est pas disponible dans ce navigateur.";
  if (typeof canvas.captureStream !== 'function') return "canvas.captureStream() n'est pas disponible dans ce navigateur.";
  if (!pickMimeType()) return "Aucun format vidéo (WebM/MP4) n'est encodable par ce navigateur.";
  return null;
}

/* ─────────────── Attente précise ─────────────── */

/** Cède la main sans le bridage à 4 ms des setTimeout imbriqués. */
function yieldTask(): Promise<void> {
  return new Promise((resolve) => {
    const ch = new MessageChannel();
    ch.port1.onmessage = () => resolve();
    ch.port2.postMessage(0);
  });
}

/** Attend jusqu'à l'instant `target` (performance.now) : setTimeout grossier puis ajustement fin. */
async function sleepUntil(target: number): Promise<void> {
  for (;;) {
    const remaining = target - performance.now();
    if (remaining <= 0.2) return;
    if (remaining > 6) await new Promise((r) => setTimeout(r, remaining - 4));
    else await yieldTask();
  }
}

/** Laisse passer une frame d'affichage (la capture du canvas a lieu à la peinture). */
function afterPaint(): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        void yieldTask().then(resolve);
      }
    };
    requestAnimationFrame(finish);
    setTimeout(finish, 50); // onglet masqué : rAF suspendu
  });
}

/* ─────────────── Enregistrement d'une séquence de frames ─────────────── */

interface RecordResult {
  bytes: Uint8Array;
  dropped: number;
  retimed: boolean;
  elapsedMs: number;
  wasHidden: boolean;
}

/**
 * Enregistre la liste de temps `times` (une image par entrée) au rythme
 * `pace`, puis réécrit les horodatages (frame k → k/fps).
 */
async function record(
  canvas: HTMLCanvasElement,
  times: number[],
  o: { fps: number; bitrate: number; pace: number; mime: string; extension: 'webm' | 'mp4'; render: (t: number) => void; signal?: AbortSignal; onFrame?: (k: number, elapsedMs: number) => void },
): Promise<RecordResult> {
  const stream = canvas.captureStream(0); // 0 = capture manuelle via requestFrame()
  const track = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack | undefined;
  if (!track || typeof track.requestFrame !== 'function') throw new Error('Capture manuelle (requestFrame) non supportée.');

  // Le débit de MediaRecorder s'entend par seconde MURALE : en mode ralenti,
  // on le divise d'autant pour garder la même qualité par seconde de vidéo.
  const recorder = new MediaRecorder(stream, { mimeType: o.mime, videoBitsPerSecond: Math.round(o.bitrate / o.pace) });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  const stopped = new Promise<void>((resolve, reject) => {
    recorder.onstop = () => resolve();
    recorder.onerror = (e) => reject(new Error(`Erreur MediaRecorder : ${(e as ErrorEvent).message ?? 'inconnue'}`));
  });

  let wasHidden = document.hidden;
  const onVisibility = () => {
    if (document.hidden) wasHidden = true;
  };
  document.addEventListener('visibilitychange', onVisibility);

  const slotMs = (1000 / o.fps) * o.pace;
  const emitted = new Float64Array(times.length);
  try {
    // Pré-roll : première image prête avant le démarrage de l'enregistreur.
    o.render(times[0] ?? 0);
    const recorderStart = performance.now();
    recorder.start(1000);
    await new Promise((r) => setTimeout(r, 120)); // initialisation de l'encodeur

    const t0 = performance.now();
    let next = t0;
    for (let k = 0; k < times.length; k++) {
      if (o.signal?.aborted) throw new DOMException('Export annulé', 'AbortError');
      await sleepUntil(next);
      o.render(times[k]!); // temps virtuel exact
      track.requestFrame();
      emitted[k] = performance.now();
      // Rythme RELATIF : jamais de rafale de rattrapage après un retard
      // (c'est précisément ce qui sature l'encodeur).
      next = Math.max(next + slotMs, emitted[k]! + slotMs * 0.5);
      await afterPaint();
      o.onFrame?.(k, performance.now() - t0);
    }
    await sleepUntil(Math.max(next, performance.now() + slotMs)); // la dernière image "dure" une frame
    const elapsedMs = performance.now() - t0;
    recorder.stop();
    await stopped;

    const bytes = new Uint8Array(await new Blob(chunks).arrayBuffer());
    if (o.extension !== 'webm') return { bytes, dropped: -1, retimed: false, elapsedMs, wasHidden };
    const r = retimeWebm(bytes, emitted, o.fps, recorderStart);
    return { bytes, dropped: r ? r.dropped : -1, retimed: r !== null, elapsedMs, wasHidden };
  } catch (e) {
    if (recorder.state !== 'inactive') recorder.stop();
    throw e;
  } finally {
    document.removeEventListener('visibilitychange', onVisibility);
    for (const t of stream.getTracks()) t.stop();
  }
}

/**
 * Calibrage : 4 rafales de 15 frames consécutives réparties dans la vidéo
 * (contenu représentatif, y compris les passages lourds), encodées à des
 * rythmes croissants. Renvoie le premier rythme sans perte.
 */
async function calibrate(
  canvas: HTMLCanvasElement,
  o: { fps: number; duration: number; bitrate: number; mime: string; render: (t: number) => void; signal?: AbortSignal; onProgress?: (p: ExportProgress) => void },
): Promise<number> {
  const total = Math.round(o.duration * o.fps);
  const times: number[] = [];
  for (let b = 0; b < 4; b++) {
    const first = Math.floor(((b + 0.5) / 4) * total);
    for (let k = 0; k < 15; k++) times.push(Math.min(total - 1, first + k) / o.fps);
  }
  const t0 = performance.now();
  for (const pace of PACES) {
    o.onProgress?.({ phase: 'calibration', pace, frame: 0, total: times.length, elapsedMs: performance.now() - t0, etaMs: 0, attempt: 0 });
    const r = await record(canvas, times, { fps: o.fps, bitrate: o.bitrate, pace, mime: o.mime, extension: 'webm', render: o.render, signal: o.signal });
    if (r.dropped >= 0 && r.dropped <= Math.max(1, times.length * MAX_DROP_RATIO)) return pace;
  }
  return PACES[PACES.length - 1]!;
}

/* ─────────────── Export complet ─────────────── */

export async function exportVideo(canvas: HTMLCanvasElement, opts: ExportOptions): Promise<ExportResult> {
  const reason = exportUnsupportedReason(canvas);
  if (reason) throw new Error(reason);
  const { mime, extension } = pickMimeType()!;
  const total = Math.max(1, Math.round(opts.duration * opts.fps));
  const times = Array.from({ length: total }, (_, i) => i / opts.fps);
  const auto = opts.pace === 'auto' || opts.pace === undefined;
  const started = performance.now();

  // Le retiming n'existe que pour le WebM : sans lui, pas de calibrage possible.
  let pace = typeof opts.pace === 'number' ? Math.max(1, opts.pace) : 1;
  if (auto && extension === 'webm') pace = await calibrate(canvas, { ...opts, mime });

  let attempt = 0;
  for (;;) {
    attempt++;
    const slotMs = (1000 / opts.fps) * pace;
    const r = await record(canvas, times, {
      fps: opts.fps,
      bitrate: opts.bitrate,
      pace,
      mime,
      extension,
      render: opts.render,
      signal: opts.signal,
      onFrame: (k, elapsedMs) => {
        if (opts.onProgress && (k % 3 === 0 || k === total - 1))
          opts.onProgress({ phase: 'export', pace, frame: k + 1, total, elapsedMs, etaMs: Math.max((total - k - 1) * slotMs, (elapsedMs / (k + 1)) * (total - k - 1)), attempt });
      },
    });
    const tooManyDrops = r.dropped > Math.max(1, total * MAX_DROP_RATIO);
    // Garantie du mode Auto : pertes détectées → on recommence plus lentement.
    if (auto && tooManyDrops && pace < PACES[PACES.length - 1]!) {
      pace *= 2;
      continue;
    }
    if (!r.retimed && extension === 'webm' && pace !== 1) throw new Error("impossible de réécrire les horodatages du WebM : réessayez en mode temps réel.");

    let blob: Blob;
    if (extension === 'webm') {
      const cut = Math.min(r.bytes.length, 1 << 16);
      const head = patchWebmHead(r.bytes.subarray(0, cut), opts.duration * 1000);
      blob = new Blob(head ? [head as BlobPart, r.bytes.subarray(cut) as BlobPart] : [r.bytes as BlobPart], { type: 'video/webm' });
    } else blob = new Blob([r.bytes as BlobPart], { type: 'video/mp4' });

    return { blob, mimeType: mime, extension, frames: total, droppedFrames: r.dropped, retimed: r.retimed, pace, attempts: attempt, elapsedMs: performance.now() - started, wasHidden: r.wasHidden };
  }
}

/* ═══════════════════════════ Correctif durée WebM ═══════════════════════════
 * Chrome écrit les WebM de MediaRecorder en flux (taille de Segment
 * "inconnue", pas de Duration) → beaucoup de lecteurs ne peuvent pas seeker
 * et affichent une durée infinie. On injecte l'élément EBML Duration dans
 * Segment > Info. Seul le début du fichier est réécrit.
 * ════════════════════════════════════════════════════════════════════════ */

const ID = {
  EBML: 0x1a45dfa3,
  Segment: 0x18538067,
  Info: 0x1549a966,
  TimecodeScale: 0x2ad7b1,
  Duration: 0x4489,
  Cluster: 0x1f43b675,
};

interface Vint {
  value: number;
  length: number;
  unknown: boolean;
}

function readVint(buf: Uint8Array, pos: number, keepMarker = false): Vint | null {
  const first = buf[pos];
  if (first === undefined || first === 0) return null;
  let length = 1;
  let mask = 0x80;
  while (!(first & mask)) {
    mask >>= 1;
    length++;
  }
  if (pos + length > buf.length) return null;
  let value = keepMarker ? first : first & (mask - 1);
  let allOnes = (first & (mask - 1)) === mask - 1;
  for (let i = 1; i < length; i++) {
    const b = buf[pos + i]!;
    value = value * 256 + b;
    if (b !== 0xff) allOnes = false;
  }
  return { value, length, unknown: allOnes };
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/** Réécrit l'en-tête ; renvoie null si la structure n'est pas celle attendue. */
export function patchWebmHead(head: Uint8Array, durationMs: number): Uint8Array | null {
  const ebml = readVint(head, 0, true);
  if (!ebml || ebml.value !== ID.EBML) return null;
  const ebmlSize = readVint(head, ebml.length);
  if (!ebmlSize) return null;
  let pos = ebml.length + ebmlSize.length + ebmlSize.value;

  const seg = readVint(head, pos, true);
  if (!seg || seg.value !== ID.Segment) return null;
  const segSizePos = pos + seg.length;
  const segSize = readVint(head, segSizePos);
  if (!segSize) return null;
  pos = segSizePos + segSize.length;

  while (pos < head.length) {
    const id = readVint(head, pos, true);
    const size = id && readVint(head, pos + id.length);
    if (!id || !size) return null;
    const dataStart = pos + id.length + size.length;
    if (id.value === ID.Cluster) return null;
    if (id.value === ID.Info) {
      const end = dataStart + size.value;
      if (end > head.length) return null;
      let scale = 1e6;
      let durPos = -1;
      let durSize = 0;
      for (let p = dataStart; p < end; ) {
        const cid = readVint(head, p, true);
        const cs = cid && readVint(head, p + cid.length);
        if (!cid || !cs) return null;
        const d = p + cid.length + cs.length;
        if (cid.value === ID.TimecodeScale) {
          scale = 0;
          for (let k = 0; k < cs.value; k++) scale = scale * 256 + head[d + k]!;
        } else if (cid.value === ID.Duration) {
          durPos = d;
          durSize = cs.value;
        }
        p = d + cs.value;
      }
      const value = (durationMs * 1e6) / (scale || 1e6);

      if (durPos >= 0) {
        const copy = head.slice();
        const dv = new DataView(copy.buffer);
        if (durSize === 8) dv.setFloat64(durPos, value);
        else if (durSize === 4) dv.setFloat32(durPos, value);
        else return null;
        return copy;
      }

      const durElem = new Uint8Array(11);
      durElem.set([0x44, 0x89, 0x88]);
      new DataView(durElem.buffer).setFloat64(3, value);
      const newSize = size.value + durElem.length;
      // Taille encodée sur 8 octets (0x01 + 7 octets) : toujours suffisant.
      const sizeBytes = new Uint8Array(8);
      sizeBytes[0] = 0x01;
      for (let k = 7, v = newSize; k >= 1; k--, v = Math.floor(v / 256)) sizeBytes[k] = v & 0xff;
      const idBytes = head.slice(pos, pos + id.length);
      const before = head.slice(0, pos);
      const after = head.slice(end);

      if (!segSize.unknown) {
        // Segment de taille connue : on la met à jour (même longueur de vint).
        const delta = idBytes.length + sizeBytes.length + size.value + durElem.length - (end - pos);
        let v = segSize.value + delta;
        if (v >= 2 ** (7 * segSize.length) - 1) return null;
        for (let k = segSize.length - 1; k >= 0; k--, v = Math.floor(v / 256)) before[segSizePos + k] = v & 0xff;
        before[segSizePos]! |= 0x80 >> (segSize.length - 1);
      }
      return concat(before, idBytes, sizeBytes, head.slice(dataStart, end), durElem, after);
    }
    if (size.unknown) return null;
    pos = dataStart + size.value;
  }
  return null;
}

/* ═══════════════════════════ Retiming WebM ═══════════════════════════
 * Réécrit EN PLACE les horodatages (Cluster > Timecode et temps relatif
 * int16 de chaque SimpleBlock) : aucune taille d'élément ne change, donc
 * aucun décalage d'octets à propager.
 *
 * Pour chaque bloc : t_mur = t_bloc + origine → index i de la frame émise
 * le plus proche (recherche dichotomique dans `emitted`) → nouveau temps
 * = i / fps. L'origine (horloge de MediaRecorder vs horloge murale) est
 * estimée par le dernier bloc puis affinée par la médiane des résidus.
 * ════════════════════════════════════════════════════════════════════ */

const SIMPLE_BLOCK = 0xa3;
const BLOCK_GROUP = 0xa0;
const BLOCK = 0xa1;
const CLUSTER_TIMECODE = 0xe7;

interface ClusterRec {
  tcPos: number;
  tcSize: number;
  tc: number;
  /** Position de l'int16 de temps relatif de chaque bloc. */
  relPos: number[];
  rel: number[];
}

const readUint = (b: Uint8Array, p: number, n: number) => {
  let v = 0;
  for (let k = 0; k < n; k++) v = v * 256 + b[p + k]!;
  return v;
};

export function retimeWebm(
  buf: Uint8Array,
  emitted: Float64Array,
  fps: number,
  recorderStart?: number,
): { dropped: number; blocks: number } | null {
  /* 1. Inventaire des clusters et blocs. */
  const ebml = readVint(buf, 0, true);
  const ebmlSize = ebml && readVint(buf, ebml.length);
  if (!ebml || !ebmlSize || ebml.value !== ID.EBML) return null;
  let pos = ebml.length + ebmlSize.length + ebmlSize.value;
  const seg = readVint(buf, pos, true);
  const segSize = seg && readVint(buf, pos + seg.length);
  if (!seg || !segSize || seg.value !== ID.Segment) return null;
  pos += seg.length + segSize.length;
  const end = segSize.unknown ? buf.length : Math.min(buf.length, pos + segSize.value);

  let scale = 1e6; // ns par tick (TimecodeScale)
  const clusters: ClusterRec[] = [];
  let cur: ClusterRec | null = null;
  while (pos < end) {
    const id = readVint(buf, pos, true);
    const size = id && readVint(buf, pos + id.length);
    if (!id || !size) break;
    const data = pos + id.length + size.length;
    if (id.value === ID.Cluster) {
      cur = { tcPos: -1, tcSize: 0, tc: 0, relPos: [], rel: [] };
      clusters.push(cur);
      pos = data; // on descend dans le cluster (taille souvent inconnue)
      continue;
    }
    if (id.value === BLOCK_GROUP) {
      pos = data;
      continue;
    }
    if (size.unknown || data + size.value > buf.length) break;
    if (id.value === ID.Info) {
      for (let p = data; p < data + size.value; ) {
        const cid = readVint(buf, p, true);
        const cs = cid && readVint(buf, p + cid.length);
        if (!cid || !cs) return null;
        const d = p + cid.length + cs.length;
        if (cid.value === ID.TimecodeScale) scale = readUint(buf, d, cs.value) || 1e6;
        p = d + cs.value;
      }
    } else if (id.value === CLUSTER_TIMECODE && cur) {
      cur.tcPos = data;
      cur.tcSize = size.value;
      cur.tc = readUint(buf, data, size.value);
    } else if ((id.value === SIMPLE_BLOCK || id.value === BLOCK) && cur) {
      const track = readVint(buf, data);
      if (!track) return null;
      const p = data + track.length;
      cur.relPos.push(p);
      cur.rel.push(((buf[p]! << 8) | buf[p + 1]!) << 16 >> 16); // int16 signé
    }
    pos = data + size.value;
  }

  /* 2. Temps absolus (ms) des blocs, dans l'ordre du fichier. */
  const abs: number[] = [];
  for (const c of clusters) {
    if (c.relPos.length && c.tcPos < 0) return null;
    for (const r of c.rel) abs.push(((c.tc + r) * scale) / 1e6);
  }
  const n = emitted.length;
  if (abs.length === 0 || n === 0) return null;
  for (let j = 1; j < abs.length; j++) if (abs[j]! < abs[j - 1]!) return null; // pas de réordonnancement attendu

  /* 3. Correspondance bloc → frame émise.
   * `ext` = [début de l'enregistrement, émission frame 0, frame 1, …] : l'entrée
   * 0 accueille l'image de pré-roll que Chrome capture au démarrage. */
  const ext = new Float64Array(n + 1);
  ext[0] = recorderStart ?? emitted[0]! - 1000 / fps;
  ext.set(emitted, 1);
  const nearest = (w: number) => {
    let lo = 0, hi = n;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (ext[mid]! <= w) lo = mid;
      else hi = mid;
    }
    return Math.abs(ext[lo]! - w) <= Math.abs(ext[hi]! - w) ? lo : hi;
  };
  // Origine : le dernier bloc est la dernière frame, puis recentrage par la médiane.
  let origin = ext[n]! - abs[abs.length - 1]!;
  const residuals = abs.map((a) => ext[nearest(a + origin)]! - (a + origin)).sort((x, y) => x - y);
  origin += residuals[residuals.length >> 1]!;

  // Alignement par programmation dynamique : les blocs sont dans l'ordre
  // d'émission, chacun correspond à une frame DISTINCTE et croissante (des
  // frames peuvent manquer = perdues). On minimise l'écart quadratique entre
  // l'instant de capture et l'instant d'émission, dans une bande ±BAND.
  const BAND = 8;
  const M = abs.length;
  const cand: Int32Array[] = [];
  const dp: Float64Array[] = [];
  const from: Int32Array[] = [];
  for (let j = 0; j < M; j++) {
    const w = abs[j]! + origin;
    const g = nearest(w);
    const lo = Math.max(0, g - BAND), hi = Math.min(n, g + BAND);
    const c = new Int32Array(hi - lo + 1).map((_, k) => lo + k);
    const d = new Float64Array(c.length).fill(Infinity);
    const f = new Int32Array(c.length).fill(-1);
    if (j === 0) c.forEach((k, q) => (d[q] = (w - ext[k]!) ** 2));
    else {
      const pc = cand[j - 1]!, pd = dp[j - 1]!;
      let p = 0, best = Infinity, bestQ = -1;
      c.forEach((k, q) => {
        while (p < pc.length && pc[p]! < k) {
          if (pd[p]! < best) {
            best = pd[p]!;
            bestQ = p;
          }
          p++;
        }
        if (bestQ >= 0) {
          d[q] = best + (w - ext[k]!) ** 2;
          f[q] = bestQ;
        }
      });
    }
    cand.push(c);
    dp.push(d);
    from.push(f);
  }
  const assigned = new Int32Array(M);
  let q = dp[M - 1]!.reduce((bi, v, i, arr) => (v < arr[bi]! ? i : bi), 0);
  if (!Number.isFinite(dp[M - 1]![q]!)) return null;
  for (let j = M - 1; j >= 0; j--) {
    assigned[j] = cand[j]![q]!;
    q = from[j]![q]!;
  }

  const frameMs = 1000 / fps;
  const seen = new Set<number>();
  const newTicks: number[] = [];
  let prev = -Infinity;
  for (let j = 0; j < M; j++) {
    const i = Math.max(0, assigned[j]! - 1); // pré-roll (entrée 0) = contenu de la frame 0
    if (assigned[j]! > 0) seen.add(i);
    const ticks = Math.max(prev + 1, Math.round((i * frameMs * 1e6) / scale));
    newTicks.push(ticks);
    prev = ticks;
  }

  /* 4. Nouveaux timecodes de cluster + vérification AVANT toute écriture. */
  const plan: { c: ClusterRec; tc: number; rels: number[] }[] = [];
  let j = 0;
  let prevTc = 0;
  for (const c of clusters) {
    const ticks = newTicks.slice(j, j + c.rel.length);
    j += c.rel.length;
    if (c.tcPos < 0) continue;
    const maxTc = 2 ** (8 * c.tcSize) - 1;
    const tc = Math.min(maxTc, ticks.length ? Math.min(...ticks) : prevTc);
    const rels = ticks.map((t) => t - tc);
    if (rels.some((r) => r < -32768 || r > 32767)) return null;
    plan.push({ c, tc, rels });
    prevTc = tc;
  }

  /* 5. Écriture en place. */
  for (const { c, tc, rels } of plan) {
    for (let k = c.tcSize - 1, v = tc; k >= 0; k--, v = Math.floor(v / 256)) buf[c.tcPos + k] = v & 0xff;
    rels.forEach((r, k) => {
      const p = c.relPos[k]!;
      buf[p] = (r >> 8) & 0xff;
      buf[p + 1] = r & 0xff;
    });
  }
  return { dropped: n - seen.size, blocks: abs.length };
}
