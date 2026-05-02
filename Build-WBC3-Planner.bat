@echo off
setlocal

set "ROOT=%~dp0"
set "OUTDIR=%ROOT%build"
set "OUTEXE=%OUTDIR%\WBC3 Planner.exe"

if not exist "%OUTDIR%" mkdir "%OUTDIR%"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%ROOT%tools\build-desktop-exe.ps1" -OutPath "%OUTEXE%"
if errorlevel 1 (
  echo.
  echo Build failed.
  pause
  exit /b 1
)

echo.
echo Built portable planner "%OUTEXE%"
pause
