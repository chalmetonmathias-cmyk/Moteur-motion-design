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
7. Composants : `title-card`, `lower-third`, `logo-reveal` (+ registre).
8. 9 exemples (`src/examples/*.json`) : 3 courts ≤ 45 s, 6 longs 60–75 s.
9. README complet + docs (`docs/preview.png`, `docs/frames.png`).

Vérification bout-en-bout faite dans Chromium (conteneur sans GPU) : les 9 exemples se chargent sans diagnostic, rendu déterministe (hash de pixels), export 60 fps sans perte (1 frame manquante sur 34 950 au total, `long-06` à 38,67 s). Résultats détaillés dans `README.md` §9.

## Commandes

```bash
npm install
npm run dev          # http://localhost:5173 (?example=long-06-manifesto pour ouvrir un exemple)
npm test             # 27 tests node:test (parser, moteur, exporter, cahier des charges des exemples)
npm run typecheck    # app + tests/scripts
npm run build        # typecheck + build de production
npm run examples     # régénère src/examples/*.json depuis scripts/examples/*.ts (ÉCRASE les JSON)
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
