// results-pages §1: the two /results slots are summary cards: band, chips, stamp, meta chips, offices line, one link
// each; no phone number, ask, counts line or target card. Rendered with preact-render-to-string under node.
import { h } from 'preact';
import { render } from 'preact-render-to-string';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { GoalCard, TargetCard } from '../lib/api';
import SummaryCard, { eagerBand, metaChips, officesLine, officesOf } from './SummaryCard';
import { Target } from './Target';

const correa = { bioguide_id: 'C001110', name: 'Lou Correa', party: 'D', role: 'Rep.', state: 'CA', district: 46, phone: '202-225-2965', contact_form_url: 'https://correa.house.gov/contact', contact_kind: 'zip_gate', position: 'unknown', position_source_url: null, prior_vote: 'No recorded vote yet' } as TargetCard;
const padilla = { bioguide_id: 'P000145', name: 'Alex Padilla', party: 'D', role: 'Sen.', state: 'CA', phone: '202-224-3553', contact_form_url: null, contact_kind: null, position: 'unknown', position_source_url: null, prior_vote: 'No recorded vote yet' } as TargetCard;
const schiff = { ...padilla, bioguide_id: 'S001150', name: 'Adam Schiff Jr.' } as TargetCard;
const wiener = { bioguide_id: 'CA-11-wiener', name: 'Scott Wiener', party: 'D', role: 'Representative-elect', phone: null, position: 'unknown', position_source_url: null, prior_vote: 'No recorded vote yet', elect: { replaces_name: 'Nancy Pelosi', takes_office: '2027-01-03', contact_url: 'https://scottwiener.com/' } } as TargetCard;
const goal = (o: Partial<GoalCard>): GoalCard => ({
  slug: 'ndaa-1217', title: 'Strip §1217', category: 'federal_vote', summary: 'S', decision_date: '2026-11-18', decision_at: null, decision_date_confirmed: false, ask_text: 'Ask',
  action_href: '/goals/ndaa-1217/act/ndaa-1217-call', action: 'ndaa-1217-call', short_label: 'NDAA §219 / §1217', what_we_want: 'Strip it', partner_url: null, targets: [correa, padilla, schiff], ...o,
} as GoalCard);
beforeAll(() => vi.useFakeTimers({ now: Date.parse('2026-11-06T12:00:00Z'), toFake: ['Date'] }));
afterAll(() => vi.useRealTimers());

describe('summary card (results-pages §1)', () => {
  it('is one link to /results/<goal> with the band, chips, title, stamp, meta chips, offices and a filled CTA on the first card', () => {
    const out = render(h(SummaryCard, { g: goal({}), n: 1 }));
    expect(out).toMatch(/^<a href="\/results\/ndaa-1217" class="relative card-lg/);
    expect(out).toContain('>Vote in Congress<');
    expect(out).toContain('>Action 1<');
    expect(out).toContain('<h2 class="relative headline-lg">Strip §1217</h2>');
    expect(out).toContain('data-countdown="summary-ndaa-1217"');
    expect(metaChips(goal({}))).toEqual(['Call or write', '3 offices', 'NDAA §219 / §1217']);
    expect(out).toContain('>Correa · Padilla · Schiff<'); // surnames, suffix dropped
    expect(out.match(/<img [^>]*\/portraits\//g)).toHaveLength(3);
    expect(out).toContain('class="btn btn-primary self-start mt-auto">Open this action →</span>');
    expect(out).not.toContain('tel:');
    expect(out).not.toContain('data-target=');
    expect(out).not.toContain('data-counts');
    expect(out).not.toContain('Ask');
  });
  it('the second card is bordered; one office, no short label and no contact form read "Call" and "1 office"; a past date shows the line, no stamp', () => {
    const g = goal({ slug: 'senate-leader', targets: [padilla], short_label: null, decision_date: '2026-10-01' });
    const out = render(h(SummaryCard, { g, n: 2 }));
    expect(out).toContain('class="btn btn-ghost self-start mt-auto">Open this action →</span>');
    expect(metaChips(g)).toEqual(['Call', '1 office']);
    expect(out).not.toContain('data-countdown');
    expect(out).toContain('Decision: Oct 1, 2026');
  });
  it('a split leadership card is one card: "House + Senate", the offices of both blocks House first, a member-elect counts as a write', () => {
    const senate = goal({ slug: 'senate-leader', chamber: 'senate', targets: [padilla, schiff], short_label: null });
    const g = goal({ slug: 'house-caucus', chamber: 'house', targets: [wiener], also: senate, short_label: null });
    expect(officesOf(g).map((t) => t.name)).toEqual(['Scott Wiener', 'Alex Padilla', 'Adam Schiff Jr.']);
    expect(metaChips(g)).toEqual(['Call or write', '3 offices', 'House + Senate']);
    expect(officesLine(officesOf(g))).toBe('Wiener · Padilla · Schiff');
    const out = render(h(SummaryCard, { g, n: 1 }));
    expect(out.match(/data-summary-card=/g)).toHaveLength(1);
    expect(out.match(/<img [^>]*\/portraits\//g)).toHaveLength(2); // a member-elect has no portrait
  });
  it('§1.3: the first band loads eagerly with high priority; the template markup is otherwise untouched', () => {
    expect(eagerBand('<img loading="lazy" src="/x.webp">')).toBe('<img loading="eager" fetchpriority="high" src="/x.webp">');
    expect(eagerBand(null)).toBeNull();
  });
});

describe('write square (results-pages §2.3)', () => {
  it('renders before the call square when the target has a contact form: paper, envelope, label, title by kind, new tab', () => {
    const out = render(h(Target, { t: correa, onContact: () => {} }));
    const write = out.indexOf('data-write-square'), call = out.indexOf('data-call-square');
    expect(write).toBeGreaterThan(-1);
    expect(call).toBeGreaterThan(write);
    expect(out).toMatch(/<a href="https:\/\/correa.house.gov\/contact" class="w-11 h-11 [^"]*bg-paper" rel="noopener noreferrer" target="_blank" aria-label="Write to Lou Correa" title="Contact form \(asks for your ZIP\)"/);
    expect(out).toMatch(/<a href="tel:2022252965" class="w-11 h-11 [^"]*bg-acid" aria-label="Call Lou Correa"/);
  });
  it('no contact form → no write square; the goal page (no handler) renders the write square without target=_blank', () => {
    expect(render(h(Target, { t: padilla }))).not.toContain('data-write-square');
    const out = render(h(Target, { t: correa }));
    expect(out).toContain('data-write-square');
    expect(out).not.toContain('target="_blank"');
  });
  it('§3.6: the Next office wears a crimson ring on its call square', () => {
    const out = render(h(Target, { t: padilla, ring: true }));
    expect(out).toMatch(/class="w-11 h-11 [^"]*ring-\[3px\] ring-crimson[^"]*bg-acid"/);
    expect(out).toContain('data-next');
  });
  it('§3.4: a done office is muted, its role line carries the time, and one ✓ Share pill replaces both squares', () => {
    const out = render(h(Target, { t: correa, done: { channel: 'email', at: '2026-11-06T22:14:00Z' } }));
    expect(out).toMatch(/^<li class="bg-newsprint\/60 border-2/);
    expect(out).toMatch(/data-role-line[^>]*>Representative · CA-46 · Wrote \d{1,2}:\d{2} [ap]m</);
    expect(out).toContain('data-share-pill');
    expect(out).toContain('>✓ Share</button>');
    expect(out).not.toContain('data-write-square');
    expect(out).not.toContain('data-call-square');
    expect(out).not.toContain('tel:');
    expect(render(h(Target, { t: correa, done: { channel: 'call', at: '2026-11-06T22:14:00Z' } }))).toContain('· Called ');
  });
});
