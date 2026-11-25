#!/usr/bin/env python3
"""
Voice audition (D-039): render the SAME BrainZippy lines with several commercial TTS services so the owner can pick
voices by ear. Runs in GitHub Actions (.github/workflows/voice-audition.yml), where the API keys are repository
secrets; the Claude workspace can't reach these services. Standard library only (urllib) + ffmpeg for stitching.

For every provider whose key is set it writes, under audition/<provider>/:
  cast-<NN>-<voice>.mp3     each candidate voice reading the same test sentence
  dialogue.mp3              the Critter Crew welcome conversation, one distinct voice per character
  sampler.mp3               all of the above stitched with short gaps, in the order listed in voices.json
  voices.json               which voice each file is (provider voice ids / names), for casting decisions
Providers and their secrets:
  elevenlabs  ELEVENLABS_API_KEY                (premade voices, model eleven_multilingual_v2)
  azure       AZURE_SPEECH_KEY + AZURE_SPEECH_REGION (neural + HD voices, incl. the child voices Ana and Maisie)
  google      GOOGLE_TTS_API_KEY                (Chirp 3 HD voices)
Nothing about any child is sent: only these fixed lines from our own scripts.
Usage: python3 scripts/voice_audition.py [--out audition] [--only elevenlabs,azure,google] [--dry-run]
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from xml.sax.saxutils import escape

TEST_SENTENCE = "Hi! I'm so happy you're here. Let's read the word together, one sound at a time. You did it!"

# The Critter Crew welcome conversation (src/dialogue/dialogues.json "welcome", lines from src/audio/voiceLines.json)
DIALOGUE = [
    ("bobbo", "Oh! Oh! Somebody new is here! Hi, hi, hi!"),
    ("zuzu", "Ta-da! Welcome to BrainZippy, the silliest place to learn!"),
    ("gloop", "Hello! I'm Gloop. Watch me squish into a circle. Boing!"),
    ("bobbo", "And I'm Bobbo! My wings are tiny, but my hugs are big!"),
    ("zuzu", "I'm Zuzu! When something goes wobbly, we just try again."),
    ("gloop", "Trying is the fun part! Will you play with us?"),
    ("bobbo", "Yay! Come on, let's go!"),
]

# Azure: child voices first, then natural adult voices (neural + HD). Styles are applied where the voice supports them.
AZURE_VOICES = [
    ("en-US-AnaNeural", "child, US"),
    ("en-GB-MaisieNeural", "child, UK"),
    ("en-US-Ava:DragonHDLatestNeural", "adult female, US, HD"),
    ("en-US-Andrew:DragonHDLatestNeural", "adult male, US, HD"),
    ("en-US-Emma:DragonHDLatestNeural", "adult female, US, HD"),
    ("en-US-JennyNeural", "adult female, US"),
    ("en-US-AriaNeural", "adult female, US"),
    ("en-US-GuyNeural", "adult male, US"),
]
AZURE_DIALOGUE = {"bobbo": "en-US-AnaNeural", "zuzu": "en-GB-MaisieNeural", "gloop": "en-US-Ava:DragonHDLatestNeural"}

# Google Chirp 3 HD voices (adult). Names: https://cloud.google.com/text-to-speech/docs/chirp3-hd
GOOGLE_VOICES = [
    ("en-US-Chirp3-HD-Aoede", "female"),
    ("en-US-Chirp3-HD-Leda", "female"),
    ("en-US-Chirp3-HD-Kore", "female"),
    ("en-US-Chirp3-HD-Zephyr", "female"),
    ("en-US-Chirp3-HD-Puck", "male"),
    ("en-US-Chirp3-HD-Fenrir", "male"),
    ("en-US-Chirp3-HD-Orus", "male"),
    ("en-US-Chirp3-HD-Charon", "male"),
]
GOOGLE_DIALOGUE = {"bobbo": "en-US-Chirp3-HD-Puck", "zuzu": "en-US-Chirp3-HD-Leda", "gloop": "en-US-Chirp3-HD-Aoede"}


def http(url: str, data: bytes | None, headers: dict[str, str], method: str = "POST") -> bytes:
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        body = e.read()[:400].decode("utf-8", "replace")
        raise RuntimeError(f"HTTP {e.code} from {urllib.parse.urlparse(url).netloc}: {body}") from None


# ---------------------------------------------------------------- providers

class ElevenLabs:
    name = "elevenlabs"

    def __init__(self, key: str):
        self.key = key
        self._voices: list[dict] | None = None

    def voices(self) -> list[tuple[str, str]]:
        if self._voices is None:
            raw = json.loads(http("https://api.elevenlabs.io/v1/voices", None, {"xi-api-key": self.key}, "GET"))
            self._voices = [v for v in raw.get("voices", []) if v.get("category") in ("premade", None)] or raw.get("voices", [])
        # prefer young voices, then the rest; ElevenLabs does not offer child voices (its policy)
        def rank(v: dict) -> tuple[int, str]:
            age = (v.get("labels") or {}).get("age", "")
            return (0 if age == "young" else 1 if age == "middle_aged" or age == "middle aged" else 2, v.get("name", ""))
        picked = sorted(self._voices, key=rank)[:8]
        out = []
        for v in picked:
            lab = v.get("labels") or {}
            out.append((v["voice_id"], f"{v.get('name','?')} ({', '.join(str(x) for x in [lab.get('age'), lab.get('gender'), lab.get('accent'), lab.get('description') or lab.get('descriptive')] if x)})"))
        return out

    def dialogue_cast(self) -> dict[str, str]:
        vs = [v for v, _ in self.voices()]
        return {"bobbo": vs[0], "zuzu": vs[1 % len(vs)], "gloop": vs[2 % len(vs)]}

    def synth(self, voice: str, text: str) -> bytes:
        body = json.dumps({"text": text, "model_id": "eleven_multilingual_v2", "voice_settings": {"stability": 0.45, "similarity_boost": 0.8, "style": 0.35}}).encode()
        return http(f"https://api.elevenlabs.io/v1/text-to-speech/{voice}?output_format=mp3_44100_128", body, {"xi-api-key": self.key, "content-type": "application/json", "accept": "audio/mpeg"})


class Azure:
    name = "azure"

    def __init__(self, key: str, region: str):
        self.key, self.region = key, region

    def voices(self) -> list[tuple[str, str]]:
        return AZURE_VOICES

    def dialogue_cast(self) -> dict[str, str]:
        return AZURE_DIALOGUE

    def synth(self, voice: str, text: str) -> bytes:
        lang = "-".join(voice.split("-")[:2])
        styled = voice.endswith("Neural") and "Dragon" not in voice and voice not in ("en-US-AnaNeural", "en-GB-MaisieNeural")
        inner = f'<mstts:express-as style="cheerful">{escape(text)}</mstts:express-as>' if styled else escape(text)
        ssml = (f'<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="{lang}">'
                f'<voice name="{voice}">{inner}</voice></speak>')
        return http(f"https://{self.region}.tts.speech.microsoft.com/cognitiveservices/v1", ssml.encode(), {
            "Ocp-Apim-Subscription-Key": self.key, "Content-Type": "application/ssml+xml",
            "X-Microsoft-OutputFormat": "audio-24khz-96kbitrate-mono-mp3", "User-Agent": "brainzippy-voice-audition"})


class Google:
    name = "google"

    def __init__(self, key: str):
        self.key = key

    def voices(self) -> list[tuple[str, str]]:
        return GOOGLE_VOICES

    def dialogue_cast(self) -> dict[str, str]:
        return GOOGLE_DIALOGUE

    def synth(self, voice: str, text: str) -> bytes:
        body = json.dumps({"input": {"text": text}, "voice": {"languageCode": "en-US", "name": voice}, "audioConfig": {"audioEncoding": "MP3"}}).encode()
        raw = json.loads(http(f"https://texttospeech.googleapis.com/v1/text:synthesize?key={urllib.parse.quote(self.key)}", body, {"content-type": "application/json"}))
        import base64
        return base64.b64decode(raw["audioContent"])


# ---------------------------------------------------------------- rendering

def stitch(files: list[str], out: str, gap_s: float = 0.8) -> None:
    gap = out + ".gap.mp3"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", str(gap_s), "-b:a", "64k", gap], check=True)
    lst = out + ".txt"
    with open(lst, "w") as f:
        for p in files:
            f.write(f"file '{os.path.abspath(p)}'\nfile '{os.path.abspath(gap)}'\n")
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-ar", "24000", "-ac", "1", "-b:a", "96k", out], check=True)
    os.remove(gap)
    os.remove(lst)


def render(p, outdir: str, dry: bool) -> dict:
    d = os.path.join(outdir, p.name)
    os.makedirs(d, exist_ok=True)
    report = {"provider": p.name, "test_sentence": TEST_SENTENCE, "cast": [], "dialogue": []}
    files = []
    for i, (voice, desc) in enumerate(p.voices(), 1):
        safe = "".join(c if c.isalnum() else "-" for c in voice)[:60]
        path = os.path.join(d, f"cast-{i:02d}-{safe}.mp3")
        if not dry:
            open(path, "wb").write(p.synth(voice, TEST_SENTENCE))
        report["cast"].append({"n": i, "voice": voice, "about": desc, "file": os.path.basename(path)})
        files.append(path)
        print(f"  {p.name} cast {i}: {voice} — {desc}")
    cast = p.dialogue_cast()
    beats = []
    for j, (who, text) in enumerate(DIALOGUE, 1):
        path = os.path.join(d, f"dlg-{j:02d}-{who}.mp3")
        if not dry:
            open(path, "wb").write(p.synth(cast[who], text))
        beats.append(path)
        report["dialogue"].append({"beat": j, "speaker": who, "voice": cast[who], "text": text})
    if not dry:
        stitch(beats, os.path.join(d, "dialogue.mp3"), gap_s=0.35)
        stitch(files + [os.path.join(d, "dialogue.mp3")], os.path.join(d, "sampler.mp3"))
        for b in beats:
            os.remove(b)
    json.dump(report, open(os.path.join(d, "voices.json"), "w"), indent=2)
    return report


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="audition")
    ap.add_argument("--only", default="elevenlabs,azure,google")
    ap.add_argument("--dry-run", action="store_true", help="no network: list what would be rendered")
    a = ap.parse_args()
    want = set(a.only.split(","))
    providers = []
    env = os.environ
    if "elevenlabs" in want and env.get("ELEVENLABS_API_KEY"):
        providers.append(ElevenLabs(env["ELEVENLABS_API_KEY"]))
    if "azure" in want and env.get("AZURE_SPEECH_KEY") and env.get("AZURE_SPEECH_REGION"):
        providers.append(Azure(env["AZURE_SPEECH_KEY"], env["AZURE_SPEECH_REGION"]))
    if "google" in want and env.get("GOOGLE_TTS_API_KEY"):
        providers.append(Google(env["GOOGLE_TTS_API_KEY"]))
    if a.dry_run and not providers:
        providers = [Azure("dry", "westeurope"), Google("dry")]
    if not providers:
        print("No provider keys set (ELEVENLABS_API_KEY, AZURE_SPEECH_KEY+AZURE_SPEECH_REGION, GOOGLE_TTS_API_KEY).", file=sys.stderr)
        return 2
    failed = []
    for p in providers:
        print(f"== {p.name}")
        try:
            render(p, a.out, a.dry_run)
        except Exception as e:  # one provider failing must not stop the others
            print(f"  {p.name} FAILED: {e}", file=sys.stderr)
            failed.append(p.name)
    if failed:
        print(f"failed: {', '.join(failed)}", file=sys.stderr)
    return 1 if len(failed) == len(providers) else 0


if __name__ == "__main__":
    sys.exit(main())
