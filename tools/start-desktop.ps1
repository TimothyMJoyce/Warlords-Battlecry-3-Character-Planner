[CmdletBinding()]
param(
  [switch]$RefreshLocalData,
  [switch]$Stop,
  [switch]$NoOpen,
  [int]$Port = 5173
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$ExePath = Join-Path $Root "build\WBC3 Planner.exe"

if (!(Test-Path -LiteralPath $ExePath)) {
  throw "Could not find build\WBC3 Planner.exe. Run npm run build:desktop when you intentionally want to create a new executable."
}

$arguments = @()
if ($RefreshLocalData) {
  $arguments += "--refresh"
}
if ($Stop) {
  $arguments += "--stop"
}
if ($NoOpen) {
  $arguments += "--no-open"
}
if ($Port -ne 5173) {
  $arguments += @("--port", $Port.ToString())
}

& $ExePath @arguments
exit $LASTEXITCODE
