[CmdletBinding()]
param(
  [string]$OutPath,
  [string]$NodePath
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$LauncherCode = Join-Path $Root "tools\desktop\Wbc3PlannerLauncher.cs"
$BuildRoot = Join-Path $Root "build"
$PayloadRoot = Join-Path $BuildRoot "portable-payload"
$PayloadZip = Join-Path $BuildRoot "planner-payload.zip"

if ([string]::IsNullOrWhiteSpace($OutPath)) {
  $OutPath = Join-Path $Root "WBC3 Planner.exe"
}

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

function Find-NodeRuntime {
  if (![string]::IsNullOrWhiteSpace($NodePath) -and (Test-Path -LiteralPath $NodePath)) {
    return (Resolve-Path -LiteralPath $NodePath).Path
  }

  $command = Get-Command node -ErrorAction SilentlyContinue
  if ($command -and (Test-Path -LiteralPath $command.Path)) {
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
      return (Resolve-Path -LiteralPath $candidate).Path
    }
  }

  throw "Could not find node.exe to bundle."
}

function Copy-RequiredPath {
  param([string]$RelativePath)

  $from = Join-Path $Root $RelativePath
  $to = Join-Path $PayloadRoot $RelativePath

  if (!(Test-Path -LiteralPath $from)) {
    throw "Missing required path: $RelativePath"
  }

  New-Item -ItemType Directory -Path (Split-Path -Parent $to) -Force | Out-Null
  Copy-Item -LiteralPath $from -Destination $to -Recurse -Force
}

function Copy-OptionalPath {
  param([string]$RelativePath)

  $from = Join-Path $Root $RelativePath
  if (!(Test-Path -LiteralPath $from)) {
    return
  }

  $to = Join-Path $PayloadRoot $RelativePath
  New-Item -ItemType Directory -Path (Split-Path -Parent $to) -Force | Out-Null
  Copy-Item -LiteralPath $from -Destination $to -Recurse -Force
}

$candidates = @(
  (Join-Path $env:WINDIR "Microsoft.NET\Framework64\v4.0.30319\csc.exe"),
  (Join-Path $env:WINDIR "Microsoft.NET\Framework\v4.0.30319\csc.exe")
)

$Compiler = $null
foreach ($candidate in $candidates) {
  if (Test-Path -LiteralPath $candidate) {
    $Compiler = $candidate
    break
  }
}

if (!$Compiler) {
  throw "Could not find the .NET Framework C# compiler."
}

New-Item -ItemType Directory -Path (Split-Path -Parent $OutPath) -Force | Out-Null
New-Item -ItemType Directory -Path $BuildRoot -Force | Out-Null

if (Test-Path -LiteralPath $PayloadRoot) {
  Remove-Item -LiteralPath $PayloadRoot -Recurse -Force
}
if (Test-Path -LiteralPath $PayloadZip) {
  Remove-Item -LiteralPath $PayloadZip -Force
}

New-Item -ItemType Directory -Path $PayloadRoot -Force | Out-Null

Copy-RequiredPath "index.html"
Copy-RequiredPath "src\app.js"
Copy-RequiredPath "src\styles.css"
Copy-RequiredPath "src\data"
Copy-RequiredPath "src\rules"
Copy-RequiredPath "tools\server.mjs"
Copy-RequiredPath "tools\wbc3-paths.mjs"
Copy-RequiredPath "tools\hero-data-reader.mjs"
Copy-RequiredPath "tools\import-hero-data.mjs"
Copy-RequiredPath "tools\extract-portraits.mjs"
Copy-RequiredPath "tools\extract-ui-icons.mjs"
Copy-OptionalPath "src\assets"

$BundledNode = Find-NodeRuntime
$RuntimeDir = Join-Path $PayloadRoot "runtime"
New-Item -ItemType Directory -Path $RuntimeDir -Force | Out-Null
Copy-Item -LiteralPath $BundledNode -Destination (Join-Path $RuntimeDir "node.exe") -Force

Compress-Archive -Path (Join-Path $PayloadRoot "*") -DestinationPath $PayloadZip -CompressionLevel Optimal -Force

$arguments = @(
  "/nologo",
  "/target:winexe",
  "/platform:anycpu",
  "/optimize+",
  "/reference:System.Windows.Forms.dll",
  "/reference:System.IO.Compression.dll",
  "/reference:System.IO.Compression.FileSystem.dll",
  "/resource:$PayloadZip,Wbc3Planner.Payload.zip",
  "/out:$OutPath",
  $LauncherCode
)

& $Compiler @arguments
if ($LASTEXITCODE -ne 0) {
  throw "Desktop launcher compilation failed."
}

Write-Host "Built portable desktop launcher at $OutPath"
Write-Host "Bundled payload: $PayloadZip"
