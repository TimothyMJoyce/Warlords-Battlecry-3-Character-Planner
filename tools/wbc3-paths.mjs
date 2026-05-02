import { readFile, stat } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { basename, dirname, join, resolve } from "node:path";
import { homedir, platform } from "node:os";

const execFileAsync = promisify(execFile);

const GAME_FOLDER_NAME = "Warlords Battlecry III";
const HERO_DATA_RELATIVE_PATH = join(GAME_FOLDER_NAME, "HeroData.xcr");
const PORTRAIT_ARCHIVE_RELATIVE_PATH = join("Assets", "Heroes", "Portraits.xcr");
const GRAPHICS_ARCHIVE_RELATIVE_PATH = join("Assets", "Graphics.xcr");

export async function resolvePortraitArchivePath(explicitPath) {
  return resolveGameArchivePath(explicitPath, PORTRAIT_ARCHIVE_RELATIVE_PATH, "Portraits.xcr");
}

export async function resolveGraphicsArchivePath(explicitPath) {
  return resolveGameArchivePath(explicitPath, GRAPHICS_ARCHIVE_RELATIVE_PATH, "Graphics.xcr");
}

export async function resolveHeroDataArchivePath(explicitPath) {
  const explicit = await resolveExplicitPath(explicitPath, HERO_DATA_RELATIVE_PATH);
  if (explicit) return explicit;

  const fromEnv = await resolveExplicitPath(process.env.WBC3_HERO_DATA_PATH, HERO_DATA_RELATIVE_PATH);
  if (fromEnv) return fromEnv;

  const documentsDir = await getWindowsDocumentsDir();
  const candidates = [
    documentsDir ? join(documentsDir, HERO_DATA_RELATIVE_PATH) : null,
    join(homedir(), "Documents", HERO_DATA_RELATIVE_PATH),
  ];

  const found = await firstExistingFile(candidates);
  if (found) return found;

  throw new Error(
    "Could not locate HeroData.xcr. Pass the archive path as the first argument or set WBC3_HERO_DATA_PATH.",
  );
}

export function portableArchiveLabel(filePath, fallbackName) {
  return basename(filePath || fallbackName || "unknown");
}

async function resolveGameArchivePath(explicitPath, relativeArchivePath, archiveName) {
  const explicit = await resolveExplicitPath(explicitPath, relativeArchivePath);
  if (explicit) return explicit;

  const gameDir = await resolveGameInstallDir();
  const archivePath = join(gameDir, relativeArchivePath);
  if (await isFile(archivePath)) return archivePath;

  throw new Error(`Could not locate ${archiveName} under ${gameDir}. Pass the archive path as the first argument.`);
}

export async function resolveGameInstallDir() {
  const explicit = await firstExistingDirectory([process.env.WBC3_INSTALL_DIR]);
  if (explicit) return explicit;

  const uninstallDir = await findGameInstallFromUninstallRegistry();
  if (uninstallDir) return uninstallDir;

  const steamDir = await findGameInstallFromSteamLibraries();
  if (steamDir) return steamDir;

  const fallback = await firstExistingDirectory(commonSteamGameCandidates());
  if (fallback) return fallback;

  throw new Error(
    "Could not locate the Warlords Battlecry III install directory. Set WBC3_INSTALL_DIR or pass the archive path explicitly.",
  );
}

async function resolveExplicitPath(value, relativePathWhenDirectory) {
  if (!value) return null;

  const resolved = resolve(expandWindowsEnvironment(value));
  if (await isDirectory(resolved)) {
    const archivePath = join(resolved, relativePathWhenDirectory);
    if (await isFile(archivePath)) return archivePath;
  }

  if (await isFile(resolved)) return resolved;
  return resolved;
}

async function findGameInstallFromUninstallRegistry() {
  if (!isWindows()) return null;

  const uninstallRoots = [
    "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
    "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
    "HKLM\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
  ];

  for (const root of uninstallRoots) {
    const output = await queryRegistryTree(root);
    if (!output) continue;

    const candidates = parseUninstallCandidates(output);
    const found = await firstExistingDirectory(candidates);
    if (found) return found;
  }

  return null;
}

function parseUninstallCandidates(output) {
  const candidates = [];
  const blocks = output.split(/\r?\n(?=HKEY_)/i);

  for (const block of blocks) {
    const displayName = parseRegistryValueFromBlock(block, "DisplayName");
    if (!displayName || !/Warlords\s+Battlecry\s+(III|3)/i.test(displayName)) continue;

    const installLocation = parseRegistryValueFromBlock(block, "InstallLocation");
    const displayIcon = parseRegistryValueFromBlock(block, "DisplayIcon");
    const uninstallString = parseRegistryValueFromBlock(block, "UninstallString");

    if (installLocation) candidates.push(stripExecutableFromPath(installLocation));
    if (displayIcon) candidates.push(stripExecutableFromPath(displayIcon));
    if (uninstallString) candidates.push(stripExecutableFromPath(uninstallString));
  }

  return candidates;
}

async function findGameInstallFromSteamLibraries() {
  const libraryRoots = await getSteamLibraryRoots();
  const candidates = [];

  for (const libraryRoot of libraryRoots) {
    candidates.push(join(libraryRoot, "steamapps", "common", GAME_FOLDER_NAME));
    candidates.push(join(libraryRoot, "common", GAME_FOLDER_NAME));
  }

  return firstExistingDirectory(candidates);
}

async function getSteamLibraryRoots() {
  const roots = new Set();
  const registrySteamPaths = await Promise.all([
    queryRegistryValue("HKCU\\Software\\Valve\\Steam", "SteamPath"),
    queryRegistryValue("HKCU\\Software\\Valve\\Steam", "InstallPath"),
    queryRegistryValue("HKLM\\Software\\Valve\\Steam", "InstallPath"),
    queryRegistryValue("HKLM\\Software\\WOW6432Node\\Valve\\Steam", "InstallPath"),
  ]);

  for (const path of registrySteamPaths) {
    if (path) roots.add(resolve(path));
  }

  const fallbackSteamPaths = [
    process.env.STEAM_DIR,
    process.env.ProgramFiles ? join(process.env.ProgramFiles, "Steam") : null,
    process.env["ProgramFiles(x86)"] ? join(process.env["ProgramFiles(x86)"], "Steam") : null,
  ];
  for (const path of fallbackSteamPaths) {
    if (path) roots.add(resolve(path));
  }

  for (const steamRoot of [...roots]) {
    const libraryFile = join(steamRoot, "steamapps", "libraryfolders.vdf");
    for (const libraryPath of await parseSteamLibraryFolders(libraryFile)) {
      roots.add(resolve(libraryPath));
    }
  }

  return [...roots];
}

async function parseSteamLibraryFolders(filePath) {
  let text = "";
  try {
    text = await readFile(filePath, "utf8");
  } catch {
    return [];
  }

  const paths = new Set();
  for (const match of text.matchAll(/"path"\s+"([^"]+)"/gi)) {
    paths.add(unescapeSteamPath(match[1]));
  }

  for (const match of text.matchAll(/"\d+"\s+"([^"]+)"/gi)) {
    const value = unescapeSteamPath(match[1]);
    if (/[\\/]/.test(value)) paths.add(value);
  }

  return [...paths];
}

async function getWindowsDocumentsDir() {
  const userShellFolder = await queryRegistryValue(
    "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\User Shell Folders",
    "Personal",
  );
  if (userShellFolder) return userShellFolder;

  const shellFolder = await queryRegistryValue(
    "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Shell Folders",
    "Personal",
  );
  return shellFolder || null;
}

async function queryRegistryValue(key, valueName) {
  if (!isWindows()) return null;

  try {
    const { stdout } = await execFileAsync("reg", ["query", key, "/v", valueName], {
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    });
    return parseRegistryValueFromBlock(stdout, valueName);
  } catch {
    return null;
  }
}

async function queryRegistryTree(key) {
  if (!isWindows()) return null;

  try {
    const { stdout } = await execFileAsync("reg", ["query", key, "/s"], {
      windowsHide: true,
      maxBuffer: 12 * 1024 * 1024,
    });
    return stdout;
  } catch {
    return null;
  }
}

function parseRegistryValueFromBlock(block, valueName) {
  const escaped = escapeRegExp(valueName);
  const pattern = new RegExp(`^\\s*${escaped}\\s+REG_\\w+\\s+(.+?)\\s*$`, "im");
  const match = block.match(pattern);
  return match ? expandWindowsEnvironment(match[1].trim()) : null;
}

function commonSteamGameCandidates() {
  const candidates = [];
  const steamRoots = [
    process.env.STEAM_DIR,
    process.env.ProgramFiles ? join(process.env.ProgramFiles, "Steam") : null,
    process.env["ProgramFiles(x86)"] ? join(process.env["ProgramFiles(x86)"], "Steam") : null,
  ];

  for (const steamRoot of steamRoots) {
    if (steamRoot) candidates.push(join(steamRoot, "steamapps", "common", GAME_FOLDER_NAME));
  }

  return candidates;
}

async function firstExistingFile(candidates) {
  for (const candidate of candidates.filter(Boolean)) {
    if (await isFile(candidate)) return resolve(candidate);
  }
  return null;
}

async function firstExistingDirectory(candidates) {
  for (const candidate of candidates.filter(Boolean)) {
    if (await isDirectory(candidate)) return resolve(candidate);
  }
  return null;
}

async function isFile(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

async function isDirectory(path) {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

function stripExecutableFromPath(value) {
  const cleaned = value.trim().replace(/^"([^"]+)".*$/, "$1");
  if (/\.(exe|dll)$/i.test(cleaned)) return dirname(cleaned);
  return cleaned;
}

function expandWindowsEnvironment(value) {
  return String(value).replace(/%([^%]+)%/g, (match, name) => {
    return process.env[name] ?? process.env[name.toUpperCase()] ?? process.env[name.toLowerCase()] ?? match;
  });
}

function unescapeSteamPath(value) {
  return value.replace(/\\\\/g, "\\").replace(/\\"/g, "\"");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isWindows() {
  return platform() === "win32";
}
