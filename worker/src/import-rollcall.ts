// maintainer-research-routines §5 import-rollcall: one House Clerk roll-call XML
// (clerk.house.gov/evs/<year>/roll<nnn>.xml) → positions rows or a members.csv flag column. Pure:
// nothing here fetches or writes; the CLI in scripts/import-rollcall.ts does the fetch and prints.
import { csvCell } from './draft-shared';
import { POSITIONS_HEADER } from './draft-position';
import { splitCsvLine } from './load';

export const CHANGED_BY = 'import-rollcall';
export type ClerkVote = 'Yea' | 'Aye' | 'No' | 'Nay' | 'Not Voting' | 'Present';

export interface RecordedVote { nameId: string; name: string; vote: ClerkVote | string }
export interface RollCall {
  /** `action-date` as YYYY-MM-DD (the XML writes `15-Jul-2026`). */
  date: string;
  rollCallNum: string;
  question: string;
  legisNum: string;
  votes: RecordedVote[];
}
export interface Unknown { nameId: string; name: string }

const MONTHS: Record<string, string> = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
const tag = (xml: string, name: string): string => xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1].trim() ?? '';
const decode = (s: string): string => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");

/** `9-Sep-2025` / `15-Jul-2026` → `2025-09-09`; anything else throws (the date lands in `source_date`, which the lint requires). */
export function clerkDate(raw: string): string {
  const m = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(raw.trim());
  const month = m && MONTHS[m[2].toLowerCase()];
  if (!m || !month) throw new Error(`action-date "${raw}" is not D-Mon-YYYY`);
  return `${m[3]}-${month}-${m[1].padStart(2, '0')}`;
}

/** True for a body that is a Clerk roll-call document (not an HTML error page, not another XML). */
export const isRollCallXml = (body: string): boolean => /<rollcall-vote[\s>]/.test(body) && body.includes('<vote-data>');

/** Clerk XML → date, metadata and one entry per `recorded-vote`. Regex pass: the file is flat and well-formed. */
export function parseRollCall(xml: string): RollCall {
  if (!isRollCallXml(xml)) throw new Error('not a Clerk roll-call XML');
  const meta = tag(xml, 'vote-metadata');
  const votes: RecordedVote[] = [];
  for (const m of xml.matchAll(/<recorded-vote>([\s\S]*?)<\/recorded-vote>/g)) {
    const leg = /<legislator\b([^>]*)>([\s\S]*?)<\/legislator>/.exec(m[1]);
    const nameId = leg?.[1].match(/name-id="([^"]*)"/)?.[1] ?? '';
    const name = decode((leg?.[1].match(/unaccented-name="([^"]*)"/)?.[1] ?? leg?.[2] ?? '').trim());
    votes.push({ nameId, name, vote: decode(tag(m[1], 'vote')) });
  }
  return { date: clerkDate(tag(meta, 'action-date')), rollCallNum: tag(meta, 'rollcall-num'), question: decode(tag(meta, 'vote-question')), legisNum: decode(tag(meta, 'legis-num')), votes };
}

/** `Yea`/`Aye` → for, `No`/`Nay` → against; `Not Voting`, `Present` and anything else → null (no row). */
export function positionOf(vote: string): 'for' | 'against' | null {
  const v = vote.trim().toLowerCase();
  if (v === 'yea' || v === 'aye') return 'for';
  if (v === 'no' || v === 'nay') return 'against';
  return null;
}

/** Flag cell for a members.csv column: `yes`/`no` for a vote cast, `not voting`/`present` otherwise (every member in the XML gets a value). */
export const flagOf = (vote: string): string => positionOf(vote) === 'for' ? 'yes' : positionOf(vote) === 'against' ? 'no' : vote.trim().toLowerCase();

const knownIds = (members: Record<string, string>[]): Set<string> => new Set(members.map((m) => m.bioguide_id));

/**
 * Positions rows (`bioguide_id,position,source_url,source_date,changed_by`) for the votes cast by
 * members present in `members` (the parsed members.csv). A `name-id` not in the file is returned
 * under `unknown` and gets no row; `Not Voting`/`Present` get no row either. Header included.
 */
export function rollCallRows(parsed: RollCall, members: Record<string, string>[], sourceUrl: string): { rows: string[]; unknown: Unknown[] } {
  const ids = knownIds(members);
  const rows = [POSITIONS_HEADER];
  const unknown: Unknown[] = [];
  for (const v of parsed.votes) {
    if (!ids.has(v.nameId)) { unknown.push({ nameId: v.nameId, name: v.name }); continue; }
    const position = positionOf(v.vote);
    if (position) rows.push([v.nameId, position, sourceUrl, parsed.date, CHANGED_BY].map(csvCell).join(','));
  }
  return { rows, unknown };
}

/**
 * The whole members.csv with `column` set for every member in the XML and left as is for the rest.
 * `header` is the file's header line (column order preserved); cells are re-quoted only where needed.
 */
export function rollCallFlags(parsed: RollCall, membersCsv: string, column: string): { csv: string; unknown: Unknown[]; set: number } {
  const lines = membersCsv.replace(/\r\n/g, '\n').split('\n');
  const header = splitCsvLine(lines[0]);
  const col = header.indexOf(column);
  if (col < 0) throw new Error(`members.csv has no column "${column}"; one of ${header.join(', ')}`);
  const idCol = header.indexOf('bioguide_id');
  const byId = new Map<string, string>();
  for (const v of parsed.votes) byId.set(v.nameId, flagOf(v.vote));
  const seen = new Set<string>();
  const out = lines.map((line, i) => {
    if (i === 0 || line.trim() === '') return line;
    const cells = splitCsvLine(line);
    const flag = byId.get(cells[idCol]);
    if (flag === undefined) return line;
    seen.add(cells[idCol]);
    cells[col] = flag;
    return cells.map(csvCell).join(',');
  });
  const unknown = parsed.votes.filter((v) => !seen.has(v.nameId)).map(({ nameId, name }) => ({ nameId, name }));
  return { csv: out.join('\n'), unknown, set: seen.size };
}
