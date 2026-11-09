// site-imagery §1: the image library. `assets/img/manifest.yaml` is the only list of photos the site may show;
// this module checks it against the policy (every load, so a bad row stops the build with the row named),
// resolves an id or a goal to its file, and writes the `/about` credit lines for the images pages use.
import { parse } from 'yaml';
import type { ImageMetadata } from 'astro';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import manifestText from '../assets/img/manifest.yaml?raw';

export const LICENCES = ['us-gov', 'pd', 'cc0', 'cc-by', 'ai'] as const;
export const SUBJECTS = ['place', 'person', 'scene', 'texture'] as const;
export type Licence = (typeof LICENCES)[number];
export type Subject = (typeof SUBJECTS)[number];

export interface ImageRow {
  id: string;
  /** File name in `assets/img/`; every row has `file` or `dir`. */
  file?: string;
  /** A directory of files that share one source and licence (the portraits row). */
  dir?: string;
  alt: string;
  subject: Subject;
  source_url: string;
  author: string;
  licence: Licence;
  /** The credit line the source asks for; shown instead of `author` when set. Required for `cc-by`. */
  credit?: string;
  generator?: string;
  prompt?: string;
  taken?: string;
}

export interface CreditLine {
  id: string;
  alt: string;
  /** Who to credit: the row's `credit`, else its `author`. */
  author: string;
  source: string;
  source_url: string;
  licence: Licence;
  licence_label: string;
  /** True for an `ai` row; the page then prints `text` with no source link. */
  generated: boolean;
  /** The whole line as plain text. */
  text: string;
}

/** The ink treatment every photo gets; `Photo.astro` and the share-card renderer read the same numbers. */
export const TREATMENT = {
  gray: 0.35,
  contrast: 1.15,
  brightness: 0.95,
  filter: 'grayscale(.35) contrast(1.15) brightness(.95)',
  ink: '#090A0F',
  /** Left to right: ink alpha at 0%, 50% and 100% of the width. */
  across: [1, 0.85, 0.4],
  /** Bottom to top: ink at this alpha at the foot, clear in the middle, black at this alpha at the head. */
  up: { foot: 1, head: 0.4 },
} as const;

/** Encoder settings every photo slot uses unless it passes its own quality. The landing's preload link asks for the same AVIF files `Photo` does, so both read these. Quality is low on purpose: the ink layers cover most of each photo. */
export const PHOTO_OUTPUT = { formats: ['avif', 'webp'], fallback: 'jpg', quality: 30 } as const;
/** The 16:9 card band (landing goal cards, result cards): its widths and a lower quality, so the bands a phone loads with the landing fit the page's byte budget. */
export const BAND = { widths: [480, 768], quality: 22 } as const;
/** The full-bleed hero of a goal page and its prep page (the landing hero uses the same four widths). Under 768 px the slot is declared at half the screen: the text covers the whole photo there and the photo is dimmed, so a phone takes the 640 px file. */
export const HERO = { widths: [640, 960, 1440, 1920], sizes: '(max-width: 767px) 49vw, 100vw' } as const;
/** The widths a slot can serve from an original `original` px wide: unique, ascending, never wider than the file (no upscaling); the file's own width when none fits. */
export function fitWidths(original: number, widths: readonly number[]): number[] {
  const fit = [...new Set(widths.filter((w) => w > 0 && w <= original))].sort((a, b) => a - b);
  return fit.length ? fit : [original];
}
/** Hero widths for an original `original` px wide. A file narrower than the widest hero width also serves its own width, so a wide screen gets every pixel the file has instead of a smaller copy stretched further. */
export function heroWidths(original: number): number[] {
  return fitWidths(original, original < Math.max(...HERO.widths) ? [...HERO.widths, original] : HERO.widths);
}

const LICENCE_LABEL: Record<Licence, string> = {
  'us-gov': 'US government work, public domain',
  pd: 'public domain',
  cc0: 'CC0, public domain dedication',
  'cc-by': 'CC BY',
  ai: 'generated illustration',
};
const SOURCE_NAME: Record<string, string> = { 'commons.wikimedia.org': 'Wikimedia Commons', 'github.com': 'GitHub', 'www.dvidshub.net': 'DVIDS', 'www.flickr.com': 'Flickr' };
const REQUIRED = ['alt', 'source_url', 'author', 'licence'] as const;
const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

/** Policy check. Returns one message per problem, each starting with the row's id (or its position). */
export function validate(rows: unknown): string[] {
  if (!Array.isArray(rows)) return ['image manifest: not a list of rows'];
  const out: string[] = [];
  const seen = new Set<string>();
  rows.forEach((raw, i) => {
    const r = (raw ?? {}) as Record<string, unknown>;
    const name = `image "${text(r.id) || `row ${i + 1}`}"`;
    if (!text(r.id)) out.push(`${name}: missing id`);
    else if (seen.has(text(r.id))) out.push(`${name}: duplicate id`);
    seen.add(text(r.id));
    for (const f of REQUIRED) if (!text(r[f])) out.push(`${name}: missing ${f}`);
    if (!text(r.file) === !text(r.dir)) out.push(`${name}: needs exactly one of file or dir`);
    if (text(r.file) && !/^[a-z0-9-]+\.(jpe?g|png)$/.test(text(r.file))) out.push(`${name}: file must be a lower-case .jpg, .jpeg or .png name`);
    if (!SUBJECTS.includes(r.subject as Subject)) out.push(`${name}: subject must be one of ${SUBJECTS.join(', ')}`);
    if (text(r.licence) && !LICENCES.includes(r.licence as Licence)) out.push(`${name}: licence "${text(r.licence)}" is not one of ${LICENCES.join(', ')}`);
    if (text(r.source_url) && !/^https:\/\/\S+$/.test(text(r.source_url))) out.push(`${name}: source_url must be an https link`);
    if (r.licence === 'ai') {
      if (r.subject === 'person' || r.subject === 'place') out.push(`${name}: a ${r.subject} may not be licence ai; use a real photograph`);
      if (!text(r.generator)) out.push(`${name}: licence ai needs generator`);
      if (!text(r.prompt)) out.push(`${name}: licence ai needs prompt`);
    }
    if (r.licence === 'cc-by' && !text(r.credit)) out.push(`${name}: licence cc-by needs the credit line`);
    if (r.taken != null && !/^\d{4}-\d{2}-\d{2}$/.test(String(r.taken instanceof Date ? r.taken.toISOString().slice(0, 10) : r.taken))) out.push(`${name}: taken must be YYYY-MM-DD`);
  });
  return out;
}

const parsed: unknown = parse(manifestText);
const problems = validate(parsed);
if (problems.length) throw new Error(`web/src/assets/img/manifest.yaml fails the image policy:\n  ${problems.join('\n  ')}`);

/** Every manifest row, in file order. */
export const MANIFEST: readonly ImageRow[] = parsed as ImageRow[];

// Vite resolves each original at build and copies it to `dist/_astro`; no page links one until it renders a `Photo`.
const FILES = import.meta.glob<ImageMetadata>('../assets/img/*.{jpg,jpeg,png}', { eager: true, import: 'default' });
const fileKey = (file: string) => `../assets/img/${file}`;
/** Original files on disk, by file name. */
export const FILE_NAMES: readonly string[] = Object.keys(FILES).map((k) => k.slice(k.lastIndexOf('/') + 1)).sort();

export function rowFor(id: string): ImageRow {
  const row = MANIFEST.find((r) => r.id === id);
  if (!row) throw new Error(`image "${id}" has no row in web/src/assets/img/manifest.yaml`);
  return row;
}
/** The original for a manifest id; throws on an unknown id, a `dir` row or a missing file, so the build stops. */
export function imageById(id: string): ImageMetadata {
  const row = rowFor(id);
  const src = row.file ? FILES[fileKey(row.file)] : undefined;
  if (!src) throw new Error(`image "${id}": no file ${row.file ?? '(dir row)'} in web/src/assets/img/`);
  return src;
}

type GoalImage = { category: 'federal_vote' | 'leadership' | 'state' | 'electoral'; eligibility: string; image?: string | null };
/** A goal's manifest id: its `image` field, then the category default. */
export function imageIdFor(goal: GoalImage): string {
  if (goal.image) return rowFor(goal.image).id;
  if (goal.category === 'state') return 'state-capitol';
  if (goal.category === 'leadership') {
    let rule: Record<string, unknown> = {};
    try { rule = JSON.parse(goal.eligibility) as Record<string, unknown>; } catch { /* a rule that does not parse names no chamber */ }
    return rule && typeof rule === 'object' && 'house' in rule ? 'house-floor' : 'senate-chamber';
  }
  return 'capitol-dome-dusk';
}
export function imageFor(goal: GoalImage): ImageMetadata { return imageById(imageIdFor(goal)); }

/** Manifest ids a set of page and component sources puts on screen: literal `<Photo id>` values, plus `goalIds` when any source resolves a goal's image. */
export function usedIds(sources: readonly string[], goalIds: readonly string[] = []): string[] {
  const ids = new Set<string>();
  let perGoal = false;
  for (const s of sources) {
    // `<Photo … />` is always self-closing; matching to `/>` survives a `>` inside `sizes`.
    for (const tag of s.matchAll(/<Photo\b[\s\S]*?\/>/g)) {
      const m = /\bid=(?:"([^"]+)"|'([^']+)'|\{\s*["'`]([^"'`]+)["'`]\s*\})/.exec(tag[0]);
      if (m) ids.add(m[1] ?? m[2] ?? m[3]!);
    }
    if (/\bimage(?:Id)?For\(/.test(s)) perGoal = true;
  }
  if (perGoal) for (const id of goalIds) ids.add(id);
  return [...ids];
}

export function sourceName(url: string): string {
  try { const host = new URL(url).hostname; return SOURCE_NAME[host] ?? host.replace(/^www\./, ''); } catch { return url; }
}
export function creditLine(r: ImageRow): CreditLine {
  const author = r.credit ?? r.author;
  const source = sourceName(r.source_url);
  const generated = r.licence === 'ai';
  const label = LICENCE_LABEL[r.licence];
  const line = generated
    ? `${r.alt}: illustration generated with ${r.generator}; no photo of a person or a real place on this site is generated.`
    : `${r.alt}: ${author}, ${source} (${label})`;
  return { id: r.id, alt: r.alt, author, source, source_url: r.source_url, licence: r.licence, licence_label: label, generated, text: line };
}
/** Credit lines for the given ids, in manifest order; ids with no row are an error. */
export function creditsFor(ids: readonly string[]): CreditLine[] {
  for (const id of ids) rowFor(id);
  return MANIFEST.filter((r) => ids.includes(r.id)).map(creditLine);
}

// What the site's own pages show. Tests are left out so a fixture string never earns a credit line.
const PAGE_SOURCES = import.meta.glob<string>(['../{pages,components,layouts}/**/*.{astro,tsx}', '!../**/*.test.tsx'], { eager: true, query: '?raw', import: 'default' });
/**
 * site-imagery §4: the committed portraits, one `<bioguide_id>.webp` per sitting member, written by
 * `import-members --portraits`. Read from disk (the build and the tests run in `web/`), never globbed: a glob would
 * hash 538 files into `_astro/` and a URL map into whatever imports it. `pages/portraits/[id].webp.ts` serves each
 * file at `/portraits/<id>.webp`.
 */
export const PORTRAIT = { dir: join(process.cwd(), 'src', 'assets', 'portraits'), width: 160, height: 200, maxBytes: 8192, maxTotalBytes: 4.5 * 1024 * 1024 } as const;
let portraitSet: Set<string> | null = null;
const portraits = (): Set<string> => (portraitSet ??= new Set(existsSync(PORTRAIT.dir) ? readdirSync(PORTRAIT.dir).filter((f) => f.endsWith('.webp')).map((f) => f.slice(0, -5)).sort() : []));
/** Ids with a portrait file, sorted. */
export function portraitIds(): string[] { return [...portraits()]; }
/** True when the member's portrait file exists; a page asks before it writes the `<img>`. */
export const hasPortraitFile = (id: string | null | undefined): boolean => !!id && portraits().has(id);
/** Sources of every page, component and layout, by path relative to this file. */
export function pageSources(): Record<string, string> { return PAGE_SOURCES; }

/** `web/`, whether the process runs there (the build, `test-web`) or in the checkout above it. */
export const WEB_ROOT = existsSync(join(process.cwd(), 'src', 'assets', 'img')) ? process.cwd() : join(process.cwd(), 'web');
/** The original on disk for a manifest id, for a renderer that reads pixels itself (`sharp` in the share card); throws on an unknown id or a `dir` row, so the build stops. */
export function originalPath(id: string): string {
  const row = rowFor(id);
  if (!row.file) throw new Error(`image "${id}": a dir row has no original file`);
  return join(WEB_ROOT, 'src', 'assets', 'img', row.file);
}
/**
 * `TREATMENT`'s filter as numbers `sharp` takes, in the filter's own order: the CSS `grayscale()` matrix for
 * `recomb`, then `contrast()` and `brightness()` folded into one `linear(a, b)` on 0 to 255.
 */
export function sharpTreatment(): { recomb: [[number, number, number], [number, number, number], [number, number, number]]; linear: [number, number] } {
  const k = 1 - TREATMENT.gray;
  const [r, g, b] = [0.2126, 0.7152, 0.0722];
  return {
    recomb: [[r + (1 - r) * k, g - g * k, b - b * k], [r - r * k, g + (1 - g) * k, b - b * k], [r - r * k, g - g * k, b + (1 - b) * k]],
    linear: [TREATMENT.contrast * TREATMENT.brightness, 127.5 * (1 - TREATMENT.contrast) * TREATMENT.brightness],
  };
}
/**
 * site-imagery §5: a share card with a photo. The photo is cropped about its centre, as `object-fit: cover` crops it
 * on the pages. The file must stay a PNG of at most `maxBytes`, which a 1200×630 photograph only meets as an 8-bit
 * palette; `colours` at or under 128 would make `sharp` write a 16-colour file.
 */
export const CARD = { width: 1200, height: 630, maxBytes: 200_000, position: 'centre', png: { palette: true, colours: 256, quality: 80, dither: 0.5, effort: 10 } } as const;
/**
 * Card-only crops, in the original's pixels and at the card's own size (no scaling). The centre crop puts the Capitol's
 * dome under the title, where the ink is at least 85% opaque and the building cannot be seen; this window puts it
 * two thirds of the way across.
 */
export const CARD_CROP: Readonly<Record<string, { left: number; top: number; width: number; height: number }>> = {
  'capitol-dome-dusk': { left: 0, top: 175, width: 1200, height: 630 },
};

/** `/about` "Photo credits": one line per image in use, empty when no page shows one. `goals` are the published goals; their images count once a page resolves a goal's image. */
export function credits(goals: readonly GoalImage[] = []): CreditLine[] {
  const ids = usedIds(Object.values(PAGE_SOURCES), goals.map(imageIdFor));
  if (portraitIds().length > 0) ids.push('portraits');
  return creditsFor(ids);
}
