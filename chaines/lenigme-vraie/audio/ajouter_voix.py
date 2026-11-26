#!/usr/bin/env python3
"""
Assemble la vidéo finale d'un épisode : image (moteur) + voix + musique.

    python chaines/lenigme-vraie/audio/ajouter_voix.py <dossier_episode> \
        --video video.webm --musique musique.wav --sortie 11_masque-de-fer.mp4 \
        [--voix fr-FR-HenriNeural] [--web] [--sans-voix] [--test-bips]

Voix : edge-tts (même service gratuit que les vidéos 01–10 ; `pip install edge-tts`).
Chaque segment de narration.json a un créneau fixe (début/fin) : c'est lui
qui cale les sous-titres et les tampons dans l'image. Si la voix est trop
longue pour son créneau, le débit est augmenté (jusqu'à +40 %), puis
légèrement accéléré si besoin — la synchronisation est donc garantie.

Mixage : musique baissée automatiquement sous la voix (sidechain), sortie
normalisée à -14 LUFS (niveau TikTok), vidéo H.264 1080×1920.
--web : produit aussi une version 720p de moins de 10 Mo (envoi depuis Chrome).
--sans-voix : vidéo + musique seulement. --test-bips : remplace la voix par
des bips (test du mixage sans connexion au service vocal).
"""
import argparse
import asyncio
import json
import math
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


def find_tool(name):
    """ffmpeg/ffprobe : PATH, sinon installation WinGet (comme les vidéos 01–10)."""
    found = shutil.which(name)
    if found:
        return found
    base = Path(os.environ.get("LOCALAPPDATA", "")) / "Microsoft" / "WinGet" / "Packages"
    if base.exists():
        for p in base.rglob(f"{name}.exe"):
            return str(p)
    sys.exit(f"✗ {name} introuvable (installez FFmpeg).")


FFMPEG = find_tool("ffmpeg")
FFPROBE = find_tool("ffprobe")


def duration(path):
    out = subprocess.run([FFPROBE, "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)], capture_output=True, text=True, check=True)
    return float(out.stdout.strip())


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit("✗ ffmpeg a échoué :\n" + r.stderr[-2000:])


async def tts(text, voice, rate, path):
    import edge_tts  # importé ici : inutile en mode --test-bips

    await edge_tts.Communicate(text, voice, rate=f"{rate:+d}%").save(str(path))


def make_voice(seg, voice, tmp, k, test):
    """Fabrique la voix d'un segment et garantit qu'elle tient dans son créneau."""
    slot = seg["end"] - seg["start"] - 0.15  # petite respiration avant la scène suivante
    out = tmp / f"voix_{k:02d}.wav"
    if test:
        run([FFMPEG, "-y", "-f", "lavfi", "-i", f"sine=frequency={330 + 40 * k}:duration={slot * 0.9:.3f}", "-af", "afade=t=in:d=0.05,afade=t=out:st={:.3f}:d=0.1,volume=0.5".format(slot * 0.9 - 0.1), "-ar", "44100", "-ac", "1", str(out)])
        return out, slot * 0.9, 0
    raw = tmp / f"voix_{k:02d}.mp3"
    rate = 0
    asyncio.run(tts(seg["texte_voix"], voice, rate, raw))
    d = duration(raw)
    if d > slot:
        rate = min(40, math.ceil((d / slot - 1) * 100) + 3)
        asyncio.run(tts(seg["texte_voix"], voice, rate, raw))
        d = duration(raw)
    tempo = d / slot if d > slot else 1.0
    filt = f"atempo={min(tempo, 1.25):.4f}" if tempo > 1.0 else "anull"
    run([FFMPEG, "-y", "-i", str(raw), "-af", filt, "-ar", "44100", "-ac", "1", str(out)])
    return out, duration(out), rate


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("episode", type=Path)
    ap.add_argument("--video", type=Path, required=True)
    ap.add_argument("--musique", type=Path, required=True)
    ap.add_argument("--sortie", type=Path, required=True)
    ap.add_argument("--voix", default="fr-FR-HenriNeural")
    ap.add_argument("--web", action="store_true")
    ap.add_argument("--sans-voix", action="store_true")
    ap.add_argument("--test-bips", action="store_true")
    a = ap.parse_args()

    narration = json.loads((a.episode / "narration.json").read_text(encoding="utf-8"))
    segments = narration["segments"]
    tmp = Path(tempfile.mkdtemp(prefix="enigme_voix_"))

    inputs = ["-i", str(a.video), "-i", str(a.musique)]
    filters = []
    if a.sans_voix:
        filters.append("[1:a]loudnorm=I=-14:TP=-1.5:LRA=11[aout]")
    else:
        for k, seg in enumerate(segments):
            path, d, rate = make_voice(seg, a.voix, tmp, k, a.test_bips)
            flag = f" (débit {rate:+d} %)" if rate else ""
            print(f"  voix {k + 1:02d}/{len(segments)} : {d:5.2f} s pour un créneau de {seg['end'] - seg['start']:.2f} s{flag}")
            inputs += ["-i", str(path)]
            ms = int(seg["start"] * 1000)
            filters.append(f"[{k + 2}:a]adelay={ms}|{ms}[v{k}]")
        n = len(segments)
        # apad : la piste voix couvre toute la vidéo (sinon le mixage s'arrête à la dernière phrase).
        filters.append("".join(f"[v{k}]" for k in range(n)) + f"amix=inputs={n}:normalize=0,apad=whole_dur={narration['duree']},asplit=2[voix1][voix2]")
        # Musique baissée automatiquement quand la voix parle.
        filters.append("[1:a]volume=0.6[mus]")
        filters.append("[mus][voix1]sidechaincompress=threshold=0.02:ratio=10:attack=15:release=400[musduck]")
        filters.append("[musduck][voix2]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[aout]")

    video_codec = ["-c:v", "copy"] if a.video.suffix.lower() == ".mp4" else ["-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p"]
    run([FFMPEG, "-y", *inputs, "-filter_complex", ";".join(filters), "-map", "0:v", "-map", "[aout]", *video_codec, "-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-shortest", "-movflags", "+faststart", str(a.sortie)])
    print(f"✓ {a.sortie} ({a.sortie.stat().st_size / 1e6:.1f} Mo, {duration(a.sortie):.2f} s)")

    if a.web:
        web = a.sortie.with_name(a.sortie.stem + "_web.mp4")
        total = duration(a.sortie)
        vbr = int((9.4e6 * 8 / total - 128e3) / 1000)  # < 10 Mo
        run([FFMPEG, "-y", "-i", str(a.sortie), "-vf", "scale=720:1280:flags=lanczos", "-c:v", "libx264", "-preset", "slow", "-b:v", f"{vbr}k", "-maxrate", f"{int(vbr * 1.1)}k", "-bufsize", f"{vbr * 2}k", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", str(web)])
        print(f"✓ {web} ({web.stat().st_size / 1e6:.1f} Mo, 720p pour l'envoi depuis Chrome)")
    shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main()
