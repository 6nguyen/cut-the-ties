// maintainer-research-routines §5 maintainer tool. Usage (from worker/):
//   npm run import-rollcall -- <clerk-xml-url> <goal> [--flag <column>]
// Fetches one House Clerk roll-call XML and prints data/positions/<goal>.csv rows (Yea/Aye → for,
// No/Nay → against, Not Voting/Present → no row) or, with --flag, the whole members.csv with that
// column set for every member in the XML. Unknown name-ids go to stderr as `# unknown member <id>
// <name>` and are skipped (exit 0). Never writes a file. Exit codes: 64 usage, 65 unknown goal or
// column, 66 non-200 or non-XML response.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rollCallFlags, rollCallRows, isRollCallXml, parseRollCall } from '../src/import-rollcall';
import { loadRows, parseCsv } from '../src/load';

const args = process.argv.slice(2);
const flagAt = args.indexOf('--flag');
const column = flagAt >= 0 ? args[flagAt + 1] : undefined;
const positional = flagAt >= 0 ? [...args.slice(0, flagAt), ...args.slice(flagAt + 2)] : args;
const [url, goalSlug] = positional;
if (!url || !goalSlug || (flagAt >= 0 && !column)) { console.error('usage: import-rollcall <clerk-xml-url> <goal> [--flag <column>]'); process.exit(64); }

const dataDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data');
const rows = loadRows(dataDir);
if (!rows.goals.some((g) => g.slug === goalSlug)) { console.error(`unknown goal slug ${goalSlug}; one of ${rows.goals.map((g) => g.slug).join(', ')}`); process.exit(65); }
const membersCsv = readFileSync(join(dataDir, 'members.csv'), 'utf8');

const res = await fetch(url, { headers: { accept: 'application/xml,text/xml;q=0.9', 'user-agent': 'cut-ties import-rollcall (maintainer tool)' } });
const body = res.ok ? await res.text() : '';
if (!res.ok || !isRollCallXml(body)) { console.error(`${url}: ${res.ok ? 'not a Clerk roll-call XML' : `HTTP ${res.status}`}`); process.exit(66); }

const parsed = parseRollCall(body);
console.error(`roll call ${parsed.rollCallNum} · ${parsed.legisNum} · ${parsed.question} · ${parsed.date} · ${parsed.votes.length} recorded votes`);
if (column) {
  const out = rollCallFlags(parsed, membersCsv, column);
  for (const u of out.unknown) console.error(`# unknown member ${u.nameId} ${u.name}`);
  console.error(`${out.set} members.csv rows set in column ${column}; paste the file below over data/members.csv in a PR`);
  process.stdout.write(out.csv.endsWith('\n') ? out.csv : `${out.csv}\n`);
} else {
  const out = rollCallRows(parsed, parseCsv(membersCsv), url);
  for (const u of out.unknown) console.error(`# unknown member ${u.nameId} ${u.name}`);
  console.error(`${out.rows.length - 1} rows for data/positions/${goalSlug}.csv (header first; drop it when appending)`);
  console.log(out.rows.join('\n'));
}
