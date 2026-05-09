import { readFile } from "node:fs/promises";
import { deflateSync } from "node:zlib";
import { heroAnimationTypesById, heroAvatarsById } from "../src/data/heroAvatars.js";
import { resolveEffectArchivePath, resolveSideArchivePath } from "./wbc3-paths.mjs";

const resourceHeaderSize = 532;
const archiveHeaderSize = 28;
const maxPaletteTypes = 8;
const maxPaletteEntries = 256;
const rleBlockWidth = 128;
const animationTypeSize = 26;
const animationTypeCount = 9;
const sideColorCount = 15;
const animationEffectShadow = 1;
const shadowPixelColor = { red: 22, green: 27, blue: 24, alpha: 255 };
const crc32Table = createCrc32Table();
const effectSpriteAliases = {
  EBLS: "EZ20",
  EILU: "EZ00",
  EILE: "EZ00",
  ERUC: "EZ20",
  EISP: "EZ20",
  EIAR: "EZ20",
  EMIF: "EZ20",
  EIFM: "EZ20",
  EIST: "EZ27",
  ECHC: "EZ00",
  ECHW: "EZ30",
  EIMM: "EZ20",
  EPOC: "EZ25",
  EPGA: "EZ19",
  ESVT: "EZ25",
  EDVC: "EZ65",
  EARC: "EZ65",
  ECOM: "EZ65",
  ESIV: "EZ65",
  EMM2: "EMM0",
  EMM4: "EMM0",
  EMIS: "EZ20",
  EMAP: "EMA0",
  EJ02: "EJ03",
};

export async function readAvatarAnimationAsset({
  avatarId,
  animationId,
  gameInstallDir = "",
  direction = 3,
  paletteType = 0,
  sideColor = 0,
} = {}) {
  const avatar = heroAvatarsById[String(avatarId ?? "").toUpperCase()];
  if (!avatar) throw new Error(`Unknown avatar: ${avatarId}`);

  const asset = await readSpriteAnimationAsset({
    spriteId: avatar.id,
    archiveName: avatar.archive,
    animationId,
    gameInstallDir,
    direction,
    paletteType,
    sideColor,
  });

  return {
    ...asset,
    avatar,
  };
}

export async function readSpriteAnimationAsset({
  spriteId,
  archiveName,
  archiveType = "side",
  animationId,
  gameInstallDir = "",
  direction = 3,
  paletteType = 0,
  sideColor = 0,
} = {}) {
  const normalizedSpriteId = String(spriteId ?? "").toUpperCase();
  if (!/^[A-Z0-9]{4}$/.test(normalizedSpriteId)) throw new Error(`Unknown sprite: ${spriteId}`);
  if (!archiveName) throw new Error(`Missing archive for ${normalizedSpriteId}.`);

  const animation = heroAnimationTypesById[animationId] ?? heroAnimationTypesById.stand;
  const archivePath =
    archiveType === "effect"
      ? await resolveEffectArchivePath(archiveName, gameInstallDir)
      : await resolveSideArchivePath(archiveName, gameInstallDir);
  const archive = await readFile(archivePath);
  const resources = readXcrResources(archive);
  const animationInfo = readAnimationInfo(readXcrResourceByName(archive, resources, `${normalizedSpriteId}.ANI`));
  const animationType = animationInfo[animation.index];

  if (!animationType?.used) {
    return {
      ok: true,
      available: false,
      spriteId: normalizedSpriteId,
      archive: archiveName,
      animation,
      reason: `${animation.label} animation is not available for ${normalizedSpriteId}.`,
    };
  }

  const imageResourceName = `${normalizedSpriteId}${animation.suffix}.RLE`;
  const imageResource = findXcrResource(resources, imageResourceName);
  if (!imageResource) {
    return {
      ok: true,
      available: false,
      spriteId: normalizedSpriteId,
      archive: archiveName,
      animation,
      reason: `${imageResourceName} is not present in ${archiveName}.`,
    };
  }

  const rle = decodeRleImage(readXcrResource(archive, imageResource), {
    paletteType,
    sideColor,
    effects: animationType.effects,
  });
  const visiblePixelCount = countVisiblePixels(rle.rgba);

  return {
    ok: true,
    available: true,
    spriteId: normalizedSpriteId,
    archive: archiveName,
    animation,
    direction,
    frameCount: animationType.frameCount,
    frameWidth: animationType.width,
    frameHeight: animationType.height,
    sheetWidth: rle.width,
    sheetHeight: rle.height,
    originX: animationType.originX,
    originY: animationType.originY,
    effectOriginX: animationType.effectOriginX,
    effectOriginY: animationType.effectOriginY,
    selectionOriginX: animationType.selectionOriginX,
    selectionOriginY: animationType.selectionOriginY,
    selectionSize: animationType.selectionSize,
    effectType: animationType.effectType,
    effectActivation: animationType.effectActivation,
    effects: animationType.effects,
    visiblePixelCount,
    imageSrc: `data:image/png;base64,${encodePng(rle.width, rle.height, rle.rgba).toString("base64")}`,
  };
}

export async function readEffectAnimationAsset({
  effectId,
  archiveName = "",
  gameInstallDir = "",
  direction = 0,
  paletteType = 0,
  sideColor = -1,
} = {}) {
  const normalizedEffectId = String(effectId ?? "").toUpperCase();
  if (!/^[A-Z0-9]{4}$/.test(normalizedEffectId)) throw new Error(`Unknown effect: ${effectId}`);

  const archiveNames = archiveName ? [archiveName] : ["PatchEffects.xcr", "Effects1.xcr"];
  const effectIds = [...new Set([normalizedEffectId, effectSpriteAliases[normalizedEffectId]].filter(Boolean))];
  let unavailable = null;
  let missing = null;

  for (const candidateEffectId of effectIds) {
    for (const candidateArchiveName of archiveNames) {
      try {
        const asset = await readSpriteAnimationAsset({
          spriteId: candidateEffectId,
          archiveName: candidateArchiveName,
          archiveType: "effect",
          animationId: "stand",
          gameInstallDir,
          direction,
          paletteType,
          sideColor,
        });
        if (asset.available) {
          return {
            ...asset,
            effectId: normalizedEffectId,
            resolvedEffectId: candidateEffectId,
          };
        }
        unavailable = {
          ...asset,
          effectId: normalizedEffectId,
          resolvedEffectId: candidateEffectId,
        };
      } catch (error) {
        missing = error;
      }
    }
  }

  return (
    unavailable ?? {
      ok: true,
      available: false,
      effectId: normalizedEffectId,
      reason:
        missing instanceof Error
          ? `${normalizedEffectId} is not present in the installed effect archives.`
          : `${normalizedEffectId} is not available.`,
    }
  );
}

export function readAnimationInfo(buffer) {
  if (buffer.length < animationTypeSize * animationTypeCount) {
    throw new Error("Animation info is incomplete.");
  }

  const animations = [];
  for (let index = 0; index < animationTypeCount; index += 1) {
    const offset = index * animationTypeSize;
    animations.push({
      index,
      used: buffer.readUInt8(offset) !== 0,
      frameCount: buffer.readUInt8(offset + 1),
      effects: [buffer.readUInt8(offset + 2), buffer.readUInt8(offset + 3)],
      originX: buffer.readUInt16LE(offset + 4),
      originY: buffer.readUInt16LE(offset + 6),
      width: buffer.readUInt16LE(offset + 8),
      height: buffer.readUInt16LE(offset + 10),
      effectOriginX: buffer.readUInt16LE(offset + 12),
      effectOriginY: buffer.readUInt16LE(offset + 14),
      selectionOriginX: buffer.readUInt16LE(offset + 16),
      selectionOriginY: buffer.readUInt16LE(offset + 18),
      selectionSize: buffer.readUInt16LE(offset + 20),
      effectType: buffer.readUInt16LE(offset + 22),
      effectActivation: buffer.readUInt16LE(offset + 24),
    });
  }
  return animations;
}

export function decodeRleImage(buffer, options = {}) {
  const marker = buffer.toString("ascii", 0, 2);
  if (marker !== "RL" && marker !== "RS") {
    throw new Error(`Unsupported RLE marker: ${marker}`);
  }

  const compressedSize = buffer.readUInt32LE(2);
  const width = buffer.readUInt16LE(6);
  const height = buffer.readUInt16LE(8);
  const paletteOffset = 10;
  const pointerBlockSizeOffset = paletteOffset + maxPaletteTypes * maxPaletteEntries * 2;
  const pointerBlockSize = buffer.readUInt32LE(pointerBlockSizeOffset);
  const totalPointerBlockSize = buffer.readUInt32LE(pointerBlockSizeOffset + 4);
  const pointerBlockCount = buffer.readUInt16LE(pointerBlockSizeOffset + 8);
  // The side sprite resources keep one reserved 16-bit value after the block count.
  const dataOffset = pointerBlockSizeOffset + 12;

  if (width <= 0 || height <= 0 || dataOffset + compressedSize > buffer.length) {
    throw new Error("RLE image dimensions or data size are invalid.");
  }

  const data = buffer.subarray(dataOffset, dataOffset + compressedSize);
  const expectedBlocks = Math.ceil(width / rleBlockWidth);
  const blockCount = Math.max(pointerBlockCount || 0, expectedBlocks);
  const tableSize = pointerBlockSize || height * 4;
  const pointerBytes = totalPointerBlockSize || blockCount * height * 4;
  if (pointerBytes > data.length) throw new Error("RLE pointer table points outside the image data.");

  const palette = readPalette(buffer, paletteOffset, options);
  const rgba = new Uint8Array(width * height * 4);
  const isShadowEncoding = marker === "RS";

  for (let block = 0; block < expectedBlocks; block += 1) {
    const blockX = block * rleBlockWidth;
    const blockWidth = Math.min(rleBlockWidth, width - blockX);
    const tableOffset = block * tableSize;
    if (tableOffset + height * 4 > data.length) continue;

    for (let y = 0; y < height; y += 1) {
      const rowOffset = data.readUInt32LE(tableOffset + y * 4);
      if (rowOffset <= 0 || rowOffset >= data.length) continue;

      let source = rowOffset;
      let x = 0;
      while (x < blockWidth && source < data.length) {
        const value = data[source];
        source += 1;

        if (value === 255) {
          if (source >= data.length) break;
          const skip = data[source];
          source += 1;
          if (skip === 255) break;
          x += skip;
          continue;
        }

        if (isShadowEncoding && value === 250) {
          if (source >= data.length) break;
          const run = data[source];
          source += 1;
          for (let count = 0; count < run && x < blockWidth; count += 1, x += 1) {
            writePalettePixel(rgba, width, blockX + x, y, shadowPixelColor, 95);
          }
          continue;
        }

        if (isShadowEffectPixel(value, options.effects, 0)) {
          writePalettePixel(rgba, width, blockX + x, y, shadowPixelColor, getShadowEffectAlpha(value - 246));
          x += 1;
          continue;
        }

        if (isShadowEffectPixel(value, options.effects, 1)) {
          writePalettePixel(rgba, width, blockX + x, y, shadowPixelColor, getShadowEffectAlpha(value - 238));
          x += 1;
          continue;
        }

        writePalettePixel(rgba, width, blockX + x, y, palette[value], 255);
        x += 1;
      }
    }
  }

  return { width, height, rgba };
}

export function readXcrResources(buffer) {
  const identifier = readCString(buffer, 0, 20);
  if (identifier !== "xcr File 1.00") {
    throw new Error(`Unsupported XCR header: ${identifier}`);
  }

  const resourceCount = buffer.readInt32LE(20);
  const resourceTableSize = archiveHeaderSize + resourceCount * resourceHeaderSize;
  if (resourceCount < 0 || resourceTableSize > buffer.length) {
    throw new Error("The archive resource table is incomplete.");
  }

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

export function findXcrResource(resources, name) {
  return resources.find((resource) => resource.name.toLowerCase() === String(name).toLowerCase()) ?? null;
}

export function readXcrResourceByName(buffer, resources, name) {
  const resource = findXcrResource(resources, name);
  if (!resource) throw new Error(`Missing ${name}.`);
  return readXcrResource(buffer, resource);
}

export function readXcrResource(buffer, resource) {
  const start = resource.physicalOffset;
  const end = resource.physicalOffset + resource.size;
  if (start > buffer.length || end > buffer.length || end < start) {
    throw new Error(`Resource ${resource.name} points outside the archive.`);
  }

  const bytes = Buffer.from(buffer.subarray(start, end));
  if (!resource.encrypted) return bytes;

  const decryptionArray = createDecryptionArray();
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = decryptionArray[bytes[index]];
  }
  return bytes;
}

function readPalette(buffer, paletteOffset, options) {
  const paletteType = Math.max(0, Math.min(maxPaletteTypes - 1, Math.trunc(Number(options.paletteType) || 0)));
  const palette = [];
  for (let index = 0; index < maxPaletteEntries; index += 1) {
    const value = buffer.readUInt16LE(paletteOffset + (paletteType * maxPaletteEntries + index) * 2);
    palette.push(rgb565ToRgba(value));
  }

  if (Number(options.sideColor) >= 0) {
    applySideColorZero(palette);
  }

  return palette;
}

function rgb565ToRgba(value) {
  const red = (value >> 11) & 31;
  const green = (value >> 5) & 63;
  const blue = value & 31;
  return {
    red: Math.round((red * 255) / 31),
    green: Math.round((green * 255) / 63),
    blue: Math.round((blue * 255) / 31),
    alpha: 255,
  };
}

function applySideColorZero(palette) {
  for (let index = 0; index < sideColorCount; index += 1) {
    palette[224 + index] = {
      red: Math.min(255, 40 + index * 7),
      green: Math.min(255, index * 3),
      blue: Math.min(255, index * 3),
      alpha: 255,
    };
  }
}

function isShadowEffectPixel(value, effects, effectIndex) {
  if (effects?.[effectIndex] !== animationEffectShadow) return false;
  if (effectIndex === 0) return value >= 247 && value < 255;
  return value >= 239 && value < 247;
}

function getShadowEffectAlpha(shadowIndex) {
  const clamped = Math.max(1, Math.min(8, Math.trunc(Number(shadowIndex) || 1)));
  return Math.max(46, 110 - (clamped - 1) * 8);
}

function writePalettePixel(rgba, width, x, y, color, alpha) {
  const target = (y * width + x) * 4;
  rgba[target] = color.red;
  rgba[target + 1] = color.green;
  rgba[target + 2] = color.blue;
  rgba[target + 3] = isTransparentKeyColor(color) ? 0 : alpha;
}

function isTransparentKeyColor(color) {
  return color.red > 170 && color.green < 90 && color.blue > 100;
}

function countVisiblePixels(rgba) {
  let count = 0;
  for (let index = 3; index < rgba.length; index += 4) {
    if (rgba[index] > 0) count += 1;
  }
  return count;
}

export function encodePng(width, height, rgba) {
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
