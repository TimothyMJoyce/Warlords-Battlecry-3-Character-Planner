# Desktop App Notes

The desktop setup bundles the dependency-free Node server and planner files into a portable Windows launcher that opens the planner in an Edge app window.

## Why This Shape

- A hosted website cannot automatically read the user's registry, Steam folder, or HeroData files.
- A localhost backend can read local files with normal Windows permissions.
- Binding the server to `127.0.0.1` keeps access local to the user's machine.
- This avoids adding Electron or Tauri before the app needs packaging.

## Files

- `build\WBC3 Planner.exe`: portable Windows launcher built from `tools/desktop/Wbc3PlannerLauncher.cs`.
- `Build-WBC3-Planner.bat`: builds the portable EXE into `build\`.
- `tools/build-desktop-exe.ps1`: assembles the bundled payload and builds `build\WBC3 Planner.exe` with the Windows .NET Framework compiler.
- `tools/start-desktop.ps1`: starts the built launcher without rebuilding it. Use `-RefreshLocalData` to re-import local data, or `-Stop` to stop a server started by the launcher.
- `tools/server.mjs`: serves the app and exposes local-only read APIs.
- `tools/wbc3-paths.mjs`: detects WBC3 install, HeroData, Portraits, and Graphics archives.

## Local Hero Imports

- `src\data\importedHeroBuilds.js` is a committed empty fallback so the app works from a clean checkout.
- `tools/import-hero-data.mjs` writes personal imports to ignored `src\data\importedHeroBuilds.local.js`.
- Build scripts remove `importedHeroBuilds.local.js` from `dist\` and the portable payload so local hero data is not bundled by accident.

## Local API

`GET /api/local/paths` returns whether the desktop server found:

- Game install directory.
- HeroData archive.
- Portrait archive.
- Graphics archive.

This endpoint is read-only. It does not modify HeroData.

## Future EXE Path

The current EXE is portable but not an installer. It extracts its bundled runtime to the current user's local app-data cache. If the planner needs a conventional installer, use the same server and UI behind either:

- Tauri, for a smaller Windows desktop app.
- Electron, for the simplest web-to-desktop packaging path.

Tauri is the better long-term default unless the app needs Electron-specific behavior.
