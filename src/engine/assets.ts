/**
 * Préchargement des assets (polices + images).
 *
 * Indispensable au déterminisme : on ne commence à rendre qu'une fois TOUTES
 * les polices et images prêtes, sinon les premières frames (et donc l'export)
 * utiliseraient une police de secours ou une image manquante.
 */
import type { FontRequest } from '../types/storyboard.ts';

export interface AssetStore {
  images: Map<string, HTMLImageElement>;
  /** Problèmes non bloquants (police introuvable, image en échec…). */
  problems: string[];
}

const withTimeout = <T>(p: Promise<T>, ms: number, fallback: T): Promise<T> =>
  Promise.race([p, new Promise<T>((res) => setTimeout(() => res(fallback), ms))]);

/** Charge une feuille de style Google Fonts ; résout true si elle a chargé. */
function loadStylesheet(href: string): Promise<boolean> {
  const existing = document.querySelector<HTMLLinkElement>(`link[data-font-href="${CSS.escape(href)}"]`);
  if (existing) return Promise.resolve(existing.dataset.loaded === 'true');
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.fontHref = href;
    link.onload = () => {
      link.dataset.loaded = 'true';
      resolve(true);
    };
    link.onerror = () => {
      link.remove();
      resolve(false);
    };
    document.head.appendChild(link);
  });
}

const SYSTEM_FONTS = new Set(['system-ui', 'sans-serif', 'serif', 'monospace', 'arial', 'helvetica', 'georgia', 'times new roman', 'courier new', 'verdana']);

/**
 * Charge les polices depuis Google Fonts (une feuille par famille, avec
 * replis successifs si une graisse/un italique n'existe pas), puis attend que
 * chaque combinaison (famille, graisse, style) soit réellement prête.
 */
export async function loadFonts(faces: FontRequest[], timeoutMs = 6000): Promise<string[]> {
  const problems: string[] = [];
  const byFamily = new Map<string, FontRequest[]>();
  for (const f of faces) {
    if (SYSTEM_FONTS.has(f.family.toLowerCase())) continue;
    byFamily.set(f.family, [...(byFamily.get(f.family) ?? []), f]);
  }

  await Promise.all(
    [...byFamily.entries()].map(async ([family, list]) => {
      const fam = encodeURIComponent(family).replace(/%20/g, '+');
      const weights = [...new Set(list.map((f) => Math.round(f.weight)))].sort((a, b) => a - b);
      const hasItalic = list.some((f) => f.italic);
      const tuples = [
        ...weights.map((w) => `0,${w}`),
        ...(hasItalic ? [...new Set(list.filter((f) => f.italic).map((f) => Math.round(f.weight)))].sort((a, b) => a - b).map((w) => `1,${w}`) : []),
      ];
      const candidates = [
        `https://fonts.googleapis.com/css2?family=${fam}:ital,wght@${tuples.join(';')}&display=block`,
        `https://fonts.googleapis.com/css2?family=${fam}:wght@${weights.join(';')}&display=block`,
        `https://fonts.googleapis.com/css2?family=${fam}&display=block`,
      ];
      let loaded = false;
      for (const href of candidates) {
        if (await withTimeout(loadStylesheet(href), timeoutMs, false)) {
          loaded = true;
          break;
        }
      }
      if (!loaded) {
        problems.push(`Police « ${family} » introuvable (Google Fonts ou réseau) : police système utilisée.`);
        return;
      }
      await Promise.all(
        list.map(async (f) => {
          const spec = `${f.italic ? 'italic ' : ''}${f.weight} 48px "${family}"`;
          const ok = await withTimeout(
            document.fonts.load(spec).then((r) => r.length > 0, () => false),
            timeoutMs,
            false,
          );
          if (!ok) problems.push(`Police « ${family} » ${f.weight}${f.italic ? ' italique' : ''} non chargée : rendu approché.`);
        }),
      );
    }),
  );
  return problems;
}

export async function loadImages(urls: string[]): Promise<{ images: Map<string, HTMLImageElement>; problems: string[] }> {
  const images = new Map<string, HTMLImageElement>();
  const problems: string[] = [];
  await Promise.all(
    urls.map(async (url) => {
      const img = new Image();
      // Évite de "tainter" le canvas : sinon captureStream (export) serait refusé.
      if (/^https?:/i.test(url) && !url.startsWith(location.origin)) img.crossOrigin = 'anonymous';
      img.src = url;
      try {
        await img.decode();
        images.set(url, img);
      } catch {
        problems.push(`Image « ${url} » introuvable ou illisible : calque ignoré.`);
      }
    }),
  );
  return { images, problems };
}

export async function loadAssets(fonts: FontRequest[], images: string[]): Promise<AssetStore> {
  const [fontProblems, imgs] = await Promise.all([loadFonts(fonts), loadImages(images)]);
  return { images: imgs.images, problems: [...fontProblems, ...imgs.problems] };
}
