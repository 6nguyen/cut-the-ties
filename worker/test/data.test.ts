import { describe, expect, it } from 'vitest';
import { appendFileSync, cpSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkEmailSubject, loadRows, parseCsv } from '../src/load';

const rows = loadRows(join(__dirname, '..', '..', 'data'), '2026-11-04T00:00:00Z');

describe('data/ files', () => {
  it('every action names a goal; every goal has at least one action', () => {
    const ids = new Set(rows.goals.map((g) => g.id));
    for (const a of rows.actions) expect(ids.has(a.goal_id)).toBe(true);
    for (const g of rows.goals) expect(rows.actions.some((a) => a.goal_id === g.id)).toBe(true);
  });
  it('members: the six fixture delegations are complete (house member + two senators)', () => {
    for (const [state, district] of [['CA', 46], ['CA', 23], ['TX', 35], ['TX', 21], ['PA', 1], ['PA', 2]] as const) {
      expect(rows.members.filter((m) => m.state === state && m.chamber === 'house' && m.district === district)).toHaveLength(1);
      expect(rows.members.filter((m) => m.state === state && m.chamber === 'senate')).toHaveLength(2);
    }
    expect(new Set(rows.members.map((m) => m.bioguide_id)).size).toBe(rows.members.length);
  });
  it('states: one row per fixture state', () => {
    expect(rows.states.map((s) => s.state).sort()).toEqual(['CA', 'PA', 'TX']);
  });
  it('positions: every row carries source_url and source_date, and loadRows refuses one without', () => {
    for (const p of rows.positions) {
      expect(p.source_url, `${p.bioguide_id} on goal ${p.goal_id}`).toMatch(/^https?:\/\//);
      expect(p.source_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    const copy = mkdtempSync(join(tmpdir(), 'cut-ties-data-'));
    cpSync(join(__dirname, '..', '..', 'data'), copy, { recursive: true });
    const file = readdirSync(join(copy, 'positions')).find((f) => f.endsWith('.csv'))!;
    appendFileSync(join(copy, 'positions', file), 'C001110,for,,,hand\n');
    expect(() => loadRows(copy, '2026-11-04T00:00:00Z')).toThrow(/has no source/);
  });
  // email-button §2.1
  it('email_subject: every active call action has one, ≤80 chars, {city} only; the loader refuses a missing or bad one', () => {
    const active = new Set(rows.goals.filter((g) => g.status === 'active').map((g) => g.id));
    for (const a of rows.actions.filter((a) => a.type === 'call' && active.has(a.goal_id))) {
      expect(a.email_subject, a.slug).toBeTruthy();
      expect(a.email_subject!.length).toBeLessThanOrEqual(80);
      expect(() => checkEmailSubject(a, { slug: 'g', status: 'active' })).not.toThrow();
    }
    const goal = { slug: 'g', status: 'active' as const };
    const call = (email_subject: string | null) => ({ slug: 'x-call', type: 'call' as const, email_subject });
    expect(() => checkEmailSubject(call(null), goal)).toThrow(/email_subject is required/);
    expect(() => checkEmailSubject(call(null), { ...goal, status: 'upcoming' })).not.toThrow();
    expect(() => checkEmailSubject({ ...call(null), type: 'letter' }, goal)).not.toThrow();
    expect(() => checkEmailSubject(call('x'.repeat(81)), goal)).toThrow(/max 80/);
    expect(() => checkEmailSubject(call('See https://example.org now'), goal)).toThrow(/URL, email or phone/);
    expect(() => checkEmailSubject(call('Write me at a@b.org'), goal)).toThrow(/URL, email or phone/);
    expect(() => checkEmailSubject(call('Call 202-224-3553'), goal)).toThrow(/URL, email or phone/);
    expect(() => checkEmailSubject(call('Constituent {name} in {city}'), goal)).toThrow(/only \{city\}, not \{name\}/);
    expect(() => checkEmailSubject(call('Constituent in {city}: section 1217'), goal)).not.toThrow();
    const copy = mkdtempSync(join(tmpdir(), 'cut-ties-data-'));
    cpSync(join(__dirname, '..', '..', 'data'), copy, { recursive: true });
    writeFileSync(join(copy, 'actions', 'ndaa-1217-call.yaml'), readFileSync(join(copy, 'actions', 'ndaa-1217-call.yaml'), 'utf8').replace(/^email_subject: .*\n/m, ''));
    expect(() => loadRows(copy, '2026-11-04T00:00:00Z')).toThrow(/ndaa-1217-call: email_subject is required/);
  });
  it('office: every action resolves to dc today; a missing value means dc; any other value fails naming the file (call-the-right-office §1.1)', () => {
    for (const a of rows.actions) expect(a.office, a.slug).toBe('dc');
    const copy = mkdtempSync(join(tmpdir(), 'cut-ties-data-'));
    cpSync(join(__dirname, '..', '..', 'data'), copy, { recursive: true });
    const file = join(copy, 'actions', 'house-caucus-call.yaml');
    writeFileSync(file, readFileSync(file, 'utf8').replace(/^office: dc\n/m, 'office: capitol\n'));
    expect(() => loadRows(copy, '2026-11-04T00:00:00Z')).toThrow(/actions\/house-caucus-call\.yaml: office must be dc or district, got capitol/);
    writeFileSync(file, readFileSync(file, 'utf8').replace(/^office: capitol\n/m, ''));
    expect(loadRows(copy, '2026-11-04T00:00:00Z').actions.find((a) => a.slug === 'house-caucus-call')!.office).toBe('dc');
  });
  it('parseCsv rejects ragged rows', () => {
    expect(() => parseCsv('a,b\n1,2,3')).toThrow(/expected 2/);
  });
  it('parseCsv reads quoted cells with commas and doubled quotes', () => {
    expect(parseCsv('a,b\n"x, y","say ""hi"""\n')).toEqual([{ a: 'x, y', b: 'say "hi"' }]);
  });
});
