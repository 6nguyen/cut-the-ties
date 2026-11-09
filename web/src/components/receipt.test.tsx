// @vitest-environment happy-dom
// one-screen-receipt §2: after "I did it" the card is one screen (stamp, count line, share block, next office, office
// response, three text links) with at most one filled button, and every choice saves on the tap that makes it.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import ActForm, { stampDay, stampOffice } from './ActForm';
import type { GenerateDone } from '@worker/generate';
import { defaultDue, loadCommitments, logReceipt } from '../lib/commitments';
import { downloadIcs, icsDate } from '../lib/ics';

vi.mock('../lib/ics', async (orig) => ({ ...(await orig<typeof import('../lib/ics')>()), downloadIcs: vi.fn() }));

const OPEN = Date.parse('2026-11-02T15:00:00Z'); // Monday 10:00 Eastern
const CLOSED = Date.parse('2026-11-03T04:00:00Z'); // Monday 23:00 Eastern: DC and the CA district office both shut
const fields = [
  { name: 'first_name', label: 'First name', max: 40, required: true, multiline: false },
  { name: 'city', label: 'City', max: 60, required: true, multiline: false },
  { name: 'why', label: 'Why', max: 280, required: true, multiline: true },
];
const doc: GenerateDone = {
  subject: '', body: 'Line one.', facts_used: [], words: 2, standard: false,
  target: { id: 'C001110', name: 'Lou Correa', role: 'Rep.', phones: ['202-225-2965', '714-559-6190'], contact_form_url: 'https://correa.house.gov/contact', contact_kind: 'zip_gate', chamber: 'house' },
};
const THREE = [{ bioguide_id: 'C001110', role: 'Rep.', name: 'Lou Correa' }, { bioguide_id: 'P000145', role: 'Sen.', name: 'Alex Padilla' }, { bioguide_id: 'S001150', role: 'Sen.', name: 'Adam Schiff' }];
const buckets = (calls = 0) => ({ calls, letters: 0, comments: 0, captain_lists: 0 });
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status });

let root: HTMLElement;
let calls: { url: string; body: Record<string, unknown> | null }[];
/** Per-test server: the targets list, the district count and whether `/api/report` answers 200. */
let server: { targets: typeof THREE; district: number; reportOk: boolean };
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });
const click = (sel: string) => act(() => { (root.querySelector(sel) as HTMLElement).click(); });
const type = (sel: string, value: string) => act(() => { const el = root.querySelector(sel) as HTMLInputElement; el.value = value; el.dispatchEvent(new Event('input', { bubbles: true })); });
const q = (sel: string) => root.querySelector(sel);
const reports = () => calls.filter((c) => c.url === '/api/report');
/** Filled buttons §2 owns. The share block is left out: its "Share poster" keeps the fill where the browser can share files, until §3 swaps in the icon buttons. */
const filled = () => [...root.querySelectorAll('[data-output-side] .btn-primary')].filter((b) => !b.closest('[data-share-row]'));
const chip = (v: string) => q(`[data-chip=${v}]`) as HTMLButtonElement;

async function mount(now = OPEN, type_: 'call' | 'letter' = 'call') {
  vi.useFakeTimers({ now, toFake: ['Date'] });
  localStorage.setItem('cut-ties:place', JSON.stringify({ state: 'CA', district: 46 }));
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, body: init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null });
    if (url.includes('/targets')) return json({ targets: server.targets });
    if (url === '/api/generate') return new Response(`event: done\ndata: ${JSON.stringify(doc)}\n\n`, { status: 200 });
    if (url === '/api/receipt') return json({ id: 7 });
    if (url === '/api/report') return server.reportOk ? json({ ok: true }) : json({ error: 'nope' }, 500);
    if (url.startsWith('/api/counts')) return json({ district: buckets(server.district), state: buckets(), since: '2026-10-26' });
    throw new Error(`unexpected ${url}`);
  }));
  await act(() => { render(h(ActForm, { goal: 'ndaa-1217', action: 'ndaa-1217-call', type: type_, scope: 'both', fields, fmt: { min_words: 1, max_words: 500 } as never, title: 'Strip 1217', decision: '2026-12-10', emailSubject: type_ === 'call' ? 'Constituent in {city}: get section 1217 out' : null }), root); });
  await flush();
  type('#first_name', 'Maria'); type('#city', 'Santa Ana'); type('#why', 'Because.');
  await click('button[type=submit]');
  await flush(); await flush();
}
/** "I did it", then wait for the lazy receipt chunks (extras and the share row). */
async function didIt() {
  await act(() => { [...root.querySelectorAll('button')].find((b) => b.textContent === 'I did it')!.click(); });
  await flush();
  await vi.waitFor(() => { expect(q('[data-remind]')).not.toBeNull(); expect(q('[data-share-row]')).not.toBeNull(); });
  await flush();
}

beforeEach(() => {
  localStorage.clear(); calls = []; server = { targets: THREE, district: 12, reportOk: true };
  vi.mocked(downloadIcs).mockClear();
  root = document.createElement('div'); document.body.appendChild(root);
});
afterEach(() => { render(null, root); root.remove(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('the receipt card is one screen (§2.1–2.7)', () => {
  it('shows stamp, count line, share block, next office, office response and three text links, in that order, with no step in between', async () => {
    await mount();
    expect(q('[data-share-row]')).toBeNull(); // no share control before a receipt
    await didIt();
    const card = q('[data-receipt-card]')!;
    const order = ['data-receipt-stamp', 'data-counts', 'data-share-row', 'data-next-office', 'data-response', 'data-receipt-links'];
    expect([...card.children].map((c) => order.find((a) => c.hasAttribute(a)))).toEqual(order);
    const stamp = q('[data-receipt-stamp]')!;
    expect(stamp.getAttribute('role')).toBe('status');
    expect(stamp.getAttribute('aria-label')).toBe("I called Rep. Correa's office, Nov 2");
    expect(stamp.textContent).toBe("I CALLEDRep. Correa's officeNov 2");
    expect(q('[data-counts]')!.textContent).toBe("You're one of 12 constituents in CA-46 who called this week");
    expect(q('[data-next-primary]')!.textContent).toBe("Next: call Sen. Alex Padilla's office →");
    expect(q('[data-next-primary]')!.getAttribute('href')).toBe('/goals/ndaa-1217/act/ndaa-1217-call?target=P000145');
    // the three text links: underlined, never a button
    const links = [...q('[data-receipt-links]')!.querySelectorAll('a, button')];
    expect(links.map((l) => l.textContent)).toEqual(['Remind me before the vote (.ics)', 'Chip in for the hosting and the drafts →', 'Your other action']);
    for (const l of links) { expect(l.className).toMatch(/underline/); expect(l.className).not.toMatch(/btn/); }
    expect(links[2].getAttribute('href')).toBe('/results');
    // what left the screen
    expect(q('input[type=date]')).toBeNull();
    expect(q('#reflection')).toBeNull();
    expect(q('[data-step]')).toBeNull();
    expect(q('[id^=captain-]')).toBeNull();
    expect(card.querySelectorAll('input').length).toBe(0); // no name field, no reflection field, no date
    const words = [...root.querySelectorAll('button')].map((b) => b.textContent);
    for (const gone of ['Send', 'Skip', "Yes, I'll call", 'Save my three']) expect(words).not.toContain(gone);
    expect(root.textContent).not.toMatch(/Counted\./);
    expect(root.textContent).not.toMatch(/how did it feel/);
  });

  it('with no number over the threshold the count line renders nothing, and the stamp carries the receipt', async () => {
    server.district = 0;
    await mount();
    await didIt();
    expect(calls.some((c) => c.url.startsWith('/api/counts'))).toBe(true);
    expect(q('[data-counts]')).toBeNull();
    expect(root.textContent).not.toMatch(/Counted/);
    expect(q('[data-receipt-stamp]')).not.toBeNull();
  });

  it('a letter stamps "I WROTE" and its reminder asks for a call', async () => {
    await mount(OPEN, 'letter');
    await didIt();
    expect(q('[data-receipt-stamp]')!.getAttribute('aria-label')).toBe("I wrote to Rep. Correa's office, Nov 2");
    expect(q('[data-receipt-stamp]')!.textContent).toMatch(/^I WROTE/);
    expect(q('[data-remind]')!.textContent).toBe('Remind me to call (.ics)');
  });

  it('only /api/counts leaves the page between the receipt and the share block', async () => {
    await mount();
    const before = calls.length;
    await didIt();
    expect(calls.slice(before).map((c) => c.url.split('?')[0])).toEqual(['/api/receipt', '/api/counts']);
  });

  it('stampOffice and stampDay: the office by role and surname, a treasurer by state, the day without a year', () => {
    expect(stampOffice('Rep.', 'Frank Pallone, Jr.')).toBe("Rep. Pallone's office");
    expect(stampOffice('State Treasurer', 'Glenn Hegar', 'TX')).toBe('the TX Treasurer');
    expect(stampDay(new Date(2026, 10, 8, 12))).toBe('Nov 8');
  });
});

describe('at most one filled button in every state (§2.4, §2.8)', () => {
  it('the next office is the only fill; the call row, "Email it instead" and the closed-office button are bordered', async () => {
    await mount(CLOSED);
    expect(filled().length).toBeGreaterThan(1); // before the receipt: the call buttons, the closed-office email button and "I did it"
    await didIt();
    expect(filled()).toEqual([q('[data-next-primary]')]);
    expect(q('[data-email-closed]')!.className).toMatch(/btn-ghost/);
    for (const a of root.querySelectorAll('a[href^="tel:"]')) expect(a.className).toMatch(/btn-ghost/);
    await click('[data-chip=no_answer]');
    await flush(); await flush();
    expect(q('[data-email-instead]')).not.toBeNull();
    expect(filled()).toEqual([q('[data-next-primary]')]);
    // the email step open after a receipt: "I sent it" holds the fill, the next office and the contact link drop to bordered
    await click('[data-email-instead]');
    expect(q('[data-email-step]')).not.toBeNull();
    expect(filled()).toEqual([q('[data-sent]')]);
    // …and closed again
    await act(() => { [...root.querySelectorAll('button')].find((b) => b.textContent === 'Back to calling')!.click(); });
    expect(filled()).toEqual([q('[data-next-primary]')]);
  });

  it('all offices called: the line, and no filled button', async () => {
    logReceipt({ goal: 'ndaa-1217', action: 'ndaa-1217-call', target: 'P000145' }, new Date(OPEN));
    logReceipt({ goal: 'ndaa-1217', action: 'ndaa-1217-call', target: 'S001150' }, new Date(OPEN));
    await mount();
    await didIt();
    expect(q('[data-next-done]')!.textContent).toBe('All three called this week.');
    expect(filled()).toEqual([]);
  });

  it('a one-target goal shows no next office and no filled button', async () => {
    server.targets = THREE.slice(0, 1);
    await mount();
    await didIt();
    expect(q('[data-next-office]')).toBeNull();
    expect(filled()).toEqual([]);
  });
});

describe('the office response saves on tap (§2.5)', () => {
  it('"Opposed" makes exactly one POST /api/report, shows "Saved", fills the chip and disables the others; there is no "Send"', async () => {
    await mount();
    await didIt();
    expect(q('[data-outcome-saved]')).toBeNull();
    await click('[data-chip=opposed]');
    await click('[data-chip=opposed]'); // a second tap while the first is in flight posts nothing
    await flush();
    expect(reports().length).toBe(1);
    expect(reports()[0].body).toEqual({ goal: 'ndaa-1217', target: 'C001110', outcome: 'opposed', device: expect.any(String) });
    expect(q('[data-outcome-saved]')!.textContent).toBe('Saved');
    expect(chip('opposed').textContent).toBe('✓ Opposed');
    expect(chip('opposed').className).toMatch(/bg-ink/);
    expect(chip('opposed').getAttribute('aria-pressed')).toBe('true');
    for (const v of ['will_support', 'undecided', 'no_answer', 'other']) expect(chip(v).disabled).toBe(true);
    await click('[data-chip=opposed]'); await click('[data-chip=undecided]'); await click('[data-chip=other]');
    await flush();
    expect(reports().length).toBe(1); // one report per call: the chips are locked
    expect(q('[data-note]')).toBeNull();
    expect(q('[data-put-in-writing]')!.textContent).toBe('Put it in writing (2 min)');
  });

  it('"Other" posts nothing on tap: it opens the 140-character field with a bordered "Save note", and Enter saves `other` with the note', async () => {
    await mount();
    await didIt();
    await click('[data-chip=other]');
    await flush();
    expect(reports().length).toBe(0);
    const input = q('[data-note] input') as HTMLInputElement;
    expect(input.maxLength).toBe(140);
    const save = q('[data-note] button') as HTMLButtonElement;
    expect(save.textContent).toBe('Save note');
    expect(save.className).toMatch(/btn-ghost/);
    expect(q('[data-outcome-saved]')).toBeNull();
    type('[data-note] input', '  Staffer took a message  ');
    await act(() => { q('[data-note]')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); }); // Enter in the field
    await flush();
    expect(reports().length).toBe(1);
    expect(reports()[0].body).toEqual({ goal: 'ndaa-1217', target: 'C001110', outcome: 'other', note: 'Staffer took a message', device: expect.any(String) });
    expect(q('[data-outcome-saved]')!.textContent).toBe('Saved');
    expect(q('[data-note]')).toBeNull();
    expect(chip('other').textContent).toBe('✓ Other');
  });

  it('a failed post says "Could not save that. Try again." under the chips and re-enables them; the retry saves', async () => {
    server.reportOk = false;
    await mount();
    await didIt();
    await click('[data-chip=undecided]');
    await flush();
    const err = q('[data-report-error]')!;
    expect(err.textContent).toBe('Could not save that. Try again.');
    expect(err.getAttribute('role')).toBe('alert');
    expect(q('[data-outcome-saved]')).toBeNull();
    for (const v of ['will_support', 'undecided', 'opposed', 'no_answer', 'other']) expect(chip(v).disabled).toBe(false);
    expect(chip('undecided').className).not.toMatch(/bg-ink/);
    server.reportOk = true;
    await click('[data-chip=will_support]');
    await flush();
    expect(reports().length).toBe(2);
    expect(q('[data-report-error]')).toBeNull();
    expect(q('[data-outcome-saved]')!.textContent).toBe('Saved');
  });

  it('a network failure is the same error, not a silent tap', async () => {
    await mount();
    await didIt();
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await click('[data-chip=opposed]');
    await flush();
    expect(q('[data-report-error]')!.textContent).toBe('Could not save that. Try again.');
    expect(chip('opposed').disabled).toBe(false);
  });
});

describe('the reminder link (§2.6)', () => {
  it('downloads a valid .ics for the default date, stores one commitment, makes no request and then reads "Reminder saved"', async () => {
    await mount();
    await didIt();
    const before = calls.length;
    await click('[data-remind]');
    const due = defaultDue(new Date(OPEN), '2026-12-10');
    expect(loadCommitments()).toEqual([{ v: 1, goal: 'ndaa-1217', action: 'ndaa-1217-call', target: 'C001110', due: due.toISOString() }]);
    expect(downloadIcs).toHaveBeenCalledTimes(1);
    const [name, ics] = vi.mocked(downloadIcs).mock.calls[0];
    expect(name).toBe('call-ndaa-1217');
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain(`DTSTART:${icsDate(due)}`);
    expect(ics).toContain('SUMMARY:Call about: Strip 1217');
    expect(calls.length).toBe(before);
    const said = q('[data-remind]')!;
    expect(said.textContent).toBe('Reminder saved');
    expect(said.tagName).toBe('P'); // no longer a control: a second tap cannot store a second commitment
  });
});
