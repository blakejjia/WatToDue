import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function createCrcTable() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  return table;
}

const crcTable = createCrcTable();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);

  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);

  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(body), 0);

  return Buffer.concat([len, body, crcBuf]);
}

function createPng(size, primaryColor = [253, 213, 79], accentColor = [30, 30, 30]) {
  // Signature
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR: width, height, bit depth (8), color type (6 = RGBA), compression, filter, interlace
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // Raw image scanlines
  // Filter byte (0) + size * 4 bytes per scanline
  const scanlineLength = 1 + size * 4;
  const rawData = Buffer.alloc(scanlineLength * size);

  const center = size / 2;
  const radius = size * 0.44;

  for (let y = 0; y < size; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0; // Filter None

    for (let x = 0; x < size; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= radius) {
        // Inner stylized 'W' icon on Waterloo gold circle
        const nx = x / size;
        const ny = y / size;
        const inW = (
          (nx > 0.22 && nx < 0.32 && ny > 0.3 && ny < 0.72) ||
          (nx > 0.68 && nx < 0.78 && ny > 0.3 && ny < 0.72) ||
          (nx > 0.45 && nx < 0.55 && ny > 0.45 && ny < 0.72) ||
          (ny > 0.65 && ny < 0.75 && nx > 0.25 && nx < 0.75)
        );

        if (inW) {
          rawData[pixelOffset] = accentColor[0];
          rawData[pixelOffset + 1] = accentColor[1];
          rawData[pixelOffset + 2] = accentColor[2];
          rawData[pixelOffset + 3] = 255;
        } else {
          rawData[pixelOffset] = primaryColor[0];
          rawData[pixelOffset + 1] = primaryColor[1];
          rawData[pixelOffset + 2] = primaryColor[2];
          rawData[pixelOffset + 3] = 255;
        }
      } else {
        // Transparent
        rawData[pixelOffset] = 0;
        rawData[pixelOffset + 1] = 0;
        rawData[pixelOffset + 2] = 0;
        rawData[pixelOffset + 3] = 0;
      }
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const dir = path.resolve('icons');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

for (const size of [16, 48, 128]) {
  const png = createPng(size);
  const outPath = path.join(dir, `icon-${size}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`Generated ${outPath} (${size}x${size}, ${png.length} bytes)`);
}
