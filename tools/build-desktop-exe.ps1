[CmdletBinding()]
param(
  [string]$OutPath
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$LauncherCode = Join-Path $Root "tools\desktop\Wbc3PlannerLauncher.cs"

if ([string]::IsNullOrWhiteSpace($OutPath)) {
  $OutPath = Join-Path $Root "WBC3 Planner.exe"
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

$arguments = @(
  "/nologo",
  "/target:winexe",
  "/platform:anycpu",
  "/optimize+",
  "/reference:System.Windows.Forms.dll",
  "/reference:System.Management.dll",
  "/out:$OutPath",
  $LauncherCode
)

& $Compiler @arguments
if ($LASTEXITCODE -ne 0) {
  throw "Desktop launcher compilation failed."
}

Write-Host "Built desktop launcher at $OutPath"
