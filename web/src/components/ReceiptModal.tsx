import { useEffect, useRef, useState } from 'preact/hooks';
import type { GoalCard, TargetCard } from '../lib/api';
import { addCommitment, retryDue } from '../lib/commitments';
import type { Channel } from './Target';
import ReceiptStamp from './ReceiptStamp';
import Counts from './Counts';
import ShareRow, { preparePoster, receiptSpec, type Poster } from './ShareRow';

/** results-pages §3.2: the one filled control. `scroll` = the next office on this page; `href` = the other action or /goals. */
export type NextStep = { kind: 'target'; target: TargetCard } | { kind: 'link'; href: string; label: string };

export interface ReceiptModalProps {
  g: GoalCard;
  target: TargetCard;
  channel: Channel;
  state: string;
  district: number | null;
  /** null while the POST is in flight; `counted` → the Counts echo line; a string → the message in its place (§3.1). */
  outcome: 'counted' | string | null;
  next: NextStep;
  onNext: (t: TargetCard) => void;
  onClose: () => void;
}

/**
 * results-pages §3.2: the receipt modal, a `<dialog>` opened with `showModal()`. Loaded on the first tap together with
 * the share chunk (§3.3), never on page load. Esc, ✕ and a backdrop tap close it; the caller restores focus (§3.4).
 */
export default function ReceiptModal({ g, target, channel, state, district, outcome, next, onNext, onClose }: ReceiptModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [poster, setPoster] = useState<Poster | null>(null);
  const [reminded, setReminded] = useState(false);
  const wrote = channel === 'email';

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (!d.open) { if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', ''); }
    const closed = () => onClose();
    d.addEventListener('close', closed);
    return () => d.removeEventListener('close', closed);
  }, []);
  useEffect(() => { // §3.3: the poster is drawn while the dialer is open
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

  return (
    <dialog ref={ref} class="m-auto w-[calc(100%-32px)] max-w-[440px] max-h-[calc(100dvh-32px)] overflow-y-auto bg-paper text-ink border-2 border-ink shadow-brutal-lg p-0 backdrop:bg-ink/70"
      aria-label={`${wrote ? 'I wrote' : 'I called'}: ${target.role} ${target.name}`} data-receipt-modal
      onClick={(e) => { if (e.target === ref.current) close(); }}>
      <div class="p-5 flex flex-col gap-4">
        <div class="flex items-start justify-between gap-3">
          <ReceiptStamp wrote={wrote} role={target.role} name={target.name} state={state} id="modal" class="my-0" />
          <button type="button" class="shrink-0 w-11 h-11 border-2 border-ink shadow-brutal-sm flex items-center justify-center hover:bg-ink hover:text-acid font-condensed text-2xl leading-none" onClick={close} aria-label="Close" data-modal-close>✕</button>
        </div>
        {outcome === 'counted' && <Counts goal={g.slug} state={state} district={district} echo />}
        {outcome && outcome !== 'counted' && <p role="alert" class="text-sm font-semibold" data-receipt-error>{outcome}</p>}
        <ShareRow type={wrote ? 'letter' : 'call'} role={target.role} name={target.name} title={g.title} slug={g.slug} poster={poster} />
        {next.kind === 'target'
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
