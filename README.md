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
