# CLAUDE.md — contexte de reprise

Moteur de motion design piloté par `storyboard.json`, rendu Canvas 2D déterministe, export WebM navigateur, format TikTok 1080×1920. Spécification d'origine et documentation utilisateur : voir `README.md`. Langue du projet : **français** (code commenté, UI, messages d'erreur, README).

## État au 25/11/2026 — MVP terminé et vérifié

Les 9 étapes du cahier des charges sont livrées :

1. Scaffold Vite 8 + TypeScript 7 strict (vanilla, aucune dépendance d'exécution).
2. Types (`src/types/storyboard.ts`), schéma (`src/parser/schema.ts`), parser avec erreurs « chemin JSON + suggestion ».
3. Moteur : `easing.ts`, `keyframe.ts`, `timeline.ts`.
4. Renderer Canvas 2D (`renderer.ts`) + modules `path.ts`, `color.ts`, `text-layout.ts`, `transitions.ts`, `runtime.ts`, `assets.ts`.
5. Scene manager + player UI (`src/player/controls.ts`, `src/main.ts`).
6. Exporter (`src/player/exporter.ts`) : MediaRecorder + `captureStream(0)` + `requestFrame`, retiming des horodatages WebM, injection de la durée, **mode Auto** (calibrage + garantie sans perte).
7. Composants : `title-card`, `lower-third`, `logo-reveal`, `captions` (sous-titres mot à mot), `stamp` (tampon) + registre.
8. 9 exemples (`src/examples/*.json`) : 3 courts ≤ 45 s, 6 longs 60–75 s.
9. README complet + docs (`docs/preview.png`, `docs/frames.png`).

Vérification bout-en-bout faite dans Chromium (conteneur sans GPU) : les 9 exemples se chargent sans diagnostic, rendu déterministe (hash de pixels), export 60 fps sans perte (1 frame manquante sur 34 950 au total, `long-06` à 38,67 s). Résultats détaillés dans `README.md` §9.

## Chaîne raccordée : L'Énigme Vraie (26/11/2026)

- Le business TikTok de l'utilisateur (session Claude Code « Business TikTok automatisé », dossier `BUSINESS TIKTOK` sur son PC Windows) : chaîne **L'Énigme Vraie**, histoires vraies et étranges, verdict PROUVÉ / DÉBATTU / LÉGENDE, sources en commentaire épinglé, 62–65 s (Creator Rewards > 1 min), étiquette « Contenu généré par IA ». Épisodes 01–10 (Mary Celeste → Yamaguchi) produits par l'ancien pipeline et programmés du 25/11 au 04/12 à 19 h.
- À partir du n°11, l'image vient de ce moteur : `chaines/lenigme-vraie/` (charte, épisodes, `build.ts`, `audio/musique.py`, `audio/ajouter_voix.py`, `PRODUIRE_EPISODE.bat`). Voir `chaines/lenigme-vraie/README.md`.
- **n°11 « l'Homme au masque de fer »** : produit avec la voix **ElevenLabs** (Paul K, `5l4ttmr4SKNgi0HnOelT`, `eleven_multilingual_v2`, vitesse 1.15) ; storyboard recalé sur `voix/alignement.json` (instant réel de chaque mot) → 72,11 s.
- **n°12 « l'explosion de la Toungouska »** : voix ElevenLabs (mêmes réglages) → 64,64 s. Narration ≈ 155 mots pour tenir 62–65 s.
- Code commun des épisodes dans `charte.ts` → `atelier(NARRATION, duréePrévue)` (applyVoice, at, sceneFor, captions, verdictScene) ; `build()` d'un épisode renvoie `{ storyboard, narration, cues, total }`. Le refactor a été vérifié : le n°11 ressort à l'octet près.
- **Programmation TikTok** : `chaines/lenigme-vraie/CALENDRIER.md` (n°11 → ven. 05/12 19 h, n°12 → sam. 06/12 19 h, à programmer). TikTok Studio exige le navigateur connecté du PC de l'utilisateur : depuis le cloud, il faut que l'utilisateur partage un dossier via Remote Control (app Claude desktop) — sinon, programmer depuis une session Claude sur le PC (comme pour 01–10). Étiquette « Contenu généré par l'IA » obligatoire ; commentaire des sources à épingler après publication.
- Contrôle visuel rapide : `node scripts/render.mjs <storyboard> x.webm --sans-video --images 2,10,20 <dossier>`.
- **Voix** : `audio/voix_elevenlabs.py` (endpoint `with-timestamps`) écrit `voix/segment_NN.mp3` + `voix/alignement.json` ; `build.ts` le détecte et appelle `applyVoice` de l'épisode (segment = durée de sa voix + 0,3 s, sous-titres sur les vrais instants via la prop `wordTimes` de `captions`) ; `ajouter_voix.py --voix-dir` mixe. Les mp3 ne sont pas versionnés (régénérables, ≈ 1 100 caractères/épisode), `alignement.json` l'est. Dans le cloud, la clé est un secret réseau de l'environnement (hôte `api.elevenlabs.io`, en-tête `xi-api-key`) : ne jamais la demander dans le chat ni l'écrire dans un fichier. edge-tts reste la voie de secours (bloqué dans le cloud).
- Proxy du conteneur cloud : son port change à chaque redémarrage (lire `/root/.ccr/README.md`) ; `render.mjs` en a besoin (`PROXY=…`) pour charger Google Fonts, et `NODE_PATH=$(npm root -g)` pour trouver Playwright.
- Sujets suivants : `BUSINESS TIKTOK/IDEES FUTURES/40_sujets_a_produire.md` (sur le PC, non accessible depuis le cloud tant que le dossier n'est pas partagé).

## Commandes

```bash
npm install
npm run dev          # http://localhost:5173 (?example=long-06-manifesto pour ouvrir un exemple)
npm test             # 29 tests node:test (parser, moteur, exporter, cahier des charges des exemples)
npm run typecheck    # app + tests/scripts
npm run build        # typecheck + build de production
npm run examples     # régénère src/examples/*.json depuis scripts/examples/*.ts (ÉCRASE les JSON)
npm run episode -- 11_masque-de-fer   # fichiers d'un épisode de L'Énigme Vraie
npm run render -- <storyboard.json> <sortie.webm> [--miniature 5 m.jpg] [--sans-video]   # rendu sans interface
```

Vérification navigateur optionnelle (nécessite Playwright installé, serveur de dev lancé) :

```bash
node scripts/verify-exports.cjs --no-export          # chargement + déterminisme des 9 exemples (rapide)
node scripts/verify-exports.cjs short-01-hook        # + export WebM réel, contrôlé avec ffprobe si présent
```

## Conventions et décisions à respecter

- **Imports avec extension `.ts`** partout : les modules purs (parser, easing, path, color, components…) sont aussi exécutés directement par Node (tests, générateur). Ne pas importer de DOM dans ces modules purs.
- **Le renderer est une fonction pure de `t`** : pas d'état d'animation, pas de delta de rAF, aléatoire toujours seedé (`mulberry32`). Toute nouvelle fonctionnalité doit préserver ce déterminisme.
- **Le moteur ne voit jamais de JSON brut** : tout passe par le parser (défauts, `$palette`, `@assets`, composants expansés, débuts de scène calculés).
- **Composants = macros JSON** (`expand(props, ctx) → LayerInput[]`), validés comme les autres calques. Leur largeur de texte est estimée (pas de canvas au parsing).
- **Sémantique** : `t` des keyframes relatif au `start` du calque ; `x`/`y` = décalages par rapport à `anchor` ; l'`easing` d'une keyframe s'applique au segment qui y arrive ; une scène en `transitionOut` est dessinée au-dessus.
- **Validation maison** (pas de zod) : messages en français avec chemin JSON exact et « Vouliez-vous dire… ».
- `tests/examples.test.ts` vérifie le cahier des charges (durées, ≥ 2 composants, 5 types de calques, 8 familles d'easing dans le JSON écrit) : le garder vert.
- Pendant un export de test dans le navigateur, **ne pas modifier `src/`** : le HMR de Vite recharge la page et interrompt l'export.

## Pistes de suite (roadmap V2, non commencées)

Éditeur visuel (timeline + inspecteur), export MP4 via WebCodecs (plus rapide que le temps réel), audio + beat-sync, variables injectables (`{{prenom}}`, CSV → lot), JSON Schema pour l'autocomplétion, polices auto-hébergées, composition hors-écran des groupes. Détails : `README.md` §11.

Petites améliorations repérées :
- `short-01-hook` : l'overshoot `back` du sous-titre fait se chevaucher brièvement « pour » et « accrocher » pendant l'animation (au repos c'est correct) — réduire `from.scale` ou utiliser `back(1.4)`.
- Les exports à grain filmique dépassent un peu le débit cible (bruit coûteux à encoder).
