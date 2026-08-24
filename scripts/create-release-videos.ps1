param(
  [string]$OutputDirectory = "docs/release-video"
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$outputRoot = Join-Path $repoRoot $OutputDirectory
$workRoot = Join-Path $outputRoot "generated"
$frameRoot = Join-Path $workRoot "frames"
$audioRoot = Join-Path $workRoot "audio"
New-Item -ItemType Directory -Force -Path $frameRoot, $audioRoot | Out-Null

$ffmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue
if ($ffmpeg) {
  $ffmpegPath = $ffmpeg.Source
} else {
  $ffmpegPath = Get-ChildItem -Path "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Recurse -Filter ffmpeg.exe -ErrorAction SilentlyContinue |
    Select-Object -First 1 -ExpandProperty FullName
}
if (-not $ffmpegPath) { throw "FFmpeg was not found." }

Add-Type -AssemblyName System.Drawing

function Color([string]$hex) { [System.Drawing.ColorTranslator]::FromHtml($hex) }
function Brush([string]$hex) { [System.Drawing.SolidBrush]::new((Color $hex)) }

function RoundedPath([float]$x, [float]$y, [float]$w, [float]$h, [float]$radius) {
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $d = $radius * 2
  $path.AddArc($x, $y, $d, $d, 180, 90)
  $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  return $path
}

function Wrap-Lines($graphics, [string]$text, $font, [float]$width) {
  $lines = [System.Collections.Generic.List[string]]::new()
  $line = ""
  foreach ($word in ($text -split "\s+")) {
    $candidate = if ($line) { "$line $word" } else { $word }
    if ($graphics.MeasureString($candidate, $font).Width -le $width) { $line = $candidate }
    else { if ($line) { $lines.Add($line) }; $line = $word }
  }
  if ($line) { $lines.Add($line) }
  return $lines
}

$fontBrand = [System.Drawing.Font]::new("Segoe UI", 24, [System.Drawing.FontStyle]::Bold)
$fontEyebrow = [System.Drawing.Font]::new("Segoe UI", 13, [System.Drawing.FontStyle]::Bold)
$fontTitle = [System.Drawing.Font]::new("Segoe UI", 31, [System.Drawing.FontStyle]::Bold)
$fontCaption = [System.Drawing.Font]::new("Segoe UI", 18, [System.Drawing.FontStyle]::Regular)
$fontCounter = [System.Drawing.Font]::new("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)

function New-Frame($scene, [int]$number, [int]$total, [string]$destination) {
  $canvas = [System.Drawing.Bitmap]::new(1920, 1080)
  $g = [System.Drawing.Graphics]::FromImage($canvas)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
  $g.Clear((Color "#071426"))

  $g.FillRectangle((Brush "#0b1b31"), 0, 0, 1920, 160)
  $g.DrawString("AutoTime AI", $fontBrand, (Brush "#ffffff"), 86, 45)
  $g.DrawString("BETTER APPLICATIONS, NOT MORE NOISE.", $fontEyebrow, (Brush "#61d4c7"), 86, 91)
  $g.DrawString($scene.Eyebrow.ToUpperInvariant(), $fontEyebrow, (Brush "#61d4c7"), 520, 43)
  $g.DrawString($scene.Title, $fontTitle, (Brush "#ffffff"), 520, 72)

  $image = [System.Drawing.Image]::FromFile((Join-Path $repoRoot $scene.Image))
  $boxX = 86; $boxY = 184; $boxW = 1748; $boxH = 740
  $scale = [Math]::Min($boxW / $image.Width, $boxH / $image.Height)
  $drawW = [int]($image.Width * $scale); $drawH = [int]($image.Height * $scale)
  $drawX = $boxX + [int](($boxW - $drawW) / 2); $drawY = $boxY + [int](($boxH - $drawH) / 2)
  $shadow = RoundedPath ($drawX - 12) ($drawY - 12) ($drawW + 24) ($drawH + 24) 22
  $g.FillPath((Brush "#102640"), $shadow)
  $g.DrawImage($image, $drawX, $drawY, $drawW, $drawH)
  $shadow.Dispose(); $image.Dispose()

  $g.FillRectangle((Brush "#0b1b31"), 0, 948, 1920, 132)
  $captionLines = @(Wrap-Lines $g $scene.Caption $fontCaption 1450)
  for ($i = 0; $i -lt [Math]::Min(2, $captionLines.Count); $i++) {
    $g.DrawString($captionLines[$i], $fontCaption, (Brush "#dce8f6"), 86, (972 + ($i * 32)))
  }
  $g.DrawString(("{0:D2} / {1:D2}" -f $number, $total), $fontCounter, (Brush "#8fa9c4"), 1710, 995)

  $canvas.Save($destination, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $canvas.Dispose()
}

$releaseScenes = @(
  @{ Eyebrow="Release film"; Title="Apply with evidence"; Caption="A quality-first workspace for stronger European tech applications."; Image="screenshots/phase-8-landing-login/review/landing-hero-1440x900.png"; Duration=7; Script="Meet AutoTime AI: a quality-first workspace for stronger European tech applications." },
  @{ Eyebrow="Choose your direction"; Title="Target fewer, stronger roles"; Caption="Turn career evidence and preferences into a focused role lane."; Image="screenshots/phase-6-career-direction/review/stage5-lane-saved-1440x900.png"; Duration=7; Script="Start by choosing a focused career direction built from your evidence and preferences." },
  @{ Eyebrow="Job intelligence"; Title="Know whether a role deserves the effort"; Caption="See fit, evidence, unresolved risks and the next action before applying."; Image="screenshots/phase-2-jobs-analysis/review/analysis-consider-1440x900.png"; Duration=9; Script="For every role, AutoTime separates the fit, strongest evidence, unresolved risks, and the next action." },
  @{ Eyebrow="Country-aware"; Title="Check the realities around the role"; Caption="Keep work permission, sponsorship and relocation questions visible."; Image="screenshots/phase-5-countries/review/overview-1440x900.png"; Duration=8; Script="Country-aware guidance keeps work permission, sponsorship, and relocation questions visible before you invest." },
  @{ Eyebrow="Evidence discipline"; Title="Write from proof, not invention"; Caption="Unsupported claims are stopped before they reach an application."; Image="screenshots/phase-3-applications/review/blocked-unsupported-claim-1440x900.png"; Duration=8; Script="Application content stays grounded in your profile. Unsupported claims are stopped for review." },
  @{ Eyebrow="Application workflow"; Title="Move every opportunity forward"; Caption="Track preparation, review, readiness, applications and follow-ups in one pipeline."; Image="screenshots/phase-3-applications/review/pipeline-multiple-stages-1440x900.png"; Duration=8; Script="A clear pipeline keeps preparation, review, readiness, applications, and follow-ups moving." },
  @{ Eyebrow="Interview conversion"; Title="Carry the same evidence into the interview"; Caption="Prepare role-specific examples, questions and final checks."; Image="screenshots/phase-4-interviews/review/practice-1440x900.png"; Duration=8; Script="When a role progresses, carry the same evidence into focused interview practice." },
  @{ Eyebrow="AutoTime AI"; Title="Better applications, not more noise"; Caption="Target. Verify. Prove. Apply. Convert."; Image="screenshots/phase-8-landing-login/review/landing-eufit-1440x900.png"; Duration=7; Script="AutoTime AI. Target, verify, prove, apply, and convert. Better applications, not more noise." }
)

$walkthroughScenes = @(
  $releaseScenes[0],
  @{ Eyebrow="Step 1 - Profile"; Title="Build your reusable evidence base"; Caption="Save target roles, experience, work-right context and proof once."; Image="screenshots/phase-7-profile/review/workspace-top-1440x900.png"; Duration=10; Script="First, build a reusable profile with your target roles, experience, work-right context, and proof." },
  @{ Eyebrow="Step 2 - Direction"; Title="Choose a credible role lane"; Caption="Compare pathways, inspect the evidence and commit to a focused target."; Image="screenshots/phase-6-career-direction/review/stage4-role-detail-1440x900.png"; Duration=10; Script="Next, compare credible pathways and choose a focused role lane." },
  @{ Eyebrow="Step 3 - Jobs"; Title="Bring in a vacancy"; Caption="Review saved roles and open the one you want to assess."; Image="screenshots/phase-2-jobs-analysis/review/jobs-populated-1440x900.png"; Duration=9; Script="Bring in a vacancy and open the role you want to assess." },
  $releaseScenes[2],
  $releaseScenes[3],
  @{ Eyebrow="Step 4 - Application"; Title="Turn evidence into application-ready proof"; Caption="Resolve checks, map supporting evidence and keep every statement defensible."; Image="screenshots/phase-3b-1/evidence-mapping-1440.png"; Duration=10; Script="Resolve the checks, map supporting evidence, and keep every statement defensible." },
  $releaseScenes[4],
  @{ Eyebrow="Step 5 - Pipeline"; Title="Keep status and next action together"; Caption="See what is preparing, ready, applied or waiting for follow-up."; Image="screenshots/phase-3-applications/review/pipeline-multiple-stages-1440x900.png"; Duration=9; Script="Then keep every status and next action together in one application pipeline." },
  @{ Eyebrow="Step 6 - Interview"; Title="Prepare against the actual role"; Caption="Use role context and saved evidence to structure stronger answers."; Image="screenshots/phase-4-interviews/review/preparation-blocked-1440x900.png"; Duration=9; Script="Interview preparation stays tied to the actual role and unlocks when the evidence is ready." },
  $releaseScenes[6],
  $releaseScenes[7]
)

function Render-Video([string]$name, $scenes) {
  $listPath = Join-Path $workRoot "$name.concat.txt"
  $lines = [System.Collections.Generic.List[string]]::new()
  for ($i = 0; $i -lt $scenes.Count; $i++) {
    $framePath = Join-Path $frameRoot ("{0}-{1:D2}.png" -f $name, ($i + 1))
    New-Frame $scenes[$i] ($i + 1) $scenes.Count $framePath
    $safe = $framePath.Replace("\", "/").Replace("'", "'\''")
    $lines.Add("file '$safe'"); $lines.Add("duration $($scenes[$i].Duration)")
  }
  $last = (Join-Path $frameRoot ("{0}-{1:D2}.png" -f $name, $scenes.Count)).Replace("\", "/")
  $lines.Add("file '$last'")
  Set-Content -LiteralPath $listPath -Value $lines -Encoding ASCII
  $videoPath = Join-Path $outputRoot "$name.mp4"
  & $ffmpegPath -hide_banner -loglevel warning -y -f concat -safe 0 -i $listPath -vf "fps=30,format=yuv420p" -c:v libx264 -crf 18 -preset medium -movflags +faststart $videoPath
  if ($LASTEXITCODE -ne 0) { throw "FFmpeg failed rendering $name." }
  Copy-Item -LiteralPath (Join-Path $frameRoot ("{0}-01.png" -f $name)) -Destination (Join-Path $outputRoot "$name-poster.png") -Force
  $scenes | ForEach-Object -Begin { $n = 0 } -Process { $n++; "{0}. {1}`n   {2}" -f $n, $_.Title, $_.Script } |
    Set-Content -LiteralPath (Join-Path $outputRoot "$name-narration.txt") -Encoding utf8

  $srt = [System.Collections.Generic.List[string]]::new()
  $startSeconds = 0
  for ($i = 0; $i -lt $scenes.Count; $i++) {
    $endSeconds = $startSeconds + [int]$scenes[$i].Duration
    $startStamp = [TimeSpan]::FromSeconds($startSeconds).ToString("hh\:mm\:ss\,fff")
    $endStamp = [TimeSpan]::FromSeconds($endSeconds).ToString("hh\:mm\:ss\,fff")
    $srt.Add("$($i + 1)")
    $srt.Add("$startStamp --> $endStamp")
    $srt.Add($scenes[$i].Script)
    $srt.Add("")
    $startSeconds = $endSeconds
  }
  Set-Content -LiteralPath (Join-Path $outputRoot "$name-en-GB.srt") -Value $srt -Encoding utf8
}

Render-Video "autotime-release-75s" $releaseScenes
Render-Video "autotime-walkthrough-2min" $walkthroughScenes
Write-Host "Release videos created in $outputRoot"
