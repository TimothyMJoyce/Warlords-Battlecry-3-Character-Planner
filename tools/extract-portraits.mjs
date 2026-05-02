import { mkdir, writeFile } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { resolvePortraitArchivePath } from "./wbc3-paths.mjs";

const portraitArchivePath = await resolvePortraitArchivePath(process.argv[2]);
const outputDirectory = resolve(import.meta.dirname, "../src/assets/portraits");
const resourceHeaderSize = 532;
const archiveHeaderSize = 28;

const archive = await readFile(portraitArchivePath);
const resources = readXcrResources(archive).filter((resource) => /^Portrait\d\d\.bmp$/i.test(resource.name));

await mkdir(outputDirectory, { recursive: true });

for (const resource of resources) {
  await writeFile(resolve(outputDirectory, resource.name), readResource(archive, resource));
}

console.log(`Extracted ${resources.length} portraits from ${portraitArchivePath}`);

function readXcrResources(buffer) {
  const identifier = readCString(buffer, 0, 20);
  if (identifier !== "xcr File 1.00") {
    throw new Error(`Unsupported XCR header: ${identifier}`);
  }

  const resourceCount = buffer.readInt32LE(20);
  const resources = [];

  for (let index = 0; index < resourceCount; index += 1) {
    const offset = archiveHeaderSize + index * resourceHeaderSize;
    resources.push({
      name: readCString(buffer, offset, 256),
      fullPath: readCString(buffer, offset + 256, 256),
      physicalOffset: buffer.readUInt32LE(offset + 512),
      size: buffer.readUInt32LE(offset + 516),
      type: buffer.readInt32LE(offset + 520),
      encrypted: Boolean(buffer.readUInt8(offset + 529)),
    });
  }

  return resources;
}

function readResource(buffer, resource) {
  const bytes = Buffer.from(buffer.subarray(resource.physicalOffset, resource.physicalOffset + resource.size));
  if (!resource.encrypted) return bytes;

  const decryptionArray = createDecryptionArray();
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = decryptionArray[bytes[index]];
  }
  return bytes;
}

function createDecryptionArray() {
  const encryptionArray = [];
  const decryptionArray = [];
  let lastNumber = 728;

  for (let index = 0; index < 256; index += 1) {
    let found = false;

    while (!found) {
      const result = (25173 * lastNumber + 13849) % 65536;
      lastNumber = result;
      let randomValue = Math.floor((result * 256) / 65535);
      randomValue = Math.max(0, Math.min(255, randomValue));

      if (!encryptionArray.slice(0, index).includes(randomValue)) {
        found = true;
        encryptionArray[index] = randomValue;
        decryptionArray[randomValue] = index;
      }
    }
  }

  return decryptionArray;
}

function readCString(buffer, offset, length) {
  return buffer.toString("latin1", offset, offset + length).split("\0")[0];
}
