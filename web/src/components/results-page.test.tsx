// @vitest-environment happy-dom
// results-pages §2–3: the one-action page hosts the full card; a tap on a square posts the receipt with keepalive and
// opens the modal at once; the office turns done with a ✓ Share pill that reopens the modal without a POST.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import type { GoalCard, RouteResponse, TargetCard } from '../lib/api';
import { loadCommitments, recentReceipts } from '../lib/commitments';
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
  receiptStatus = () => json({ id: 7 });
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    if (url === '/api/receipt') { posts.push({ body: JSON.parse(String(init?.body)), init: init! }); return receiptStatus(); }
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
    expect(q('[data-receipt-stamp]')?.getAttribute('aria-label')).toBe("I called Rep. Correa's office, Nov 6");
    expect(q('[data-receipt-modal] [data-counts]')?.textContent).toBe("You're one of 12 constituents in CA-46 who called this week");
    expect(q('[data-share-row]')).not.toBeNull();
    expect(q('[data-next-office]')?.textContent).toBe('Next: call Sen. Alex Padilla →');
    expect(qa('[data-receipt-modal] .btn-primary')).toHaveLength(1); // one filled control
    expect(q('[data-remind]')).not.toBeNull();
    // §3.4: the row is written and the card is done
    expect(recentReceipts().map((r) => [r.target, r.channel])).toEqual([['C001110', 'call']]);
    expect(q('[data-target="C001110"]')?.getAttribute('data-done')).toBe('call');
    expect(q('[data-target="C001110"] [data-share-pill]')).not.toBeNull();
    expect(q('[data-target="C001110"] [data-call-square]')).toBeNull();
    expect(q('[data-target="C001110"] [data-role-line]')?.textContent).toMatch(/· Called \d{1,2}:\d{2} [ap]m$/);
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
    expect(q('[data-receipt-stamp]')?.getAttribute('aria-label')).toContain("Rep. Correa's office");
  });
  it('every office done → the filled control links the other action; a write tap stamps "I wrote" and offers no reminder', async () => {
    await mount();
    await click('[data-target="P000145"] [data-call-square]');
    await click('[data-not-now]');
    await click('[data-target="S001150"] [data-call-square]');
    await click('[data-not-now]');
    await click('[data-target="C001110"] [data-write-square]');
    expect(posts[2].body).toMatchObject({ target: 'C001110', channel: 'email' });
    expect(q('[data-receipt-stamp]')?.getAttribute('aria-label')).toBe("I wrote to Rep. Correa's office, Nov 6");
    expect(q('[data-next-office]')).toBeNull();
    expect(q('[data-next-link]')?.getAttribute('href')).toBe('/results/state-bonds');
    expect(q('[data-next-link]')?.textContent).toBe('Your other action →');
    expect(q('[data-remind]')).toBeNull();
    expect(q('[data-target="C001110"] [data-role-line]')?.textContent).toContain('· Wrote ');
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
