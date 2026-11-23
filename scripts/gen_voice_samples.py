"""Render casting samples for owner approval (public/audio/samples/).

  cast-<speaker>.mp3      every speaker in src/audio/cast.json saying the same test sentence
  dialogue-<id>.mp3       each dialogue in src/dialogue/dialogues.json stitched from its real clips
                          (public/audio/voice/<line>.mp3, rendered by gen_voice.py) with the beat pauses

Run:
  python3 scripts/gen_voice_samples.py --model-dir /path/to/models [--only bobbo,zuzu] [--cast-only | --dialogues-only]
Then check them:  python3 scripts/voice_qc.py public/audio/samples/cast-*.mp3
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import tempfile

import sys

import numpy as np

sys.dont_write_bytecode = True  # keep scripts/ free of __pycache__
from voice_cast import CAST_FILE, ROOT, SAMPLE_RATE, encode, load_cast, synth  # noqa: E402

OUT = os.path.join(ROOT, "public", "audio", "samples")
VOICE = os.path.join(ROOT, "public", "audio", "voice")
DIALOGUES = os.path.join(ROOT, "src", "dialogue", "dialogues.json")
DEFAULT_GAP_MS = 350  # mirrors DEFAULT_PAUSE_MS in src/dialogue/player.ts


def decode(path: str) -> np.ndarray:
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", path, "-f", "f32le", "-ac", "1", "-ar", str(SAMPLE_RATE), "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32)


def stitch(parts: list[np.ndarray], dest: str) -> None:
    import soundfile as sf  # noqa: PLC0415

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        sf.write(tmp.name, np.concatenate(parts), SAMPLE_RATE)
    try:
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", tmp.name, "-ac", "1", "-b:a", "64k", dest], check=True)
    finally:
        os.unlink(tmp.name)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--model-dir", default=os.environ.get("KOKORO_DIR", "."))
    ap.add_argument("--out", default=OUT)
    ap.add_argument("--only", default="", help="comma-separated speaker ids (cast samples only)")
    ap.add_argument("--text", default="", help="override the test sentence")
    ap.add_argument("--cast-only", action="store_true")
    ap.add_argument("--dialogues-only", action="store_true")
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    cast = load_cast()

    if not args.dialogues_only:
        from kokoro_onnx import Kokoro  # noqa: PLC0415

        kokoro = Kokoro(os.path.join(args.model_dir, "kokoro-v1.0.onnx"), os.path.join(args.model_dir, "voices-v1.0.bin"))
        text = args.text or json.load(open(CAST_FILE))["testSentence"]
        only = {s for s in args.only.split(",") if s}
        for sid, cfg in cast.items():
            if only and sid not in only:
                continue
            samples, sr = synth(kokoro, text, cfg)
            dest = os.path.join(args.out, f"cast-{sid}.mp3")
            encode(samples, sr, cfg, dest, narrator=sid == "narrator")
            print(f"  cast-{sid}.mp3  ({cfg['kokoroVoice']})")

    if not args.cast_only and os.path.exists(DIALOGUES):
        manifest = json.load(open(os.path.join(VOICE, "manifest.json")))["clips"]
        for did, dlg in json.load(open(DIALOGUES))["dialogues"].items():
            parts: list[np.ndarray] = []
            for beat in dlg["beats"]:
                f = manifest.get(beat["line"])
                if not f:
                    raise SystemExit(f"{did}: no clip for {beat['line']} - run gen_voice.py first")
                parts.append(decode(os.path.join(VOICE, f)))
                parts.append(np.zeros(int(SAMPLE_RATE * beat.get("pauseAfterMs", DEFAULT_GAP_MS) / 1000), dtype=np.float32))
            stitch(parts, os.path.join(args.out, f"dialogue-{did}.mp3"))
            print(f"  dialogue-{did}.mp3  ({len(dlg['beats'])} beats)")


if __name__ == "__main__":
    main()
