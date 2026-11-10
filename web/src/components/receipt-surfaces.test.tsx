// @vitest-environment happy-dom
// tap-receipts-everywhere §2, §4, §5: the goal page's stack, the member page's buttons and the whip table's numbers
// run the same receipt engine as `/results/<goal>` (results-page.test.tsx): one POST /api/receipt with keepalive,
// the modal at once, the done mark from the `cut-ties:receipts` row, and plain links where there is no action.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import type { TargetCard } from '../lib/api';
import { recentReceipts } from '../lib/commitments';
import GoalTargets from './GoalTargets';
import MemberContact, { type MemberGoalProps, type MemberProps } from './MemberContact';
import WhipReceipts from './WhipReceipts';
import './ReceiptModal'; // warms the module cache so the lazy import() resolves within a tick
vi.mock('./ShareRow', () => ({
  default: () => h('div', { 'data-share-row': true }, 'share'),
  preparePoster: vi.fn(async () => ({ file: null, canShare: false })),
  receiptSpec: vi.fn((type: string, role: string, name: string) => ({ type, role, name })),
}));

const correa = { bioguide_id: 'C001110', name: 'Lou Correa', party: 'D', role: 'Rep.', state: 'CA', district: 46, phone: '202-225-2965', contact_form_url: 'https://correa.house.gov/contact', contact_kind: 'zip_gate', position: 'unknown', position_source_url: null, prior_vote: 'No recorded vote yet' } as TargetCard;
const padilla = { bioguide_id: 'P000145', name: 'Alex Padilla', party: 'D', role: 'Sen.', state: 'CA', phone: '202-224-3553', contact_form_url: null, position: 'unknown', position_source_url: null, prior_vote: 'No recorded vote yet' } as TargetCard;
const goal: MemberGoalProps = { slug: 'ndaa-1217', title: 'Strip §1217', what_we_want: 'Strip it', category: 'federal_vote', action: 'ndaa-1217-call' };
const member: MemberProps = { bioguide_id: 'C001110', name: 'Lou Correa', role: 'Rep.', party: 'D', chamber: 'house', state: 'CA', district: 46, dc_phone: '202-225-2965', district_phone: '714-555-0100', contact_form_url: 'https://correa.house.gov/contact', contact_kind: 'zip_gate', contact_label: 'Contact form' };
const senator: MemberProps = { ...member, bioguide_id: 'P000145', name: 'Alex Padilla', role: 'Sen.', chamber: 'senate', district: null, dc_phone: '202-224-3553', district_phone: null, contact_form_url: null, contact_kind: null, contact_label: null };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status });

let root: HTMLElement;
let island: HTMLElement;
let posts: { body: Record<string, unknown>; init: RequestInit }[];
let targets: TargetCard[];
const tick = () => new Promise((r) => setTimeout(r, 0));
const flush = async () => { for (let i = 0; i < 4; i++) await act(async () => { await tick(); await tick(); }); };
const q = (sel: string) => root.querySelector(sel);
const click = async (sel: string) => { await act(() => { (q(sel) as HTMLElement).click(); }); await flush(); };
const place = () => localStorage.setItem('cut-ties:place', JSON.stringify({ state: 'CA', district: 46 }));

// happy-dom follows an `https://` link (and fetches the real page); the islands only need the click, so cancel the
// navigation first, in capture, which leaves the islands' own handlers untouched.
document.addEventListener('click', (e) => { if ((e.target as Element).closest?.('a[href^="http"]')) e.preventDefault(); }, true);

beforeEach(() => {
  vi.useFakeTimers({ now: Date.parse('2026-11-06T22:14:00Z'), toFake: ['Date'] });
  posts = [];
  targets = [correa, padilla];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    if (url === '/api/receipt') { posts.push({ body: JSON.parse(String(init?.body)), init: init! }); return json({ id: 7 }); }
    if (url === '/api/report') return json({ id: 3 }, 201);
    if (url.startsWith('/api/counts')) return json({ district: { calls: 12, letters: 0, comments: 0, captain_lists: 0 }, state: { calls: 40, letters: 0, comments: 0, captain_lists: 0 } });
    if (url.includes('/targets')) return json({ targets });
    throw new Error(`unexpected ${url}`);
  }));
  root = document.createElement('div');
  document.body.appendChild(root);
  island = root;
});
afterEach(() => { render(null, island); render(null, root); root.remove(); localStorage.clear(); sessionStorage.clear(); vi.unstubAllGlobals(); vi.useRealTimers(); });

const mountStack = async (action: string | null = 'ndaa-1217-call') => {
  await act(() => { render(h(GoalTargets, { slug: 'ndaa-1217', title: 'Strip §1217', what: 'Strip it', category: 'federal_vote', action }), root); });
  await flush();
};

describe('the goal page stack (§2)', () => {
  it('a tap on the call square posts the receipt with the stored place and the action, opens the modal, then marks the office done with a ✓ Share pill', async () => {
    place();
    await mountStack();
    expect(root.querySelectorAll('[data-target]').length).toBe(2);
    await click('[data-target="C001110"] [data-call-square]');
    expect(posts.length).toBe(1);
    expect(posts[0].body).toMatchObject({ goal: 'ndaa-1217', action: 'ndaa-1217-call', target: 'C001110', state: 'CA', district: 46, channel: 'call' });
    expect(posts[0].init.keepalive).toBe(true);
    expect(q('[data-receipt-modal] [data-postmark="called"]')).not.toBeNull();
    expect(q('[data-next-office]')?.textContent).toContain('Alex Padilla');
    await click('[data-modal-close]');
    expect(q('[data-receipt-modal]')).toBeNull();
    expect(q('[data-target="C001110"]')?.getAttribute('data-done')).toBe('call');
    expect(q('[data-target="C001110"] [data-share-pill]')).not.toBeNull();
    expect(recentReceipts().map((r) => [r.goal, r.target, r.channel])).toEqual([['ndaa-1217', 'C001110', 'call']]);
    await click('[data-target="C001110"] [data-share-pill]');
    expect(posts.length).toBe(1);
    expect(q('[data-receipt-modal]')).not.toBeNull();
  });
  it('the write square posts channel email and stamps WROTE; once every office is done the filled control is "Your two actions →" to /results', async () => {
    place();
    targets = [correa];
    await mountStack();
    await click('[data-target="C001110"] [data-write-square]');
    expect(posts[0].body).toMatchObject({ channel: 'email', target: 'C001110' });
    expect(q('[data-receipt-modal] [data-postmark="wrote"]')).not.toBeNull();
    expect(q('[data-next-link]')?.getAttribute('href')).toBe('/results');
    expect(q('[data-next-link]')?.textContent).toBe('Your two actions →');
  });
  it('no stored place → "Enter your address"; no action → plain links and no POST', async () => {
    await mountStack();
    expect(root.textContent).toContain('Enter your address');
    expect(q('[data-target]')).toBeNull();
    render(null, root);
    place();
    await mountStack(null);
    await click('[data-target="C001110"] [data-call-square]');
    expect(posts.length).toBe(0);
    expect(q('[data-receipt-modal]')).toBeNull();
  });
});

const mountMember = async (m: MemberProps, g: MemberGoalProps | null = goal) => {
  root.innerHTML = '<h1>Rep. Lou Correa <span data-postmark-slot></span></h1><div data-island></div><section data-offices><a href="tel:7145550199" data-office-phone>714-555-0199</a></section>';
  render(null, island);
  island = root.querySelector('[data-island]')!;
  await act(() => { render(h(MemberContact, { member: m, goal: g }), island); });
  await flush();
};

describe('the member page buttons (§4)', () => {
  it('"Call DC office" posts against the first open goal with the stored place, opens the modal whose next is /results, then shows the postmark beside the title and the ✓ Share pill', async () => {
    place();
    await mountMember(member);
    expect(q('[data-dc-call]')?.getAttribute('href')).toBe('tel:2022252965');
    await click('[data-dc-call]');
    expect(posts.length).toBe(1);
    expect(posts[0].body).toMatchObject({ goal: 'ndaa-1217', action: 'ndaa-1217-call', target: 'C001110', state: 'CA', district: 46, channel: 'call' });
    expect(q('[data-receipt-modal]')).not.toBeNull();
    expect(q('[data-next-office]')).toBeNull();
    expect(q('[data-next-link]')?.getAttribute('href')).toBe('/results');
    expect(q('[data-next-link]')?.textContent).toBe('Your two actions →');
    await click('[data-modal-close]');
    expect(q('[data-member-contact] [data-share-pill]')).not.toBeNull();
    expect(q('[data-postmark-slot] [data-postmark="called"]')?.getAttribute('data-postmark-size')).toBe('64');
    expect(q('[data-dc-call]')).not.toBeNull();
    await click('[data-member-contact] [data-share-pill]');
    expect(posts.length).toBe(1);
    expect(q('[data-receipt-modal]')).not.toBeNull();
  });
  it('a district-office card number and the contact link count too; without a place the row takes the member\'s seat and next is /goals', async () => {
    await mountMember(member);
    await click('[data-offices] [data-office-phone]');
    expect(posts.map((p) => p.body)).toEqual([expect.objectContaining({ target: 'C001110', state: 'CA', district: 46, channel: 'call' })]);
    expect(q('[data-next-link]')?.getAttribute('href')).toBe('/goals');
    expect(q('[data-next-link]')?.textContent).toBe('See all goals →');
    await click('[data-modal-close]');
    await mountMember(senator);
    await click('[data-contact-link], [data-dc-call]');
    expect(posts[1].body).toMatchObject({ target: 'P000145', state: 'CA', district: null, channel: 'call' });
  });
  it('the contact link posts channel email; a member with no open goal keeps plain links', async () => {
    place();
    await mountMember(member);
    await click('[data-contact-link]');
    expect(posts[0].body).toMatchObject({ target: 'C001110', channel: 'email' });
    expect(q('[data-receipt-modal] [data-postmark="wrote"]')).not.toBeNull();
    await click('[data-modal-close]');
    await mountMember(member, null);
    await click('[data-dc-call]');
    await click('[data-offices] [data-office-phone]');
    expect(posts.length).toBe(1);
    expect(q('[data-receipt-modal]')).toBeNull();
    expect(q('[data-share-pill]')).toBeNull();
  });
});

const row = (t: TargetCard) => JSON.stringify({ id: t.bioguide_id, name: t.name, role: t.role, party: t.party, state: t.state, district: t.district ?? null, phone: t.phone });
const mountWhip = async () => {
  root.innerHTML = `<table><tr><td><a href="tel:2022252965" data-receipt-target='${row(correa)}'>202-225-2965</a> <a href="/goals/ndaa-1217/act/ndaa-1217-call?target=C001110" data-act>Call</a></td></tr><tr><td><a href="tel:2022243553" data-receipt-target='${row(padilla)}'>202-224-3553</a></td></tr></table><div data-island></div>`;
  render(null, island);
  island = root.querySelector('[data-island]')!;
  await act(() => { render(h(WhipReceipts, { goal }), island); });
  await flush();
};

describe('the whip table numbers (§5)', () => {
  it('a tap on a row\'s number posts the receipt with the row\'s seat when no place is stored, opens the modal with the /goals link, then the row wears a 32 px postmark and keeps its Call button', async () => {
    await mountWhip();
    await click('a[data-receipt-target][href="tel:2022243553"]');
    expect(posts.length).toBe(1);
    expect(posts[0].body).toMatchObject({ goal: 'ndaa-1217', action: 'ndaa-1217-call', target: 'P000145', state: 'CA', district: null, channel: 'call' });
    expect(q('[data-receipt-modal]')).not.toBeNull();
    expect(q('[data-next-office]')).toBeNull();
    expect(q('[data-next-link]')?.getAttribute('href')).toBe('/goals');
    await click('[data-modal-close]');
    expect((q('a[data-receipt-target][href="tel:2022243553"]') as HTMLElement).hidden).toBe(true);
    expect(q('[data-whip-postmark="P000145"] [data-postmark="called"]')?.getAttribute('data-postmark-size')).toBe('32');
    expect((q('a[data-receipt-target][href="tel:2022252965"]') as HTMLElement).hidden).toBe(false);
    expect(q('[data-whip-postmark="C001110"] [data-postmark]')).toBeNull();
    expect(q('[data-act]')).not.toBeNull();
  });
  it('with a stored place the receipt carries that place and next is /results', async () => {
    place();
    await mountWhip();
    await click('a[data-receipt-target][href="tel:2022243553"]');
    expect(posts[0].body).toMatchObject({ target: 'P000145', state: 'CA', district: 46 });
    expect(q('[data-next-link]')?.getAttribute('href')).toBe('/results');
  });
});
