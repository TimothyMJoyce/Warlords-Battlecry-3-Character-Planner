import { access, mkdir, rm } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { cp } from "node:fs/promises";

const root = resolve(import.meta.dirname, "..");
const dist = resolve(root, "dist");

if (!dist.startsWith(`${root}${sep}`)) {
  throw new Error(`Refusing to build outside the project root: ${dist}`);
}

await rm(dist, { recursive: true, force: true });
await mkdir(resolve(dist, "src"), { recursive: true });

for (const path of ["index.html", "manifest.webmanifest", "src/app.js", "src/styles.css", "src/data", "src/rules", "src/app-assets"]) {
  const from = resolve(root, path);
  const to = resolve(dist, path);
  await mkdir(dirname(to), { recursive: true });
  await access(from);
  await cp(from, to, { recursive: true });
}

await copyOptional("src/assets");

console.log(`Built static planner at ${dist}`);

async function copyOptional(path) {
  const from = resolve(root, path);
  const to = resolve(dist, path);

  try {
    await access(from);
  } catch {
    return;
  }

  await mkdir(dirname(to), { recursive: true });
  await cp(from, to, { recursive: true });
}
