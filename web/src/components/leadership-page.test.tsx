// @vitest-environment happy-dom
// leadership-card-two-goals §2.3, §5: on `/results/<slug>` the island opens the split card by either goal's slug, sets
// the H1, the tab title and the mini card from the pair copy, and keeps the summary cards on `/results` on the pair title.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import type { GoalCard, RouteResponse, TargetCard } from '../lib/api';
import Results from './Results';

const correa = { bioguide_id: 'C001110', name: 'Lou Correa', party: 'D', role: 'Rep.', state: 'CA', district: 46, phone: '202-225-2965', contact_form_url: null, contact_kind: null, position: 'unknown', position_source_url: null, prior_vote: 'No recorded vote yet' } as TargetCard;
const padilla = { bioguide_id: 'P000145', name: 'Alex Padilla', party: 'D', role: 'Sen.', state: 'CA', phone: '202-224-3553', contact_form_url: null, contact_kind: null, position: 'unknown', position_source_url: null, prior_vote: 'No recorded vote yet' } as TargetCard;
const base = { category: 'leadership', summary: 'S', decision_at: null, decision_date_confirmed: false, what_we_want: 'W', partner_url: null } as Partial<GoalCard>;
const senate = { ...base, slug: 'senate-leader', title: 'Kick out Chuck Schumer', chamber: 'senate', decision_date: '2027-01-05', ask_text: 'Ask S', action_href: '/goals/senate-leader/act/senate-leader-call', action: 'senate-leader-call', short_label: 'Schumer vote', targets: [padilla] } as GoalCard;
const house = { ...base, slug: 'house-caucus', title: 'Kick out Hakeem Jeffries', chamber: 'house', decision_date: '2026-11-18', ask_text: 'Ask H', action_href: '/goals/house-caucus/act/house-caucus-call', action: 'house-caucus-call', short_label: 'Jeffries vote', targets: [correa], also: senate, uncalled: [] } as GoalCard;
const bonds = { ...base, slug: 'state-bonds', title: 'Israel bonds', category: 'state', decision_date: null, ask_text: 'Ask B', action_href: '/goals/state-bonds/act/state-bonds-call', action: 'state-bonds-call', short_label: 'Israel bonds', targets: [] } as GoalCard;
const routeResponse = { state: 'CA', district: 46, house: { name: 'Lou Correa' }, senators: [{ name: 'Alex Padilla' }, { name: 'Adam Schiff' }], goals: [house, bonds] } as unknown as RouteResponse;
const pair = { title: 'Kick out Jeffries and Schumer', summary: 'Democrats in Congress are about to pick their leaders.' };
const tick = () => new Promise((r) => setTimeout(r, 0));
let root: HTMLElement;

async function mount(goal?: string) {
  sessionStorage.setItem('cut-ties:route', JSON.stringify(routeResponse));
  localStorage.setItem('cut-ties:place', JSON.stringify({ state: 'CA', district: 46 }));
  root = document.createElement('div');
  document.body.appendChild(root);
  await act(() => { render(h(Results, { goal, photos: {}, pair }), root); });
  await act(async () => { await tick(); await tick(); });
}
beforeEach(() => {
  vi.useFakeTimers({ now: Date.parse('2026-11-06T22:14:00Z'), toFake: ['Date'] });
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({}), { status: 404 })));
  document.title = 'Kick out Chuck Schumer — Cut the Ties';
});
afterEach(() => { root?.remove(); localStorage.clear(); sessionStorage.clear(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('split card by either slug (leadership-card-two-goals §5)', () => {
  it('/results/senate-leader opens the split card as Action 1 of 2 with the pair H1 and tab title, both blocks and the other mini card', async () => {
    await mount('senate-leader');
    expect(root.textContent).not.toContain("This isn't one of your two actions");
    expect(root.textContent).toContain('Action 1 of 2');
    expect(root.querySelector('h1')?.textContent).toBe('Kick out Jeffries and Schumer');
    expect(document.title).toBe('Kick out Jeffries and Schumer — Cut the Ties');
    expect(root.querySelector('h2')?.textContent).toBe('Kick out Jeffries and Schumer');
    expect([...root.querySelectorAll('h3')].map((e) => e.textContent)).toEqual(['Kick out Hakeem Jeffries', 'Kick out Chuck Schumer']);
    expect(root.querySelector('[data-split-rule]')).not.toBeNull();
    expect(root.querySelector('[data-more="senate-leader"]')?.getAttribute('href')).toBe('/goals/senate-leader');
    expect(root.querySelector('[data-other-action="state-bonds"]')).not.toBeNull();
  });
  it('/results/house-caucus renders the same card; the mini card on the other page names the pair', async () => {
    await mount('house-caucus');
    expect(root.querySelector('h1')?.textContent).toBe('Kick out Jeffries and Schumer');
    expect(root.querySelectorAll('[data-target]')).toHaveLength(2);
    root.remove();
    await mount('state-bonds');
    expect(root.querySelector('h1')?.textContent).toBe('Israel bonds');
    expect(document.title).toBe('Israel bonds — Cut the Ties');
    expect(root.querySelector('[data-other-action="house-caucus"]')?.textContent).toContain('Kick out Jeffries and Schumer');
  });
  it('/results: the summary card wears the pair title and the two offices lines', async () => {
    await mount();
    const card = root.querySelector('[data-summary-card="house-caucus"]')!;
    expect(card.querySelector('h2')?.textContent).toBe('Kick out Jeffries and Schumer');
    expect([...card.querySelectorAll('[data-offices]')].map((e) => e.textContent)).toEqual(['Jeffries vote · Correa', 'Schumer vote · Padilla']);
    expect([...card.querySelectorAll('[data-meta] span')].map((e) => e.textContent)).toEqual(['Call', '2 offices', 'House + Senate']);
  });
});
