// Build-time donation config (Pages build env). The site is static, so this is
// read when `astro build` runs, not by the Worker: STRIPE_LINKS (JSON of Stripe
// Payment Link URLs keyed by DonateKey). Unset or invalid values fall back to
// `{}`; a missing link renders a disabled button. The page shows no running
// cost: actual spend and the LLM budget (`LLM_MONTHLY_BUDGET_USD`) are internal.
export type DonateKey = 'once_5' | 'monthly_1' | 'custom';

export const DONATE_OPTIONS: { key: DonateKey; label: string; note: string }[] = [
  { key: 'once_5', label: '$5', note: 'one time' },
  { key: 'monthly_1', label: '$1', note: 'every month' },
  { key: 'custom', label: 'Any amount', note: 'you choose' },
];

export function parseStripeLinks(raw: string | undefined): Partial<Record<DonateKey, string>> {
  if (!raw) return {};
  let obj: unknown;
  try { obj = JSON.parse(raw); } catch { return {}; }
  const out: Partial<Record<DonateKey, string>> = {};
  for (const { key } of DONATE_OPTIONS) {
    const v = (obj as Record<string, unknown> | null)?.[key];
    if (typeof v === 'string' && /^https:\/\//.test(v)) out[key] = v;
  }
  return out;
}

export const stripeLinks = parseStripeLinks(process.env.STRIPE_LINKS);
