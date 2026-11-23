"""Pre-render every voice line to audio with the Kokoro neural voice (Apache-2.0 model, runs offline on CPU).

Reads src/audio/voiceLines.json, expands each line's `vary` combinations, and writes
public/audio/voice/<key>.mp3 plus public/audio/voice/manifest.json.

Human recordings made in /studio are saved as public/audio/voice/human/<key>.<ext> and always take priority:
this script keeps them in the manifest and never overwrites them.

Speakers (character voices): a line may set "speaker": "<id>" (default "narrator"). Non-narrator lines are rendered
with that speaker's Kokoro voice + pitch/formant/tempo/EQ from src/audio/cast.json (see scripts/voice_cast.py);
narrator lines use --voice/--speed and the original processing chain, so existing clips never change.
A line's own "speed" is an absolute Kokoro speed for whichever speaker says it.
After re-casting a speaker, re-render only their lines:  --speaker bobbo --force
Casting samples for approval: scripts/gen_voice_samples.py; listening-proxy QC: scripts/voice_qc.py.

Setup (once):
  pip install kokoro-onnx soundfile
  curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
  curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
Run:
  python3 scripts/gen_voice.py --model-dir /path/to/models [--voice af_heart] [--speed 0.95] [--only prefix] [--speaker id]
Requires ffmpeg.
"""

from __future__ import annotations

import argparse
import glob
import itertools
import json
import os
import re
import subprocess
import sys
import tempfile

sys.dont_write_bytecode = True  # keep scripts/ free of __pycache__
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from voice_cast import encode as encode_cast, load_cast, synth as synth_cast  # noqa: E402

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
    ap.add_argument("--voice", default="af_bella")  # chosen by the owner 2026-11-17
    ap.add_argument("--speed", type=float, default=0.95)
    ap.add_argument("--only", default="", help="only regenerate keys starting with this prefix")
    ap.add_argument("--force", action="store_true", help="regenerate files that already exist")
    ap.add_argument("--speaker", default="", help="only (re)render lines spoken by this speaker id (e.g. bobbo, narrator)")
    args = ap.parse_args()

    import soundfile as sf  # noqa: PLC0415
    from kokoro_onnx import Kokoro  # noqa: PLC0415

    data = json.load(open(CATALOGUE))
    # merge per-game catalogues (src/games/<id>/voice.json), per-feature ones (src/<feature>/voice.json) and
    # library packs' shelf pitches (src/content/packs/<pack>/voice.json, D-029)
    paths = (glob.glob(os.path.join(ROOT, "src", "games", "*", "voice.json")) + glob.glob(os.path.join(ROOT, "src", "*", "voice.json"))
             + glob.glob(os.path.join(ROOT, "src", "content", "packs", "*", "voice.json")))
    for path in sorted(paths):
        game = json.load(open(path))
        data["objects"].update(game.get("objects", {}))
        data["lines"].update(game["lines"])
    kokoro = Kokoro(os.path.join(args.model_dir, "kokoro-v1.0.onnx"), os.path.join(args.model_dir, "voices-v1.0.bin"))
    lang = "en-us" if args.voice.startswith("a") else "en-gb"
    cast = load_cast()
    unknown = sorted({ln.get("speaker") for ln in data["lines"].values() if ln.get("speaker") and ln["speaker"] not in cast})
    if unknown:
        raise SystemExit(f"unknown speaker(s) {unknown}: add them to src/audio/cast.json")
    os.makedirs(OUT, exist_ok=True)

    manifest: dict[str, str] = {}
    made = 0
    for line_id, vars, text in expand(data):
        key = key_for(line_id, data["lines"][line_id].get("vary"), vars)
        dest = os.path.join(OUT, f"{key}.mp3")
        manifest[key] = f"{key}.mp3"
        speaker = data["lines"][line_id].get("speaker", "narrator")
        if args.only and not key.startswith(args.only):
            continue
        if args.speaker and speaker != args.speaker:
            continue
        if os.path.exists(dest) and not args.force:
            continue
        spoken = render(text, vars, data)
        line_speed = data["lines"][line_id].get("speed")
        if speaker != "narrator":
            samples, sr = synth_cast(kokoro, spoken, cast[speaker], speed=line_speed)
            encode_cast(samples, sr, cast[speaker], dest)
            made += 1
            print(f"  {key} [{speaker}]: {spoken}")
            continue
        # a line may ask for its own speed (e.g. slowed words for rhyme hints); default = --speed
        speed = float(line_speed if line_speed is not None else args.speed)
        samples, sr = kokoro.create(spoken, voice=args.voice, speed=speed, lang=lang)
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
