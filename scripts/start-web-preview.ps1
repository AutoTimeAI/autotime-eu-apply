# Restarts the local AutoTime V2 web preview server cleanly, so a stale dev
# or start process left running on port 3000 doesn't collide with a new one.
# Run via `pnpm dev:web:reset` (development mode) or `pnpm preview:web`
# (production mode, `-Mode production`).
#
# Side effects: force-kills any running process in this repo whose command
# line matches known Next.js dev/start invocations, then (in production
# mode) runs `pnpm build:web` if no build output exists yet at
# `apps/web/.next/BUILD_ID`, and finally starts `pnpm --filter web dev` or
# `pnpm --filter web start` in the foreground, serving at
# http://127.0.0.1:3000.
param(
  [ValidateSet("development", "production")]
  [string]$Mode = "development"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$patterns = @(
  "next dev",
  "next start",
  "pnpm --filter web dev",
  "pnpm --filter web start",
  "pnpm dev:web",
  "pnpm preview:web"
)

$processes = Get-CimInstance Win32_Process |
  Where-Object {
    $commandLine = $_.CommandLine
    if (-not $commandLine) {
      return $false
    }

    $inRepo = $commandLine -like "*$repoRoot*" -or
      $commandLine -like "*apps\web*"
    $isWebPreview = $patterns | Where-Object {
      $commandLine -like "*$_*"
    }

    return $inRepo -and $isWebPreview
  }

foreach ($process in $processes) {
  Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
}

if ($Mode -eq "production") {
  $buildManifest = Join-Path $repoRoot "apps\web\.next\BUILD_ID"

  if (-not (Test-Path $buildManifest)) {
    Write-Host "No production web build found. Building once..."
    pnpm build:web
  }

  Write-Host "Starting AutoTime V2 production preview at http://127.0.0.1:3000"
  pnpm --filter web start
} else {
  Write-Host "Starting AutoTime V2 dev preview at http://127.0.0.1:3000"
  pnpm --filter web dev
}
