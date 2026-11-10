// The contact link's labels by `contact_kind`. Client-safe: member pages (`members.ts` is node-only), the act form
// and the results islands all read it.
import type { ContactKind } from '@worker/types';

/** roster-freshness §2: the member page's link label; results-pages §1.1: the write square's `title`. */
export const CONTACT_LABEL: Record<ContactKind, string> = { form: 'Contact form', zip_gate: 'Contact form (asks for your ZIP)', homepage: 'Office website' };
/** email-button §1.4: the act page's contact button, as a full instruction. */
export const CONTACT_ACTION: Record<ContactKind, string> = {
  form: 'Open the contact form ↗',
  zip_gate: 'Open the contact form (asks for your ZIP first) ↗',
  homepage: 'Open the office website, then Contact ↗',
};
