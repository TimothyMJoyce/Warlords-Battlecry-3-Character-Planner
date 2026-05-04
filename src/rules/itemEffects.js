import { skills } from "../data/gameData.js";

const ZERO_TOTALS = {
  armor: 0,
  assassin: 0,
  coldResistance: 0,
  combat: 0,
  command: 0,
  conversion: 0,
  criticalHit: 0,
  electricityResistance: 0,
  fireResistance: 0,
  health: 0,
  lifeRegen: 0,
  magicResistance: 0,
  magery: 0,
  manaDiscount: 0,
  manaRegen: 0,
  merchant: 0,
  morale: 0,
  resistance: 0,
  slow: 0,
  slowAll: 0,
  slowAttack: 0,
  spellcasting: 0,
  spellRange: 0,
  speed: 0,
  speedAll: 0,
  speedAttack: 0,
  training: 0,
  vampirism: 0,
  weaponDamage: 0,
};

const weaponDamageTypes = {
  slashing: "Slashing",
  crushing: "Crushing",
  piercing: "Piercing",
  fire: "Fire",
  ice: "Cold",
  electricity: "Electricity",
  magic: "Magic",
};

const resistanceBreakdownKeys = {
  "fire resistance": "fire",
  "cold resistance": "cold",
  "ice resistance": "cold",
  "electricity resistance": "electricity",
  "magic resistance": "magic",
};

export function calculateEquippedItemEffects(build = {}) {
  const effects = createEmptyItemEffects();
  const equippedItems = getEquippedCatalogItems(build);

  for (const equipped of equippedItems) {
    applyPowers(effects, equipped.item?.powers, equipped.item?.name, equipped.slotId);
  }

  for (const set of getActiveItemSets(build, equippedItems)) {
    applyPowers(effects, [set.power], `${set.name} set`, "set");
  }

  return effects;
}

export function applyItemSkillBonuses(skillLevels = {}, itemEffects = createEmptyItemEffects()) {
  const levels = { ...skillLevels };
  for (const [skillId, amount] of Object.entries(itemEffects.skillBonuses ?? {})) {
    levels[skillId] = Math.max(0, Math.trunc(Number(levels[skillId]) || 0) + Math.trunc(Number(amount) || 0));
  }
  return levels;
}

export function getEmptyItemEffects() {
  return createEmptyItemEffects();
}

function createEmptyItemEffects() {
  return {
    totals: { ...ZERO_TOTALS },
    skillBonuses: {},
    skillContributions: [],
    breakdowns: {},
    weaponDamageType: "",
  };
}

function getEquippedCatalogItems(build) {
  const itemCatalog = Array.isArray(build.itemCatalog) ? build.itemCatalog : [];
  const itemsById = new Map(itemCatalog.map((item) => [String(item.id), item]));
  const equipped = build.items && typeof build.items === "object" ? build.items : {};

  return Object.entries(equipped)
    .map(([slotId, itemId]) => ({ slotId, item: itemsById.get(String(itemId ?? "")) }))
    .filter((entry) => entry.item);
}

function getActiveItemSets(build, equippedItems) {
  const sets = Array.isArray(build.itemSets) ? build.itemSets : [];
  if (!sets.length || !equippedItems.length) return [];

  const equippedNumericIds = new Set(equippedItems.map(({ item }) => Number(item.numericId)).filter(Number.isFinite));
  return sets.filter((set) => {
    const itemIds = Array.isArray(set.items) ? set.items : [];
    return itemIds.length > 0 && itemIds.every((itemId) => equippedNumericIds.has(Number(itemId)));
  });
}

function applyPowers(effects, powers = [], source, slotId) {
  for (const power of Array.isArray(powers) ? powers : []) {
    applyPower(effects, power, source, slotId);
  }
}

function applyPower(effects, power, source, slotId) {
  const type = normalizePowerType(power?.type);
  const amount = Number(power?.data) || 0;
  const text = power?.displayText || formatSignedAmount(amount);

  switch (type) {
    case "combat":
      addTotal(effects, "combat", "combat", amount, source, text);
      break;
    case "health":
      addTotal(effects, "health", "health", amount, source, text);
      break;
    case "training":
      addTotal(effects, "training", "initialTroopXp", amount, source, text);
      break;
    case "conversion":
      addTotal(effects, "conversion", "conversionTime", amount, source, text);
      break;
    case "speed":
      addTotal(effects, "speed", "speed", amount, source, text);
      break;
    case "speed all":
      addTotal(effects, "speedAll", "speed", amount, source, text);
      addBreakdown(effects, "attackSpeed", source, text);
      break;
    case "slow":
      addTotal(effects, "slow", "speed", amount, source, text);
      break;
    case "slow all":
      addTotal(effects, "slowAll", "speed", amount, source, text);
      addBreakdown(effects, "attackSpeed", source, text);
      break;
    case "speed attack":
      addTotal(effects, "speedAttack", "attackSpeed", amount, source, text);
      break;
    case "slow attack":
      addTotal(effects, "slowAttack", "attackSpeed", amount, source, text);
      break;
    case "resistance":
      addTotal(effects, "resistance", "resistance", amount, source, text);
      addBreakdown(effects, "fire", source, text);
      addBreakdown(effects, "cold", source, text);
      addBreakdown(effects, "electricity", source, text);
      break;
    case "morale":
      addTotal(effects, "morale", "morale", amount, source, text);
      break;
    case "command":
      addTotal(effects, "command", "commandRadius", amount, source, text);
      break;
    case "discount":
      addTotal(effects, "merchant", "merchant", amount, source, text);
      break;
    case "magery":
      addTotal(effects, "magery", "magery", amount, source, text);
      break;
    case "armor":
      addTotal(effects, "armor", "armor", amount, source, text);
      addBreakdown(effects, "piercing", source, text);
      addBreakdown(effects, "slashing", source, text);
      addBreakdown(effects, "crushing", source, text);
      break;
    case "spell casting":
      addTotal(effects, "spellcasting", "spellcasting", amount, source, text);
      break;
    case "spell failure":
      addTotal(effects, "spellcasting", "spellcasting", amount, source, text);
      break;
    case "life regen":
      addTotal(effects, "lifeRegen", "lifeRegen", amount, source, text);
      break;
    case "mana regen":
      addTotal(effects, "manaRegen", "manaRegen", amount, source, text);
      break;
    case "spell range":
      addTotal(effects, "spellRange", "spellRange", amount, source, text);
      break;
    case "mana discount":
      addTotal(effects, "manaDiscount", "manaDiscount", amount, source, text);
      break;
    case "assassin":
      addTotal(effects, "assassin", "assassin", amount, source, text);
      break;
    case "vampirism":
      addTotal(effects, "vampirism", "vampirism", amount, source, text);
      break;
    case "critical hit":
      addTotal(effects, "criticalHit", "criticalHit", amount, source, text);
      break;
    case "hero skill":
      addSkillBonus(effects, power, source, text);
      break;
    default:
      applyResistancePower(effects, type, amount, source, text);
      applyWeaponDamagePower(effects, type, amount, source, text, slotId);
      break;
  }
}

function applyResistancePower(effects, type, amount, source, text) {
  const breakdownKey = resistanceBreakdownKeys[type];
  if (!breakdownKey) return;
  const totalKey = `${breakdownKey}Resistance`;
  addTotal(effects, totalKey, breakdownKey, amount, source, text);
}

function applyWeaponDamagePower(effects, type, amount, source, text, slotId) {
  const damageType = weaponDamageTypes[type];
  if (!damageType || slotId !== "weapon") return;
  effects.totals.weaponDamage += amount;
  effects.weaponDamageType = damageType;
  addBreakdown(effects, "damage", source, text);
}

function addSkillBonus(effects, power, source, text) {
  const skill = skills[Number(power?.data)];
  const amount = Number(power?.level) || 0;
  if (!skill?.id || amount === 0) return;

  effects.skillBonuses[skill.id] = (effects.skillBonuses[skill.id] ?? 0) + amount;
  effects.skillContributions.push({
    source,
    skillId: skill.id,
    skillName: skill.displayName,
    amount,
    text,
  });
}

function addTotal(effects, totalKey, breakdownKey, amount, source, text) {
  effects.totals[totalKey] += amount;
  addBreakdown(effects, breakdownKey, source, text, amount);
}

function addBreakdown(effects, key, source, text, amount = null) {
  if (!key || !text) return;
  if (!effects.breakdowns[key]) effects.breakdowns[key] = [];
  const entry = { source, text };
  const numericAmount = Number(amount);
  if (Number.isFinite(numericAmount)) entry.amount = numericAmount;
  effects.breakdowns[key].push(entry);
}

function normalizePowerType(type) {
  return String(type ?? "").trim().toLowerCase();
}

function formatSignedAmount(value) {
  const number = Number(value) || 0;
  return `${number >= 0 ? "+" : ""}${number}`;
}
