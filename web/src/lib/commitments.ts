// Commitment funnel (docs/specs/commitment-funnel.md): the reminder, the retry and the joined visits
// live only in this browser. Nothing here is ever sent.
export const COMMIT_KEY = 'cut-ties:commitments';
/** one-screen-receipt §4: the retired captain list. Nothing reads it; it is only ever deleted. */
export const CAPTAIN_KEY = 'cut-ties:captain';
/** office-visits §2.3: the visits this device said it would come to (and the organiser's contact, received once). */
export const VISITS_KEY = 'cut-ties:visits';
import { nextOpenSlot, type Office } from './hours';
import { buildIcs } from './ics';

/** `kind` (call-follow-through §1): `call` is the private commitment, `retry` a second attempt after `no_answer`; readers default a missing kind to `call`. `who` is the office's public "Sen. Name" for the retry line. */
export interface Commitment { v: 1; goal: string; action: string; target: string; due: string; kind?: 'call' | 'retry'; who?: string }
export const kindOf = (c: Commitment): 'call' | 'retry' => c.kind ?? 'call';
/** One list key per item: the call commitment is one per goal, a retry one per goal and target. */
export const keyOf = (c: Commitment): string => (kindOf(c) === 'retry' ? `retry:${c.goal}:${c.target}` : `call:${c.goal}`);
export interface JoinedVisit { v: 1; id: number; member: string; name: string; city: string; starts_at: string; ends_at: string; contact_url: string }

const read = <T>(key: string): T | null => { try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : null; } catch { return null; } };
const write = (key: string, v: unknown): void => { try { if (v === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(v)); } catch { /* private mode */ } };

export function loadCommitments(): Commitment[] {
  const list = read<Commitment[]>(COMMIT_KEY);
  return Array.isArray(list) ? list.filter((c) => c && c.v === 1 && typeof c.goal === 'string' && typeof c.due === 'string') : [];
}
export function saveCommitments(list: Commitment[]): void { write(COMMIT_KEY, list.length ? list : null); }
/** One open commitment per goal (and one open retry per goal and target): a new one replaces the old. */
export function addCommitment(c: Omit<Commitment, 'v'>): void { const n: Commitment = { v: 1, ...c }; saveCommitments([...loadCommitments().filter((x) => keyOf(x) !== keyOf(n)), n]); }
export function commitmentFor(goal: string): Commitment | null { return loadCommitments().find((c) => c.goal === goal && kindOf(c) === 'call') ?? null; }
export function retryFor(goal: string, target: string): Commitment | null { return loadCommitments().find((c) => c.goal === goal && c.target === target && kindOf(c) === 'retry') ?? null; }
/** §1: the retry is due at the office's next open slot, at least 60 minutes from now. */
export function retryDue(now: Date, office?: Office | null): Date { return nextOpenSlot(new Date(now.getTime() + 60 * 60_000), office); }

/** one-screen-receipt §4.2: a list saved before the captain list was retired goes on load of `/`. */
export function dropCaptain(): void { write(CAPTAIN_KEY, null); }
/** "Start over": every funnel item goes. */
export function clearFunnel(): void { write(COMMIT_KEY, null); write(CAPTAIN_KEY, null); write(VISITS_KEY, null); write(RECEIPTS_KEY, null); }

// call-follow-through §3: the device's own receipts for the next-office chain. Goal, action, target and
// a time; the rows are kept 7 days (tap-receipts-everywhere §7.1, the goal done stamp) while the office
// squares read a 24 h window. Never sent: the Worker already has the receipt row.
export const RECEIPTS_KEY = 'cut-ties:receipts';
export type ReceiptChannel = 'call' | 'email';
/**
 * results-pages §4 ask: what the office said. The first four are `POST /api/report` outcomes; `skip`, `sent` and
 * `form_failed` are client-only (the write variant and Skip) and never posted.
 */
export type ReceiptOutcome = 'will_support' | 'undecided' | 'opposed' | 'no_answer' | 'skip' | 'sent' | 'form_failed';
/** `channel` arrived with results-pages §3.4; an older row without one was a call. `outcome` is the ask's answer when one was given. */
export interface LoggedReceipt { v: 1; goal: string; action: string; target: string; at: string; channel?: ReceiptChannel; outcome?: ReceiptOutcome }
export const DAY_MS = 24 * 60 * 60_000;
/** §7.1: a receipt row lives a week; `goalDone` reads the week, the office squares the last day. */
export const KEEP_MS = 7 * DAY_MS;
/** The device's receipt rows of the last `within` ms (default a day: the office squares and the next-office chain). */
export function recentReceipts(now: Date = new Date(), within: number = DAY_MS): LoggedReceipt[] {
  const list = read<LoggedReceipt[]>(RECEIPTS_KEY);
  return Array.isArray(list) ? list.filter((r) => r?.v === 1 && typeof r.at === 'string' && now.getTime() - Date.parse(r.at) < within) : [];
}
export function logReceipt(r: Omit<LoggedReceipt, 'v' | 'at'>, now: Date = new Date()): void {
  write(RECEIPTS_KEY, [...recentReceipts(now, KEEP_MS).filter((x) => !(x.goal === r.goal && x.action === r.action && x.target === r.target)), { v: 1, ...r, at: now.toISOString() }]);
}
/** The targets of one action this device filed a receipt for in the last 24 h. */
export function receiptedTargets(goal: string, action: string, now: Date = new Date()): Set<string> {
  return new Set(recentReceipts(now).filter((r) => r.goal === goal && r.action === action).map((r) => r.target));
}
/** results-pages §4: the ask's answer goes on the receipt row. No row (the receipt was not counted) → nothing is kept; returns whether a row was. */
export function setReceiptOutcome(goal: string, action: string, target: string, outcome: ReceiptOutcome, now: Date = new Date()): boolean {
  const list = recentReceipts(now, KEEP_MS);
  const row = list.find((x) => x.goal === goal && x.action === action && x.target === target && now.getTime() - Date.parse(x.at) < DAY_MS);
  if (!row) return false;
  row.outcome = outcome;
  write(RECEIPTS_KEY, list);
  return true;
}
/** results-pages §3.4: this device's receipt per target of one action in the last 24 h, with its channel, time and answer. */
export function receiptsByTarget(goal: string, action: string, now: Date = new Date()): Map<string, { channel: ReceiptChannel; at: string; outcome?: ReceiptOutcome }> {
  return new Map(recentReceipts(now).filter((r) => r.goal === goal && r.action === action).map((r) => [r.target, { channel: r.channel ?? 'call', at: r.at, ...(r.outcome ? { outcome: r.outcome } : {}) }]));
}

/**
 * tap-receipts-everywhere §7.1: the goal is done on this device when every one of `targetIds` has a receipt row for
 * this action in the last 7 days; `at` is the newest of them. No targets, or any without a row → null.
 */
export function goalDone(goal: string, action: string, targetIds: readonly string[], now: Date = new Date()): { at: string } | null {
  if (targetIds.length === 0) return null;
  const rows = recentReceipts(now, KEEP_MS).filter((r) => r.goal === goal && r.action === action);
  let at = '';
  for (const id of targetIds) {
    const row = rows.find((r) => r.target === id);
    if (!row) return null;
    if (row.at > at) at = row.at;
  }
  return { at };
}

/** §2.1 return visit: anything still to do? */
export function hasOpenItems(): boolean { return loadCommitments().length > 0 || loadVisits().length > 0; }

export function loadVisits(): JoinedVisit[] {
  const list = read<JoinedVisit[]>(VISITS_KEY);
  return Array.isArray(list) ? list.filter((j) => j && j.v === 1 && typeof j.id === 'number' && typeof j.starts_at === 'string') : [];
}
export function saveVisits(list: JoinedVisit[]): void { write(VISITS_KEY, list.length ? list : null); }
export function addVisit(j: Omit<JoinedVisit, 'v'>): void { saveVisits([...loadVisits().filter((x) => x.id !== j.id), { v: 1, ...j }]); }
export function removeVisit(id: number): void { saveVisits(loadVisits().filter((x) => x.id !== id)); }
export const joinedVisit = (id: number): JoinedVisit | null => loadVisits().find((x) => x.id === id) ?? null;

const DAY = 86_400_000;
/** call-follow-through §2: every funnel time anchor is 10:00 local; 10:00 anywhere in the US (Hawaii included) falls inside DC hours. */
export const DUE_HOUR = 10;
const atHour = (d: Date): Date => { const x = new Date(d); x.setHours(DUE_HOUR, 0, 0, 0); return x; };
/** A date input's value at the funnel hour, local time. */
export const atDue = (ymdValue: string): Date => new Date(`${ymdValue}T${String(DUE_HOUR).padStart(2, '0')}:00:00`);
/** The next weekday at 10:00 local, never past the goal's decision date (its 10:00) when one is set. */
export function defaultDue(now: Date, decisionDate: string | null | undefined): Date {
  let d = atHour(new Date(now.getTime() + DAY));
  while (d.getDay() === 0 || d.getDay() === 6) d = atHour(new Date(d.getTime() + DAY));
  const ceiling = ceilingFor(decisionDate);
  return ceiling && ceiling < d ? ceiling : d;
}
export function ceilingFor(decisionDate: string | null | undefined): Date | null {
  if (!decisionDate || !/^\d{4}-\d{2}-\d{2}$/.test(decisionDate)) return null;
  return atHour(new Date(decisionDate + 'T12:00:00'));
}
export const isOverdue = (due: string, now: Date = new Date()): boolean => Date.parse(due) < now.getTime();
/** YYYY-MM-DD in local time, for `<input type="date">`. */
export function ymd(d: Date): string { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
export function fmtDue(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/** The commitment reminder: one 15-minute event at the due time, the goal deep link, no name. */
export function reminderIcs(goal: string, title: string, due: string, url: string, retry = false): string {
  return buildIcs({ uid: `${goal}-${retry ? 'retry-' : ''}${Date.parse(due)}@cut-the-ties`, start: new Date(due), title: `${retry ? 'Try again' : 'Call about'}: ${title}`, url, description: `Your words are ready at ${url}` });
}
