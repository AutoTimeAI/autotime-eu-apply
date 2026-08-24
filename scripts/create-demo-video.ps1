# Generates the AutoTime EU Apply "first-time user" demo video entirely from
# code: renders a fixed set of narrated slide scenes (product promise,
# profile, Job Check, extension, application content, tracker, interview
# prep, pricing, closing) as PNG frames using System.Drawing, synthesizes
# narration audio from each slide's script text via the Windows
# System.Speech engine, then concatenates the frames and narration into an
# MP4 with ffmpeg. Run via `pnpm` is not wired up for this script directly —
# invoke it with `powershell -ExecutionPolicy Bypass -File
# scripts/create-demo-video.ps1`.
#
# Requirements: Windows (System.Drawing/System.Speech are Windows-only) and
# ffmpeg on PATH or discoverable under the WinGet packages folder — throws if
# ffmpeg cannot be found. If narration synthesis fails, falls back to
# rendering a silent video instead of failing the whole run.
#
# Side effects: writes generated slide PNGs to
# `docs/demo-video/generated/slides/`, narration WAV to
# `docs/demo-video/generated/audio/narration.wav`, a concat list file, and
# the final video to `-OutputPath` (default
# `docs/demo-video/autotime-first-user-demo.mp4`).
param(
  [string]$OutputPath = "docs/demo-video/autotime-first-user-demo.mp4"
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$demoDir = Join-Path $repoRoot "docs/demo-video"
$generatedDir = Join-Path $demoDir "generated"
$slidesDir = Join-Path $generatedDir "slides"
$audioDir = Join-Path $generatedDir "audio"

New-Item -ItemType Directory -Force -Path $slidesDir | Out-Null
New-Item -ItemType Directory -Force -Path $audioDir | Out-Null

$ffmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue
if (-not $ffmpeg) {
  $ffmpegPath = Get-ChildItem -Path "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Recurse -Filter ffmpeg.exe -ErrorAction SilentlyContinue |
    Select-Object -First 1 -ExpandProperty FullName
  if (-not $ffmpegPath) {
    throw "FFmpeg was not found. Install it with winget install --id Gyan.FFmpeg."
  }
} else {
  $ffmpegPath = $ffmpeg.Source
}

Add-Type -AssemblyName System.Drawing

# Converts a "#rrggbb" hex string to a System.Drawing.Color.
function New-Color([string]$hex) {
  return [System.Drawing.ColorTranslator]::FromHtml($hex)
}

# Builds a solid brush from a "#rrggbb" hex color string.
function New-Brush([string]$hex) {
  return [System.Drawing.SolidBrush]::new((New-Color $hex))
}

# Fills a rounded-corner rectangle of radius $r at ($x,$y) size ($w,$h) using
# $brush, by building a GraphicsPath from four corner arcs.
function Draw-RoundedRect($graphics, $brush, [float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $d = $r * 2
  $path.AddArc($x, $y, $d, $d, 180, 90)
  $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  $graphics.FillPath($brush, $path)
  $path.Dispose()
}

# Draws the outline of the same rounded-corner rectangle shape as
# Draw-RoundedRect, using $pen instead of filling it.
function Draw-RoundedOutline($graphics, $pen, [float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $d = $r * 2
  $path.AddArc($x, $y, $d, $d, 180, 90)
  $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  $graphics.DrawPath($pen, $path)
  $path.Dispose()
}

# Word-wraps $text to fit within width $w (measured with $font), draws up to
# $maxLines lines starting at ($x,$y) spaced by $lineHeight, and returns the y
# coordinate just below the last drawn line.
function Draw-WrappedText($graphics, [string]$text, $font, $brush, [float]$x, [float]$y, [float]$w, [float]$lineHeight, [int]$maxLines = 8) {
  $words = $text -split "\s+"
  $line = ""
  $lines = @()

  foreach ($word in $words) {
    $candidate = if ($line) { "$line $word" } else { $word }
    if ($graphics.MeasureString($candidate, $font).Width -le $w) {
      $line = $candidate
    } else {
      if ($line) { $lines += $line }
      $line = $word
    }
  }

  if ($line) { $lines += $line }
  $lines = @($lines | Select-Object -First $maxLines)

  for ($i = 0; $i -lt $lines.Count; $i++) {
    $graphics.DrawString($lines[$i], $font, $brush, $x, $y + ($i * $lineHeight))
  }

  return $y + ($lines.Count * $lineHeight)
}

# Draws a mock form-field card (rounded white box with border) showing an
# uppercase $label and a wrapped bold $value, used across several mock
# browser scenes.
function Draw-Field($graphics, [string]$label, [string]$value, [float]$x, [float]$y, [float]$w, [float]$h) {
  $white = New-Brush "#ffffff"
  $border = [System.Drawing.Pen]::new((New-Color "#d8e1ec"), 2)
  Draw-RoundedRect $graphics $white $x $y $w $h 14
  Draw-RoundedOutline $graphics $border $x $y $w $h 14
  $graphics.DrawString($label.ToUpperInvariant(), $script:fontSmallBold, (New-Brush "#667385"), $x + 18, $y + 12)
  Draw-WrappedText $graphics $value $script:fontBodyBold (New-Brush "#0d1728") ($x + 18) ($y + 38) ($w - 36) 28 2 | Out-Null
  $white.Dispose()
  $border.Dispose()
}

# Draws a rounded status/label "pill" containing $text, sized to the text
# width, styled differently when $active (teal fill/text) vs inactive (pale
# fill, gray text). Returns the pill's rendered width.
function Draw-Pill($graphics, [string]$text, [float]$x, [float]$y, [bool]$active = $false) {
  $bg = if ($active) { "#e7f5f2" } else { "#f8fbff" }
  $fg = if ($active) { "#0f766e" } else { "#667385" }
  $brush = New-Brush $bg
  $pen = [System.Drawing.Pen]::new((New-Color "#d8e1ec"), 2)
  $width = $graphics.MeasureString($text, $script:fontSmallBold).Width + 34
  Draw-RoundedRect $graphics $brush $x $y $width 36 18
  Draw-RoundedOutline $graphics $pen $x $y $width 36 18
  $graphics.DrawString($text, $script:fontSmallBold, (New-Brush $fg), $x + 16, $y + 9)
  $brush.Dispose()
  $pen.Dispose()
  return $width
}

# Draws a mock browser window chrome (rounded frame, traffic-light dots,
# address bar showing $url) as a backdrop for a mocked-up app screen.
function Draw-Browser($graphics, [float]$x, [float]$y, [float]$w, [float]$h, [string]$url) {
  Draw-RoundedRect $graphics (New-Brush "#ffffff") $x $y $w $h 22
  Draw-RoundedOutline $graphics ([System.Drawing.Pen]::new((New-Color "#d8e1ec"), 2)) $x $y $w $h 22
  $graphics.FillRectangle((New-Brush "#f4f7fb"), $x, $y, $w, 58)
  foreach ($i in 0..2) {
    $colors = @("#d65b67", "#e4a93d", "#43ad72")
    $graphics.FillEllipse((New-Brush $colors[$i]), $x + 24 + ($i * 24), $y + 22, 14, 14)
  }
  Draw-RoundedRect $graphics (New-Brush "#ffffff") ($x + 116) ($y + 15) ($w - 146) 30 15
  $graphics.DrawString($url, $script:fontTiny, (New-Brush "#667385"), $x + 132, $y + 22)
}

# Draws the shared slide chrome: background, card frame, brand wordmark,
# eyebrow label, wrapped title/lead text from $slide, and the "Scene N/total"
# and caption footer text. Called before Draw-SceneVisual adds per-slide
# content on top.
function Draw-BaseSlide($graphics, $slide, [int]$number, [int]$total) {
  $graphics.Clear((New-Color "#eef3f8"))
  $graphics.FillRectangle((New-Brush "#fbfdff"), 70, 58, 1780, 964)
  Draw-RoundedOutline $graphics ([System.Drawing.Pen]::new((New-Color "#d8e1ec"), 2)) 70 58 1780 964 28
  $graphics.DrawString("AutoTime", $script:fontBrand, (New-Brush "#0f766e"), 118, 104)
  $graphics.DrawString("EU Apply", $script:fontBrand, (New-Brush "#0d1728"), 292, 104)
  $graphics.DrawString($slide.Eyebrow.ToUpperInvariant(), $script:fontSmallBold, (New-Brush "#0f766e"), 118, 174)
  Draw-WrappedText $graphics $slide.Title $script:fontTitle (New-Brush "#0d1728") 118 214 760 66 3 | Out-Null
  Draw-WrappedText $graphics $slide.Lead $script:fontLead (New-Brush "#667385") 120 460 690 38 5 | Out-Null
  $graphics.DrawString("Scene $number / $total", $script:fontSmallBold, (New-Brush "#667385"), 118, 952)
  $graphics.DrawString($slide.Caption, $script:fontSmallBold, (New-Brush "#667385"), 1450, 952)
}

# Draws the scene-specific mock UI illustration for slide $index (0-8): a
# hardcoded switch statement, one case per slide, using the helper drawing
# functions above to sketch product screens (Job Check summary, profile
# form, job analysis score, ATS import panel, application answers, tracker
# table, interview prep, pricing tiers, closing message).
function Draw-SceneVisual($graphics, [int]$index) {
  switch ($index) {
    0 {
      Draw-RoundedRect $graphics (New-Brush "#e7f5f2") 990 230 610 390 28
      $graphics.DrawString("Job Check", $script:fontH2, (New-Brush "#0d1728"), 1050, 290)
      $graphics.DrawString("Evidence-backed fit review", $script:fontLead, (New-Brush "#667385"), 1050, 350)
      Draw-Pill $graphics "Score" 1050 430 $true | Out-Null
      Draw-Pill $graphics "Reasons" 1160 430 $true | Out-Null
      Draw-Pill $graphics "Risks" 1290 430 $true | Out-Null
      Draw-Pill $graphics "Next action" 1400 430 $true | Out-Null
      $graphics.DrawString("Start with Job Check", $script:fontH2, (New-Brush "#0f766e"), 1050, 520)
    }
    1 {
      Draw-Browser $graphics 900 160 760 600 "/dashboard/profile"
      Draw-Field $graphics "Name" "Maya Patel" 940 250 310 92
      Draw-Field $graphics "Target roles" "Business Analyst, Product Analyst" 1270 250 340 92
      Draw-Field $graphics "Work rights" "UK citizen, no UK sponsorship needed" 940 366 670 92
      Draw-Field $graphics "Evidence" "CV text, projects, target countries and salary notes saved" 940 482 670 116
      Draw-RoundedRect $graphics (New-Brush "#e5f7ee") 940 630 670 72 14
      $graphics.DrawString("Evidence ready for AI review", $script:fontBodyBold, (New-Brush "#1d7a4d"), 962, 654)
    }
    2 {
      Draw-Browser $graphics 850 130 860 670 "/dashboard/jobs"
      Draw-Field $graphics "Role" "Business Systems Analyst" 890 225 350 82
      Draw-Field $graphics "Company" "Northstar Payments" 1260 225 380 82
      Draw-Field $graphics "Description" "Payments operations, SQL dashboards, stakeholder workshops, Dublin hybrid role..." 890 330 750 142
      $graphics.FillEllipse((New-Brush "#c8e8e2"), 925, 520, 170, 170)
      $graphics.FillEllipse((New-Brush "#ffffff"), 945, 540, 130, 130)
      $graphics.DrawString("78", $script:fontScore, (New-Brush "#0d1728"), 980, 575)
      $graphics.DrawString("Recommended with review", $script:fontH3, (New-Brush "#0d1728"), 1140, 532)
      Draw-WrappedText $graphics "Strong payments and SQL match. Ireland work authorisation needs manual confirmation." $script:fontBody (New-Brush "#667385") 1142 580 430 32 3 | Out-Null
    }
    3 {
      Draw-RoundedRect $graphics (New-Brush "#ffffff") 880 180 500 520 24
      $graphics.DrawString("Greenhouse job page", $script:fontSmallBold, (New-Brush "#0f766e"), 920, 225)
      $graphics.DrawString("Business Systems Analyst", $script:fontH3, (New-Brush "#0d1728"), 920, 270)
      Draw-WrappedText $graphics "Northstar Payments - Dublin, Ireland - Hybrid. Process mapping, payments operations, Jira and SQL reporting." $script:fontBody (New-Brush "#667385") 920 320 410 34 4 | Out-Null
      Draw-RoundedRect $graphics (New-Brush "#f4f7fb") 1420 180 300 520 22
      $graphics.DrawString("AutoTime EU Apply", $script:fontBodyBold, (New-Brush "#0d1728"), 1450, 220)
      Draw-Field $graphics "Detected" "Business Systems Analyst - Northstar Payments" 1450 275 240 106
      Draw-RoundedRect $graphics (New-Brush "#0f766e") 1450 420 240 48 10
      $graphics.DrawString("Import current job", $script:fontBodyBold, (New-Brush "#ffffff"), 1480, 432)
      Draw-RoundedRect $graphics (New-Brush "#ffffff") 1450 490 240 78 10
      Draw-WrappedText $graphics "LinkedIn remains manual copy/paste only." $script:fontSmallBold (New-Brush "#a86616") 1470 510 200 24 2 | Out-Null
    }
    4 {
      Draw-Browser $graphics 860 150 830 620 "/dashboard/application-answers"
      Draw-Field $graphics "Motivation answer" "I am interested in this role because it connects payments operations, stakeholder workshops and SQL-backed process improvement." 910 255 730 142
      Draw-Field $graphics "Strengths answer" "My strongest match is translating operational problems into clear product and systems requirements." 910 430 730 142
      Draw-RoundedRect $graphics (New-Brush "#0f766e") 910 620 220 52 10
      $graphics.DrawString("Save final answer", $script:fontBodyBold, (New-Brush "#ffffff"), 940, 635)
    }
    5 {
      Draw-Browser $graphics 860 170 830 560 "/dashboard/applications"
      $rows = @(
        @("Business Systems Analyst", "Saved", "Tailor CV"),
        @("Product Analyst", "Applied", "Follow up May 13"),
        @("Operations Analyst", "Interview", "Prep pack ready")
      )
      for ($r = 0; $r -lt $rows.Count; $r++) {
        $y = 280 + ($r * 104)
        Draw-RoundedRect $graphics (New-Brush "#ffffff") 915 $y 720 72 12
        $graphics.DrawString($rows[$r][0], $script:fontBodyBold, (New-Brush "#0d1728"), 940, $y + 22)
        Draw-Pill $graphics $rows[$r][1] 1210 ($y + 18) ($r -eq 0) | Out-Null
        $graphics.DrawString($rows[$r][2], $script:fontSmallBold, (New-Brush "#667385"), 1390, $y + 25)
      }
    }
    6 {
      Draw-Browser $graphics 860 155 830 600 "/dashboard/interview"
      Draw-RoundedRect $graphics (New-Brush "#ffffff") 910 250 330 330 16
      Draw-RoundedRect $graphics (New-Brush "#ffffff") 1280 250 330 330 16
      $graphics.DrawString("Likely questions", $script:fontH3, (New-Brush "#0d1728"), 940, 285)
      Draw-WrappedText $graphics "Tell us about a process you improved using data. How do you handle conflicting stakeholder requirements?" $script:fontBody (New-Brush "#667385") 940 340 260 34 5 | Out-Null
      $graphics.DrawString("Answer structure", $script:fontH3, (New-Brush "#0d1728"), 1310, 285)
      Draw-WrappedText $graphics "Situation, constraint, action, measured outcome and lesson. Use payments migration evidence." $script:fontBody (New-Brush "#667385") 1310 340 260 34 5 | Out-Null
    }
    7 {
      Draw-Browser $graphics 860 180 830 540 "/pricing"
      Draw-RoundedRect $graphics (New-Brush "#ffffff") 930 285 290 300 18
      Draw-RoundedRect $graphics (New-Brush "#e7f5f2") 1260 285 330 300 18
      $graphics.DrawString("Free", $script:fontH3, (New-Brush "#0d1728"), 970, 330)
      Draw-WrappedText $graphics "Local tracking and light AI usage." $script:fontBody (New-Brush "#667385") 970 382 210 30 3 | Out-Null
      $graphics.DrawString("Pro", $script:fontH3, (New-Brush "#0d1728"), 1300, 330)
      Draw-WrappedText $graphics "Cloud sync, unlimited AI, application content and interview prep." $script:fontBody (New-Brush "#667385") 1300 382 245 30 4 | Out-Null
      Draw-RoundedRect $graphics (New-Brush "#0f766e") 1300 500 220 50 10
      $graphics.DrawString("Start Pro", $script:fontBodyBold, (New-Brush "#ffffff"), 1360, 514)
    }
    8 {
      Draw-RoundedRect $graphics (New-Brush "#e7f5f2") 990 280 630 280 28
      $graphics.DrawString("Start with Job Check", $script:fontH2, (New-Brush "#0f766e"), 1050, 350)
      $graphics.DrawString("Apply with evidence", $script:fontH2, (New-Brush "#0d1728"), 1050, 420)
      $graphics.DrawString("Track every next action", $script:fontH2, (New-Brush "#315fba"), 1050, 490)
    }
  }
}

$slides = @(
  @{ Eyebrow = "First-time user walkthrough"; Title = "One workspace for serious UK/EU job search decisions"; Lead = "Check role fit, use evidence-backed AI, prepare applications, and track every next action without turning your search into a spreadsheet maze."; Caption = "Product promise"; Duration = 8; Script = "Applying across UK and EU roles gets messy fast. AutoTime EU Apply brings role fit, profile evidence, AI assistance, tracking, and interview prep into one workspace." },
  @{ Eyebrow = "Profile evidence"; Title = "Build a reusable profile the AI can trust"; Lead = "The product starts with facts: work rights, target roles, CV evidence, project examples, and relocation context."; Caption = "Evidence first, AI second"; Duration = 10; Script = "First, create a reusable candidate profile. The product works from facts: work rights, target roles, CV evidence, projects, and relocation context." },
  @{ Eyebrow = "Job Check"; Title = "Turn a job description into a decision"; Lead = "Paste the role details and let AutoTime structure the fit, gaps, risks, and next action."; Caption = "Score, reason, risk, next action"; Duration = 12; Script = "When you find a role, Job Check turns the description into a structured fit review: score, reasons, gaps, risks, and the next action." },
  @{ Eyebrow = "Chrome extension"; Title = "Bring the workflow onto ATS job boards"; Lead = "Supported platforms can be detected and imported. LinkedIn stays manual copy and paste only so the user remains in control."; Caption = "ATS import with conservative controls"; Duration = 12; Script = "The Chrome extension brings the workflow onto supported ATS job boards. LinkedIn stays manual copy and paste only, keeping the user in control." },
  @{ Eyebrow = "Application content"; Title = "Draft answers from real evidence"; Lead = "AutoTime generates editable content from the profile and job analysis. It should assist the candidate, not invent their background."; Caption = "User-controlled drafting"; Duration = 12; Script = "Once the profile and role are ready, AutoTime drafts application content from real evidence. The user reviews, edits, and saves the final answer." },
  @{ Eyebrow = "Tracker"; Title = "Keep every role and follow-up visible"; Lead = "Serious job searching is operational. The tracker keeps role status, notes, source, next action, and follow-up dates in one place."; Caption = "Status, notes, next actions"; Duration = 12; Script = "Every role can be tracked with status, source, notes, next action, and follow-up date, so the search stays operational across weeks." },
  @{ Eyebrow = "Interview prep"; Title = "Prepare for the role that progresses"; Lead = "Interview Prep converts saved role context into likely questions, answer structure, risks to prepare for, and questions for the employer."; Caption = "Role-specific readiness"; Duration = 12; Script = "When a role progresses, Interview Prep creates likely questions, answer structure, risks to prepare for, and employer questions." },
  @{ Eyebrow = "Pro workflow"; Title = "Upgrade when the search becomes serious"; Lead = "Free is enough to start. Pro unlocks cloud sync, unlimited AI job analysis, application content, and interview prep for higher search volume."; Caption = "Clear upgrade path"; Duration = 12; Script = "Free is enough to start. Pro is for serious search volume: cloud sync, unlimited AI analysis, application content, and interview prep." },
  @{ Eyebrow = "Final message"; Title = "Not a magic apply button. A serious copilot for better job search decisions."; Lead = "Start with Job Check. Apply with evidence. Track every next action."; Caption = "End card"; Duration = 8; Script = "AutoTime EU Apply is not a magic apply button. It is a serious copilot for better, faster, evidence-backed job search decisions." }
)

$script:fontBrand = [System.Drawing.Font]::new("Segoe UI", 26, [System.Drawing.FontStyle]::Bold)
$script:fontTitle = [System.Drawing.Font]::new("Segoe UI", 45, [System.Drawing.FontStyle]::Bold)
$script:fontH2 = [System.Drawing.Font]::new("Segoe UI", 32, [System.Drawing.FontStyle]::Bold)
$script:fontH3 = [System.Drawing.Font]::new("Segoe UI", 22, [System.Drawing.FontStyle]::Bold)
$script:fontLead = [System.Drawing.Font]::new("Segoe UI", 21, [System.Drawing.FontStyle]::Regular)
$script:fontBody = [System.Drawing.Font]::new("Segoe UI", 17, [System.Drawing.FontStyle]::Regular)
$script:fontBodyBold = [System.Drawing.Font]::new("Segoe UI", 17, [System.Drawing.FontStyle]::Bold)
$script:fontSmallBold = [System.Drawing.Font]::new("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
$script:fontTiny = [System.Drawing.Font]::new("Segoe UI", 10, [System.Drawing.FontStyle]::Regular)
$script:fontScore = [System.Drawing.Font]::new("Segoe UI", 38, [System.Drawing.FontStyle]::Bold)

$slideFiles = @()
for ($i = 0; $i -lt $slides.Count; $i++) {
  $bitmap = [System.Drawing.Bitmap]::new(1920, 1080)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
  Draw-BaseSlide $graphics $slides[$i] ($i + 1) $slides.Count
  Draw-SceneVisual $graphics $i
  $path = Join-Path $slidesDir ("slide-{0:D2}.png" -f ($i + 1))
  $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose()
  $bitmap.Dispose()
  $slideFiles += $path
}

$narrationPath = Join-Path $audioDir "narration.wav"
$narrationCreated = $false
try {
  Add-Type -AssemblyName System.Speech
  $synth = [System.Speech.Synthesis.SpeechSynthesizer]::new()
  $synth.Rate = 0
  $synth.Volume = 100
  $synth.SetOutputToWaveFile($narrationPath)
  $synth.Speak(($slides | ForEach-Object { $_.Script }) -join " ")
  $synth.SetOutputToNull()
  $synth.Dispose()
  $narrationCreated = Test-Path $narrationPath
} catch {
  Write-Warning "Narration generation failed. Rendering silent video. $($_.Exception.Message)"
}

$concatPath = Join-Path $generatedDir "slides.concat.txt"
$concatLines = New-Object System.Collections.Generic.List[string]
for ($i = 0; $i -lt $slideFiles.Count; $i++) {
  $safePath = $slideFiles[$i].Replace("\", "/").Replace("'", "'\''")
  $concatLines.Add("file '$safePath'")
  $concatLines.Add("duration $($slides[$i].Duration)")
}
$lastPath = $slideFiles[-1].Replace("\", "/").Replace("'", "'\''")
$concatLines.Add("file '$lastPath'")
Set-Content -Path $concatPath -Value $concatLines -Encoding ASCII

$resolvedOutput = Join-Path $repoRoot $OutputPath
New-Item -ItemType Directory -Force -Path (Split-Path $resolvedOutput -Parent) | Out-Null

if ($narrationCreated) {
  & $ffmpegPath -y -f concat -safe 0 -i $concatPath -i $narrationPath -c:v libx264 -pix_fmt yuv420p -vf "fps=30,format=yuv420p" -c:a aac -b:a 160k -movflags +faststart $resolvedOutput
} else {
  & $ffmpegPath -y -f concat -safe 0 -i $concatPath -c:v libx264 -pix_fmt yuv420p -vf "fps=30,format=yuv420p" -movflags +faststart $resolvedOutput
}

Write-Host "Demo video created: $resolvedOutput"
