// site-imagery §1: the image policy. A photo of a person or a real place can never be generated, a generated
// image can never pass as a photograph, and every image a page shows has a sourced, licensed manifest row.
import { describe, expect, it } from 'vitest';
import { readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import sharp from 'sharp';
import { readFileSync as readText } from 'node:fs';
import { parseCsv as csvRows } from '@worker/load';
import { pickBadge, publishedGoals } from './goals';
import { PORTRAIT, hasPortraitFile, portraitIds } from './images';
import { CARD, WEB_ROOT, originalPath, sharpTreatment } from './images';
import { existsSync } from 'node:fs';
import { BAND, FILE_NAMES, HERO, heroWidths, LICENCES, MANIFEST, PHOTO_OUTPUT, TREATMENT, fitWidths, creditLine, credits, creditsFor, imageIdFor, pageSources, rowFor, sourceName, usedIds, validate, type ImageRow } from './images';

const DIR = fileURLToPath(new URL('../assets/img/', import.meta.url));
const good: ImageRow = { id: 'x', file: 'x.jpg', alt: 'A room', subject: 'place', source_url: 'https://example.gov/x', author: 'An agency', licence: 'us-gov' };
const without = (key: keyof ImageRow) => { const r: Record<string, unknown> = { ...good }; delete r[key]; return r; };

describe('manifest policy', () => {
  it('passes for the committed manifest and a well-formed row', () => {
    expect(validate(MANIFEST)).toEqual([]);
    expect(validate([good])).toEqual([]);
  });

  it.each(['source_url', 'author', 'licence', 'alt'] as const)('names the row that has no %s', (field) => {
    expect(validate([good, { ...without(field), id: 'bad-row' }])).toEqual([`image "bad-row": missing ${field}`]);
  });

  it('accepts only the five licences', () => {
    expect([...LICENCES]).toEqual(['us-gov', 'pd', 'cc0', 'cc-by', 'ai']);
    for (const licence of ['cc-by-sa', 'cc-by-nc', 'cc-by-nd', 'getty', 'unsplash']) {
      expect(validate([{ ...good, licence }])).toEqual([`image "x": licence "${licence}" is not one of us-gov, pd, cc0, cc-by, ai`]);
    }
  });

  it.each(['person', 'place'] as const)('refuses a generated %s', (subject) => {
    const errors = validate([{ ...good, subject, licence: 'ai', generator: 'A model', prompt: 'a prompt' }]);
    expect(errors).toEqual([`image "x": a ${subject} may not be licence ai; use a real photograph`]);
  });

  it('lets a generated scene or texture through only with its generator and prompt', () => {
    expect(validate([{ ...good, subject: 'scene', licence: 'ai', generator: 'A model', prompt: 'a prompt' }])).toEqual([]);
    expect(validate([{ ...good, subject: 'texture', licence: 'ai' }])).toEqual(['image "x": licence ai needs generator', 'image "x": licence ai needs prompt']);
  });

  it('needs the credit line on a CC BY row, one of file or dir, a known subject and an https source', () => {
    expect(validate([{ ...good, licence: 'cc-by' }])).toEqual(['image "x": licence cc-by needs the credit line']);
    expect(validate([{ ...good, licence: 'cc-by', credit: 'Photo: A. Person' }])).toEqual([]);
    expect(validate([without('file')])).toEqual(['image "x": needs exactly one of file or dir']);
    expect(validate([{ ...good, dir: '../portraits' }])).toEqual(['image "x": needs exactly one of file or dir']);
    expect(validate([{ ...good, subject: 'building' }])).toEqual(['image "x": subject must be one of place, person, scene, texture']);
    expect(validate([{ ...good, source_url: 'http://example.gov/x' }])).toEqual(['image "x": source_url must be an https link']);
    expect(validate([good, good])).toEqual(['image "x": duplicate id']);
    expect(validate([{ ...good, taken: 'March 2022' }])).toEqual(['image "x": taken must be YYYY-MM-DD']);
  });

  it('v1 holds no generated image, and the portraits row is a person row from a government source', () => {
    expect(MANIFEST.filter((r) => r.licence === 'ai')).toEqual([]);
    expect(rowFor('portraits')).toMatchObject({ dir: '../portraits', subject: 'person', licence: 'us-gov', source_url: 'https://github.com/unitedstates/images' });
  });
});

describe('library files', () => {
  const rows = MANIFEST.filter((r) => r.file);

  it('has the starting set, one row per file and one file per row', () => {
    expect(rows.map((r) => r.id)).toEqual(['capitol-dome-dusk', 'house-floor', 'senate-chamber', 'hasc-hearing-room', 'state-capitol']);
    const onDisk = readdirSync(DIR).filter((f) => f !== 'manifest.yaml').sort();
    expect(rows.map((r) => r.file!).sort()).toEqual(onDisk);
    expect([...FILE_NAMES]).toEqual(onDisk);
  });

  it('keeps every original a JPEG or PNG within 2000 px and 600 KB', async () => {
    for (const r of rows) {
      const path = join(DIR, r.file!);
      const meta = await sharp(path).metadata();
      expect(['jpeg', 'png'], r.id).toContain(meta.format);
      expect(Math.max(meta.width ?? 0, meta.height ?? 0), `${r.id} long side`).toBeLessThanOrEqual(2000);
      expect(statSync(path).size, `${r.id} bytes`).toBeLessThanOrEqual(600 * 1024);
    }
  });
});

describe('images in use', () => {
  it('reads literal Photo ids from page sources and nothing else', () => {
    const src = [
      '<Photo id="capitol-dome-dusk" widths={[640]} sizes="100vw" eager />',
      `<section><Photo\n  widths={[320]}\n  id={'state-capitol'} sizes="50vw" /></section>`,
      '<div id="capitol">no photo here</div><Photograph id="house-floor" />',
    ];
    expect(usedIds(src)).toEqual(['capitol-dome-dusk', 'state-capitol']);
    expect(usedIds(['<p>plain page</p>'], ['house-floor'])).toEqual([]);
  });

  it('counts the goals’ images once a page resolves an image per goal', () => {
    expect(usedIds(['<Photo id={imageIdFor(goal)} widths={[640]} sizes="100vw" />'], ['house-floor', 'house-floor', 'state-capitol'])).toEqual(['house-floor', 'state-capitol']);
  });

  it('every image the pages reference has a manifest row, and the credits list exactly those', () => {
    const goals = publishedGoals();
    const used = usedIds(Object.values(pageSources()), goals.map(imageIdFor));
    for (const id of used) expect(rowFor(id).id).toBe(id);
    expect(Object.keys(pageSources()).some((p) => p.endsWith('/pages/about.astro'))).toBe(true);
    expect(credits(goals).map((c) => c.id).filter((id) => id !== 'portraits').sort()).toEqual([...used].sort());
    expect(() => creditsFor(['not-in-the-manifest'])).toThrow('image "not-in-the-manifest" has no row');
  });
});

describe('credit lines', () => {
  it('is empty when no image is in use', () => {
    expect(creditsFor([])).toEqual([]);
  });

  it('writes "<alt>: <author>, <source> (<licence>)" in manifest order, with the source link', () => {
    const lines = creditsFor(['state-capitol', 'capitol-dome-dusk']);
    expect(lines.map((l) => l.id)).toEqual(['capitol-dome-dusk', 'state-capitol']);
    expect(lines[0]!.text).toBe('The US Capitol lit at dusk under a clouded sky, seen from the Library of Congress: Architect of the Capitol, Wikimedia Commons (US government work, public domain)');
    expect(lines[1]).toMatchObject({ author: 'Aschbren', source: 'Wikimedia Commons', licence: 'cc0', generated: false, source_url: 'https://commons.wikimedia.org/wiki/File:Minnesota_State_Capitol_(October_2024).jpg' });
  });

  it('shows the credit line a source asks for instead of the author, and names an unknown host plainly', () => {
    expect(creditLine({ ...good, licence: 'cc-by', author: 'A. Person', credit: 'Photo: A. Person / Agency' }).text).toBe('A room: Photo: A. Person / Agency, example.gov (CC BY)');
    expect(sourceName('https://www.aoc.gov/x')).toBe('aoc.gov');
  });

  it('says a generated image is generated and promises no generated person or place', () => {
    const line = creditLine({ ...good, subject: 'scene', licence: 'ai', generator: 'A model', prompt: 'a prompt' });
    expect(line.generated).toBe(true);
    expect(line.text).toBe('A room: illustration generated with A model; no photo of a person or a real place on this site is generated.');
  });
});

describe('goal images', () => {
  const goal = (category: 'federal_vote' | 'leadership' | 'state' | 'electoral', eligibility = '{}', image?: string) => ({ category, eligibility, image });

  it('uses the image field first, then the category default', () => {
    expect(imageIdFor(goal('federal_vote'))).toBe('capitol-dome-dusk');
    expect(imageIdFor(goal('electoral'))).toBe('capitol-dome-dusk');
    expect(imageIdFor(goal('state'))).toBe('state-capitol');
    expect(imageIdFor(goal('leadership', '{"house": {"caucus": "D"}}'))).toBe('house-floor');
    expect(imageIdFor(goal('leadership', '{"senator": {"caucus": "D"}}'))).toBe('senate-chamber');
    expect(imageIdFor(goal('federal_vote', '{}', 'hasc-hearing-room'))).toBe('hasc-hearing-room');
    expect(() => imageIdFor(goal('state', '{}', 'missing-photo'))).toThrow('image "missing-photo" has no row');
  });

  it('gives every published goal a photo that has a file', () => {
    for (const g of publishedGoals()) expect(rowFor(imageIdFor(g)).file, g.slug).toBeTruthy();
  });
});

describe('treatment', () => {
  it('is the ink treatment the spec names', () => {
    expect(TREATMENT.filter).toBe(`grayscale(${String(TREATMENT.gray).replace(/^0/, '')}) contrast(${TREATMENT.contrast}) brightness(${String(TREATMENT.brightness).replace(/^0/, '')})`);
    expect(TREATMENT).toMatchObject({ gray: 0.35, contrast: 1.15, brightness: 0.95, ink: '#090A0F', across: [1, 0.85, 0.4], up: { foot: 1, head: 0.4 } });
  });
});

// site-imagery §2: the slots' widths, the hero original and the preload link.
describe('photo output', () => {
  it('never upscales: widths above the original are dropped, and a file narrower than every width serves its own', () => {
    expect(fitWidths(2000, [1920, 640, 960, 1440, 640])).toEqual([640, 960, 1440, 1920]);
    expect(fitWidths(946, [480, 768, 1440])).toEqual([480, 768]);
    expect(fitWidths(400, [480, 768])).toEqual([400]);
  });

  it('encodes AVIF, then WebP, with a JPEG fallback; the card band is 480 and 768 px at a lower quality', () => {
    expect(PHOTO_OUTPUT).toEqual({ formats: ['avif', 'webp'], fallback: 'jpg', quality: 30 });
    expect(BAND).toEqual({ widths: [480, 768], quality: 22 });
  });

  it('the landing hero original is landscape and at least as wide as the widest hero source', async () => {
    const meta = await sharp(join(DIR, rowFor('capitol-dome-dusk').file!)).metadata();
    expect(meta.width!).toBeGreaterThanOrEqual(1920);
    expect(meta.width!).toBeGreaterThan(meta.height!);
  });

  it('every original a goal can show covers both card-band widths', async () => {
    for (const r of MANIFEST.filter((x) => x.file)) expect((await sharp(join(DIR, r.file!)).metadata()).width!, r.id).toBeGreaterThanOrEqual(768);
  });

  it('the landing preloads the image its hero shows, eagerly, and its cards and the result cards take the goal image', () => {
    const page = (name: string) => Object.entries(pageSources()).find(([p]) => p.endsWith(`/pages/${name}.astro`))![1];
    const hero = /<Photo id="([^"]+)"[^>]*\beager\b/.exec(page('index'))?.[1];
    expect(hero).toBe('capitol-dome-dusk');
    expect(page('index')).toContain(`imageById('${hero}')`);
    expect(page('index')).toMatch(/<link slot="head" rel="preload" as="image" type="image\/avif"[^>]*fetchpriority="high"/);
    expect(page('index')).toContain('<Photo id={imageIdFor(g)} widths={[...BAND.widths]} sizes={cardSizes} quality={BAND.quality} />');
    // §2.1: the phone hero is dimmed so the paragraph over the photo's lightest side keeps 4.5:1.
    expect(page('index')).toContain('<Photo id="capitol-dome-dusk" widths={heroWidths} sizes="100vw" eager class="hero-photo" />');
    expect(page('index')).toMatch(/@media \(max-width: 767px\) \{\s*:global\(\.hero-photo\) \{ filter: brightness\(0\.75\); \}/);
    expect(page('results')).toContain('<template data-photo-band={id}><Photo id={id} widths={[...BAND.widths]} sizes={bandSizes} quality={BAND.quality} /></template>');
    expect(usedIds([page('results')], ['state-capitol'])).toEqual(['state-capitol']);
  });
});

// site-imagery §3: goal pages.
describe('goal pages', () => {
  const page = (name: string) => Object.entries(pageSources()).find(([p]) => p.endsWith(`/pages/${name}.astro`))![1];
  const image = (slug: string) => imageIdFor(publishedGoals().find((g) => g.slug === slug)!);

  it('a goal\'s image field wins over its category default: the NDAA goal shows the hearing room', () => {
    expect(image('ndaa-1217')).toBe('hasc-hearing-room');
    expect(image('house-caucus')).toBe('house-floor');
    expect(image('senate-leader')).toBe('senate-chamber');
    expect(image('state-bonds')).toBe('state-capitol');
  });

  it('the hero offers the four hero widths, plus the file\'s own width when it is narrower than the widest, never a wider one', () => {
    expect(HERO).toEqual({ widths: [640, 960, 1440, 1920], sizes: '(max-width: 767px) 49vw, 100vw' });
    expect(heroWidths(2000)).toEqual([640, 960, 1440, 1920]);
    expect(heroWidths(1920)).toEqual([640, 960, 1440, 1920]);
    expect(heroWidths(1080)).toEqual([640, 960, 1080]);
    expect(heroWidths(946)).toEqual([640, 946]);
    expect(heroWidths(500)).toEqual([500]);
  });

  it('every overview card carries the 16:9 band of its goal, and the header grows instead of clipping a long title', () => {
    expect(page('goals/index')).toContain('<Photo id={imageIdFor(g)} widths={[...BAND.widths]} sizes={cardSizes} quality={BAND.quality} eager={i === 0} />'); // only the first band is eager: it is the LCP element
    expect(page('goals/index')).toMatch(/hero-gradient text-newsprint p-5 aspect-video overflow-clip /);
    expect(page('goals/index').match(/<Photo\b/g)).toHaveLength(1); // the Outcomes strip stays text-only
  });

  it.each(['goals/[slug]', 'goals/[slug]/prep'])('%s shows the goal\'s photo eagerly, preloads the same files and dims it below 1024 px', (name) => {
    const src = page(name);
    expect(src).toContain('<Photo id={imageIdFor(goal)} widths={heroW} sizes={HERO.sizes} eager class="hero-photo" />');
    expect(src).toContain('const heroW = heroWidths(heroFile.width);');
    expect(src).toContain("getImage({ src: heroFile, format: 'avif', widths: heroW, quality: PHOTO_OUTPUT.quality })");
    expect(src).toMatch(/<link slot="head" rel="preload" as="image" type="image\/avif" imagesrcset=\{heroPreload\.srcSet\.attribute\} imagesizes=\{HERO\.sizes\} fetchpriority="high" \/>/);
    expect(src).toMatch(/@media \(max-width: 1023px\) \{\s*:global\(\.hero-photo\) \{ filter: brightness\(0\.75\); \}/);
    expect(src.match(/<Photo\b/g)).toHaveLength(1);
  });

  it('the act, receipt and whip pages under a goal show no photo', () => {
    const under = Object.entries(pageSources()).filter(([p]) => /\/pages\/goals\/\[slug\]\/(?!prep\.astro$)/.test(p));
    expect(under.length).toBeGreaterThan(0);
    for (const [p, src] of under) expect(src, p).not.toMatch(/<Photo\b|imageFor\(|imageIdFor\(/);
  });

  it('with the hearing room on a goal page, the credits list every photo file and the portraits row', () => {
    expect(credits(publishedGoals()).map((c) => c.id)).toEqual(MANIFEST.filter((r) => r.file || r.id === 'portraits').map((r) => r.id));
  });
});

describe('site-imagery §4: portraits', () => {
  const sitting = csvRows(readText(join(process.cwd(), '..', 'data', 'members.csv'), 'utf8')).filter((r) => !r.left_office).map((r) => r.bioguide_id);
  const missing = JSON.parse(readText(join(PORTRAIT.dir, 'missing.json'), 'utf8')) as string[];

  it('every sitting member has a portrait file or is listed in missing.json, never both', () => {
    const have = new Set(portraitIds());
    const none = new Set(missing);
    expect(have.size).toBeGreaterThan(500);
    expect(sitting.filter((id) => have.has(id) === none.has(id))).toEqual([]);
    expect(missing.filter((id) => !sitting.includes(id))).toEqual([]);
    expect([...missing].sort()).toEqual(missing);
    expect(hasPortraitFile(portraitIds()[0])).toBe(true);
    for (const id of [...missing, 'Z999999', '', null, undefined]) expect(hasPortraitFile(id)).toBe(false);
  });

  it('every file is a 160×200 WebP of at most 8 KB and the directory stays under 4.5 MB', async () => {
    let total = 0;
    const bad: string[] = [];
    for (const id of portraitIds()) {
      const file = join(PORTRAIT.dir, `${id}.webp`);
      const size = statSync(file).size;
      total += size;
      const meta = await sharp(file).metadata();
      if (size > PORTRAIT.maxBytes || meta.format !== 'webp' || meta.width !== PORTRAIT.width || meta.height !== PORTRAIT.height) bad.push(`${id}: ${size} B ${meta.format} ${meta.width}x${meta.height}`);
    }
    expect(bad).toEqual([]);
    expect(total).toBeLessThanOrEqual(PORTRAIT.maxTotalBytes);
  });

  it('the portraits row earns its /about credit line once the directory holds a file', () => {
    expect(credits([]).map((c) => c.id)).toContain('portraits');
  });

  it('a pick shows a portrait for a member with a file, that party\'s initial badge without one, a hazard initial without a bioguide_id', () => {
    const roster = [{ bioguide_id: 'P000145', party: 'D' as const }, { bioguide_id: 'A000383', party: 'R' as const }];
    const pick = (name: string, id?: string) => ({ name, rationale: 'r', source_url: 'https://x', ...(id ? { bioguide_id: id } : {}) });
    const hasFile = (id: string) => id !== 'A000383';
    expect(pickBadge(pick('Alex Padilla', 'P000145'), roster, hasFile)).toEqual({ initial: 'A', party: 'D', portrait: true });
    expect(pickBadge(pick('markwayne mullin', 'A000383'), roster, hasFile)).toEqual({ initial: 'M', party: 'R', portrait: false });
    expect(pickBadge(pick(' Someone Else'), roster, hasFile)).toEqual({ initial: 'S', party: null, portrait: false });
  });

  it('the member hero and the prep picks draw the portrait over a badge, at their sizes, from the site\'s own origin', () => {
    const page = (end: string) => Object.entries(pageSources()).find(([k]) => k.endsWith(end))![1];
    const hero = page('pages/m/[id].astro');
    const prep = page('pages/goals/[slug]/prep.astro');
    expect(hero).toContain('width="120" height="150"');
    expect(hero).toContain('TREATMENT.contrast');
    expect(hero).toContain('{portrait && (');
    expect(hero).not.toContain('btn-ghost">District office');
    expect(prep).toContain('width="80" height="100"');
    for (const src of [hero, prep]) {
      expect(src).toContain('src={portraitSrc(');
      expect(src).toContain("onload=\"this.parentNode.dataset.loaded='1'\"");
      expect(src).not.toMatch(/unitedstates\.github\.io|bioguide\.congress\.gov\/bioguide\/photo/);
    }
  });
});

describe('site-imagery §5: what the share-card renderer reads', () => {
  it('every photo row resolves to its original on disk; a dir row and an unknown id throw', () => {
    for (const row of MANIFEST.filter((r) => r.file)) {
      expect(originalPath(row.id)).toBe(join(WEB_ROOT, 'src', 'assets', 'img', row.file!));
      expect(existsSync(originalPath(row.id)), row.id).toBe(true);
    }
    expect(() => originalPath('portraits')).toThrow(/dir row/);
    expect(() => originalPath('no-such-photo')).toThrow(/manifest/);
  });

  it('the sharp numbers are the Photo filter: grey stays grey, mid-grey is the contrast pivot', () => {
    const t = sharpTreatment();
    for (const row of t.recomb) expect(row[0] + row[1] + row[2]).toBeCloseTo(1, 10);
    // grayscale(1) would make every row the luma weights; at TREATMENT.gray the red row keeps 1 - gray of its own red.
    expect(t.recomb[0][0]).toBeCloseTo(0.2126 + 0.7874 * (1 - TREATMENT.gray), 10);
    expect(t.linear[0]).toBeCloseTo(TREATMENT.contrast * TREATMENT.brightness, 10);
    expect(t.linear[0] * 127.5 + t.linear[1]).toBeCloseTo(127.5 * TREATMENT.brightness, 10);
    expect(TREATMENT.filter).toBe(`grayscale(${String(TREATMENT.gray).replace(/^0/, '')}) contrast(${TREATMENT.contrast}) brightness(${String(TREATMENT.brightness).replace(/^0/, '')})`);
  });

  it('the card is an 8-bit palette PNG: sharp writes 16 colours for `colours` of 128 or fewer', () => {
    expect(CARD.png.palette).toBe(true);
    expect(CARD.png.colours).toBeGreaterThan(128);
    expect([CARD.width, CARD.height, CARD.maxBytes]).toEqual([1200, 630, 200_000]);
  });
});
