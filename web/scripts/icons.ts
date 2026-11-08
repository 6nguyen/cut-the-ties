// urgency-and-readability §6: the favicon set, PWA icons and manifest, rendered from the one logo
// source with sharp. `npm run icons -w web` writes them into web/public; the output is committed and
// web/test/icons.test.ts fails when a regeneration differs from what is checked in.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
export const SOURCE = join(here, '..', 'src', 'assets', 'logo-1024.png');
export const PUBLIC = join(here, '..', 'public');

/** Every file the script writes, by public path. Sizes in CSS pixels. */
export const PNGS: Record<string, number> = { 'favicon-32.png': 32, 'apple-touch-icon.png': 180, 'icon-192.png': 192, 'icon-512.png': 512 };
/** The header mark: the artwork cut out of its white square (exterior transparent, cropped to the drawing), 2× for a 48 px slot. */
export const MARK = 'mark-96.png';
export const MARK_SIZE = 96;
export const ICO_SIZES = [16, 32, 48];

export const MANIFEST = {
  name: 'Cut the Ties',
  short_name: 'Cut the Ties',
  description: 'Find the two things you can do this week to cut US military ties with Israel.',
  start_url: '/',
  display: 'standalone',
  background_color: '#FAF7F0',
  theme_color: '#090A0F',
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
  ],
};

/** The source PNG carries a 22 KB text comment that libvips copies into every output; drop text chunks so a 32 px icon is 1-2 KB. */
export function stripText(png: Buffer): Buffer {
  const parts: Buffer[] = [png.subarray(0, 8)];
  for (let o = 8; o < png.length; ) {
    const len = png.readUInt32BE(o);
    const type = png.toString('ascii', o + 4, o + 8);
    const end = o + 12 + len;
    if (!/^(tEXt|iTXt|zTXt)$/.test(type)) parts.push(png.subarray(o, end));
    o = end;
  }
  return Buffer.concat(parts);
}

async function png(size: number): Promise<Buffer> {
  return stripText(await sharp(SOURCE).resize(size, size, { kernel: 'lanczos3' }).png({ compressionLevel: 9, palette: true }).toBuffer());
}

/**
 * The source is an opaque white square with the circle-and-fists drawing inside it. Flood-fill the near-white
 * exterior from the edges to alpha 0 (the white inside the ring stays), crop to a square around the drawing
 * plus a 2% margin (shifted to stay inside the source) and resize. Returns an RGBA PNG.
 */
export async function cutout(size: number): Promise<Buffer> {
  const { data, info } = await sharp(SOURCE).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const white = (i: number) => data[i] > 236 && data[i + 1] > 236 && data[i + 2] > 236;
  const seen = new Uint8Array(w * h);
  const stack: number[] = [];
  const push = (x: number, y: number) => { const p = y * w + x; if (!seen[p] && white(p * 4)) { seen[p] = 1; stack.push(p); } };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
  while (stack.length) {
    const p = stack.pop()!;
    const x = p % w, y = (p - x) / w;
    data[p * 4 + 3] = 0;
    if (x > 0) push(x - 1, y);
    if (x < w - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < h - 1) push(x, y + 1);
  }
  let minx = w, maxx = -1, miny = h, maxy = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3]) { if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
  const side = Math.max(maxx - minx, maxy - miny) + 1;
  const margin = Math.round(side * 0.02);
  const box = side + 2 * margin;
  const clamp = (v: number, max: number) => Math.min(Math.max(0, v), max);
  const left = clamp(Math.round((minx + maxx) / 2 - box / 2), w - box), top = clamp(Math.round((miny + maxy) / 2 - box / 2), h - box);
  return stripText(await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left, top, width: box, height: box })
    .resize(size, size, { kernel: 'lanczos3' }).png({ compressionLevel: 9, palette: true }).toBuffer());
}

/** An ICO container holding PNG-encoded images (every browser since 2010 reads them); 6-byte header, 16-byte entries, then the images. */
export function ico(images: { size: number; data: Buffer }[]): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);
  const dir = Buffer.alloc(16 * images.length);
  let offset = 6 + dir.length;
  images.forEach((im, i) => {
    const e = i * 16;
    dir.writeUInt8(im.size === 256 ? 0 : im.size, e); // width (0 means 256)
    dir.writeUInt8(im.size === 256 ? 0 : im.size, e + 1); // height
    dir.writeUInt8(0, e + 2); // colour count
    dir.writeUInt8(0, e + 3); // reserved
    dir.writeUInt16LE(1, e + 4); // planes
    dir.writeUInt16LE(32, e + 6); // bits per pixel
    dir.writeUInt32LE(im.data.length, e + 8);
    dir.writeUInt32LE(offset, e + 12);
    offset += im.data.length;
  });
  return Buffer.concat([header, dir, ...images.map((im) => im.data)]);
}

/** Render the whole set into memory: {public path → bytes}. */
export async function renderIcons(): Promise<Record<string, Buffer>> {
  const out: Record<string, Buffer> = {};
  for (const [name, size] of Object.entries(PNGS)) out[name] = await png(size);
  out[MARK] = await cutout(MARK_SIZE);
  out['favicon.ico'] = ico(await Promise.all(ICO_SIZES.map(async (size) => ({ size, data: await png(size) }))));
  out['site.webmanifest'] = Buffer.from(`${JSON.stringify(MANIFEST, null, 2)}\n`);
  return out;
}

export async function writeIcons(dir = PUBLIC): Promise<string[]> {
  mkdirSync(dir, { recursive: true });
  const files = await renderIcons();
  for (const [name, data] of Object.entries(files)) writeFileSync(join(dir, name), data);
  return Object.keys(files);
}

if (process.argv[1] && /icons\.ts$/.test(process.argv[1])) {
  writeIcons().then((names) => console.log(`web/public: ${names.join(', ')}`));
}
