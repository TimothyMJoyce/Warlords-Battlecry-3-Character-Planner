import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { resolveHeroDataArchivePath } from "./wbc3-paths.mjs";
import { importHeroBuildsFromHeroData, serializeImportedHeroBuilds } from "./hero-data-reader.mjs";

const heroDataPath = await resolveHeroDataArchivePath(process.argv[2]);
const outputPath = resolve(import.meta.dirname, "../src/data/importedHeroBuilds.local.js");
const { builds, metadata } = await importHeroBuildsFromHeroData(heroDataPath);

await writeFile(outputPath, serializeImportedHeroBuilds(builds, metadata));

console.log(`Imported ${builds.length} hero builds from ${heroDataPath}`);
console.log(`Wrote local-only hero imports to ${outputPath}`);
