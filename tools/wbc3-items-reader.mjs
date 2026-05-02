import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { resolveGameInstallDir } from "./wbc3-paths.mjs";
import { readXcrResources, readXcrResourceByName } from "./wbc3-animation-reader.mjs";

export const itemTypeLabels = {
  0: "Sword",
  1: "Staff",
  2: "Armor",
  3: "Necklace",
  4: "Shield",
  5: "Ring",
  6: "Crown",
  7: "Helm",
  8: "Banner",
  9: "Boots",
};

export const itemPowerLabels = {
  "01": "Combat",
  "02": "Health",
  "03": "Training",
  "04": "Conversion",
  "05": "Speed",
  "06": "Resistance",
  "07": "Morale",
  "08": "Magery",
  "10": "Command",
  "11": "Merchant",
};

export async function readItemCatalog({ gameInstallDir = "" } = {}) {
  const gameDir = await resolveGameInstallDir(gameInstallDir);
  const archivePath = join(gameDir, "Assets", "Data", "System.xcr");
  const archive = await readFile(archivePath);
  const resources = readXcrResources(archive);
  const itemConfig = readXcrResourceByName(archive, resources, "Item.cfg");
  const text = itemConfig.toString("latin1");
  const catalog = parseItemConfig(text);
  return {
    ok: true,
    available: true,
    ...catalog,
    metadata: {
      archive: "System.xcr",
      resource: "Item.cfg",
      itemCount: catalog.items.length,
    },
  };
}

export function parseItemConfig(text) {
  const items = [];
  let section = "";

  for (const rawLine of String(text ?? "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("//")) continue;

    const sectionMatch = line.match(/^\[([A-Z]+)\]$/i);
    if (sectionMatch) {
      section = sectionMatch[1].toLowerCase();
      continue;
    }

    if (section !== "treasures") continue;

    const match = line.match(/^(\d{3})\s+(\d+)\s+(\d+)\s+(\d{2})\s+(-?\d+)\s+(.+?)\s*$/);
    if (!match) continue;

    const [, indexText, typeText, frameText, powerCode, valueText, name] = match;
    const type = Number(typeText);
    const frame = Number(frameText);
    const value = Number(valueText);
    items.push({
      id: `treasure-${indexText}`,
      numericId: Number(indexText),
      name: name.trim(),
      type,
      typeLabel: itemTypeLabels[type] ?? `Type ${type}`,
      frame,
      powerCode,
      powerLabel: itemPowerLabels[powerCode] ?? `Power ${powerCode}`,
      value,
    });
  }

  return { items };
}
