import { useEffect, useRef, useState } from 'preact/hooks';
import type { GoalCard, TargetCard } from '../lib/api';
import { addCommitment, retryDue, type ReceiptOutcome } from '../lib/commitments';
import { surname } from '@worker/names';
import { seatOf, type Channel } from './Target';
import Postmark from './Postmark';
import Counts from './Counts';
import ShareRow, { preparePoster, receiptSpec, type Poster } from './ShareRow';

/** results-pages §5: the one filled control. `scroll` = the next office on this page; `href` = the other action or /goals. */
export type NextStep = { kind: 'target'; target: TargetCard } | { kind: 'link'; href: string; label: string };

export interface ReceiptModalProps {
  g: GoalCard;
  target: TargetCard;
  channel: Channel;
  /** The receipt's time (ISO) for the postmark: now on a tap, the row's `at` when the pill reopens the modal. */
  at: string;
  state: string;
  district: number | null;
  /** null while the POST is in flight; `counted` → the Counts echo line; a string → the message in its place (§4). */
  outcome: 'counted' | string | null;
  /** §4 ask: the answer already on the receipt row (a pill reopen), so the chip reads filled or the strip "Skipped". */
  answer?: ReceiptOutcome | null;
  /** The visitor's answer. The caller posts the report outcomes and keeps the answer on the row; resolves false when the post failed. */
  onAnswer: (outcome: ReceiptOutcome) => Promise<boolean>;
  next: NextStep;
  onNext: (t: TargetCard) => void;
  onClose: () => void;
}

/** §4: the ask's chips, label → outcome. The call chips post; the write chips never do. */
export const CALL_CHIPS: [ReceiptOutcome, string][] = [['will_support', 'With us'], ['undecided', 'Undecided'], ['opposed', 'Opposed'], ['no_answer', 'No answer']];
export const WRITE_CHIPS: [ReceiptOutcome, string][] = [['sent', 'Sent it'], ['form_failed', "Form didn't work"]];
const POSTED: ReadonlySet<ReceiptOutcome> = new Set(['will_support', 'undecided', 'opposed', 'no_answer']);
const SAVE_FAILED = 'Could not save that. Try again.';

/**
 * results-pages §5: the receipt modal, a `<dialog>` opened with `showModal()`. Loaded on the first tap together with
 * the share chunk (§6), never on page load. Esc, ✕ and a backdrop tap close it; the caller restores focus (§7).
 * Top to bottom: the postmark header, the count echo, the hazard-strip ask, the share card, Next, then the links.
 */
export default function ReceiptModal({ g, target, channel, at, state, district, outcome, answer: given = null, onAnswer, next, onNext, onClose }: ReceiptModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [poster, setPoster] = useState<Poster | null>(null);
  const [reminded, setReminded] = useState(false);
  const [answer, setAnswer] = useState<ReceiptOutcome | null>(given);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const wrote = channel === 'email';

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (!d.open) { if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', ''); }
    const closed = () => onClose();
    d.addEventListener('close', closed);
    return () => d.removeEventListener('close', closed);
  }, []);
  useEffect(() => { // §5: the poster is drawn while the dialer is open
    let live = true;
    preparePoster(receiptSpec(wrote ? 'letter' : 'call', target.role, target.name, state, g.title, g.what_we_want), g.slug)
      .then((p) => { if (live) setPoster(p); }, () => { if (live) setPoster({ file: null, canShare: false }); });
    return () => { live = false; };
  }, [target.bioguide_id ?? target.name, channel]);

  const close = () => { const d = ref.current; if (d?.open && typeof d.close === 'function') d.close(); else onClose(); };
  const remind = () => {
    if (!g.action) return;
    addCommitment({ goal: g.slug, action: g.action, target: target.bioguide_id ?? target.name, due: retryDue(new Date()).toISOString(), kind: 'retry', who: `${target.role} ${target.name}` });
    setReminded(true);
    close();
  };
  /** §4.3: a chip fills at once; a posted outcome shows "Saved" on a 2xx or the retry line under the grid. */
  const pick = async (o: ReceiptOutcome) => {
    setAnswer(o);
    setSaved(false);
    setSaveError(null);
    const ok = await onAnswer(o);
    if (!POSTED.has(o)) return;
    if (ok) setSaved(true); else setSaveError(SAVE_FAILED);
  };

  const who = `${target.role} ${surname(target.name)}`;
  const seat = seatOf(target);
  const chips = wrote ? WRITE_CHIPS : CALL_CHIPS;
  // §2.3: "Form didn't work" offers the call instead when the office has a phone.
  const callInstead = wrote && answer === 'form_failed' && !!target.phone;

  return (
    <dialog ref={ref} class="m-auto w-[calc(100%-32px)] max-w-[440px] max-h-[calc(100dvh-32px)] overflow-y-auto bg-paper text-ink border-2 border-ink shadow-brutal-lg p-0 backdrop:bg-ink/70"
      aria-label={`${wrote ? 'I wrote' : 'I called'}: ${target.role} ${target.name}`} data-receipt-modal
      onClick={(e) => { if (e.target === ref.current) close(); }}>
      <div class="p-5 flex flex-col gap-4">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-start gap-2 min-w-0">
            <Postmark wrote={wrote} name={target.name} at={at} size={96} id="modal" class="ml-1 mt-0.5" />
            <div class="min-w-0 pt-7">
              <span aria-hidden="true" class="block relative w-[70px] h-[30px] border-t-2 border-b-2 border-crimson/85 -ml-1.5"><span class="absolute inset-x-0 top-[12px] border-t-2 border-crimson/85" /></span>
              <p class="font-mono text-xs uppercase tracking-[0.08em] mt-2 truncate" data-receipt-who>{who}{seat ? ` · ${seat}` : ''}</p>
            </div>
          </div>
          <button type="button" class="shrink-0 w-11 h-11 border-2 border-ink shadow-brutal-sm flex items-center justify-center hover:bg-ink hover:text-acid font-condensed text-2xl leading-none" onClick={close} aria-label="Close" data-modal-close>✕</button>
        </div>
        {outcome === 'counted' && <Counts goal={g.slug} state={state} district={district} echo />}
        {outcome && outcome !== 'counted' && <p role="alert" class="text-sm font-semibold" data-receipt-error>{outcome}</p>}
        <div class="bg-hazard border-2 border-ink shadow-brutal-sm p-3" data-ask={wrote ? 'write' : 'call'}>
          {answer === 'skip' ? (
            <p class="font-mono font-bold text-xs uppercase tracking-[0.14em]" data-ask-skipped>Skipped</p>
          ) : (
            <>
              <p class="flex items-baseline gap-2 font-condensed uppercase tracking-wide text-[22px] leading-none">
                {wrote ? 'Did it go through?' : 'What did the office say?'}
                {saved && <span class="font-mono font-bold text-[11px] tracking-[0.14em] text-crimson" data-ask-saved>Saved</span>}
              </p>
              <div class="grid grid-cols-2 gap-2 mt-2">
                {chips.map(([v, l]) => (
                  <button type="button" class={`chip text-center py-2.5 px-2 text-xs border-ink ${answer === v ? 'bg-ink text-acid' : 'bg-paper hover:bg-newsprint'}`} aria-pressed={answer === v} onClick={() => void pick(v)} data-ask-chip={v}>{l}</button>
                ))}
              </div>
              {saveError && <p role="alert" class="text-sm font-semibold mt-2" data-ask-error>{saveError}</p>}
              <button type="button" class="block ml-auto mt-2.5 text-xs font-semibold underline underline-offset-[3px]" onClick={() => void pick('skip')} data-ask-skip>Skip</button>
            </>
          )}
        </div>
        <ShareRow type={wrote ? 'letter' : 'call'} role={target.role} name={target.name} title={g.title} slug={g.slug} poster={poster} />
        {callInstead
          ? <button type="button" class="btn btn-primary w-full justify-center" onClick={() => onNext(target)} data-call-instead>Call {who} instead →</button>
          : next.kind === 'target'
            ? <button type="button" class="btn btn-primary w-full justify-center" onClick={() => onNext(next.target)} data-next-office>Next: call {next.target.role} {next.target.name} →</button>
            : <a href={next.href} class="btn btn-primary w-full justify-center" data-next-link>{next.label}</a>}
        <p class="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <button type="button" class="underline underline-offset-4" onClick={close} data-not-now>Not now</button>
          {!wrote && !reminded && <button type="button" class="underline underline-offset-4" onClick={remind} data-remind>No answer? Remind me tomorrow</button>}
        </p>
      </div>
    </dialog>
  );
}
