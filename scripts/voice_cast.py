"""Shared voice-casting helpers for scripts/gen_voice.py and scripts/gen_voice_samples.py.

Each speaker in src/audio/cast.json gets its own Kokoro voice (or a blend of voices) and an ffmpeg post chain that
turns an adult synthetic voice into a young, cartoon-like one without the "chipmunk" sound:

  1. asetrate + aresample  -> shifts pitch AND formants by `formantSemitones` (pure resampling, no artefacts;
                              higher formants = a smaller vocal tract = a younger-sounding speaker)
  2. rubberband            -> adds the remaining pitch (`pitchSemitones - formantSemitones`) with formants
                              preserved, and sets the final tempo (`tempo`, compensating step 1's speed-up)
  3. EQ                    -> high-pass, optional warmth (low-shelf) and brightness (high-shelf)
  4. trim + loudnorm       -> same trim and -16 LUFS integrated target as the narrator clips (true peak -3 dBTP)

Keep shifts modest (pitch <= +8 st, formants <= +3.5 st) so every voice stays intelligible to a 3-year-old.
"""

from __future__ import annotations

import json
import os
import subprocess
import tempfile

ROOT = os.path.join(os.path.dirname(__file__), "..")
CAST_FILE = os.environ.get("BZ_CAST_FILE") or os.path.join(ROOT, "src", "audio", "cast.json")

SAMPLE_RATE = 24000
TRIM = (
    "silenceremove=start_periods=1:start_threshold=-45dB,areverse,"
    "silenceremove=start_periods=1:start_threshold=-45dB,areverse"
)
# narrator clips use TP=-2 (kept unchanged); character voices use -3 dBTP to honour the audio peak rule
TARGET_LUFS = -16.0
LOUDNORM_CAST = "loudnorm=I=-16:TP=-3:LRA=7"  # used to measure


def load_cast() -> dict:
    return json.load(open(CAST_FILE))["speakers"]


def voice_style(kokoro, spec: str):
    """`af_heart` or a blend `af_heart:0.6+am_puck:0.4` (weights are normalised)."""
    if "+" not in spec and ":" not in spec:
        return spec
    parts = [p.split(":") for p in spec.split("+")]
    total = sum(float(w) for _, w in parts)
    return sum(kokoro.get_voice_style(v) * (float(w) / total) for v, w in parts)


def synth(kokoro, text: str, cfg: dict, speed: float | None = None):
    """Kokoro samples for `text` in the speaker's base voice. Returns (samples, sample_rate)."""
    return kokoro.create(text, voice=voice_style(kokoro, cfg["kokoroVoice"]), speed=float(speed if speed is not None else cfg.get("speed", 1.0)), lang=cfg.get("lang", "en-us"))


def post_filter(cfg: dict, sr: int = SAMPLE_RATE) -> str:
    """ffmpeg -af chain that applies a speaker's pitch/formant/tempo/EQ. Empty string for the plain narrator."""
    pitch = float(cfg.get("pitchSemitones", 0))
    formant = float(cfg.get("formantSemitones", 0))
    tempo = float(cfg.get("tempo", 1.0))
    chain: list[str] = []
    if formant:
        ratio = 2 ** (formant / 12)
        chain.append(f"asetrate={round(sr * ratio)},aresample={sr}")
        tempo /= ratio  # resampling sped the clip up; rubberband restores the wanted tempo
    rest = 2 ** ((pitch - formant) / 12)
    if abs(rest - 1) > 1e-4 or abs(tempo - 1) > 1e-4:
        chain.append(f"rubberband=tempo={tempo:.5f}:pitch={rest:.5f}:formant=preserved:pitchq=quality:window=standard")
    eq = cfg.get("eq", {})
    if chain or eq:
        chain.append(f"highpass=f={eq.get('highpassHz', 90)}")
    if eq.get("warmthDb"):
        chain.append(f"lowshelf=f=220:g={eq['warmthDb']}")
    if eq.get("brightnessDb"):
        chain.append(f"highshelf=f=3500:g={eq['brightnessDb']}")
    if eq.get("presenceDb"):
        chain.append(f"equalizer=f=2500:t=q:w=1.2:g={eq['presenceDb']}")
    return ",".join(chain)


def _ffmpeg(src: str, af: str, dest: str, extra: list[str] | None = None) -> str:
    out = subprocess.run(
        ["ffmpeg", "-y", "-hide_banner", "-loglevel", "info", "-i", src, "-af", af, "-ar", str(SAMPLE_RATE), "-ac", "1", *(extra or []), dest],
        check=True, capture_output=True, text=True,
    )
    return out.stderr


def encode(samples, sr: int, cfg: dict, dest: str, narrator: bool = False) -> None:
    """Write `samples` as a finished mono MP3 (trimmed, voiced as the speaker, loudness-normalised)."""
    import soundfile as sf  # noqa: PLC0415

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        sf.write(tmp.name, samples, sr)
    voiced = tmp.name.replace(".wav", "-voiced.wav")
    try:
        if narrator:
            # exactly the original narrator chain (existing clips must sound the same as new ones)
            _ffmpeg(tmp.name, f"{TRIM},apad=pad_dur=0.08,loudnorm=I=-16:TP=-2:LRA=7", dest, ["-b:a", "64k"])
            return
        # pass 1: voice the speaker, trim, gentle compression (evens out syllable peaks so loudness is consistent)
        chain = [f"aresample={SAMPLE_RATE}" if sr != SAMPLE_RATE else "", post_filter(cfg, sr), TRIM,
                 "acompressor=threshold=-22dB:ratio=2.5:attack=8:release=120:makeup=1", "apad=pad_dur=0.08"]
        _ffmpeg(tmp.name, ",".join(x for x in chain if x), voiced)
        # pass 2: measure loudness, then apply exactly the gain to reach -16 LUFS; a soft limiter at -4 dBFS catches
        # the few syllable peaks that would pass -3 dBTP (more accurate on short clips than dynamic loudnorm)
        log = _ffmpeg(voiced, f"{LOUDNORM_CAST}:print_format=json", "/dev/null", ["-f", "null"])
        m = json.loads(log[log.rfind("{"):log.rfind("}") + 1])
        gain = TARGET_LUFS - float(m["input_i"])
        _ffmpeg(voiced, f"volume={gain:.2f}dB,aresample=96000,alimiter=limit=0.6:attack=4:release=80:level=false,aresample={SAMPLE_RATE}", dest, ["-b:a", "64k"])
    finally:
        for p in (tmp.name, voiced):
            if os.path.exists(p):
                os.unlink(p)
