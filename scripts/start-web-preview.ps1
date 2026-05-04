$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$patterns = @(
  "next dev",
  "pnpm --filter web dev",
  "pnpm dev:web"
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

Write-Host "Starting AutoTime V2 web preview at http://127.0.0.1:3000"
pnpm --filter web dev
