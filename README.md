# Warlords Battlecry III Build Planner

This project is intended to turn the existing spreadsheet build planner into a program with a user interface for creating and validating Warlords Battlecry III character builds.

## Goal

Build an interactive character planner that can:

- Create a character build from game data.
- Show available races, classes, skills, stats, and progression choices.
- Validate choices against game rules and prerequisites.
- Summarize the final build clearly.
- Preserve the useful logic from the spreadsheet while using verified game mechanics as the authority.

## Current Implementation

The first working version is a browser-based planner with verified game data and rules. It is currently dependency-free so it can run in this workspace even though npm is not available in the local shell.

Run it with the bundled or system Node.js:

```powershell
node tools/test.mjs
node tools/extract-portraits.mjs
node tools/import-hero-data.mjs
node tools/build.mjs
node tools/server.mjs
```

Then open `http://127.0.0.1:5173`.

The extraction tools auto-detect the game install on Windows by checking the registry, Steam library folders, and common Steam paths. You can still pass an archive path explicitly, or set `WBC3_INSTALL_DIR` / `WBC3_HERO_DATA_PATH` when needed.

## Desktop Mode

Double-click `WBC3 Planner.exe` to run the planner like a desktop app. It starts the local planner server on `127.0.0.1`, opens Microsoft Edge in app-window mode, and shows a Local Files menu when the server can detect the game install, HeroData, portrait archive, and graphics archive.

Build the launcher EXE with:

```powershell
.\tools\build-desktop-exe.ps1
```

To refresh local HeroData and extracted assets before opening, run:

```powershell
.\Start-WBC3-Planner.ps1 -RefreshLocalData
```

To stop the background local server, run:

```powershell
.\Stop-WBC3-Planner.ps1
```

Or run:

```powershell
.\WBC3 Planner.exe --stop
```

This EXE is a lightweight launcher. It still expects the planner files to be next to it and Node.js to be installed, unless it is being run on this Codex machine where the bundled Codex Node runtime is available. A later Tauri or Electron wrapper can turn the same local backend into a single installed app.

## Reference Material

- Spreadsheet planner: `C:\Users\timot\Desktop\Warlords Battlecry III - Build Planner.xlsx`
- Private mechanics references are local-only and are not named in public project files.

## Implemented Slice

1. Verified race, class, and skill data.
2. Verified starting stats, XP thresholds, skill merge behavior, and core derived stats.
3. Character builder UI for race, class, level, stat allocation, skill allocation, and summary values.
4. Node-based tests for extracted mechanics.
5. Saved-build list seeded from `HeroData.xcr` when available.
6. Portrait images extracted from the Steam install `Assets\Heroes\Portraits.xcr`.
