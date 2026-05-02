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

export const spellPreviewGroups = spellPreviewGroupRows.map(([id, label, spells]) => ({
  id,
  label,
  spells: spells.map(([spellId, spellLabel, effects], index) => ({
    id: spellId,
    label: spellLabel,
    sphereId: id,
    sphereLabel: label,
    level: index + 1,
    effects: normalizeEffects(effects),
  })),
}));

export const spellPreviewSpells = spellPreviewGroups.flatMap((group) => group.spells);
export const defaultSpellPreviewId = spellPreviewSpells[0].id;

const spellPreviewSpellsById = Object.fromEntries(spellPreviewSpells.map((spell) => [spell.id, spell]));

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
