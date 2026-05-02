import { mkdir, writeFile } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { deflateSync } from "node:zlib";
import { resolveGraphicsArchivePath } from "./wbc3-paths.mjs";

const graphicsArchivePath = await resolveGraphicsArchivePath(process.argv[2]);
const outputDirectory = resolve(import.meta.dirname, "../src/assets/icons");
const resourceHeaderSize = 532;
const archiveHeaderSize = 28;

const damageIconIndexes = {
  piercing: 0,
  cold: 1,
  electricity: 2,
  fire: 3,
  magic: 4,
  crushing: 5,
  slashing: 6,
};

const crc32Table = createCrc32Table();
const archive = await readFile(graphicsArchivePath);
const resources = readXcrResources(archive);
const damageIcons = decodeBmp(readResource(archive, findResource(resources, "DamageIcons.bmp")));

await mkdir(outputDirectory, { recursive: true });

for (const [name, index] of Object.entries(damageIconIndexes)) {
  await writePng(`${name}.png`, cropBitmap(damageIcons, index * 24, 0, 24, 20, ["black"]));
}

const iconCount = Object.keys(damageIconIndexes).length;
console.log(`Extracted ${iconCount} UI icons from ${graphicsArchivePath}`);

async function writePng(fileName, image) {
  await writeFile(resolve(outputDirectory, fileName), encodePng(image.width, image.height, image.rgba));
}

function findResource(resources, name) {
  const resource = resources.find((entry) => entry.name.toLowerCase() === name.toLowerCase());
  if (!resource) throw new Error(`Missing ${name} in ${graphicsArchivePath}`);
  return resource;
}

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

function decodeBmp(buffer) {
  const signature = buffer.toString("ascii", 0, 2);
  const bitsPerPixel = buffer.readUInt16LE(28);
  const compression = buffer.readUInt32LE(30);

  if (signature !== "BM" || bitsPerPixel !== 8 || compression !== 0) {
    throw new Error(`Only uncompressed 8-bit BMP files are supported, got ${signature} ${bitsPerPixel}bpp compression ${compression}`);
  }

  const dataOffset = buffer.readUInt32LE(10);
  const width = buffer.readInt32LE(18);
  const signedHeight = buffer.readInt32LE(22);
  const height = Math.abs(signedHeight);
  const palette = [];

  for (let index = 0; index < 256; index += 1) {
    const offset = 54 + index * 4;
    palette.push({
      red: buffer[offset + 2],
      green: buffer[offset + 1],
      blue: buffer[offset],
      alpha: 255,
    });
  }

  const rowSize = Math.ceil(width / 4) * 4;
  const rgba = new Uint8Array(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    const imageY = signedHeight > 0 ? height - 1 - y : y;
    const imageRow = dataOffset + imageY * rowSize;

    for (let x = 0; x < width; x += 1) {
      const color = palette[buffer[imageRow + x]];
      const target = (y * width + x) * 4;
      rgba[target] = color.red;
      rgba[target + 1] = color.green;
      rgba[target + 2] = color.blue;
      rgba[target + 3] = color.alpha;
    }
  }

  return { width, height, rgba };
}

function cropBitmap(image, x, y, width, height, transparentColors) {
  const rgba = new Uint8Array(width * height * 4);

  for (let targetY = 0; targetY < height; targetY += 1) {
    for (let targetX = 0; targetX < width; targetX += 1) {
      const pixelIndex = ((y + targetY) * image.width + x + targetX) * 4;
      const targetIndex = (targetY * width + targetX) * 4;
      const red = image.rgba[pixelIndex];
      const green = image.rgba[pixelIndex + 1];
      const blue = image.rgba[pixelIndex + 2];

      rgba[targetIndex] = red;
      rgba[targetIndex + 1] = green;
      rgba[targetIndex + 2] = blue;
      rgba[targetIndex + 3] = isTransparent(red, green, blue, transparentColors) ? 0 : 255;
    }
  }

  return { width, height, rgba };
}

function isTransparent(red, green, blue, colors) {
  return colors.some((color) => {
    if (color === "magenta") return red > 240 && green < 20 && blue > 240;
    if (color === "black") return red < 8 && green < 8 && blue < 8;
    return false;
  });
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const scanlines = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    scanlines[rowStart] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * width * 4, width * 4).copy(scanlines, rowStart + 1);
  }

  return Buffer.concat([
    signature,
    makePngChunk("IHDR", ihdr),
    makePngChunk("IDAT", deflateSync(scanlines, { level: 9 })),
    makePngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function makePngChunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  const checksum = Buffer.alloc(4);

  length.writeUInt32BE(data.length, 0);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);

  return Buffer.concat([length, typeBuffer, data, checksum]);
}

function crc32(buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc = crc32Table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function createCrc32Table() {
  const table = [];
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
}

function readCString(buffer, offset, length) {
  return buffer.toString("latin1", offset, offset + length).split("\0")[0];
}
