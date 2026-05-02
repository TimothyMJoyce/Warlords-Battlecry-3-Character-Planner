# Character Planner Expansion Roadmap

This is a working list of planner systems that are not fully modelled yet. The current app focuses on hero creation, level progression, primary stat allocation, career skill allocation, derived hero stats, saved builds, portraits, and local hero imports.

Keep future additions verified against game behavior before making them visible as planner rules.

## Spells And Spellbooks

- Spell lists by magic sphere, including spell level, name, description, targeting rules, mana cost, cast chance, and cooldown or repeat timing.
- Spell unlock rules from magic skill rank, including edge cases for rank 0 and high rank scaling.
- Spell effect formulas such as damage, healing, summon strength, duration, radius, projectile behavior, buffs, debuffs, and dispel rules.
- Spellbook save/import fields, if known heroes can carry learned spells separately from skill ranks.
- UI ideas: spell tab filtered by known spheres, spell details beside each magic skill, and warnings for spells not available at the selected skill rank.

## Items And Equipment

- Equipment slots and whether heroes can equip multiple item types at once.
- Item stat bonuses, skill bonuses, resistance bonuses, special effects, and active-use effects.
- Item restrictions by class, race, alignment, level, or item category.
- Artifact and unique item handling, including duplicate rules and campaign-only rewards.
- Save/import fields for carried or equipped items.
- UI ideas: equipment panel, item search/filter, total stat deltas, and compare-before/after rows.

## Combat Details

- Full hit, miss, critical hit, assassination, deathblow, armor ignore, and target immunity rules.
- Melee versus ranged attack behavior, including range, projectile type, damage type, splash, fire missile behavior, and night-only bonuses.
- Damage resistance interactions for piercing, slashing, crushing, fire, cold, electricity, and magic.
- Target category bonuses such as vs humans, undead, dragons, daemons, buildings, large targets, small targets, good, and evil.
- UI ideas: optional combat breakdown panel and simple target selector to preview adjusted damage.

## Troops And Retinue

- Retinue slot rules, setup points, troop costs, carried troop data, and restrictions.
- Initial troop XP rules from Intelligence and career skills, including unit-category mappings.
- Army limit, group limit, command radius, morale effects, and buff persistence are partly shown now, but need unit-side preview.
- Unit attack speed, morale, command effect, and race/class bonuses should be verified for actual unit application.
- UI ideas: retinue builder, troop XP preview, command aura preview, and army capacity summary.

## Economy And Resources

- Gold, stone, metal, and crystal income from skills and any campaign modifiers.
- Merchant pricing, trade rate, potion effects, setup points, and non-combat utility bonuses.
- Whether economy values are hero-only, army-wide, campaign-only, or active during skirmish.
- UI ideas: economy panel that only appears when the build has relevant skills.

## Conversion And Command

- Conversion time is currently shown beside command radius because it is a practical command-adjacent hero value.
- Additional conversion modifiers still need mapping, including target type, buildings, special units, campaign modifiers, and immunity rules.
- Command radius and conversion range should continue to be treated carefully because the visible planner value may not describe every internal use.
- UI ideas: conversion preview with target type selector and a concise explanation tooltip.

## Save Import And Export

- Imported hero data currently covers identity, race, class, level, portrait, primary stats, skill ranks, and a few original fields.
- Missing import fields may include inventory, learned spells, campaign flags, retinue, difficulty/mode flags, custom names with unusual characters, and unknown reserved bytes.
- More defensive parsing can be added as more sample hero files are tested.
- UI ideas: import diagnostics, exportable planner JSON, shareable build strings, and a restore point before overwriting any saved planner build.

## UI Quality Of Life

- Build comparison view.
- Search and filters for skills, spells, items, and troop effects.
- More tooltips that explain formulas without cluttering the compact panels.
- Optional advanced mode for hidden or situational stats.
- Validation messages grouped by severity: impossible, over budget, locked, and informational.

## Open Verification Notes

- Dexterity appears to have a conversion-time text hook, but the currently modelled runtime behavior does not apply Dexterity to conversion time.
- Very high attack speed can underflow in raw timing math, so the planner uses a one millisecond fallback instead of hiding the value.
- Command effect is displayed as seconds because it controls how long the command buff remains after units leave the hero command radius.
- Keep public documentation free of private reference paths and implementation file names.
