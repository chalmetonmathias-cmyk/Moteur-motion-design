# L'Énigme Vraie × Motion Engine

Raccordement de la chaîne TikTok **L'Énigme Vraie** (dossier `BUSINESS TIKTOK` : histoires vraies et étranges, verdict *prouvé / débattu / légende*, sources en commentaire épinglé) au moteur de motion design.

Épisodes produits ici : **n°11** l'Homme au masque de fer (72 s), **n°12** l'explosion de la Toungouska (64,6 s). Programmation : [CALENDRIER.md](CALENDRIER.md).

Les épisodes 01 à 10 ont été produits par l'ancien pipeline (`BUSINESS TIKTOK/OUTILS/PRODUIRE.bat`). À partir du **n°11**, l'image est produite par ce moteur : storyboard JSON déterministe, illustrations au trait animées, fiches « dossier », tampons de verdict, sous-titres mot à mot. La voix vient d'**ElevenLabs** (narrateur Paul K), avec edge-tts en secours.

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

Prérequis (une fois) : Node ≥ 22, Python 3, FFmpeg, puis `npm install`, `npm i -D playwright`, `npx playwright install chromium`, `pip install edge-tts numpy`. Pour la voix ElevenLabs : `set ELEVENLABS_API_KEY=sk_…` avant de lancer le `.bat`.

## Voix : ElevenLabs (recommandé) ou edge-tts

**ElevenLabs** — voix française naturelle, et surtout l'instant exact de chaque mot :

```bash
python chaines/lenigme-vraie/audio/voix_elevenlabs.py --liste-voix                 # voix du compte
python chaines/lenigme-vraie/audio/voix_elevenlabs.py chaines/lenigme-vraie/sortie/11_masque-de-fer \
       --voice-id 5l4ttmr4SKNgi0HnOelT --vitesse 1.15                                # Paul K, narrateur grave
npm run episode -- 11_masque-de-fer     # ↻ recale tout l'épisode sur la vraie voix
```

`voix/alignement.json` donne la durée de chaque segment et l'instant de chaque mot : `build.ts` le lit automatiquement, chaque segment dure alors le temps de sa voix (+ 0,3 s), et sous-titres, tampons et transitions tombent **sur le mot prononcé**. Le mixage utilise ensuite ces fichiers (`ajouter_voix.py --voix-dir …/voix`). Avec `PRODUIRE_EPISODE.bat`, il suffit de définir `ELEVENLABS_API_KEY` (et `VOIX_ELEVENLABS` pour changer de voix). Coût : ≈ 1 100 caractères par épisode.

Voix françaises du compte : Paul K (grave, choisie pour le n°11), Guillaume (narrateur), Christian Page (conteur), Martin Dupont (grave et chaleureuse).

**edge-tts** (sans clé) : voix de synthèse Microsoft, posée dans les créneaux estimés (débit ajusté pour ne jamais déborder).

## Comment la synchronisation est garantie

La **narration** (`NARRATION` dans le fichier de l'épisode) est la référence : chaque segment a un créneau fixe (début, fin).

- Les **sous-titres** (`captions`) répartissent les mots sur le créneau, proportionnellement à leur longueur, avec une pause après la ponctuation.
- Les **tampons et animations** sont calés sur l'instant où un mot est prononcé (`wordTime(segment, 'mot')`).
- La **voix** : avec ElevenLabs, c'est elle qui fixe le minutage (alignement mot à mot). Avec edge-tts, elle est synthétisée segment par segment ; si elle déborde de son créneau, son débit est augmenté (jusqu'à +40 %), puis elle est légèrement accélérée : elle ne déborde jamais.

## Écrire l'épisode suivant

1. Copier le dernier épisode (`episodes/12_toungouska.ts`) en `episodes/13_<sujet>.ts` (sujet tiré de `BUSINESS TIKTOK/IDEES FUTURES/40_sujets_a_produire.md`, sans reprendre un sujet déjà traité).
2. Réécrire `NARRATION` : **≈ 155 mots** pour la voix Paul K à 1.15 (≈ 2,6 mots/s, les années comptent pour plusieurs mots) → 62–65 s au total (Creator Rewards : plus d'une minute), un verdict final.
3. Adapter les scènes. `atelier(NARRATION, durée)` fournit le commun : `at(segment, mot)` (instant où le mot est prononcé), `sceneFor` (fond, halo, poussières, vignette), `verdictScene` (tableau + carte de fin), `captions`, `applyVoice`. Briques visuelles de `charte.ts` : fiche papier, machine à écrire, tampon, trait qui se dessine, sapins / forêt soufflée, Bastille, masques, en-tête de marque ; composants du moteur (`stamp`, `captions`, `lower-third`, `title-card`…). Attention : `at()` compare le début du mot normalisé (`d’arbres` → « darbres » : chercher `d’arbres`, pas `arbres`).
4. Remplir la fiche (description, hashtags, commentaire des sources, points vérifiés).
5. `npm run episode -- 13_<sujet>`, puis contrôle visuel rapide sans exporter :
   `node scripts/render.mjs sortie/…/storyboard.json x.webm --sans-video --images 2,10,20,40 controle/`
6. Lancer `PRODUIRE_EPISODE.bat 13_<sujet>` et l'ajouter à [CALENDRIER.md](CALENDRIER.md).

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

- edge-tts ne fonctionne pas dans un environnement cloud (service vocal de Microsoft inaccessible) : sans clé ElevenLabs, la voix se fait sur le PC.
- Dans une session Claude Code cloud, la clé ElevenLabs est un *secret réseau* de l'environnement (hôte `api.elevenlabs.io`, en-tête `xi-api-key`) : le proxy l'injecte, elle n'apparaît jamais dans les fichiers.
- Le rendu se fait en temps réel ou plus lentement (mode Auto) : compter environ 2 à 3 min par épisode d'une minute, plus le mixage.
