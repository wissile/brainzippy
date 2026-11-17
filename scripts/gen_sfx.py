"""Generate BrainZippy's original sound effects.

Every sound is synthesized from scratch here (additive synthesis + envelopes +
a small generated reverb), so the project owns all of it outright.
Output: public/audio/sfx/*.mp3 (mono, 44.1 kHz). Requires numpy + ffmpeg.

Run:  python3 scripts/gen_sfx.py
"""

from __future__ import annotations

import os
import subprocess
import tempfile
import wave

import numpy as np

SR = 44100
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "audio", "sfx")
rng = np.random.default_rng(7)


def t_axis(dur: float) -> np.ndarray:
    return np.arange(int(SR * dur)) / SR


def env(n: int, attack: float, decay: float) -> np.ndarray:
    """Fast attack, exponential decay envelope."""
    t = np.arange(n) / SR
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    return a * np.exp(-t / decay)


def bell(freq: float, dur: float, decay: float = 0.35, bright: float = 1.0) -> np.ndarray:
    """Soft mallet / bell tone: fundamental + inharmonic partials."""
    t = t_axis(dur)
    partials = [(1.0, 1.0), (2.0, 0.35 * bright), (3.01, 0.12 * bright), (4.2, 0.06 * bright)]
    sig = np.zeros_like(t)
    for ratio, amp in partials:
        sig += amp * np.sin(2 * np.pi * freq * ratio * t) * np.exp(-t / (decay / ratio**0.6))
    return sig * env(len(t), 0.003, 10.0)


def marimba(freq: float, dur: float = 0.45) -> np.ndarray:
    t = t_axis(dur)
    sig = np.sin(2 * np.pi * freq * t) * np.exp(-t / 0.16)
    sig += 0.25 * np.sin(2 * np.pi * freq * 4 * t) * np.exp(-t / 0.03)
    sig += 0.1 * np.sin(2 * np.pi * freq * 10 * t) * np.exp(-t / 0.01)
    return sig * env(len(t), 0.002, 10.0)


def soft_tri(freq: float, dur: float) -> np.ndarray:
    t = t_axis(dur)
    tri = 2 * np.abs(2 * ((freq * t) % 1) - 1) - 1
    sine = np.sin(2 * np.pi * freq * t)
    return (0.4 * tri + 0.6 * sine) * env(len(t), 0.012, dur / 2.5)


def sweep(f0: float, f1: float, dur: float, decay: float) -> np.ndarray:
    t = t_axis(dur)
    f = f0 * (f1 / f0) ** (t / dur)
    phase = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(phase) * env(len(t), 0.002, decay)


def place(buf: np.ndarray, sig: np.ndarray, at: float, gain: float = 1.0) -> None:
    i = int(at * SR)
    j = min(len(buf), i + len(sig))
    buf[i:j] += gain * sig[: j - i]


def reverb(sig: np.ndarray, length: float = 0.9, mix: float = 0.18) -> np.ndarray:
    n = int(SR * length)
    ir = rng.standard_normal(n) * np.exp(-np.arange(n) / (SR * length / 5))
    # gentle low-pass on the IR so the tail is warm, not hissy
    kernel = np.ones(12) / 12
    ir = np.convolve(ir, kernel, mode="same")
    ir /= np.max(np.abs(ir)) + 1e-9
    wet = np.convolve(sig, ir)
    out = np.zeros(len(wet))
    out[: len(sig)] += sig
    out += mix * wet / (np.max(np.abs(wet)) + 1e-9) * np.max(np.abs(sig))
    # trim trailing silence
    thresh = 1e-3 * np.max(np.abs(out))
    last = np.max(np.nonzero(np.abs(out) > thresh)) if np.any(np.abs(out) > thresh) else len(out)
    return out[: last + 1]


def normalize(sig: np.ndarray, peak_db: float = -3.0) -> np.ndarray:
    peak = 10 ** (peak_db / 20)
    sig = sig - np.mean(sig)
    m = np.max(np.abs(sig)) + 1e-9
    out = sig / m * peak
    fade = int(0.004 * SR)
    out[-fade:] *= np.linspace(1, 0, fade)
    return out


def write(name: str, sig: np.ndarray, peak_db: float = -3.0) -> None:
    sig = normalize(sig, peak_db)
    pcm = (np.clip(sig, -1, 1) * 32767).astype(np.int16)
    os.makedirs(OUT, exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        with wave.open(tmp.name, "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes(pcm.tobytes())
        dest = os.path.join(OUT, f"{name}.mp3")
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-i", tmp.name, "-codec:a", "libmp3lame", "-b:a", "96k", dest],
            check=True,
        )
        os.unlink(tmp.name)
    print(f"  {name}.mp3  {len(sig) / SR:.2f}s")


NOTE = {"C4": 261.63, "E4": 329.63, "G4": 392.0, "A4": 440.0, "C5": 523.25, "D5": 587.33,
        "E5": 659.25, "G5": 783.99, "A5": 880.0, "C6": 1046.5, "E6": 1318.5, "G6": 1568.0}


def main() -> None:
    print("Generating SFX ->", os.path.abspath(OUT))

    # UI tap: tactile wooden pop
    pop = sweep(950, 420, 0.09, 0.025) + 0.15 * rng.standard_normal(int(0.09 * SR)) * env(int(0.09 * SR), 0.0005, 0.004)
    write("tap", pop, -6)

    # Count note: one marimba hit; the engine pitch-shifts it up a pentatonic scale per count.
    write("count", reverb(marimba(NOTE["C5"]), 0.5, 0.12), -4)

    # Pick up / drop into basket
    write("pickup", sweep(500, 1100, 0.12, 0.05), -8)
    plop = sweep(700, 180, 0.22, 0.06) + 0.4 * sweep(240, 120, 0.22, 0.05)
    write("drop", reverb(plop, 0.3, 0.1), -5)

    # Correct: bright rising arpeggio with sparkle
    dur = 1.3
    buf = np.zeros(int(SR * dur))
    for i, n in enumerate(["C5", "E5", "G5", "C6"]):
        place(buf, bell(NOTE[n], 0.9, 0.4), i * 0.075, 0.8)
    for k in range(6):
        place(buf, bell(NOTE["G6"] * (1 + 0.12 * k), 0.3, 0.08, 0.4), 0.3 + k * 0.05, 0.18)
    write("correct", reverb(buf, 1.0, 0.2), -3)

    # Gentle retry: soft descending "boo-boop" (never a harsh buzzer)
    buf = np.zeros(int(SR * 0.7))
    place(buf, soft_tri(NOTE["G4"], 0.28), 0.0, 0.8)
    place(buf, soft_tri(NOTE["E4"], 0.38), 0.17, 0.8)
    write("retry", reverb(buf, 0.5, 0.15), -8)

    # Hint: magical twinkle
    buf = np.zeros(int(SR * 0.9))
    for k, n in enumerate(["E6", "G6", "C6", "E6", "G6"]):
        place(buf, bell(NOTE[n], 0.4, 0.12, 0.5), k * 0.08, 0.5)
    write("hint", reverb(buf, 0.8, 0.25), -8)

    # Whoosh: filtered noise swell for transitions
    n = int(SR * 0.45)
    noise = rng.standard_normal(n)
    shape = np.sin(np.linspace(0, np.pi, n)) ** 2
    lp = np.convolve(noise, np.ones(30) / 30, mode="same")
    write("whoosh", lp * shape, -12)

    # Level complete: short original jingle
    melody = [("C5", 0.0), ("E5", 0.14), ("G5", 0.28), ("E5", 0.42), ("G5", 0.56), ("C6", 0.74)]
    buf = np.zeros(int(SR * 2.2))
    for n_, at in melody:
        place(buf, marimba(NOTE[n_], 0.6), at, 0.8)
        place(buf, bell(NOTE[n_], 0.6, 0.3, 0.6), at, 0.25)
    for n_ in ["C5", "E5", "G5", "C6"]:
        place(buf, bell(NOTE[n_], 1.3, 0.6, 0.5), 0.74, 0.3)
    write("complete", reverb(buf, 1.2, 0.22), -3)

    # Achievement: shimmering chord with rising sparkles
    buf = np.zeros(int(SR * 2.0))
    for n_ in ["C5", "E5", "G5", "C6", "E6"]:
        place(buf, bell(NOTE[n_], 1.6, 0.7, 0.7), 0.05, 0.3)
    for k in range(10):
        place(buf, bell(NOTE["C6"] * 2 ** (k / 7), 0.35, 0.09, 0.3), 0.05 + k * 0.07, 0.15)
    write("achievement", reverb(buf, 1.3, 0.25), -3)

    # Star collect: bright ding
    write("star", reverb(bell(NOTE["E6"], 0.6, 0.25, 0.8) + 0.5 * bell(NOTE["A5"], 0.6, 0.25), 0.6, 0.15), -6)


if __name__ == "__main__":
    main()
