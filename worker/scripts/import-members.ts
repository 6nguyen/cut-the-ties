// Roster import (member-pages spec §1, roster-freshness §2/§4): unitedstates/congress-legislators
// `legislators-current.yaml` (public domain) → data/members.csv.
//   npm run import-members -w worker                                   downloads the roster from raw `main`
//   npm run import-members -w worker -- <file> [--senate-xml <path|url>] reads a downloaded copy
//   npm run import-members -w worker -- --portraits                    portraits only (site-imagery §4.1); members.csv is not rewritten
// Existing rows keep their flag columns; new rows get empty flags; a row in the file but not in
// the dataset is kept and printed as "stale" (or "left" once left_office is set, which the import
// does only on or after TRANSITION_DATE). Running it is a data/ PR like any other; the seed checks
// (load.ts) gate the result.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { parseCsv } from '../src/load';
import type { ContactKind } from '../src/types';

export const ROSTER_URL = 'https://raw.githubusercontent.com/unitedstates/congress-legislators/main/legislators-current.yaml';
export const SENATE_XML_URL = 'https://www.senate.gov/general/contact_information/senators_cfm.xml';
/** roster-freshness §4: the 120th Congress convenes at noon; a member missing from the roster before this day is `stale:`, from this day on `left:`. */
export const TRANSITION_DATE = '2027-01-03';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data', 'members.csv');
export const HEADER = ['bioguide_id', 'name', 'party', 'chamber', 'state', 'district', 'dc_phone', 'district_phone', 'contact_form_url', 'hasc', 'conferee', 'rc243', 'jrd_april_2026', 'btb_cosponsor', 'target_2028', 'money_url', 'district_office_address', 'district_office_city', 'contact_kind', 'not_returning', 'left_office', 'caucus'];
const FROM_DATASET = new Set(['party', 'chamber', 'state', 'district', 'dc_phone', 'contact_form_url', 'contact_kind']);
const PARTY: Record<string, string> = { Democrat: 'D', Republican: 'R', Independent: 'I' };

interface Term { type: 'rep' | 'sen'; state: string; district?: number; party: string; phone?: string; contact_form?: string; url?: string; start: string; end: string }
interface Legislator { id: { bioguide: string }; name: { first: string; last: string; official_full?: string }; terms: Term[] }
/** One `<member>` of senators_cfm.xml: `email` is the contact form, or the homepage when the office has no form. */
export interface SenateContact { bioguide_id: string; email: string; website: string }

const cell = (v: string): string => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const trimSlash = (u: string): string => u.trim().replace(/\/+$/, '').toLowerCase().replace(/^(https?:\/\/)www\./, '$1');

/** senators_cfm.xml → one row per member. A regex pass: the file is flat and has no attributes worth a parser. */
export function senateContacts(xml: string): SenateContact[] {
  const out: SenateContact[] = [];
  const tag = (block: string, name: string): string => block.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1].trim() ?? '';
  for (const m of xml.matchAll(/<member>([\s\S]*?)<\/member>/g)) {
    const id = tag(m[1], 'bioguide_id');
    if (id) out.push({ bioguide_id: id, email: tag(m[1], 'email'), website: tag(m[1], 'website') });
  }
  return out;
}

/** §2: the contact link and its kind for one roster term. A roster form counts only when it is an http(s) URL (the dataset has carried a typo'd scheme) and is not the member's homepage (it lists `https://alsobrooks.senate.gov/` as a form). Senators: roster form, else the XML email when it is not the homepage, else the homepage. House: roster form, else `<url>/contact` behind a ZIP gate. */
export function contactFor(t: Pick<Term, 'type' | 'contact_form' | 'url'>, senate?: SenateContact): { contact_form_url: string; contact_kind: ContactKind | '' } {
  const form = (t.contact_form ?? '').trim();
  const home = (t.url ?? '').trim();
  if (/^https?:\/\//.test(form) && trimSlash(form) !== trimSlash(home)) return { contact_form_url: form, contact_kind: 'form' };
  if (t.type === 'sen') {
    const email = senate?.email.trim() ?? '';
    const pages = new Set([home, senate?.website ?? ''].filter(Boolean).map(trimSlash));
    if (email && !pages.has(trimSlash(email))) return { contact_form_url: email, contact_kind: 'form' };
    const page = home || senate?.website.trim() || '';
    return page ? { contact_form_url: page, contact_kind: 'homepage' } : { contact_form_url: '', contact_kind: '' };
  }
  return home ? { contact_form_url: `${home.replace(/\/+$/, '')}/contact`, contact_kind: 'zip_gate' } : { contact_form_url: '', contact_kind: '' };
}

export function rosterRows(yamlText: string, senate: SenateContact[] = []): Record<string, string>[] {
  const people = parseYaml(yamlText) as Legislator[];
  const byId = new Map(senate.map((s) => [s.bioguide_id, s]));
  return people.map((p) => {
    const t = p.terms[p.terms.length - 1];
    const party = PARTY[t.party];
    if (!party) throw new Error(`${p.id.bioguide}: unknown party ${t.party}`);
    return {
      bioguide_id: p.id.bioguide,
      name: p.name.official_full ?? `${p.name.first} ${p.name.last}`,
      party,
      chamber: t.type === 'sen' ? 'senate' : 'house',
      state: t.state,
      district: t.type === 'sen' ? '' : String(t.district ?? 0),
      dc_phone: t.phone ?? '',
      ...contactFor(t, byId.get(p.id.bioguide)),
    };
  });
}

export interface MergeResult { rows: Record<string, string>[]; stale: string[]; left: string[]; added: number; changed: string[] }

/**
 * Merge the dataset into the current file: dataset columns refresh, flags persist, missing rows stay.
 * A hand-set contact (a row whose `contact_kind` is filled and whose link differs from the dataset's form) is kept.
 * On or after TRANSITION_DATE a row missing from the roster gets `left_office = today` (kept once set) and prints `left:`; before it, `stale:`.
 */
export function merge(existing: Record<string, string>[], roster: Record<string, string>[], today = new Date().toISOString().slice(0, 10)): MergeResult {
  const byId = new Map(existing.map((r) => [r.bioguide_id, r]));
  const seen = new Set<string>();
  const changed: string[] = [];
  let added = 0;
  const label = (r: Record<string, string>) => `${r.bioguide_id} ${r.name} (${r.state}${r.district ? '-' + r.district : ''})`;
  const rows = roster.map((r) => {
    seen.add(r.bioguide_id);
    const old = byId.get(r.bioguide_id);
    if (!old) added++;
    const out: Record<string, string> = {};
    out.bioguide_id = r.bioguide_id;
    out.name = old?.name || r.name; // the file's common name (what a caller says) wins over official_full
    for (const h of HEADER.slice(2)) out[h] = FROM_DATASET.has(h) ? (r[h] || old?.[h] || '') : (old?.[h] ?? '');
    // A hand-set contact link (kind filled, link not the dataset's own form) is never overwritten by a fallback.
    if (old?.contact_kind && old.contact_form_url && r.contact_kind !== 'form') { out.contact_form_url = old.contact_form_url; out.contact_kind = old.contact_kind; }
    if (old && HEADER.some((h) => (old[h] ?? '') !== out[h])) changed.push(label(out));
    return out;
  });
  const stale: string[] = [];
  const left: string[] = [];
  for (const r of existing) {
    if (seen.has(r.bioguide_id)) continue;
    const row = Object.fromEntries(HEADER.map((h) => [h, r[h] ?? '']));
    if (!row.left_office && today >= TRANSITION_DATE) { row.left_office = today; changed.push(label(row)); }
    (row.left_office ? left : stale).push(`${label(row)}${row.left_office ? ' ' + row.left_office : ''}`);
    rows.push(row);
  }
  const chamber = (c: string) => (c === 'house' ? 0 : 1);
  rows.sort((a, b) => a.state.localeCompare(b.state) || chamber(a.chamber) - chamber(b.chamber) || Number(a.district || 0) - Number(b.district || 0) || a.name.localeCompare(b.name));
  return { rows, stale, left, added, changed };
}

export function toCsv(rows: Record<string, string>[]): string {
  return [HEADER.join(','), ...rows.map((r) => HEADER.map((h) => cell(r[h] ?? '')).join(','))].join('\n') + '\n';
}

// ── Portraits (site-imagery §4.1) ────────────────────────────────────────────────────────────────
/** Where the site keeps them: one `<bioguide_id>.webp` per sitting member, plus `missing.json`. */
export const PORTRAIT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'web', 'src', 'assets', 'portraits');
export const PORTRAIT = { width: 160, height: 200, maxBytes: 8192, missingFile: 'missing.json' } as const;
/** The 225×275 official portrait in unitedstates/images (public domain, from the Government Publishing Office), then the Bioguide photo. */
export const portraitSources = (id: string): string[] => [
  `https://unitedstates.github.io/images/congress/225x275/${id}.jpg`,
  `https://bioguide.congress.gov/bioguide/photo/${id[0]}/${id}.jpg`,
];
const WEBP_QUALITIES = [62, 54, 46, 38, 30, 22, 14];

/** Source image → 160×200 WebP at the highest listed quality that fits 8 KB. Throws when the bytes are not an image or nothing fits. */
export async function encodePortrait(source: Uint8Array): Promise<Uint8Array> {
  const sharp = (await import('sharp')).default;
  for (const quality of WEBP_QUALITIES) {
    const out = await sharp(source).rotate().resize(PORTRAIT.width, PORTRAIT.height, { fit: 'cover', position: 'top' }).webp({ quality, effort: 6 }).toBuffer();
    if (out.byteLength <= PORTRAIT.maxBytes) return new Uint8Array(out);
  }
  throw new Error(`no WebP quality fits ${PORTRAIT.maxBytes} bytes`);
}

export interface PortraitIo {
  fetch: (url: string) => Promise<{ ok: boolean; status: number; arrayBuffer: () => Promise<ArrayBuffer> }>;
  exists: (path: string) => boolean;
  read: (path: string) => string;
  write: (path: string, bytes: Uint8Array | string) => void;
  encode: (source: Uint8Array) => Promise<Uint8Array>;
}
export interface PortraitResult { written: string[]; kept: string[]; missing: string[]; failed: string[]; fallback: string[] }

/**
 * One WebP per id that has no file yet; an existing file is never fetched or rewritten, so a second run changes no bytes.
 * An id whose sources all answer 404 (or serve something that is not an image) gets no file and is listed in
 * `missing.json`, which the site reads to skip the `<img>`. A network failure is not "no portrait": the id is `failed`
 * and stays out of `missing.json` unless a previous run already listed it there (so an offline run changes nothing).
 * `fallback` names the ids written from the second source.
 */
export async function importPortraits(ids: string[], dir: string, io: PortraitIo, concurrency = 8): Promise<PortraitResult> {
  const missingPath = join(dir, PORTRAIT.missingFile);
  const before = io.exists(missingPath) ? io.read(missingPath) : null;
  const wasMissing = new Set<string>(before ? (JSON.parse(before) as string[]) : []);
  const res: PortraitResult = { written: [], kept: [], missing: [], failed: [], fallback: [] };
  const todo = [...new Set(ids)].sort();
  const one = async (id: string): Promise<void> => {
    const file = join(dir, `${id}.webp`);
    if (io.exists(file)) { res.kept.push(id); return; }
    let unreachable = false;
    for (const [n, url] of portraitSources(id).entries()) {
      let bytes: Uint8Array;
      try {
        const r = await io.fetch(url);
        if (!r.ok) { if (r.status !== 404 && r.status !== 403) unreachable = true; continue; }
        bytes = new Uint8Array(await r.arrayBuffer());
      } catch { unreachable = true; continue; }
      let out: Uint8Array;
      try { out = await io.encode(bytes); } catch { continue; }
      io.write(file, out);
      res.written.push(id);
      if (n > 0) res.fallback.push(id);
      return;
    }
    (unreachable && !wasMissing.has(id) ? res.failed : res.missing).push(id);
  };
  let next = 0;
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, async () => { while (next < todo.length) await one(todo[next++]); }));
  for (const k of ['written', 'kept', 'missing', 'failed', 'fallback'] as const) res[k].sort();
  const text = JSON.stringify(res.missing) + '\n';
  if (text !== before) io.write(missingPath, text);
  return res;
}

async function portraitsMain(): Promise<void> {
  // Sitting members only: a row with left_office is never built, listed or routed (roster-freshness §4), so it needs no portrait.
  const ids = parseCsv(readFileSync(OUT, 'utf8')).filter((r) => !r.left_office).map((r) => r.bioguide_id);
  mkdirSync(PORTRAIT_DIR, { recursive: true });
  const res = await importPortraits(ids, PORTRAIT_DIR, {
    fetch: (url) => fetch(url, { headers: { 'User-Agent': 'cut-the-ties import-members (portraits)' } }),
    exists: existsSync,
    read: (p) => readFileSync(p, 'utf8'),
    write: (p, b) => writeFileSync(p, b),
    encode: encodePortrait,
  });
  console.log(`portraits: ${ids.length} members; ${res.written.length} written (${res.fallback.length} from the Bioguide fallback), ${res.kept.length} kept, ${res.missing.length} with no source portrait, ${res.failed.length} failed`);
  for (const id of res.fallback) console.log(`bioguide fallback: ${id}`);
  for (const id of res.missing) console.log(`no portrait: ${id}`);
  for (const id of res.failed) console.log(`failed (network, run again): ${id}`);
  if (res.failed.length) process.exit(1);
}

async function read(src: string): Promise<string> {
  if (!/^https?:\/\//.test(src)) return readFileSync(src, 'utf8');
  const res = await fetch(src);
  if (!res.ok) throw new Error(`${src}: HTTP ${res.status}`);
  return res.text();
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes('--portraits')) return portraitsMain();
  const xi = args.indexOf('--senate-xml');
  const senateSrc = xi >= 0 ? args[xi + 1] : undefined;
  const src = args.filter((_, i) => i !== xi && i !== xi + 1)[0];
  if (xi >= 0 && !senateSrc) { console.error('usage: import-members [roster.yaml] [--senate-xml <path|url>]'); process.exit(64); }
  const text = await read(src ?? ROSTER_URL);
  const senate = senateSrc ? senateContacts(await read(senateSrc)) : [];
  const roster = rosterRows(text, senate);
  const existing = parseCsv(readFileSync(OUT, 'utf8'));
  const { rows, stale, left, added, changed } = merge(existing, roster);
  writeFileSync(OUT, toCsv(rows));
  const house = roster.filter((r) => r.chamber === 'house').length;
  const kinds = ['form', 'zip_gate', 'homepage'].map((k) => `${k} ${rows.filter((r) => r.contact_kind === k).length}`).join(', ');
  console.log(`members.csv: ${rows.length} rows (${house} house incl. delegates, ${roster.length - house} senate); ${added} added, ${changed.length} changed, ${existing.length - stale.length - left.length} refreshed; contact kinds: ${kinds}${senate.length ? ` (senate xml: ${senate.length} members)` : ''}`);
  for (const c of changed) console.log(`changed: ${c}`);
  for (const s of stale) console.log(`stale: ${s}`);
  for (const l of left) console.log(`left: ${l}`);
}

if (process.argv[1] && /import-members\.ts$/.test(process.argv[1])) main().catch((e) => { console.error(e); process.exit(1); });
