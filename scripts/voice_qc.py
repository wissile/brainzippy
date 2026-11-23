"""Listening-proxy QC for voice clips: loudness, peaks, clipping, pitch, brightness and how distinct voices are.

  python3 scripts/voice_qc.py public/audio/samples/cast-*.mp3 [--ref public/audio/samples/cast-narrator.mp3]

Per file: integrated loudness (LUFS) and true peak (dBTP) from ffmpeg ebur128, clipped samples (|x| >= 0.999),
median F0 and its interquartile range (Hz; a flat IQR = monotone), spectral centroid (Hz; brightness), duration,
words-per-second-ish rate (voiced-frame ratio), and the nearest other voice by a mean-MFCC timbre+pitch distance.
A pair closer than ~1.0 is a casting risk: the two may sound alike. Not a substitute for listening.
"""

from __future__ import annotations

import os
import re
import subprocess
import sys
import tempfile

import numpy as np
import soundfile as sf
from scipy.fft import dct
from scipy.signal import stft


def load(path: str) -> tuple[np.ndarray, int]:
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", path, "-ac", "1", tmp.name], check=True)
        x, sr = sf.read(tmp.name)
    os.unlink(tmp.name)
    return x, sr


def ebur128(path: str) -> tuple[float, float]:
    out = subprocess.run(["ffmpeg", "-hide_banner", "-i", path, "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
    summary = out[out.rfind("Summary:"):]
    i = re.search(r"I:\s+(-?[\d.]+) LUFS", summary)
    p = re.search(r"Peak:\s+(-?[\d.inf]+) dBFS", summary)
    return float(i.group(1)) if i else float("nan"), float(p.group(1)) if p else float("nan")


def f0_track(x: np.ndarray, sr: int, fmin: float = 70, fmax: float = 650) -> np.ndarray:
    n, hop, out = int(0.04 * sr), int(0.01 * sr), []
    win = np.hanning(n)
    for i in range(0, len(x) - n, hop):
        f = x[i:i + n] * win
        if np.sqrt(np.mean(f ** 2)) < 0.02:
            continue
        ac = np.correlate(f, f, "full")[n - 1:]
        ac /= ac[0] + 1e-9
        lo, hi = int(sr / fmax), int(sr / fmin)
        k = lo + int(np.argmax(ac[lo:hi]))
        if ac[k] > 0.5:
            out.append(sr / k)
    return np.array(out)


def spectral(x: np.ndarray, sr: int) -> tuple[float, np.ndarray]:
    f, _, z = stft(x, sr, nperseg=1024)
    m = np.abs(z)
    e = m.sum(0)
    keep = e > np.percentile(e, 40)
    cent = float((f[:, None] * m).sum(0)[keep].sum() / m[:, keep].sum())
    mel = lambda h: 2595 * np.log10(1 + h / 700)  # noqa: E731
    imel = lambda v: 700 * (10 ** (v / 2595) - 1)  # noqa: E731
    pts = imel(np.linspace(mel(80), mel(min(8000, sr / 2)), 28))
    fb = np.array([np.clip(np.minimum((f - pts[j]) / (pts[j + 1] - pts[j]), (pts[j + 2] - f) / (pts[j + 2] - pts[j + 1])), 0, None) for j in range(26)])
    lm = np.log(fb @ (m[:, keep] ** 2) + 1e-10)
    return cent, dct(lm, axis=0, norm="ortho")[1:13].mean(1)


def main() -> None:
    paths = [p for p in sys.argv[1:] if not p.startswith("--")]
    rows = []
    for p in paths:
        x, sr = load(p)
        lufs, peak = ebur128(p)
        f0 = f0_track(x, sr)
        cent, mf = spectral(x, sr)
        med = float(np.median(f0)) if len(f0) else float("nan")
        iqr = float(np.percentile(f0, 75) - np.percentile(f0, 25)) if len(f0) else float("nan")
        rows.append({"name": os.path.basename(p), "lufs": lufs, "peak": peak, "clip": int(np.sum(np.abs(x) >= 0.999)), "f0": med, "iqr": iqr, "cent": cent, "dur": len(x) / sr, "mf": mf})
    # timbre (MFCC) + pitch (log2 F0 scaled) distance
    feats = np.array([np.concatenate([r["mf"], [6 * np.log2(max(r["f0"], 1))]]) for r in rows])
    print(f"{'file':32s} {'LUFS':>6s} {'TP':>6s} {'clip':>4s} {'F0':>6s} {'F0iqr':>6s} {'cent':>6s} {'dur':>5s}  nearest (distance)")
    for i, r in enumerate(rows):
        d = np.linalg.norm(feats - feats[i], axis=1)
        d[i] = np.inf
        j = int(np.argmin(d)) if len(rows) > 1 else i
        near = f"{rows[j]['name']} ({d[j]:.2f})" if len(rows) > 1 else "-"
        print(f"{r['name']:32s} {r['lufs']:6.1f} {r['peak']:6.1f} {r['clip']:4d} {r['f0']:6.1f} {r['iqr']:6.1f} {r['cent']:6.0f} {r['dur']:5.2f}  {near}")


if __name__ == "__main__":
    main()
