#!/usr/bin/env bash
# L'Énigme Vraie — production d'un épisode (Mac / Linux).
#   ./chaines/lenigme-vraie/produire-episode.sh 11_masque-de-fer
# Variables optionnelles : ELEVENLABS_API_KEY (+ VOIX_ELEVENLABS) pour la voix ElevenLabs,
# BUSINESS_TIKTOK (rangement automatique), PROXY (polices).
# Dans une session cloud Claude où la clé est un secret réseau : ELEVENLABS_API_KEY=proxy-injected.
set -euo pipefail
EP="${1:-11_masque-de-fer}"
cd "$(dirname "$0")/../.."
S="chaines/lenigme-vraie/sortie/$EP"

echo "[1/4] Storyboard, narration et fiche…"
npm run --silent episode -- "$EP"
VOIXOPT=()
if [[ -n "${ELEVENLABS_API_KEY:-}" ]]; then
  echo "[voix] ElevenLabs, puis recalage du storyboard sur la vraie voix…"
  python3 chaines/lenigme-vraie/audio/voix_elevenlabs.py "$S" --voice-id "${VOIX_ELEVENLABS:-5l4ttmr4SKNgi0HnOelT}" --vitesse 1.15
  npm run --silent episode -- "$EP"
  VOIXOPT=(--voix-dir "$S/voix")
fi
echo "[2/4] Rendu vidéo (mode Auto)…"
node scripts/render.mjs "$S/storyboard.json" "$S/video.webm" --miniature 5.0 "$S/miniature.jpg"
echo "[3/4] Musique et bruitages…"
python3 chaines/lenigme-vraie/audio/musique.py "$S" "$S/musique.wav"
echo "[4/4] Voix, mixage, versions finales…"
python3 chaines/lenigme-vraie/audio/ajouter_voix.py "$S" --video "$S/video.webm" --musique "$S/musique.wav" --sortie "$S/$EP.mp4" --web ${VOIX_TEST:+--test-bips} ${VOIXOPT[@]+"${VOIXOPT[@]}"}

if [[ -n "${BUSINESS_TIKTOK:-}" ]]; then
  cp "$S/$EP.mp4" "$BUSINESS_TIKTOK/VIDEOS FINALISEES/$EP.mp4"
  cp "$S/${EP}_web.mp4" "$BUSINESS_TIKTOK/VIDEOS FINALISEES/version_telephone/${EP}_web.mp4"
  cp "$S/miniature.jpg" "$BUSINESS_TIKTOK/MINIATURES/$EP.jpg"
  cp "$S/fiche.md" "$BUSINESS_TIKTOK/SCRIPTS/$EP.md"
fi
echo "Épisode prêt : $S/$EP.mp4"
