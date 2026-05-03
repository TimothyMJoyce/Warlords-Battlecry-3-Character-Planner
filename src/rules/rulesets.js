import * as vanillaData from "../data/gameData.js";
import * as vanillaRules from "./plannerRules.js";
import * as protectorsData from "../data/protectorsData.js";
import * as protectorsRules from "./protectorsRules.js";

export const VANILLA_RULESET_ID = "wbc3-10323";
export const PROTECTORS_RULESET_ID = "protectors";
export const defaultRulesetId = VANILLA_RULESET_ID;

const createDefaultBuild = (rulesetId, raceId = "knight", classId = "warrior") => ({
  rulesetId,
  name: "",
  raceId,
  classId,
  level: 1,
  statAllocation: { strength: 0, dexterity: 0, intelligence: 0, charisma: 0 },
  skillAllocation: {},
});

const vanillaRuleset = {
  id: VANILLA_RULESET_ID,
  label: "WBC3 10323",
  shortLabel: "10323",
  data: {
    ...vanillaData,
    HERO_SKILL_SLOT_COUNT: 10,
  },
  createDefaultBuild: () => createDefaultBuild(VANILLA_RULESET_ID),
  calculateHeroSummary: vanillaRules.calculateHeroSummary,
  calculateStartingStats: vanillaRules.calculateStartingStats,
  calculatePrimaryStats: vanillaRules.calculatePrimaryStats,
  validateStatAllocation: vanillaRules.validateStatAllocation,
  validateSkillAllocation: vanillaRules.validateSkillAllocation,
  getAvailableSkillUnlocks: vanillaRules.getAvailableSkillUnlocks,
  getPointBudget: vanillaRules.getPointBudget,
  getStatPointsForLevel: vanillaRules.getStatPointsForLevel,
  getSkillPointsForLevel: vanillaRules.getSkillPointsForLevel,
  getExperienceForLevel: vanillaRules.getExperienceForLevel,
  mergeCareerSkills: vanillaRules.mergeCareerSkills,
  normalizeStatAllocation: vanillaRules.normalizeStatAllocation,
  normalizeSkillAllocation: vanillaRules.normalizeSkillAllocation,
  clampLevel: vanillaRules.clampLevel,
  formattingNotes: {
    pointBudget: "Separate stat and skill point pools; one point of each per gained level.",
  },
};

const protectorsRuleset = {
  id: PROTECTORS_RULESET_ID,
  label: "The Protectors",
  shortLabel: "Protectors",
  data: protectorsData,
  createDefaultBuild: protectorsRules.createDefaultBuild,
  calculateHeroSummary: protectorsRules.calculateHeroSummary,
  calculateStartingStats: protectorsRules.calculateStartingStats,
  calculatePrimaryStats: protectorsRules.calculatePrimaryStats,
  validateStatAllocation: protectorsRules.validateStatAllocation,
  validateSkillAllocation: protectorsRules.validateSkillAllocation,
  getAvailableSkillUnlocks: protectorsRules.getAvailableSkillUnlocks,
  getPointBudget: protectorsRules.getPointBudget,
  getStatPointsForLevel: protectorsRules.getStatPointsForLevel,
  getSkillPointsForLevel: protectorsRules.getSkillPointsForLevel,
  getExperienceForLevel: protectorsRules.getExperienceForLevel,
  mergeCareerSkills: protectorsRules.mergeCareerSkills,
  normalizeStatAllocation: protectorsRules.normalizeStatAllocation,
  normalizeSkillAllocation: protectorsRules.normalizeSkillAllocation,
  clampLevel: protectorsRules.clampLevel,
  formattingNotes: {
    pointBudget: "Shared hero point pool; stats cost 2 points and skill ranks cost 1 point.",
  },
};

export const rulesets = {
  [VANILLA_RULESET_ID]: vanillaRuleset,
  [PROTECTORS_RULESET_ID]: protectorsRuleset,
};

export const rulesetOptions = [vanillaRuleset, protectorsRuleset].map(({ id, label, shortLabel }) => ({
  id,
  label,
  shortLabel,
}));

export function normalizeRulesetId(value) {
  const id = String(value ?? "").trim();
  return Object.prototype.hasOwnProperty.call(rulesets, id) ? id : defaultRulesetId;
}

export function getRuleset(value) {
  return rulesets[normalizeRulesetId(value)];
}
