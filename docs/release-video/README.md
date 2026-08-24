# AutoTime AI release video package

This package is generated from current release-state product screenshots.

## Outputs

- `autotime-release-75s.mp4` — concise launch/release cut.
- `autotime-walkthrough-2min.mp4` — end-to-end product walkthrough.
- Matching poster images and narration scripts.
- Matching British-English (`en-GB`) subtitle files.

Both MP4s are 1920×1080 H.264 with fast-start enabled. The visual masters are intentionally silent so they can be published with captions, a founder voice-over, or a licensed music bed without locking the product into synthetic narration.

## Regenerate

```powershell
powershell -ExecutionPolicy Bypass -File scripts/create-release-videos.ps1
```

## Final publishing pass

Record the supplied narration scripts in a calm, direct voice, then add burned-in captions and a restrained music bed. Keep music under narration and export at 1080p H.264. Do not claim guaranteed interviews, automatic applications, or verified immigration outcomes.

### Voice direction

- Neutral British or internationally intelligible European English.
- Warm, credible and calm; never salesy or over-energised.
- Approximately 135–145 words per minute.
- Pronounce “AutoTime” as “auto time” and “AI” as separate letters.
- Give slightly more space to “work permission”, “sponsorship”, “evidence” and “verify”.
- Avoid imitating a specific nationality or using an exaggerated accent.

Record one clean WAV or high-quality MP3 per video. No music, reverb or noise reduction should be baked into the recording. Mix and master it automatically with:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/add-release-voiceover.ps1 `
  -VideoPath docs/release-video/autotime-release-75s.mp4 `
  -VoicePath path/to/release-voice.wav
```

### Free local Kokoro narration

The included `scripts/generate-kokoro-voiceovers.py` generates both tracks with Kokoro's British `bf_emma` voice at a measured international-English pace. It runs locally after the initial open-model download.

```powershell
.tmp\kokoro-venv\Scripts\python.exe scripts\generate-kokoro-voiceovers.py
```
