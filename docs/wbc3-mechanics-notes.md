# WBC3 Mechanics Notes

Planner values are based on verified Warlords Battlecry III mechanics data. Private reference material and local-only paths are intentionally not named in this repository.

The Excel workbook remains a reference for the desired planner workflow and visible outputs, not the authority for values.

## Important Mechanics

- WBC3 has 16 hero races and 29 hero classes represented in the planner.
- New heroes start from `5 + race stat modifier + class stat modifier`.
- Each gained level grants one stat point and one skill point.
- Career skills are built by interleaving five race skills and five class skills.
- Duplicate race/class skills are merged, gain an extra +2 starting levels, and can receive availability `0` or `1` depending on which side introduced the duplicate.
- Life uses class base life, class life per level, Constitution effect, and Strength life bonus.
- Mana uses class base mana, Intelligence mana bonus, and Lore effect.
- Spellcasting is a chance modifier from Intelligence and Ritual. Actual spell success starts from a base chance, applies a level penalty, then adds this modifier and any temporary/item modifiers.
- Command Radius in the hero stat text is `6 + floor(Charisma / 4)`, capped at `19`, so the displayed stat reaches its cap at 52 Charisma. Some battle-runtime command paths use an older command score before clamping; the planner displays the hero stat text value.

## Rulesets

- The planner now stores an explicit ruleset on builds. Legacy builds without a ruleset are treated as `WBC3 10323`.
- The Protectors slice has 16 races, 34 hero classes, and 11 visible skill slots.
- Protectors uses a shared hero point pool. Stats cost 2 hero points per rank and career skill ranks cost 1 hero point per rank.
- Protectors total hero points follow level bands: 5 per level through 10, 4 per level through 20, 3 per level through 40, then 2 per level after 40.
- Protectors level XP uses `75 * (level - 1)^2`.
- Protectors career skill duplicate handling merges race/class duplicates into one visible skill, marks it as available at level 1, and resets creation-time starting ranks to zero for this planner slice.

## Current Planner Boundary

The implemented v1 covers race, class, level, primary stat allocation, skill allocation, and core derived stats. Equipment, retinue, campaign bonuses, Protectors spell purchase, Protectors perks, Protectors items, Protectors cultures, and full battle simulation are intentionally outside this slice.

## Saved Hero Import

The local `Dir.dat` in `HeroData` is an options text file, not the hero index. The saved hero roster is imported from `HeroData.xcr`. The importer reads encrypted `data.dat`, then extracts each listed `.hro` resource into planner saved builds.

## Portraits

Portrait art comes from the installed game assets. The planner imports the portrait archive when available and maps race-specific portrait choices from verified game data.
