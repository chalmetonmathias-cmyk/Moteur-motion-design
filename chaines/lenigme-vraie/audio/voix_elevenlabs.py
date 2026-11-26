#!/usr/bin/env python3
"""
Voix ElevenLabs d'un épisode, avec l'instant exact de chaque mot.

    python chaines/lenigme-vraie/audio/voix_elevenlabs.py <dossier_episode> --voice-id <ID>
    python chaines/lenigme-vraie/audio/voix_elevenlabs.py --liste-voix

Lit <dossier>/narration.json et, pour chaque segment, appelle
/v1/text-to-speech/{voice_id}/with-timestamps (modèle multilingue, français).
Écrit :
  <dossier>/voix/segment_NN.mp3
  <dossier>/voix/alignement.json   { voice_id, model, segments: [{ id, duree, mots: [{mot, t}] }] }

L'alignement sert ensuite à recaler le storyboard sur la vraie voix
(build.ts le lit automatiquement) : sous-titres et tampons tombent sur le mot.

Clé : variable ELEVENLABS_API_KEY (en-tête xi-api-key). Dans une session cloud
Claude où la clé est enregistrée comme secret réseau, le proxy l'injecte.
"""
import argparse
import base64
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

API = "https://api.elevenlabs.io/v1"


def call(path, payload=None):
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    key = os.environ.get("ELEVENLABS_API_KEY")
    if key:
        headers["xi-api-key"] = key
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(API + path, data=data, headers=headers, method="POST" if data else "GET")
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        sys.exit(f"✗ ElevenLabs {e.code} sur {path} : {e.read().decode(errors='replace')[:400]}")


def words_from_alignment(al):
    """Regroupe l'alignement caractère par caractère en mots (séparés par des espaces)."""
    words, cur, start = [], "", None
    for ch, t in zip(al["characters"], al["character_start_times_seconds"]):
        if ch.isspace():
            if cur:
                words.append({"mot": cur, "t": round(start, 3)})
            cur, start = "", None
        else:
            if not cur:
                start = t
            cur += ch
    if cur:
        words.append({"mot": cur, "t": round(start, 3)})
    return words


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("episode", type=Path, nargs="?")
    ap.add_argument("--voice-id")
    ap.add_argument("--model", default="eleven_multilingual_v2")
    ap.add_argument("--vitesse", type=float, default=1.0, help="0.7 à 1.2")
    ap.add_argument("--liste-voix", action="store_true")
    a = ap.parse_args()

    if a.liste_voix:
        for v in call("/voices")["voices"]:
            l = v.get("labels") or {}
            print(f"{v['voice_id']}  {v['name'][:30]:30}  {l.get('gender', '')} {l.get('age', '')} {l.get('accent', '')} {l.get('description', '')}")
        return
    if not a.episode or not a.voice_id:
        sys.exit("Usage : voix_elevenlabs.py <dossier_episode> --voice-id <ID>  (ou --liste-voix)")

    segments = json.loads((a.episode / "narration.json").read_text(encoding="utf-8"))["segments"]
    out = a.episode / "voix"
    out.mkdir(exist_ok=True)
    result = {"voice_id": a.voice_id, "model": a.model, "segments": []}
    for k, seg in enumerate(segments):
        text = seg["texte_voix"]
        payload = {
            "text": text,
            "model_id": a.model,
            "voice_settings": {"stability": 0.45, "similarity_boost": 0.8, "style": 0.3, "use_speaker_boost": True, "speed": a.vitesse},
            # Contexte : intonation continue d'un segment à l'autre.
            "previous_text": segments[k - 1]["texte_voix"] if k > 0 else None,
            "next_text": segments[k + 1]["texte_voix"] if k + 1 < len(segments) else None,
        }
        r = call(f"/text-to-speech/{a.voice_id}/with-timestamps?output_format=mp3_44100_128", payload)
        mp3 = out / f"segment_{k:02d}.mp3"
        mp3.write_bytes(base64.b64decode(r["audio_base64"]))
        al = r.get("alignment") or r.get("normalized_alignment")
        words = words_from_alignment(al)
        duree = round(max(al["character_end_times_seconds"]), 3)
        expected = len(text.split())
        flag = "" if len(words) == expected else f"  ⚠ {len(words)} mots alignés pour {expected}"
        print(f"  {seg['id']:12} {duree:5.2f} s (créneau prévu {seg['end'] - seg['start']:.2f} s){flag}")
        result["segments"].append({"id": seg["id"], "duree": duree, "mots": words})
    (out / "alignement.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✓ voix + alignement → {out}")


if __name__ == "__main__":
    main()
