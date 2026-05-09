import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import {
  getDefaultHeroVoiceId,
  getHeroVoiceSetLabel,
  heroVoiceLineTypes,
  heroVoiceProfilesByRace,
  heroVoiceSetsById,
} from "../src/data/heroVoices.js";
import { findXcrResource, readXcrResource, readXcrResources } from "./wbc3-animation-reader.mjs";
import { resolveGameInstallDir } from "./wbc3-paths.mjs";

const archiveCatalogCache = new Map();
const missingArchiveCatalogCache = new Map();
const resolvedGameInstallDirCache = new Map();
const voiceArchiveNameCache = new Map();
const heroVoiceLineTypesById = Object.fromEntries(heroVoiceLineTypes.map((line) => [line.id, line]));
const heroVoiceLineTypesByLowerSuffix = heroVoiceLineTypes.map((line, index) => ({
  ...line,
  index,
  suffix: `${line.id}.wav`.toLowerCase(),
}));
const sourceHeroVoiceArchiveName = "HeroesVoicesEn.xcr";
const sourceCharacterVoiceFallbackArchiveName = "CharactersVoicesEn.xcr";

export async function readHeroVoiceCatalog({ raceId, gameInstallDir = "" } = {}) {
  const normalizedRaceId = String(raceId ?? "");
  const profile = heroVoiceProfilesByRace[normalizedRaceId];
  if (!profile) {
    return {
      ok: false,
      available: false,
      raceId: normalizedRaceId,
      defaultSourceVoiceId: "",
      defaultVoiceId: "",
      sourceVoiceIds: [],
      voiceSets: [],
      missingVoiceIds: [],
      error: `Unknown hero race: ${normalizedRaceId}`,
    };
  }

  const voiceSets = [];
  const missingVoiceIds = [];
  const sourceVoiceIds = profile.voiceSetIds;
  const sourceVoiceIdSet = new Set(sourceVoiceIds);

  for (const voiceId of uniqueVoiceIds(sourceVoiceIds)) {
    const voiceSet = heroVoiceSetsById[voiceId];
    if (!voiceSet) continue;

    let archiveName = voiceSet.archive;
    let clips = [];
    let unavailableReason = "";
    let searchedArchives = [];
    const result = await findVoiceSetClips(voiceId, voiceSet.archive, gameInstallDir);
    archiveName = result.archiveName;
    clips = result.clips;
    searchedArchives = result.searchedArchives;

    if (!clips.length) {
      unavailableReason = `${voiceId} WAV clips were not found in the selected game's voice archives.`;
    }
    if (unavailableReason && sourceVoiceIdSet.has(voiceId)) {
      missingVoiceIds.push(voiceId);
    }

    if (!clips.length && !sourceVoiceIdSet.has(voiceId)) {
      continue;
    }

    voiceSets.push({
      id: voiceId,
      label: getHeroVoiceSetLabel(voiceId),
      sourceIndex: voiceSet.sourceIndex,
      archive: archiveName,
      sourceArchive: voiceSet.archive,
      sourceAssigned: sourceVoiceIdSet.has(voiceId),
      available: clips.length > 0,
      unavailableReason,
      searchedArchives,
      clips,
    });
  }

  const defaultSourceVoiceId = getDefaultHeroVoiceId(normalizedRaceId);
  const defaultVoiceId =
    voiceSets.find((voiceSet) => voiceSet.id === defaultSourceVoiceId && voiceSet.available)?.id ??
    voiceSets.find((voiceSet) => voiceSet.available)?.id ??
    voiceSets[0]?.id ??
    "";

  return {
    ok: true,
    available: voiceSets.some((voiceSet) => voiceSet.available),
    raceId: normalizedRaceId,
    defaultSourceVoiceId,
    defaultVoiceId,
    sourceVoiceIds,
    voiceSets,
    missingVoiceIds,
  };
}

export async function readHeroVoiceClip({ raceId, voiceId, lineId, gameInstallDir = "" } = {}) {
  const normalizedVoiceId = String(voiceId ?? "").toUpperCase();
  const normalizedLineId = String(lineId ?? "");
  const line = heroVoiceLineTypesById[normalizedLineId];
  if (!line) throw new Error(`Unknown hero voice line: ${normalizedLineId}`);

  const catalog = await readHeroVoiceCatalog({ raceId, gameInstallDir });
  const voiceSet = catalog.voiceSets.find((entry) => entry.id === normalizedVoiceId);
  if (!voiceSet) throw new Error(`Voice set ${normalizedVoiceId} is not available for ${raceId}.`);

  const clip = voiceSet.clips.find((entry) => entry.id === normalizedLineId);
  if (!clip) throw new Error(`${line.label} is not available for ${normalizedVoiceId}.`);

  const archive = await readVoiceArchiveCatalog(voiceSet.archive, gameInstallDir);
  const resource = findXcrResource(archive.resources, clip.fileName);
  if (!resource) throw new Error(`Missing ${clip.fileName}.`);

  return {
    ok: true,
    contentType: "audio/wav",
    fileName: clip.fileName,
    body: readXcrResource(archive.buffer, resource),
  };
}

async function readVoiceArchiveCatalog(archiveName, gameInstallDir) {
  const archivePath = await resolveVoiceArchivePath(archiveName, gameInstallDir);
  const cacheKey = archivePath.toLowerCase();
  if (archiveCatalogCache.has(cacheKey)) return archiveCatalogCache.get(cacheKey);
  if (missingArchiveCatalogCache.has(cacheKey)) throw missingArchiveCatalogCache.get(cacheKey);

  let buffer;
  try {
    buffer = await readFile(archivePath);
  } catch (error) {
    missingArchiveCatalogCache.set(cacheKey, error);
    throw error;
  }

  const resources = readXcrResources(buffer);
  const catalog = {
    archiveName,
    archivePath,
    buffer,
    resources,
    voiceClipsById: buildVoiceClipIndex(resources),
  };
  archiveCatalogCache.set(cacheKey, catalog);
  return catalog;
}

async function resolveVoiceArchivePath(archiveName, gameInstallDir) {
  if (!/^[a-z0-9 _-]+\.xcr$/i.test(String(archiveName ?? ""))) {
    throw new Error(`Invalid voice archive name: ${archiveName}`);
  }

  const gameDir = await resolveCachedGameInstallDir(gameInstallDir);
  return join(gameDir, "Assets", "Sides", archiveName);
}

async function findVoiceSetClips(voiceId, preferredArchiveName, gameInstallDir) {
  const searchedArchives = [];
  for (const archiveName of await getVoiceArchiveSearchOrder(preferredArchiveName, gameInstallDir)) {
    searchedArchives.push(archiveName);

    let archive;
    try {
      archive = await readVoiceArchiveCatalog(archiveName, gameInstallDir);
    } catch {
      continue;
    }

    const clips = findVoiceSetClipsInArchive(voiceId, archive);
    if (clips.length) {
      return {
        archiveName: archive.archiveName,
        clips,
        searchedArchives,
      };
    }
  }

  return {
    archiveName: preferredArchiveName,
    clips: [],
    searchedArchives,
  };
}

function findVoiceSetClipsInArchive(voiceId, archive) {
  return archive.voiceClipsById.get(String(voiceId ?? "").toUpperCase()) ?? [];
}

function buildVoiceClipIndex(resources) {
  const clipsById = new Map();

  for (const resource of resources) {
    const lowerName = resource.name.toLowerCase();
    if (!lowerName.endsWith(".wav")) continue;

    const line = heroVoiceLineTypesByLowerSuffix.find((entry) => lowerName.endsWith(entry.suffix));
    if (!line) continue;

    const voiceId = resource.name.slice(0, resource.name.length - line.suffix.length).toUpperCase();
    if (!voiceId) continue;
    if (!clipsById.has(voiceId)) clipsById.set(voiceId, []);
    clipsById.get(voiceId).push({
      id: line.id,
      label: line.label,
      fileName: resource.name,
      size: resource.size,
      lineIndex: line.index,
    });
  }

  for (const [voiceId, clips] of clipsById.entries()) {
    clipsById.set(
      voiceId,
      clips
        .sort((left, right) => left.lineIndex - right.lineIndex)
        .map(({ lineIndex, ...clip }) => clip),
    );
  }

  return clipsById;
}

async function getVoiceArchiveSearchOrder(preferredArchiveName, gameInstallDir) {
  const installedArchiveNames = await listInstalledVoiceArchiveNames(gameInstallDir);
  return uniqueArchiveNames([
    preferredArchiveName,
    sourceHeroVoiceArchiveName,
    sourceCharacterVoiceFallbackArchiveName,
    ...installedArchiveNames,
  ]);
}

async function listInstalledVoiceArchiveNames(gameInstallDir) {
  let gameDir;
  try {
    gameDir = await resolveCachedGameInstallDir(gameInstallDir);
  } catch {
    return [];
  }

  const cacheKey = gameDir.toLowerCase();
  if (voiceArchiveNameCache.has(cacheKey)) return voiceArchiveNameCache.get(cacheKey);

  let archiveNames = [];
  try {
    const sideArchiveDir = join(gameDir, "Assets", "Sides");
    const entries = await readdir(sideArchiveDir, { withFileTypes: true });
    archiveNames = entries
      .filter((entry) => entry.isFile() && /Voices[A-Za-z]*\.xcr$/i.test(entry.name))
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right));
  } catch {
    archiveNames = [];
  }

  voiceArchiveNameCache.set(cacheKey, archiveNames);
  return archiveNames;
}

async function resolveCachedGameInstallDir(gameInstallDir) {
  const cacheKey = String(gameInstallDir ?? "").trim().toLowerCase();
  if (resolvedGameInstallDirCache.has(cacheKey)) return resolvedGameInstallDirCache.get(cacheKey);

  const promise = resolveGameInstallDir(gameInstallDir);
  resolvedGameInstallDirCache.set(cacheKey, promise);
  try {
    return await promise;
  } catch (error) {
    resolvedGameInstallDirCache.delete(cacheKey);
    throw error;
  }
}

function uniqueArchiveNames(archiveNames) {
  const seen = new Set();
  const unique = [];
  for (const archiveName of archiveNames) {
    const normalized = String(archiveName ?? "").trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(normalized);
  }
  return unique;
}

function uniqueVoiceIds(voiceIds) {
  const seen = new Set();
  const unique = [];
  for (const voiceId of voiceIds) {
    const normalized = String(voiceId ?? "").toUpperCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    unique.push(normalized);
  }
  return unique;
}
