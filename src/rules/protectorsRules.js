import {
  HERO_MAX_LEVEL,
  PROTECTORS_RULESET_ID,
  STAT_KEYS,
  dataNotes,
  heroClassesById,
  racesById,
  skills,
  skillsById,
} from "../data/protectorsData.js";

export const emptyStats = () => ({
  strength: 0,
  dexterity: 0,
  intelligence: 0,
  charisma: 0,
});

const PROTECTORS_STAT_COST = 2;
const PROTECTORS_SKILL_COST = 1;
const REGEN_BASE_MS = 20000;
const MAX_EFFECTIVE_COMMAND = 19;

const RACE_MORALE_SKILL_IDS = {
  knight: "knightLord",
  dwarf: "dwarfLord",
  undead: "skullLord",
  barbarian: "horseLord",
  minotaur: "hornedLord",
  orc: "orcLord",
  highElf: "highLord",
  woodElf: "forestLord",
  darkElf: "darkLord",
  fey: "dreamLord",
  darkDwarf: "siegeLord",
  daemon: "daemonLord",
  empire: "imperialLord",
  plaguelord: "plagueLord",
  swarm: "scorpionLord",
  ssrathi: "serpentLord",
};

const MAGIC_SKILL_IDS = [
  "magicHealing",
  "magicSummoning",
  "magicNature",
  "magicIllusion",
  "magicNecromancy",
  "magicPyromancy",
  "magicAlchemy",
  "magicRunes",
  "magicIce",
  "magicChaos",
  "magicPoison",
  "magicDivination",
  "magicArcane",
  "magicTime",
  "magicContagion",
];

const PASSIVE_SKILL_BY_CLASS = {
  archmage: "knowledgeOfSpheres",
  alchemist: "wildExperiment",
  warlock: "bloodrite",
  monk: "monasticArts",
  ranger: "woodcraft",
};

export function createDefaultBuild() {
  return {
    rulesetId: PROTECTORS_RULESET_ID,
    name: "New Hero",
    raceId: "knight",
    classId: "warrior",
    level: 1,
    statAllocation: emptyStats(),
    skillAllocation: {},
  };
}

export const clampLevel = (level) => Math.max(1, Math.min(HERO_MAX_LEVEL, Math.trunc(Number(level) || 1)));

export const getTotalSkillPointsForLevel = (level) => {
  const numericLevel = Math.trunc(Number(level) || 0);
  if (numericLevel < 1) return 0;
  const targetLevel = Math.min(HERO_MAX_LEVEL, numericLevel);
  if (targetLevel <= 10) return 5 * targetLevel;
  if (targetLevel <= 20) return 4 * (targetLevel - 10) + 50;
  if (targetLevel <= 40) return 3 * (targetLevel - 20) + 90;
  return 2 * (targetLevel - 40) + 150;
};

export const getStatPointsForLevel = (level) => Math.floor(getTotalSkillPointsForLevel(level) / PROTECTORS_STAT_COST);

export const getSkillPointsForLevel = getTotalSkillPointsForLevel;

export function getExperienceForLevel(level) {
  const targetLevel = clampLevel(level);
  return 75 * (targetLevel - 1) * (targetLevel - 1);
}

export function calculateStartingStats(raceId, classId) {
  const race = getRace(raceId);
  const heroClass = getHeroClass(classId);
  return STAT_KEYS.reduce((stats, key) => {
    stats[key] = 5 + race.statMods[key] + heroClass.statMods[key];
    return stats;
  }, emptyStats());
}

export function calculatePrimaryStats(build) {
  const startingStats = calculateStartingStats(build.raceId, build.classId);
  const allocation = normalizeStatAllocation(build.statAllocation);
  return STAT_KEYS.reduce((stats, key) => {
    stats[key] = startingStats[key] + allocation[key];
    return stats;
  }, emptyStats());
}

export function mergeCareerSkills(raceId, classId) {
  const race = getRace(raceId);
  const heroClass = getHeroClass(classId);
  const merged = [];

  for (let index = 0; index < 5; index += 1) {
    applySkill(merged, race.skills[index]);
    applySkill(merged, heroClass.skills[index]);
  }

  return merged
    .map((unlock) => ({
      ...unlock,
      startingLevel: 0,
    }))
    .sort((a, b) => {
      if (a.availableAt !== b.availableAt) return a.availableAt - b.availableAt;
      return String(a.skillId).localeCompare(String(b.skillId));
    });
}

export function getAvailableSkillUnlocks(build) {
  const level = clampLevel(build.level);
  const allocation = normalizeSkillAllocation(build.skillAllocation);
  const unlocks = mergeCareerSkills(build.raceId, build.classId);
  const visibleUnlocks = unlocks.map((unlock) => {
    const levelAvailable = unlock.availableAt <= level;
    return {
      ...unlock,
      displayName: skillsById[unlock.skillId]?.displayName ?? unlock.skillId,
      available: levelAvailable,
      levelAvailable,
      prerequisiteMet: true,
      priorSkillPoints: 0,
      requiredPriorSkillPoints: 0,
      currentLevel: unlock.startingLevel + (allocation[unlock.skillId] ?? 0),
      maxLevel: getSkillMaxLevel(unlock, level),
    };
  });

  return [...visibleUnlocks, getPassiveSkillUnlock(build, level)];
}

export function validateSkillAllocation(build) {
  const warnings = [];
  const level = clampLevel(build.level);
  const allocation = normalizeSkillAllocation(build.skillAllocation);
  const unlocks = getAvailableSkillUnlocks(build);
  const unlocksBySkill = Object.fromEntries(unlocks.map((unlock) => [unlock.skillId, unlock]));
  const spent = sumValues(allocation);
  const budget = getPointBudget(build);

  if (budget.spent > budget.available) {
    warnings.push(`Hero point allocation spends ${budget.spent} of ${budget.available} available points.`);
  }

  for (const [skillId, points] of Object.entries(allocation)) {
    const unlock = unlocksBySkill[skillId];
    if (!unlock && points > 0) {
      warnings.push(`${formatSkillName(skillId)} is not in this hero career.`);
      continue;
    }
    if (points <= 0) continue;
    if (unlock.passive) {
      warnings.push(`${formatSkillName(skillId)} is a passive Protectors slot and cannot be raised directly.`);
      continue;
    }
    if (unlock.availableAt > level) {
      warnings.push(`${formatSkillName(skillId)} unlocks at level ${unlock.availableAt}.`);
    }
    const maxLevel = getSkillMaxLevel(unlock, level);
    if (maxLevel !== Infinity && unlock.startingLevel + points > maxLevel) {
      warnings.push(`${formatSkillName(skillId)} is capped at ${maxLevel} for level ${level}.`);
    }
  }

  return {
    valid: warnings.length === 0,
    warnings,
    spent,
    available: budget.available,
  };
}

export function validateStatAllocation(build) {
  const allocation = normalizeStatAllocation(build.statAllocation);
  const spent = sumValues(allocation);
  const budget = getPointBudget({ ...build, statAllocation: allocation });
  const warnings =
    budget.spent <= budget.available
      ? []
      : [`Hero point allocation spends ${budget.spent} of ${budget.available} available points.`];
  return {
    valid: warnings.length === 0,
    warnings,
    spent,
    available: Math.floor(budget.available / PROTECTORS_STAT_COST),
  };
}

export function getPointBudget(build) {
  const level = clampLevel(build.level);
  const statAllocation = normalizeStatAllocation(build.statAllocation);
  const skillAllocation = normalizeSkillAllocation(build.skillAllocation);
  const statSpent = sumValues(statAllocation);
  const skillSpent = sumValues(skillAllocation);
  const available = getTotalSkillPointsForLevel(level);
  const spent = statSpent * PROTECTORS_STAT_COST + skillSpent * PROTECTORS_SKILL_COST;
  return {
    mode: "shared",
    label: "Hero Points",
    statLabel: "Stats",
    skillLabel: "Skills",
    available,
    spent,
    remaining: available - spent,
    statSpent,
    skillSpent,
    statCost: PROTECTORS_STAT_COST,
    skillCost: PROTECTORS_SKILL_COST,
  };
}

export function calculateHeroSummary(build) {
  const level = clampLevel(build.level);
  const heroClass = getHeroClass(build.classId);
  const stats = calculatePrimaryStats(build);
  const skillLevels = getSkillLevels(build);

  const strengthBonus = statBonus(stats.strength);
  const dexterityBonus = statBonus(stats.dexterity);
  const intelligenceBonus = statBonus(stats.intelligence);
  const charismaBonus = statBonus(stats.charisma);
  const combat = roundStat(heroClass.baseCombat + skillEffect("ferocity", (skillLevels.ferocity ?? 0) + strengthBonus) / 10);
  const speed = roundStat(heroClass.baseSpeed + skillEffect("running", (skillLevels.running ?? 0) + dexterityBonus) / 100);
  const attackSpeed = calculateAttackSpeed(stats, skillLevels);
  const life = heroClass.baseLife + skillEffect("constitution", (skillLevels.constitution ?? 0) + strengthBonus);
  const mana = heroClass.baseMana + skillEffect("lore", (skillLevels.lore ?? 0) + intelligenceBonus);
  const damage = roundStat(heroClass.baseMaxDamage + skillEffect("mightyBlow", (skillLevels.mightyBlow ?? 0) + strengthBonus) / 10);
  const armor = Math.max(0, heroClass.baseArmor - 100) + Math.trunc(skillEffect("invulnerability", skillLevels.invulnerability) / 10);
  const resistance = heroClass.baseResistance + Math.trunc(skillEffect("warding", (skillLevels.warding ?? 0) + dexterityBonus) / 10);
  const damageResistances = calculateDamageResistances(resistance, armor, skillLevels);
  const lifeRegen = calculateLifeRegen(stats, skillLevels);
  const manaRegen = calculateManaRegen(stats, skillLevels);
  const spellcasting = skillEffect("ritual", (skillLevels.ritual ?? 0) + intelligenceBonus);
  const initialTroopXp = skillEffect("trainer", (skillLevels.trainer ?? 0) + charismaBonus);
  const morale = calculateMorale(build.raceId, stats, skillLevels);
  const commandEffect = calculateCommandEffect(morale);
  const unitAttackSpeed = calculateUnitAttackSpeed(morale);
  const merchant = calculateMerchant(stats, skillLevels);
  const command = calculateCommand(stats, skillLevels);
  const commandRadius = getEffectiveCommandRadius(command);
  const groupLimit = getGroupLimitFromCommand(command);
  const conversion = 8 + Math.trunc(level / 2);
  const conversionTime = Math.max(5, 50 - skillEffect("convincing", (skillLevels.convincing ?? 0) + dexterityBonus));
  const conversionRange = commandRadius;
  const armyLimitBonus = calculateArmyLimitBonus(morale);
  const retinueSlots = 8;
  const skillEffectList = calculateSkillEffectList(skillLevels, { includeInactive: true });
  const skillEffects = calculateConditionalSkillEffects(skillLevels);

  return {
    level,
    xpForLevel: getExperienceForLevel(level),
    nextLevelXp: level >= HERO_MAX_LEVEL ? null : getExperienceForLevel(level + 1),
    stats,
    skillLevels,
    combat,
    speed,
    attackSpeed,
    life,
    mana,
    damage,
    damageType: heroClass.id === "monk" ? "Crushing" : "Slashing",
    armor,
    resistance,
    damageResistances,
    lifeRegen,
    manaRegen,
    spellcasting,
    initialTroopXp,
    morale,
    commandEffect,
    unitAttackSpeed,
    merchant,
    commandRadius,
    command,
    groupLimit,
    conversion,
    conversionTime,
    conversionRange,
    armyLimitBonus,
    retinueSlots,
    skillEffects,
    skillEffectList,
    dataNotes: {
      formulas: dataNotes.derivedStats,
      statBonuses: dataNotes.statBonuses,
      attackTiming: dataNotes.attackTiming,
      regeneration: dataNotes.regeneration,
      utilityStats: dataNotes.utilityStats,
      moraleEffects: dataNotes.moraleEffects,
      moraleAttackTiming: dataNotes.moraleAttackTiming,
      commandEffect: dataNotes.commandEffect,
      damageResistances: dataNotes.damageResistances,
      commandRuntime: dataNotes.commandRuntime,
      commandCap: dataNotes.commandCap,
      conversionStats: dataNotes.conversionStats,
      secondaryStats: dataNotes.secondaryStats,
      skillEffects: dataNotes.skillEffects,
      protectorsOpenSystems: dataNotes.openProtectorsSystems,
    },
  };
}

export function calculateConditionalSkillEffects(skillLevels = {}) {
  return calculateSkillEffectList(skillLevels);
}

export function calculateSkillEffectList(skillLevels = {}, options = {}) {
  const effects = [];
  const listed = new Set();
  const includeInactive = options.includeInactive === true;
  const hasListedSkill = (skillId) => Object.prototype.hasOwnProperty.call(skillLevels ?? {}, skillId);
  const currentLevel = (skillId) => Math.max(0, Math.trunc(skillLevels?.[skillId] ?? 0));
  const shouldInclude = (skillId) => (includeInactive ? hasListedSkill(skillId) : currentLevel(skillId) > 0);
  const add = (skillId, label, value, detail = "", category = "Skill Effects") => {
    if (!shouldInclude(skillId)) return;
    listed.add(skillId);
    effects.push({
      skillId,
      label,
      value,
      detail,
      category,
      dataNote: dataNotes.skillEffects,
    });
  };
  const addSkillEffect = (skillId, label, formatter, detail = "", category = "Skill Effects") => {
    if (!shouldInclude(skillId)) return;
    const level = currentLevel(skillId);
    add(skillId, label, formatter(skillEffect(skillId, level), level), detail, category);
  };

  addSkillEffect("ferocity", "Combat", (value) => formatDecimal(value / 10), "Included in Combat", "Core");
  addSkillEffect("constitution", "Life", (value) => signed(value), "Included in Life", "Core");
  addSkillEffect("running", "Speed", (value) => `+${formatDecimal(value / 100)}`, "Included in Speed", "Core");
  addSkillEffect("lore", "Mana", (value) => signed(value), "Included in Mana", "Core");
  addSkillEffect("ritual", "Spellcasting", (value) => value, "Included in Spellcasting", "Magic");

  for (const skillId of MAGIC_SKILL_IDS) {
    addSkillEffect(skillId, "Spells Known", (value) => formatMagicSkillProgress(value), "Unlocks spells in this sphere", "Magic");
  }

  addSkillEffect("swiftness", "Attack Period", (value) => `${formatDecimal(value / 1000)}s`, "Lower is faster", "Combat");
  addSkillEffect("warding", "Resistance", (value) => signed(Math.trunc(value / 10)), "Included in Resistance", "Shown Breakouts");
  addSkillEffect("leadership", "Morale", (value) => signed(value), "Included in Morale", "Command");
  addSkillEffect("merchant", "Merchant Score", (value) => signed(value), "Improves shop prices", "Economy");
  addSkillEffect("trainer", "Initial Troop XP", (value) => signed(value), "Included in Initial Troop XP", "Troop XP");
  addSkillEffect("authority", "Command Radius", (value) => signed(value), "Included in Command Radius", "Command");
  addSkillEffect("convincing", "Conversion Time", (value) => `-${value}s`, "Included in Conversion Time", "Command");

  for (const skill of skills) {
    if (skill.id === "null" || listed.has(skill.id) || !shouldInclude(skill.id)) continue;
    const value = skillEffect(skill.id, currentLevel(skill.id));
    add(skill.id, skill.displayName, formatGenericSkillValue(skill.id, value), "", skill.category || "Skill Effects");
  }

  return effects;
}

export function calculateAttackSpeed(stats, skillLevels = {}) {
  const effectiveRank = (skillLevels.swiftness ?? 0) + statBonus(stats.dexterity);
  const periodMs = Math.max(400, skillEffect("swiftness", effectiveRank));
  return {
    periodMs,
    multiplier: Number((periodMs / 1000).toFixed(2)),
    bonusPercent: Math.round(100 - (periodMs / 10)),
    dexterityBonus: statBonus(stats.dexterity),
    swiftnessBonus: Math.max(0, Math.round(1000 - periodMs)),
    fightSpeed: 10,
  };
}

export function calculateResistance(heroClass, stats, skillLevels = {}) {
  return heroClass.baseResistance + Math.trunc(skillEffect("warding", (skillLevels.warding ?? 0) + statBonus(stats.dexterity)) / 10);
}

export function calculateDamageResistances(baseResistance, baseArmor = 0, skillLevels = {}) {
  const elemental = Math.trunc(skillEffect("elementalResistance", skillLevels.elementalResistance) / 10);
  return {
    piercing: baseArmor + Math.trunc(skillEffect("armorer", skillLevels.armorer) / 10),
    slashing: baseArmor + Math.trunc(skillEffect("scales", skillLevels.scales) / 10),
    crushing: baseArmor + Math.trunc(skillEffect("thickHide", skillLevels.thickHide) / 10),
    fire: baseResistance + Math.trunc(skillEffect("fireResistance", skillLevels.fireResistance) / 10) + elemental,
    cold: baseResistance + Math.trunc(skillEffect("coldResistance", skillLevels.coldResistance) / 10) + elemental,
    electricity: baseResistance + Math.trunc(skillEffect("electricityResistance", skillLevels.electricityResistance) / 10) + elemental,
    magic: Math.trunc(skillEffect("magicResistance", skillLevels.magicResistance) / 10),
  };
}

export function calculateLifeRegen(stats, skillLevels = {}) {
  const effectiveRank = (skillLevels.regeneration ?? 0) + statBonus(stats.strength);
  const periodMs = Math.max(250, 7500 - effectiveRank * 125);
  return {
    periodMs,
    pointsPer20Seconds: Math.max(1, Math.trunc(REGEN_BASE_MS / periodMs)),
    skillBonusPercent: Math.max(0, effectiveRank),
  };
}

export function calculateManaRegen(stats, skillLevels = {}) {
  const effectiveRank = (skillLevels.energy ?? 0) + statBonus(stats.intelligence);
  const periodMs = Math.max(1000, 15000 - effectiveRank * 200);
  return {
    periodMs,
    pointsPer20Seconds: Math.max(1, Math.trunc(REGEN_BASE_MS / periodMs)),
    skillBonusPercent: Math.max(0, effectiveRank),
  };
}

export function calculateMorale(raceId, stats, skillLevels = {}) {
  const racialSkillId = RACE_MORALE_SKILL_IDS[raceId];
  return statBonus(stats.charisma) + skillEffect("leadership", skillLevels.leadership) + skillEffect(racialSkillId, skillLevels[racialSkillId]);
}

export function calculateCommandEffect(morale) {
  return Math.max(1, Math.trunc(Number(morale) || 0));
}

export function calculateArmyLimitBonus(morale) {
  return Math.trunc((Number(morale) || 0) / 2);
}

export function calculateUnitAttackSpeed(morale) {
  const periodMs = Math.max(500, 1500 - Math.trunc(Number(morale) || 0) * 10);
  return {
    periodMs,
    seconds: Number((periodMs / 1000).toFixed(2)),
  };
}

export function calculateMerchant(stats, skillLevels = {}) {
  const score = skillEffect("merchant", (skillLevels.merchant ?? 0) + statBonus(stats.charisma));
  const discountPercent = score === 0 ? 0 : 100 - 100 * (100 / (score + 100));
  return {
    score,
    discountPercent: Number(discountPercent.toFixed(1)),
  };
}

export function calculateCommand(stats, skillLevels = {}) {
  return 5 + statBonus(stats.charisma) + skillEffect("authority", skillLevels.authority);
}

export function getEffectiveCommandRadius(command) {
  return Math.min(Math.trunc(Number(command) || 0), MAX_EFFECTIVE_COMMAND);
}

export function getGroupLimitFromCommand(command) {
  const value = Math.trunc(Number(command) || 0);
  if (value >= 20) return 14;
  if (value >= 15) return 13;
  if (value >= 10) return 12;
  if (value >= 5) return 11;
  return 10;
}

export function getSkillLevels(build) {
  return getAvailableSkillUnlocks(build).reduce((levels, unlock) => {
    levels[unlock.skillId] = unlock.currentLevel;
    return levels;
  }, {});
}

export function skillEffect(skillId, value = 0) {
  const rank = Math.max(0, Math.trunc(value));
  if (rank === 0) {
    if (skillId === "swiftness") return 1000;
    return 0;
  }

  if (skillId === "constitution") return rank * 15;
  if (skillId === "ferocity") return rank * 5;
  if (skillId === "lore") return rank * 4;
  if (skillId === "running") return Math.trunc((rank * 100) / 3);
  if (skillId === "swiftness") return Math.trunc(997.0359333 * Math.pow(0.9767324077, rank));
  if (skillId === "warding") return rank * 5;
  if (skillId === "ritual") return Math.trunc(4 * Math.sqrt(rank) + rank * 2);
  if (skillId === "regeneration") return rank * 125;
  if (skillId === "energy") return rank * 200;
  if (["leadership", "merchant", "convincing", "authority"].includes(skillId)) return rank;
  if (["armorer", "scales", "thickHide", "fireResistance", "coldResistance", "electricityResistance", "magicResistance"].includes(skillId)) return rank * 5;
  if (skillId === "elementalResistance") return rank * 2;
  if (["mightyBlow", "leech", "vampirism", "weaponmaster", "lethalBlow"].includes(skillId)) return rank * 2;
  if (["wealth", "quarrying", "smelting", "gemcutting", "pillaging", "metallurgy", "runecrafting", "tactician"].includes(skillId)) return rank;
  if (["trainer", "riding", "airmaster", "saurianOverlord", "guardianOak", "golemMaster", "mageKing", "gate", "brewmaster", "memories"].includes(skillId)) return rank * 1000;
  if (RACE_MORALE_SKILL_IDS && Object.values(RACE_MORALE_SKILL_IDS).includes(skillId)) return rank;
  if (MAGIC_SKILL_IDS.includes(skillId)) return rank;
  return rank;
}

export function normalizeStatAllocation(value = {}) {
  return STAT_KEYS.reduce((stats, key) => {
    stats[key] = Math.max(0, Math.trunc(Number(value[key]) || 0));
    return stats;
  }, emptyStats());
}

export function normalizeSkillAllocation(value = {}) {
  return Object.fromEntries(
    Object.entries(value)
      .map(([skillId, points]) => [skillId, Math.max(0, Math.trunc(Number(points) || 0))])
      .filter(([, points]) => points > 0),
  );
}

function applySkill(merged, unlock) {
  if (!unlock || unlock.skillId === "null") return;
  const existing = merged.find((entry) => entry.skillId === unlock.skillId);
  if (!existing) {
    merged.push({ ...unlock, rawStartingLevel: unlock.startingLevel, mergedFrom: [unlock.origin] });
    return;
  }

  existing.availableAt = 1;
  existing.rawStartingLevel = (existing.rawStartingLevel ?? existing.startingLevel) + unlock.startingLevel + 2;
  existing.mergedFrom.push(unlock.origin);
}

function getPassiveSkillUnlock(build, level) {
  const skillId = PASSIVE_SKILL_BY_CLASS[build.classId] ?? "profNone";
  return {
    skillId,
    origin: "class",
    availableAt: 1,
    startingLevel: level,
    rawStartingLevel: level,
    dataNote: dataNotes.skillSetup,
    mergedFrom: ["passive"],
    displayName: skillsById[skillId]?.displayName ?? skillId,
    available: true,
    levelAvailable: true,
    prerequisiteMet: true,
    priorSkillPoints: 0,
    requiredPriorSkillPoints: 0,
    currentLevel: level,
    maxLevel: level,
    passive: true,
  };
}

function getSkillMaxLevel(unlock, level) {
  if (unlock?.passive) return level;
  if (!unlock) return 0;
  if (level < unlock.availableAt) return 0;
  return Math.max(0, unlock.startingLevel + getTotalSkillPointsForLevel(level) - getTotalSkillPointsForLevel(unlock.availableAt - 1));
}

function getRace(raceId) {
  const race = racesById[raceId];
  if (!race) throw new Error(`Unknown Protectors race: ${raceId}`);
  return race;
}

function getHeroClass(classId) {
  const heroClass = heroClassesById[classId];
  if (!heroClass) throw new Error(`Unknown Protectors class: ${classId}`);
  return heroClass;
}

function statBonus(value) {
  return Math.trunc((Math.max(0, Number(value) || 0) * 75) / 100);
}

function roundStat(value) {
  const number = Number(value) || 0;
  return Number.isInteger(number) ? number : Number(number.toFixed(2));
}

function formatSkillName(skillId) {
  return skillsById[skillId]?.displayName ?? skillId;
}

function formatGenericSkillValue(skillId, value) {
  if (MAGIC_SKILL_IDS.includes(skillId)) return formatMagicSkillProgress(value);
  if (skillId.includes("Missile")) return value > 0 ? "Unlocked" : "Inactive";
  return value > 0 ? signed(value) : "0";
}

function formatMagicSkillProgress(value) {
  if (value <= 0) return "No spells";
  const spellCount = value % 10 || 10;
  const spellLabel = spellCount === 1 ? "spell" : "spells";
  return `${spellCount} ${spellLabel} / level ${Math.ceil(value / 10)}`;
}

function signed(value) {
  const number = roundStat(value);
  return number > 0 ? `+${number}` : String(number);
}

function formatDecimal(value) {
  const number = Number(value) || 0;
  return number.toFixed(2).replace(/\.00$/, "").replace(/0$/, "");
}

function sumValues(value) {
  return Object.values(value).reduce((total, item) => total + item, 0);
}
