export const portraitMetadata = {
  archive: "Assets/Heroes/Portraits.xcr",
  dataNote: "verified portrait table",
};

export const portraitsByRace = {
  knight: [0, 21, 29, 30, 33, 36, 37, 38, 40, 43, 45, 48, 49, 51, 57, 58, 72, 74, 85, 87, 17, 27, 46],
  dwarf: [1, 20, 25, 32, 33, 37, 58, 64, 65, 66, 67, 77],
  undead: [2, 34, 35, 44, 45, 52, 59, 76, 80, 89, 31],
  barbarian: [3, 21, 23, 37, 38, 42, 48, 68, 71, 73, 46],
  minotaur: [4, 39, 56],
  orc: [5, 16, 19, 41, 42, 53, 78, 79],
  highElf: [6, 17, 27, 28, 46, 47, 50, 60, 43, 87],
  woodElf: [7, 18, 22, 28, 46, 47, 50, 60, 74, 21, 43],
  darkElf: [8, 24, 31, 54, 55, 75, 88, 89],
  fey: [9, 87, 61, 70, 22, 28, 31, 50, 54, 55, 60, 74, 75],
  darkDwarf: [10, 20, 33, 37, 40, 45, 64, 65, 66, 67, 77],
  daemon: [11, 26, 45, 62, 63, 69, 80],
  empire: [27, 46, 74, 12, 21, 29, 30, 33, 36, 37, 38, 40, 43, 48, 49, 51, 57, 58, 72, 85, 86],
  ssrathi: [13, 82, 84],
  swarm: [14, 80, 81, 89, 63],
  plaguelord: [15, 76, 42, 44, 86, 88, 89, 54, 55],
};

export function getDefaultPortraitId(raceId) {
  return portraitsByRace[raceId]?.[0] ?? 0;
}

export function getPortraitOptions(raceId) {
  return portraitsByRace[raceId] ?? [getDefaultPortraitId(raceId)];
}

export function getPortraitFileName(portraitId) {
  return `Portrait${String(portraitId).padStart(2, "0")}.bmp`;
}

export function getUpscaledPortraitFileName(portraitId) {
  return `Portrait${String(portraitId).padStart(2, "0")}.png`;
}

export function getPortraitSrc(portraitId) {
  return `./src/assets/portraits/${getPortraitFileName(portraitId)}`;
}

export function getUpscaledPortraitSrc(portraitId) {
  return `./src/assets/portraits-upscaled/${getUpscaledPortraitFileName(portraitId)}`;
}
