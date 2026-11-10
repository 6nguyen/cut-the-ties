import { useEffect, useRef, useState } from 'preact/hooks';
import type preact from 'preact';
import type { GoalCard, TargetCard } from '../lib/api';
import type { Chamber } from '@worker/types';
import { deviceId } from '../lib/store';
import { logReceipt, receiptsByTarget, setReceiptOutcome, type ReceiptOutcome } from '../lib/commitments';
import type { Channel, TargetDone, TargetHandlers } from './Target';
import type { NextStep, ReceiptModalProps } from './ReceiptModal';

/**
 * tap-receipts-everywhere §1.2: the part of a `GoalCard` the receipt flow reads. A page with no card (the goal page,
 * the member page, the whip table) builds one from static data; `targets` is whatever stack the page renders.
 */
export interface ReceiptGoal {
  slug: string;
  title: string;
  what_we_want: string;
  category: GoalCard['category'];
  /** The action slug the receipt posts with; null → plain links, no handlers (§2.3). */
  action: string | null;
  targets: TargetCard[];
  chamber?: Chamber;
  also?: ReceiptGoal;
}

/** The blocks a card renders, House first on a split leadership card (leadership-routing §2.3); one block otherwise. */
export function blocksOf<G extends ReceiptGoal>(g: G): G[] {
  if (g.chamber === undefined) return [g];
  return (['house', 'senate'] as Chamber[]).map((c) => [g, g.also as G | undefined].find((x) => x?.chamber === c)).filter((x): x is G => !!x);
}
export const targetId = (t: TargetCard): string => t.bioguide_id ?? t.name;

/** results-pages §3.4: this device's receipts for every office of the card, from `cut-ties:receipts` (24 h). */
export function doneMap(g: ReceiptGoal, now: Date = new Date()): Map<string, TargetDone> {
  const m = new Map<string, TargetDone>();
  for (const b of blocksOf(g)) if (b.action) for (const [id, d] of receiptsByTarget(b.slug, b.action, now)) m.set(id, d);
  return m;
}
/** commitment-funnel §7 / results-pages §3.2: the first office across the blocks with no receipt from this device; `skip` is the office just tapped. */
export function nextTarget(g: ReceiptGoal, done: ReadonlyMap<string, TargetDone>, skip?: string | null): TargetCard | null {
  for (const b of blocksOf(g)) for (const t of b.targets) { const id = targetId(t); if (!done.has(id) && id !== skip) return t; }
  return null;
}
/** The block of the card whose target this is (a split card holds two). */
export const blockOf = <G extends ReceiptGoal>(g: G, id: string): G => blocksOf(g).find((b) => b.targets.some((t) => targetId(t) === id)) ?? g;

export const FAILED = (channel: Channel) => `Couldn't count this one. Your ${channel === 'email' ? 'message' : 'call'} still counts with the office.`;
/** `block` is the goal the receipt and the report belong to (a leadership card's House or Senate block). */
type Modal = Pick<ReceiptModalProps, 'target' | 'channel' | 'at' | 'outcome' | 'answer' | 'state' | 'district'> & { g: ReceiptGoal; block: ReceiptGoal };
/** results-pages §4: the ask's outcomes that reach `POST /api/report`; the rest live only on this device. */
export const REPORTED: ReadonlySet<ReceiptOutcome> = new Set(['will_support', 'undecided', 'opposed', 'no_answer']);
/** The act page's report, without a note: `{goal, target, outcome, device}`. False on a non-2xx or a network failure. */
export async function report(goal: string, target: string, outcome: ReceiptOutcome): Promise<boolean> {
  try {
    const res = await fetch('/api/report', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ goal, target, outcome, device: deviceId() }) });
    return res.ok;
  } catch { return false; }
}

export interface ReceiptFlow {
  /** results-pages §3.4: the offices of the goal with a receipt from this device in 24 h. */
  done: ReadonlyMap<string, TargetDone>;
  /** §3.2: the office whose call square wears the Next ring. */
  next: string | null;
  /** The square and pill handlers for one block of the goal; `{}` while there is no goal or it lists no action. */
  handlers: (b: ReceiptGoal) => TargetHandlers;
  /** The receipt modal, rendered, or null; the page places it once. */
  modal: preact.JSX.Element | null;
}

/**
 * tap-receipts-everywhere §1: the receipt engine behind every tap-to-count surface (results-pages §3–4, §7). A tap
 * on a square posts `POST /api/receipt` with keepalive and opens the modal at once; `limit_repeat` is still done;
 * the ✓ Share pill reopens the modal with no POST; answers reach `POST /api/report` and the receipt row. `other` is
 * the modal's filled control once every office of the goal is done. `district` is null for a senator's own seat;
 * `state` '' means no stored place, and the receipt takes the tapped office's own seat (a whip-table row, §5.1).
 */
export function useReceiptFlow({ goal, state, district, other }: { goal: ReceiptGoal | null; state: string; district: number | null; other: { href: string; label: string } }): ReceiptFlow {
  const [done, setDone] = useState<ReadonlyMap<string, TargetDone>>(new Map());
  const [next, setNext] = useState<string | null>(null);
  const [modal, setModal] = useState<Modal | null>(null);
  const [ModalView, setModalView] = useState<{ C: (p: ReceiptModalProps) => preact.JSX.Element } | null>(null);
  // §4.4: an answer given while the receipt POST is still in flight; the row takes it when it is written.
  const answers = useRef(new Map<string, ReceiptOutcome>());

  useEffect(() => { if (goal) setDone(doneMap(goal)); }, [goal]);

  const g = goal;
  /** The place on the receipt row and under the modal's count: the stored one, else the office's own seat. */
  const whereOf = (b: ReceiptGoal, t: TargetCard) => ({ state: state || t.state || '', district: b.category === 'state' ? null : state ? district : t.district ?? null });
  const open = (m: Modal) => {
    setModal(m);
    if (!ModalView) import('./ReceiptModal').then((mod) => setModalView({ C: mod.default }));
  };
  const handlers = (b: ReceiptGoal): TargetHandlers => (g ? {
    onContact: b.action ? (t, channel) => {
      const id = targetId(t);
      if (next === id) setNext(null);
      answers.current.delete(id);
      const where = whereOf(b, t);
      open({ g, block: b, target: t, channel, at: new Date().toISOString(), outcome: null, answer: null, ...where });
      const body = { goal: b.slug, action: b.action, target: id, ...where, device: deviceId(), channel };
      fetch('/api/receipt', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), keepalive: true })
        .then(async (res) => {
          const d = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
          if (res.ok || d.error === 'limit_repeat') { // §4: already counted is still done
            logReceipt({ goal: b.slug, action: b.action!, target: id, channel, outcome: answers.current.get(id) });
            setDone(doneMap(g));
            return 'counted' as const;
          }
          return d.message ?? FAILED(channel);
        }, () => FAILED(channel))
        .then((outcome) => setModal((m) => (m && targetId(m.target) === id ? { ...m, outcome } : m)));
    } : undefined,
    onShare: (t) => { // §7: no new POST
      const id = targetId(t);
      const d = done.get(id);
      if (d) { const b = blockOf(g, id); open({ g, block: b, target: t, channel: d.channel, at: d.at, outcome: 'counted', answer: d.outcome ?? null, ...whereOf(b, t) }); }
    },
  } : {});
  /** §4.3–4.4: post the report outcomes; keep every answer on the receipt row (when one was written). */
  const answer = async (o: ReceiptOutcome): Promise<boolean> => {
    if (!modal || !g) return false;
    const id = targetId(modal.target);
    const b = modal.block;
    if (REPORTED.has(o) && !(await report(b.slug, id, o))) return false;
    answers.current.set(id, o);
    if (b.action) setReceiptOutcome(b.slug, b.action, id, o);
    setDone(doneMap(g));
    return true;
  };
  const step: NextStep = (() => {
    const t = modal && g ? nextTarget(g, done, targetId(modal.target)) : null;
    return t ? { kind: 'target', target: t } : { kind: 'link', ...other };
  })();
  const closeModal = () => {
    const id = modal ? targetId(modal.target) : null;
    setModal(null);
    if (id) requestAnimationFrame(() => (document.querySelector<HTMLElement>(`[data-target="${CSS.escape(id)}"] [data-share-pill]`))?.focus());
  };
  const toNext = (t: TargetCard) => {
    const id = targetId(t);
    setModal(null);
    setNext(id);
    requestAnimationFrame(() => document.querySelector(`[data-target="${CSS.escape(id)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  };

  const view = modal && ModalView && g ? (
    <ModalView.C g={modal.g as GoalCard} target={modal.target} channel={modal.channel} at={modal.at} outcome={modal.outcome} answer={modal.answer} onAnswer={answer} state={modal.state} district={modal.district} next={step} onNext={toNext} onClose={closeModal} />
  ) : null;
  return { done, next, handlers, modal: view };
}
