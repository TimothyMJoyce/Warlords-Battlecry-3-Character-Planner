import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { skills } from "../src/data/gameData.js";
import { resolveGameInstallDir } from "./wbc3-paths.mjs";

const gameTextRelativePath = join("English", "Game.txt");

const descriptionSkillIdsByTextOrder = [
  "allSeeingEye",
  "armorer",
  "arcaneRune",
  "assassin",
  "barbarianKing",
  "beastslayer",
  "brewmaster",
  "bullslayer",
  "coldResistance",
  "constitution",
  "contamination",
  "daemonLord",
  "daemonslayer",
  "darkLord",
  "deathRune",
  "deathslayer",
  "demolition",
  "dragonmaster",
  "dragonslayer",
  "dreamLord",
  "dwarfLord",
  "dwarfslayer",
  "elcorsAura",
  "electricityResistance",
  "elementalLore",
  "elementalResistance",
  "elfslayer",
  "energy",
  "engineer",
  "ferocity",
  "fireResistance",
  "forestLord",
  "forestRune",
  "gate",
  "gemcutting",
  "golemMaster",
  "griffonMaster",
  "guardianOak",
  "guildmaster",
  "highLord",
  "hornedLord",
  "horseLord",
  "ignoreArmor",
  "imperialLord",
  "invulnerability",
  "knightLord",
  "knightProtector",
  "lifeRune",
  "lore",
  "leech",
  "leadership",
  "mageKing",
  "magicResistance",
  "manslayer",
  "memories",
  "merchant",
  "mightyBlow",
  "orcLord",
  "orcslayer",
  "plagueLord",
  "potionmaster",
  "quarrying",
  "reave",
  "regeneration",
  "ritual",
  "runicLore",
  "running",
  "scales",
  "scorpionLord",
  "serpentLord",
  "serpentslayer",
  "shadowStrength",
  "siegeLord",
  "skullLord",
  "skyRune",
  "slimemaster",
  "smelting",
  "smiteGood",
  "taming",
  "thickHide",
  "trade",
  "undeadLegion",
  "vampirism",
  "warding",
  "wealth",
  "weaponmaster",
];

const specialNameTextIds = {
  swiftness: 1154,
  fireMissile: 1155,
  magicTime: 1156,
  thievery: 1158,
  diplomacy: 1160,
};

const specialDescriptionTextIds = {
  smiteEvil: 653,
  swiftness: 1152,
  fireMissile: 1153,
  thievery: 1157,
  diplomacy: 1159,
};

const magicDescriptionTextIds = {
  noSpells: 654,
  oneSpell: 650,
  allSpells: 651,
  firstSpells: 652,
};

const magicSkillIds = new Set([
  "magicHealing",
  "magicSummoning",
  "magicNature",
  "magicIllusion",
  "magicNecromancy",
  "magicPyromancy",
  "magicAlchemy",
  "magicRunes",
  "magicIce",
  "magicChaos",
  "magicPoison",
  "magicDivination",
  "magicArcane",
  "magicTime",
]);

const descriptionTextIdsBySkillId = Object.fromEntries(
  descriptionSkillIdsByTextOrder.map((skillId, index) => [skillId, 564 + index]),
);

export async function readSkillTextCatalog(gameInstallDir) {
  const installDir = await resolveGameInstallDir(gameInstallDir);
  const text = await readFile(join(installDir, gameTextRelativePath), "latin1");
  const entries = parseGameText(text);
  const skillText = buildSkillTextCatalog(entries);

  return {
    ok: true,
    source: gameTextRelativePath.replace(/\\/g, "/"),
    skills: skillText,
    magicTemplates: Object.fromEntries(
      Object.entries(magicDescriptionTextIds).map(([key, textId]) => [key, entries.get(textId) ?? ""]),
    ),
  };
}

export function parseGameText(text) {
  const entries = new Map();

  for (const line of String(text ?? "").split(/\r?\n/)) {
    const match = line.match(/^\[(\d{4})\]\s*(.*)$/);
    if (!match) continue;
    const textId = Number(match[1]);
    const value = match[2].trim().replace(/\s+/g, " ");
    if (Number.isInteger(textId)) entries.set(textId, value);
  }

  return entries;
}

export function buildSkillTextCatalog(entries) {
  return skills
    .map((skill, index) => {
      if (skill.id === "null") return null;
      const nameTextId = specialNameTextIds[skill.id] ?? getSequentialNameTextId(index);
      const descriptionTextId = specialDescriptionTextIds[skill.id] ?? descriptionTextIdsBySkillId[skill.id] ?? null;
      const name = cleanGameText(entries.get(nameTextId) ?? skill.displayName);
      const descriptionTemplate = descriptionTextId ? cleanGameText(entries.get(descriptionTextId) ?? "") : "";

      return {
        id: skill.id,
        name,
        descriptionTemplate,
        kind: magicSkillIds.has(skill.id) ? "magic" : "skill",
      };
    })
    .filter(Boolean);
}

function getSequentialNameTextId(index) {
  if (index >= 1 && index <= 101) return 760 + index - 1;
  return null;
}

function cleanGameText(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}
