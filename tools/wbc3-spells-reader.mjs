import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { resolveGameInstallDir } from "./wbc3-paths.mjs";

const spellTextRelativePath = join("English", "Spells.txt");

export async function readSpellTextCatalog(gameInstallDir) {
  const installDir = await resolveGameInstallDir(gameInstallDir);
  const text = await readFile(join(installDir, spellTextRelativePath), "latin1");
  const spells = parseSpellTextCatalog(text);

  return {
    ok: true,
    source: spellTextRelativePath.replace(/\\/g, "/"),
    spells,
  };
}

export function parseSpellTextCatalog(text) {
  const names = new Map();
  const descriptions = new Map();

  for (const line of String(text ?? "").split(/\r?\n/)) {
    const match = line.match(/^\[(SPELL_(NAME|DESC)_(\d+))\]\s*(.*)$/);
    if (!match) continue;

    const kind = match[2];
    const index = Number(match[3]);
    const value = match[4].trim();
    if (!Number.isInteger(index) || index < 0) continue;
    if (kind === "NAME") names.set(index, value);
    if (kind === "DESC") descriptions.set(index, value);
  }

  const maxIndex = Math.max(...names.keys(), ...descriptions.keys(), -1);
  const spells = [];
  for (let index = 0; index <= maxIndex; index += 1) {
    const name = names.get(index) ?? "";
    const description = descriptions.get(index) ?? "";
    if (!name && !description) continue;
    spells.push({ index, name, description });
  }

  return spells;
}
