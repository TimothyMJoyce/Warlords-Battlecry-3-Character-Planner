import { readFile } from "node:fs/promises";
import { resolveTerrainArchivePath } from "./wbc3-paths.mjs";
import { encodePng, readXcrResourceByName, readXcrResources } from "./wbc3-animation-reader.mjs";

export async function readTerrainTileAsset({
  terrainName = "Grass",
  tileId = "TGB0",
  gameInstallDir = "",
} = {}) {
  const normalizedTerrainName = normalizeArchiveBaseName(terrainName);
  const normalizedTileId = String(tileId ?? "").toUpperCase();
  if (!/^[A-Z0-9]{4}$/i.test(normalizedTileId)) throw new Error(`Invalid terrain tile: ${tileId}`);

  const archiveName = `${normalizedTerrainName}.xcr`;
  const archivePath = await resolveTerrainArchivePath(archiveName, gameInstallDir);
  const archive = await readFile(archivePath);
  const resources = readXcrResources(archive);
  const resourceName = `${normalizedTileId}.bmp`;
  const bmp = readXcrResourceByName(archive, resources, resourceName);
  const image = decodeBmpImage(bmp);

  return {
    ok: true,
    available: true,
    terrainName: normalizedTerrainName,
    tileId: normalizedTileId,
    width: image.width,
    height: image.height,
    imageSrc: `data:image/png;base64,${encodePng(image.width, image.height, image.rgba).toString("base64")}`,
  };
}

function normalizeArchiveBaseName(value) {
  const name = String(value ?? "").trim();
  if (!/^[a-z0-9 _-]+$/i.test(name)) throw new Error(`Invalid terrain archive name: ${value}`);
  return name;
}

function decodeBmpImage(buffer) {
  const signature = buffer.toString("ascii", 0, 2);
  const bitsPerPixel = buffer.readUInt16LE(28);
  const compression = buffer.readUInt32LE(30);

  if (signature !== "BM" || bitsPerPixel !== 8 || compression !== 0) {
    throw new Error(`Only uncompressed 8-bit BMP terrain tiles are supported.`);
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
      rgba[target + 3] = color.alpha;
    }
  }

  return { width, height, rgba };
}
