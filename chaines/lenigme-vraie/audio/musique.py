#!/usr/bin/env python3
"""
Musique originale + bruitages d'un épisode de L'Énigme Vraie (sans droits).

    python chaines/lenigme-vraie/audio/musique.py <dossier_episode> [sortie.wav]

Lit <dossier_episode>/cues.json (repères générés par build.ts) et produit une
piste stéréo 44,1 kHz :
  - nappe sombre en ré mineur (Dm → B♭ → Gm → A → Dm), synthèse additive ;
  - pulsation "battement de cœur" ;
  - bruitages calés sur les repères : souffles (transitions), tic-tac
    (lettre), tampons, cachet de cire, montée de tension, impact final.

Tout est déterministe (graine fixe) : même épisode ⇒ même fichier.
Dépendance : numpy.
"""
import json
import sys
import wave
from pathlib import Path

import numpy as np

SR = 44100
rng = np.random.default_rng(1703)


def env_exp(n, tau):
    return np.exp(-np.arange(n) / (tau * SR))


def note(freq, dur, detune=0.0):
    t = np.arange(int(dur * SR)) / SR
    f = freq * (1 + detune)
    sig = np.zeros_like(t)
    for h in range(1, 9):  # dent de scie douce (harmoniques 1..8)
        sig += np.sin(2 * np.pi * f * h * t + h * 0.7) / (h ** 1.3)
    return sig


def add(buf, t, sig, gain=1.0):
    i = int(t * SR)
    if i >= len(buf):
        return
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[: j - i] * gain


def noise(dur):
    return rng.standard_normal(int(dur * SR))


def bandpass_noise(dur, lo, hi):
    n = int(dur * SR)
    spec = np.fft.rfft(rng.standard_normal(n))
    freqs = np.fft.rfftfreq(n, 1 / SR)
    spec[(freqs < lo) | (freqs > hi)] = 0
    return np.fft.irfft(spec, n)


def reverb(x, seconds=2.2, mix=0.28):
    n = int(seconds * SR)
    ir = rng.standard_normal(n) * np.exp(-np.arange(n) / (0.45 * SR))
    ir[0] = 0
    size = 1 << int(np.ceil(np.log2(len(x) + n)))
    wet = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[: len(x)]
    wet /= np.max(np.abs(wet)) + 1e-9
    return x * (1 - mix) + wet * mix * np.max(np.abs(x))


def main():
    ep = Path(sys.argv[1])
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else ep / "musique.wav"
    data = json.loads((ep / "cues.json").read_text(encoding="utf-8"))
    total = float(data["duree"])
    cues = data["cues"]
    n = int(total * SR)
    L = np.zeros(n)
    R = np.zeros(n)

    # ── Nappe : progression en ré mineur, accords enchaînés en fondu ──
    D2, F2, G1, A1, Bb1 = 73.42, 87.31, 49.0, 55.0, 58.27
    chords = [
        (0, [D2, D2 * 1.5, D2 * 2, F2 * 2]),            # Dm
        (16, [Bb1, Bb1 * 1.5, Bb1 * 2, D2 * 2]),        # B♭
        (32, [G1, G1 * 1.5, G1 * 2, Bb1 * 2 * 1.0]),    # Gm
        (48, [A1, A1 * 1.5, A1 * 2, A1 * 2 * 1.26]),    # A (sensible : tension)
        (55, [D2, D2 * 1.5, D2 * 2, F2 * 2]),           # Dm (verdict)
    ]
    for k, (start, freqs) in enumerate(chords):
        end = chords[k + 1][0] if k + 1 < len(chords) else total
        dur = end - start + 2.0
        env = np.ones(int(dur * SR))
        fade = int(1.8 * SR)
        env[:fade] = np.linspace(0, 1, fade)
        env[-fade:] = np.linspace(1, 0, fade)
        for f in freqs:
            add(L, max(0, start - 1), note(f, dur, -0.0025) * env, 0.13)
            add(R, max(0, start - 1), note(f, dur, +0.0025) * env, 0.13)
    # Respiration lente de la nappe.
    t = np.arange(n) / SR
    lfo = 0.82 + 0.18 * np.sin(2 * np.pi * t / 7.5)
    L *= lfo
    R *= lfo

    # ── Pulsation "cœur" (lub-dub) ──
    def thump(freq0, freq1, dur, gain):
        m = int(dur * SR)
        tt = np.arange(m) / SR
        f = freq0 + (freq1 - freq0) * (tt / dur)
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(m, dur / 4) * gain

    beat = 5.5
    while beat < total - 4:
        add(L, beat, thump(62, 42, 0.22, 0.32))
        add(R, beat, thump(62, 42, 0.22, 0.32))
        add(L, beat + 0.24, thump(55, 38, 0.2, 0.2))
        add(R, beat + 0.24, thump(55, 38, 0.2, 0.2))
        beat += 1.2 if beat < 48 else 0.8  # le cœur s'accélère avant le verdict

    # ── Bruitages ──
    tick_on = None
    for c in cues:
        tc, kind = float(c["t"]), c["type"]
        if kind == "whoosh":
            d = 0.55
            w = bandpass_noise(d, 300, 5000) * np.concatenate([np.linspace(0, 1, int(0.4 * SR)), np.linspace(1, 0, int(d * SR) - int(0.4 * SR))])
            add(L, tc - 0.4, w, 0.10)
            add(R, tc - 0.38, w, 0.10)
        elif kind == "stamp":
            m = int(0.4 * SR)
            body = thump(90, 38, 0.4, 0.9)
            slap = bandpass_noise(0.06, 900, 6000) * env_exp(int(0.06 * SR), 0.012) * 0.5
            add(L, tc, body)
            add(R, tc, body)
            add(L, tc, slap)
            add(R, tc + 0.004, slap)
            del m
        elif kind == "seal":
            add(L, tc, thump(140, 60, 0.25, 0.5))
            add(R, tc, thump(140, 60, 0.25, 0.5))
        elif kind == "tick-start":
            tick_on = tc
        elif kind == "tick-stop" and tick_on is not None:
            k = 0
            tt = tick_on
            while tt < tc:
                clk = bandpass_noise(0.012, 2500, 9000) * env_exp(int(0.012 * SR), 0.002)
                add(L if k % 2 else R, tt, clk, 0.35)
                add(R if k % 2 else L, tt, clk, 0.12)
                tt += 0.5
                k += 1
            tick_on = None
        elif kind == "riser":
            d = 1.5
            m = int(d * SR)
            tt = np.arange(m) / SR
            rise = (np.sin(2 * np.pi * np.cumsum(200 + 600 * (tt / d) ** 2) / SR) * 0.4 + bandpass_noise(d, 800, 8000) * 0.6) * (tt / d) ** 2
            add(L, tc, rise, 0.18)
            add(R, tc, rise, 0.18)
        elif kind == "hit":
            boom = thump(70, 30, 1.6, 1.0)
            add(L, tc, boom)
            add(R, tc, boom)
            shimmer = bandpass_noise(1.2, 3000, 12000) * env_exp(int(1.2 * SR), 0.3) * 0.15
            add(L, tc, shimmer)
            add(R, tc + 0.01, shimmer)

    # ── Mastering : réverbération, fondu final, normalisation ──
    L = reverb(L)
    R = reverb(R)
    fade = int(1.5 * SR)
    L[-fade:] *= np.linspace(1, 0, fade)
    R[-fade:] *= np.linspace(1, 0, fade)
    # Limiteur doux : les impacts ne doivent pas écraser la nappe.
    stereo = np.stack([L, R], axis=1)
    stereo /= np.percentile(np.abs(stereo), 99.9) + 1e-9
    stereo = np.tanh(stereo * 0.9) / np.tanh(0.9)
    stereo = stereo / (np.max(np.abs(stereo)) + 1e-9) * 0.89  # ≈ -1 dBFS
    pcm = (stereo * 32767).astype(np.int16)
    with wave.open(str(out), "wb") as f:
        f.setnchannels(2)
        f.setsampwidth(2)
        f.setframerate(SR)
        f.writeframes(pcm.tobytes())
    print(f"musique → {out} ({total:.1f} s)")


if __name__ == "__main__":
    main()
