import { useEffect, useMemo, useState } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import type { GoalCard, TargetCard } from '../lib/api';
import { loadPlace } from '../lib/store';
import Postmark from './Postmark';
import { useReceiptFlow, type ReceiptGoal } from './receipt-flow';

/** What a whip-table row's `data-receipt-target` holds (member-pages §3; tap-receipts-everywhere §5.1). */
export interface RowTarget { id: string; name: string; role: string; party: string; state: string; district: number | null; phone: string }

const cardOf = (r: RowTarget): TargetCard => ({ bioguide_id: r.id, name: r.name, role: r.role, party: r.party, state: r.state, district: r.district, phone: r.phone, position: 'unknown', position_source_url: null, prior_vote: '' });

/**
 * tap-receipts-everywhere §5: one island per whip table. A click on a row's DC number (`a[data-receipt-target]`)
 * posts the receipt against the goal and opens the modal; `state`/`district` are the stored place, else the row's
 * seat. The next step is always the link (`/results` with a place, `/goals` without): a table is not a stack. A row
 * done in 24 h shows the 32 px postmark in place of its number; the row's "Call" button is the act page's.
 */
export default function WhipReceipts({ goal: g }: { goal: { slug: string; title: string; what_we_want: string; category: GoalCard['category']; action: string } }) {
  const [place, setPlace] = useState<{ state: string; district: number | null } | null>(null);
  const [slots, setSlots] = useState<Map<string, { link: HTMLAnchorElement; slot: HTMLElement; row: RowTarget }>>(new Map());
  useEffect(() => {
    const p = loadPlace();
    setPlace(p ? { state: p.state, district: p.district } : null);
    const m = new Map<string, { link: HTMLAnchorElement; slot: HTMLElement; row: RowTarget }>();
    for (const link of document.querySelectorAll<HTMLAnchorElement>('a[data-receipt-target]')) {
      try {
        const row = JSON.parse(link.dataset.receiptTarget!) as RowTarget;
        const slot = document.createElement('span');
        slot.dataset.whipPostmark = row.id;
        link.after(slot);
        m.set(row.id, { link, slot, row });
      } catch { /* a malformed row keeps its plain link */ }
    }
    setSlots(m);
  }, []);
  const goal = useMemo<ReceiptGoal>(() => ({ ...g, targets: [] }), [g]);
  const flow = useReceiptFlow({
    goal, state: place?.state ?? '', district: place?.district ?? null,
    other: place ? { href: '/results', label: 'Your two actions →' } : { href: '/goals', label: 'See all goals →' },
  });
  const { onContact } = flow.handlers(goal);
  useEffect(() => {
    if (!onContact) return;
    const on = (e: Event) => {
      const a = (e.target as Element).closest?.('a[data-receipt-target]') as HTMLAnchorElement | null;
      if (!a) return;
      const row = [...slots.values()].find((s) => s.link === a)?.row;
      if (!row) return;
      onContact(cardOf(row), 'call');
    };
    document.addEventListener('click', on);
    return () => document.removeEventListener('click', on);
  }, [onContact, slots]);
  // §5.2: a done row's link gives way to the postmark; back after 24 h.
  useEffect(() => { for (const [id, s] of slots) s.link.hidden = flow.done.has(id); }, [slots, flow.done]);
  return (
    <div data-whip-receipts>
      {[...slots].filter(([id]) => flow.done.has(id)).map(([id, s]) => {
        const d = flow.done.get(id)!;
        return createPortal(<Postmark wrote={d.channel === 'email'} name={s.row.name} at={d.at} size={32} id={`whip-${id}`} class="inline-block align-middle" />, s.slot);
      })}
      {flow.modal}
    </div>
  );
}
