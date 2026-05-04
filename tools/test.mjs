import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { importedHeroBuilds } from "../src/data/importedHeroBuilds.js";
import { getDefaultPortraitId, getPortraitFileName, getPortraitOptions } from "../src/data/portraits.js";
import {
  avatarIdsByRace,
  getAllAvatarOptions,
  getAvailableHeroAnimationTypes,
  getCommandRadiusSceneMetrics,
  getDefaultAvatarId,
  heroAnimationTypes,
  DEFAULT_HERO_ANIMATION_ID,
  normalizeHeroAnimationId,
  normalizeAvatarId,
} from "../src/data/heroAvatars.js";
import { HERO_MAX_LEVEL, heroClasses, races, skills } from "../src/data/gameData.js";
import {
  HERO_SKILL_SLOT_COUNT as PROTECTORS_SKILL_SLOT_COUNT,
  heroClasses as protectorsClasses,
  races as protectorsRaces,
  skills as protectorsSkills,
} from "../src/data/protectorsData.js";
import {
  defaultSpellPreviewId,
  getSpellPreview,
  getSpellPreviewEffectIds,
  spellPreviewSpells,
} from "../src/data/spellEffects.js";
import { readAvatarAnimationAsset, readEffectAnimationAsset, readSpriteAnimationAsset } from "./wbc3-animation-reader.mjs";
import { readTerrainTileAsset } from "./wbc3-terrain-reader.mjs";
import { parseItemConfig, parseItemXml, readItemCatalog } from "./wbc3-items-reader.mjs";
import { parseSpellTextCatalog } from "./wbc3-spells-reader.mjs";
import { buildSkillTextCatalog, parseGameText, readSkillTextCatalog } from "./wbc3-game-text-reader.mjs";
import {
  calculateAttackSpeed,
  calculateArmyLimitBonus,
  calculateArmySetupPoints,
  calculateCommandEffect,
  calculateConditionalSkillEffects,
  calculateDamageResistances,
  calculateLifeRegen,
  calculateManaRegen,
  calculateCommandRadius,
  calculateResistance,
  calculateHeroSummary,
  calculateStartingStats,
  calculateSkillEffectList,
  calculateUnitAttackSpeed,
  clampLevel,
  getConversionRange,
  getConversionTime,
  getEffectiveCommandRadius,
  getGroupLimitFromCommand,
  getAvailableSkillUnlocks,
  getExperienceForLevel,
  mergeCareerSkills,
  validateSkillAllocation,
} from "../src/rules/plannerRules.js";
import {
  calculateHeroSummary as calculateProtectorsHeroSummary,
  calculateStartingStats as calculateProtectorsStartingStats,
  getAvailableSkillUnlocks as getProtectorsAvailableSkillUnlocks,
  getExperienceForLevel as getProtectorsExperienceForLevel,
  getPointBudget as getProtectorsPointBudget,
  getTotalSkillPointsForLevel as getProtectorsTotalSkillPointsForLevel,
  mergeCareerSkills as mergeProtectorsCareerSkills,
  validateSkillAllocation as validateProtectorsSkillAllocation,
  validateStatAllocation as validateProtectorsStatAllocation,
  calculateSkillEffectList as calculateProtectorsSkillEffectList,
} from "../src/rules/protectorsRules.js";
import {
  PROTECTORS_RULESET_ID,
  VANILLA_RULESET_ID,
  getRuleset,
  normalizeRulesetId,
  rulesetOptions,
} from "../src/rules/rulesets.js";

const baseBuild = {
  raceId: "barbarian",
  classId: "chieftain",
  level: 1,
  statAllocation: { strength: 0, dexterity: 0, intelligence: 0, charisma: 0 },
  skillAllocation: {},
};

function getSkillDataIndex(skillId) {
  const index = skills.findIndex((skill) => skill.id === skillId);
  assert.notEqual(index, -1, `Missing skill data index for ${skillId}`);
  return index;
}

assert.equal(races.length, 16, "WBC3 data includes 16 hero races");
assert.equal(heroClasses.length, 29, "WBC3 data includes 29 hero classes");
assert.equal(skills[39].id, "dwarfslayer");
assert.equal(skills[41].id, "orcslayer");
assert.equal(skills[86].id, "guildmaster");
assert.equal(skills[101].id, "contamination");
assert.equal(getDefaultPortraitId("knight"), 0);
assert.equal(getDefaultPortraitId("plaguelord"), 15);
assert.equal(getPortraitFileName(7), "Portrait07.bmp");
assert.deepEqual(getPortraitOptions("ssrathi"), [13, 82, 84]);
assert.equal(getDefaultAvatarId("knight"), "AHHX");
assert.equal(getDefaultAvatarId("plaguelord"), "AHH1");
assert.deepEqual(avatarIdsByRace.knight, ["AHHX", "AFHX", "AHH0", "AHH1", "AEHX", "APHX"]);
assert.deepEqual(avatarIdsByRace.ssrathi, ["ALHX"]);
assert.equal(getAllAvatarOptions().some((avatar) => avatar.id === "AVHX"), true);
assert.equal(getAllAvatarOptions().some((avatar) => avatar.id === "AGHY"), true);
assert.equal(normalizeAvatarId("knight", "AVHX"), "AVHX");
assert.deepEqual(
  getAvailableHeroAnimationTypes("AHHX").map((animation) => animation.id),
  ["stand", "walk", "fight", "die", "ambient", "convert", "spell", "interface"],
);
assert.equal(getAvailableHeroAnimationTypes("AHHX").some((animation) => animation.id === "special"), false);
assert.deepEqual(
  getAvailableHeroAnimationTypes("ATHX").map((animation) => animation.id),
  ["stand", "walk", "fight", "die", "interface"],
);
assert.equal(DEFAULT_HERO_ANIMATION_ID, "ambient");
assert.equal(normalizeHeroAnimationId("ATHX", "spell"), "stand");
assert.deepEqual(
  heroAnimationTypes.map((animation) => animation.id),
  ["stand", "walk", "fight", "die", "ambient", "special", "convert", "spell", "interface"],
);
assert.equal(defaultSpellPreviewId, "healSelf");
assert.equal(spellPreviewSpells.length, 140);
assert.equal(getSpellPreview("destruction").label, "Destruction");
assert.deepEqual(getSpellPreviewEffectIds(getSpellPreview("destruction")), ["EARC", "EX01"]);
assert.equal(getSpellPreview("not-real").id, "healSelf");
assert.equal(getSpellPreview("healSelf").gameTextIndex, 0);
assert.equal(getSpellPreview("breathOfDying").gameTextIndex, 139);
assert.deepEqual(parseSpellTextCatalog("[SPELL_NAME_00]\tHeal Self\n[SPELL_DESC_00]\tHeals the caster"), [
  {
    index: 0,
    name: "Heal Self",
    description: "Heals the caster",
  },
]);

assert.deepEqual(
  rulesetOptions.map((ruleset) => ruleset.id),
  [VANILLA_RULESET_ID, PROTECTORS_RULESET_ID],
);
assert.equal(normalizeRulesetId("not-real"), VANILLA_RULESET_ID);
assert.equal(getRuleset(PROTECTORS_RULESET_ID).label, "The Protectors");
assert.equal(protectorsRaces.length, 16, "Protectors data includes 16 hero races");
assert.equal(protectorsClasses.length, 34, "Protectors data includes 34 hero classes");
assert.equal(protectorsClasses.some((heroClass) => heroClass.id === "warlock"), true);
assert.equal(protectorsClasses[5].id, "warlock");
assert.equal(PROTECTORS_SKILL_SLOT_COUNT, 11);
assert.equal(protectorsSkills.some((skill) => skill.id === "magicContagion"), true);
assert.deepEqual(calculateProtectorsStartingStats("knight", "warrior"), {
  strength: 8,
  dexterity: 3,
  intelligence: 2,
  charisma: 7,
});
assert.deepEqual(calculateProtectorsStartingStats("barbarian", "chieftain"), {
  strength: 10,
  dexterity: 9,
  intelligence: -2,
  charisma: 3,
});
assert.equal(getProtectorsExperienceForLevel(1), 0);
assert.equal(getProtectorsExperienceForLevel(2), 75);
assert.equal(getProtectorsExperienceForLevel(10), 6075);
assert.equal(getProtectorsTotalSkillPointsForLevel(1), 5);
assert.equal(getProtectorsTotalSkillPointsForLevel(10), 50);
assert.equal(getProtectorsTotalSkillPointsForLevel(20), 90);
assert.equal(getProtectorsTotalSkillPointsForLevel(40), 150);
assert.equal(getProtectorsTotalSkillPointsForLevel(50), 170);

const protectorsBuild = {
  rulesetId: PROTECTORS_RULESET_ID,
  raceId: "minotaur",
  classId: "chieftain",
  level: 10,
  statAllocation: { strength: 5, dexterity: 0, intelligence: 0, charisma: 0 },
  skillAllocation: { ferocity: 40 },
};
assert.deepEqual(getProtectorsPointBudget(protectorsBuild), {
  mode: "shared",
  label: "Hero Points",
  statLabel: "Stats",
  skillLabel: "Skills",
  available: 50,
  spent: 50,
  remaining: 0,
  statSpent: 5,
  skillSpent: 40,
  statCost: 2,
  skillCost: 1,
});
assert.equal(validateProtectorsStatAllocation({ ...protectorsBuild, statAllocation: { strength: 6 } }).valid, false);
assert.equal(validateProtectorsSkillAllocation({ ...protectorsBuild, skillAllocation: { ferocity: 41 } }).valid, false);
const protectorsMergedFerocity = mergeProtectorsCareerSkills("minotaur", "chieftain").find((skill) => skill.skillId === "ferocity");
assert.equal(protectorsMergedFerocity.availableAt, 1);
assert.equal(protectorsMergedFerocity.startingLevel, 0);
assert.equal(protectorsMergedFerocity.rawStartingLevel, 4);
assert.deepEqual([...protectorsMergedFerocity.mergedFrom].sort(), ["class", "race"]);
assert.equal(getProtectorsAvailableSkillUnlocks({ ...protectorsBuild, classId: "ranger" }).length, 11);
assert.equal(getProtectorsAvailableSkillUnlocks({ ...protectorsBuild, classId: "ranger" }).at(-1).skillId, "woodcraft");
assert.equal(calculateProtectorsHeroSummary({ ...protectorsBuild, level: 20 }).xpForLevel, 27075);
const protectorsSummary = calculateProtectorsHeroSummary(protectorsBuild);
assert.equal(protectorsSummary.moraleBreakdown.racialSkillId, "hornedLord");
assert.equal(protectorsSummary.moraleViews.racial.morale, protectorsSummary.morale);
assert.equal(protectorsSummary.moraleViews.general.morale, protectorsSummary.morale - protectorsSummary.moraleBreakdown.racial);
const missingProtectorsSkillDescriptions = protectorsSkills
  .filter((skill) => skill.id !== "null")
  .filter((skill) => calculateProtectorsSkillEffectList({ [skill.id]: 1 }, { includeInactive: true }).length === 0)
  .map((skill) => skill.id);
assert.deepEqual(missingProtectorsSkillDescriptions, []);

const appSource = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
assert.match(appSource, /class="rules-menu"/);
assert.match(appSource, /data-ruleset-id/);
assert.match(appSource, /rulesetStorageKey/);
assert.match(appSource, /function loadSavedBuild/);
assert.match(appSource, /activeRulesetId = normalizeRulesetId\(savedBuild\.rulesetId\)/);
assert.match(appSource, /fallbackRulesetId = VANILLA_RULESET_ID/);
assert.match(appSource, /value\.rulesetId \?\? fallbackRulesetId/);
assert.match(appSource, /width="\$\{heroPreviewLogicalWidth \* heroPreviewResolutionScale\}"/);
assert.match(appSource, /id="hero-preview-zoom" type="range" min="1" max="4"/);
assert.match(appSource, /api\/local\/terrain-tile/);
assert.match(appSource, /api\/local\/effect/);
assert.match(appSource, /api\/local\/items/);
assert.match(appSource, /hero-spell-select/);
assert.match(appSource, /hero-spell-sphere-select/);
assert.match(appSource, /api\/local\/skills/);
assert.match(appSource, /data-spell-sphere-id/);
assert.match(appSource, /skillDescriptionCell/);
assert.doesNotMatch(appSource, /backpack4/);
assert.doesNotMatch(appSource, /data-preview-spell-id/);
assert.doesNotMatch(appSource, /spell-preview-button/);
assert.match(appSource, /data-hero-rotate/);
assert.match(appSource, /spellSpheresPanel\(summary\)/);
assert.match(appSource, /itemsPanel\(\)/);
assert.match(appSource, /item-icon/);
assert.match(appSource, /item-shine/);
assert.match(appSource, /localItemShineSprites/);
assert.match(appSource, /power\.displayText/);
assert.match(appSource, /data-item-filter/);
assert.match(appSource, /itemLevelFilter/);
assert.match(appSource, /normalizeItemLevelFilter/);
assert.match(appSource, /data-item-slot-filter/);
assert.match(appSource, /itemSlotFilter/);
assert.match(appSource, /normalizeItemSlotFilter/);
assert.match(appSource, /matchesItemSlotFilter/);
assert.match(appSource, /All Slots/);
assert.match(appSource, /Off Hand/);
assert.doesNotMatch(appSource, /formatSlotAccepts/);
assert.match(appSource, /data-item-page-delta/);
assert.match(appSource, /itemSearchPageSize/);
assert.match(appSource, /getVisibleItemSearchPage/);
assert.match(appSource, /clampItemSearchPage/);
assert.match(appSource, /localItemSets/);
assert.match(appSource, /buildWithLocalItemData/);
assert.match(appSource, /itemBreakdowns/);
assert.doesNotMatch(appSource, /getDirectItemEffectSkillIds/);
assert.doesNotMatch(appSource, /merchant: "merchant"/);
assert.doesNotMatch(appSource, /weaponmaster: "criticalHit"/);
assert.match(appSource, /data-morale-view/);
assert.match(appSource, /morale-switcher/);
assert.match(appSource, /moraleViewMode/);
assert.match(appSource, /summary-tooltip/);
assert.doesNotMatch(appSource, /4:3 preview \/ \$\{escapeHtml\(animation\.label\)\}/);
assert.deepEqual(getCommandRadiusSceneMetrics(25), {
  radius: 19,
  radiusX: 608,
  radiusY: 456,
  diameterX: 1216,
  diameterY: 912,
});

assert.deepEqual(calculateStartingStats("knight", "warrior"), {
  strength: 7,
  dexterity: 4,
  intelligence: 3,
  charisma: 6,
});

assert.deepEqual(calculateStartingStats("barbarian", "chieftain"), {
  strength: 8,
  dexterity: 7,
  intelligence: 1,
  charisma: 4,
});

assert.equal(getExperienceForLevel(1), 0);
assert.equal(getExperienceForLevel(2), 10);
assert.equal(getExperienceForLevel(10), 2000);
assert.equal(getExperienceForLevel(51), 70000);
assert.equal(getExperienceForLevel(52), 74000);
assert.equal(HERO_MAX_LEVEL, 999);
assert.equal(clampLevel(1000), 999);
assert.equal(getExperienceForLevel(999), 3862000);
assert.equal(calculateHeroSummary({ ...baseBuild, level: 999 }).nextLevelXp, null);

const barbarianSkills = getAvailableSkillUnlocks({ ...baseBuild, level: 30 });
assert.equal(barbarianSkills.find((skill) => skill.skillId === "magicIce").availableAt, 20);
assert.equal(barbarianSkills.find((skill) => skill.skillId === "quarrying").availableAt, 30);
assert.equal(barbarianSkills.find((skill) => skill.skillId === "leadership").availableAt, 5);
assert.equal(barbarianSkills.find((skill) => skill.skillId === "barbarianKing").availableAt, 15);
assert.equal(barbarianSkills.find((skill) => skill.skillId === "mightyBlow").availableAt, 25);

const mergedFerocity = mergeCareerSkills("minotaur", "chieftain").find((skill) => skill.skillId === "ferocity");
assert.equal(mergedFerocity.availableAt, 1);
assert.equal(mergedFerocity.startingLevel, 4);

const sameBandFerocity = mergeCareerSkills("daemon", "paladin").find((skill) => skill.skillId === "ferocity");
assert.equal(sameBandFerocity.availableAt, 0);
assert.equal(sameBandFerocity.startingLevel, 4);

const summary = calculateHeroSummary(baseBuild);
assert.equal(summary.life, 340);
assert.equal(summary.mana, 8);
assert.equal(summary.combat, 15);
assert.equal(summary.speed, 12);
assert.deepEqual(summary.attackSpeed, {
  periodMs: 960,
  multiplier: 0.96,
  bonusPercent: 4,
  dexterityBonus: 4,
  swiftnessBonus: 0,
  fightSpeed: 10,
});
assert.equal(summary.damage, 24);
assert.equal(summary.armor, 18);
assert.equal(summary.resistance, 17);
assert.deepEqual(summary.damageResistances, {
  piercing: 18,
  slashing: 18,
  crushing: 18,
  fire: 17,
  cold: 17,
  electricity: 17,
  magic: 0,
});
assert.deepEqual(summary.lifeRegen, {
  periodMs: 6666,
  pointsPer20Seconds: 3,
  skillBonusPercent: 0,
});
assert.deepEqual(summary.manaRegen, {
  periodMs: 10000,
  pointsPer20Seconds: 2,
  skillBonusPercent: 0,
});
assert.equal(summary.spellcasting, 3);
assert.equal(summary.initialTroopXp, 0);
assert.equal(summary.morale, 3);
assert.deepEqual(summary.moraleBreakdown, {
  stat: 2,
  leadership: 0,
  racial: 1,
  items: 0,
  baseTotal: 2,
  total: 3,
  racialSkillId: "horseLord",
});
assert.deepEqual(summary.moraleViews.general, {
  morale: 2,
  commandEffect: 2,
  armyLimitBonus: 1,
  unitAttackSpeed: {
    periodMs: 1480,
    seconds: 1.48,
  },
});
assert.deepEqual(summary.moraleViews.racial, {
  morale: 3,
  commandEffect: 3,
  armyLimitBonus: 1,
  unitAttackSpeed: {
    periodMs: 1470,
    seconds: 1.47,
  },
});
assert.equal(summary.commandEffect, 3);
assert.deepEqual(summary.unitAttackSpeed, {
  periodMs: 1470,
  seconds: 1.47,
});
assert.deepEqual(summary.merchant, {
  score: -1,
  discountPercent: -1,
});
assert.equal(summary.armySetupPoints, 1);
assert.equal(summary.commandRadius, 7);
assert.equal(summary.command, 9);
assert.equal(summary.groupLimit, 11);
assert.equal(summary.conversion, 8);
assert.equal(summary.conversionTime, 39);
assert.equal(summary.conversionRange, 7);
assert.equal(summary.armyLimitBonus, 1);
assert.equal(summary.retinueSlots, 8);

const swiftnessItemSummary = calculateHeroSummary({
  ...baseBuild,
  itemCatalog: [
    {
      id: "synthetic-swiftness-item",
      numericId: 9001,
      powers: [{ type: "hero skill", data: getSkillDataIndex("swiftness"), level: 5, displayText: "+20% Attack speed" }],
    },
  ],
  items: { ring1: "synthetic-swiftness-item" },
});
assert.equal(swiftnessItemSummary.skillLevels.swiftness, 5);
assert.deepEqual(swiftnessItemSummary.attackSpeed, {
  periodMs: 952,
  multiplier: 0.95,
  bonusPercent: 5,
  dexterityBonus: 4,
  swiftnessBonus: 20,
  fightSpeed: 10,
});

const fireMissileItemSummary = calculateHeroSummary({
  ...baseBuild,
  itemCatalog: [
    {
      id: "synthetic-fire-missile-item",
      numericId: 9002,
      powers: [{ type: "hero skill", data: getSkillDataIndex("fireMissile"), level: 1, displayText: "Fire Missile 1" }],
    },
  ],
  items: { ring1: "synthetic-fire-missile-item" },
});
assert.equal(fireMissileItemSummary.skillLevels.fireMissile, 1);
assert.equal(fireMissileItemSummary.damageType, "Hot and Pointy");
assert.equal(fireMissileItemSummary.attackSpeed.fightSpeed, 8);
assert.deepEqual(
  fireMissileItemSummary.skillEffectList
    .filter((effect) => effect.skillId === "fireMissile")
    .map((effect) => [effect.value, effect.rawValue, effect.skillLevel]),
  [["50% damage / 6 range", 50, 1]],
);
assert.equal(calculateCommandRadius({ strength: 1, dexterity: 1, intelligence: 1, charisma: 51 }), 18);
assert.equal(calculateCommandRadius({ strength: 1, dexterity: 1, intelligence: 1, charisma: 52 }), 19);
assert.equal(calculateCommandRadius({ strength: 1, dexterity: 1, intelligence: 1, charisma: 80 }), 19);

const invalidSkills = validateSkillAllocation({
  ...baseBuild,
  level: 4,
  skillAllocation: { leadership: 1 },
});
assert.equal(invalidSkills.valid, false);
assert.match(invalidSkills.warnings.join(" "), /level 5/);

const lockedLateSkill = getAvailableSkillUnlocks({ ...baseBuild, level: 50 }).find((skill) => skill.skillId === "quarrying");
assert.equal(lockedLateSkill.available, false);
assert.equal(lockedLateSkill.priorSkillPoints, 5);
assert.equal(lockedLateSkill.requiredPriorSkillPoints, 29);
assert.equal(lockedLateSkill.maxLevel, 21);

const lateSkillWithoutEarlierPoints = validateSkillAllocation({
  ...baseBuild,
  level: 50,
  skillAllocation: { quarrying: 1 },
});
assert.equal(lateSkillWithoutEarlierPoints.valid, false);
assert.match(lateSkillWithoutEarlierPoints.warnings.join(" "), /earlier skill tiers/);
assert.match(lateSkillWithoutEarlierPoints.warnings.join(" "), /5\/29/);

const unlockedLateSkill = getAvailableSkillUnlocks({
  ...baseBuild,
  level: 50,
  skillAllocation: { ferocity: 24 },
}).find((skill) => skill.skillId === "quarrying");
assert.equal(unlockedLateSkill.available, true);
assert.equal(unlockedLateSkill.priorSkillPoints, 29);

const lateSkillWithEarlierPoints = validateSkillAllocation({
  ...baseBuild,
  level: 50,
  skillAllocation: { ferocity: 24, quarrying: 1 },
});
assert.equal(lateSkillWithEarlierPoints.valid, true);

const lateSkillTooManyPoints = validateSkillAllocation({
  ...baseBuild,
  level: 50,
  skillAllocation: { ferocity: 27, quarrying: 22 },
});
assert.equal(lateSkillTooManyPoints.valid, false);
assert.match(lateSkillTooManyPoints.warnings.join(" "), /Quarrying is capped at 21/);

if (importedHeroBuilds.length > 0) {
  const brock = importedHeroBuilds.find((hero) => hero.name === "Brock");
  assert.equal(brock.raceId, "barbarian");
  assert.equal(brock.classId, "ranger");
  assert.equal(brock.level, 50);
  assert.equal(brock.portraitId, 73);
  assert.deepEqual(brock.statAllocation, {
    strength: 1,
    dexterity: 1,
    intelligence: 17,
    charisma: 30,
  });
  assert.equal(validateSkillAllocation(brock).valid, true);
  assert.equal(calculateHeroSummary(brock).stats.charisma, 32);
}

assert.equal(calculateAttackSpeed({ dexterity: 7 }, { swiftness: 5 }).periodMs, 952);
assert.equal(calculateAttackSpeed({ dexterity: 7 }, { fireMissile: 1 }).periodMs, 1200);
assert.equal(calculateAttackSpeed({ dexterity: 35 }, { swiftness: 20 }).periodMs, 1);
assert.equal(calculateResistance({ baseResistance: 10 }, { dexterity: 7 }, { warding: 2 }), 19);
assert.deepEqual(
  calculateDamageResistances(17, 18, {
    armorer: 2,
    scales: 1,
    thickHide: 3,
    fireResistance: 2,
    coldResistance: 1,
    electricityResistance: 3,
    elementalResistance: 4,
    magicResistance: 5,
  }),
  {
    piercing: 28,
    slashing: 23,
    crushing: 33,
    fire: 35,
    cold: 30,
    electricity: 40,
    magic: 20,
  },
);
assert.equal(calculateLifeRegen({ strength: 8 }, { regeneration: 1 }).periodMs, 5555);
assert.equal(calculateManaRegen({ intelligence: 1 }, { energy: 2 }).periodMs, 9090);
const activeSkillEffects = calculateConditionalSkillEffects({
  assassin: 3,
  weaponmaster: 2,
  ignoreArmor: 2,
  fireMissile: 15,
  wealth: 4,
  armorer: 1,
});
assert.deepEqual(
  activeSkillEffects.map((effect) => [effect.label, effect.value]),
  [
    ["Assassination Score", 7],
    ["Critical Hit Bonus", "+4%"],
    ["Ignore Armor", "6 armor / 30 resist"],
    ["Fire Missile", "92% damage / 8 range"],
    ["Piercing Armor Skill", "+5"],
    ["Gold Income", "+4"],
  ],
);
const visibleSkillEffects = calculateSkillEffectList(
  {
    assassin: 0,
    armorer: 1,
  },
  { includeInactive: true },
);
assert.deepEqual(
  visibleSkillEffects.map((effect) => [effect.skillId, effect.label, effect.value]),
  [
    ["assassin", "Assassination Score", 0],
    ["armorer", "Piercing Armor Skill", "+5"],
  ],
);
const missingSkillDescriptions = skills
  .filter((skill) => skill.id !== "null")
  .filter((skill) => calculateSkillEffectList({ [skill.id]: 1 }, { includeInactive: true }).length === 0)
  .map((skill) => skill.id);
assert.deepEqual(missingSkillDescriptions, []);
assert.deepEqual(
  calculateSkillEffectList({ magicHealing: 0 }, { includeInactive: true }).map((effect) => [
    effect.label,
    effect.value,
  ]),
  [["Spells Known", "No spells"]],
);
assert.deepEqual(
  calculateSkillEffectList({ magicHealing: 11 }, { includeInactive: true }).map((effect) => [
    effect.label,
    effect.value,
  ]),
  [["Spells Known", "1 spell / level 2"]],
);
const assassinOnlySummary = calculateHeroSummary({ ...baseBuild, raceId: "dwarf", classId: "assassin" });
assert.deepEqual(
  assassinOnlySummary.skillEffects.map((effect) => [effect.skillId, effect.label, effect.value]),
  [
    ["constitution", "Life", "+15"],
    ["assassin", "Assassination Score", 7],
    ["dwarfLord", "Race Morale", "+1"],
  ],
);
assert.equal(assassinOnlySummary.skillEffectList.some((effect) => effect.skillId === "assassin"), true);
assert.equal(calculateCommandEffect(0), 1);
assert.equal(calculateCommandEffect(3), 3);
assert.equal(calculateCommandEffect(10), 10);
assert.equal(calculateArmyLimitBonus(3), 1);
assert.equal(calculateArmyLimitBonus(10), 5);
assert.equal(calculateArmySetupPoints({ strength: 0, dexterity: 0, intelligence: 0, charisma: 15 }, { diplomacy: 4 }), 7);
assert.deepEqual(calculateUnitAttackSpeed(3), {
  periodMs: 1470,
  seconds: 1.47,
});
assert.deepEqual(calculateUnitAttackSpeed(120), {
  periodMs: 500,
  seconds: 0.5,
});
assert.equal(getGroupLimitFromCommand(4), 10);
assert.equal(getGroupLimitFromCommand(20), 14);
assert.equal(getEffectiveCommandRadius(25), 19);
assert.equal(getConversionTime(5), 45);
assert.equal(getConversionTime(99), 5);
assert.equal(getConversionRange(31), 13);
assert.equal(
  calculateHeroSummary({
    ...baseBuild,
    level: 20,
    statAllocation: { strength: 0, dexterity: 20, intelligence: 0, charisma: 0 },
  }).conversionTime,
  calculateHeroSummary({ ...baseBuild, level: 20 }).conversionTime,
);

const parsedItemConfig = parseItemConfig(`
[TREASURES]
000 0 0 01 6 Sirian's Greatsword
010 9 1 05 6 The Snakeskin Boots
[SETS]
`);
assert.equal(parsedItemConfig.items.length, 2);
assert.deepEqual(parsedItemConfig.items.map((item) => [item.name, item.typeLabel, item.powerLabel, item.value]), [
  ["Sirian's Greatsword", "Sword", "Combat", 6],
  ["The Snakeskin Boots", "Boots", "Speed", 6],
]);
const parsedItemXml = parseItemXml(`
<Items>
  <Item id="1">
    <Name>Gnarled Staff</Name>
    <Power id="0" type="crushing" data="5"/>
    <Power id="1" type="spell casting" data="5"/>
    <Description>A common staff.</Description>
    <Image iconrow="1" iconcol="1" />
    <Data value="10" level="minor" rarity="10"/>
  </Item>
  <Set id="0">
    <Name>The Armor of the Gods</Name>
    <Power type="morale" data="25"/>
    <Item id="80"/>
    <Item id="81"/>
  </Set>
</Items>
`);
assert.equal(parsedItemXml.items.length, 1);
assert.deepEqual(parsedItemXml.items[0].powers.map((power) => [power.typeLabel, power.data]), [
  ["Crushing", 5],
  ["Spell Casting", 5],
]);
assert.equal(parsedItemXml.items[0].description, "A common staff.");
assert.equal(parsedItemXml.sets.length, 1);
assert.deepEqual(parsedItemXml.sets[0].items, [80, 81]);
assert.deepEqual([parsedItemXml.sets[0].name, parsedItemXml.sets[0].power.type, parsedItemXml.sets[0].power.data], [
  "The Armor of the Gods",
  "morale",
  25,
]);

const parsedGameText = parseGameText(`
[0593]\t+%d to Combat Skill
[0646]\tSteal +%d life with each hit in melee
[0760]\tFerocity
[1152]\t+%d%% Attack speed
[1154]\tSwiftness
`);
const parsedSkillText = buildSkillTextCatalog(parsedGameText);
assert.equal(parsedSkillText.find((skill) => skill.id === "ferocity").name, "Ferocity");
assert.equal(parsedSkillText.find((skill) => skill.id === "ferocity").descriptionTemplate, "+%d to Combat Skill");
assert.equal(parsedSkillText.find((skill) => skill.id === "vampirism").descriptionTemplate, "Steal +%d life with each hit in melee");
assert.equal(parsedSkillText.find((skill) => skill.id === "swiftness").name, "Swiftness");
assert.equal(parsedSkillText.find((skill) => skill.id === "swiftness").descriptionTemplate, "+%d%% Attack speed");

try {
  const avatarAsset = await readAvatarAnimationAsset({ avatarId: "AHHX", animationId: "walk" });
  assert.equal(avatarAsset.ok, true);
  assert.equal(avatarAsset.available, true);
  assert.equal(avatarAsset.avatar.archive, "Knights.xcr");
  assert.equal(avatarAsset.animation.index, 1);
  assert.equal(avatarAsset.frameCount > 0, true);
  assert.equal(avatarAsset.frameWidth > 0, true);
  assert.equal(avatarAsset.frameHeight > 0, true);
  assert.equal(avatarAsset.visiblePixelCount > 10000, true);
  assert.equal(avatarAsset.imageSrc.startsWith("data:image/png;base64,iVBORw0KGgo"), true);

  const goldMineAsset = await readSpriteAnimationAsset({
    spriteId: "BRG0",
    archiveName: "Resources.xcr",
    animationId: "ambient",
  });
  assert.equal(goldMineAsset.ok, true);
  assert.equal(goldMineAsset.available, true);
  assert.equal(goldMineAsset.frameWidth > 0, true);
  assert.equal(goldMineAsset.frameHeight > 0, true);
  assert.equal(goldMineAsset.visiblePixelCount > 10000, true);

  const grassTileAsset = await readTerrainTileAsset();
  assert.equal(grassTileAsset.ok, true);
  assert.equal(grassTileAsset.available, true);
  assert.equal(grassTileAsset.width, 320);
  assert.equal(grassTileAsset.height, 240);
  assert.equal(grassTileAsset.imageSrc.startsWith("data:image/png;base64,iVBORw0KGgo"), true);

  const itemCatalog = await readItemCatalog();
  assert.equal(itemCatalog.ok, true);
  assert.equal(itemCatalog.available, true);
  assert.equal(itemCatalog.items.length > 100, true);
  assert.equal(itemCatalog.sets.length, 8);
  assert.equal(itemCatalog.sets[0].name, "The Armor of the Gods");
  assert.equal(itemCatalog.sets[0].effectText, "+25 Morale");
  assert.equal(itemCatalog.items.every((item) => item.effectText), true);
  assert.equal(itemCatalog.items.every((item) => item.iconSrc.startsWith("data:image/png;base64,iVBORw0KGgo")), true);
  assert.equal(itemCatalog.items.flatMap((item) => item.powers).every((power) => power.displayText), true);
  assert.equal(itemCatalog.shineSprites.artifact.startsWith("data:image/png;base64,iVBORw0KGgo"), true);
  assert.equal(itemCatalog.shineSprites.set.startsWith("data:image/png;base64,iVBORw0KGgo"), true);
  assert.equal(itemCatalog.items.filter((item) => item.shine === "artifact").length, 21);
  assert.equal(itemCatalog.items.filter((item) => item.shine === "set").length, 28);
  assert.equal(itemCatalog.items[0].name, "Gnarled Staff");
  assert.equal(itemCatalog.items[0].description.length > 20, true);
  assert.equal(itemCatalog.items[0].powers[1].typeLabel, "Spell Casting");
  assert.equal(itemCatalog.items[0].effectText, "+5 Damage (crushing), +5% Spellcasting");
  assert.deepEqual(itemCatalog.items[0].icon, { row: 1, col: 2, rawCol: 1, width: 70, height: 110 });
  assert.equal(itemCatalog.items[0].iconSrc.startsWith("data:image/png;base64,iVBORw0KGgo"), true);
  assert.equal(
    itemCatalog.items.find((item) => item.name === "Merchant's Belt").effectText,
    "+5 Merchant skill (9.09% Discount), -1 Morale",
  );
  assert.equal(
    itemCatalog.items.find((item) => item.name === "Ring of Fire and Ice").effectText,
    "Casts Ring Of Ice (5% chance per hit), Casts Ring of Fire (5% chance per hit)",
  );
  assert.equal(itemCatalog.items.find((item) => item.name === "Blackfire Axe").shine, "artifact");
  assert.equal(itemCatalog.items.find((item) => item.name === "Helm of the Gods").shine, "set");

  const itemDataBuild = {
    ...baseBuild,
    itemCatalog: itemCatalog.items,
    itemSets: itemCatalog.sets,
  };
  const itemSkillModifierFailures = [];
  let itemSkillModifierCount = 0;
  for (const item of itemCatalog.items) {
    const expectedSkillDeltas = new Map();
    for (const power of item.powers ?? []) {
      if (String(power.type).trim().toLowerCase() !== "hero skill") continue;
      itemSkillModifierCount += 1;
      const skill = skills[Number(power.data)];
      const amount = Math.trunc(Number(power.level) || 0);
      if (!skill?.id) {
        itemSkillModifierFailures.push({ item: item.name, data: power.data, level: power.level, reason: "Unknown skill index" });
        continue;
      }
      expectedSkillDeltas.set(skill.id, (expectedSkillDeltas.get(skill.id) ?? 0) + amount);
    }

    if (!expectedSkillDeltas.size) continue;
    const itemSummary = calculateHeroSummary({ ...itemDataBuild, items: { ring1: item.id } });
    for (const [skillId, amount] of expectedSkillDeltas) {
      const baseLevel = Math.max(0, Math.trunc(Number(summary.skillLevels?.[skillId]) || 0));
      const expectedLevel = Math.max(0, baseLevel + amount);
      const actualLevel = Math.max(0, Math.trunc(Number(itemSummary.skillLevels?.[skillId]) || 0));
      const hasContribution = (itemSummary.itemEffects.skillContributions ?? []).some(
        (entry) =>
          entry.source === item.name &&
          entry.skillId === skillId &&
          Math.trunc(Number(entry.amount) || 0) === amount,
      );
      if (actualLevel !== expectedLevel || !hasContribution) {
        itemSkillModifierFailures.push({ item: item.name, skillId, amount, expectedLevel, actualLevel, hasContribution });
      }
    }
  }
  assert.equal(itemSkillModifierCount, 81);
  assert.deepEqual(itemSkillModifierFailures, []);

  const aranokSummary = calculateHeroSummary({
    ...itemDataBuild,
    items: { weapon: itemCatalog.items.find((item) => item.name === "Sword of Sir Aranok").id },
  });
  assert.equal(aranokSummary.skillLevels.weaponmaster ?? 0, 0);
  assert.equal(aranokSummary.skillEffectList.some((effect) => effect.skillId === "weaponmaster"), false);
  assert.equal(aranokSummary.itemEffects.breakdowns.criticalHit.some((entry) => entry.source === "Sword of Sir Aranok"), true);

  const merchantBeltSummary = calculateHeroSummary({
    ...itemDataBuild,
    items: { ring1: itemCatalog.items.find((item) => item.name === "Merchant's Belt").id },
  });
  assert.equal(merchantBeltSummary.skillLevels.merchant ?? 0, 0);
  assert.equal(merchantBeltSummary.skillEffectList.some((effect) => effect.skillId === "merchant"), false);
  assert.equal(merchantBeltSummary.merchant.score, summary.merchant.score + 5);
  assert.equal(merchantBeltSummary.itemEffects.breakdowns.merchant.some((entry) => entry.source === "Merchant's Belt"), true);

  const staffSummary = calculateHeroSummary({
    ...itemDataBuild,
    items: { weapon: "item-1" },
  });
  assert.equal(staffSummary.damage, summary.damage + 5);
  assert.equal(staffSummary.damageType, "Crushing");
  assert.equal(staffSummary.spellcasting, summary.spellcasting + 5);
  assert.equal(staffSummary.itemBreakdowns.damage.some((entry) => entry.source === "Gnarled Staff"), true);
  assert.equal(staffSummary.itemBreakdowns.spellcasting.some((entry) => entry.source === "Gnarled Staff"), true);

  const ringSummary = calculateHeroSummary({
    ...itemDataBuild,
    items: { ring1: "item-13" },
  });
  assert.equal(ringSummary.life, summary.life + 15);
  assert.equal(ringSummary.skillLevels.constitution, (summary.skillLevels.constitution ?? 0) + 1);
  assert.equal(ringSummary.itemBreakdowns.life.some((entry) => entry.source === "Ring of Health"), true);

  const assassinBlade = itemCatalog.items.find((item) => item.name === "Assassin's Blade");
  const assassinBladeSummary = calculateHeroSummary({
    ...itemDataBuild,
    raceId: "dwarf",
    classId: "assassin",
    items: { weapon: assassinBlade.id },
  });
  assert.equal(assassinBladeSummary.skillLevels.assassin, 3);
  assert.equal(assassinBladeSummary.skillEffectList.find((effect) => effect.skillId === "assassin").rawValue, 7);
  assert.equal(assassinBladeSummary.itemBreakdowns.assassin.some((entry) => entry.source === "Assassin's Blade"), true);

  const godsSetSummary = calculateHeroSummary({
    ...itemDataBuild,
    items: {
      head: "item-80",
      body: "item-81",
      offhand: "item-82",
      boots: "item-83",
    },
  });
  assert.equal(godsSetSummary.armor, summary.armor + 60);
  assert.equal(godsSetSummary.speed, summary.speed + 3);
  assert.equal(godsSetSummary.spellcasting, summary.spellcasting - 25);
  assert.equal(godsSetSummary.morale, summary.morale + 25);
  assert.equal(godsSetSummary.itemBreakdowns.morale.some((entry) => entry.source === "The Armor of the Gods set"), true);

  const skillTextCatalog = await readSkillTextCatalog();
  assert.equal(skillTextCatalog.ok, true);
  assert.equal(skillTextCatalog.skills.find((skill) => skill.id === "vampirism").descriptionTemplate, "Steal +%d life with each hit in melee");
  assert.equal(skillTextCatalog.skills.find((skill) => skill.id === "magicTime").name, "Time Magic");

  const healingEffectAsset = await readEffectAnimationAsset({ effectId: "EZ11" });
  assert.equal(healingEffectAsset.ok, true);
  assert.equal(healingEffectAsset.available, true);
  assert.equal(healingEffectAsset.frameCount > 0, true);
  assert.equal(healingEffectAsset.visiblePixelCount > 1000, true);

  const aliasedEffectAsset = await readEffectAnimationAsset({ effectId: "EILU" });
  assert.equal(aliasedEffectAsset.ok, true);
  assert.equal(aliasedEffectAsset.available, true);
  assert.equal(aliasedEffectAsset.effectId, "EILU");
  assert.equal(aliasedEffectAsset.resolvedEffectId, "EZ00");
} catch (error) {
  if (!/Could not locate/i.test(error instanceof Error ? error.message : String(error))) {
    throw error;
  }
  console.warn("Skipped avatar decode test because WBC3 side archives were not found.");
}

console.log("All verified planner tests passed.");
