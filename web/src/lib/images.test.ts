// site-imagery §1: the image policy. A photo of a person or a real place can never be generated, a generated
// image can never pass as a photograph, and every image a page shows has a sourced, licensed manifest row.
import { describe, expect, it } from 'vitest';
import { readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import sharp from 'sharp';
import { publishedGoals } from './goals';
import { BAND, FILE_NAMES, LICENCES, MANIFEST, PHOTO_OUTPUT, TREATMENT, fitWidths, creditLine, credits, creditsFor, imageIdFor, pageSources, rowFor, sourceName, usedIds, validate, type ImageRow } from './images';

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
