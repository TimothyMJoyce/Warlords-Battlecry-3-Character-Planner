import { dataNotes as vanillaDataNotes, skills as vanillaSkills } from "./gameData.js";

const note = (topic) => ({
  topic,
  verified: true,
});

export const PROTECTORS_RULESET_ID = "protectors";
export const STAT_KEYS = ["strength", "dexterity", "intelligence", "charisma"];
export const HERO_MAX_LEVEL = 999;
export const HERO_SKILL_SLOT_COUNT = 11;

export const dataNotes = {
  ...vanillaDataNotes,
  ruleset: note("The Protectors ruleset selector"),
  heroEnums: note("Protectors hero identity tables"),
  statMods: note("Protectors starting stat tables"),
  skillSetup: note("Protectors career skill unlock tables"),
  heroLevelCap: note("Protectors level cap"),
  xp: note("Protectors experience formula"),
  pointBudget: note("Protectors shared hero point budget"),
  classBases: note("Protectors class base values"),
  derivedStats: note("Protectors derived stat formulas"),
  openProtectorsSystems: {
    topic: "Protectors spells, perks, items, cultures, and hero import are outside this planner slice",
    verified: false,
  },
};

const skill = (skillId, origin, availableAt, startingLevel) => ({
  skillId,
  origin,
  availableAt,
  startingLevel,
  dataNote: dataNotes.skillSetup,
});

const extraSkills = [
  { id: "riding", enumName: "ehsRiding", displayName: "Riding", category: "troopXp" },
  { id: "airmaster", enumName: "ehsAirmaster", displayName: "Airmaster", category: "troopXp" },
  { id: "koboldLover", enumName: "ehsKoboldLover", displayName: "Kobold Lover", category: "troopXp" },
  { id: "goblinLover", enumName: "ehsGoblinLover", displayName: "Goblin Lover", category: "troopXp" },
  { id: "orcLover", enumName: "ehsOrcLover", displayName: "Orc Lover", category: "troopXp" },
  { id: "cowardslayer", enumName: "ehsCowardslayer", displayName: "Cowardslayer", category: "damage" },
  { id: "witchhunter", enumName: "ehsWitchhunter", displayName: "Witchhunter", category: "damage" },
  { id: "convincing", enumName: "ehsConvincing", displayName: "Convincing", category: "charisma" },
  { id: "crushingMissile", enumName: "ehsCrushingMissile", displayName: "Crushing Missile", category: "damage" },
  { id: "javelinMissile", enumName: "ehsJavelinMissile", displayName: "Javelin Missile", category: "damage" },
  { id: "occultism", enumName: "ehsOccultism", displayName: "Occultism", category: "magic" },
  { id: "evasion", enumName: "ehsEvasion", displayName: "Evasion", category: "protection" },
  { id: "extend", enumName: "ehsExtend", displayName: "Extend", category: "magic" },
  { id: "insurgence", enumName: "ehsInsurgence", displayName: "Insurgence", category: "command" },
  { id: "deflection", enumName: "ehsDeflection", displayName: "Deflection", category: "protection" },
  { id: "magicContagion", enumName: "ehsMagicContagion", displayName: "Contagion Magic", category: "magic" },
  { id: "poisonAttack", enumName: "ehsPoisonAttack", displayName: "Poison Attack", category: "damage" },
  { id: "pillaging", enumName: "ehsPillaging", displayName: "Pillaging", category: "resource" },
  { id: "coil", enumName: "ehsCoil", displayName: "Coil", category: "damage" },
  { id: "execration", enumName: "ehsExecration", displayName: "Execration", category: "damage" },
  { id: "marksman", enumName: "ehsMarksman", displayName: "Marksman", category: "damage" },
  { id: "longevity", enumName: "ehsLongevity", displayName: "Longevity", category: "utility" },
  { id: "destruction", enumName: "ehsDestruction", displayName: "Destruction", category: "damage" },
  { id: "poisonMissile", enumName: "ehsPoisonMissile", displayName: "Poison Missile", category: "damage" },
  { id: "boltMissile", enumName: "ehsBoltMissile", displayName: "Bolt Missile", category: "damage" },
  { id: "arrowMissile", enumName: "ehsArrowMissile", displayName: "Arrow Missile", category: "damage" },
  { id: "fireballMissile", enumName: "ehsFireballMissile", displayName: "Fireball Missile", category: "damage" },
  { id: "frostMissile", enumName: "ehsFrostMissile", displayName: "Frost Missile", category: "damage" },
  { id: "arcaneMissile", enumName: "ehsArcaneMissile", displayName: "Arcane Missile", category: "damage" },
  { id: "lightningMissile", enumName: "ehsLightningMissile", displayName: "Lightning Missile", category: "damage" },
  { id: "axeMissile", enumName: "ehsAxeMissile", displayName: "Axe Missile", category: "damage" },
  { id: "shatteringPalm", enumName: "ehsShatteringPalm", displayName: "Shattering Palm", category: "damage" },
  { id: "fervor", enumName: "ehsFervor", displayName: "Fervor", category: "command" },
  { id: "bowMastery", enumName: "ehsBowMastery", displayName: "Bow Mastery", category: "damage" },
  { id: "windsOfNature", enumName: "ehsWindsOfNature", displayName: "Winds of Nature", category: "magic" },
  { id: "bloodrite", enumName: "ehsBloodrite", displayName: "Bloodrite", category: "magic" },
  { id: "wildExperiment", enumName: "ehsWildExperiment", displayName: "Wild Experiment", category: "magic" },
  { id: "tactician", enumName: "ehsTactician", displayName: "Tactician", category: "command" },
  { id: "salamanderLover", enumName: "ehsSalamanderLover", displayName: "Salamander Lover", category: "troopXp" },
  { id: "salvaging", enumName: "ehsSalvaging", displayName: "Salvaging", category: "resource" },
  { id: "metallurgy", enumName: "ehsMetallurgy", displayName: "Metallurgy", category: "resource" },
  { id: "purulence", enumName: "ehsPurulence", displayName: "Purulence", category: "magic" },
  { id: "knowledgeOfSpheres", enumName: "ehsKnowledgeOfSpheres", displayName: "Knowledge of Spheres", category: "magic" },
  { id: "trainer", enumName: "ehsTrainer", displayName: "Trainer", category: "troopXp" },
  { id: "calling", enumName: "ehsCalling", displayName: "Calling", category: "magic" },
  { id: "hex", enumName: "ehsHex", displayName: "Hex", category: "magic" },
  { id: "endurance", enumName: "ehsEndurance", displayName: "Endurance", category: "strength" },
  { id: "monasticArts", enumName: "ehsMonasticArts", displayName: "Monastic Arts", category: "combat" },
  { id: "lethalBlow", enumName: "ehsLethalBlow", displayName: "Lethal Blow", category: "damage" },
  { id: "woodcraft", enumName: "ehsWoodcraft", displayName: "Woodcraft", category: "utility" },
  { id: "saurianOverlord", enumName: "ehsSaurianOverlord", displayName: "Saurian Overlord", category: "troopXp" },
  { id: "runecrafting", enumName: "ehsRunecrafting", displayName: "Runecrafting", category: "resource" },
  { id: "toughness", enumName: "ehsToughness", displayName: "Toughness", category: "strength" },
  { id: "manaSplicing", enumName: "ehsManaSplicing", displayName: "Mana Splicing", category: "magic" },
  { id: "spellslinger", enumName: "ehsSpellslinger", displayName: "Spellslinger", category: "magic" },
  { id: "authority", enumName: "ehsAuthority", displayName: "Authority", category: "command" },
  { id: "thorns", enumName: "ehsThorns", displayName: "Thorns", category: "damage" },
  { id: "profNone", enumName: "ehsProfNone", displayName: "No Proficiency", category: "proficiency" },
];

export const skills = Array.from(
  [...vanillaSkills, ...extraSkills]
    .reduce((entries, entry) => entries.set(entry.id, entry), new Map())
    .values(),
);

export const races = [
  ["knight", "ehrKnight", "Knight", { strength: 0, dexterity: -2, intelligence: 0, charisma: 2 }, [["knightLord", 1, 1], ["leadership", 1, 1], ["constitution", 6, 0], ["lore", 12, 0], ["mightyBlow", 20, 0]]],
  ["dwarf", "ehrDwarf", "Dwarf", { strength: 3, dexterity: -3, intelligence: 0, charisma: 0 }, [["dwarfLord", 1, 1], ["constitution", 1, 1], ["engineer", 6, 0], ["ritual", 12, 0], ["brewmaster", 20, 0]]],
  ["undead", "ehrUndead", "Undead", { strength: 0, dexterity: 0, intelligence: 3, charisma: -3 }, [["skullLord", 1, 1], ["shadowStrength", 1, 1], ["lore", 6, 0], ["memories", 12, 0], ["vampirism", 20, 0]]],
  ["barbarian", "ehrBarbarian", "Barbarian", { strength: 2, dexterity: 2, intelligence: -2, charisma: -2 }, [["reave", 1, 1], ["horseLord", 1, 1], ["running", 6, 0], ["energy", 12, 0], ["mightyBlow", 20, 0]]],
  ["minotaur", "ehrMinotaur", "Minotaur", { strength: 6, dexterity: -2, intelligence: -2, charisma: -2 }, [["hornedLord", 1, 1], ["ferocity", 1, 1], ["mightyBlow", 6, 0], ["ritual", 12, 0], ["trainer", 20, 0]]],
  ["orc", "ehrOrc", "Orc", { strength: 2, dexterity: 0, intelligence: -2, charisma: 0 }, [["ferocity", 1, 1], ["orcLord", 1, 1], ["tactician", 6, 0], ["ritual", 12, 0], ["mightyBlow", 20, 0]]],
  ["highElf", "ehrHighElf", "High Elf", { strength: -4, dexterity: 0, intelligence: 2, charisma: 2 }, [["highLord", 1, 1], ["weaponmaster", 1, 1], ["runecrafting", 6, 0], ["energy", 12, 0], ["merchant", 20, 0]]],
  ["woodElf", "ehrWoodElf", "Wood Elf", { strength: -2, dexterity: 2, intelligence: 0, charisma: 0 }, [["forestLord", 1, 1], ["swiftness", 1, 1], ["runecrafting", 6, 0], ["ritual", 12, 0], ["guardianOak", 20, 0]]],
  ["darkElf", "ehrDarkElf", "Dark Elf", { strength: -2, dexterity: 0, intelligence: 2, charisma: 0 }, [["darkLord", 1, 1], ["shadowStrength", 1, 1], ["energy", 6, 0], ["runecrafting", 12, 0], ["execration", 20, 0]]],
  ["fey", "ehrFey", "Fey", { strength: -6, dexterity: 2, intelligence: 2, charisma: 2 }, [["dreamLord", 1, 1], ["swiftness", 1, 1], ["evasion", 6, 0], ["lore", 12, 0], ["warding", 20, 0]]],
  ["darkDwarf", "ehrDarkDwarf", "Dark Dwarf", { strength: 2, dexterity: 0, intelligence: 0, charisma: -2 }, [["siegeLord", 1, 1], ["constitution", 1, 1], ["engineer", 6, 0], ["ritual", 12, 0], ["golemMaster", 20, 0]]],
  ["daemon", "ehrDaemon", "Daemon", { strength: 4, dexterity: -2, intelligence: 0, charisma: -2 }, [["daemonLord", 1, 1], ["ferocity", 1, 1], ["regeneration", 6, 0], ["energy", 12, 0], ["gemcutting", 20, 0]]],
  ["empire", "ehrEmpire", "Empire", { strength: 0, dexterity: 0, intelligence: 0, charisma: 0 }, [["imperialLord", 1, 1], ["beastslayer", 1, 1], ["convincing", 6, 0], ["ritual", 12, 0], ["wealth", 20, 0]]],
  ["ssrathi", "ehrSsrathi", "Ssrathi", { strength: 0, dexterity: 2, intelligence: 0, charisma: -2 }, [["serpentLord", 1, 1], ["running", 1, 1], ["swiftness", 6, 0], ["energy", 12, 0], ["saurianOverlord", 20, 0]]],
  ["swarm", "ehrSwarm", "The Swarm", { strength: 0, dexterity: 4, intelligence: -2, charisma: -2 }, [["scorpionLord", 1, 1], ["evasion", 1, 1], ["running", 6, 0], ["energy", 12, 0], ["occultism", 20, 0]]],
  ["plaguelord", "ehrPlaguelord", "Plaguelord", { strength: 2, dexterity: -2, intelligence: 3, charisma: -3 }, [["plagueLord", 1, 1], ["regeneration", 1, 1], ["purulence", 6, 0], ["lore", 12, 0], ["leech", 20, 0]]],
].map(([id, enumName, displayName, statMods, skillRows]) => ({
  id,
  enumName,
  displayName,
  statMods,
  skills: skillRows.map(([skillId, availableAt, startingLevel]) => skill(skillId, "race", availableAt, startingLevel)),
  dataNote: dataNotes.statMods,
}));

const baseMana = [0, 0, 15, 20, 0, 0, 10, 0, 40, 0, 50, 30, 20, 50, 45, 45, 45, 50, 50, 50, 50, 45, 50, 0, 50, 45, 30, 50, 12, 50, 50, 0, 50, 30];
const baseArmor = Array(34).fill(100);
const baseResistance = [14, 13, 10, 12, 18, 12, 11, 11, 10, 10, 12, 10, 13, 11, 11, 11, 11, 10, 17, 12, 15, 10, 15, 12, 11, 10, 16, 15, 18, 16, 17, 12, 15, 12];
const baseLife = [800, 705, 600, 740, 720, 470, 650, 595, 590, 800, 420, 635, 730, 410, 520, 520, 515, 440, 380, 415, 395, 510, 390, 420, 405, 510, 620, 385, 570, 390, 380, 685, 390, 640];
const baseCombat = [7, 7, 5, 7, 8, 5, 5, 8, 5, 4, 3, 4, 7, 3, 3, 3, 3, 3, 3, 3, 3, 4, 3, 3, 3, 4, 6, 3, 8, 3, 3, 7, 3, 7];
const baseSpeed = [8, 16, 10, 8, 9, 9, 14, 10, 8, 8, 8, 8, 8, 10, 8, 8, 9, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 10, 8, 8, 11, 9, 9];
const baseMaxDamage = [35, 34, 27, 32, 33, 30, 25, 35, 28, 25, 20, 25, 34, 20, 25, 25, 24, 20, 21, 22, 20, 26, 20, 20, 21, 24, 30, 20, 30, 21, 20, 32, 20, 32];

const classRows = [
  ["warrior", "ehcWarrior", "Warrior", { strength: 3, dexterity: 0, intelligence: -3, charisma: 0 }, [["ferocity", 1, 3], ["constitution", 1, 0], ["regeneration", 3, 0], ["weaponmaster", 9, 0], ["mightyBlow", 15, 0]]],
  ["chieftain", "ehcChieftain", "Chieftain", { strength: 3, dexterity: 2, intelligence: -5, charisma: 0 }, [["ferocity", 1, 1], ["riding", 1, 1], ["leadership", 3, 0], ["running", 9, 0], ["mightyBlow", 15, 0]]],
  ["ranger", "ehcRanger", "Ranger", { strength: 0, dexterity: 0, intelligence: 0, charisma: 0 }, [["running", 1, 1], ["marksman", 1, 1], ["magicNature", 3, 0], ["windsOfNature", 9, 0], ["bowMastery", 15, 0]]],
  ["deathknight", "ehcDeathknight", "Deathknight", { strength: 3, dexterity: -2, intelligence: 2, charisma: -3 }, [["ferocity", 1, 1], ["cowardslayer", 1, 1], ["magicNecromancy", 3, 0], ["constitution", 9, 0], ["leech", 15, 0]]],
  ["dragonslayer", "ehcDragonslayer", "Dragonslayer", { strength: 4, dexterity: -2, intelligence: -2, charisma: 0 }, [["dragonslayer", 1, 1], ["ferocity", 1, 1], ["airmaster", 3, 0], ["wealth", 9, 0], ["runecrafting", 15, 0]]],
  ["warlock", "ehcWarlock", "Warlock", { strength: 0, dexterity: 0, intelligence: 3, charisma: -3 }, [["magicSummoning", 1, 1], ["lore", 1, 1], ["magicChaos", 3, 0], ["regeneration", 9, 0], ["constitution", 15, 0]]],
  ["thief", "ehcThief", "Thief", { strength: -2, dexterity: 4, intelligence: 0, charisma: -2 }, [["thievery", 1, 1], ["ferocity", 1, 1], ["running", 3, 0], ["insurgence", 9, 0], ["convincing", 15, 0]]],
  ["assassin", "ehcAssassin", "Assassin", { strength: 2, dexterity: 3, intelligence: 0, charisma: -5 }, [["assassin", 1, 3], ["swiftness", 1, 0], ["shadowStrength", 3, 0], ["lethalBlow", 9, 0], ["evasion", 15, 0]]],
  ["bard", "ehcBard", "Bard", { strength: 0, dexterity: 0, intelligence: 0, charisma: 0 }, [["leadership", 1, 3], ["diplomacy", 1, 0], ["wealth", 3, 0], ["marksman", 9, 0], ["magicDivination", 15, 0]]],
  ["merchant", "ehcMerchant", "Merchant", { strength: -2, dexterity: 0, intelligence: 0, charisma: 2 }, [["merchant", 1, 3], ["diplomacy", 1, 0], ["wealth", 3, 0], ["tactician", 9, 0], ["gemcutting", 15, 0]]],
  ["priest", "ehcPriest", "Priest", { strength: -2, dexterity: -2, intelligence: 2, charisma: 2 }, [["magicHealing", 1, 1], ["ritual", 1, 1], ["magicDivination", 3, 0], ["lore", 9, 0], ["occultism", 15, 0]]],
  ["tinker", "ehcTinker", "Tinker", { strength: 0, dexterity: -2, intelligence: 2, charisma: 0 }, [["engineer", 1, 3], ["metallurgy", 1, 0], ["quarrying", 3, 0], ["magicAlchemy", 9, 0], ["smelting", 15, 0]]],
  ["paladin", "ehcPaladin", "Paladin", { strength: 2, dexterity: -3, intelligence: -2, charisma: 3 }, [["witchhunter", 1, 1], ["ferocity", 1, 1], ["magicHealing", 3, 0], ["constitution", 9, 0], ["fervor", 15, 0]]],
  ["healer", "ehcHealer", "Healer", { strength: -3, dexterity: -2, intelligence: 2, charisma: 3 }, [["magicHealing", 1, 3], ["ritual", 1, 0], ["elcorsAura", 3, 0], ["merchant", 9, 0], ["leadership", 15, 0]]],
  ["druid", "ehcDruid", "Druid", { strength: -4, dexterity: 2, intelligence: 0, charisma: 2 }, [["magicNature", 1, 3], ["ritual", 1, 0], ["energy", 3, 0], ["calling", 9, 0], ["occultism", 15, 0]]],
  ["runemaster", "ehcRunemaster", "Runemaster", { strength: 0, dexterity: -3, intelligence: 3, charisma: 0 }, [["magicRunes", 1, 3], ["ritual", 1, 0], ["lore", 3, 0], ["quarrying", 9, 0], ["engineer", 15, 0]]],
  ["shaman", "ehcShaman", "Shaman", { strength: -2, dexterity: -2, intelligence: 0, charisma: 4 }, [["magicChaos", 1, 3], ["ritual", 1, 0], ["warding", 3, 0], ["energy", 9, 0], ["occultism", 15, 0]]],
  ["elementalist", "ehcElementalist", "Elementalist", { strength: -2, dexterity: -3, intelligence: 2, charisma: 3 }, [["magicPyromancy", 1, 1], ["magicIce", 1, 1], ["elementalLore", 3, 0], ["magicRunes", 9, 0], ["warding", 15, 0]]],
  ["defiler", "ehcDefiler", "Defiler", { strength: -2, dexterity: 2, intelligence: 3, charisma: -3 }, [["magicContagion", 1, 3], ["ritual", 1, 0], ["energy", 3, 0], ["purulence", 9, 0], ["execration", 15, 0]]],
  ["archmage", "ehcArchmage", "Archmage", { strength: -3, dexterity: 0, intelligence: 3, charisma: 0 }, [["deflection", 1, 1], ["leadership", 1, 1], ["lore", 3, 0], ["marksman", 9, 0], ["longevity", 15, 0]]],
  ["necromancer", "ehcNecromancer", "Necromancer", { strength: 0, dexterity: 0, intelligence: 3, charisma: -3 }, [["magicNecromancy", 1, 3], ["ritual", 1, 0], ["energy", 3, 0], ["gate", 9, 0], ["occultism", 15, 0]]],
  ["pyromancer", "ehcPyromancer", "Pyromancer", { strength: 2, dexterity: -3, intelligence: 3, charisma: -2 }, [["magicPyromancy", 1, 3], ["ritual", 1, 0], ["energy", 3, 0], ["smelting", 9, 0], ["destruction", 15, 0]]],
  ["summoner", "ehcSummoner", "Summoner", { strength: -2, dexterity: 0, intelligence: 4, charisma: -2 }, [["magicSummoning", 1, 3], ["ritual", 1, 0], ["energy", 3, 0], ["gate", 9, 0], ["occultism", 15, 0]]],
  ["alchemist", "ehcAlchemist", "Alchemist", { strength: 0, dexterity: -2, intelligence: 4, charisma: -2 }, [["magicAlchemy", 1, 1], ["lore", 1, 1], ["ritual", 3, 0], ["metallurgy", 9, 0], ["potionmaster", 15, 0]]],
  ["illusionist", "ehcIllusionist", "Illusionist", { strength: -3, dexterity: 2, intelligence: 3, charisma: -2 }, [["magicIllusion", 1, 3], ["ritual", 1, 0], ["lore", 3, 0], ["hex", 9, 0], ["longevity", 15, 0]]],
  ["iceMage", "ehcIceMage", "Ice Mage", { strength: -2, dexterity: -2, intelligence: 4, charisma: 0 }, [["magicIce", 1, 3], ["ritual", 1, 0], ["lore", 3, 0], ["gemcutting", 9, 0], ["longevity", 15, 0]]],
  ["lichelord", "ehcLichelord", "Lichelord", { strength: 2, dexterity: 0, intelligence: 3, charisma: -5 }, [["magicNecromancy", 1, 1], ["magicTime", 1, 1], ["mageKing", 3, 0], ["shadowStrength", 9, 0], ["witchhunter", 15, 0]]],
  ["sage", "ehcSage", "Sage", { strength: -3, dexterity: -2, intelligence: 3, charisma: 2 }, [["magicDivination", 1, 3], ["ritual", 1, 0], ["energy", 3, 0], ["occultism", 9, 0], ["longevity", 15, 0]]],
  ["monk", "ehcMonk", "Monk", { strength: 2, dexterity: 2, intelligence: -2, charisma: -2 }, [["swiftness", 1, 3], ["ferocity", 1, 0], ["magicTime", 3, 0], ["evasion", 9, 0], ["warding", 15, 0]]],
  ["venomancer", "ehcVenomancer", "Venomancer", { strength: -2, dexterity: -2, intelligence: 4, charisma: 0 }, [["magicPoison", 1, 3], ["ritual", 1, 0], ["energy", 3, 0], ["coil", 9, 0], ["execration", 15, 0]]],
  ["blightlord", "ehcBlightlord", "Blightlord", { strength: 0, dexterity: 2, intelligence: 3, charisma: -5 }, [["magicContagion", 1, 1], ["magicPoison", 1, 1], ["ritual", 3, 0], ["hex", 9, 0], ["execration", 15, 0]]],
  ["rogue", "ehcRogue", "Rogue", { strength: 2, dexterity: 3, intelligence: -3, charisma: -2 }, [["ferocity", 1, 1], ["pillaging", 1, 1], ["regeneration", 3, 0], ["merchant", 9, 0], ["weaponmaster", 15, 0]]],
  ["chronomancer", "ehcChronomancer", "Chronomancer", { strength: -2, dexterity: 2, intelligence: 2, charisma: -2 }, [["magicTime", 1, 3], ["ritual", 1, 0], ["energy", 3, 0], ["convincing", 9, 0], ["longevity", 15, 0]]],
  ["inquisitor", "ehcInquisitor", "Inquisitor", { strength: 2, dexterity: -2, intelligence: 2, charisma: -2 }, [["magicDivination", 1, 1], ["witchhunter", 1, 1], ["magicPyromancy", 3, 0], ["leech", 9, 0], ["fervor", 15, 0]]],
];

export const heroClasses = classRows.map(([id, enumName, displayName, statMods, skillRows], index) => ({
  id,
  enumName,
  displayName,
  statMods,
  baseMana: baseMana[index],
  baseArmor: baseArmor[index],
  baseResistance: baseResistance[index],
  baseLife: baseLife[index],
  baseCombat: baseCombat[index],
  baseSpeed: baseSpeed[index],
  baseMaxDamage: baseMaxDamage[index],
  lifePerLevel: 0,
  skills: skillRows.map(([skillId, availableAt, startingLevel]) => skill(skillId, "class", availableAt, startingLevel)),
  dataNote: dataNotes.statMods,
}));

export const skillsById = Object.fromEntries(skills.map((entry) => [entry.id, entry]));
export const racesById = Object.fromEntries(races.map((entry) => [entry.id, entry]));
export const heroClassesById = Object.fromEntries(heroClasses.map((entry) => [entry.id, entry]));
