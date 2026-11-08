// maintainer-research-routines §5: Clerk roll-call XML → positions rows or a members.csv flag column. No network.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CHANGED_BY, clerkDate, flagOf, isRollCallXml, parseRollCall, positionOf, rollCallFlags, rollCallRows } from '../src/import-rollcall';
import { POSITIONS_HEADER } from '../src/draft-position';
import { parseCsv } from '../src/load';

const here = dirname(fileURLToPath(import.meta.url));
const XML = readFileSync(join(here, 'fixtures', 'roll-call.sample.xml'), 'utf8');
const URL = 'https://clerk.house.gov/evs/2026/roll243.xml';
const MEMBERS = `bioguide_id,name,party,chamber,state,district,rc243,caucus
B001323,"Begich, Nicholas J.",R,house,AK,0,,
A000370,Alma Adams,D,house,NC,12,,
A000055,Robert Aderholt,R,house,AL,4,stale,
Y000067,Rudy Yakym,R,house,IN,2,,
Z000018,Ryan Zinke,R,house,MT,1,,
M001234,Thomas Massie,R,house,KY,4,,
S001198,Dan Sullivan,R,senate,AK,,,
`;

describe('parseRollCall', () => {
  it('reads the date as ISO and one entry per recorded-vote', () => {
    const p = parseRollCall(XML);
    expect(p.date).toBe('2026-07-15');
    expect(p.rollCallNum).toBe('243');
    expect(p.legisNum).toBe('H R 8595');
    expect(p.votes).toHaveLength(7);
    expect(p.votes[0]).toEqual({ nameId: 'B001323', name: 'Begich', vote: 'Aye' });
    expect(p.votes[6]).toEqual({ nameId: 'X999999', name: 'Nobody, "Jr."', vote: 'Aye' });
  });

  it('converts Clerk dates and rejects other shapes', () => {
    expect(clerkDate('9-Sep-2025')).toBe('2025-09-09');
    expect(clerkDate('15-Jul-2026')).toBe('2026-07-15');
    expect(() => clerkDate('2026-07-15')).toThrow(/D-Mon-YYYY/);
    expect(() => clerkDate('15-Foo-2026')).toThrow();
  });

  it('refuses an HTML error page or an unrelated XML', () => {
    expect(isRollCallXml('<!doctype html><html><body>Not found</body></html>')).toBe(false);
    expect(isRollCallXml('<?xml version="1.0"?><members><member/></members>')).toBe(false);
    expect(isRollCallXml(XML)).toBe(true);
    expect(() => parseRollCall('<html></html>')).toThrow(/not a Clerk roll-call/);
  });

  it('maps every Clerk vote value', () => {
    expect(['Yea', 'Aye', 'No', 'Nay', 'Not Voting', 'Present'].map(positionOf)).toEqual(['for', 'for', 'against', 'against', null, null]);
    expect(['Yea', 'Aye', 'No', 'Nay', 'Not Voting', 'Present'].map(flagOf)).toEqual(['yes', 'yes', 'no', 'no', 'not voting', 'present']);
  });
});

describe('rollCallRows', () => {
  it('prints for/against rows with the XML date and URL, none for Not Voting/Present, and lists unknown ids', () => {
    const out = rollCallRows(parseRollCall(XML), parseCsv(MEMBERS), URL);
    expect(out.rows[0]).toBe(POSITIONS_HEADER);
    expect(out.rows.slice(1)).toEqual([
      `B001323,for,${URL},2026-07-15,${CHANGED_BY}`,
      `A000370,for,${URL},2026-07-15,${CHANGED_BY}`,
      `A000055,against,${URL},2026-07-15,${CHANGED_BY}`,
      `Y000067,against,${URL},2026-07-15,${CHANGED_BY}`,
    ]);
    expect(out.unknown).toEqual([{ nameId: 'X999999', name: 'Nobody, "Jr."' }]);
    expect(CHANGED_BY).toBe('import-rollcall');
  });
});

describe('rollCallFlags', () => {
  it('sets the column for every member in the XML, leaves the rest as is and keeps quoting', () => {
    const out = rollCallFlags(parseRollCall(XML), MEMBERS, 'rc243');
    const rows = parseCsv(out.csv);
    const flag = Object.fromEntries(rows.map((r) => [r.bioguide_id, r.rc243]));
    expect(flag).toEqual({ B001323: 'yes', A000370: 'yes', A000055: 'no', Y000067: 'no', Z000018: 'not voting', M001234: 'present', S001198: '' });
    expect(out.set).toBe(6);
    expect(out.unknown).toEqual([{ nameId: 'X999999', name: 'Nobody, "Jr."' }]);
    expect(out.csv.split('\n')[0]).toBe(MEMBERS.split('\n')[0]);
    expect(out.csv).toContain('"Begich, Nicholas J."');
    expect(out.csv.endsWith('\n')).toBe(true);
  });

  it('refuses a column the file does not have', () => {
    expect(() => rollCallFlags(parseRollCall(XML), MEMBERS, 'nope')).toThrow(/no column "nope"/);
  });
});
