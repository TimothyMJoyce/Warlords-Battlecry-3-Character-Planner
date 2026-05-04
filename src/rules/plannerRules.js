import {
  STAT_KEYS,
  HERO_MAX_LEVEL,
  XP_THRESHOLDS_TO_LEVEL_51,
  dataNotes,
  heroClassesById,
  racesById,
  skillsById,
} from "../data/gameData.js";
import { applyItemSkillBonuses, calculateEquippedItemEffects } from "./itemEffects.js";

export const emptyStats = () => ({
  strength: 0,
  dexterity: 0,
  intelligence: 0,
  charisma: 0,
});

const REGEN_BASE_MS = 20000;
const MAX_EFFECTIVE_COMMAND = 19;
const HERO_ATTACK_SPEED_FALLBACK_PERIOD_MS = 1;

const CONVERSION_TIME_BY_SCORE = [
  100, 80, 70, 60, 50, 48, 45, 42, 39, 36, 33, 32, 30, 29, 28, 27, 26, 25, 24, 23,
  22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 12, 12, 12, 12, 12, 12, 12, 12, 11,
  11, 11, 11, 11, 11, 11, 11, 11, 11, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 9,
  9, 9, 9, 9, 9, 9, 9, 9, 9, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 7,
  7, 7, 7, 7, 7, 7, 7, 7, 7, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 5,
];

const CONVERSION_RANGE_BY_SCORE = [
  3, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 7, 7, 7, 7, 7, 8, 8, 8, 8, 8,
  9, 10, 11, 12, 13,
];

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
];

const RACE_MORALE_SKILL_VALUES = Object.values(RACE_MORALE_SKILL_IDS);

export const clampLevel = (level) => Math.max(1, Math.min(HERO_MAX_LEVEL, Math.trunc(Number(level) || 1)));

export const getStatPointsForLevel = (level) => Math.max(0, clampLevel(level) - 1);

export const getSkillPointsForLevel = getStatPointsForLevel;

export function getExperienceForLevel(level) {
  const targetLevel = clampLevel(level);
  if (targetLevel <= 0) return 0;
  const index = targetLevel - 1;
  if (index <= 50) return XP_THRESHOLDS_TO_LEVEL_51[index];
  return XP_THRESHOLDS_TO_LEVEL_51[50] + (index - 50) * 4000;
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
    applySkill(merged, race.skills[index], true);
    applySkill(merged, heroClass.skills[index], false);
  }

  return merged.sort((a, b) => {
    if (a.availableAt !== b.availableAt) return a.availableAt - b.availableAt;
    return b.startingLevel - a.startingLevel;
  });
}

export function getAvailableSkillUnlocks(build) {
  const level = clampLevel(build.level);
  const allocation = normalizeSkillAllocation(build.skillAllocation);
  const unlocks = mergeCareerSkills(build.raceId, build.classId);
  return unlocks.map((unlock) => {
    const prerequisites = getSkillPrerequisiteState(unlock, unlocks, allocation);
    const levelAvailable = unlock.availableAt <= level;
    return {
      ...unlock,
      displayName: skillsById[unlock.skillId]?.displayName ?? unlock.skillId,
      available: levelAvailable && prerequisites.met,
      levelAvailable,
      prerequisiteMet: prerequisites.met,
      priorSkillPoints: prerequisites.priorPoints,
      requiredPriorSkillPoints: prerequisites.requiredPoints,
      currentLevel: unlock.startingLevel + (allocation[unlock.skillId] ?? 0),
      maxLevel: getSkillMaxLevel(unlock, level),
    };
  });
}

export function validateSkillAllocation(build) {
  const warnings = [];
  const level = clampLevel(build.level);
  const allocation = normalizeSkillAllocation(build.skillAllocation);
  const unlocks = mergeCareerSkills(build.raceId, build.classId);
  const unlocksBySkill = Object.fromEntries(unlocks.map((unlock) => [unlock.skillId, unlock]));
  const spent = sumValues(allocation);
  const availablePoints = getSkillPointsForLevel(level);

  if (spent > availablePoints) {
    warnings.push(`Skill allocation spends ${spent} of ${availablePoints} available points.`);
  }

  for (const [skillId, points] of Object.entries(allocation)) {
    const unlock = unlocksBySkill[skillId];
    if (!unlock && points > 0) {
      warnings.push(`${formatSkillName(skillId)} is not in this hero career.`);
      continue;
    }
    if (points <= 0) continue;
    if (unlock.availableAt > level) {
      warnings.push(`${formatSkillName(skillId)} unlocks at level ${unlock.availableAt}.`);
    } else {
      const prerequisites = getSkillPrerequisiteState(unlock, unlocks, allocation);
      if (!prerequisites.met) {
        warnings.push(
          `${formatSkillName(skillId)} needs ${prerequisites.requiredPoints} points in earlier skill tiers before it can be raised (${prerequisites.priorPoints}/${prerequisites.requiredPoints}).`,
        );
      }
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
    available: availablePoints,
  };
}

export function validateStatAllocation(build) {
  const allocation = normalizeStatAllocation(build.statAllocation);
  const spent = sumValues(allocation);
  const available = getStatPointsForLevel(build.level);
  return {
    valid: spent <= available,
    warnings: spent <= available ? [] : [`Stat allocation spends ${spent} of ${available} available points.`],
    spent,
    available,
  };
}

export function getPointBudget(build) {
  const statValidation = validateStatAllocation(build);
  const skillValidation = validateSkillAllocation(build);
  return {
    mode: "separate",
    label: "Points",
    statLabel: "Stat Points",
    skillLabel: "Skill Points",
    statSpent: statValidation.spent,
    statAvailable: statValidation.available,
    skillSpent: skillValidation.spent,
    skillAvailable: skillValidation.available,
    statCost: 1,
    skillCost: 1,
  };
}

export function calculateHeroSummary(build) {
  const level = clampLevel(build.level);
  const heroClass = getHeroClass(build.classId);
  const stats = calculatePrimaryStats(build);
  const baseSkillLevels = getSkillLevels(build);
  const itemEffects = calculateEquippedItemEffects(build);
  const skillLevels = applyItemSkillBonuses(baseSkillLevels, itemEffects);
  const itemBreakdowns = buildItemBreakdowns(itemEffects, baseSkillLevels);

  const combat = bonus(stats, "combat") + skillEffect("ferocity", skillLevels.ferocity) + itemTotal(itemEffects, "combat");
  const speed =
    bonus(stats, "speed") +
    skillEffect("running", skillLevels.running) +
    itemTotal(itemEffects, "speed") +
    itemTotal(itemEffects, "speedAll") -
    itemTotal(itemEffects, "slow") -
    itemTotal(itemEffects, "slowAll");
  const attackSpeed = calculateAttackSpeed(stats, skillLevels, itemEffects);
  const life =
    heroClass.baseLife +
    (level - 1) * heroClass.lifePerLevel +
    skillEffect("constitution", skillLevels.constitution) +
    bonus(stats, "life");
  const mana =
    heroClass.baseMana +
    bonus(stats, "mana") +
    skillEffect("lore", skillLevels.lore);
  const fireMissileActive = hasSkill(skillLevels, "fireMissile");
  const rawDamageAdd = skillEffect("mightyBlow", skillLevels.mightyBlow) + itemTotal(itemEffects, "weaponDamage");
  const damage = 10 + bonus(stats, "damage") + (fireMissileActive ? Math.trunc(rawDamageAdd / 3) : rawDamageAdd);
  const armor =
    heroClass.baseArmor +
    bonus(stats, "armor") +
    skillEffect("invulnerability", skillLevels.invulnerability) +
    itemTotal(itemEffects, "armor");
  const resistance = calculateResistance(heroClass, stats, skillLevels, itemEffects);
  const damageResistances = calculateDamageResistances(resistance, armor, skillLevels, itemEffects);
  const lifeRegen = calculateLifeRegen(stats, skillLevels, itemEffects);
  const manaRegen = calculateManaRegen(stats, skillLevels, itemEffects);
  const spellcasting =
    bonus(stats, "spellcasting") +
    skillEffect("ritual", skillLevels.ritual) +
    itemTotal(itemEffects, "spellcasting");
  const initialTroopXp = bonus(stats, "initialTroopXp") + itemTotal(itemEffects, "training");
  const moraleBreakdown = calculateMoraleBreakdown(build.raceId, stats, skillLevels, itemEffects);
  const moraleViews = {
    general: calculateMoraleView(moraleBreakdown.baseTotal),
    racial: calculateMoraleView(moraleBreakdown.total),
  };
  const morale = moraleViews.racial.morale;
  const commandEffect = moraleViews.racial.commandEffect;
  const armyLimitBonus = moraleViews.racial.armyLimitBonus;
  const unitAttackSpeed = moraleViews.racial.unitAttackSpeed;
  const merchant = calculateMerchant(stats, skillLevels, itemEffects, baseSkillLevels);
  const armySetupPoints = calculateArmySetupPoints(stats, skillLevels);
  const command = calculateCommand(stats, itemEffects);
  const commandRadius = getEffectiveCommandRadius(calculateCommandRadius(stats) + itemTotal(itemEffects, "command"));
  const groupLimit = getGroupLimitFromCommand(command);
  const conversion = calculateConversion(level, itemEffects);
  const conversionTime = getConversionTime(conversion);
  const conversionRange = commandRadius;
  const retinueSlots = 8;
  const skillEffects = calculateConditionalSkillEffects(skillLevels, itemEffects);
  const skillEffectList = calculateSkillEffectList(skillLevels, { includeInactive: true, itemEffects });
  const statBreakdowns = buildStatBreakdowns({
    level,
    heroClass,
    stats,
    skillLevels,
    itemEffects,
    combat,
    speed,
    attackSpeed,
    life,
    mana,
    damage,
    armor,
    resistance,
    damageResistances,
    lifeRegen,
    manaRegen,
    spellcasting,
    initialTroopXp,
    morale,
    moraleBreakdown,
    merchant,
    armySetupPoints,
    command,
    commandRadius,
    conversion,
    conversionTime,
    rawDamageAdd,
    fireMissileActive,
  });
  const statModifierFlags = buildStatModifierFlags({
    skillLevels,
    itemEffects,
    moraleBreakdown,
    merchant,
    fireMissileActive,
  });

  return {
    level,
    xpForLevel: getExperienceForLevel(level),
    nextLevelXp: level >= HERO_MAX_LEVEL ? null : getExperienceForLevel(level + 1),
    stats,
    baseSkillLevels,
    skillLevels,
    combat,
    speed,
    attackSpeed,
    life,
    mana,
    damage,
    damageType: getDamageType(heroClass, skillLevels, itemEffects),
    armor,
    resistance,
    damageResistances,
    lifeRegen,
    manaRegen,
    spellcasting,
    initialTroopXp,
    morale,
    moraleBreakdown,
    moraleViews,
    commandEffect,
    unitAttackSpeed,
    merchant,
    armySetupPoints,
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
    itemEffects,
    itemBreakdowns,
    statBreakdowns,
    statModifierFlags,
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
    },
  };
}

const itemSkillBreakdownTargets = {
  constitution: [{ key: "life", label: "Life" }],
  ferocity: [{ key: "combat", label: "Combat" }],
  running: [{ key: "speed", label: "Speed" }],
  lore: [{ key: "mana", label: "Mana" }],
  ritual: [{ key: "spellcasting", label: "Spellcasting" }],
  mightyBlow: [{ key: "damage", label: "Damage" }],
  invulnerability: [
    { key: "armor", label: "Armor" },
    { key: "piercing", label: "Piercing" },
    { key: "slashing", label: "Slashing" },
    { key: "crushing", label: "Crushing" },
  ],
  warding: [
    { key: "resistance", label: "Resistance" },
    { key: "fire", label: "Fire" },
    { key: "cold", label: "Cold" },
    { key: "electricity", label: "Electricity" },
  ],
  armorer: [{ key: "piercing", label: "Piercing" }],
  scales: [{ key: "slashing", label: "Slashing" }],
  thickHide: [{ key: "crushing", label: "Crushing" }],
  fireResistance: [{ key: "fire", label: "Fire" }],
  coldResistance: [{ key: "cold", label: "Cold" }],
  electricityResistance: [{ key: "electricity", label: "Electricity" }],
  elementalResistance: [
    { key: "fire", label: "Fire" },
    { key: "cold", label: "Cold" },
    { key: "electricity", label: "Electricity" },
  ],
  magicResistance: [{ key: "magic", label: "Magic" }],
  regeneration: [{ key: "lifeRegen", label: "Life Regen", format: formatSignedPercent }],
  energy: [{ key: "manaRegen", label: "Mana Regen", format: formatSignedPercent }],
  merchant: [{ key: "merchant", label: "Merchant" }],
  diplomacy: [{ key: "armySetupPoints", label: "Army Setup Points" }],
  leadership: [{ key: "morale", label: "Morale" }],
};

for (const skillId of RACE_MORALE_SKILL_VALUES) {
  itemSkillBreakdownTargets[skillId] = [{ key: "morale", label: "Morale" }];
}

function buildItemBreakdowns(itemEffects = {}, baseSkillLevels = {}) {
  const breakdowns = cloneItemBreakdowns(itemEffects.breakdowns);
  const runningSkillLevels = { ...baseSkillLevels };

  for (const contribution of itemEffects.skillContributions ?? []) {
    const skillId = contribution.skillId;
    const amount = Math.trunc(Number(contribution.amount) || 0);
    const targets = itemSkillBreakdownTargets[skillId] ?? [];
    if (!amount || !targets.length) continue;

    const before = Math.max(0, Math.trunc(Number(runningSkillLevels[skillId]) || 0));
    const after = Math.max(0, before + amount);
    runningSkillLevels[skillId] = after;

    const delta = skillEffect(skillId, after) - skillEffect(skillId, before);
    if (!delta) continue;

    for (const target of targets) {
      addItemBreakdown(breakdowns, target.key, contribution.source, formatSkillItemBreakdown(contribution, delta, target), delta);
    }
  }

  return breakdowns;
}

function cloneItemBreakdowns(value = {}) {
  return Object.fromEntries(
    Object.entries(value ?? {}).map(([key, entries]) => [
      key,
      Array.isArray(entries) ? entries.map((entry) => ({ ...entry })) : [],
    ]),
  );
}

function addItemBreakdown(breakdowns, key, source, text, amount = null) {
  if (!key || !text) return;
  if (!breakdowns[key]) breakdowns[key] = [];
  const entry = { source, text };
  const numericAmount = Number(amount);
  if (Number.isFinite(numericAmount)) entry.amount = numericAmount;
  breakdowns[key].push(entry);
}

function formatSkillItemBreakdown(contribution, delta, target) {
  const value = target.format ? target.format(delta) : formatSigned(delta);
  const amount = formatSigned(contribution.amount);
  return `${value} ${target.label} from ${contribution.skillName} ${amount}`;
}

function buildStatBreakdowns({
  level,
  heroClass,
  stats,
  skillLevels,
  itemEffects,
  combat,
  speed,
  attackSpeed,
  life,
  mana,
  damage,
  armor,
  resistance,
  damageResistances,
  lifeRegen,
  manaRegen,
  spellcasting,
  initialTroopXp,
  morale,
  moraleBreakdown,
  merchant,
  armySetupPoints,
  command,
  commandRadius,
  conversion,
  conversionTime,
  rawDamageAdd,
  fireMissileActive,
}) {
  const item = (key) => itemTotal(itemEffects, key);
  const skill = (key) => skillEffect(key, skillLevels[key]);
  const levelLife = (level - 1) * heroClass.lifePerLevel;
  const speedItems = item("speed") + item("speedAll") - item("slow") - item("slowAll");
  const attackSpeedItems = item("speedAttack") + item("speedAll") - item("slowAttack") - item("slowAll");
  const damageBonus = fireMissileActive ? Math.trunc(rawDamageAdd / 3) : rawDamageAdd;
  const elemental = skill("elementalResistance");
  const commandRadiusRaw = calculateCommandRadius(stats) + item("command");
  const racialSkillName = moraleBreakdown.racialSkillId ? formatSkillName(moraleBreakdown.racialSkillId) : "Race morale";

  return {
    life: [equation("Life", [["Class base", heroClass.baseLife], ["Level growth", levelLife], ["Strength", bonus(stats, "life")], ["Constitution", skill("constitution")]], life)],
    lifeRegen: [
      equation("Regen points", [["Strength", bonus(stats, "lifeRegen")]], lifeRegen.pointsPer20Seconds),
      `Period: 20s / ${lifeRegen.pointsPer20Seconds} points with +${lifeRegen.skillBonusPercent}% Regeneration = ${formatPeriod(lifeRegen.periodMs)} per HP`,
    ],
    combat: [equation("Combat", [["Strength", bonus(stats, "combat")], ["Ferocity", skill("ferocity")], ["Items", item("combat")]], combat)],
    damage: [
      equation("Damage", [["Base", 10], ["Strength", bonus(stats, "damage")], [fireMissileActive ? "Mighty Blow/items after Fire Missile" : "Mighty Blow/items", damageBonus]], damage),
      ...(fireMissileActive ? [`Fire Missile changes the Mighty Blow/item damage part: ${rawDamageAdd} / 3 = ${damageBonus}`] : []),
    ],
    mana: [equation("Mana", [["Class base", heroClass.baseMana], ["Intelligence", bonus(stats, "mana")], ["Lore", skill("lore")]], mana)],
    manaRegen: [
      equation("Regen points", [["Intelligence", bonus(stats, "manaRegen")]], manaRegen.pointsPer20Seconds),
      `Period: 20s / ${manaRegen.pointsPer20Seconds} points with +${manaRegen.skillBonusPercent}% Energy = ${formatPeriod(manaRegen.periodMs)} per MP`,
    ],
    spellcasting: [equation("Spellcasting", [["Intelligence", bonus(stats, "spellcasting")], ["Ritual", skill("ritual")], ["Items", item("spellcasting")]], `${formatSignedPercent(spellcasting)}`)],
    initialTroopXp: [equation("Initial Troop XP", [["Intelligence", bonus(stats, "initialTroopXp")], ["Items", item("training")]], initialTroopXp)],
    speed: [equation("Speed", [["Dexterity", bonus(stats, "speed")], ["Running", skill("running")], ["Items/slows", speedItems]], speed)],
    attackSpeed: [
      `Attack period: Dexterity ${attackSpeed.dexterityBonus}, Swiftness +${attackSpeed.swiftnessBonus}%, fight speed ${attackSpeed.fightSpeed}${attackSpeedItems ? ` (${formatSigned(attackSpeedItems)} from items/slows)` : ""} = ${formatPeriod(attackSpeed.periodMs)}`,
    ],
    conversionTime: [
      equation("Conversion score", [["Level", 8 + Math.trunc(clampLevel(level) / 2)], ["Items", item("conversion")]], conversion),
      `Conversion score ${conversion} uses the timing table = ${conversionTime}s`,
    ],
    armor: [equation("Armor", [["Class base", heroClass.baseArmor], ["Dexterity", bonus(stats, "armor")], ["Invulnerability", skill("invulnerability")], ["Items", item("armor")]], armor)],
    resistance: [equation("Resistance", [["Class base", heroClass.baseResistance], ["Dexterity", bonus(stats, "resistance")], ["Warding", skill("warding")], ["Items", item("resistance")]], resistance)],
    piercing: [equation("Piercing", [["Armor total", armor], ["Armorer", skill("armorer")]], damageResistances.piercing)],
    slashing: [equation("Slashing", [["Armor total", armor], ["Scales", skill("scales")]], damageResistances.slashing)],
    crushing: [equation("Crushing", [["Armor total", armor], ["Thick Hide", skill("thickHide")]], damageResistances.crushing)],
    fire: [equation("Fire", [["Resistance total", resistance], ["Fire Resistance", skill("fireResistance")], ["Elemental Resistance", elemental], ["Items", item("fireResistance")]], damageResistances.fire)],
    cold: [equation("Cold", [["Resistance total", resistance], ["Cold Resistance", skill("coldResistance")], ["Elemental Resistance", elemental], ["Items", item("coldResistance")]], damageResistances.cold)],
    electricity: [equation("Electricity", [["Resistance total", resistance], ["Electricity Resistance", skill("electricityResistance")], ["Elemental Resistance", elemental], ["Items", item("electricityResistance")]], damageResistances.electricity)],
    magic: [equation("Magic", [["Magic Resistance", skill("magicResistance")], ["Items", item("magicResistance")]], damageResistances.magic)],
    morale: [
      equation("Morale", [["Charisma", moraleBreakdown.stat], ["Leadership", moraleBreakdown.leadership], [racialSkillName, moraleBreakdown.racial], ["Items", moraleBreakdown.items]], morale),
      `General view excludes ${racialSkillName}: ${moraleBreakdown.baseTotal}; race view includes it: ${moraleBreakdown.total}`,
    ],
    merchant: [
      equation("Merchant score", [["Charisma", bonus(stats, "discount")], ["Merchant skill", merchant.baseScore - bonus(stats, "discount")], ["Items/item skill ranks", merchant.itemScore]], merchant.score),
      `Final discount: score ${merchant.score} => ${formatMerchantPercent(merchant.discountPercent)}`,
    ],
    commandRadius: [
      equation("Command Radius", [["Charisma", calculateCommandRadius(stats)], ["Items", item("command")]], commandRadiusRaw),
      `Capped command radius: min(${commandRadiusRaw}, ${MAX_EFFECTIVE_COMMAND}) = ${commandRadius}`,
    ],
    armySetupPoints: [equation("Army Setup Points", [["Charisma", bonus(stats, "retinue")], ["Diplomacy", skill("diplomacy")]], armySetupPoints)],
    command: [equation("Command", [["Base", 5], ["Charisma", stats.charisma], ["Items", item("command")]], command)],
  };
}

function buildStatModifierFlags({ skillLevels, itemEffects, moraleBreakdown, merchant, fireMissileActive }) {
  const skill = (key) => skillEffect(key, skillLevels[key]) !== 0;
  const item = (key) => itemTotal(itemEffects, key) !== 0;
  const speedItems = item("speed") || item("speedAll") || item("slow") || item("slowAll");
  const attackSpeedItems = item("speedAttack") || item("speedAll") || item("slowAttack") || item("slowAll");
  const elemental = skill("elementalResistance");

  return {
    life: skill("constitution") || item("health"),
    lifeRegen: skill("regeneration") || item("lifeRegen"),
    combat: skill("ferocity") || item("combat"),
    damage: skill("mightyBlow") || item("weaponDamage") || fireMissileActive,
    mana: skill("lore"),
    manaRegen: skill("energy") || item("manaRegen"),
    spellcasting: skill("ritual") || item("spellcasting"),
    initialTroopXp: item("training"),
    speed: skill("running") || speedItems,
    attackSpeed: skill("swiftness") || attackSpeedItems || fireMissileActive,
    conversionTime: item("conversion"),
    armor: skill("invulnerability") || item("armor"),
    resistance: skill("warding") || item("resistance"),
    piercing: skill("armorer") || item("armor"),
    slashing: skill("scales") || item("armor"),
    crushing: skill("thickHide") || item("armor"),
    fire: skill("fireResistance") || elemental || item("fireResistance") || item("resistance"),
    cold: skill("coldResistance") || elemental || item("coldResistance") || item("resistance"),
    electricity: skill("electricityResistance") || elemental || item("electricityResistance") || item("resistance"),
    magic: skill("magicResistance") || item("magicResistance"),
    morale: moraleBreakdown.leadership !== 0 || moraleBreakdown.racial !== 0 || moraleBreakdown.items !== 0,
    merchant: skill("merchant") || merchant.itemScore !== 0,
    commandRadius: item("command"),
    armySetupPoints: skill("diplomacy"),
    command: item("command"),
  };
}

function equation(label, parts, total) {
  return `${label}: ${formatEquationParts(parts)} = ${total}`;
}

function formatEquationParts(parts) {
  return parts.map(([label, value], index) => formatEquationPart(label, value, index)).join(" ");
}

function formatEquationPart(label, value, index) {
  const number = Number(value) || 0;
  if (index === 0) return `${label} ${formatStatNumber(number)}`;
  const prefix = index === 0 ? "" : number < 0 ? "- " : "+ ";
  return `${prefix}${label} ${formatStatNumber(Math.abs(number))}`;
}

function formatStatNumber(value) {
  const number = Number(value) || 0;
  return Number.isInteger(number) ? String(number) : number.toFixed(2).replace(/\.00$/, "").replace(/0$/, "");
}

function formatPeriod(milliseconds) {
  const seconds = Math.max(0, Number(milliseconds) || 0) / 1000;
  return `${seconds.toFixed(2).replace(/\.00$/, "").replace(/0$/, "")}s`;
}

function formatMerchantPercent(value) {
  const percent = Number(value) || 0;
  if (percent > 0) return `${percent.toFixed(1)}% discount`;
  if (percent < 0) return `${Math.abs(percent).toFixed(1)}% markup`;
  return "0.0%";
}

function getDamageType(heroClass, skillLevels = {}, itemEffects = {}) {
  if (hasSkill(skillLevels, "fireMissile")) return "Hot and Pointy";
  if (itemEffects.weaponDamageType) return itemEffects.weaponDamageType;
  return heroClass.id === "monk" ? "Crushing" : "Slashing";
}

export function calculateConditionalSkillEffects(skillLevels = {}, itemEffects = {}) {
  return calculateSkillEffectList(skillLevels, { itemEffects });
}

export function calculateSkillEffectList(skillLevels = {}, options = {}) {
  const effects = [];
  const includeInactive = options.includeInactive === true;
  const hasListedSkill = (skillId) => Object.prototype.hasOwnProperty.call(skillLevels ?? {}, skillId);
  const currentLevel = (skillId) => Math.max(0, Math.trunc(skillLevels?.[skillId] ?? 0));
  const shouldInclude = (skillId) =>
    includeInactive ? hasListedSkill(skillId) : hasSkill(skillLevels, skillId);
  const add = (skillId, label, value, detail = "", category = "Skill Effects", rawValue = null, skillLevel = currentLevel(skillId)) => {
    if (!shouldInclude(skillId)) return;
    effects.push({
      skillId,
      label,
      value,
      detail,
      category,
      rawValue,
      skillLevel,
      dataNote: dataNotes.skillEffects,
    });
  };
  const addSkillEffect = (skillId, label, formatter, detail = "", category = "Skill Effects") => {
    if (!shouldInclude(skillId)) return;
    const level = currentLevel(skillId);
    const rawValue = skillEffect(skillId, level);
    add(skillId, label, formatter(rawValue, level), detail, category, rawValue, level);
  };
  const signed = (value) => formatSigned(value);
  const signedPercent = (value) => `${formatSigned(value)}%`;

  addSkillEffect("ferocity", "Combat", (value) => signed(value), "Included in Combat", "Core");
  addSkillEffect("constitution", "Life", (value) => signed(value), "Included in Life", "Core");
  addSkillEffect("running", "Speed", (value) => signed(value), "Included in Speed", "Core");
  addSkillEffect("lore", "Mana", (value) => signed(value), "Included in Mana", "Core");
  addSkillEffect("ritual", "Spellcasting", (value) => signed(value), "Included in Spellcasting", "Magic");

  for (const skillId of MAGIC_SKILL_IDS) {
    addSkillEffect(skillId, "Spells Known", (value) => formatMagicSkillProgress(value), "Unlocks spells in this sphere", "Magic");
  }

  addSkillEffect("assassin", "Assassination Score", (value) => value, "Base chance before target hero level and immunity checks", "Combat");
  addSkillEffect("weaponmaster", "Critical Hit Bonus", (value) => signedPercent(value), "Adds to critical chance", "Combat");
  addSkillEffect(
    "ignoreArmor",
    "Ignore Armor",
    (value) => `${value} armor / ${Math.min(value * 5, 50)} resist`,
    "Reduces target protection in melee",
    "Combat",
  );
  addSkillEffect("mightyBlow", "Mighty Blow Damage", (value) => signed(value), "Added to hero weapon damage", "Combat");
  addSkillEffect("leech", "Mana Leech", (value) => signed(value), "Mana drained on hit", "Combat");
  addSkillEffect("vampirism", "Vampirism", (value) => signed(value), "Steals life with each damaging melee hit", "Combat");
  addSkillEffect("thievery", "Thievery Score", (value) => value, "Per-hit theft check for Thief heroes", "Combat");
  addSkillEffect("shadowStrength", "Night Combat", (value) => signed(value), "Only applies at night", "Combat");
  addSkillEffect("swiftness", "Swiftness", (value) => signedPercent(value), "Attack speed multiplier bonus", "Combat");

  if (shouldInclude("fireMissile")) {
    const level = currentLevel("fireMissile");
    const damagePercent = skillEffect("fireMissile", level);
    add(
      "fireMissile",
      "Fire Missile",
      `${damagePercent}% damage / ${getFireMissileRange(level)} range`,
      "Switches hero attack to Hot and Pointy",
      "Combat",
      damagePercent,
      level,
    );
  }

  addSkillEffect("manslayer", "Vs Humans", (value) => signed(value), "Manslayer damage", "Target Damage");
  addSkillEffect("deathslayer", "Vs Undead", (value) => signed(value), "Deathslayer damage", "Target Damage");
  addSkillEffect("dragonslayer", "Vs Dragons", (value) => signed(value), "Dragonslayer damage", "Target Damage");
  addSkillEffect("daemonslayer", "Vs Daemons", (value) => signed(value), "Daemonslayer damage", "Target Damage");
  addSkillEffect("dwarfslayer", "Vs Dwarves", (value) => signed(value), "Dwarfslayer damage", "Target Damage");
  addSkillEffect("elfslayer", "Vs Elves", (value) => signed(value), "Elfslayer damage", "Target Damage");
  addSkillEffect("orcslayer", "Vs Orcs", (value) => signed(value), "Orcslayer damage", "Target Damage");
  addSkillEffect("serpentslayer", "Vs Ssrathi", (value) => signed(value), "Serpentslayer damage", "Target Damage");
  addSkillEffect("bullslayer", "Vs Minotaurs", (value) => signed(value), "Bullslayer damage", "Target Damage");
  addSkillEffect("beastslayer", "Vs Monsters", (value) => signed(value), "Beastslayer damage", "Target Damage");
  addSkillEffect("reave", "Vs Large Targets", (value) => signed(value), "Reave damage", "Target Damage");
  addSkillEffect("trample", "Vs Small Targets", (value) => signed(value), "Trample damage", "Target Damage");
  addSkillEffect("demolition", "Vs Buildings", (value) => signed(value), "Demolition damage", "Target Damage");
  addSkillEffect("smiteGood", "Vs Good", (value) => signed(value), "Smite Good damage", "Target Damage");
  addSkillEffect("smiteEvil", "Vs Evil", (value) => signed(value), "Smite Evil damage", "Target Damage");

  addSkillEffect("regeneration", "Life Regen Skill", (value) => signedPercent(value), "Shown in the Life tooltip", "Shown Breakouts");
  addSkillEffect("energy", "Mana Regen Skill", (value) => signedPercent(value), "Shown in the Mana tooltip", "Shown Breakouts");
  addSkillEffect("armorer", "Piercing Armor Skill", (value) => signed(value), "Included in Piercing resistance", "Shown Breakouts");
  addSkillEffect("warding", "Resistance", (value) => signed(value), "Included in Resistance", "Shown Breakouts");
  addSkillEffect("scales", "Slashing Armor Skill", (value) => signed(value), "Included in Slashing resistance", "Shown Breakouts");
  addSkillEffect("thickHide", "Crushing Armor Skill", (value) => signed(value), "Included in Crushing resistance", "Shown Breakouts");
  addSkillEffect("invulnerability", "Armor", (value) => signed(value), "Included in Armor", "Shown Breakouts");
  addSkillEffect("fireResistance", "Fire Resistance Skill", (value) => signed(value), "Included in Fire resistance", "Shown Breakouts");
  addSkillEffect("coldResistance", "Cold Resistance Skill", (value) => signed(value), "Included in Cold resistance", "Shown Breakouts");
  addSkillEffect("electricityResistance", "Electricity Resistance Skill", (value) => signed(value), "Included in Electricity resistance", "Shown Breakouts");
  addSkillEffect("elementalResistance", "Elemental Resistance Skill", (value) => signed(value), "Added to Fire, Cold, and Electricity", "Shown Breakouts");
  addSkillEffect("magicResistance", "Magic Resistance Skill", (value) => signed(value), "Included in Magic resistance", "Shown Breakouts");

  addSkillEffect("wealth", "Gold Income", (value) => signed(value), "Added to periodic income", "Economy");
  addSkillEffect("quarrying", "Stone Income", (value) => signed(value), "Added to periodic income", "Economy");
  addSkillEffect("smelting", "Metal Income", (value) => signed(value), "Added to periodic income", "Economy");
  addSkillEffect("gemcutting", "Crystal Income", (value) => signed(value), "Added to periodic income", "Economy");
  addSkillEffect("trade", "Trade Rate", (value) => `${Math.min(50 + value, 90)}%`, "Starts at 50% and caps at 90%", "Economy");
  addSkillEffect("diplomacy", "Setup Points", (value) => signed(value), "Added to retinue setup points", "Economy");
  addSkillEffect("merchant", "Merchant Score", (value) => signed(value), "Improves shop prices", "Economy");
  addSkillEffect("potionmaster", "Mana Potion Effect", (value) => signedPercent(value), "Bonus mana restored by potions", "Economy");
  addSkillEffect("contamination", "Disease Virulence", (value) => signed(value), "Added to global plague virulence", "Economy");

  addSkillEffect("leadership", "Morale", (value) => signed(value), "Affects army limit, command effect, and unit attack speed", "Command");
  for (const skillId of RACE_MORALE_SKILL_VALUES) {
    addSkillEffect(skillId, "Race Morale", (value) => signed(value), "Affects army limit, command effect, and unit attack speed", "Command");
  }

  addSkillEffect("elcorsAura", "Healing Magic Bonus", (value) => signed(value), "Added to most healing spells", "Support");
  addSkillEffect("engineer", "Building Hit Points", (value) => signedPercent(value), "Applied when buildings are created", "Support");
  addSkillEffect("lifeRune", "Unicorn Hit Points", (value) => signedPercent(value), "Life Rune unit bonus", "Support");
  addSkillEffect("forestRune", "Treant Hit Points", (value) => signedPercent(value), "Forest Rune unit bonus", "Support");
  addSkillEffect("deathRune", "Assassin Hit Points", (value) => signedPercent(value), "Death Rune unit bonus", "Support");
  addSkillEffect("skyRune", "Flyer Hit Points", (value) => signedPercent(value), "Sky Rune unit bonus", "Support");
  addSkillEffect("arcaneRune", "Mage Hit Points", (value) => signedPercent(value), "Arcane Rune unit bonus", "Support");

  addSkillEffect("brewmaster", "Dwarf Troop XP", (value) => signed(value), "Starting XP for Dwarf units", "Troop XP");
  addSkillEffect("slimemaster", "Slime XP", (value) => signed(value), "Starting XP for Slimes", "Troop XP");
  addSkillEffect("griffonMaster", "Griffon XP", (value) => signed(value), "Starting XP for Griffons", "Troop XP");
  addSkillEffect("runicLore", "Runelord XP", (value) => signed(value), "Starting XP for Runelords", "Troop XP");
  addSkillEffect("memories", "Skeleton XP", (value) => signed(value), "Starting XP for Skeletons", "Troop XP");
  addSkillEffect("undeadLegion", "Skeleton Cavalry XP", (value) => signed(value), "Starting XP for Skeleton Cavalry", "Troop XP");
  addSkillEffect("barbarianKing", "Cavalry XP", (value) => signed(value), "Starting XP for Cavalry units", "Troop XP");
  addSkillEffect("taming", "Monster XP", (value) => signed(value), "Starting XP for Monster units", "Troop XP");
  addSkillEffect("guildmaster", "Assassin XP", (value) => signed(value), "Starting XP for Assassins", "Troop XP");
  addSkillEffect("knightProtector", "Knight XP", (value) => signed(value), "Starting XP for Knights", "Troop XP");
  addSkillEffect("guardianOak", "Treant XP", (value) => signed(value), "Starting XP for Treants", "Troop XP");
  addSkillEffect("elementalLore", "Elemental XP", (value) => signed(value), "Starting XP for Elementals", "Troop XP");
  addSkillEffect("mageKing", "Mage XP", (value) => signed(value), "Starting XP for Red, White, and Black Mages", "Troop XP");
  addSkillEffect("gate", "Daemon XP", (value) => signed(value), "Starting XP for Daemons", "Troop XP");
  addSkillEffect("dragonmaster", "Dragon XP", (value) => signed(value), "Starting XP for Dragons and hydra-like units", "Troop XP");
  addSkillEffect("allSeeingEye", "Eye Creature XP", (value) => signed(value), "Starting XP for Spore, Gazer, Flamer, and Eye", "Troop XP");
  addSkillEffect("golemMaster", "Golem XP", (value) => signed(value), "Starting XP for Golems", "Troop XP");

  return effects;
}

export function calculateAttackSpeed(stats, skillLevels = {}, itemEffects = {}) {
  const attackSpeedBonus = bonus(stats, "attackSpeed");
  const swiftnessMultiplier = 100 + skillEffect("swiftness", skillLevels.swiftness);
  const basePeriodMs = 1000 - Math.trunc((10 * attackSpeedBonus * swiftnessMultiplier) / 100);
  const itemFightSpeed =
    itemTotal(itemEffects, "speedAttack") +
    itemTotal(itemEffects, "speedAll") -
    itemTotal(itemEffects, "slowAttack") -
    itemTotal(itemEffects, "slowAll");
  const fightSpeed = Math.max(1, (skillLevels.fireMissile > 0 ? 8 : 10) + itemFightSpeed);
  const rawPeriodMs = Math.trunc((basePeriodMs * 10) / fightSpeed);
  const periodMs = rawPeriodMs > 0 ? rawPeriodMs : HERO_ATTACK_SPEED_FALLBACK_PERIOD_MS;
  return {
    periodMs,
    multiplier: Number((periodMs / 1000).toFixed(2)),
    bonusPercent: Math.round(100 - (periodMs / 10)),
    dexterityBonus: attackSpeedBonus,
    swiftnessBonus: swiftnessMultiplier - 100,
    fightSpeed,
  };
}

export function calculateResistance(heroClass, stats, skillLevels = {}, itemEffects = {}) {
  return (
    heroClass.baseResistance +
    bonus(stats, "resistance") +
    skillEffect("warding", skillLevels.warding) +
    itemTotal(itemEffects, "resistance")
  );
}

export function calculateDamageResistances(baseResistance, baseArmor = 0, skillLevels = {}, itemEffects = {}) {
  const elemental = skillEffect("elementalResistance", skillLevels.elementalResistance);
  return {
    piercing: baseArmor + skillEffect("armorer", skillLevels.armorer),
    slashing: baseArmor + skillEffect("scales", skillLevels.scales),
    crushing: baseArmor + skillEffect("thickHide", skillLevels.thickHide),
    fire: baseResistance + skillEffect("fireResistance", skillLevels.fireResistance) + elemental + itemTotal(itemEffects, "fireResistance"),
    cold: baseResistance + skillEffect("coldResistance", skillLevels.coldResistance) + elemental + itemTotal(itemEffects, "coldResistance"),
    electricity:
      baseResistance +
      skillEffect("electricityResistance", skillLevels.electricityResistance) +
      elemental +
      itemTotal(itemEffects, "electricityResistance"),
    magic: skillEffect("magicResistance", skillLevels.magicResistance) + itemTotal(itemEffects, "magicResistance"),
  };
}

export function calculateLifeRegen(stats, skillLevels = {}, itemEffects = {}) {
  const pointsPer20Seconds = bonus(stats, "lifeRegen");
  const skillBonusPercent = skillEffect("regeneration", skillLevels.regeneration) + itemTotal(itemEffects, "lifeRegen");
  return calculateRegen(pointsPer20Seconds, skillBonusPercent);
}

export function calculateManaRegen(stats, skillLevels = {}, itemEffects = {}) {
  const pointsPer20Seconds = bonus(stats, "manaRegen");
  const skillBonusPercent = skillEffect("energy", skillLevels.energy) + itemTotal(itemEffects, "manaRegen");
  return calculateRegen(pointsPer20Seconds, skillBonusPercent);
}

export function calculateMorale(raceId, stats, skillLevels = {}, itemEffects = {}) {
  return calculateMoraleBreakdown(raceId, stats, skillLevels, itemEffects).total;
}

export function calculateMoraleBreakdown(raceId, stats, skillLevels = {}, itemEffects = {}) {
  const racialSkillId = RACE_MORALE_SKILL_IDS[raceId];
  const stat = bonus(stats, "morale");
  const leadership = skillEffect("leadership", skillLevels.leadership);
  const racial = racialSkillId ? skillEffect(racialSkillId, skillLevels[racialSkillId]) : 0;
  const items = itemTotal(itemEffects, "morale");
  const baseTotal = stat + leadership + items;
  return {
    stat,
    leadership,
    racial,
    items,
    baseTotal,
    total: baseTotal + racial,
    racialSkillId: racialSkillId ?? "",
  };
}

export function calculateMoraleView(morale) {
  return {
    morale,
    commandEffect: calculateCommandEffect(morale),
    armyLimitBonus: calculateArmyLimitBonus(morale),
    unitAttackSpeed: calculateUnitAttackSpeed(morale),
  };
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

export function calculateMerchant(stats, skillLevels = {}, itemEffects = {}, baseSkillLevels = skillLevels) {
  const statScore = bonus(stats, "discount");
  const baseSkillScore = skillEffect("merchant", baseSkillLevels.merchant);
  const skillScore = skillEffect("merchant", skillLevels.merchant);
  const itemScore = skillScore - baseSkillScore + itemTotal(itemEffects, "merchant");
  const baseScore = statScore + baseSkillScore;
  const score = baseScore + itemScore;
  const baseDiscountPercent = calculateMerchantDiscountPercent(baseScore);
  const discountPercent = calculateMerchantDiscountPercent(score);
  return {
    score,
    discountPercent,
    baseScore,
    baseDiscountPercent,
    itemScore,
    itemDiscountDelta: Number((discountPercent - baseDiscountPercent).toFixed(1)),
  };
}

export function calculateMerchantDiscountPercent(score) {
  const numericScore = Number(score) || 0;
  const discountPercent = numericScore === 0 ? 0 : 100 - 100 * (100 / (numericScore + 100));
  return Number(discountPercent.toFixed(1));
}

export function calculateArmySetupPoints(stats, skillLevels = {}) {
  return bonus(stats, "retinue") + skillEffect("diplomacy", skillLevels.diplomacy);
}

export function calculateCommand(stats, itemEffects = {}) {
  return 5 + stats.charisma + itemTotal(itemEffects, "command");
}

export function calculateCommandRadius(stats) {
  return bonus(stats, "commandRadius");
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

export function calculateConversion(level, itemEffects = {}) {
  return 8 + Math.trunc(clampLevel(level) / 2) + itemTotal(itemEffects, "conversion");
}

export function getConversionTime(conversion) {
  return CONVERSION_TIME_BY_SCORE[clampIndex(conversion, 6, 99)];
}

export function getConversionRange(conversion) {
  return CONVERSION_RANGE_BY_SCORE[clampIndex(conversion, 0, 30)];
}

export function getSkillLevels(build) {
  const allocation = normalizeSkillAllocation(build.skillAllocation);
  return mergeCareerSkills(build.raceId, build.classId).reduce((levels, unlock) => {
    levels[unlock.skillId] = unlock.startingLevel + (allocation[unlock.skillId] ?? 0);
    return levels;
  }, {});
}

export function skillEffect(skillId, value = 0) {
  const rank = Math.max(0, Math.trunc(value));
  if (rank === 0) return 0;

  if (skillId === "assassin") return rank + 4;
  if (["armorer", "scales", "thickHide"].includes(skillId)) return rank * 5;
  if (["coldResistance", "fireResistance", "electricityResistance"].includes(skillId)) return rank * 5;
  if (skillId === "constitution") return rank * 15;
  if (skillId === "contamination") return rank;
  if (skillId === "demolition") return rank * 5;
  if (["dragonslayer", "manslayer", "deathslayer", "daemonslayer", "dwarfslayer", "elfslayer", "orcslayer", "serpentslayer", "bullslayer"].includes(skillId)) return rank * 5;
  if (["knightLord", "dwarfLord", "skullLord", "horseLord", "hornedLord", "orcLord", "highLord", "forestLord", "darkLord", "dreamLord", "siegeLord", "daemonLord", "imperialLord", "plagueLord", "scorpionLord", "serpentLord"].includes(skillId)) return rank;
  if (skillId === "elcorsAura") return rank * 20;
  if (skillId === "elementalResistance") return rank * 2;
  if (skillId === "energy") return rank * 5;
  if (skillId === "engineer") return rank * 3;
  if (skillId === "ferocity") return rank * 3;
  if (["runicLore", "griffonMaster", "guildmaster", "dragonmaster", "undeadLegion", "elementalLore"].includes(skillId)) return rank * 3;
  if (["allSeeingEye", "slimemaster", "guardianOak", "golemMaster"].includes(skillId)) return rank * 2;
  if (["taming", "barbarianKing", "mageKing"].includes(skillId)) return rank * 2;
  if (["knightProtector", "brewmaster"].includes(skillId)) return rank * 2;
  if (skillId === "gate") return rank * 2;
  if (skillId === "potionmaster") return rank * 10;
  if (skillId === "ignoreArmor") return rank * 3;
  if (skillId === "invulnerability") return rank * 2;
  if (skillId === "leadership") return rank;
  if (skillId === "leech") return rank * 2;
  if (["lifeRune", "forestRune", "deathRune", "skyRune", "arcaneRune"].includes(skillId)) return rank * 5;
  if (skillId === "lore") return rank * 10;
  if (skillId === "magicResistance") return rank * 4;
  if (skillId === "memories") return rank;
  if (skillId === "merchant") return rank;
  if (skillId === "mightyBlow") return rank * 2;
  if (["quarrying", "wealth", "smelting", "gemcutting"].includes(skillId)) return rank;
  if (["reave", "beastslayer", "trample"].includes(skillId)) return rank * 5;
  if (["smiteEvil", "smiteGood"].includes(skillId)) return rank * 10;
  if (skillId === "regeneration") return rank * 20;
  if (skillId === "ritual") return rank * 5;
  if (skillId === "running") return rank;
  if (skillId === "shadowStrength") return rank * 3;
  if (skillId === "trade") return rank * 2;
  if (skillId === "warding") return rank;
  if (skillId === "vampirism") return rank;
  if (skillId === "weaponmaster") return rank * 2;
  if (["magicRunes", "magicPoison", "magicArcane", "magicNecromancy"].includes(skillId)) return rank;
  if (skillId === "swiftness") return rank * 4;
  if (skillId === "fireMissile") return rank * 3 + 47;
  if (skillId === "thievery") return rank + 2;
  if (skillId === "diplomacy") return rank;
  return rank;
}

export function bonus(stats, type) {
  switch (type) {
    case "combat":
      return 4 + stats.strength;
    case "damage":
      return 10 + Math.trunc(stats.strength / 2);
    case "life":
      return 5 * stats.strength;
    case "lifeRegen":
      return 1 + Math.trunc(stats.strength / 3);
    case "speed":
      return 8 + Math.trunc((stats.dexterity + 1) / 2);
    case "attackSpeed":
      return Math.min(2 * stats.dexterity - 10, 60);
    case "resistance":
      return stats.dexterity;
    case "armor":
      return Math.trunc(stats.dexterity / 2);
    case "conversionTime":
      return 50 + Math.max(-stats.dexterity, -40);
    case "mana":
      return stats.intelligence * 3;
    case "manaRegen":
      return 2 + Math.trunc(stats.intelligence / 10);
    case "initialTroopXp":
      return Math.trunc(stats.intelligence / 2);
    case "spellcasting":
      return 3 * stats.intelligence;
    case "morale":
      return Math.trunc(stats.charisma / 2);
    case "discount":
      return -5 + stats.charisma;
    case "retinue":
      return Math.trunc(stats.charisma / 4);
    case "commandRadius":
      return 6 + Math.min(Math.trunc(stats.charisma / 4), 13);
    default:
      return 0;
  }
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

function applySkill(merged, unlock, duplicateFromRace) {
  if (!unlock || unlock.skillId === "null") return;
  const existing = merged.find((entry) => entry.skillId === unlock.skillId);
  if (!existing) {
    merged.push({ ...unlock, mergedFrom: [unlock.origin] });
    return;
  }

  existing.availableAt = Math.min(existing.availableAt, unlock.availableAt);
  existing.startingLevel += unlock.startingLevel;
  existing.startingLevel += 2;
  existing.availableAt = duplicateFromRace ? 1 : 0;
  existing.mergedFrom.push(unlock.origin);
}

function getSkillMaxLevel(unlock, level) {
  const pointCap = getSkillPointCap(unlock, level);
  return pointCap === Infinity ? Infinity : unlock.startingLevel + pointCap;
}

function getSkillPointCap(unlock, level) {
  if (!unlock) return 0;
  if (unlock.skillId === "thievery") return Math.max(0, 17 - unlock.startingLevel);
  if (unlock.availableAt <= 1) return Infinity;
  if (level < unlock.availableAt) return 0;
  return Math.max(0, level - unlock.availableAt + 1);
}

function getSkillPrerequisiteState(unlock, unlocks, allocation) {
  const requiredPoints = unlock?.availableAt > 1 ? unlock.availableAt - 1 : 0;
  if (requiredPoints <= 0) {
    return { met: true, priorPoints: 0, requiredPoints };
  }

  const priorPoints = getPriorSkillPointTally(unlock, unlocks, allocation);
  return {
    met: priorPoints >= requiredPoints,
    priorPoints,
    requiredPoints,
  };
}

function getPriorSkillPointTally(targetUnlock, unlocks, allocation) {
  const totalStartingLevels = unlocks.reduce((total, unlock) => total + unlock.startingLevel, 0);
  const priorSkillLevels = unlocks.reduce((total, unlock) => {
    if (unlock.availableAt >= targetUnlock.availableAt) return total;
    return total + unlock.startingLevel + (allocation[unlock.skillId] ?? 0);
  }, 0);

  return Math.max(0, 1 - totalStartingLevels + priorSkillLevels);
}

function formatSkillName(skillId) {
  return skillsById[skillId]?.displayName ?? skillId;
}

function getRace(raceId) {
  const race = racesById[raceId];
  if (!race) throw new Error(`Unknown race: ${raceId}`);
  return race;
}

function getHeroClass(classId) {
  const heroClass = heroClassesById[classId];
  if (!heroClass) throw new Error(`Unknown class: ${classId}`);
  return heroClass;
}

function calculateRegen(pointsPer20Seconds, skillBonusPercent) {
  const points = Math.max(1, Math.trunc(pointsPer20Seconds));
  const percentage = 100 + Math.max(0, Math.trunc(skillBonusPercent));
  const basePeriodMs = Math.trunc(REGEN_BASE_MS / points);
  const periodMs = Math.trunc((basePeriodMs * 100) / percentage);
  return {
    periodMs,
    pointsPer20Seconds: points,
    skillBonusPercent: percentage - 100,
  };
}

function hasSkill(skillLevels, skillId) {
  return Math.max(0, Math.trunc(skillLevels?.[skillId] ?? 0)) > 0;
}

function itemTotal(itemEffects, key) {
  return Math.trunc(Number(itemEffects?.totals?.[key]) || 0);
}

function formatSigned(value) {
  const number = Math.trunc(Number(value) || 0);
  return number > 0 ? `+${number}` : String(number);
}

function formatSignedPercent(value) {
  return `${formatSigned(value)}%`;
}

function getFireMissileRange(level) {
  const rank = Math.max(0, Math.trunc(Number(level) || 0));
  if (rank < 10) return 6;
  if (rank < 40 && rank >= 15) return 8;
  if (rank < 80 && rank >= 40) return 10;
  return 12;
}

function formatMagicSkillProgress(value) {
  if (value <= 0) return "No spells";
  const spellCount = value % 10 || 10;
  const spellLabel = spellCount === 1 ? "spell" : "spells";
  return `${spellCount} ${spellLabel} / level ${Math.ceil(value / 10)}`;
}

function clampIndex(value, min, max) {
  return Math.max(min, Math.min(max, Math.trunc(Number(value) || 0)));
}

function sumValues(value) {
  return Object.values(value).reduce((total, item) => total + item, 0);
}
