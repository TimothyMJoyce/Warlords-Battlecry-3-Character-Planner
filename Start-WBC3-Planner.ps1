[CmdletBinding()]
param(
  [switch]$RefreshLocalData,
  [int]$Port = 5173
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Dist = Join-Path $Root "dist"
$ServerUrlFile = Join-Path $Dist "server-url.txt"
$PidFile = Join-Path $Dist "server.pid"

function Join-IfRoot {
  param(
    [string]$Base,
    [string]$Child
  )

  if ([string]::IsNullOrWhiteSpace($Base)) {
    return $null
  }

  Join-Path $Base $Child
}

function Find-Node {
  $command = Get-Command node -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Path
  }

  $candidates = @(
    (Join-IfRoot $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"),
    (Join-IfRoot $env:LOCALAPPDATA "Programs\nodejs\node.exe"),
    (Join-IfRoot $env:ProgramFiles "nodejs\node.exe"),
    (Join-IfRoot ${env:ProgramFiles(x86)} "nodejs\node.exe")
  ) | Where-Object { $_ }

  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath $candidate) {
      return $candidate
    }
  }

  throw "Node.js was not found. Install Node.js, then run this launcher again."
}

function Find-Edge {
  $command = Get-Command msedge -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Path
  }

  $candidates = @(
    (Join-IfRoot ${env:ProgramFiles(x86)} "Microsoft\Edge\Application\msedge.exe"),
    (Join-IfRoot $env:ProgramFiles "Microsoft\Edge\Application\msedge.exe"),
    (Join-IfRoot $env:LOCALAPPDATA "Microsoft\Edge\Application\msedge.exe")
  ) | Where-Object { $_ }

  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath $candidate) {
      return $candidate
    }
  }

  return $null
}

function Stop-ExistingPlannerServer {
  if (!(Test-Path -LiteralPath $PidFile)) {
    return
  }

  $oldPidText = Get-Content -LiteralPath $PidFile -TotalCount 1
  $oldPid = 0
  if (![int]::TryParse($oldPidText, [ref]$oldPid)) {
    Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
    return
  }

  $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $oldPid" -ErrorAction SilentlyContinue
  if ($processInfo -and $processInfo.CommandLine -like "*tools*server.mjs*") {
    Stop-Process -Id $oldPid -Force -ErrorAction SilentlyContinue
  }

  Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
}

function Run-OptionalTool {
  param([string]$ScriptPath)

  try {
    & $Node $ScriptPath
  } catch {
    Write-Warning "Skipped $(Split-Path -Leaf $ScriptPath): $($_.Exception.Message)"
  }
}

function Wait-ForServerUrl {
  param([System.Diagnostics.Process]$ServerProcess)

  for ($index = 0; $index -lt 80; $index += 1) {
    Start-Sleep -Milliseconds 100

    if (Test-Path -LiteralPath $ServerUrlFile) {
      $url = (Get-Content -LiteralPath $ServerUrlFile -TotalCount 1).Trim()
      if ($url) {
        return $url
      }
    }

    $ServerProcess.Refresh()
    if ($ServerProcess.HasExited) {
      throw "The planner server exited before it wrote a URL."
    }
  }

  throw "Timed out waiting for the planner server to start."
}

New-Item -ItemType Directory -Path $Dist -Force | Out-Null
Remove-Item -LiteralPath $ServerUrlFile -Force -ErrorAction SilentlyContinue

$Node = Find-Node
Push-Location $Root
try {
  if ($RefreshLocalData) {
    Run-OptionalTool (Join-Path $Root "tools\import-hero-data.mjs")
    Run-OptionalTool (Join-Path $Root "tools\extract-portraits.mjs")
    Run-OptionalTool (Join-Path $Root "tools\extract-ui-icons.mjs")
  }

  Stop-ExistingPlannerServer

  $env:PORT = [string]$Port
  $serverScript = Join-Path $Root "tools\server.mjs"
  $server = Start-Process -FilePath $Node -ArgumentList @($serverScript) -WorkingDirectory $Root -WindowStyle Hidden -PassThru
  Set-Content -LiteralPath $PidFile -Value $server.Id

  $url = Wait-ForServerUrl $server
  $edge = Find-Edge

  if ($edge) {
    Start-Process -FilePath $edge -ArgumentList @("--app=$url", "--new-window")
  } else {
    Start-Process $url
  }

  Write-Host "WBC3 planner is running at $url"
  Write-Host "Close the app window when finished. Run Stop-WBC3-Planner.ps1 to stop the local server."
} finally {
  Pop-Location
}
