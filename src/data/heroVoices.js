export const heroVoiceLineTypes = [
  { id: "Mana", label: "Mana" },
  { id: "Order1", label: "Order 1" },
  { id: "Order2", label: "Order 2" },
  { id: "Order3", label: "Order 3" },
  { id: "Order4", label: "Order 4" },
  { id: "Select1", label: "Select 1" },
  { id: "Select2", label: "Select 2" },
  { id: "Select3", label: "Select 3" },
  { id: "Select4", label: "Select 4" },
  { id: "Spell1", label: "Spell 1" },
  { id: "Spell2", label: "Spell 2" },
  { id: "Spell3", label: "Spell 3" },
  { id: "Deathblow", label: "Deathblow" },
  { id: "Conversion", label: "Conversion" },
];

export const heroVoiceSets = [
  { id: "AHHX", sourceIndex: 0, label: "Noble Male", archive: "KnightsVoicesEn.xcr" },
  { id: "ADHX", sourceIndex: 1, label: "Angry Dwarf", archive: "DwarvesVoicesEn.xcr" },
  { id: "AUHX", sourceIndex: 2, label: "Evil Warrior", archive: "UndeadVoicesEn.xcr" },
  { id: "AMHX", sourceIndex: 3, label: "Barbaric Male", archive: "BarbariansVoicesEn.xcr" },
  { id: "ABHX", sourceIndex: 4, label: "Violent Male", archive: "MinotaursVoicesEn.xcr" },
  { id: "AOHX", sourceIndex: 5, label: "Crazed Male", archive: "OrcsVoicesEn.xcr" },
  { id: "AEHX", sourceIndex: 6, label: "Cold Female", archive: "HighElvesVoicesEn.xcr" },
  { id: "AWHX", sourceIndex: 7, label: "Efficient Female", archive: "WoodElvesVoicesEn.xcr" },
  { id: "AKHX", sourceIndex: 8, label: "Violent Female", archive: "DarkElvesVoicesEn.xcr" },
  { id: "AFHX", sourceIndex: 9, label: "Flamboyant Male", archive: "FeyVoicesEn.xcr" },
  { id: "AAHX", sourceIndex: 10, label: "Clever Dwarf", archive: "DarkDwarvesVoicesEn.xcr" },
  { id: "AVHX", sourceIndex: 11, label: "Daemonic Male", archive: "DaemonsVoicesEn.xcr" },
  { id: "AXH0", sourceIndex: 12, label: "Stern Male", archive: "DefaultVoicesEn.xcr" },
  { id: "AXH1", sourceIndex: 13, label: "Arrogant Dwarf", archive: "DefaultVoicesEn.xcr" },
  { id: "AXH2", sourceIndex: 14, label: "Serious Female", archive: "DefaultVoicesEn.xcr" },
  { id: "AXH3", sourceIndex: 15, label: "Knightly Male", archive: "DefaultVoicesEn.xcr" },
  { id: "AXH4", sourceIndex: 16, label: "Evil Female", archive: "DefaultVoicesEn.xcr" },
  { id: "AXH5", sourceIndex: 17, label: "Corrupt Male", archive: "DefaultVoicesEn.xcr" },
  { id: "AXH6", sourceIndex: 18, label: "Female Warrior", archive: "DefaultVoicesEn.xcr" },
  { id: "AXH7", sourceIndex: 19, label: "Brutal Male", archive: "DefaultVoicesEn.xcr" },
];

export const heroVoiceSetsById = Object.fromEntries(heroVoiceSets.map((voiceSet) => [voiceSet.id, voiceSet]));
export const heroVoiceSetIds = heroVoiceSets.map((voiceSet) => voiceSet.id);

const heroVoiceSetIdsBySourceIndex = Object.fromEntries(heroVoiceSets.map((voiceSet) => [voiceSet.sourceIndex, voiceSet.id]));

const sourceVoiceIndexesByRace = {
  knight: [0, 15, 9, 6, 7, 12, 14],
  dwarf: [1, 10, 13, 0, 12],
  undead: [2, 17, 4, 5, 8, 11, 12, 16, 19],
  barbarian: [3, 2, 4, 5, 7, 12, 18, 19],
  minotaur: [4, 2, 5, 11, 12, 19],
  orc: [5, 4, 2, 11, 12, 19],
  highElf: [6, 7, 14, 0, 9, 15],
  woodElf: [7, 6, 8, 14, 0, 9, 12, 18],
  darkElf: [8, 14, 2, 7, 11, 12, 16],
  fey: [9, 0, 15, 6, 7, 8, 14, 18],
  darkDwarf: [10, 1, 13, 2, 11, 12],
  daemon: [11, 17, 2, 4, 5, 12, 19],
  empire: [14, 6, 7, 8, 18, 0, 9, 12, 15],
  ssrathi: [12, 17, 19, 11],
  swarm: [2, 4, 5, 11, 12, 17, 19],
  plaguelord: [17, 2, 4, 5, 11, 12, 19, 8, 14],
};

export const heroVoiceProfiles = Object.entries(sourceVoiceIndexesByRace).map(([raceId, sourceIndexes]) => ({
  raceId,
  sourceIndexes,
  voiceSetIds: sourceIndexes.map((index) => heroVoiceSetIdsBySourceIndex[index]).filter(Boolean),
}));

export const heroVoiceProfilesByRace = Object.fromEntries(
  heroVoiceProfiles.map((profile) => [profile.raceId, profile]),
);

export function getAssignedHeroVoiceIds(raceId) {
  return heroVoiceProfilesByRace[String(raceId ?? "")]?.voiceSetIds ?? [];
}

export function getAllHeroVoiceIds() {
  return heroVoiceSetIds;
}

export function getDefaultHeroVoiceId(raceId) {
  return getAssignedHeroVoiceIds(raceId)[0] ?? "";
}

export function getHeroVoiceSetLabel(voiceId) {
  return heroVoiceSetsById[String(voiceId ?? "").toUpperCase()]?.label ?? String(voiceId ?? "");
}
