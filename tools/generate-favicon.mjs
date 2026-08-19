/**
 * Generates the BeatEmPie favicon set from the hand-authored 16x16 pixel-art grid below.
 *
 *   node tools/generate-favicon.mjs public          # write the icons
 *   node tools/generate-favicon.mjs public /tmp/x   # ...and 16px + 20x zoom previews
 *
 * Every output is a nearest-neighbour blow-up of the one grid, so re-run this after
 * editing GRID and the whole set stays in sync and pixel-crisp at each size.
 */
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';

const OUT = process.argv[2];
const PREVIEW = process.argv[3];

// --- palette -----------------------------------------------------------------
// Crust + tin hues are lifted from public/assets/sprites/pies/pie_cherry.png
// (#ffb470 crust, #c3fdfe tin); navy matches the page theme-color #0b0d2b.
const P = {
  '.': '#0b0d2b', // navy plate (icon background)
  ',': '#161a44', // navy, one step lighter (inner bevel)
  'l': '#ffe0ab', // crust highlight
  'c': '#ffb470', // crust mid
  'C': '#e0873f', // crust shadow
  'o': '#8f4a1e', // crust/tin division
  'w': '#e6ffff', // tin rim highlight
  't': '#c3fdfe', // tin mid
  'T': '#7fb3ba', // tin shadow
  'd': '#46707a', // tin edge
  'h': '#ff8ea0', // cherry highlight
  'r': '#f8384f', // cherry mid
  'R': '#b81c33', // cherry shadow
  ' ': null,      // transparent
};

// --- 16x16 grid --------------------------------------------------------------
const GRID = [
  ' .............. ',
  '................',
  '.......hr.......',
  '......rrrR......',
  '....llcllcll....',
  '...cllcllcllC...',
  '..ccllcllcllcC..',
  '..ccllcllcllcC..',
  '..CcllcllcllCC..',
  '..CCCCCCCCCCCC..',
  '.dwwwwwwwwwwwwd.',
  '.dttttttttttttd.',
  '..dTTTTTTTTTTd..',
  '...dddddddddd...',
  '................',
  ' .............. ',
];

if (GRID.length !== 16) throw new Error('grid must be 16 rows, got ' + GRID.length);
GRID.forEach((row, y) => {
  if (row.length !== 16) throw new Error(`row ${y} is ${row.length} chars, need 16`);
  for (const ch of row) if (!(ch in P)) throw new Error(`row ${y}: unknown char "${ch}"`);
});

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

/** Nearest-neighbour render of the grid at `scale`, optionally padded to `size`. */
function render(scale, size = 16 * scale, opaqueBg = null) {
  const px = 16 * scale;
  const pad = Math.floor((size - px) / 2);
  const buf = Buffer.alloc(size * size * 4);
  if (opaqueBg) {
    const [r, g, b] = hex(opaqueBg);
    for (let i = 0; i < size * size; i++) {
      buf[i * 4] = r; buf[i * 4 + 1] = g; buf[i * 4 + 2] = b; buf[i * 4 + 3] = 255;
    }
  }
  for (let gy = 0; gy < 16; gy++) {
    for (let gx = 0; gx < 16; gx++) {
      const c = P[GRID[gy][gx]];
      if (!c) continue;
      const [r, g, b] = hex(c);
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const x = pad + gx * scale + dx, y = pad + gy * scale + dy;
          if (x < 0 || y < 0 || x >= size || y >= size) continue;
          const i = (y * size + x) * 4;
          buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = 255;
        }
      }
    }
  }
  return { size, buf };
}

// --- PNG encoder -------------------------------------------------------------
const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return (b) => {
    let c = -1;
    for (const v of b) c = t[(c ^ v) & 255] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
  };
})();

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(CRC(body));
  return Buffer.concat([len, body, crc]);
}

function encodePNG({ size, buf }) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none — flat colour blocks compress fine
    buf.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- ICO packer (32-bit BMP entries — widest compatibility) -------------------
function bmpEntry({ size, buf }) {
  const header = Buffer.alloc(40);
  header.writeUInt32LE(40, 0);
  header.writeInt32LE(size, 4);
  header.writeInt32LE(size * 2, 8); // XOR + AND masks stacked
  header.writeUInt16LE(1, 12);
  header.writeUInt16LE(32, 14);
  const xor = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const s = (y * size + x) * 4;
      const d = ((size - 1 - y) * size + x) * 4; // BMP rows are bottom-up
      xor[d] = buf[s + 2]; xor[d + 1] = buf[s + 1]; xor[d + 2] = buf[s]; xor[d + 3] = buf[s + 3];
    }
  }
  const andStride = Math.ceil(size / 32) * 4;
  const and = Buffer.alloc(andStride * size); // all-zero = "use the alpha channel"
  return Buffer.concat([header, xor, and]);
}

function encodeICO(images) {
  const dir = Buffer.alloc(6);
  dir.writeUInt16LE(0, 0); dir.writeUInt16LE(1, 2); dir.writeUInt16LE(images.length, 4);
  const bodies = images.map(bmpEntry);
  let offset = 6 + images.length * 16;
  const entries = images.map((img, i) => {
    const e = Buffer.alloc(16);
    e[0] = img.size >= 256 ? 0 : img.size;
    e[1] = img.size >= 256 ? 0 : img.size;
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(bodies[i].length, 8);
    e.writeUInt32LE(offset, 12);
    offset += bodies[i].length;
    return e;
  });
  return Buffer.concat([dir, ...entries, ...bodies]);
}

// --- SVG (same grid, crisp at any size) --------------------------------------
function encodeSVG() {
  const rects = [];
  for (let y = 0; y < 16; y++) {
    let x = 0;
    while (x < 16) {
      const ch = GRID[y][x];
      let run = 1;
      while (x + run < 16 && GRID[y][x + run] === ch) run++;
      if (P[ch]) rects.push(`<rect x="${x}" y="${y}" width="${run}" height="1" fill="${P[ch]}"/>`);
      x += run;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges" role="img" aria-label="A magical pie">
<title>BeatEmPie</title>
${rects.join('\n')}
</svg>
`;
}

// --- emit --------------------------------------------------------------------
fs.mkdirSync(OUT, { recursive: true });
const w = (name, data) => {
  fs.writeFileSync(path.join(OUT, name), data);
  console.log(String(data.length).padStart(7), name);
};

w('favicon.ico', encodeICO([render(1), render(2), render(3)]));
w('favicon.svg', encodeSVG());
w('apple-touch-icon.png', encodePNG(render(11, 180, '#0b0d2b'))); // iOS rounds the corners itself
w('icon-192.png', encodePNG(render(12, 192, '#0b0d2b')));
w('icon-512.png', encodePNG(render(32, 512, '#0b0d2b')));
// Maskable icons get cropped to a circle, so keep the pie inside the centre 80%: 16*25=400 of 512.
w('icon-512-maskable.png', encodePNG(render(25, 512, '#0b0d2b')));

if (PREVIEW) {
  fs.writeFileSync(path.join(PREVIEW, 'preview-16.png'), encodePNG(render(1)));
  fs.writeFileSync(path.join(PREVIEW, 'preview-zoom.png'), encodePNG(render(20)));
  console.log('previews written');
}
