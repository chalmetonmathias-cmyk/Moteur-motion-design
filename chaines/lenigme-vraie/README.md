# L'Énigme Vraie × Motion Engine

Raccordement de la chaîne TikTok **L'Énigme Vraie** (dossier `BUSINESS TIKTOK` : histoires vraies et étranges, verdict *prouvé / débattu / légende*, sources en commentaire épinglé) au moteur de motion design.

Les épisodes 01 à 10 ont été produits par l'ancien pipeline (`BUSINESS TIKTOK/OUTILS/PRODUIRE.bat`). À partir du **n°11**, l'image est produite par ce moteur : storyboard JSON déterministe, illustrations au trait animées, fiches « dossier », tampons de verdict, sous-titres mot à mot. La voix reste la même (edge-tts).

## Production d'un épisode

```
episodes/11_masque-de-fer.ts      ← narration minutée + scènes (source)
        │  npm run episode -- 11_masque-de-fer
        ▼
sortie/11_masque-de-fer/
  storyboard.json   narration.json   cues.json   fiche.md
        │  node scripts/render.mjs …           → video.webm + miniature.jpg  (moteur, mode Auto)
        │  python audio/musique.py …           → musique.wav (musique originale + bruitages)
        │  python audio/ajouter_voix.py … --web → 11_masque-de-fer.mp4 + _web.mp4 (voix, mixage -14 LUFS)
        ▼
BUSINESS TIKTOK/  VIDEOS FINALISEES/ · version_telephone/ · MINIATURES/ · SCRIPTS/
```

**En une commande (Windows)**, depuis le dossier du projet :

```bat
set BUSINESS_TIKTOK=C:\chemin\vers\BUSINESS TIKTOK
chaines\lenigme-vraie\PRODUIRE_EPISODE.bat 11_masque-de-fer
```

Mac / Linux : `BUSINESS_TIKTOK=… ./chaines/lenigme-vraie/produire-episode.sh 11_masque-de-fer`.

Prérequis (une fois) : Node ≥ 22, Python 3, FFmpeg, puis `npm install`, `npm i -D playwright`, `npx playwright install chromium`, `pip install edge-tts numpy`.

## Comment la synchronisation est garantie

La **narration** (`NARRATION` dans le fichier de l'épisode) est la référence : chaque segment a un créneau fixe (début, fin).

- Les **sous-titres** (`captions`) répartissent les mots sur le créneau, proportionnellement à leur longueur, avec une pause après la ponctuation.
- Les **tampons et animations** sont calés sur l'instant où un mot est prononcé (`wordTime(segment, 'mot')`).
- La **voix** (`ajouter_voix.py`) est synthétisée segment par segment. Si elle déborde de son créneau, son débit est augmenté (jusqu'à +40 %), puis elle est légèrement accélérée : elle ne déborde jamais.

## Écrire l'épisode suivant

1. Copier `episodes/11_masque-de-fer.ts` en `episodes/12_<sujet>.ts` (sujet tiré de `BUSINESS TIKTOK/IDEES FUTURES/40_sujets_a_produire.md`).
2. Réécrire `NARRATION` : environ 2,75 mots/s, **62–65 s** au total (Creator Rewards : plus d'une minute), un verdict final.
3. Adapter les scènes : briques disponibles dans `charte.ts` (fiche papier, trait qui se dessine, Bastille, masques, halo, poussières, en-tête de marque) et composants du moteur (`stamp`, `captions`, `lower-third`, `title-card`…).
4. Remplir `FICHE` (description, hashtags, commentaire des sources, points vérifiés).
5. Lancer `PRODUIRE_EPISODE.bat 12_<sujet>`.

## Charte

| Élément | Valeur |
|---|---|
| Fond | `#0b0c10` → `#151821`, halo doré, poussières, grain 6 % |
| Or / or clair | `#d8a84e` / `#f3d792` |
| Rouge (cachet, LÉGENDE) | `#d63a2f` |
| PROUVÉ / DÉBATTU | `#4fbf7f` / `#e8a23a` |
| Papier / encre | `#efe3c8` / `#2b2117` |
| Titres | Playfair Display 700–900 |
| Documents | Special Elite (machine à écrire) |
| Sous-titres | Inter 800, contour noir, mots-clés en or |

`public/assets/enigme/logo.svg` est une **recréation** du logo (point d'interrogation doré, cercle doré, point rouge) : remplacez-le par `BUSINESS TIKTOK/IDENTITE/photo_de_profil.png` pour être identique à la photo de profil.

## Limites

- La voix ne peut pas être produite dans un environnement cloud sans accès au service vocal de Microsoft. Elle se fait sur le PC, comme pour les épisodes 01–10.
- Le rendu se fait en temps réel ou plus lentement (mode Auto) : compter environ 2 à 3 min par épisode de 65 s, plus le mixage.
