$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$PidFile = Join-Path $Root "dist\server.pid"

if (!(Test-Path -LiteralPath $PidFile)) {
  Write-Host "No WBC3 planner server pid file was found."
  exit 0
}

$pidText = Get-Content -LiteralPath $PidFile -TotalCount 1
$plannerPid = 0
if (![int]::TryParse($pidText, [ref]$plannerPid)) {
  Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
  Write-Host "Removed an invalid planner pid file."
  exit 0
}

$processInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $plannerPid" -ErrorAction SilentlyContinue
if ($processInfo -and $processInfo.CommandLine -like "*tools*server.mjs*") {
  Stop-Process -Id $plannerPid -Force -ErrorAction SilentlyContinue
  Write-Host "Stopped WBC3 planner server process $plannerPid."
} else {
  Write-Host "No matching WBC3 planner server process was running."
}

Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
