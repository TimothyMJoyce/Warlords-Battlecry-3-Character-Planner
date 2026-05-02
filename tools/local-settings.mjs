import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { homedir, platform } from "node:os";

export const localPathSettingKeys = ["gameInstallDir", "heroDataPath", "portraitsPath", "graphicsPath"];

export async function readLocalPathSettings() {
  try {
    const text = await readFile(getLocalSettingsPath(), "utf8");
    return normalizeLocalPathSettings(JSON.parse(text));
  } catch {
    return normalizeLocalPathSettings();
  }
}

export async function writeLocalPathSettings(value) {
  const settings = normalizeLocalPathSettings(value);
  const settingsPath = getLocalSettingsPath();
  await mkdir(dirname(settingsPath), { recursive: true });
  await writeFile(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);
  return settings;
}

export function normalizeLocalPathSettings(value = {}) {
  return Object.fromEntries(
    localPathSettingKeys.map((key) => [key, typeof value?.[key] === "string" ? value[key].trim() : ""]),
  );
}

function getLocalSettingsPath() {
  if (process.env.WBC3_PLANNER_SETTINGS_PATH) {
    return resolve(process.env.WBC3_PLANNER_SETTINGS_PATH);
  }

  if (platform() === "win32") {
    const localAppData = process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local");
    return join(localAppData, "WBC3 Planner", "settings.json");
  }

  return join(homedir(), ".wbc3-planner", "settings.json");
}
