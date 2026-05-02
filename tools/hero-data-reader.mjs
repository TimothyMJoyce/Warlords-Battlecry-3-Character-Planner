import { readFile } from "node:fs/promises";
import { calculateStartingStats, mergeCareerSkills } from "../src/rules/plannerRules.js";
import { heroClasses, races, skills } from "../src/data/gameData.js";
import { portableArchiveLabel } from "./wbc3-paths.mjs";

const resourceHeaderSize = 532;
const archiveHeaderSize = 28;
const heroSkillOffset = 252;
const heroSkillSize = 8;
const maxHeroSkills = 10;

export async function importHeroBuildsFromHeroData(heroDataPath) {
  const archive = await readFile(heroDataPath);
  const resources = readXcrResources(archive);
  const dataResource = resources.find((resource) => resource.name.toLowerCase() === "data.dat");

  if (!dataResource) {
    throw new Error(`No data.dat resource found in ${heroDataPath}`);
  }

  const index = parseHeroIndex(readResource(archive, dataResource));
  const builds = [];

  for (let fileIndex = 0; fileIndex < index.heroFileNames.length; fileIndex += 1) {
    const heroFileName = index.heroFileNames[fileIndex];
    const resource = resources.find((entry) => entry.name.toLowerCase() === heroFileName.toLowerCase());
    if (!resource) continue;

    builds.push(parseHero(readResource(archive, resource), resource.name, fileIndex));
  }

  return {
    builds,
    metadata: {
      path: portableArchiveLabel(heroDataPath, "HeroData.xcr"),
      archive: portableArchiveLabel(heroDataPath, "HeroData.xcr"),
      resourceCount: resources.length,
      heroCount: builds.length,
    },
  };
}

export function serializeImportedHeroBuilds(builds, metadata) {
  return `export const importedHeroBuilds = ${JSON.stringify(builds, null, 2)};\n\nexport const importedHeroBuildMetadata = ${JSON.stringify(metadata, null, 2)};\n`;
}

function readXcrResources(buffer) {
  const identifier = readCString(buffer, 0, 20);
  if (identifier !== "xcr File 1.00") {
    throw new Error(`Unsupported XCR header: ${identifier}`);
  }

  const resourceCount = buffer.readInt32LE(20);
  const resourceTableSize = archiveHeaderSize + resourceCount * resourceHeaderSize;
  if (resourceCount < 0 || resourceTableSize > buffer.length) {
    throw new Error("The archive resource table is incomplete.");
  }

  const resources = [];

  for (let index = 0; index < resourceCount; index += 1) {
    const offset = archiveHeaderSize + index * resourceHeaderSize;
    resources.push({
      name: readCString(buffer, offset, 256),
      fullPath: readCString(buffer, offset + 256, 256),
      physicalOffset: buffer.readUInt32LE(offset + 512),
      size: buffer.readUInt32LE(offset + 516),
      type: buffer.readInt32LE(offset + 520),
      crcBlock: buffer.readUInt32LE(offset + 524),
      crcCheck: Boolean(buffer.readUInt8(offset + 528)),
      encrypted: Boolean(buffer.readUInt8(offset + 529)),
    });
  }

  return resources;
}

function readResource(buffer, resource) {
  const start = resource.physicalOffset;
  const end = resource.physicalOffset + resource.size;
  if (start > buffer.length || end > buffer.length || end < start) {
    throw new Error(`Resource ${resource.name} points outside the archive.`);
  }

  const bytes = Buffer.from(buffer.subarray(resource.physicalOffset, resource.physicalOffset + resource.size));
  if (!resource.encrypted) return bytes;

  const decryptionArray = createDecryptionArray();
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = decryptionArray[bytes[index]];
  }
  return bytes;
}

function parseHeroIndex(bytes) {
  if (bytes.length < 4) throw new Error("Hero index data is incomplete.");
  const heroCount = bytes.readInt32LE(0);
  const maxHeroCount = Math.floor((bytes.length - 4) / 256);
  if (heroCount < 0 || heroCount > maxHeroCount) {
    throw new Error("Hero index count does not match the available data.");
  }

  const heroFileNames = [];

  for (let index = 0; index < heroCount; index += 1) {
    heroFileNames.push(readCString(bytes, 4 + index * 256, 256));
  }

  return { heroCount, heroFileNames };
}

function parseHero(bytes, resourceName, fileIndex = 0) {
  const resourceLabel = String(resourceName ?? "");
  if (bytes.length < heroSkillOffset + maxHeroSkills * heroSkillSize) {
    throw new Error(`Hero data is incomplete in ${resourceLabel || `entry ${fileIndex + 1}`}.`);
  }

  const rawName = readCString(bytes, 28, 20).trim();
  const fallbackName = resourceLabel.replace(/\.[^.]+$/g, "").trim();
  const heroName = rawName || fallbackName || `Imported Hero ${fileIndex + 1}`;
  const raceIndex = bytes.readUInt16LE(48);
  const classIndex = bytes.readUInt16LE(50);
  const raceId = races[raceIndex]?.id;
  const classId = heroClasses[classIndex]?.id;

  if (!raceId || !classId) {
    throw new Error(`Unsupported race/class in ${resourceName}: race ${raceIndex}, class ${classIndex}`);
  }

  const startingStats = calculateStartingStats(raceId, classId);
  const actualStats = {
    strength: bytes.readInt32LE(100),
    dexterity: bytes.readInt32LE(104),
    intelligence: bytes.readInt32LE(108),
    charisma: bytes.readInt32LE(112),
  };
  const careerSkills = mergeCareerSkills(raceId, classId);
  const careerSkillsById = Object.fromEntries(careerSkills.map((unlock) => [unlock.skillId, unlock]));
  const skillAllocation = {};

  for (let index = 0; index < maxHeroSkills; index += 1) {
    const offset = heroSkillOffset + index * heroSkillSize;
    const skillEnum = bytes.readInt32LE(offset);
    const skillLevel = bytes.readUInt16LE(offset + 6);
    const skillId = skills[skillEnum]?.id;
    if (!skillId || skillId === "null") continue;

    const startingLevel = careerSkillsById[skillId]?.startingLevel ?? 0;
    const allocated = Math.max(0, skillLevel - startingLevel);
    if (allocated > 0) skillAllocation[skillId] = allocated;
  }

  return {
    id: `herodata-${slug(`${heroName}-${resourceLabel || fileIndex}`) || `hero-${fileIndex + 1}`}`,
    name: heroName,
    raceId,
    classId,
    level: bytes.readUInt16LE(52),
    portraitId: bytes.readUInt16LE(88),
    statAllocation: {
      strength: Math.max(0, actualStats.strength - startingStats.strength),
      dexterity: Math.max(0, actualStats.dexterity - startingStats.dexterity),
      intelligence: Math.max(0, actualStats.intelligence - startingStats.intelligence),
      charisma: Math.max(0, actualStats.charisma - startingStats.charisma),
    },
    skillAllocation,
    origin: `HeroData.xcr/${resourceLabel}`,
    imported: true,
    originalHero: {
      fileName: readCString(bytes, 8, 20),
      raceIndex,
      classIndex,
      xp: bytes.readUInt32LE(56),
      nextLevelXp: bytes.readUInt32LE(60),
      heroMode: bytes.readUInt32LE(84),
      heroFace: bytes.readUInt16LE(88),
      stats: actualStats,
    },
  };
}

function createDecryptionArray() {
  const encryptionArray = [];
  const decryptionArray = [];
  let lastNumber = 728;

  for (let index = 0; index < 256; index += 1) {
    let found = false;

    while (!found) {
      const result = (25173 * lastNumber + 13849) % 65536;
      lastNumber = result;
      let randomValue = Math.floor((result * 256) / 65535);
      randomValue = Math.max(0, Math.min(255, randomValue));

      if (!encryptionArray.slice(0, index).includes(randomValue)) {
        found = true;
        encryptionArray[index] = randomValue;
        decryptionArray[randomValue] = index;
      }
    }
  }

  return decryptionArray;
}

function readCString(buffer, offset, length) {
  return buffer.toString("latin1", offset, offset + length).split("\0")[0];
}

function slug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
