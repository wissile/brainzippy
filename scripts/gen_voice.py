"""Pre-render every voice line to audio with the Kokoro neural voice (Apache-2.0 model, runs offline on CPU).

Reads src/audio/voiceLines.json, expands each line's `vary` combinations, and writes
public/audio/voice/<key>.mp3 plus public/audio/voice/manifest.json.

Human recordings made in /studio are saved as public/audio/voice/human/<key>.<ext> and always take priority:
this script keeps them in the manifest and never overwrites them.

Setup (once):
  pip install kokoro-onnx soundfile
  curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
  curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
Run:
  python3 scripts/gen_voice.py --model-dir /path/to/models [--voice af_heart] [--speed 0.95] [--only prefix]
Requires ffmpeg.
"""

from __future__ import annotations

import argparse
import itertools
import json
import os
import re
import subprocess
import tempfile

ROOT = os.path.join(os.path.dirname(__file__), "..")
CATALOGUE = os.path.join(ROOT, "src", "audio", "voiceLines.json")
OUT = os.path.join(ROOT, "public", "audio", "voice")


def render(text: str, vars: dict, data: dict) -> str:
    kind = data["objects"].get(vars.get("kind", ""), None)
    n = vars.get("n")
    words = data["numberWords"]
    subs = {
        **{k: str(v) for k, v in vars.items()},
        "one": kind["one"] if kind else "snack",
        "many": kind["many"] if kind else "snacks",
        "manyN": (kind["one"] if n == 1 else kind["many"]) if kind else "snacks",
        "nWord": words[n] if isinstance(n, int) and n < len(words) else "",
    }
    out = re.sub(r"\{(\w+)\}", lambda m: subs.get(m.group(1), ""), text)
    return out[:1].upper() + out[1:]


def key_for(line_id: str, vary: dict | None, vars: dict) -> str:
    if not vary:
        return line_id
    return "__".join([line_id] + [f"{k}-{vars[k]}" for k in sorted(vary)])


def expand(data: dict):
    for line_id, line in data["lines"].items():
        vary = line.get("vary")
        if not vary:
            yield line_id, {}, line["text"]
            continue
        keys = list(vary)
        for combo in itertools.product(*[vary[k] for k in keys]):
            yield line_id, dict(zip(keys, combo)), line["text"]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--model-dir", default=os.environ.get("KOKORO_DIR", "."))
    ap.add_argument("--voice", default="af_heart")
    ap.add_argument("--speed", type=float, default=0.95)
    ap.add_argument("--only", default="", help="only regenerate keys starting with this prefix")
    ap.add_argument("--force", action="store_true", help="regenerate files that already exist")
    args = ap.parse_args()

    import soundfile as sf  # noqa: PLC0415
    from kokoro_onnx import Kokoro  # noqa: PLC0415

    data = json.load(open(CATALOGUE))
    kokoro = Kokoro(os.path.join(args.model_dir, "kokoro-v1.0.onnx"), os.path.join(args.model_dir, "voices-v1.0.bin"))
    lang = "en-us" if args.voice.startswith("a") else "en-gb"
    os.makedirs(OUT, exist_ok=True)

    manifest: dict[str, str] = {}
    made = 0
    for line_id, vars, text in expand(data):
        key = key_for(line_id, data["lines"][line_id].get("vary"), vars)
        dest = os.path.join(OUT, f"{key}.mp3")
        manifest[key] = f"{key}.mp3"
        if args.only and not key.startswith(args.only):
            continue
        if os.path.exists(dest) and not args.force:
            continue
        spoken = render(text, vars, data)
        samples, sr = kokoro.create(spoken, voice=args.voice, speed=args.speed, lang=lang)
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            sf.write(tmp.name, samples, sr)
            # trim leading/trailing silence, normalise loudness for consistent levels across clips
            af = (
                "silenceremove=start_periods=1:start_threshold=-45dB,areverse,"
                "silenceremove=start_periods=1:start_threshold=-45dB,areverse,"
                "apad=pad_dur=0.08,loudnorm=I=-16:TP=-2:LRA=7"
            )
            subprocess.run(
                ["ffmpeg", "-y", "-loglevel", "error", "-i", tmp.name, "-af", af, "-ar", "24000", "-ac", "1", "-b:a", "64k", dest],
                check=True,
            )
            os.unlink(tmp.name)
        made += 1
        print(f"  {key}: {spoken}")

    # human recordings override generated clips
    human_dir = os.path.join(OUT, "human")
    if os.path.isdir(human_dir):
        for f in os.listdir(human_dir):
            key, _ext = os.path.splitext(f)
            manifest[key] = f"human/{f}"

    meta = {"voice": args.voice, "engine": "kokoro-v1.0 (Apache-2.0)", "clips": manifest}
    json.dump(meta, open(os.path.join(OUT, "manifest.json"), "w"), indent=0, sort_keys=True)
    print(f"generated {made} clip(s); manifest has {len(manifest)} entries")


if __name__ == "__main__":
    main()
