import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, isAbsolute, relative, resolve } from "node:path";
import {
  resolveGameInstallDir,
  resolveGraphicsArchivePath,
  resolveHeroDataArchivePath,
  resolvePortraitArchivePath,
} from "./wbc3-paths.mjs";
import { importHeroBuildsFromHeroData } from "./hero-data-reader.mjs";
import { readLocalPathSettings, writeLocalPathSettings } from "./local-settings.mjs";
import { readAvatarAnimationAsset, readEffectAnimationAsset, readSpriteAnimationAsset } from "./wbc3-animation-reader.mjs";
import { readTerrainTileAsset } from "./wbc3-terrain-reader.mjs";
import { readItemCatalog } from "./wbc3-items-reader.mjs";
import { readSpellTextCatalog } from "./wbc3-spells-reader.mjs";
import { readSkillTextCatalog } from "./wbc3-game-text-reader.mjs";

const root = resolve(import.meta.dirname, "..");
const dist = resolve(root, "dist");
const requestedPort = Number(process.env.PORT || 5173);
const startingPort =
  Number.isInteger(requestedPort) && requestedPort >= 1 && requestedPort <= 65535 ? requestedPort : 5173;
const staticRoots = [resolve(root, "src")];
const staticFiles = new Set([resolve(root, "index.html"), resolve(root, "manifest.webmanifest")]);
const avatarAssetCache = new Map();
const sceneObjectAssetCache = new Map();
const effectAssetCache = new Map();
const terrainAssetCache = new Map();
const itemCatalogCache = new Map();
const spellTextCache = new Map();
const skillTextCache = new Map();

const sceneObjectDefinitions = {
  goldMine: {
    id: "goldMine",
    displayName: "Gold Mine",
    spriteId: "BRG0",
    archive: "Resources.xcr",
    defaultAnimation: "ambient",
  },
};

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".bmp": "image/bmp",
  ".png": "image/png",
};

const server = createServer(async (request, response) => {
  try {
    const host = request.headers.host ?? "127.0.0.1";
    const url = new URL(request.url ?? "/", `http://${host}`);

    if (url.pathname.startsWith("/api/")) {
      try {
        await handleApiRequest(request, url, response);
      } catch (error) {
        const statusCode = error instanceof HttpError ? error.statusCode : 500;
        sendJson(response, statusCode, {
          ok: false,
          error: error instanceof Error ? error.message : "Request failed.",
        });
      }
      return;
    }

    const filePath = resolveStaticFilePath(url.pathname);
    if (!filePath) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    const body = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": mimeTypes[extname(filePath)] ?? "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(body);
  } catch (error) {
    response.writeHead(404);
    response.end("Not found");
  }
});

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function resolveStaticFilePath(pathname) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  if (decodedPath.includes("\0")) return null;

  const requested = decodedPath === "/" ? "index.html" : decodedPath.replace(/^[/\\]+/, "");
  const filePath = resolve(root, requested);
  if (staticFiles.has(filePath)) return filePath;
  if (staticRoots.some((staticRoot) => isPathInside(staticRoot, filePath))) return filePath;
  return null;
}

function isPathInside(parent, child) {
  const pathBetween = relative(parent, child);
  return pathBetween !== "" && !pathBetween.startsWith("..") && !isAbsolute(pathBetween);
}

async function handleApiRequest(request, url, response) {
  if (url.pathname === "/api/local/paths") {
    const body = await getLocalPathStatus();
    sendJson(response, 200, body);
    return;
  }

  if (url.pathname === "/api/local/settings") {
    if (request.method === "POST") {
      const body = await saveLocalSettings(await readJsonBody(request));
      sendJson(response, body.ok ? 200 : 400, body);
      return;
    }

    const body = await getLocalSettings();
    sendJson(response, 200, body);
    return;
  }

  if (url.pathname === "/api/local/heroes") {
    const body = await getLocalHeroes();
    sendJson(response, body.ok ? 200 : 404, body);
    return;
  }

  if (url.pathname === "/api/local/avatar") {
    const body = await getLocalAvatar(url);
    sendJson(response, body.ok ? 200 : 404, body);
    return;
  }

  if (url.pathname === "/api/local/scene-object") {
    const body = await getLocalSceneObject(url);
    sendJson(response, body.ok ? 200 : 404, body);
    return;
  }

  if (url.pathname === "/api/local/effect") {
    const body = await getLocalEffect(url);
    sendJson(response, body.ok ? 200 : 404, body);
    return;
  }

  if (url.pathname === "/api/local/terrain-tile") {
    const body = await getLocalTerrainTile(url);
    sendJson(response, body.ok ? 200 : 404, body);
    return;
  }

  if (url.pathname === "/api/local/items") {
    const body = await getLocalItems();
    sendJson(response, body.ok ? 200 : 404, body);
    return;
  }

  if (url.pathname === "/api/local/spells") {
    const body = await getLocalSpells();
    sendJson(response, body.ok ? 200 : 404, body);
    return;
  }

  if (url.pathname === "/api/local/skills") {
    const body = await getLocalSkills();
    sendJson(response, body.ok ? 200 : 404, body);
    return;
  }

  sendJson(response, 404, { error: "Unknown API endpoint" });
}

async function getLocalHeroes() {
  try {
    const settings = await readLocalPathSettings();
    const heroDataPath = await resolveHeroDataArchivePath(settings.heroDataPath);
    const { builds, metadata } = await importHeroBuildsFromHeroData(heroDataPath);
    return {
      ok: true,
      builds,
      metadata,
    };
  } catch (error) {
    return {
      ok: false,
      builds: [],
      metadata: {
        path: "",
        archive: "",
        resourceCount: 0,
        heroCount: 0,
      },
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function getLocalPathStatus() {
  const settings = await readLocalPathSettings();
  const entries = await Promise.all([
    inspectLocalPath("Game Install", () => resolveGameInstallDir(settings.gameInstallDir), settings.gameInstallDir),
    inspectLocalPath("HeroData", () => resolveHeroDataArchivePath(settings.heroDataPath), settings.heroDataPath),
    inspectLocalPath(
      "Portraits",
      () => resolvePortraitArchivePath(settings.portraitsPath, settings.gameInstallDir),
      settings.portraitsPath,
    ),
    inspectLocalPath(
      "Graphics",
      () => resolveGraphicsArchivePath(settings.graphicsPath, settings.gameInstallDir),
      settings.graphicsPath,
    ),
  ]);

  return {
    desktopMode: true,
    generatedAt: new Date().toISOString(),
    settings,
    paths: entries,
  };
}

async function getLocalAvatar(url) {
  try {
    const settings = await readLocalPathSettings();
    const avatarId = String(url.searchParams.get("avatarId") ?? "");
    const animationId = String(url.searchParams.get("animation") ?? "walk");
    const direction = Number(url.searchParams.get("direction") ?? 3);
    const cacheKey = JSON.stringify({
      gameInstallDir: settings.gameInstallDir,
      avatarId,
      animationId,
      direction,
    });

    if (avatarAssetCache.has(cacheKey)) {
      return avatarAssetCache.get(cacheKey);
    }

    const asset = await readAvatarAnimationAsset({
      avatarId,
      animationId,
      direction,
      gameInstallDir: settings.gameInstallDir,
    });
    avatarAssetCache.set(cacheKey, asset);
    return asset;
  } catch (error) {
    return {
      ok: false,
      available: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function getLocalSceneObject(url) {
  try {
    const settings = await readLocalPathSettings();
    const objectId = String(url.searchParams.get("objectId") ?? "goldMine");
    const object = sceneObjectDefinitions[objectId];
    if (!object) throw new Error(`Unknown scene object: ${objectId}`);

    const animationId = String(url.searchParams.get("animation") ?? object.defaultAnimation);
    const cacheKey = JSON.stringify({
      gameInstallDir: settings.gameInstallDir,
      objectId,
      animationId,
    });

    if (sceneObjectAssetCache.has(cacheKey)) {
      return sceneObjectAssetCache.get(cacheKey);
    }

    const asset = await readSpriteAnimationAsset({
      spriteId: object.spriteId,
      archiveName: object.archive,
      animationId,
      gameInstallDir: settings.gameInstallDir,
    });
    const body = {
      ...asset,
      object,
    };
    sceneObjectAssetCache.set(cacheKey, body);
    return body;
  } catch (error) {
    return {
      ok: false,
      available: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function getLocalEffect(url) {
  try {
    const settings = await readLocalPathSettings();
    const effectId = String(url.searchParams.get("effectId") ?? "");
    const cacheKey = JSON.stringify({
      gameInstallDir: settings.gameInstallDir,
      effectId: effectId.toUpperCase(),
    });

    if (effectAssetCache.has(cacheKey)) {
      return effectAssetCache.get(cacheKey);
    }

    const asset = await readEffectAnimationAsset({
      effectId,
      gameInstallDir: settings.gameInstallDir,
    });
    effectAssetCache.set(cacheKey, asset);
    return asset;
  } catch (error) {
    return {
      ok: false,
      available: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function getLocalTerrainTile(url) {
  try {
    const settings = await readLocalPathSettings();
    const terrainName = String(url.searchParams.get("terrain") ?? "Grass");
    const tileId = String(url.searchParams.get("tileId") ?? "TGB0");
    const cacheKey = JSON.stringify({
      gameInstallDir: settings.gameInstallDir,
      terrainName,
      tileId: tileId.toUpperCase(),
    });

    if (terrainAssetCache.has(cacheKey)) {
      return terrainAssetCache.get(cacheKey);
    }

    const asset = await readTerrainTileAsset({
      terrainName,
      tileId,
      gameInstallDir: settings.gameInstallDir,
    });
    terrainAssetCache.set(cacheKey, asset);
    return asset;
  } catch (error) {
    return {
      ok: false,
      available: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function getLocalItems() {
  try {
    const settings = await readLocalPathSettings();
    const cacheKey = JSON.stringify({
      gameInstallDir: settings.gameInstallDir,
      graphicsPath: settings.graphicsPath,
    });

    if (itemCatalogCache.has(cacheKey)) {
      return itemCatalogCache.get(cacheKey);
    }

    const body = await readItemCatalog({
      gameInstallDir: settings.gameInstallDir,
      graphicsPath: settings.graphicsPath,
    });
    itemCatalogCache.set(cacheKey, body);
    return body;
  } catch (error) {
    return {
      ok: false,
      available: false,
      items: [],
      sets: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function getLocalSpells() {
  try {
    const settings = await readLocalPathSettings();
    const cacheKey = JSON.stringify({
      gameInstallDir: settings.gameInstallDir,
    });

    if (spellTextCache.has(cacheKey)) {
      return spellTextCache.get(cacheKey);
    }

    const body = await readSpellTextCatalog(settings.gameInstallDir);
    spellTextCache.set(cacheKey, body);
    return body;
  } catch (error) {
    return {
      ok: false,
      source: "",
      spells: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function getLocalSkills() {
  try {
    const settings = await readLocalPathSettings();
    const cacheKey = JSON.stringify({
      gameInstallDir: settings.gameInstallDir,
    });

    if (skillTextCache.has(cacheKey)) {
      return skillTextCache.get(cacheKey);
    }

    const body = await readSkillTextCatalog(settings.gameInstallDir);
    skillTextCache.set(cacheKey, body);
    return body;
  } catch (error) {
    return {
      ok: false,
      source: "",
      skills: [],
      magicTemplates: {},
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function getLocalSettings() {
  return {
    ok: true,
    settings: await readLocalPathSettings(),
  };
}

async function saveLocalSettings(value) {
  try {
    const settings = await writeLocalPathSettings(value);
    const pathStatus = await getLocalPathStatus();
    const heroImport = await getLocalHeroes();
    return {
      ok: true,
      settings,
      pathStatus,
      heroImport,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function inspectLocalPath(label, resolver, override = "") {
  try {
    return {
      label,
      ok: true,
      path: await resolver(),
      override: Boolean(override),
    };
  } catch (error) {
    return {
      label,
      ok: false,
      override: Boolean(override),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function readJsonBody(request) {
  if (request.method !== "POST") return {};

  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 64 * 1024) throw new HttpError(413, "Settings payload is too large.");
    chunks.push(chunk);
  }

  const text = Buffer.concat(chunks).toString("utf8").trim();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new HttpError(400, "Invalid JSON request body.");
  }
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(body, null, 2));
}

function listen(port, attemptsLeft = 50) {
  server.once("error", (error) => {
    if (error.code === "EADDRINUSE" && attemptsLeft > 0) {
      listen(port + 1, attemptsLeft - 1);
      return;
    }

    throw error;
  });

  server.listen(port, "127.0.0.1", () => {
    const url = `http://127.0.0.1:${port}`;
    mkdir(dist, { recursive: true })
      .then(() =>
        Promise.all([
          writeFile(resolve(dist, "server-url.txt"), url),
          writeFile(resolve(dist, "server.pid"), String(process.pid)),
        ]),
      )
      .catch(() => {});
    console.log(`WBC3 planner running at ${url}`);
  });
}

listen(startingPort);
