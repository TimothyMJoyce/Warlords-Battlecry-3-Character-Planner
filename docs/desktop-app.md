# Desktop App Notes

The first desktop setup uses the existing dependency-free Node server as a local backend and opens the planner in an Edge app window.

## Why This Shape

- A hosted website cannot automatically read the user's registry, Steam folder, or HeroData files.
- A localhost backend can read local files with normal Windows permissions.
- Binding the server to `127.0.0.1` keeps access local to the user's machine.
- This avoids adding Electron or Tauri before the app needs packaging.

## Files

- `WBC3 Planner.exe`: native Windows launcher built from `tools/desktop/Wbc3PlannerLauncher.cs`.
- `tools/build-desktop-exe.ps1`: builds the launcher EXE with the Windows .NET Framework compiler.
- `Start-WBC3-Planner.ps1`: starts the local server and opens the app window.
- `Stop-WBC3-Planner.ps1`: stops a server started by the launcher.
- `tools/server.mjs`: serves the app and exposes local-only read APIs.
- `tools/wbc3-paths.mjs`: detects WBC3 install, HeroData, Portraits, and Graphics archives.

## Local API

`GET /api/local/paths` returns whether the desktop server found:

- Game install directory.
- HeroData archive.
- Portrait archive.
- Graphics archive.

This endpoint is read-only. It does not modify HeroData.

## Future EXE Path

The current EXE is a launcher, not a bundled installer. It expects the planner files to be next to it and Node.js to be available. If the planner needs an installer or single bundled application, use the same server and UI behind either:

- Tauri, for a smaller Windows desktop app.
- Electron, for the simplest web-to-desktop packaging path.

Tauri is the better long-term default unless the app needs Electron-specific behavior.
