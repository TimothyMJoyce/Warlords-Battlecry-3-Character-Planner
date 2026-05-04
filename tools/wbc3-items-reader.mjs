import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { skills } from "../src/data/gameData.js";
import { skillEffect } from "../src/rules/plannerRules.js";
import { resolveGameInstallDir, resolveGraphicsArchivePath } from "./wbc3-paths.mjs";
import { encodePng, readXcrResources, readXcrResourceByName } from "./wbc3-animation-reader.mjs";
import { buildSkillTextCatalog, parseGameText } from "./wbc3-game-text-reader.mjs";
import { parseSpellTextCatalog } from "./wbc3-spells-reader.mjs";

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

const itemIconWidth = 70;
const itemIconHeight = 110;
const itemShineFrameWidth = 40;
const itemShineFrameHeight = 46;
const itemShineFrameCount = 8;

const itemPowerTextIds = {
  combat: 435,
  speed: 436,
  "speed attack": 437,
  slow: 438,
  "slow attack": 439,
  slashing: 440,
  crushing: 441,
  piercing: 442,
  fire: 443,
  ice: 444,
  electricity: 445,
  magic: 446,
  resistance: 447,
  "fire resistance": 448,
  "cold resistance": 449,
  "electricity resistance": 450,
  "magic resistance": 451,
  armor: 452,
  "spell failure": 453,
  morale: 455,
  "spell casting": 456,
  "spell range": 457,
  "mana discount": 458,
  assassin: 459,
  vampirism: 460,
  "critical hit": 461,
  "mana regen": 462,
  "life regen": 463,
  vision: 464,
  "immunity disease": 465,
  "immunity poison": 466,
  command: 470,
};

const magicSkillTextIdsBySkillId = {
  magicHealing: 471,
  magicSummoning: 472,
  magicNature: 473,
  magicIllusion: 474,
  magicNecromancy: 475,
  magicPyromancy: 476,
  magicAlchemy: 477,
  magicRunes: 478,
  magicIce: 479,
  magicChaos: 480,
  magicPoison: 481,
  magicDivination: 482,
  magicArcane: 483,
};

const gameTextRelativePath = join("English", "Game.txt");
const spellTextRelativePath = join("English", "Spells.txt");

export async function readItemCatalog({ gameInstallDir = "", graphicsPath = "" } = {}) {
  const gameDir = await resolveGameInstallDir(gameInstallDir);
  const itemTextCatalog = await tryReadItemTextCatalog(gameDir, graphicsPath);
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

async function tryReadItemTextCatalog(gameDir, graphicsPath = "") {
  try {
    const archivePath = join(gameDir, "English", "Items.xcr");
    const archive = await readFile(archivePath);
    const resources = readXcrResources(archive);
    const itemXml = readXcrResourceByName(archive, resources, "Items.xml");
    const catalog = parseItemXml(itemXml.toString("latin1"));
    const textContext = await readItemTextContext(gameDir);
    const graphicsAssets = await readItemGraphicsAssets(gameDir, graphicsPath);
    const items = catalog.items.map((item) => enrichItem(item, textContext, graphicsAssets.iconSheet));
    const sets = catalog.sets.map((set) => enrichItemSet(set, textContext));
    return {
      ok: true,
      available: true,
      items,
      sets,
      shineSprites: graphicsAssets.shineSprites,
      metadata: {
        archive: "Items.xcr",
        resource: "Items.xml",
        itemCount: items.length,
        setCount: sets.length,
      },
    };
  } catch {
    return null;
  }
}

async function readItemTextContext(gameDir) {
  const gameText = await readFile(join(gameDir, gameTextRelativePath), "latin1");
  const spellText = await readFile(join(gameDir, spellTextRelativePath), "latin1").catch(() => "");
  const gameTextEntries = parseGameText(gameText);
  const skillTextById = new Map(buildSkillTextCatalog(gameTextEntries).map((skill) => [skill.id, skill]));
  const spellNameByIndex = new Map(parseSpellTextCatalog(spellText).map((spell) => [spell.index, spell.name]));
  return { gameTextEntries, skillTextById, spellNameByIndex };
}

async function readItemGraphicsAssets(gameDir, graphicsPath = "") {
  try {
    const archivePath = await resolveGraphicsArchivePath(graphicsPath, gameDir);
    const archive = await readFile(archivePath);
    const resources = readXcrResources(archive);
    const iconSheet = decodeBmp(readXcrResourceByName(archive, resources, "Items.bmp"));
    const selectionRings = decodeBmp(readXcrResourceByName(archive, resources, "SelectionRings.bmp"));
    return {
      iconSheet,
      shineSprites: readItemShineSprites(selectionRings),
    };
  } catch {
    return {
      iconSheet: null,
      shineSprites: {},
    };
  }
}

function enrichItem(item, textContext, iconSheet) {
  const powers = item.powers.map((power) => ({
    ...power,
    displayText: formatItemPowerText(power, textContext),
  }));
  const iconColumn = getRenderedItemIconColumn(item.frame);
  const icon = iconSheet ? cropItemIcon(iconSheet, iconColumn, item.type) : null;
  return {
    ...item,
    powers,
    powerLabel: powers[0]?.displayText || item.powerLabel,
    effectText: powers.map((power) => power.displayText).filter(Boolean).join(", "),
    iconSrc: icon ? `data:image/png;base64,${encodePng(icon.width, icon.height, icon.rgba).toString("base64")}` : "",
    shine: getItemShine(item.level),
    icon: {
      row: item.type,
      col: iconColumn,
      rawCol: item.frame,
      width: itemIconWidth,
      height: itemIconHeight,
    },
  };
}

function enrichItemSet(set, textContext) {
  const power = set.power
    ? {
        ...set.power,
        displayText: formatItemPowerText(set.power, textContext),
      }
    : null;

  return {
    ...set,
    power,
    effectText: power?.displayText ?? "",
  };
}

function getItemShine(level) {
  const normalized = String(level ?? "").trim().toLowerCase();
  if (normalized === "artifact") return "artifact";
  if (normalized === "set") return "set";
  return "";
}

function getRenderedItemIconColumn(rawColumn) {
  return Math.trunc(Number(rawColumn) || 0) + 1;
}

function formatItemPowerText(power, textContext) {
  const data = Number(power.data) || 0;
  const chance = Number.isInteger(power.chance) ? power.chance : 0;
  const level = Number.isInteger(power.level) ? power.level : data;
  const template = textContext.gameTextEntries.get(itemPowerTextIds[power.type]);

  if (power.type === "cast spell") {
    const spellName = textContext.spellNameByIndex.get(data) || `Spell ${data}`;
    const spellText = formatTemplate(textContext.gameTextEntries.get(454) || "Casts %s", [spellName]);
    const chanceText = formatTemplate(textContext.gameTextEntries.get(469) || "(%d%% chance per hit)", [chance]);
    return `${spellText} ${chanceText}`;
  }

  if (power.type === "discount") {
    const discount = 100 - 100 * (100 / (2 * data + 100));
    const templateId = data >= 0 ? 692 : 693;
    const merchantTemplate =
      textContext.gameTextEntries.get(templateId) ||
      (data >= 0 ? "+%d Merchant skill (%0.2f%% Discount)" : "-%d Merchant skill (%0.2f%% Extra cost)");
    return formatTemplate(merchantTemplate, [Math.abs(data), Math.abs(discount)]);
  }

  if (power.type === "hero skill") {
    const skill = skills[data];
    const skillText = skill ? textContext.skillTextById.get(skill.id) : null;
    const magicTemplateId = skill ? magicSkillTextIdsBySkillId[skill.id] : null;
    const magicTemplate = magicTemplateId ? textContext.gameTextEntries.get(magicTemplateId) : "";
    if (magicTemplate) return formatTemplate(magicTemplate, [level]);

    const descriptionTemplate = skillText?.descriptionTemplate || "";
    if (descriptionTemplate && skill) return formatTemplate(descriptionTemplate, [skillEffect(skill.id, level)]);

    if (skillText?.name || skill?.displayName) {
      return `${skillText?.name || skill.displayName} ${level}`;
    }
  }

  if (power.type === "speed attack" && template) return formatTemplate(template, [data * 10]);
  if (power.type === "slow attack" && template) return formatTemplate(template, [data * 10]);
  if (template) return formatTemplate(template, [data]);
  if (power.text) return power.text;

  const sign = data >= 0 ? "+" : "";
  return `${sign}${data} ${formatPowerType(power.type)}`;
}

function formatTemplate(template, values = []) {
  let valueIndex = 0;
  const percentToken = "\u0000PERCENT\u0000";
  return String(template ?? "")
    .replace(/%%/g, percentToken)
    .replace(/%([+]?)(?:0\.(\d+))?([dfs])/g, (match, sign, decimals, type) => {
      const value = values[valueIndex] ?? 0;
      valueIndex += 1;

      if (type === "s") return String(value);

      const number = Number(value) || 0;
      const absolute = type === "f" && decimals ? number.toFixed(Number(decimals)) : String(Math.trunc(number));
      if (sign === "+" && number >= 0) return `+${absolute}`;
      return absolute;
    })
    .replace(new RegExp(percentToken, "g"), "%");
}

function decodeBmp(buffer) {
  if (buffer.toString("ascii", 0, 2) !== "BM") throw new Error("Unsupported bitmap signature.");

  const dataOffset = buffer.readUInt32LE(10);
  const headerSize = buffer.readUInt32LE(14);
  const width = buffer.readInt32LE(18);
  const rawHeight = buffer.readInt32LE(22);
  const planes = buffer.readUInt16LE(26);
  const bitDepth = buffer.readUInt16LE(28);
  const compression = buffer.readUInt32LE(30);
  const colorCount = buffer.readUInt32LE(46) || 256;
  const height = Math.abs(rawHeight);

  if (headerSize < 40 || width <= 0 || height <= 0 || planes !== 1 || bitDepth !== 8 || compression !== 0) {
    throw new Error("Only uncompressed 8-bit bitmaps are supported for item icons.");
  }

  const paletteOffset = 14 + headerSize;
  const palette = [];
  for (let index = 0; index < colorCount; index += 1) {
    const offset = paletteOffset + index * 4;
    if (offset + 3 >= buffer.length) break;
    palette.push({
      red: buffer[offset + 2],
      green: buffer[offset + 1],
      blue: buffer[offset],
    });
  }

  const rowStride = Math.floor((bitDepth * width + 31) / 32) * 4;
  const rgba = new Uint8Array(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    const sourceY = rawHeight > 0 ? height - 1 - y : y;
    const sourceRow = dataOffset + sourceY * rowStride;
    for (let x = 0; x < width; x += 1) {
      const paletteIndex = buffer[sourceRow + x];
      const color = palette[paletteIndex] ?? { red: 0, green: 0, blue: 0 };
      const target = (y * width + x) * 4;
      rgba[target] = color.red;
      rgba[target + 1] = color.green;
      rgba[target + 2] = color.blue;
      rgba[target + 3] = isTransparentIconPixel(color) ? 0 : 255;
    }
  }

  return { width, height, rgba };
}

function cropItemIcon(iconSheet, frame, type) {
  const x = Math.trunc(Number(frame) || 0) * itemIconWidth;
  const y = Math.trunc(Number(type) || 0) * itemIconHeight;
  return cropImage(iconSheet, x, y, itemIconWidth, itemIconHeight);
}

function readItemShineSprites(selectionRings) {
  return {
    artifact: encodeFrameStrip(
      Array.from({ length: itemShineFrameCount }, (unused, frame) =>
        cropImage(selectionRings, 392 + frame * itemShineFrameWidth, 669, itemShineFrameWidth, itemShineFrameHeight),
      ),
    ),
    set: encodeFrameStrip(
      Array.from({ length: itemShineFrameCount }, (unused, frame) =>
        cropImage(
          selectionRings,
          628 + (frame % 4) * itemShineFrameWidth,
          480 + Math.trunc(frame / 4) * itemShineFrameHeight,
          itemShineFrameWidth,
          itemShineFrameHeight,
        ),
      ),
    ),
  };
}

function encodeFrameStrip(frames) {
  const validFrames = frames.filter(Boolean);
  if (!validFrames.length) return "";

  const width = validFrames[0].width * validFrames.length;
  const height = validFrames[0].height;
  const rgba = new Uint8Array(width * height * 4);
  for (let frameIndex = 0; frameIndex < validFrames.length; frameIndex += 1) {
    const frame = validFrames[frameIndex];
    for (let row = 0; row < height; row += 1) {
      const sourceStart = row * frame.width * 4;
      const targetStart = (row * width + frameIndex * frame.width) * 4;
      rgba.set(frame.rgba.subarray(sourceStart, sourceStart + frame.width * 4), targetStart);
    }
  }

  return `data:image/png;base64,${encodePng(width, height, rgba).toString("base64")}`;
}

function cropImage(image, x, y, width, height) {
  if (x < 0 || y < 0 || x + width > image.width || y + height > image.height) {
    return null;
  }

  const rgba = new Uint8Array(width * height * 4);
  for (let row = 0; row < height; row += 1) {
    const sourceStart = ((y + row) * image.width + x) * 4;
    const targetStart = row * width * 4;
    rgba.set(image.rgba.subarray(sourceStart, sourceStart + width * 4), targetStart);
  }

  return { width, height, rgba };
}

function isTransparentIconPixel(color) {
  const isMagentaKey = color.red > 170 && color.green < 90 && color.blue > 100;
  const isBlackKey = color.red < 4 && color.green < 4 && color.blue < 4;
  return isMagentaKey || isBlackKey;
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

  return { items, sets: parseItemSets(text) };
}

function parseItemSets(text) {
  const sets = [];
  const setPattern = /<Set\b([^>]*)>([\s\S]*?)<\/Set>/gi;
  let setMatch;

  while ((setMatch = setPattern.exec(String(text ?? "")))) {
    const setAttributes = parseXmlAttributes(setMatch[1]);
    const body = setMatch[2] ?? "";
    const numericId = toInteger(setAttributes.id, sets.length);
    const powers = parseItemPowers(body);
    const itemIds = [];
    const itemPattern = /<Item\b([^/>]*?)\/>/gi;
    let itemMatch;

    while ((itemMatch = itemPattern.exec(body))) {
      const itemAttributes = parseXmlAttributes(itemMatch[1]);
      const itemId = toInteger(itemAttributes.id, null);
      if (Number.isInteger(itemId)) itemIds.push(itemId);
    }

    sets.push({
      id: `set-${numericId}`,
      numericId,
      name: extractXmlTagText(body, "Name") || `Set ${numericId}`,
      items: itemIds,
      power: powers[0] ?? null,
    });
  }

  return sets;
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

  return { items, sets: [] };
}
