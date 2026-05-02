export const CELL_WIDTH = 32;
export const CELL_HEIGHT = 24;
export const MAX_EFFECTIVE_COMMAND_RADIUS = 19;

export const heroAnimationTypes = [
  { id: "stand", label: "Stand", index: 0, suffix: "" },
  { id: "walk", label: "Walk", index: 1, suffix: "w" },
  { id: "fight", label: "Fight", index: 2, suffix: "f" },
  { id: "die", label: "Die", index: 3, suffix: "d" },
  { id: "ambient", label: "Ambient", index: 4, suffix: "a" },
  { id: "special", label: "Special", index: 5, suffix: "z" },
  { id: "convert", label: "Convert", index: 6, suffix: "c" },
  { id: "spell", label: "Spell", index: 7, suffix: "s" },
  { id: "interface", label: "Interface", index: 8, suffix: "i" },
];

export const DEFAULT_HERO_ANIMATION_ID = "ambient";
export const DEFAULT_HERO_DIRECTION = 3;
export const DEFAULT_HERO_COLOR = 0;

const defaultHeroAnimationIds = ["stand", "walk", "fight", "die", "ambient", "convert", "spell", "interface"];
const noMagicHeroAnimationIds = ["stand", "walk", "fight", "die", "ambient", "interface"];
const titanHeroAnimationIds = ["stand", "walk", "fight", "die", "interface"];

export const heroAvatars = [
  { id: "AHHX", displayName: "Knight Hero", archive: "Knights.xcr", animationIds: defaultHeroAnimationIds },
  { id: "ATHX", displayName: "Knight Titan Hero", archive: "Knights.xcr", animationIds: titanHeroAnimationIds },
  { id: "ADHX", displayName: "Dwarf Hero", archive: "Dwarves.xcr", animationIds: defaultHeroAnimationIds },
  { id: "AUHX", displayName: "Undead Hero", archive: "Undead.xcr", animationIds: defaultHeroAnimationIds },
  { id: "AMHX", displayName: "Barbarian Hero", archive: "Barbarians.xcr", animationIds: defaultHeroAnimationIds },
  { id: "ABHX", displayName: "Minotaur Hero", archive: "Minotaurs.xcr", animationIds: defaultHeroAnimationIds },
  { id: "AOHX", displayName: "Orc Hero", archive: "Orcs.xcr", animationIds: defaultHeroAnimationIds },
  { id: "AEHX", displayName: "High Elf Hero", archive: "HighElves.xcr", animationIds: defaultHeroAnimationIds },
  { id: "AWHX", displayName: "Wood Elf Hero", archive: "WoodElves.xcr", animationIds: defaultHeroAnimationIds },
  { id: "AKHX", displayName: "Dark Elf Hero", archive: "DarkElves.xcr", animationIds: defaultHeroAnimationIds },
  { id: "AFHX", displayName: "Fey Hero", archive: "Fey.xcr", animationIds: defaultHeroAnimationIds },
  { id: "AAHX", displayName: "Dark Dwarf Hero", archive: "DarkDwarves.xcr", animationIds: defaultHeroAnimationIds },
  { id: "AVHX", displayName: "Daemon Hero", archive: "Daemons.xcr", animationIds: defaultHeroAnimationIds },
  { id: "ARHX", displayName: "Swarm Hero", archive: "Swarm.xcr", animationIds: defaultHeroAnimationIds },
  { id: "AGHY", displayName: "Plaguelord Hero", archive: "Plaguelords.xcr", animationIds: noMagicHeroAnimationIds },
  { id: "AAHA", displayName: "Flying Hero", archive: "Fliers.xcr", animationIds: noMagicHeroAnimationIds },
  { id: "AHH0", displayName: "Knight Hero 0", archive: "Knights.xcr", animationIds: defaultHeroAnimationIds },
  { id: "AHH1", displayName: "Knight Hero 1", archive: "Knights.xcr", animationIds: defaultHeroAnimationIds },
  { id: "ALHX", displayName: "Ssrathi Hero", archive: "Ssrathi.xcr", animationIds: defaultHeroAnimationIds },
  { id: "APHX", displayName: "Empire Hero", archive: "Empire.xcr", animationIds: defaultHeroAnimationIds },
];

export const avatarIdsByRace = {
  knight: ["AHHX", "AFHX", "AHH0", "AHH1", "AEHX", "APHX"],
  dwarf: ["ADHX", "AAHX"],
  undead: ["AUHX", "AKHX", "AHH1"],
  barbarian: ["AMHX", "AWHX"],
  minotaur: ["ABHX"],
  orc: ["AOHX"],
  highElf: ["AEHX", "AWHX", "AFHX", "AHH0"],
  woodElf: ["AWHX", "AFHX", "AHH0"],
  darkElf: ["AKHX", "AUHX"],
  fey: ["AFHX", "AEHX", "AWHX", "AKHX"],
  darkDwarf: ["AAHX", "ADHX"],
  daemon: ["AVHX"],
  empire: ["APHX", "AHHX", "AFHX", "AHH0", "AHH1", "AEHX"],
  ssrathi: ["ALHX"],
  swarm: ["ARHX"],
  plaguelord: ["AHH1", "AUHX", "AKHX", "AGHY"],
};

export const heroAvatarsById = Object.fromEntries(heroAvatars.map((avatar) => [avatar.id, avatar]));
export const heroAnimationTypesById = Object.fromEntries(
  heroAnimationTypes.map((animation) => [animation.id, animation]),
);

export function getDefaultAvatarId(raceId) {
  return avatarIdsByRace[raceId]?.[0] ?? heroAvatars[0].id;
}

export function getAvatarOptions(raceId) {
  const avatarIds = avatarIdsByRace[raceId] ?? [getDefaultAvatarId(raceId)];
  return avatarIds.map((avatarId) => heroAvatarsById[avatarId]).filter(Boolean);
}

export function getAllAvatarOptions() {
  return heroAvatars;
}

export function normalizeAvatarId(raceId, avatarId) {
  const normalizedAvatarId = String(avatarId ?? "").toUpperCase();
  return heroAvatarsById[normalizedAvatarId] ? normalizedAvatarId : getDefaultAvatarId(raceId);
}

export function getHeroAnimation(animationId) {
  return heroAnimationTypesById[animationId] ?? heroAnimationTypesById[DEFAULT_HERO_ANIMATION_ID];
}

export function getAvailableHeroAnimationTypes(avatarId) {
  const avatar = heroAvatarsById[String(avatarId ?? "").toUpperCase()] ?? heroAvatars[0];
  return (avatar.animationIds ?? defaultHeroAnimationIds).map((animationId) => heroAnimationTypesById[animationId]).filter(Boolean);
}

export function normalizeHeroAnimationId(avatarId, animationId) {
  const animations = getAvailableHeroAnimationTypes(avatarId);
  return animations.some((animation) => animation.id === animationId)
    ? animationId
    : animations.find((animation) => animation.id === DEFAULT_HERO_ANIMATION_ID)?.id ?? animations[0]?.id ?? DEFAULT_HERO_ANIMATION_ID;
}

export function getCommandRadiusSceneMetrics(command) {
  const radius = Math.min(Math.max(0, Math.trunc(Number(command) || 0)), MAX_EFFECTIVE_COMMAND_RADIUS);
  return {
    radius,
    radiusX: radius * CELL_WIDTH,
    radiusY: radius * CELL_HEIGHT,
    diameterX: radius * CELL_WIDTH * 2,
    diameterY: radius * CELL_HEIGHT * 2,
  };
}
