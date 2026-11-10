// @vitest-environment happy-dom
// results-pages §2–3: the one-action page hosts the full card; a tap on a square posts the receipt with keepalive and
// opens the modal at once; the office turns done with a ✓ Share pill that reopens the modal without a POST.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import type { GoalCard, RouteResponse, TargetCard } from '../lib/api';
import { loadCommitments, recentReceipts } from '../lib/commitments';
import { render as renderToString } from 'preact-render-to-string';
import { Target } from './Target';
import Results from './Results';
import './ReceiptModal'; // warms the module cache so the page's lazy import() resolves within a tick
// §3.3: the share chunk is stubbed; `share.test.tsx` covers it. The poster never resolves to a file here.
vi.mock('./ShareRow', () => ({
  default: () => h('div', { 'data-share-row': true }, 'share'),
  preparePoster: vi.fn(async () => ({ file: null, canShare: false })),
  receiptSpec: vi.fn((type: string, role: string, name: string) => ({ type, role, name })),
}));

const correa = { bioguide_id: 'C001110', name: 'Lou Correa', party: 'D', role: 'Rep.', state: 'CA', district: 46, phone: '202-225-2965', contact_form_url: 'https://correa.house.gov/contact', contact_kind: 'zip_gate', position: 'unknown', position_source_url: null, prior_vote: 'No recorded vote yet' } as TargetCard;
const padilla = { bioguide_id: 'P000145', name: 'Alex Padilla', party: 'D', role: 'Sen.', state: 'CA', phone: '202-224-3553', contact_form_url: null, position: 'unknown', position_source_url: null, prior_vote: 'No recorded vote yet' } as TargetCard;
const schiff = { ...padilla, bioguide_id: 'S001150', name: 'Adam Schiff' } as TargetCard;
const ndaa: GoalCard = {
  slug: 'ndaa-1217', title: 'Strip §1217', category: 'federal_vote', summary: 'S', decision_date: '2026-12-10', decision_at: null, decision_date_confirmed: false, ask_text: 'Ask them',
  action_href: '/goals/ndaa-1217/act/ndaa-1217-call', action: 'ndaa-1217-call', short_label: 'NDAA §219 / §1217', what_we_want: 'Strip it', partner_url: null, targets: [correa, padilla, schiff],
} as GoalCard;
const bonds: GoalCard = { ...ndaa, slug: 'state-bonds', title: 'Israel bonds', category: 'state', action: 'state-bonds-call', short_label: 'Israel bonds', targets: [] };
const routeResponse: RouteResponse = { state: 'CA', district: 46, house: { name: 'Lou Correa' }, senators: [{ name: 'Alex Padilla' }, { name: 'Adam Schiff' }], goals: [ndaa, bonds] } as unknown as RouteResponse;
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status });

let root: HTMLElement;
let posts: { body: Record<string, unknown>; init: RequestInit }[];
let receiptStatus: () => Response;
let reports: Record<string, unknown>[];
let reportStatus: () => Response;
// a tap chains: lazy import → POST → res.json() → setModal → (render) → Counts fetch → json → setLine. `act` holds
// re-renders until it returns, so each stage needs its own act; four rounds of two ticks cover the chain.
const tick = () => new Promise((r) => setTimeout(r, 0));
const flush = async () => { for (let i = 0; i < 4; i++) await act(async () => { await tick(); await tick(); }); };
const q = (sel: string) => root.querySelector(sel);
const qa = (sel: string) => [...root.querySelectorAll(sel)];
const click = async (sel: string) => { await act(() => { (q(sel) as HTMLElement).click(); }); await flush(); };

async function mount(goal = 'ndaa-1217') {
  sessionStorage.setItem('cut-ties:route', JSON.stringify(routeResponse));
  localStorage.setItem('cut-ties:place', JSON.stringify({ state: 'CA', district: 46 }));
  root = document.createElement('div');
  document.body.appendChild(root);
  await act(() => { render(h(Results, { goal, photos: {} }), root); });
  await flush();
}

beforeEach(() => {
  vi.useFakeTimers({ now: Date.parse('2026-11-06T22:14:00Z'), toFake: ['Date'] });
  posts = [];
  reports = [];
  receiptStatus = () => json({ id: 7 });
  reportStatus = () => json({ id: 3 }, 201);
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    if (url === '/api/receipt') { posts.push({ body: JSON.parse(String(init?.body)), init: init! }); return receiptStatus(); }
    if (url === '/api/report') { reports.push(JSON.parse(String(init?.body))); return reportStatus(); }
    if (url.startsWith('/api/counts')) return json({ district: { calls: 12, letters: 0, comments: 0, captain_lists: 0 }, state: { calls: 40, letters: 0, comments: 0, captain_lists: 0 } });
    return json({}, 404);
  }));
  HTMLElement.prototype.scrollIntoView = vi.fn();
  // happy-dom would really open the office's contact page on a write-square tap; the tap handler runs regardless (§3.1).
  document.addEventListener('click', (e) => { if ((e.target as Element).closest?.('a[href^="http"], a[href^="tel:"]')) e.preventDefault(); }, true);
});
afterEach(() => { root?.remove(); localStorage.clear(); sessionStorage.clear(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('one-action page (results-pages §2)', () => {
  it('reads the cached route without consuming it; ticker, H1, the full card with squares, the other-action mini card', async () => {
    await mount();
    expect(sessionStorage.getItem('cut-ties:route')).not.toBeNull();
    expect(q('a[href="/results"]')?.textContent).toBe('← Your two actions');
    expect(root.textContent).toContain('Action 1 of 2');
    expect(q('h1')?.textContent).toBe('Strip §1217');
    expect(root.textContent).toContain('Ask them');
    expect(qa('[data-target]')).toHaveLength(3);
    expect(q('[data-target="C001110"] [data-write-square]')?.getAttribute('target')).toBe('_blank');
    expect(q('[data-target="P000145"] [data-write-square]')).toBeNull();
    expect(q('[data-other-action="state-bonds"]')?.getAttribute('href')).toBe('/results/state-bonds');
    expect(q('[data-receipt-modal]')).toBeNull();
    expect(q('[data-share-row]')).toBeNull(); // no share control before a receipt
  });
  it('a goal outside the visitor\'s two shows the notice with both links', async () => {
    await mount('primary-2028');
    expect(root.textContent).toContain("This isn't one of your two actions this week.");
    expect(q('a[href="/results"]')).not.toBeNull();
    expect(q('a[href="/goals/primary-2028"]')).not.toBeNull();
  });
});

describe('receipt modal (results-pages §3)', () => {
  it('tap = receipt: POST with keepalive, channel and target; the modal opens with the stamp, count line, share block and the next office', async () => {
    await mount();
    await click('[data-target="C001110"] [data-call-square]');
    expect(posts).toHaveLength(1);
    expect(posts[0].body).toMatchObject({ goal: 'ndaa-1217', action: 'ndaa-1217-call', target: 'C001110', state: 'CA', district: 46, channel: 'call' });
    expect(typeof posts[0].body.device).toBe('string');
    expect(posts[0].init.keepalive).toBe(true);
    const modal = q('[data-receipt-modal]') as HTMLDialogElement;
    expect(modal).not.toBeNull();
    expect(modal.open).toBe(true);
    expect(q('[data-receipt-stamp]')).toBeNull(); // §5: the dashed stamp stays on the act page
    expect(q('[data-receipt-modal] [data-postmark="called"]')?.getAttribute('aria-label')).toMatch(/^Called Lou Correa, Nov 6 \d{1,2}:\d{2} [AP]M$/);
    expect(q('[data-receipt-who]')?.textContent).toBe('Rep. Correa · CA-46');
    expect(q('[data-receipt-modal] [data-counts]')?.textContent).toBe("You're one of 12 constituents in CA-46 who called this week");
    expect(q('[data-ask="call"]')).not.toBeNull();
    expect(qa('[data-ask-chip]').map((c) => c.textContent)).toEqual(['With us', 'Undecided', 'Opposed', 'No answer']);
    expect(q('[data-ask-skip]')).not.toBeNull();
    expect(q('[data-share-row]')).not.toBeNull();
    expect(q('[data-next-office]')?.textContent).toBe('Next: call Sen. Alex Padilla →');
    // order: postmark, echo, ask, share card, Next, links
    const order = ['data-postmark', 'data-counts', 'data-ask=', 'data-share-row', 'data-next-office', 'data-not-now'].map((s) => q('[data-receipt-modal]')!.innerHTML.indexOf(s));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect(qa('[data-receipt-modal] .btn-primary')).toHaveLength(1); // one filled control
    expect(q('[data-remind]')).not.toBeNull();
    // §3.4: the row is written and the card is done
    expect(recentReceipts().map((r) => [r.target, r.channel])).toEqual([['C001110', 'call']]);
    expect(q('[data-target="C001110"]')?.getAttribute('data-done')).toBe('call');
    expect(q('[data-target="C001110"] [data-share-pill]')).not.toBeNull();
    expect(q('[data-target="C001110"] [data-call-square]')).toBeNull();
    expect(q('[data-target="C001110"] [data-role-line]')?.textContent).toBe('Representative · CA-46'); // §7: no suffix
    expect(q('[data-target="C001110"] [data-postmark="called"]')?.getAttribute('data-postmark-size')).toBe('64');
  });
  it('"Next" closes the modal, rings the next office and scrolls to it; its tap clears the ring; a pill reopens without a POST', async () => {
    await mount();
    await click('[data-target="C001110"] [data-call-square]');
    await click('[data-next-office]');
    expect(q('[data-receipt-modal]')).toBeNull();
    expect(q('[data-target="P000145"] [data-call-square]')?.hasAttribute('data-next')).toBe(true);
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
    await click('[data-target="P000145"] [data-call-square]');
    expect(posts).toHaveLength(2);
    expect(posts[1].body.target).toBe('P000145');
    expect(q('[data-next-office]')?.textContent).toBe('Next: call Sen. Adam Schiff →');
    await click('[data-not-now]');
    expect(q('[data-receipt-modal]')).toBeNull();
    expect(q('[data-target="P000145"] [data-call-square]')).toBeNull();
    await click('[data-target="C001110"] [data-share-pill]');
    expect(q('[data-receipt-modal]')).not.toBeNull();
    expect(posts).toHaveLength(2); // no new POST from the pill
    expect(q('[data-receipt-modal] [data-postmark="called"]')?.getAttribute('aria-label')).toContain('Called Lou Correa');
  });
  it('every office done → the filled control links the other action; a write tap stamps "I wrote" and offers no reminder', async () => {
    await mount();
    await click('[data-target="P000145"] [data-call-square]');
    await click('[data-not-now]');
    await click('[data-target="S001150"] [data-call-square]');
    await click('[data-not-now]');
    await click('[data-target="C001110"] [data-write-square]');
    expect(posts[2].body).toMatchObject({ target: 'C001110', channel: 'email' });
    expect(q('[data-receipt-modal] [data-postmark="wrote"]')?.getAttribute('aria-label')).toMatch(/^Wrote to Lou Correa, Nov 6/);
    expect(q('[data-ask="write"]')).not.toBeNull();
    expect(qa('[data-ask-chip]').map((c) => c.textContent)).toEqual(['Sent it', "Form didn't work"]);
    expect(q('[data-next-office]')).toBeNull();
    expect(q('[data-next-link]')?.getAttribute('href')).toBe('/results/state-bonds');
    expect(q('[data-next-link]')?.textContent).toBe('Your other action →');
    expect(q('[data-remind]')).toBeNull();
    expect(q('[data-target="C001110"] [data-role-line]')?.textContent).toBe('Representative · CA-46');
    expect(q('[data-target="C001110"] [data-postmark="wrote"]')).not.toBeNull();
  });
  it('limit_repeat still writes the row; limit_day shows the message, writes no row and keeps the squares; a network failure shows the fallback', async () => {
    receiptStatus = () => json({ error: 'limit_repeat', message: 'That one is already counted.' }, 429);
    await mount();
    await click('[data-target="C001110"] [data-call-square]');
    expect(q('[data-target="C001110"] [data-share-pill]')).not.toBeNull();
    expect(q('[data-receipt-modal] [data-counts]')).not.toBeNull();
    await click('[data-not-now]');
    receiptStatus = () => json({ error: 'limit_day', message: 'Ten actions a day is plenty.' }, 429);
    await click('[data-target="P000145"] [data-call-square]');
    expect(q('[data-receipt-error]')?.textContent).toBe('Ten actions a day is plenty.');
    expect(q('[data-receipt-modal] [data-counts]')).toBeNull();
    expect(recentReceipts().map((r) => r.target)).toEqual(['C001110']);
    await click('[data-not-now]');
    expect(q('[data-target="P000145"] [data-call-square]')).not.toBeNull();
    receiptStatus = () => { throw new TypeError('offline'); };
    await click('[data-target="S001150"] [data-write-square]'.replace('data-write-square', 'data-call-square'));
    expect(q('[data-receipt-error]')?.textContent).toBe("Couldn't count this one. Your call still counts with the office.");
  });
  it('"Remind me tomorrow" stores the retry commitment and closes; a reload keeps the pill from cut-ties:receipts', async () => {
    await mount();
    await click('[data-target="C001110"] [data-call-square]');
    await click('[data-remind]');
    expect(q('[data-receipt-modal]')).toBeNull();
    expect(loadCommitments().map((c) => [c.kind, c.target, c.who])).toEqual([['retry', 'C001110', 'Rep. Lou Correa']]);
    root.remove();
    await mount();
    expect(q('[data-target="C001110"] [data-share-pill]')).not.toBeNull();
    expect(q('[data-target="C001110"] [data-call-square]')).toBeNull();
    expect(posts).toHaveLength(1);
  });
});

describe('the ask (results-pages §4, PRD receipt-sheet-and-done-stamps §1–3)', () => {
  const counts = () => qa('[data-counts]').map((c) => c.textContent);
  it('No answer → one report with no_answer, the chip fills, "Saved"; With us → will_support; Opposed → a second post; the row keeps the last answer; no count changes', async () => {
    await mount();
    await click('[data-target="C001110"] [data-call-square]');
    const before = counts();
    await click('[data-ask-chip="no_answer"]');
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ goal: 'ndaa-1217', target: 'C001110', outcome: 'no_answer' });
    expect(typeof reports[0].device).toBe('string');
    expect('note' in reports[0]).toBe(false);
    expect(q('[data-ask-chip="no_answer"]')?.getAttribute('aria-pressed')).toBe('true');
    expect(q('[data-ask-chip="no_answer"]')?.className).toContain('bg-ink');
    expect(q('[data-ask-saved]')?.textContent).toBe('Saved');
    expect(recentReceipts()[0].outcome).toBe('no_answer');
    expect(q('[data-target="C001110"] [data-answer-chip]')?.textContent).toBe('No answer');
    await click('[data-ask-chip="will_support"]');
    expect(reports).toHaveLength(2);
    expect(reports[1].outcome).toBe('will_support');
    await click('[data-ask-chip="opposed"]');
    expect(reports).toHaveLength(3);
    expect(reports[2].outcome).toBe('opposed');
    expect(q('[data-ask-chip="will_support"]')?.getAttribute('aria-pressed')).toBe('false');
    expect(recentReceipts()[0].outcome).toBe('opposed');
    expect(q('[data-target="C001110"] [data-answer-chip]')?.textContent).toBe('Said: opposed');
    expect(counts()).toEqual(before);
    // the rest of the modal stands
    expect(q('[data-share-row]')).not.toBeNull();
    expect(q('[data-next-office]')).not.toBeNull();
    expect(q('[data-remind]')).not.toBeNull();
    // a reload keeps the answer: the pill reopens with the chip filled and no new post
    await click('[data-not-now]');
    root.remove();
    await mount();
    expect(q('[data-target="C001110"] [data-answer-chip]')?.textContent).toBe('Said: opposed');
    await click('[data-target="C001110"] [data-share-pill]');
    expect(q('[data-ask-chip="opposed"]')?.getAttribute('aria-pressed')).toBe('true');
    expect(q('[data-ask-saved]')).toBeNull();
    expect(reports).toHaveLength(3);
    expect(posts).toHaveLength(1);
  });
  it('Skip → no post, no "Saved", the strip reads "Skipped", the card shows no answer chip; the rest of the modal is unchanged', async () => {
    await mount();
    await click('[data-target="C001110"] [data-call-square]');
    await click('[data-ask-skip]');
    expect(reports).toHaveLength(0);
    expect(q('[data-ask-saved]')).toBeNull();
    expect(q('[data-ask-skipped]')?.textContent).toBe('Skipped');
    expect(q('[data-ask-chip]')).toBeNull();
    expect(recentReceipts()[0].outcome).toBe('skip');
    expect(q('[data-target="C001110"] [data-answer-chip]')).toBeNull();
    expect(q('[data-counts]')).not.toBeNull();
    expect(q('[data-share-row]')).not.toBeNull();
    expect(q('[data-next-office]')).not.toBeNull();
  });
  it('a failed report reads "Could not save that. Try again.", keeps the chips tappable and the row without an answer; a retry saves', async () => {
    reportStatus = () => json({ error: 'bad_outcome' }, 400);
    await mount();
    await click('[data-target="C001110"] [data-call-square]');
    await click('[data-ask-chip="undecided"]');
    expect(reports).toHaveLength(1);
    expect(q('[data-ask-error]')?.textContent).toBe('Could not save that. Try again.');
    expect(q('[data-ask-saved]')).toBeNull();
    expect(recentReceipts()[0].outcome).toBeUndefined();
    expect(q('[data-share-row]')).not.toBeNull();
    reportStatus = () => { throw new TypeError('offline'); };
    await click('[data-ask-chip="undecided"]');
    expect(reports).toHaveLength(2); // offline: posted, no response
    expect(q('[data-ask-error]')).not.toBeNull();
    reportStatus = () => json({ id: 3 }, 201);
    await click('[data-ask-chip="undecided"]');
    expect(reports).toHaveLength(3);
    expect(q('[data-ask-error]')).toBeNull();
    expect(q('[data-ask-saved]')).not.toBeNull();
    expect(recentReceipts()[0].outcome).toBe('undecided');
  });
  it('an answer given while the receipt POST is in flight lands on the row; a receipt that was limit_day keeps none', async () => {
    let release!: (r: Response) => void;
    receiptStatus = () => { throw new Promise<Response>((r) => { release = r; }); };
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/receipt') { posts.push({ body: JSON.parse(String(init?.body)), init: init! }); return new Promise<Response>((r) => { release = r; }); }
      if (url === '/api/report') { reports.push(JSON.parse(String(init?.body))); return reportStatus(); }
      if (url.startsWith('/api/counts')) return json({ district: { calls: 12, letters: 0, comments: 0, captain_lists: 0 }, state: { calls: 40, letters: 0, comments: 0, captain_lists: 0 } });
      return json({}, 404);
    }));
    await mount();
    await click('[data-target="C001110"] [data-call-square]');
    expect(q('[data-receipt-modal] [data-counts]')).toBeNull();
    await click('[data-ask-chip="will_support"]');
    expect(reports).toHaveLength(1);
    expect(q('[data-ask-saved]')).not.toBeNull();
    expect(recentReceipts()).toHaveLength(0);
    await act(async () => { release(json({ id: 7 })); });
    await flush();
    expect(recentReceipts().map((r) => [r.target, r.outcome])).toEqual([['C001110', 'will_support']]);
    await click('[data-not-now]');
    await click('[data-target="P000145"] [data-call-square]');
    await act(async () => { release(json({ error: 'limit_day', message: 'Ten actions a day is plenty.' }, 429)); });
    await flush();
    await click('[data-ask-chip="opposed"]');
    expect(reports).toHaveLength(2); // posted
    expect(recentReceipts().map((r) => r.target)).toEqual(['C001110']); // not kept
  });
  it('write: "Did it go through?"; Sent it posts nothing and fills without "Saved"; Form didn\'t work swaps Next for "Call <Surname> instead →", which rings the call square on the done card', async () => {
    await mount();
    await click('[data-target="C001110"] [data-write-square]');
    expect(q('[data-ask="write"] p')?.textContent).toBe('Did it go through?');
    expect(q('[data-remind]')).toBeNull();
    await click('[data-ask-chip="sent"]');
    expect(reports).toHaveLength(0);
    expect(q('[data-ask-chip="sent"]')?.getAttribute('aria-pressed')).toBe('true');
    expect(q('[data-ask-saved]')).toBeNull();
    expect(recentReceipts()[0].outcome).toBe('sent');
    expect(q('[data-target="C001110"] [data-answer-chip]')).toBeNull();
    expect(q('[data-next-office]')).not.toBeNull();
    await click('[data-ask-chip="form_failed"]');
    expect(reports).toHaveLength(0);
    expect(recentReceipts().map((r) => [r.target, r.channel, r.outcome])).toEqual([['C001110', 'email', 'form_failed']]); // the row stands
    expect(q('[data-next-office]')).toBeNull();
    expect(q('[data-call-instead]')?.textContent).toBe('Call Rep. Correa instead →');
    expect(qa('[data-receipt-modal] .btn-primary')).toHaveLength(1);
    await click('[data-call-instead]');
    expect(q('[data-receipt-modal]')).toBeNull();
    const square = q('[data-target="C001110"] [data-call-square]');
    expect(square?.hasAttribute('data-next')).toBe(true);
    expect(q('[data-target="C001110"]')?.getAttribute('data-done')).toBe('email');
    expect(q('[data-target="C001110"] [data-share-pill]')).not.toBeNull();
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
    // its tap is a call receipt of its own
    await click('[data-target="C001110"] [data-call-square]');
    expect(posts).toHaveLength(2);
    expect(posts[1].body.channel).toBe('call');
    expect(q('[data-ask="call"]')).not.toBeNull();
    expect(recentReceipts().map((r) => [r.channel, r.outcome])).toEqual([['call', undefined]]);
  });
  it('write without a phone (member-elect contact square): Form didn\'t work keeps the usual Next', async () => {
    const elect = { ...correa, bioguide_id: 'E000001', name: 'Eve Elect', phone: null, contact_form_url: null, elect: { contact_url: 'https://example.org/contact', takes_office: '2027-01-03', replaces_name: 'Lou Correa' } } as unknown as TargetCard;
    sessionStorage.setItem('cut-ties:route', JSON.stringify({ ...routeResponse, goals: [{ ...ndaa, targets: [elect, padilla] }, bonds] }));
    localStorage.setItem('cut-ties:place', JSON.stringify({ state: 'CA', district: 46 }));
    root = document.createElement('div');
    document.body.appendChild(root);
    await act(() => { render(h(Results, { goal: 'ndaa-1217', photos: {} }), root); });
    await flush();
    await click('[data-target="E000001"] [data-write-square]');
    expect(posts[0].body.channel).toBe('email');
    expect(q('[data-ask="write"]')).not.toBeNull();
    await click('[data-ask-chip="form_failed"]');
    expect(q('[data-call-instead]')).toBeNull();
    expect(q('[data-next-office]')?.textContent).toBe('Next: call Sen. Alex Padilla →');
  });
  it('done card (§7): postmark name, day and time, 64 px on the corner, the answer chip beside the pill, the header text clear of it; after 24 h the squares return', () => {
    const at = '2026-11-06T22:14:00Z';
    const out = renderToString(h(Target, { t: correa, done: { channel: 'call', at, outcome: 'will_support' } }));
    expect(out).toMatch(/^<li class="relative bg-newsprint\/60 border-2 border-ink shadow-brutal-sm p-3\.5"/);
    expect(out).toMatch(/role="img" aria-label="Called Lou Correa, Nov 6 \d{1,2}:\d{2} [AP]M" data-postmark="called" data-postmark-size="64"/);
    expect(out).toContain('absolute -top-2 right-2.5');
    expect(out).toMatch(/data-role-line[^>]*>Representative · CA-46</);
    expect(out).toContain('min-w-0 flex-1 pr-14');
    expect(out).toMatch(/data-done-row[^>]*>[\s\S]*data-share-pill[\s\S]*data-answer-chip="will_support">Said: with us<\/span>/);
    expect(out).not.toContain('data-call-square');
    expect(out).not.toContain('data-write-square');
    expect(renderToString(h(Target, { t: correa, done: { channel: 'email', at } }))).toMatch(/aria-label="Wrote to Lou Correa, Nov 6 [^"]+" data-postmark="wrote"/);
    expect(renderToString(h(Target, { t: correa, done: { channel: 'email', at, outcome: 'skip' } }))).not.toContain('data-answer-chip');
    expect(renderToString(h(Target, { t: correa, done: { channel: 'call', at, outcome: 'no_answer' } }))).toContain('data-answer-chip="no_answer">No answer<');
    // after 24 h the row is gone and the squares are back
    localStorage.setItem('cut-ties:receipts', JSON.stringify([{ v: 1, goal: 'ndaa-1217', action: 'ndaa-1217-call', target: 'C001110', at: '2026-11-05T22:13:00Z', channel: 'call', outcome: 'opposed' }]));
    expect(recentReceipts()).toEqual([]);
  });
});
