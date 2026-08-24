param(
  [Parameter(Mandatory=$true)][string]$VideoPath,
  [Parameter(Mandatory=$true)][string]$VoicePath,
  [string]$OutputPath
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$resolvedVideo = Resolve-Path (Join-Path $repoRoot $VideoPath)
$resolvedVoice = Resolve-Path (Join-Path $repoRoot $VoicePath)
if (-not $OutputPath) {
  $OutputPath = Join-Path (Split-Path $resolvedVideo -Parent) (([IO.Path]::GetFileNameWithoutExtension($resolvedVideo)) + "-voiced.mp4")
} elseif (-not [IO.Path]::IsPathRooted($OutputPath)) {
  $OutputPath = Join-Path $repoRoot $OutputPath
}

$ffmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue
$ffmpegPath = if ($ffmpeg) { $ffmpeg.Source } else {
  Get-ChildItem -Path "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Recurse -Filter ffmpeg.exe -ErrorAction SilentlyContinue |
    Select-Object -First 1 -ExpandProperty FullName
}
if (-not $ffmpegPath) { throw "FFmpeg was not found." }

& $ffmpegPath -hide_banner -loglevel warning -y -i $resolvedVideo -i $resolvedVoice `
  -filter_complex "[1:a]highpass=f=70,lowpass=f=11000,loudnorm=I=-16:TP=-1.5:LRA=7,apad[a]" `
  -map 0:v:0 -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart $OutputPath
if ($LASTEXITCODE -ne 0) { throw "Voice-over mix failed." }
Write-Host "Voiced release video created: $OutputPath"
