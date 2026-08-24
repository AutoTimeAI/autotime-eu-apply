"""Generate AutoTime release narration locally with Kokoro-82M."""

from pathlib import Path

import truststore

truststore.inject_into_ssl()

import numpy as np
import soundfile as sf
from kokoro import KPipeline


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "docs" / "release-video" / "voice"
VOICE = "bf_emma"
SPEED = 0.94
SAMPLE_RATE = 24_000

JOBS = (
    (
        ROOT / "docs" / "release-video" / "autotime-release-75s-narration.txt",
        OUTPUT / "autotime-release-voice.wav",
    ),
    (
        ROOT / "docs" / "release-video" / "autotime-walkthrough-2min-narration.txt",
        OUTPUT / "autotime-walkthrough-voice.wav",
    ),
)


def clean_script(text: str) -> str:
    spoken = []
    for line in text.splitlines():
        line = line.strip()
        if not line or line[0].isdigit() and ". " in line:
            continue
        spoken.append(line)
    return "\n".join(spoken).replace("AutoTime AI", "Auto Time A I")


def generate(pipeline: KPipeline, source: Path, destination: Path) -> None:
    text = clean_script(source.read_text(encoding="utf-8-sig"))
    clips = []
    pause = np.zeros(int(SAMPLE_RATE * 0.42), dtype=np.float32)
    for _graphemes, _phonemes, audio in pipeline(
        text,
        voice=VOICE,
        speed=SPEED,
        split_pattern=r"\n+",
    ):
        clips.extend((np.asarray(audio, dtype=np.float32), pause))
    if not clips:
        raise RuntimeError(f"Kokoro produced no audio for {source}")
    destination.parent.mkdir(parents=True, exist_ok=True)
    sf.write(destination, np.concatenate(clips[:-1]), SAMPLE_RATE, subtype="PCM_16")
    print(f"Created {destination}")


def main() -> None:
    pipeline = KPipeline(lang_code="b")
    for source, destination in JOBS:
        generate(pipeline, source, destination)


if __name__ == "__main__":
    main()
