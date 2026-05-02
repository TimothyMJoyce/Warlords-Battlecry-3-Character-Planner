import assert from "node:assert/strict";
import { importedHeroBuilds } from "../src/data/importedHeroBuilds.js";
import { getDefaultPortraitId, getPortraitFileName, getPortraitOptions } from "../src/data/portraits.js";
import { HERO_MAX_LEVEL, heroClasses, races, skills } from "../src/data/gameData.js";
import {
  calculateAttackSpeed,
  calculateArmyLimitBonus,
  calculateCommandEffect,
  calculateConditionalSkillEffects,
  calculateDamageResistances,
  calculateLifeRegen,
  calculateManaRegen,
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

const baseBuild = {
  raceId: "barbarian",
  classId: "chieftain",
  level: 1,
  statAllocation: { strength: 0, dexterity: 0, intelligence: 0, charisma: 0 },
  skillAllocation: {},
};

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
assert.equal(summary.commandEffect, 3);
assert.deepEqual(summary.unitAttackSpeed, {
  periodMs: 1470,
  seconds: 1.47,
});
assert.deepEqual(summary.merchant, {
  score: -1,
  discountPercent: -1,
});
assert.equal(summary.commandRadius, 9);
assert.equal(summary.command, 9);
assert.equal(summary.groupLimit, 11);
assert.equal(summary.conversion, 8);
assert.equal(summary.conversionTime, 39);
assert.equal(summary.conversionRange, 9);
assert.equal(summary.armyLimitBonus, 1);
assert.equal(summary.retinueSlots, 8);

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
const assassinOnlySummary = calculateHeroSummary({ ...baseBuild, raceId: "dwarf", classId: "assassin" });
assert.equal(assassinOnlySummary.skillEffects.length, 1);
assert.equal(assassinOnlySummary.skillEffects[0].label, "Assassination Score");
assert.equal(assassinOnlySummary.skillEffectList.some((effect) => effect.skillId === "assassin"), true);
assert.equal(calculateCommandEffect(0), 1);
assert.equal(calculateCommandEffect(3), 3);
assert.equal(calculateCommandEffect(10), 10);
assert.equal(calculateArmyLimitBonus(3), 1);
assert.equal(calculateArmyLimitBonus(10), 5);
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

console.log("All verified planner tests passed.");
