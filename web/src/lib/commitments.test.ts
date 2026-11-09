// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { addCommitment, CAPTAIN_KEY, ceilingFor, clearFunnel, COMMIT_KEY, commitmentFor, defaultDue, dropCaptain, hasOpenItems, loadCommitments, logReceipt, receiptedTargets, recentReceipts, retryDue, retryFor } from './commitments';

/** A list as the retired captain step stored it (one-screen-receipt §4). */
const LIST = JSON.stringify({ v: 1, goal: 'g', due: '2026-11-05T17:00:00.000Z', people: ['Ana', 'Ben', 'Cy'].map((name) => ({ name, channel: 'text', done: false })) });

describe('default deadline (call-follow-through §2)', () => {
  const at = (s: string) => new Date(s);
  it('is the next weekday at 10:00 local', () => {
    const tue = defaultDue(at('2026-11-03T09:00:00'), null); // Tuesday → Wednesday
    expect([tue.getDay(), tue.getHours(), tue.getMinutes()]).toEqual([3, 10, 0]);
    const fri = defaultDue(at('2026-11-06T18:30:00'), null); // Friday → Monday
    expect([fri.getDay(), fri.getDate(), fri.getHours()]).toEqual([1, 9, 10]);
    const sat = defaultDue(at('2026-11-07T10:00:00'), null); // Saturday → Monday
    expect([sat.getDay(), sat.getDate()]).toEqual([1, 9]);
  });
  it('never passes the goal decision date', () => {
    const d = defaultDue(at('2026-11-06T09:00:00'), '2026-11-07'); // Friday, vote Saturday
    expect(d.getTime()).toBe(ceilingFor('2026-11-07')!.getTime());
    expect(ceilingFor('2026-11-07')!.getHours()).toBe(10);
    expect(defaultDue(at('2026-11-03T09:00:00'), '2026-12-10').getDate()).toBe(4);
    expect(defaultDue(at('2026-11-03T09:00:00'), '').getDate()).toBe(4);
  });
});

describe('local schema and open items (§1.2, §2.1)', () => {
  beforeEach(() => localStorage.clear());
  it('stores versioned commitments, one per goal, and clears all on start over', () => {
    addCommitment({ goal: 'g', action: 'g-call', target: 'X1', due: '2026-11-04T17:00:00.000Z' });
    addCommitment({ goal: 'g', action: 'g-call', target: 'X1', due: '2026-11-05T17:00:00.000Z' });
    expect(loadCommitments()).toEqual([{ v: 1, goal: 'g', action: 'g-call', target: 'X1', due: '2026-11-05T17:00:00.000Z' }]);
    expect(hasOpenItems()).toBe(true);
    clearFunnel();
    expect(localStorage.getItem(COMMIT_KEY)).toBeNull();
    expect(hasOpenItems()).toBe(false);
  });
  it('a retry is one per goal and target, sits beside the call commitment and is due at an open slot ≥60 min ahead (call-follow-through §1)', () => {
    addCommitment({ goal: 'g', action: 'g-call', target: 'X1', due: '2026-11-05T15:00:00.000Z' });
    addCommitment({ goal: 'g', action: 'g-call', target: 'X1', due: '2026-11-05T16:00:00.000Z', kind: 'retry', who: 'Sen. One' });
    addCommitment({ goal: 'g', action: 'g-call', target: 'X1', due: '2026-11-05T17:00:00.000Z', kind: 'retry', who: 'Sen. One' });
    addCommitment({ goal: 'g', action: 'g-call', target: 'X2', due: '2026-11-05T17:00:00.000Z', kind: 'retry', who: 'Sen. Two' });
    expect(loadCommitments().map((c) => [c.kind ?? 'call', c.target, c.due])).toEqual([['call', 'X1', '2026-11-05T15:00:00.000Z'], ['retry', 'X1', '2026-11-05T17:00:00.000Z'], ['retry', 'X2', '2026-11-05T17:00:00.000Z']]);
    expect(commitmentFor('g')?.due).toBe('2026-11-05T15:00:00.000Z');
    expect(retryFor('g', 'X1')?.who).toBe('Sen. One');
    expect(retryFor('g', 'X3')).toBeNull();
    addCommitment({ goal: 'g', action: 'g-call', target: 'X1', due: '2026-11-06T15:00:00.000Z' }); // a new call commitment keeps the retries
    expect(loadCommitments()).toHaveLength(3);
    // Mon 2026-11-02 16:30 EST → 17:30 EST, still open; Mon 17:30 EST → next slot Tue 09:00 EST; Hawaii 10:00 HST (15:00 EST) → 16:00 EST.
    expect(retryDue(new Date('2026-11-02T21:30:00Z')).toISOString()).toBe('2026-11-02T22:30:00.000Z');
    expect(retryDue(new Date('2026-11-02T22:30:00Z')).toISOString()).toBe('2026-11-03T14:00:00.000Z');
    expect(retryDue(new Date('2026-11-02T20:00:00Z')).toISOString()).toBe('2026-11-02T21:00:00.000Z');
  });
  it('one-screen-receipt §4.2: a stored captain list is not an open item; dropCaptain and Start over delete it and leave the rest', () => {
    localStorage.setItem(CAPTAIN_KEY, LIST);
    expect(hasOpenItems()).toBe(false);
    addCommitment({ goal: 'g', action: 'g-call', target: 'X1', due: '2026-11-05T15:00:00.000Z' });
    dropCaptain();
    expect(localStorage.getItem(CAPTAIN_KEY)).toBeNull();
    expect(loadCommitments()).toHaveLength(1);
    expect(hasOpenItems()).toBe(true);
    localStorage.setItem(CAPTAIN_KEY, LIST);
    clearFunnel();
    expect(localStorage.getItem(CAPTAIN_KEY)).toBeNull();
    expect(localStorage.getItem(COMMIT_KEY)).toBeNull();
  });
});

describe('local receipt log (call-follow-through §3)', () => {
  it('keeps one row per goal, action and target for 24 h and is cleared with the funnel', () => {
    const t0 = new Date('2026-11-02T15:00:00Z');
    logReceipt({ goal: 'g', action: 'a', target: 'X' }, t0);
    logReceipt({ goal: 'g', action: 'a', target: 'X' }, new Date(t0.getTime() + 60_000)); // same target: replaced, not doubled
    logReceipt({ goal: 'g', action: 'a', target: 'Y' }, t0);
    expect(recentReceipts(t0).map((r) => r.target)).toEqual(['X', 'Y']);
    expect(receiptedTargets('g', 'a', new Date(t0.getTime() + 23 * 60 * 60_000))).toEqual(new Set(['X', 'Y']));
    expect(receiptedTargets('g', 'a', new Date(t0.getTime() + 24 * 60 * 60_000))).toEqual(new Set(['X'])); // Y is a day old, X a minute younger
    expect(receiptedTargets('g', 'other', t0).size).toBe(0);
    clearFunnel();
    expect(recentReceipts(t0)).toEqual([]);
    expect(localStorage.getItem('cut-ties:receipts')).toBeNull();
  });
});
