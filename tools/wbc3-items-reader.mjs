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
  10: "Orb",
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
  const itemTextCatalog = await tryReadItemTextCatalog(gameDir);
  if (itemTextCatalog) return itemTextCatalog;

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

async function tryReadItemTextCatalog(gameDir) {
  try {
    const archivePath = join(gameDir, "English", "Items.xcr");
    const archive = await readFile(archivePath);
    const resources = readXcrResources(archive);
    const itemXml = readXcrResourceByName(archive, resources, "Items.xml");
    const catalog = parseItemXml(itemXml.toString("latin1"));
    return {
      ok: true,
      available: true,
      ...catalog,
      metadata: {
        archive: "Items.xcr",
        resource: "Items.xml",
        itemCount: catalog.items.length,
      },
    };
  } catch {
    return null;
  }
}

export function parseItemXml(text) {
  const items = [];
  const itemPattern = /<Item\b([^>]*)>([\s\S]*?)<\/Item>/gi;
  let itemMatch;

  while ((itemMatch = itemPattern.exec(String(text ?? "")))) {
    const itemAttributes = parseXmlAttributes(itemMatch[1]);
    const body = itemMatch[2] ?? "";
    const numericId = toInteger(itemAttributes.id, items.length + 1);
    const imageAttributes = parseXmlAttributes(matchFirstTagAttributes(body, "Image"));
    const dataAttributes = parseXmlAttributes(matchFirstTagAttributes(body, "Data"));
    const powers = parseItemPowers(body);
    const type = toInteger(imageAttributes.iconrow, -1);
    const firstPower = powers[0] ?? null;

    items.push({
      id: `item-${numericId}`,
      numericId,
      name: extractXmlTagText(body, "Name") || `Item ${numericId}`,
      description: extractXmlTagText(body, "Description"),
      type,
      typeLabel: itemTypeLabels[type] ?? `Type ${type}`,
      frame: toInteger(imageAttributes.iconcol, 0),
      value: firstPower?.data ?? 0,
      powerCode: firstPower?.type ?? "",
      powerLabel: firstPower?.typeLabel ?? "No Power",
      powers,
      goldValue: toInteger(dataAttributes.value, 0),
      level: dataAttributes.level ?? "",
      rarity: toInteger(dataAttributes.rarity, 0),
    });
  }

  return { items };
}

function parseItemPowers(body) {
  const powers = [];
  const powerPattern = /<Power\b([^/>]*?)(?:\/>|>([\s\S]*?)<\/Power>)/gi;
  let powerMatch;

  while ((powerMatch = powerPattern.exec(body))) {
    const attributes = parseXmlAttributes(powerMatch[1]);
    const type = String(attributes.type ?? "").trim();
    const text = decodeXmlEntities(stripXml(powerMatch[2] ?? "")).trim();
    const data = toInteger(attributes.data, 0);
    powers.push({
      id: toInteger(attributes.id, powers.length),
      type,
      typeLabel: formatPowerType(type),
      data,
      chance: toInteger(attributes.chance, null),
      level: toInteger(attributes.level, null),
      text,
    });
  }

  return powers;
}

function parseXmlAttributes(rawAttributes = "") {
  const attributes = {};
  const attributePattern = /([A-Za-z0-9_:-]+)\s*=\s*"([^"]*)"/g;
  let match;
  while ((match = attributePattern.exec(String(rawAttributes ?? "")))) {
    attributes[match[1]] = decodeXmlEntities(match[2]);
  }
  return attributes;
}

function matchFirstTagAttributes(body, tagName) {
  const match = String(body ?? "").match(new RegExp(`<${tagName}\\b([^>]*)\\/?>`, "i"));
  return match?.[1] ?? "";
}

function extractXmlTagText(body, tagName) {
  const match = String(body ?? "").match(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return decodeXmlEntities(stripXml(match?.[1] ?? "")).trim().replace(/\s+/g, " ");
}

function stripXml(value) {
  return String(value ?? "").replace(/<[^>]*>/g, " ");
}

function decodeXmlEntities(value) {
  return String(value ?? "")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&");
}

function formatPowerType(type) {
  const normalized = String(type ?? "").trim();
  if (!normalized) return "Power";
  return normalized
    .split(/\s+/)
    .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1)}` : ""))
    .join(" ");
}

function toInteger(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) ? number : fallback;
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
