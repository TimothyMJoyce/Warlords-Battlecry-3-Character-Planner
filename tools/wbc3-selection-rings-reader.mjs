import { readFile } from "node:fs/promises";
import { resolveGraphicsArchivePath } from "./wbc3-paths.mjs";
import { encodePng, readXcrResourceByName, readXcrResources } from "./wbc3-animation-reader.mjs";

const commandRadiusRingCrop = {
  x: 421,
  y: 0,
  width: 300,
  height: 229,
};

export async function readCommandRadiusRingAsset({ gameInstallDir = "", graphicsPath = "" } = {}) {
  const archivePath = await resolveGraphicsArchivePath(graphicsPath, gameInstallDir);
  const archive = await readFile(archivePath);
  const resources = readXcrResources(archive);
  const selectionRings = decodeBmpImage(readXcrResourceByName(archive, resources, "SelectionRings.bmp"));
  const ring = cropImage(selectionRings, commandRadiusRingCrop);

  return {
    ok: true,
    available: true,
    source: "SelectionRings.bmp",
    crop: commandRadiusRingCrop,
    width: ring.width,
    height: ring.height,
    imageSrc: `data:image/png;base64,${encodePng(ring.width, ring.height, ring.rgba).toString("base64")}`,
  };
}

function decodeBmpImage(buffer) {
  const signature = buffer.toString("ascii", 0, 2);
  const bitsPerPixel = buffer.readUInt16LE(28);
  const compression = buffer.readUInt32LE(30);

  if (signature !== "BM" || bitsPerPixel !== 8 || compression !== 0) {
    throw new Error("Only uncompressed 8-bit BMP graphics are supported.");
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
    const sourceY = signedHeight > 0 ? height - 1 - y : y;
    const sourceRow = dataOffset + sourceY * rowSize;

    for (let x = 0; x < width; x += 1) {
      const color = palette[buffer[sourceRow + x]];
      const target = (y * width + x) * 4;
      rgba[target] = color.red;
      rgba[target + 1] = color.green;
      rgba[target + 2] = color.blue;
      rgba[target + 3] = isTransparentKeyColor(color) ? 0 : color.alpha;
    }
  }

  return { width, height, rgba };
}

function cropImage(image, crop) {
  const width = Math.max(1, Math.trunc(crop.width));
  const height = Math.max(1, Math.trunc(crop.height));
  const rgba = new Uint8Array(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const source = ((crop.y + y) * image.width + crop.x + x) * 4;
      const target = (y * width + x) * 4;
      rgba[target] = image.rgba[source];
      rgba[target + 1] = image.rgba[source + 1];
      rgba[target + 2] = image.rgba[source + 2];
      rgba[target + 3] = image.rgba[source + 3];
    }
  }

  return { width, height, rgba };
}

function isTransparentKeyColor(color) {
  return color.red > 170 && color.green < 90 && color.blue > 100;
}
