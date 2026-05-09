# Agent Instructions

## Project Context

This workspace is for building a Warlords Battlecry III character build planner from an existing spreadsheet and verified game mechanics data.

The desired end state is a usable program, likely a TypeScript and React application, that lets the user build a character through a clear interface.

## Instruction File Scope

- Use this root `AGENTS.md` for the overall planner project.
- Keep private reference material out of public project files.
- Treat comparison-only material as private local context and do not document its path unless explicitly requested.
- Keep WBC3 mechanics discoveries in `docs/` with sanitized references only.
- Keep product, architecture, UI, data-model, and app workflow decisions here.

## Working Principles

- Treat the shipped WBC3 source and verified installed game assets as the authority for planner behavior.
- Treat alternate local source trees and comparison-only code as private context only; do not use them to drive planner behavior or data changes unless the user explicitly asks.
- When shipped WBC3 source, installed assets, spreadsheet logic, and comparison-only material disagree, prefer shipped WBC3 source/verified game assets and document the disagreement before choosing behavior.
- Treat the spreadsheet as a useful reference for structure, formulas, and user expectations.
- Keep extracted game data separate from UI code.
- Prefer explicit data models over spreadsheet-like hidden logic.
- Preserve user-facing terminology from the game where possible.
- Prefer small, verifiable slices over trying to port the whole spreadsheet at once.
- When spreadsheet logic and verified game behavior disagree, document the disagreement before choosing a behavior.

## Likely Architecture

- `data/`: normalized game data such as races, classes, skills, stats, and prerequisites.
- `src/rules/`: build validation, stat calculations, and progression logic.
- `src/ui/` or `src/components/`: React components for the planner interface.
- `src/types/`: shared TypeScript types.
- `docs/`: notes from spreadsheet and mechanics analysis.

## Proposed App Stack

- TypeScript for the rules engine and data model.
- React for the character builder UI.
- Vite for development.
- Vitest or an equivalent lightweight test runner for rule and formula tests.
- JSON or TypeScript modules for extracted game data.
- Optional later wrapper: Tauri or Electron for a Windows desktop app.

## Data Workflow

1. Inspect the workbook tabs, formulas, named ranges, and validation lists.
2. Identify the matching private reference systems locally without publishing their paths or filenames.
3. Extract or manually normalize game data into stable data files.
4. Recreate spreadsheet calculations as explicit TypeScript rule functions.
5. Add tests that compare known spreadsheet examples against the TypeScript output.
6. Build the UI around the tested rules, not around copied spreadsheet cells.

## Coding Preferences

- Use TypeScript for application logic.
- Use React for the UI unless the user chooses another stack.
- Keep rule calculations testable outside the UI.
- Add focused tests for formulas, prerequisites, and build legality.
- Avoid broad refactors unless they directly support the planner.
- Keep UI components separate from mechanics and validation logic.
- Avoid encoding important game rules only in display components.
- Prefer descriptive type names such as `HeroClass`, `Race`, `SkillRank`, `BuildChoice`, and `CharacterBuild`.
- Preserve original game labels in data, and add normalized IDs separately.

## UI Goals

- The first usable screen should be the actual character builder, not a landing page.
- Make common choices easy to scan: race, class, level, skills, stats, and summary.
- Show invalid choices with a clear reason.
- Keep derived values visible near the choices that affect them.
- Support iteration: the user should be able to adjust a build quickly without losing context.

## Open Inputs

- Spreadsheet location: `C:\Users\timot\Desktop\Warlords Battlecry III - Build Planner.xlsx`
- Local saved hero archive: `C:\Users\timot\Documents\Warlords Battlecry III\HeroData.xcr`
- Steam install portrait archive: `C:\Program Files (x86)\Steam\steamapps\common\Warlords Battlecry III\Assets\Heroes\Portraits.xcr`
- Private reference folders are local-only and must not be published or named in public files.

## Near-Term Tasks

1. Inspect the spreadsheet structure and summarize its tabs and core formulas.
2. Inspect private reference materials for character creation, hero classes, races, stats, skills, and level progression.
3. Create a first data-model draft in `docs/` before implementing the app.
4. Scaffold the TypeScript/React app after the data model is clear enough to support a first vertical slice.
