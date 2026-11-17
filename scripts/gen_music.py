"""Compose BrainZippy's original background music loops (fully synthesized, owned outright).

Each world gets a seamless 16-bar loop: chords + melody + bass + light percussion, with a generated reverb whose
tail is wrapped back to the start so the loop has no click or gap.
Output: public/audio/music/<track>.mp3 (mono 32 kHz, 64 kbps). Requires numpy + ffmpeg.
Run: python3 scripts/gen_music.py
"""

from __future__ import annotations

import os
import subprocess
import tempfile
import wave

import numpy as np

SR = 32000
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "audio", "music")


def midi(n: float) -> float:
    return 440.0 * 2 ** ((n - 69) / 12)


def env(n: int, a: float, d: float, sustain: float = 0.0, release: float = 0.05) -> np.ndarray:
    t = np.arange(n) / SR
    att = np.clip(t / max(a, 1e-4), 0, 1)
    dec = sustain + (1 - sustain) * np.exp(-np.maximum(t - a, 0) / max(d, 1e-4))
    rel = np.clip((n / SR - t) / max(release, 1e-4), 0, 1)
    return att * dec * rel


def marimba(f: float, dur: float) -> np.ndarray:
    n = int(SR * dur)
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.35) + 0.2 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t / 0.05)
    return s * env(n, 0.003, 10)


def celesta(f: float, dur: float) -> np.ndarray:
    n = int(SR * dur)
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 2.01 * t) * np.exp(-t / 0.3) + 0.12 * np.sin(2 * np.pi * f * 3.98 * t) * np.exp(-t / 0.1)
    return s * env(n, 0.004, 0.6)


def pluck(f: float, dur: float, bright: float = 0.5) -> np.ndarray:
    """Karplus-Strong plucked string."""
    n = int(SR * dur)
    period = max(2, int(SR / f))
    rng = np.random.default_rng(int(f * 10))
    buf = rng.uniform(-1, 1, period)
    out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % period]
        buf[i % period] = 0.5 * (buf[i % period] + buf[(i + 1) % period]) * (0.994 + 0.004 * bright)
    return out * env(n, 0.002, 10, release=0.08)


def pad(freqs: list[float], dur: float, warmth: float = 0.6) -> np.ndarray:
    n = int(SR * dur)
    t = np.arange(n) / SR
    s = np.zeros(n)
    for f in freqs:
        for det in (-0.004, 0.0, 0.004):
            ph = 2 * np.pi * f * (1 + det) * t
            s += np.sin(ph) + warmth * 0.3 * np.sin(2 * ph) + warmth * 0.1 * np.sin(3 * ph)
    s /= len(freqs) * 3
    return s * env(n, min(0.6, dur / 3), 10, sustain=1.0, release=min(0.6, dur / 3))


def bass(f: float, dur: float) -> np.ndarray:
    n = int(SR * dur)
    t = np.arange(n) / SR
    s = np.tanh(1.6 * np.sin(2 * np.pi * f * t)) * 0.8 + 0.2 * np.sin(4 * np.pi * f * t)
    return s * env(n, 0.01, 0.4, sustain=0.35, release=0.05)


def kick(dur: float = 0.25) -> np.ndarray:
    n = int(SR * dur)
    t = np.arange(n) / SR
    f = 120 * np.exp(-t * 18) + 45
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.09)


def shaker(dur: float = 0.06, seed: int = 0) -> np.ndarray:
    n = int(SR * dur)
    noise = np.random.default_rng(seed).standard_normal(n)
    hp = noise - np.convolve(noise, np.ones(6) / 6, mode="same")
    return hp * env(n, 0.002, 0.02)


def place(buf: np.ndarray, sig: np.ndarray, at_s: float, gain: float) -> None:
    i = int(at_s * SR) % len(buf)
    j = i + len(sig)
    if j <= len(buf):
        buf[i:j] += gain * sig
    else:  # wrap around: keeps the loop seamless
        k = len(buf) - i
        buf[i:] += gain * sig[:k]
        buf[: j - len(buf)] += gain * sig[k:]


def reverb_wrap(sig: np.ndarray, seconds: float, mix: float) -> np.ndarray:
    n = int(SR * seconds)
    rng = np.random.default_rng(3)
    ir = rng.standard_normal(n) * np.exp(-np.arange(n) / (SR * seconds / 5))
    ir = np.convolve(ir, np.ones(16) / 16, mode="same")
    ir /= np.sum(np.abs(ir))
    # circular convolution = reverb tail wraps into the loop start
    wet = np.real(np.fft.ifft(np.fft.fft(sig) * np.fft.fft(ir, len(sig))))
    wet *= np.max(np.abs(sig)) / (np.max(np.abs(wet)) + 1e-9)
    return sig + mix * wet


def write(name: str, sig: np.ndarray, peak_db: float = -9.0) -> None:
    sig = sig - np.mean(sig)
    sig = sig / (np.max(np.abs(sig)) + 1e-9) * 10 ** (peak_db / 20)
    pcm = (np.clip(sig, -1, 1) * 32767).astype(np.int16)
    os.makedirs(OUT, exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        with wave.open(tmp.name, "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes(pcm.tobytes())
        dest = os.path.join(OUT, f"{name}.mp3")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", tmp.name, "-codec:a", "libmp3lame", "-b:a", "64k", dest], check=True)
        os.unlink(tmp.name)
    print(f"  {name}.mp3  {len(sig) / SR:.1f}s")


def compose(name: str, bpm: float, key: int, chords: list[list[int]], lead, scale: list[int], seed: int,
            lead_rate: int = 2, perc: str = "light", pad_gain: float = 0.35, swing: float = 0.0, reverb: float = 0.3) -> None:
    beat = 60 / bpm
    bars = 16
    total = bars * 4 * beat
    buf = np.zeros(int(SR * total))
    rng = np.random.default_rng(seed)
    # melody motif: 2-bar pattern of scale degrees, varied on repeats
    motif = [int(x) for x in rng.choice(len(scale), size=8 * lead_rate // 2 * 2)]
    for bar in range(bars):
        chord = chords[bar % len(chords)]
        t0 = bar * 4 * beat
        root = key + chord[0]
        # pad + bass
        place(buf, pad([midi(key + 12 + c) for c in chord], 4 * beat), t0, pad_gain)
        for b in range(4):
            if b in (0, 2) or (perc == "groove" and b == 3):
                place(buf, bass(midi(root - 12 if b != 3 else root - 5), beat * 0.95), t0 + b * beat, 0.5)
        # percussion
        for step in range(8):
            ts = t0 + step * beat / 2 + (swing * beat / 2 if step % 2 else 0)
            if perc in ("light", "groove"):
                place(buf, shaker(seed=bar * 8 + step), ts, 0.10 if step % 2 else 0.06)
            if perc == "groove" and step in (0, 4):
                place(buf, kick(), ts, 0.35)
            if perc == "soft" and step == 0:
                place(buf, kick(), ts, 0.18)
        # lead: rests on some steps so it breathes; phrase answers itself every 4 bars
        steps = 4 * lead_rate
        for s in range(steps):
            if (bar % 4 == 3 and s >= steps // 2) or rng.random() < 0.28:
                continue
            idx = motif[(s + (bar % 2) * steps) % len(motif)]
            if bar % 8 >= 4:
                idx = (idx + 2) % len(scale)
            note = key + 24 + scale[idx]
            # keep the lead in the chord on strong beats
            if s % lead_rate == 0:
                note = key + 24 + min(chord, key=lambda c: abs((c % 12) - (scale[idx] % 12)))
            ts = t0 + s * (4 * beat / steps) + (swing * beat / 2 if s % 2 else 0)
            place(buf, lead(midi(note), beat * 1.2), ts, 0.33)
    write(name, reverb_wrap(buf, 1.8, reverb))


def main() -> None:
    print("Composing music ->", os.path.abspath(OUT))
    MAJ_PENT = [0, 2, 4, 7, 9, 12, 14, 16]
    MIN_PENT = [0, 3, 5, 7, 10, 12, 15, 17]
    I, V, vi, IV = [0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]
    ii = [2, 5, 9]
    # Monster Island: bright, bouncy adventure theme
    compose("island", 112, 60, [I, V, vi, IV], marimba, MAJ_PENT, 11, lead_rate=2, perc="groove")
    # Counting Meadow: sunny morning, gentle marimba + plucks
    compose("meadow", 96, 62, [I, IV, I, V], lambda f, d: 0.6 * marimba(f, d) + 0.4 * pluck(f, d), MAJ_PENT, 22, lead_rate=2, perc="light")
    # Sky Balloon Race: dreamy dusk, celesta arpeggios, floating
    compose("sky", 84, 65, [I, vi, IV, V], celesta, MAJ_PENT, 33, lead_rate=4, perc="soft", pad_gain=0.5, reverb=0.45)
    # Glow Cave: mysterious and curious, minor pentatonic bells, slow
    compose("cave", 76, 57, [[0, 3, 7], [5, 8, 12], [3, 7, 10], [7, 10, 14]], celesta, MIN_PENT, 44, lead_rate=2, perc="soft", pad_gain=0.55, reverb=0.55)
    # Cookie Kitchen: cozy, swingy, plucked
    compose("kitchen", 100, 60, [I, vi, ii, V], lambda f, d: pluck(f, d, 0.8), MAJ_PENT, 55, lead_rate=2, perc="groove", swing=0.33)


if __name__ == "__main__":
    main()
