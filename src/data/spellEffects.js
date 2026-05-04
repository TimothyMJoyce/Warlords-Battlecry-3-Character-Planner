const spellPreviewGroupRows = [
  [
    "healing",
    "Healing",
    [
      ["healSelf", "Heal Self", { casting: ["EZ11"] }],
      ["cure", "Cure", { casting: ["EZ20"], target: ["EZ20"] }],
      ["blessing", "Blessing", { casting: ["EZ20"], persistent: ["EBLS"] }],
      ["whiteWard", "White Ward", { casting: ["EZ20"], persistent: ["EZ22"] }],
      ["healGroup", "Group Healing", { casting: ["EZ11"], target: ["EZ11"] }],
      ["invigorate", "Invigorate", { casting: ["EZ20"], persistent: ["EZ23"] }],
      ["sunshine", "Sunshine", { casting: ["EZ19"] }],
      ["majorHealing", "Major Healing", { casting: ["EZ11"], target: ["EZ11"] }],
      ["lifeWard", "Life Ward", { casting: ["EZ20"], persistent: ["EZ24"] }],
      ["resurrection", "Resurrection", { casting: ["EZ20"], target: ["EZ13"] }],
    ],
  ],
  [
    "summoning",
    "Summoning",
    [
      ["summonQuasit", "Summon Quasit", { target: ["EZ34"] }],
      ["circleOfPower", "Circle of Power", { target: ["EZ36"] }],
      ["phantomSteed", "Phantom Steed", { casting: ["EZ37"] }],
      ["blink", "Blink", { target: ["EZ34"] }],
      ["summonImp", "Summon Imp", { target: ["EZ34"] }],
      ["eyeOfOros", "Eye of Oros", { target: ["EZ34"] }],
      ["homePortal", "Home Portal", { target: ["EZ34"] }],
      ["soulHarvest", "Soul Harvest", { target: ["EZ34"] }],
      ["banish", "Banish", { casting: ["EZ37"], target: ["EZ37"] }],
      ["daemonGate", "Daemon Gate", { target: ["EZ35"] }],
    ],
  ],
  [
    "nature",
    "Nature",
    [
      ["summonSprite", "Summon Sprite", { target: ["EZ14"] }],
      ["gemberry", "Gemberry", { casting: ["EZ15"], target: ["EZ15"] }],
      ["entangle", "Entangle", { casting: ["EZ19"], persistent: ["EZ16"] }],
      ["shillelagh", "Shillelagh", { persistent: ["EZ17"] }],
      ["summonUnicorn", "Summon Unicorn", { target: ["EZ18"] }],
      ["wallOfThorns", "Wall of Thorns", { target: ["EZ18"] }],
      ["callLightning", "Call Lightning", { target: ["EZ09"] }],
      ["summonTreant", "Summon Treant", { target: ["EZ18"] }],
      ["changeWeather", "Change Weather", { casting: ["EZ19"] }],
      ["elementalism", "Elementalism", { target: ["EZ14", "EZ18", "EZ34"] }],
    ],
  ],
  [
    "illusion",
    "Illusion",
    [
      ["shadowform", "Shadowform", { casting: ["EILU"] }],
      ["scare", "Scare", { casting: ["EILU"], target: ["EILE"] }],
      ["lightDarkness", "Light/Darkness", { casting: ["EZ19"] }],
      ["awe", "Awe", { casting: ["EILU"], target: ["EILE"] }],
      ["spectralHorde", "Spectral Horde", { target: ["EZ34"] }],
      ["dragonFear", "Dragon Fear", { target: ["EZ34"] }],
      ["invisibility", "Invisibility", { casting: ["EILU"] }],
      ["callShadow", "Call Shadow", { target: ["EZ08"] }],
      ["mutate", "Mutate", { casting: ["EILU"], target: ["EZ12"] }],
      ["transform", "Transform", { casting: ["EILU"], target: ["EILE"] }],
    ],
  ],
  [
    "necromancy",
    "Necromancy",
    [
      ["raiseSkeleton", "Raise Skeleton", { target: ["EZ08"] }],
      ["raiseZombie", "Raise Zombie", { target: ["EZ08"] }],
      ["blackPortal", "Black Portal", { target: ["EZ05"] }],
      ["raiseWight", "Raise Wight", { target: ["EZ08"] }],
      ["vampirism", "Vampirism", { casting: ["EZ27"], persistent: ["EZ26"] }],
      ["darkstorm", "Darkstorm", { casting: ["EZ27"] }],
      ["stripFlesh", "Strip Flesh", { casting: ["EZ27"], target: ["EZ41"] }],
      ["callTheDead", "Call the Dead", { casting: ["EZ78"], target: ["EZ08"] }],
      ["ringOfIceNecromancy", "Ring of Ice", { casting: ["EZ07"] }],
      ["raiseChampion", "Raise Champion", { target: ["EZ08"] }],
    ],
  ],
  [
    "pyromancy",
    "Pyromancy",
    [
      ["handOfFlame", "Hand of Flame", { missile: ["EMF0"] }],
      ["soulFlame", "Soul Flame", { casting: ["EZ30"], target: ["EF01"] }],
      ["cauterize", "Cauterize", { casting: ["EF04"], target: ["EF04"] }],
      ["resistFire", "Resist Fire", { casting: ["EZ29"], persistent: ["EZ28"] }],
      ["ringOfFire", "Ring of Fire", { casting: ["EZ06"] }],
      ["firebreath", "Firebreath", { casting: ["EZ31"], persistent: ["EZ33"] }],
      ["berserker", "Berserker", { casting: ["EZ30"] }],
      ["pillarOfFire", "Pillar of Fire", { casting: ["EZ32"] }],
      ["fireElemental", "Fire Elemental", { target: ["EZ14"] }],
      ["armageddon", "Armageddon", { target: ["EZ32"] }],
    ],
  ],
  [
    "alchemy",
    "Alchemy",
    [
      ["createItem", "Create Item", {}],
      ["transmute", "Transmute", {}],
      ["charm", "Charm", { casting: ["EZ20"], persistent: ["EZ39"] }],
      ["stoneGolemAlchemy", "Stone Golem", { target: ["EZ34"] }],
      ["brewPotion", "Brew Potion", {}],
      ["acquire", "Acquire", { target: ["EZ20"] }],
      ["summonGuardianAlchemy", "Summon Guardian", { target: ["EZ35"] }],
      ["disjunctionAlchemy", "Disjunction", {}],
      ["bronzeGolem", "Bronze Golem", { target: ["EZ34"] }],
      ["spellforge", "Spellforge", {}],
    ],
  ],
  [
    "runes",
    "Rune Magic",
    [
      ["stoneskin", "Stoneskin", { casting: ["ERUC"] }],
      ["gemOfWisdom", "Gem of Wisdom", { casting: ["ERUC"] }],
      ["dig", "Dig", { casting: ["ERUC"], persistent: ["EZ39"] }],
      ["earthpower", "Earthpower", { casting: ["ERUC"], target: ["EZ00"] }],
      ["resistMagic", "Resist Magic", { casting: ["ERUC"] }],
      ["doomstones", "Doomstones", { casting: ["ERUC"], missile: ["EMC0"] }],
      ["summonGuardianRunes", "Summon Guardian", { casting: ["ERUC"], target: ["EZ35"] }],
      ["resistMissile", "Resist Missile", { casting: ["ERUC"], persistent: ["EZ40"] }],
      ["runeItem", "Rune Item", {}],
      ["stonecall", "Stonecall", { casting: ["ERUC"], target: ["EZ34"] }],
    ],
  ],
  [
    "ice",
    "Ice",
    [
      ["handOfIce", "Hand of Ice", { casting: ["EISP"], missile: ["EMIS"] }],
      ["storm", "Storm", { casting: ["EZ27"] }],
      ["iceArmor", "Ice Armor", { casting: ["EISP"], persistent: ["EIAR"] }],
      ["calm", "Calm", { casting: ["EISP"], target: ["EISP"] }],
      ["ringOfIce", "Ring of Ice", {}],
      ["freeze", "Freeze", { casting: ["EISP"] }],
      ["wallOfIce", "Wall of Ice", { target: ["EISP"] }],
      ["iceFloe", "Ice Floe", { casting: ["EISP"], persistent: ["EMIF"] }],
      ["freezeMagic", "Freeze Magic", { casting: ["EISP"], persistent: ["EIFM"] }],
      ["iceStorm", "Ice Storm", { casting: ["EIST"], target: ["EIST"], missile: ["EMM2"] }],
    ],
  ],
  [
    "chaos",
    "Chaos",
    [
      ["morphCombat", "Morph Combat", { casting: ["ECHC"], target: ["ECHC"] }],
      ["morphSpeed", "Morph Speed", { casting: ["ECHC"], target: ["ECHC"] }],
      ["morphHealth", "Morph Health", { casting: ["ECHC"], target: ["ECHC"] }],
      ["morphDamage", "Morph Damage", { casting: ["ECHC"], target: ["ECHC"] }],
      ["morphTower", "Morph Tower", { casting: ["ECHC"], target: ["ECHC"] }],
      ["drainMana", "Drain Mana", { casting: ["EZ15"], target: ["EZ15"] }],
      ["morphResources", "Morph Resources", {}],
      ["learnSpell", "Learn Spell", { casting: ["ECHC"] }],
      ["wildfire", "Wildfire", { casting: ["ECHW"], target: ["ECHW"], missile: ["EMM4"] }],
      ["chaosPlague", "Chaos Plague", { casting: ["EZ19"], target: ["EZ25"] }],
    ],
  ],
  [
    "poison",
    "Poison",
    [
      ["immunity", "Immunity", { casting: ["EZ20"], persistent: ["EIMM"] }],
      ["poisonCloud", "Poison Cloud", { casting: ["EZ19"], target: ["EZ25"] }],
      ["summonWasp", "Summon Wasp", { target: ["EZ18"] }],
      ["antidote", "Antidote", { casting: ["EZ20"], target: ["EZ20"] }],
      ["venomTouch", "Venom Touch", { casting: ["EPOC"], persistent: ["ESVT"] }],
      ["poisonGate", "Poison Gate", { casting: ["EZ19"], persistent: ["EPGA"] }],
      ["sprayPoison", "Spray Poison", { casting: ["EPOC"], missile: ["EMAP"] }],
      ["guardianNaga", "Guardian Naga", { target: ["EZ18"] }],
      ["rot", "Rot", { casting: ["EPOC"], target: ["EPOC"] }],
      ["callOfKargoth", "Call of Kargoth", { target: ["EZ18"] }],
    ],
  ],
  [
    "divination",
    "Divination",
    [
      ["elementalLore", "Elemental Lore", { casting: ["EARC"], persistent: ["EZ65"] }],
      ["defenseLore", "Defense Lore", { casting: ["EDVC"], persistent: ["EZ66"] }],
      ["seeInvisible", "See Invisible", { casting: ["EDVC"], persistent: ["ESIV"] }],
      ["telepathy", "Telepathy", { casting: ["EDVC"], persistent: ["EZ67"] }],
      ["banishDivination", "Banish", { casting: ["EZ37"], target: ["EZ37"] }],
      ["comprehension", "Comprehension", { casting: ["EDVC"], persistent: ["ECOM"] }],
      ["summonSage", "Summon Sage", { target: ["EZ34"] }],
      ["mindLeech", "Mind Leech", { casting: ["EDVC"], persistent: ["EZ68"] }],
      ["trueSight", "True Sight", { casting: ["EDVC"] }],
      ["psychicBlast", "Psychic Blast", { casting: ["EDVC"], target: ["EDVC"] }],
    ],
  ],
  [
    "arcane",
    "Arcane",
    [
      ["concentration", "Concentration", { casting: ["EDVC"], persistent: ["EZ70"] }],
      ["command", "Command", { casting: ["EDVC"], persistent: ["EZ71"] }],
      ["enervate", "Enervate", { casting: ["EDVC"], persistent: ["EZ72"] }],
      ["extend", "Extend", { casting: ["EDVC"], persistent: ["EZ73"] }],
      ["manaFlow", "Mana Flow", { casting: ["EDVC"], persistent: ["EZ74"] }],
      ["corruption", "Corruption", { casting: ["EDVC"], persistent: ["EZ75"] }],
      ["dispel", "Dispel", { casting: ["EARC"], target: ["EARC"] }],
      ["manaLeech", "Mana Leech", { casting: ["EDVC"], persistent: ["EZ76"] }],
      ["empower", "Empower", { casting: ["EDVC"], persistent: ["EZ77"] }],
      ["destruction", "Destruction", { casting: ["EARC"], target: ["EX01"] }],
    ],
  ],
  [
    "time",
    "Time",
    [
      ["vigor", "Vigor", { casting: ["EARC"], persistent: ["EJ05"] }],
      ["age", "Age", { casting: ["EDVC"], persistent: ["EJ01"] }],
      ["life", "Life", { casting: ["EDVC"], persistent: ["EJ08"] }],
      ["foresight", "Foresight", { casting: ["EDVC"], target: ["EDVC"], persistent: ["EJ04"] }],
      ["springtime", "Springtime", { casting: ["EDVC"], target: ["EDVC"], persistent: ["EJ07"] }],
      ["decrepify", "Decrepify", { casting: ["EDVC"], target: ["EDVC"], persistent: ["EJ03"] }],
      ["wisdomOfAge", "Wisdom of Age", { casting: ["EDVC"], persistent: ["EJ06"] }],
      ["whispersOfTime", "Whispers of Time", { target: ["EZ08"] }],
      ["overwork", "Overwork", { casting: ["EDVC"], target: ["EDVC"], persistent: ["EJ09"] }],
      ["breathOfDying", "Breath of Dying", { casting: ["EPOC"], target: ["EJ02"], persistent: ["EPOC"] }],
    ],
  ],
];

const defaultSpellScalingSummary = "No direct rank scaling found beyond cast rank and chance.";

const spellScalingSummaries = {
  healSelf: "Heal = 50 x R, plus Elcor's Aura if active.",
  cure: "Cures; heal = 10 x R. Radius uses command radius.",
  blessing: "Morale = 1 + R. Duration scales with R.",
  whiteWard: "Resistance = 5 x R. Duration scales with R; radius uses command radius.",
  healGroup: "Ally heal = 50 x R, plus Elcor's Aura if active. Radius uses command radius.",
  invigorate: "Speed = min(5, 1 + R). Duration scales with R; radius uses command radius.",
  sunshine: "Sets sunshine; evil damage = 30 + 20 x R in command radius.",
  majorHealing: "Heal = 100 x R, plus Elcor's Aura if active. Very large radius.",
  lifeWard: "Death ward effect does not grow; duration scales with R.",
  resurrection: "Resurrection radius scales with R; at R3+ it targets allies only.",

  summonQuasit: "Summons about R quasits; XP = +20 x (R - 1). Duration scales with R.",
  circleOfPower: "Creates a circle; duration scales with R.",
  phantomSteed: "Speed = 1 + R; armor/resistance = 5 x R. Duration scales with R.",
  blink: "Teleport range uses command radius; no direct rank scaling.",
  summonImp: "Summons R imps; XP = +20 x (R - 1). Duration scales with R.",
  eyeOfOros: "Summons R + 1 eyes; XP = +20 x (R - 1). Duration scales with R.",
  homePortal: "Portal effect has no direct rank scaling.",
  soulHarvest: "Summons R soul units; XP = +20 x (R - 1). Duration scales with R.",
  banish: "Banishes up to level 3 + 2 x R. Radius uses command radius.",
  daemonGate: "Summons 1 + floor((R - 1) / 3) daemons; XP = +50 x (R - 1).",

  summonSprite: "Summons 1 sprite; XP = +20 x (R - 1). Duration scales with R.",
  gemberry: "Heal = 25 x R; R2+ also cures. Radius uses command radius.",
  entangle: "Speed penalty = 2 + 2 x R. Duration scales with R; radius uses command radius.",
  shillelagh: "Combat bonus = 5 x R. Duration scales with R.",
  summonUnicorn: "Summons 1 unicorn; XP = +20 x (R - 1). Duration scales with R.",
  wallOfThorns: "Wall duration = 600s x R.",
  callLightning: "Damage = 40 + 20 x R; targets add 2 x R, capped at 24. Rain adds 10% damage.",
  summonTreant: "Summons 1 treant; XP = +20 x (R - 1). Duration scales with R.",
  changeWeather: "Weather type changes; no direct rank scaling.",
  elementalism: "Summons 1 + floor((R - 1) / 2) elementals; XP = +50 x (R - 1).",

  shadowform: "Speed = R; armor/resistance = 5 x R. Duration scales with R.",
  scare: "Affects up to level 4 + 2 x R; radius scales with R.",
  lightDarkness: "Toggles light/dark weather state; no direct rank scaling.",
  awe: "Affects up to level 4 + 2 x R; radius scales with R.",
  spectralHorde: "Summons 4 + 2 x R illusion troops. Duration scales with R.",
  dragonFear: "Summons 1 illusion dragon. Duration scales with R.",
  invisibility: "Duration scales with R.",
  callShadow: "Summons 1 + floor((R - 1) / 2) shadows; XP = +20 x (R - 1).",
  mutate: "Mutates units up to level R + 1. Radius uses command radius.",
  transform: "Targets up to min(15, 3 x R); transformation roll improves with R.",

  raiseSkeleton: "Summons 1 + R skeletons; XP = +5 x (R - 1). Duration scales with R.",
  raiseZombie: "Summons about R zombies; XP = +5 x (R - 1). Duration scales with R.",
  blackPortal: "Creates a portal; duration scales with R.",
  raiseWight: "Summons 1 + floor((R - 1) / 2) wights; XP = +20 x (R - 1).",
  vampirism: "Vampirism = R + 1. Duration and radius scale with R.",
  darkstorm: "Darkstorm weather effect has no direct rank scaling.",
  stripFlesh: "Affects targets up to level R + 1. Radius uses command radius.",
  callTheDead: "Raises corpses in command radius; XP = +20 x (R - 1), targets capped at 24.",
  ringOfIceNecromancy: "Ice damage = 25 + 25 x R in fixed radius.",
  raiseChampion: "Shadows = R + 1, or elite undead = 1 + floor((R - 1) / 3); XP = +20 x (R - 1).",

  handOfFlame: "Fire damage = 10 + 10 x R. Rain reduces damage by 20%.",
  soulFlame: "XP gain = 5 + 5 x R; max gain = 10 x R. Radius uses command radius.",
  cauterize: "Heal = 20 x R. Radius uses command radius.",
  resistFire: "Fire resistance = 25 x R. Duration scales with R; radius uses command radius.",
  ringOfFire: "Fire damage = 25 + 25 x R in fixed radius. Rain uses a reduced formula.",
  firebreath: "Breath damage = 5 + 5 x R. Duration scales with R; radius uses command radius.",
  berserker: "Combat = 4 + R; speed = 3 + 2 x R. Duration scales with R.",
  pillarOfFire: "Fire damage = 60 + 40 x R in fixed radius. Rain uses a reduced formula.",
  fireElemental: "Summons 1 + floor((R - 1) / 2) elementals; XP = +50 x (R - 1).",
  armageddon: "Fire damage = 50 + 50 x R in command radius. Rain halves damage.",

  createItem: "Item quality unlocks at R1/R2/R3/R4: lesser, major, artifact, set.",
  transmute: "Success chance = min(100%, 45 + 5 x R).",
  charm: "Merchant bonus = 2 x R. Duration scales with R.",
  stoneGolemAlchemy: "Summons 1 stone golem; XP = +20 x (R - 1). Duration scales with R.",
  brewPotion: "Adds R healing potions.",
  acquire: "Search/conversion radius scales with R, then is halved.",
  summonGuardianAlchemy: "Guardian tier improves at R2/R3+; duration = 8 + 2 x R minutes.",
  disjunctionAlchemy: "Disjunction duration scales with R.",
  bronzeGolem: "Summons 1 bronze golem; XP = +20 x (R - 1). Duration scales with R.",
  spellforge: "Doubles item-power effects; duration scales with R.",

  stoneskin: "Armor +10. Duration scales with R.",
  gemOfWisdom: "Next spell chance bonus = 10 + 10 x R.",
  dig: "Dig/building bonus = 10 + 10 x R. Duration scales with R.",
  earthpower: "Heal = 200 x R. Radius scales with R.",
  resistMagic: "Magic resistance = 25 x R. Duration scales with R.",
  doomstones: "Crushing damage = 10 + 20 x R. Radius uses command radius.",
  summonGuardianRunes: "Guardian tier improves at R2/R3+; duration scales with R.",
  resistMissile: "Missile protection effect does not grow; duration scales with R.",
  runeItem: "Creates the chosen rune item; no direct rank scaling.",
  stonecall: "Summons 1 + floor((R - 1) / 2) earth elementals; XP = +50 x (R - 1).",

  handOfIce: "Ice damage = 15 + 10 x R. Radius uses command radius.",
  storm: "Weather improves at R2+; otherwise no numeric rank scaling.",
  iceArmor: "Armor = 5 x R. Duration scales with R.",
  calm: "Calm radius scales with R.",
  ringOfIce: "Ice damage = 25 + 25 x R in fixed radius.",
  freeze: "Speed penalty = 1 + R. Duration scales with R; radius uses command radius.",
  wallOfIce: "Wall duration = 600s x R.",
  iceFloe: "Ice aura damage = 5 + 15 x R. Duration scales with R.",
  freezeMagic: "Magic-freeze effect duration scales with R.",
  iceStorm: "Ice damage = 50 + 50 x R. Radius uses command radius.",

  morphCombat: "Random combat change range grows as 1 + 6 x R.",
  morphSpeed: "Random speed change range grows as 1 + 6 x R.",
  morphHealth: "Random health change range grows as 10 x (1 + 6 x R).",
  morphDamage: "Random damage change range grows as 1 + 6 x R.",
  morphTower: "Random tower stat changes use 1 + 6 x R; health change is x10.",
  drainMana: "Drains mana; no direct rank scaling in this wrapper.",
  morphResources: "Success chance = min(100%, 45 + 5 x R + random -10..10).",
  learnSpell: "Temporarily learned spell level = R.",
  wildfire: "Damage = 20 + 30 x R. Damage type varies by roll.",
  chaosPlague: "HP disease percent = max(5, 53 - 3 x R); higher rank is harsher.",

  immunity: "Immunity effect does not grow; duration scales with R.",
  poisonCloud: "Poison radius scales with R.",
  summonWasp: "Summons 1 + 2 x (R - 1) wasps; XP = +20 x (R - 1).",
  antidote: "Cure radius scales with R.",
  venomTouch: "Venom effect does not grow; duration scales with R.",
  poisonGate: "Poison gate duration scales with R.",
  sprayPoison: "Piercing damage = 30 + 10 x R. Radius uses command radius.",
  guardianNaga: "Summons 1 naga; XP = +20 x (R - 1). Duration scales with R.",
  rot: "Affects targets up to level R + 1; radius scales with R.",
  callOfKargoth: "Summons 8 units; XP = +20 x (R - 1). Duration scales with R.",

  elementalLore: "Elemental lore +10. Duration scales with R.",
  defenseLore: "Defense lore +10. Duration scales with R.",
  seeInvisible: "See Invisible effect does not grow; duration scales with R.",
  telepathy: "Telepathy effect = 10 x R. Duration scales with R.",
  banishDivination: "Banishes up to level 3 + 2 x R. Radius uses command radius.",
  comprehension: "Comprehension = min(50%, 20 + 5 x R). Duration scales with R.",
  summonSage: "Summons 1 sage; XP = +20 x (R - 1). Duration scales with R.",
  mindLeech: "Mind leech effect is fixed; duration scales with R and uses command radius.",
  trueSight: "Vision bonus = R.",
  psychicBlast: "Stun duration scales with R. Radius uses command radius.",

  concentration: "Spellcasting bonus = 15 + 5 x R. Duration scales with R.",
  command: "Spell range bonus = 25 x R. Duration scales with R.",
  enervate: "Mana regen bonus = 75 + 25 x R. Duration scales with R.",
  extend: "Spell duration bonus = 100%. Buff duration scales with R.",
  manaFlow: "Mana discount = 25%. Buff duration scales with R.",
  corruption: "Corruption = 20 + 10 x R. Duration scales with R.",
  dispel: "Dispel radius scales with R.",
  manaLeech: "Mana leech = 4 + R. Duration scales with R.",
  empower: "Empower bonus = 25 + 25 x R. Duration scales with R.",
  destruction: "Damage = caster current HP - 1. Radius scales with R.",

  vigor: "Speed = 1 + 2 x R; combat = R - 1. Duration scales with R.",
  age: "Speed penalty = -(3 + R). Duration scales with R; radius uses command radius.",
  life: "Max life +40 + 20 x R; healing +60 + 20 x R. Duration scales with R.",
  foresight: "Combat bonus = 2 + 2 x R. Duration scales with R; radius uses command radius.",
  springtime: "Speed = 3 + R; combat = 2 + R; regen = 3 + 3 x R. Duration scales with R.",
  decrepify: "Speed penalty = -(2 + 2 x R); combat penalty = -(1 + R); damage = 4.5 x R.",
  wisdomOfAge: "Production bonus = 10 + 10 x R. Duration scales with R.",
  whispersOfTime: "Summons min(R + 1, 24) wraiths; XP = 20 x R. Duration is fixed.",
  overwork: "Mine work effect = R. Duration scales with R.",
  breathOfDying: "Affects targets up to level R + 3. Radius uses command radius.",
};

export const spellPreviewGroups = spellPreviewGroupRows.map(([id, label, spells], groupIndex) => ({
  id,
  label,
  spells: spells.map(([spellId, spellLabel, effects], index) => ({
    id: spellId,
    label: spellLabel,
    sphereId: id,
    sphereLabel: label,
    level: index + 1,
    gameTextIndex: groupIndex * 10 + index,
    scaling: spellScalingSummaries[spellId] ?? defaultSpellScalingSummary,
    effects: normalizeEffects(effects),
  })),
}));

export const spellPreviewSpells = spellPreviewGroups.flatMap((group) => group.spells);
export const defaultSpellPreviewId = spellPreviewSpells[0].id;
export const spellScalingSummaryCount = Object.keys(spellScalingSummaries).length;

const spellPreviewSpellsById = Object.fromEntries(spellPreviewSpells.map((spell) => [spell.id, spell]));

export function getSpellRankForMagicSkill(skillLevel, spellLevel) {
  const skill = Math.max(0, Math.trunc(Number(skillLevel) || 0));
  const spellIndex = Math.max(0, Math.trunc(Number(spellLevel) || 1) - 1);
  if (skill <= spellIndex) return 0;

  let rank = Math.trunc(skill / 10) + 1;
  if (skill % 10 <= spellIndex) rank -= 1;
  return Math.max(0, rank);
}

export function getSpellRankThreshold(spellLevel, rank) {
  const level = Math.max(1, Math.trunc(Number(spellLevel) || 1));
  const targetRank = Math.max(1, Math.trunc(Number(rank) || 1));
  return level + (targetRank - 1) * 10;
}

export function getSpellPreview(spellId) {
  return spellPreviewSpellsById[spellId] ?? spellPreviewSpellsById[defaultSpellPreviewId];
}

export function normalizeSpellPreviewId(spellId) {
  return getSpellPreview(spellId).id;
}

export function getSpellPreviewEffectIds(spell) {
  const effects = spell?.effects ?? {};
  return [
    ...effects.casting,
    ...effects.target,
    ...effects.persistent,
    ...effects.missile,
  ].filter(Boolean);
}

function normalizeEffects(effects = {}) {
  return {
    casting: normalizeEffectList(effects.casting),
    target: normalizeEffectList(effects.target),
    persistent: normalizeEffectList(effects.persistent),
    missile: normalizeEffectList(effects.missile),
  };
}

function normalizeEffectList(values) {
  return [...new Set((values ?? []).map((value) => String(value).toUpperCase()).filter(Boolean))];
}
