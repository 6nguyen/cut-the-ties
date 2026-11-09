// site-imagery §5: share cards carry the goal's photo behind the ink gradient. The text block does not move, the
// file stays a PNG under the budget, and a card rendered without a photo is the file it was before photos.
import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { join } from 'node:path';
import { BACKDROP, GET as goalCard, cardSvg, inkLayers, renderCard } from '../pages/goals/[slug]/card.png';
import { GET as siteCard } from '../pages/card.png';
import { GET as memberCard } from '../pages/m/[id]/card.png';
import { publishedGoals } from './goals';
import { members } from './members';
import { CARD, MANIFEST, TREATMENT, imageIdFor } from './images';

const SLOW = 120_000;
const goals = publishedGoals();
const ndaa = goals.find((g) => g.slug === 'ndaa-1217')!;
const photoIds = MANIFEST.filter((r) => r.file).map((r) => r.id);

/** `renderCard` as it was before §5. A hash would pin one machine's fonts; this pins the photo-free path on any. */
async function renderBefore(svg: string): Promise<Buffer> {
  const mark = await sharp(join(process.cwd(), 'public', 'icon-192.png')).resize(120, 120).png().toBuffer();
  return sharp(Buffer.from(svg)).composite([{ input: mark, top: 36, left: 1200 - 72 - 120 }]).png().toBuffer();
}
const body = async (res: Response | Promise<Response>) => Buffer.from(await (await res).arrayBuffer());
const rgb = (png: Buffer) => sharp(png).removeAlpha().toColourspace('srgb').raw().toBuffer();
const at = (x: number, y: number) => (y * CARD.width + x) * 3;

// WCAG 2 relative luminance and contrast ratio.
const channel = (v: number) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const luminance = (r: number, g: number, b: number) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

const NEWSPRINT = [0xfa, 0xf7, 0xf0] as const;
const HAZARD = [0xfa, 0xcc, 0x15] as const;
/** Where `cardSvg` can put each text element, whatever the title's length, and the AA ratio its size needs. */
const BLOCKS = [
  { name: 'category line (26 px bold)', box: [72, 90, 700, 128], ink: HAZARD, min: 4.5 },
  { name: 'title (84 or 96 px bold, large text)', box: [72, 160, 1128, 450], ink: NEWSPRINT, min: 3 },
  { name: 'what-we-want line (28 px)', box: [72, 544, 1128, 584], ink: NEWSPRINT, min: 4.5 },
] as const;

describe('site-imagery §5: the photo card', () => {
  it('a goal card with a photo is a 1200×630 PNG within the budget and is not the photo-free render', async () => {
    const svg = cardSvg(ndaa);
    const [plain, photo] = await Promise.all([renderCard(svg), renderCard(svg, imageIdFor(ndaa))]);
    const meta = await sharp(photo).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(['png', CARD.width, CARD.height]);
    expect(photo.length).toBeLessThanOrEqual(CARD.maxBytes);
    expect(photo.equals(plain)).toBe(false);
    expect(imageIdFor(ndaa)).toBe('hasc-hearing-room');
  }, SLOW);

  it('without an id the card is byte for byte what it was before photos', async () => {
    for (const goal of [ndaa, goals.find((g) => g.category === 'leadership')!]) {
      const svg = cardSvg(goal);
      expect((await renderCard(svg)).equals(await renderBefore(svg))).toBe(true);
    }
  }, SLOW);

  it('only the ground changes: the card has one BACKDROP, and the gradients read the Photo treatment', () => {
    const svg = cardSvg(ndaa);
    expect(svg.split(BACKDROP)).toHaveLength(2);
    expect(svg.replace(BACKDROP, '')).toBe(svg.replace(BACKDROP, inkLayers()).replace(inkLayers(), ''));
    const layers = inkLayers();
    for (const alpha of [...TREATMENT.across, TREATMENT.up.foot, TREATMENT.up.head]) expect(layers).toContain(`stop-opacity="${alpha}"`);
    expect(layers).toContain(`stop-color="${TREATMENT.ink}"`);
  });

  it('a card with no BACKDROP cannot take a photo', async () => {
    await expect(renderCard('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"/>', 'capitol-dome-dusk')).rejects.toThrow(/BACKDROP/);
    await expect(renderCard(cardSvg(ndaa), 'no-such-photo')).rejects.toThrow(/manifest/);
  });

  it('every published goal card and /card.png are PNGs of 1200×630 within 200 KB', async () => {
    expect(CARD.maxBytes).toBe(200_000);
    const cards: [string, Buffer][] = [['/card.png', await body(siteCard({} as never))]];
    for (const goal of goals) cards.push([`/goals/${goal.slug}/card.png`, await body(goalCard({ props: { goal } } as never))]);
    expect(cards.length).toBeGreaterThan(1);
    for (const [url, png] of cards) {
      const meta = await sharp(png).metadata();
      expect([url, meta.format, meta.width, meta.height]).toEqual([url, 'png', CARD.width, CARD.height]);
      expect(png.length, url).toBeLessThanOrEqual(CARD.maxBytes);
      expect(meta.paletteBitDepth, url).toBe(8);
    }
  }, SLOW);

  it('text passes AA over the lightest point of every photo in the library', async () => {
    const ground = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">${BACKDROP}</svg>`;
    for (const id of photoIds) {
      const px = await rgb(await renderCard(ground, id));
      for (const block of BLOCKS) {
        const [x0, y0, x1, y1] = block.box;
        const ink = luminance(...block.ink);
        let worst = Infinity;
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = at(x, y); worst = Math.min(worst, contrast(ink, luminance(px[i], px[i + 1], px[i + 2]))); }
        expect(worst, `${id}: ${block.name}`).toBeGreaterThanOrEqual(block.min);
      }
    }
  }, SLOW);

  it('the palette keeps the title clean: glyph interiors hold the title colour on every photo', async () => {
    for (const goal of goals) {
      const svg = cardSvg(goal);
      const [plain, photo] = await Promise.all([rgb(await renderCard(svg)), rgb(await renderCard(svg, imageIdFor(goal)))]);
      let inside = 0;
      let held = 0;
      for (let y = 160; y < 450; y++) for (let x = 72; x < 1128; x++) {
        const i = at(x, y);
        if (plain[i] !== NEWSPRINT[0] || plain[i + 1] !== NEWSPRINT[1] || plain[i + 2] !== NEWSPRINT[2]) continue;
        inside++;
        if (Math.abs(photo[i] - NEWSPRINT[0]) <= 12 && Math.abs(photo[i + 1] - NEWSPRINT[1]) <= 12 && Math.abs(photo[i + 2] - NEWSPRINT[2]) <= 12) held++;
      }
      expect(inside, goal.slug).toBeGreaterThan(5000);
      expect(held / inside, goal.slug).toBeGreaterThanOrEqual(0.99);
    }
  }, SLOW);

  it('member cards stay photo-free: a truecolour PNG, no palette', async () => {
    const meta = await sharp(await body(memberCard({ props: { member: members()[0] } } as never))).metadata();
    expect([meta.format, meta.width, meta.height, meta.paletteBitDepth]).toEqual(['png', CARD.width, CARD.height, undefined]);
  }, SLOW);
});
