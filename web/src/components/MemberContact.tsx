import { useEffect, useMemo, useState } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import type { GoalCard, TargetCard } from '../lib/api';
import type { ContactKind } from '@worker/types';
import { loadPlace } from '../lib/store';
import OpenChip from './OpenChip';
import Postmark from './Postmark';
import { targetId, useReceiptFlow, type ReceiptGoal } from './receipt-flow';

/** The member page's static facts the island needs (member-pages §3); `contact_label` is `contactLabel(m)` from the build. */
export interface MemberProps {
  bioguide_id: string;
  name: string;
  role: string;
  party: string;
  chamber: 'house' | 'senate';
  state: string;
  district: number | null;
  dc_phone: string | null;
  district_phone: string | null;
  contact_form_url: string | null;
  contact_kind: ContactKind | null;
  contact_label: string | null;
}
/** The member's first open goal with an action (`goalsFor(m)[0]`); null → plain links (tap-receipts-everywhere §4.3). */
export interface MemberGoalProps { slug: string; title: string; what_we_want: string; category: GoalCard['category']; action: string }

export const tel = (phone: string): string => `tel:${phone.replace(/[^\d+]/g, '')}`;

/**
 * tap-receipts-everywhere §4: the hero's "Call DC office", "District office" and contact buttons, `OpenChip` included,
 * as one island; a tap posts the receipt against the member's first open goal and opens the receipt modal. The
 * district-office cards (`Offices.astro`) stay static: a click on any `[data-offices] a[href^="tel:"]` is delegated
 * here. `state`/`district` are the stored place when there is one, else the member's seat; `other` is `/results`
 * with a place, `/goals` without. A done member wears the 64 px postmark in `[data-postmark-slot]` beside the hero
 * title and a ✓ Share pill in the row, from the same `cut-ties:receipts` row, for 24 h.
 */
export default function MemberContact({ member: m, goal: g }: { member: MemberProps; goal: MemberGoalProps | null }) {
  const [place, setPlace] = useState<{ state: string; district: number | null } | null>(null);
  const [slot, setSlot] = useState<Element | null>(null);
  useEffect(() => {
    const p = loadPlace();
    setPlace(p ? { state: p.state, district: p.district } : null);
    setSlot(document.querySelector('[data-postmark-slot]'));
  }, []);
  const target = useMemo<TargetCard>(() => ({
    bioguide_id: m.bioguide_id, name: m.name, role: m.role, party: m.party, state: m.state, district: m.chamber === 'house' ? m.district : null,
    phone: m.dc_phone, contact_form_url: m.contact_form_url, contact_kind: m.contact_kind, position: 'unknown', position_source_url: null, prior_vote: '',
  }), [m]);
  const goal = useMemo<ReceiptGoal | null>(() => (g ? { ...g, targets: [target] } : null), [g, target]);
  const seat = { state: m.state, district: m.chamber === 'house' ? m.district : null };
  const flow = useReceiptFlow({
    goal, state: (place ?? seat).state, district: (place ?? seat).district,
    other: place ? { href: '/results', label: 'Your two actions →' } : { href: '/goals', label: 'See all goals →' },
  });
  const handlers = goal ? flow.handlers(goal) : {};
  const tap = (channel: 'call' | 'email') => (handlers.onContact ? () => handlers.onContact!(target, channel) : undefined);
  // §4.1: the district-office cards' numbers count like the hero's buttons.
  useEffect(() => {
    if (!handlers.onContact) return;
    const on = (e: Event) => { if ((e.target as Element).closest?.('[data-offices] a[href^="tel:"]')) handlers.onContact!(target, 'call'); };
    document.addEventListener('click', on);
    return () => document.removeEventListener('click', on);
  }, [handlers.onContact, target]);
  const id = targetId(target);
  const done = flow.done.get(id);
  return (
    <div class="mt-6 flex flex-wrap gap-3" data-target={id} data-done={done ? done.channel : undefined} data-member-contact>
      {m.dc_phone && <span class="flex items-center gap-2"><a href={tel(m.dc_phone)} class="btn btn-primary" onClick={tap('call')} data-dc-call>Call DC office · {m.dc_phone}</a><OpenChip /></span>}
      {m.district_phone && <span class="flex items-center gap-2"><a href={tel(m.district_phone)} class="btn bg-newsprint text-ink hover:bg-paper" onClick={tap('call')} data-district-call>District office · {m.district_phone}</a><OpenChip state={m.state} /></span>}
      {m.contact_label && m.contact_form_url && <a href={m.contact_form_url} rel="noopener" class="btn bg-newsprint text-ink hover:bg-paper" {...(handlers.onContact ? { target: '_blank' } : {})} onClick={tap('email')} data-contact-link>{m.contact_label} ↗</a>}
      {done && <button type="button" class="btn btn-ghost px-3 py-2 text-sm" onClick={handlers.onShare ? () => handlers.onShare!(target) : undefined} data-share-pill aria-label={`Share that you ${done.channel === 'email' ? 'wrote to' : 'called'} ${m.name}`}>✓ Share</button>}
      {done && slot && createPortal(<Postmark wrote={done.channel === 'email'} name={m.name} at={done.at} size={64} id={`member-${id}`} class="inline-block align-middle" />, slot)}
      {flow.modal}
    </div>
  );
}
