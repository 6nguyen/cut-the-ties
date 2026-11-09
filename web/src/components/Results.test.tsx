// leadership-routing §2.4–2.5: the leadership card renders a House block then a Senate block, an uncalled seat as
// one line, and a member-elect with the takes-office line and a Contact link in place of a phone. Rendered with
// preact-render-to-string under node; every value is a data/ row shape.
import { h } from 'preact';
import { render } from 'preact-render-to-string';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { GoalCard, TargetCard } from '../lib/api';
import { Card, bandHtml, soonest } from './Results';
import { Target, showsPortrait } from './Target';

const wiener: TargetCard = {
  bioguide_id: 'CA-11-wiener', name: 'Scott Wiener', party: 'D', role: 'Representative-elect', phone: null, position: 'unknown',
  position_source_url: null, prior_vote: 'No recorded vote yet', elect: { replaces_name: 'Nancy Pelosi', takes_office: '2027-01-03', contact_url: 'https://scottwiener.com/' },
} as TargetCard;
const padilla: TargetCard = { bioguide_id: 'P000145', name: 'Alex Padilla', party: 'D', role: 'Sen.', phone: '202-224-3553', position: 'unknown', position_source_url: null, prior_vote: 'No recorded vote yet' } as TargetCard;
const goal = (o: Partial<GoalCard>): GoalCard => ({
  slug: 'house-caucus', title: 'Kick out Hakeem Jeffries', category: 'leadership', summary: 'S', decision_date: '2026-11-18', ask_text: 'Ask H',
  action_href: '/goals/house-caucus/act/house-caucus-call', partner_url: null, targets: [], ...o,
} as GoalCard);
const senate = goal({ slug: 'senate-leader', title: 'Senate', chamber: 'senate', decision_date: '2027-01-05', ask_text: 'Ask S', action_href: '/goals/senate-leader/act/senate-leader-call', targets: [padilla] });
const html = (g: GoalCard) => render(h(Card, { g, n: 2, state: 'CA', district: 11 }));
// urgency-and-readability §4: the stamp depends on the clock; pin it so the fixture dates stay upcoming.
beforeAll(() => vi.useFakeTimers({ now: Date.parse('2026-11-06T12:00:00Z'), toFake: ['Date'] }));
afterAll(() => vi.useRealTimers());

describe('leadership card blocks', () => {
  it('renders House then Senate, each with its own date, targets, ask and CTA', () => {
    const out = html(goal({ chamber: 'house', targets: [wiener], also: senate }));
    const house = out.indexOf('data-block="house"'), sen = out.indexOf('data-block="senate"');
    expect(house).toBeGreaterThan(-1);
    expect(sen).toBeGreaterThan(house);
    expect(out).toContain('House · Decision: Nov 18, 2026');
    expect(out).toContain('Senate · Decision: Jan 5, 2027');
    expect(out).toContain('Ask H');
    expect(out).toContain('Ask S');
    expect(out).toContain('/goals/house-caucus/act/house-caucus-call');
    expect(out).toContain('/goals/senate-leader/act/senate-leader-call');
    expect(out).not.toContain('data-uncalled');
  });
  it('an uncalled House seat is one line before the Senate block; a lone leadership goal is a plain card', () => {
    const out = html({ ...senate, uncalled: ['house'] });
    const line = out.indexOf('House seat: race not called yet.'), sen = out.indexOf('data-block="senate"');
    expect(line).toBeGreaterThan(-1);
    expect(sen).toBeGreaterThan(line);
    expect(out).not.toContain('data-block="house"');
    const plain = html({ ...senate, uncalled: [] });
    expect(plain).not.toContain('Senate · Decision');
    expect(plain).not.toContain('Decision: Jan 5, 2027'); // §4.4: the stamp replaces the line for an upcoming date
    expect(plain).toContain('data-countdown="senate-leader"');
    expect(plain).toContain('Expected Jan 5');
    expect(plain).toContain('data-block="senate"');
  });
  it('a member-elect shows role, the takes-office line and a Contact link, never a tel: or the switchboard', () => {
    const out = render(h(Target, { t: wiener }));
    expect(out).toContain('>Scott Wiener</p>'); // §7.3: the name on its own line, the role line beneath it
    expect(out).toMatch(/data-role-line[^>]*>Representative-elect</);
    expect(out).toContain('aria-label="Contact Scott Wiener"');
    expect(out).toContain('Takes office Jan 3, 2027, replaces Nancy Pelosi');
    expect(out).toContain('href="https://scottwiener.com/"');
    expect(out).toContain('>Contact<');
    expect(out).not.toContain('tel:');
    expect(out).not.toContain('224-3121');
    const sitting = render(h(Target, { t: padilla }));
    expect(sitting).toContain('tel:2022243553');
    expect(sitting).not.toContain('Contact');
    expect(sitting).not.toContain('data-elect-line');
  });
});

describe('urgency-and-readability §4 stamps', () => {
  it('a split leadership card stamps the sooner chamber block, named in the label, and keeps both block dates', () => {
    const out = html(goal({ chamber: 'house', targets: [wiener], also: senate }));
    expect(out).toContain('data-countdown="house-caucus"');
    expect(out).toContain('Countdown · House · Expected Nov 18');
    expect(out).toContain('House · Decision: Nov 18, 2026');
    expect(out).toContain('Senate · Decision: Jan 5, 2027');
  });
  it('a confirmed date says Decides; a past or empty date keeps the Decision line and shows no stamp', () => {
    expect(html(goal({ decision_date_confirmed: true }))).toContain('Decides Nov 18');
    const past = html(goal({ decision_date: '2026-10-01' }));
    expect(past).not.toContain('data-countdown');
    expect(past).toContain('Decision: Oct 1, 2026');
    const none = html(goal({ decision_date: null }));
    expect(none).not.toContain('data-countdown');
    expect(none).not.toContain('Decision:');
  });
  it('an electoral card keeps its primary line beside the stamp', () => {
    const out = html(goal({ category: 'electoral', decision_date: '2028-03-07', election: { primary_date: '2028-03-07', filing_deadline: '2027-12-13', source_url: null } }));
    expect(out).toContain('Primary: Mar 7, 2028');
    expect(out).toContain('Filing deadline: Dec 13, 2027');
    expect(out).toContain('data-countdown="house-caucus"');
  });
  it('soonest picks the nearest upcoming target across both slots and nested chamber goals', () => {
    const far = goal({ slug: 'far', decision_date: '2027-06-01' });
    const nested = goal({ slug: 'lead', chamber: 'house', decision_date: '2027-03-01', also: goal({ slug: 'sen', chamber: 'senate', decision_date: '2026-12-01' }) });
    expect(soonest([far, nested])?.g.slug).toBe('sen');
    expect(soonest([goal({ decision_date: '2026-01-01' }), goal({ decision_date: null })])).toBeNull();
    expect(soonest([goal({ decision_at: '2026-11-07T12:00:00-05:00', decision_date: '2026-11-07' }), goal({ slug: 'date-only', decision_date: '2026-11-07' })])?.g.slug).toBe('date-only'); // 09:00 New York beats 12:00
  });
});

// site-imagery §2.3: the card's header is a 16:9 photo band copied from the template `/results` builds per image.
describe('site-imagery §2.3 photo band', () => {
  const PHOTO = '<div data-photo="house-floor"><picture><img alt="The House chamber"></picture></div>';
  const doc = { querySelector: (sel: string) => (sel === 'template[data-photo-band="house-floor"]' ? { innerHTML: PHOTO } : null) } as unknown as Document;

  it('copies the markup of the template for the card’s image; no id or no template gives nothing', () => {
    expect(bandHtml('house-floor', doc)).toBe(PHOTO);
    expect(bandHtml('state-capitol', doc)).toBeNull();
    expect(bandHtml(undefined, doc)).toBeNull();
    expect(bandHtml('house-floor"],body', doc)).toBeNull();
    expect(bandHtml('house-floor')).toBeNull(); // no document under node
  });

  it('places the photo in the header, over the gradient and above the title and the CTA', () => {
    vi.stubGlobal('document', doc);
    try {
      const out = render(h(Card, { g: goal({ chamber: 'house' }), n: 1, state: 'CA', district: 11, photo: 'house-floor' }));
      const band = out.indexOf('data-band="house-floor"'), photo = out.indexOf(PHOTO), title = out.indexOf('Kick out Hakeem Jeffries'), cta = out.indexOf('Get my script');
      expect(band).toBeGreaterThan(-1);
      expect(photo).toBeGreaterThan(band);
      expect(title).toBeGreaterThan(photo);
      expect(cta).toBeGreaterThan(title);
      expect(out.slice(band - 200, band)).toContain('hero-gradient');
      expect(out.slice(band - 200, band)).toContain('aspect-video');
    } finally { vi.unstubAllGlobals(); }
  });

  it('a card whose image has no template keeps the gradient header: no photo, no broken image', () => {
    const out = render(h(Card, { g: goal({}), n: 1, state: 'CA', district: 11, photo: 'house-floor' }));
    expect(out).toContain('hero-gradient');
    expect(out).not.toContain('<img');
    expect(out).not.toContain('data-photo=');
    expect(html(goal({}))).not.toContain('data-band');
  });
});

describe('site-imagery §4: portraits on target cards', () => {
  const img = (out: string) => out.match(/<img[^>]*>/)?.[0] ?? '';
  it('a sitting member gets a 48 px lazy portrait over the party badge, with the party border and corner tag', () => {
    const out = render(h(Target, { t: padilla }));
    expect(img(out)).toContain('src="/portraits/P000145.webp"');
    expect(img(out)).toMatch(/\balt(=""|[\s/>])/);
    expect(img(out)).toContain('width="48"');
    expect(img(out)).toContain('height="48"');
    expect(img(out)).toContain('loading="lazy"');
    expect(img(out)).toContain('fetchpriority="low"'); // a card portrait never competes with the hero photo
    expect(out).toMatch(/class="portrait w-12 h-12 border-2 border-cobalt [^"]*bg-cobalt text-paper"/);
    expect(out).toMatch(/class="portrait-tag [^"]*bg-cobalt text-paper"[^>]*data-party-tag[^>]*>D</);
    expect(out).not.toContain('data-loaded'); // the badge is what shows until the image has loaded
  });
  it('the border and the tag carry the party colour: R crimson, anyone else hazard', () => {
    expect(render(h(Target, { t: { ...padilla, party: 'R' } }))).toMatch(/class="portrait [^"]*border-crimson [^"]*bg-crimson text-paper"/);
    expect(render(h(Target, { t: { ...padilla, party: 'I' } }))).toMatch(/class="portrait [^"]*border-hazard [^"]*bg-hazard text-ink"/);
  });
  it('a member-elect, a treasurer and a member with no portrait file keep the 40 px badge and ask for no image', () => {
    const treasurer = { ...padilla, bioguide_id: null, party: null, role: 'Treasurer' } as unknown as TargetCard;
    for (const t of [wiener, treasurer]) {
      const out = render(h(Target, { t }));
      expect(out).not.toContain('<img');
      expect(out).not.toContain('data-party-tag');
      expect(out).toContain('class="w-10 h-10 shrink-0 border-2 border-ink');
    }
    expect(showsPortrait(padilla)).toBe(true);
    expect(showsPortrait(padilla, new Set(['P000145']))).toBe(false);
    expect(showsPortrait(wiener)).toBe(false);
  });
  it('every other line of the card is as before', () => {
    const out = render(h(Target, { t: padilla }));
    expect(out).toContain('>Alex Padilla</p>');
    expect(out).toMatch(/data-role-line[^>]*>Senator</);
    expect(out).toContain('No recorded vote yet');
    expect(out).toContain('aria-label="Call Alex Padilla"');
    expect(out).toContain('href="tel:2022243553"');
    expect(out).toContain('w-11 h-11 shrink-0 border-2 border-ink shadow-brutal-sm');
  });
});
