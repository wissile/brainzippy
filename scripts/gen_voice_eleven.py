"""Render voice lines with ElevenLabs (D-040). Runs in GitHub Actions (.github/workflows/voice-render.yml): the API key is
the repository secret ELEVENLABS_API_KEY and never leaves GitHub; the Claude workspace cannot reach the API.

Reads the same catalogues as scripts/gen_voice.py (src/audio/voiceLines.json + per-game/feature/pack voice.json), and
each speaker's ElevenLabs voice from src/audio/cast.json ("eleven": {"voice": "<voice_id>", "name": ...}).
Writes public/audio/voice/<key>.mp3 with the same finishing chain as the Kokoro clips (trim silence, loudness -16 LUFS,
24 kHz mono 64 kbps) and rewrites manifest.json. Human recordings in public/audio/voice/human/ still win.

public/audio/voice/eleven.json records, per clip, a hash of (voice, model, settings, text, speed). A clip is rendered
when its hash is missing or different, so a run is resumable and only changed/new lines cost credits.

Only fixed catalogue text is sent to ElevenLabs: never a child's name or any other child data.

  python3 scripts/gen_voice_eleven.py --quota                 # plan, credits left, cost of the pending work
  python3 scripts/gen_voice_eleven.py [--only prefix] [--speaker id] [--limit N] [--dry-run]
"""

from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import json
import os
import subprocess
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.request

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_voice import CATALOGUE, OUT, ROOT, expand, key_for, render  # noqa: E402

MODEL = "eleven_multilingual_v2"  # the model the owner auditioned (D-039)
SETTINGS = {"stability": 0.45, "similarity_boost": 0.8, "style": 0.35, "use_speaker_boost": True}
BASE_SPEED = 0.95  # catalogue speeds are Kokoro speeds; 0.95 = normal
API = "https://api.elevenlabs.io/v1"
SIDECAR = os.path.join(OUT, "eleven.json")
CAST = os.path.join(ROOT, "src", "audio", "cast.json")
FINISH = (
    "silenceremove=start_periods=1:start_threshold=-45dB,areverse,"
    "silenceremove=start_periods=1:start_threshold=-45dB,areverse,"
    "apad=pad_dur=0.08,loudnorm=I=-16:TP=-2:LRA=7"
)


def load_catalogue() -> dict:
    import glob  # noqa: PLC0415

    data = json.load(open(CATALOGUE))
    paths = (glob.glob(os.path.join(ROOT, "src", "games", "*", "voice.json")) + glob.glob(os.path.join(ROOT, "src", "*", "voice.json"))
             + glob.glob(os.path.join(ROOT, "src", "content", "packs", "*", "voice.json")))
    for path in sorted(paths):
        part = json.load(open(path))
        data["objects"].update(part.get("objects", {}))
        data["lines"].update(part["lines"])
    return data


def speeds(line_speed: float | None) -> tuple[float, float]:
    """ElevenLabs speed (0.7..1.2) + leftover ffmpeg atempo factor, so slowed words (Kokoro 0.6) stay slow."""
    rel = (line_speed if line_speed is not None else BASE_SPEED) / BASE_SPEED
    api = min(1.2, max(0.7, rel))
    return round(api, 3), round(rel / api, 3)


def jobs(data: dict, cast: dict) -> list[dict]:
    out = []
    for line_id, vars, text in expand(data):
        line = data["lines"][line_id]
        speaker = line.get("speaker", "narrator")
        voice = (cast.get(speaker, {}).get("eleven") or {}).get("voice")
        if not voice:  # not cast yet: its existing (Kokoro) clips stay as they are
            continue
        spoken = render(text, vars, data)
        api_speed, atempo = speeds(line.get("speed"))
        h = hashlib.sha256(json.dumps([voice, MODEL, SETTINGS, spoken, api_speed, atempo, FINISH], sort_keys=True).encode()).hexdigest()[:16]
        out.append({"key": key_for(line_id, line.get("vary"), vars), "speaker": speaker, "voice": voice, "text": spoken,
                    "speed": api_speed, "atempo": atempo, "hash": h})
    return out


def http(method: str, path: str, key: str, body: dict | None = None) -> bytes:
    data = json.dumps(body).encode() if body is not None else None
    headers = {"xi-api-key": key, "accept": "audio/mpeg" if body else "application/json"}
    if body is not None:
        headers["content-type"] = "application/json"
    for attempt in range(6):
        req = urllib.request.Request(API + path, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            msg = e.read().decode("utf-8", "replace")[:300]
            if e.code in (429, 500, 502, 503, 504) and "quota_exceeded" not in msg and attempt < 5:
                time.sleep(2 ** attempt + 1)
                continue
            raise RuntimeError(f"HTTP {e.code}: {msg}") from None
        except (urllib.error.URLError, TimeoutError):
            if attempt < 5:
                time.sleep(2 ** attempt + 1)
                continue
            raise
    raise RuntimeError("unreachable")


def synth(job: dict, key: str) -> None:
    seed = int(job["hash"][:8], 16) % 4_294_967_295  # deterministic per line, so a re-render sounds the same
    body = {"text": job["text"], "model_id": MODEL, "seed": seed, "voice_settings": {**SETTINGS, "speed": job["speed"]}}
    audio = http("POST", f"/text-to-speech/{job['voice']}?output_format=mp3_44100_128", key, body)
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
        tmp.write(audio)
    af = FINISH if job["atempo"] == 1 else f"atempo={job['atempo']}," + FINISH
    dest = os.path.join(OUT, f"{job['key']}.mp3")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", tmp.name, "-af", af, "-ar", "24000", "-ac", "1", "-b:a", "64k", dest], check=True)
    os.unlink(tmp.name)


def write_manifest() -> None:
    old = json.load(open(os.path.join(OUT, "manifest.json")))["clips"] if os.path.exists(os.path.join(OUT, "manifest.json")) else {}
    manifest = {k: v for k, v in old.items() if not v.startswith("human/")}
    human_dir = os.path.join(OUT, "human")
    if os.path.isdir(human_dir):
        for f in os.listdir(human_dir):
            manifest[os.path.splitext(f)[0]] = f"human/{f}"
    meta = {"voice": "cast (src/audio/cast.json)", "engine": f"elevenlabs {MODEL}", "clips": manifest}
    json.dump(meta, open(os.path.join(OUT, "manifest.json"), "w"), indent=0, sort_keys=True)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--quota", action="store_true", help="print plan, credits left and the cost of pending work")
    ap.add_argument("--only", default="", help="only keys starting with this prefix")
    ap.add_argument("--speaker", default="", help="only lines spoken by this speaker id")
    ap.add_argument("--limit", type=int, default=0, help="render at most N clips (pilot batches)")
    ap.add_argument("--workers", type=int, default=3)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    cast = json.load(open(CAST))["speakers"]
    all_jobs = jobs(load_catalogue(), cast)
    done: dict[str, str] = json.load(open(SIDECAR)) if os.path.exists(SIDECAR) else {}
    todo = [j for j in all_jobs if done.get(j["key"]) != j["hash"]
            and (not args.only or j["key"].startswith(args.only)) and (not args.speaker or j["speaker"] == args.speaker)]
    chars = sum(len(j["text"]) for j in todo)
    by_speaker: dict[str, list[int]] = {}
    for j in todo:
        s = by_speaker.setdefault(j["speaker"], [0, 0])
        s[0] += 1
        s[1] += len(j["text"])
    uncast = sorted({ln.get("speaker", "narrator") for ln in load_catalogue()["lines"].values()} - {j["speaker"] for j in all_jobs})
    if uncast:
        print(f"not cast for ElevenLabs yet (their clips are kept): {', '.join(uncast)}")
    print(f"pending: {len(todo)} of {len(all_jobs)} clips, {chars} characters (~{chars} credits on {MODEL})")
    for sp, (n, c) in sorted(by_speaker.items(), key=lambda kv: -kv[1][1]):
        print(f"  {sp:10} {n:5} clips {c:7} chars  voice {(cast[sp].get('eleven') or {}).get('name', '?')}")

    key = os.environ.get("ELEVENLABS_API_KEY", "")
    if args.quota:
        if not key:
            print("ELEVENLABS_API_KEY not set")
            return 1
        try:
            sub = json.loads(http("GET", "/user/subscription", key))
            left = sub.get("character_limit", 0) - sub.get("character_count", 0)
            reset = time.strftime("%Y-%m-%d", time.gmtime(sub.get("next_character_count_reset_unix") or 0))
            print(f"plan: {sub.get('tier')} | used {sub.get('character_count')} of {sub.get('character_limit')} credits | left {left} | resets {reset}")
            print(f"fits: {'YES' if left >= chars else 'NO, short by ' + str(chars - left)}")
        except RuntimeError as e:
            print(f"could not read the subscription (the key may lack the user_read permission): {e}")
        return 0
    if args.dry_run:
        return 0
    if not key:
        print("ELEVENLABS_API_KEY not set")
        return 1
    if args.limit:
        todo = todo[: args.limit]

    lock = threading.Lock()
    made = failed = 0

    def one(job: dict) -> None:
        nonlocal made, failed
        try:
            synth(job, key)
        except Exception as e:  # noqa: BLE001
            with lock:
                failed += 1
                print(f"  FAILED {job['key']}: {e}", flush=True)
                if "quota_exceeded" in str(e) or "HTTP 401" in str(e):
                    raise
            return
        with lock:
            done[job["key"]] = job["hash"]
            made += 1
            if made % 25 == 0:
                json.dump(done, open(SIDECAR, "w"), indent=0, sort_keys=True)
                print(f"  {made}/{len(todo)} done", flush=True)

    pool = concurrent.futures.ThreadPoolExecutor(max_workers=args.workers)
    try:
        for f in concurrent.futures.as_completed([pool.submit(one, j) for j in todo]):
            f.result()
    except Exception as e:  # noqa: BLE001  (quota/auth: stop, keep what was made)
        print(f"stopped: {e}")
        pool.shutdown(wait=True, cancel_futures=True)
    finally:
        pool.shutdown(wait=True)
        json.dump(done, open(SIDECAR, "w"), indent=0, sort_keys=True)
        write_manifest()
    print(f"rendered {made}, failed {failed}, still pending {len(todo) - made}")
    return 0 if failed == 0 else 2


if __name__ == "__main__":
    sys.exit(main())
