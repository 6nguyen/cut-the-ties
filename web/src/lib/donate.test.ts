// deploy PRD §3 / goal-pages spec Behavior 5: three Stripe Payment Links, parsed from
// build-time JSON; anything unset, malformed or not https renders "link not configured".
import { describe, expect, it } from 'vitest';
import { DONATE_OPTIONS, parseStripeLinks } from './donate';

describe('donate options', () => {
  it('offers $5 once, $1 monthly and a custom amount, in that order', () => {
    expect(DONATE_OPTIONS.map((o) => o.key)).toEqual(['once_5', 'monthly_1', 'custom']);
    expect(DONATE_OPTIONS.map((o) => `${o.label} ${o.note}`)).toEqual(['$5 one time', '$1 every month', 'Any amount you choose']);
  });
});

describe('parseStripeLinks', () => {
  it('keeps https links for known keys only', () => {
    const links = parseStripeLinks(JSON.stringify({
      once_5: 'https://buy.stripe.com/a',
      monthly_1: 'https://buy.stripe.com/b',
      custom: 'https://buy.stripe.com/c',
      once_20: 'https://buy.stripe.com/old',
    }));
    expect(links).toEqual({ once_5: 'https://buy.stripe.com/a', monthly_1: 'https://buy.stripe.com/b', custom: 'https://buy.stripe.com/c' });
  });
  it('drops non-https values and survives bad input', () => {
    expect(parseStripeLinks(JSON.stringify({ once_5: 'http://x', custom: 42 }))).toEqual({});
    expect(parseStripeLinks('not json')).toEqual({});
    expect(parseStripeLinks(undefined)).toEqual({});
    expect(parseStripeLinks('null')).toEqual({});
  });
});
