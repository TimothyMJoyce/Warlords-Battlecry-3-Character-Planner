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

## Current Planner Boundary

The implemented v1 covers race, class, level, primary stat allocation, skill allocation, and core derived stats. Equipment, retinue, campaign bonuses, spell details, and full battle simulation are intentionally outside this slice.

## Saved Hero Import

The local `Dir.dat` in `HeroData` is an options text file, not the hero index. The saved hero roster is imported from `HeroData.xcr`. The importer reads encrypted `data.dat`, then extracts each listed `.hro` resource into planner saved builds.

## Portraits

Portrait art comes from the installed game assets. The planner imports the portrait archive when available and maps race-specific portrait choices from verified game data.
