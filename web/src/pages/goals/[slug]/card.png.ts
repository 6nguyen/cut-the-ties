// §2.2 share card: one 1200×630 PNG per published goal, rendered at build from the goal row.
// site-imagery §5: the goal's photo sits behind the ink gradient; the text, bars and logo are where they were.
import type { APIRoute } from 'astro';
import sharp from 'sharp';
import { join } from 'node:path';
import { CATEGORY, publishedGoals, type Goal } from '../../../lib/goals';
import { CARD, TREATMENT, WEB_ROOT, imageIdFor, originalPath, sharpTreatment } from '../../../lib/images';

export function getStaticPaths() {
  return publishedGoals().map((g) => ({ params: { slug: g.slug }, props: { goal: g } }));
}

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Greedy wrap by character count; the condensed face averages ~0.45 em per glyph. */
export function wrap(text: string, max: number, lines: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const w of text.split(/\s+/)) {
    if ((line + ' ' + w).trim().length > max && line) { out.push(line); line = w; } else line = (line + ' ' + w).trim();
  }
  if (line) out.push(line);
  if (out.length > lines) { out.length = lines; out[lines - 1] = out[lines - 1].replace(/\s*\S*$/, '') + '…'; }
  return out;
}

/** The card's solid ground. With a photo under the card, `renderCard` swaps this one element for `inkLayers()`. */
export const BACKDROP = '<rect width="1200" height="630" fill="#090A0F"/>';

/** The two ink gradients `Photo.astro` draws over a photo, as SVG: `TREATMENT.across` left to right, then `TREATMENT.up` bottom to top. */
export function inkLayers(): string {
  const { ink, across: a, up: u } = TREATMENT;
  const stop = (offset: number, colour: string, alpha: number) => `<stop offset="${offset}" stop-color="${colour}" stop-opacity="${alpha}"/>`;
  return `<defs><linearGradient id="ink-across" x1="0" y1="0" x2="1" y2="0">${stop(0, ink, a[0])}${stop(0.5, ink, a[1])}${stop(1, ink, a[2])}</linearGradient>`
    + `<linearGradient id="ink-up" x1="0" y1="1" x2="0" y2="0">${stop(0, ink, u.foot)}${stop(0.5, ink, 0)}${stop(1, '#000', u.head)}</linearGradient></defs>`
    + `<rect width="${CARD.width}" height="${CARD.height}" fill="url(#ink-across)"/><rect width="${CARD.width}" height="${CARD.height}" fill="url(#ink-up)"/>`;
}

export function cardSvg(goal: Goal): string {
  const title = wrap(goal.title.toUpperCase(), 26, 3);
  const size = title.length === 3 ? 84 : 96;
  const lead = size * 1.02;
  const y0 = 330 - ((title.length - 1) * lead) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  ${BACKDROP}
  <rect x="0" y="0" width="1200" height="14" fill="#00E876"/>
  <text x="72" y="118" fill="#FACC15" font-family="'Space Mono', Menlo, monospace" font-size="26" font-weight="700" letter-spacing="2">${esc(CATEGORY[goal.category].toUpperCase())} · CUT THE TIES</text>
  ${title.map((l, i) => `<text x="72" y="${(y0 + i * lead).toFixed(0)}" fill="#FAF7F0" font-family="'Bebas Neue', Impact, 'Arial Narrow', 'Helvetica Neue', Arial, sans-serif" font-size="${size}" font-weight="700" letter-spacing="2">${esc(l)}</text>`).join('\n  ')}
  <rect x="72" y="520" width="1056" height="4" fill="#E11148"/>
  <text x="72" y="572" fill="#FAF7F0" font-family="Inter, 'Helvetica Neue', Arial, sans-serif" font-size="28">${esc(wrap(goal.what_we_want, 70, 1)[0])}</text>
</svg>`;
}

/**
 * urgency-and-readability §6: rasterise a card and stamp the logo mark (120 px, top-right, inside the 72 px margin).
 * site-imagery §5: with a manifest id the photo is the base layer (cover crop, the `Photo` treatment), then the ink
 * gradients in place of the solid ground, then the same text, bars and mark; the PNG is palette-encoded to stay
 * under `CARD.maxBytes`. Without an id the output is what it was before photos: same pipeline, same bytes.
 */
export async function renderCard(svg: string, imageId?: string): Promise<Buffer> {
  const mark = await sharp(join(WEB_ROOT, 'public', 'icon-192.png')).resize(120, 120).png().toBuffer();
  const stamp = { input: mark, top: 36, left: 1200 - 72 - 120 };
  if (!imageId) return sharp(Buffer.from(svg)).composite([stamp]).png().toBuffer();
  if (!svg.includes(BACKDROP)) throw new Error('renderCard: the card has no BACKDROP to put a photo behind');
  const t = sharpTreatment();
  // Treated on its own first: in one pipeline `sharp` would run `linear` after `composite`, over the text as well.
  const photo = await sharp(originalPath(imageId)).resize(CARD.width, CARD.height, { fit: 'cover', position: CARD.position }).removeAlpha()
    .recomb(t.recomb).linear(t.linear[0], t.linear[1]).raw().toBuffer({ resolveWithObject: true });
  return sharp(photo.data, { raw: photo.info })
    .composite([{ input: Buffer.from(svg.replace(BACKDROP, inkLayers())) }, stamp]).png({ ...CARD.png }).toBuffer();
}

export const GET: APIRoute = async ({ props }) => {
  const goal = (props as { goal: Goal }).goal;
  const png = await renderCard(cardSvg(goal), imageIdFor(goal));
  return new Response(new Uint8Array(png), { headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=86400' } });
};
