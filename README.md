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

Double-click `build\WBC3 Planner.exe` to run the planner like a portable desktop app. It contains the planner files and Node runtime, extracts them to the current user's local app-data cache, starts the local planner server on `127.0.0.1`, opens Microsoft Edge in app-window mode, and imports local HeroData at runtime when available.

Build the portable EXE with:

```powershell
.\Build-WBC3-Planner.bat
```

The portable EXE does not need Node.js or the project folder beside it. It still uses the target computer's local WBC3 install and HeroData when those are available.

To stop a background planner server from the command line:

```powershell
& ".\build\WBC3 Planner.exe" --stop
```

## Reference Material

- Spreadsheet planner: `C:\Users\timot\Desktop\Warlords Battlecry III - Build Planner.xlsx`
- Private mechanics references are local-only and are not named in public project files.

## Implemented Slice

1. Verified race, class, and skill data.
2. Verified starting stats, XP thresholds, skill merge behavior, and core derived stats.
3. Character builder UI for race, class, level, stat allocation, skill allocation, and summary values.
4. Node-based tests for extracted mechanics.
5. Saved-build list imported from `HeroData.xcr` at runtime when available.
6. Portrait images extracted from the installed game assets when available.
