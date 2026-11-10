import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type preact from 'preact';
import { districtLabel, route, type GoalCard, type RouteResponse, type TargetCard } from '../lib/api';
import type { Chamber, LeadershipPair } from '@worker/types';
import { cacheRoute, clearPlace, deviceId, loadPlace, peekRoute } from '../lib/store';
import { logReceipt, receiptsByTarget, setReceiptOutcome, type ReceiptOutcome } from '../lib/commitments';
import { CATEGORY, TargetStack, fmtDate, type Channel, type TargetDone, type TargetHandlers } from './Target';
import SummaryCard from './SummaryCard';
import type { NextStep, ReceiptModalProps } from './ReceiptModal';
import Counts from './Counts';
import Countdown, { targetOf } from './Countdown';

/** urgency-and-readability §4: the soonest upcoming countdown target among cards (a leadership card holds two goals). */
export function soonest(goals: GoalCard[], now = Date.now()): { g: GoalCard; target: number } | null {
  let best: { g: GoalCard; target: number } | null = null;
  for (const g of goals.flatMap((x) => [x, ...(x.also ? [x.also] : [])])) {
    const target = targetOf(g.decision_at, g.decision_date);
    if (target !== null && target > now && (!best || target < best.target)) best = { g, target };
  }
  return best;
}

/**
 * site-imagery §2.3: the markup of a card's photo band. `/results` holds one `<template data-photo-band="<image id>">`
 * per image, rendered by `Photo.astro` at build; this returns that template's markup for the card to place in its
 * header. No id, no template or no document (tests, a goal published after the build) → null: the header keeps
 * its gradient.
 */
export function bandHtml(id: string | undefined, doc: Pick<Document, 'querySelector'> | undefined = typeof document === 'undefined' ? undefined : document): string | null {
  if (!id || !doc || !/^[a-z0-9-]+$/.test(id)) return null;
  return doc.querySelector(`template[data-photo-band="${id}"]`)?.innerHTML || null;
}

const CHAMBER: Record<Chamber, string> = { house: 'House', senate: 'Senate' };

/** The blocks a card renders, House first on a split leadership card (leadership-routing §2.3); one block otherwise. */
export function blocksOf(g: GoalCard): GoalCard[] {
  if (g.chamber === undefined) return [g];
  return (['house', 'senate'] as Chamber[]).map((c) => [g, g.also].find((x) => x?.chamber === c)).filter((x): x is GoalCard => !!x);
}
export const targetId = (t: TargetCard): string => t.bioguide_id ?? t.name;

/** leadership-card-two-goals §2.3–2.4: a card holding two goals (`also`) takes the House goal's `pair` title and summary; any other card, or no pair in data, keeps its own. */
export function cardCopy(g: GoalCard, pair?: LeadershipPair | null): { title: string; summary: string } {
  return g.also !== undefined && pair ? { title: pair.title, summary: pair.summary } : { title: g.title, summary: g.summary };
}
/** §5: the route's card that is this slug, or holds it as `also`; `/results/senate-leader` opens the split card too. */
export const cardFor = (goals: readonly GoalCard[], slug: string): GoalCard | undefined => goals.find((g) => g.slug === slug || g.also?.slug === slug);

/** results-pages §3.4: this device's receipts for every office of the card, from `cut-ties:receipts` (24 h). */
export function doneMap(g: GoalCard, now: Date = new Date()): Map<string, TargetDone> {
  const m = new Map<string, TargetDone>();
  for (const b of blocksOf(g)) if (b.action) for (const [id, d] of receiptsByTarget(b.slug, b.action, now)) m.set(id, d);
  return m;
}
/** commitment-funnel §7 / results-pages §3.2: the first office across the blocks with no receipt from this device; `skip` is the office just tapped. */
export function nextTarget(g: GoalCard, done: ReadonlyMap<string, TargetDone>, skip?: string | null): TargetCard | null {
  for (const b of blocksOf(g)) for (const t of b.targets) { const id = targetId(t); if (!done.has(id) && id !== skip) return t; }
  return null;
}

interface CardState { done: ReadonlyMap<string, TargetDone>; next: string | null; handlers: (b: GoalCard) => TargetHandlers }

/**
 * The ask, the "Get my script" CTA, then the targets box and counter line of one goal; a leadership card renders one
 * per chamber block. `two` (leadership-card-two-goals §3): on a card holding two goals the block opens with its goal's
 * title as an h3 and ends with "More on this vote →" to its goal page.
 */
function Block({ g, state, district, label, st, two }: { g: GoalCard; state: string; district: number; label?: string; st?: CardState; two?: boolean }) {
  const date = fmtDate(g.decision_date);
  return (
    <div class="flex flex-col gap-4" data-block={g.chamber ?? g.slug}>
      {two && <h3 class="headline-sm">{g.title}</h3>}
      {label && <p class="label-code">{label}{date ? ` · Decision: ${date}` : ''}</p>}
      <p class="font-semibold">{g.ask_text}</p>
      <a href={g.action_href} class="btn btn-primary self-start">Get my script →</a>
      <TargetStack label={`Who to call (${g.targets.length})`} targets={g.targets} partner={g.partner_url} done={st?.done} next={st?.next} {...(st ? st.handlers(g) : {})}>
        <Counts goal={g.slug} state={state} district={g.category === 'state' ? null : district} />
      </TargetStack>
      {two && <a href={`/goals/${g.slug}`} class="label-code underline underline-offset-[3px] self-start" data-more={g.slug}>More on this vote →</a>}
    </div>
  );
}

/**
 * leadership-routing §2.3–2.5: a leadership card holds the House block, then the Senate block (`also` carries the
 * second goal); a seat whose race is not called shows one line in place of a block. Other cards are one block.
 * `st` (results-pages §3) wires the squares to the receipt modal on `/results/<goal>`; without it the card is static.
 * `pair` (leadership-card-two-goals §2–3): a card holding two goals takes its title and summary, gives each block an
 * h3 and a "More on this vote" link, and puts a 2 px rule above the Senate block.
 */
export function Card({ g, n, state, district, photo, st, pair }: { g: GoalCard; n: number; state: string; district: number; photo?: string; st?: CardState; pair?: LeadershipPair | null }) {
  const band = bandHtml(photo);
  const date = fmtDate(g.decision_date);
  const split = g.chamber !== undefined && (g.also !== undefined || (g.uncalled?.length ?? 0) > 0);
  const two = g.also !== undefined;
  const copy = cardCopy(g, pair);
  const chambers: Chamber[] = ['house', 'senate'];
  // §4.4: the stamp counts to this card's target (on a split card, the sooner chamber block) and replaces the
  // "Decision:" line for an upcoming date; a past or empty date keeps the line and shows no stamp.
  const stamp = soonest([g]);
  return (
    <article class={`relative card-lg flex flex-col ${stamp ? 'mt-6' : ''}`}>
      {stamp && (
        <Countdown at={stamp.g.decision_at} date={stamp.g.decision_date} confirmed={stamp.g.decision_date_confirmed} id={stamp.g.slug}
          title={split && stamp.g.chamber ? CHAMBER[stamp.g.chamber] : null} class="absolute -top-6 right-3.5 z-10" />
      )}
      <div class={`relative hero-gradient text-newsprint p-5 aspect-video overflow-clip flex flex-col justify-end ${stamp ? 'pt-16' : ''}`} data-band={photo}>
        <div class="absolute inset-0 halftone pointer-events-none" />
        {band && <div class="contents" dangerouslySetInnerHTML={{ __html: band }} />}
        <div class="relative flex gap-2 mb-3">
          <span class="chip bg-hazard text-ink border-ink">{CATEGORY[g.category]}</span>
          <span class="chip bg-ink text-newsprint border-newsprint">Action {n}</span>
        </div>
        <h2 class="relative headline-lg">{copy.title}</h2>
        {date && !split && (!stamp || g.election) && <p class="relative label-code mt-2 text-hazard">{g.election ? 'Primary' : 'Decision'}: {date}</p>}
        {g.election && (
          <p class="relative label-code mt-1 text-hazard">Filing deadline: {fmtDate(g.election.filing_deadline) ?? 'not yet sourced'}
            {g.election.source_url && <> · <a href={g.election.source_url} class="underline" rel="noopener noreferrer">source</a></>}
          </p>
        )}
      </div>
      <div class="p-5 flex flex-col gap-4 flex-1">
        <p class="text-base">{copy.summary}</p>
        {split
          ? chambers.map((c) => {
              const block = [g, g.also].find((x) => x?.chamber === c);
              if (block) return (
                <>
                  {two && c === 'senate' && <hr class="border-0 border-t-2 border-ink -mx-5 mt-2" data-split-rule />}
                  <Block g={block} state={state} district={district} label={CHAMBER[c]} st={st} two={two} />
                </>
              );
              if (g.uncalled?.includes(c)) return <p class="label-code" data-uncalled={c}>{CHAMBER[c]} seat: race not called yet.</p>;
              return null;
            })
          : <Block g={g} state={state} district={district} st={st} />}
      </div>
    </article>
  );
}

/** results-pages §2.1: the "Your other action" mini card under the one-action page's card. */
function OtherAction({ g, photo, pair }: { g: GoalCard; photo?: string; pair?: LeadershipPair | null }) {
  const band = bandHtml(photo);
  const stamp = soonest([g]);
  return (
    <a href={`/results/${g.slug}`} class={`relative card flex no-underline text-ink hover:bg-hazard/10 ${stamp ? 'mt-6' : ''}`} data-other-action={g.slug}>
      {stamp && <Countdown at={stamp.g.decision_at} date={stamp.g.decision_date} confirmed={stamp.g.decision_date_confirmed} id={`other-${g.slug}`} class="absolute -top-6 right-3.5 z-10" />}
      <div class="relative hero-gradient w-28 shrink-0 overflow-clip" data-band={photo}>
        <div class="absolute inset-0 halftone pointer-events-none" />
        {band && <div class="contents" dangerouslySetInnerHTML={{ __html: band }} />}
      </div>
      <div class="p-4 flex flex-col gap-1 min-w-0">
        <p class="label-code">Your other action</p>
        <p class="font-condensed uppercase tracking-wide text-2xl leading-none">{cardCopy(g, pair).title}</p>
      </div>
    </a>
  );
}

const FAILED = (channel: Channel) => `Couldn't count this one. Your ${channel === 'email' ? 'message' : 'call'} still counts with the office.`;
/** `block` is the goal the receipt and the report belong to (a leadership card's House or Senate block). */
type Modal = Pick<ReceiptModalProps, 'g' | 'target' | 'channel' | 'at' | 'outcome' | 'answer'> & { block: GoalCard };
/** results-pages §4: the ask's outcomes that reach `POST /api/report`; the rest live only on this device. */
const REPORTED: ReadonlySet<ReceiptOutcome> = new Set(['will_support', 'undecided', 'opposed', 'no_answer']);
/** The act page's report, without a note: `{goal, target, outcome, device}`. False on a non-2xx or a network failure. */
async function report(goal: string, target: string, outcome: ReceiptOutcome): Promise<boolean> {
  try {
    const res = await fetch('/api/report', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ goal, target, outcome, device: deviceId() }) });
    return res.ok;
  } catch { return false; }
}
/** The block of the card whose target this is (a split card holds two). */
const blockOf = (g: GoalCard, id: string): GoalCard => blocksOf(g).find((b) => b.targets.some((t) => targetId(t) === id)) ?? g;

/**
 * §1.3 results: exactly two cards for the stored district; §1.5 "change address". `photos` maps a goal slug to its
 * image id (site-imagery §2.3). With `goal` (results-pages §2) the island is the one-action page: that goal's full
 * card, the receipt modal on a square tap (§3) and the "Your other action" mini card. `pair` is the split leadership
 * card's copy from data/ (leadership-card-two-goals §2), read at build.
 */
export default function Results({ photos = {}, goal, pair = null }: { photos?: Record<string, string>; goal?: string; pair?: LeadershipPair | null }) {
  const [data, setData] = useState<RouteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<ReadonlyMap<string, TargetDone>>(new Map());
  const [next, setNext] = useState<string | null>(null); // §3.2: the office whose call square wears the ring
  const [modal, setModal] = useState<Modal | null>(null);
  const [ModalView, setModalView] = useState<{ C: (p: ReceiptModalProps) => preact.JSX.Element } | null>(null);
  // §4.4: an answer given while the receipt POST is still in flight; the row takes it when it is written.
  const answers = useRef(new Map<string, ReceiptOutcome>());

  useEffect(() => {
    const cached = peekRoute<RouteResponse>();
    if (cached) { setData(cached); return; }
    const place = loadPlace();
    if (!place) { location.replace('/'); return; }
    route(place).then((r) => { cacheRoute(r); setData(r); }).catch((e: Error) => setError(e.message));
  }, []);

  const current = useMemo(() => (goal && data ? cardFor(data.goals, goal) ?? null : null), [goal, data]);
  useEffect(() => { if (current) setDone(doneMap(current)); }, [current]);
  // §2.3: the tab title follows the card (the static page carries the goal's own title).
  useEffect(() => { if (current && typeof document !== 'undefined') document.title = `${cardCopy(current, pair).title} — Cut the Ties`; }, [current]);

  function change() { clearPlace(); location.assign('/'); }

  if (error) return (
    <div class="card p-5 max-w-xl" role="alert">
      <p class="font-semibold">{error}</p>
      <button class="btn btn-ghost mt-4" onClick={change}>Change address</button>
    </div>
  );
  if (!data) return <p class="label-code" aria-busy="true">Loading your district…</p>;

  const where = districtLabel(data.state, data.district);

  if (goal) {
    const n = current ? data.goals.indexOf(current) : -1;
    if (n < 0 || !current) return (
      <div>
        <p class="label-ticker mb-2"><a href="/results" class="underline">← Your two actions</a></p>
        <div class="card p-5 max-w-xl">
          <p class="font-semibold">This isn't one of your two actions this week.</p>
          <p class="mt-4 flex flex-wrap gap-4"><a href="/results" class="btn btn-primary">Your two actions →</a><a href={`/goals/${goal}`} class="btn btn-ghost">About this goal →</a></p>
        </div>
      </div>
    );
    const other = data.goals.find((x) => x.slug !== current.slug) ?? null;
    const g = current;

    const open = (m: Modal) => {
      setModal(m);
      if (!ModalView) import('./ReceiptModal').then((mod) => setModalView({ C: mod.default }));
    };
    const handlers = (b: GoalCard): TargetHandlers => ({
      onContact: b.action ? (t, channel) => {
        const id = targetId(t);
        if (next === id) setNext(null);
        answers.current.delete(id);
        open({ g, block: b, target: t, channel, at: new Date().toISOString(), outcome: null, answer: null });
        const body = { goal: b.slug, action: b.action, target: id, state: data.state, district: b.category === 'state' ? null : data.district, device: deviceId(), channel };
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
        if (d) open({ g, block: blockOf(g, id), target: t, channel: d.channel, at: d.at, outcome: 'counted', answer: d.outcome ?? null });
      },
    });
    /** §4.3–4.4: post the report outcomes; keep every answer on the receipt row (when one was written). */
    const answer = async (o: ReceiptOutcome): Promise<boolean> => {
      if (!modal) return false;
      const id = targetId(modal.target);
      const b = modal.block;
      if (REPORTED.has(o) && !(await report(b.slug, id, o))) return false;
      answers.current.set(id, o);
      if (b.action) setReceiptOutcome(b.slug, b.action, id, o);
      setDone(doneMap(g));
      return true;
    };
    const st: CardState = { done, next, handlers };

    const step: NextStep = (() => {
      const t = modal ? nextTarget(g, done, targetId(modal.target)) : null;
      if (t) return { kind: 'target', target: t };
      return other ? { kind: 'link', href: `/results/${other.slug}`, label: 'Your other action →' } : { kind: 'link', href: '/goals', label: 'See all goals →' };
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

    return (
      <div>
        <p class="label-ticker mb-2"><a href="/results" class="underline">← Your two actions</a> · Action {n + 1} of {data.goals.length}</p>
        <h1 class="display-lg">{cardCopy(g, pair).title}</h1>
        <div class="mt-8 max-w-3xl">
          <Card g={g} n={n + 1} state={data.state} district={data.district} photo={photos[g.slug]} st={st} pair={pair} />
        </div>
        {other && <div class="mt-10 max-w-3xl"><OtherAction g={other} photo={photos[other.slug]} pair={pair} /></div>}
        {modal && ModalView && (
          <ModalView.C g={modal.g} target={modal.target} channel={modal.channel} at={modal.at} outcome={modal.outcome} answer={modal.answer} onAnswer={answer} state={data.state} district={g.category === 'state' ? null : data.district} next={step} onNext={toNext} onClose={closeModal} />
        )}
      </div>
    );
  }

  const page = soonest(data.goals); // §4.5: one page-wide stamp for the soonest target across both slots
  return (
    <div>
      <div class={`relative ${page ? 'md:pr-[400px]' : ''}`}>
        {page && (
          <Countdown at={page.g.decision_at} date={page.g.decision_date} confirmed={page.g.decision_date_confirmed} id="page" size="lg"
            title={page.g.title} class="mb-6 md:mb-0 md:absolute md:right-2 md:-top-1 z-10 max-w-full" />
        )}
        <p class="label-ticker mb-2">{where} · <button class="underline" onClick={change}>change address</button></p>
        <h1 class="display-lg">Your two actions this week</h1>
      </div>
      <p class="mt-3 text-base max-w-2xl">Your people in Congress for {where}: {[data.house, ...data.senators].filter(Boolean).map((m) => m!.name).join(', ')}.</p>
      {data.goals.length === 0 ? (
        <div class="card p-5 mt-8 max-w-xl">
          <p class="font-semibold">No goal is open for your district right now.</p>
          <a href="/goals" class="btn btn-ghost mt-4">See all goals →</a>
        </div>
      ) : (
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mt-8">
          {data.goals.map((g, i) => <SummaryCard g={g} n={i + 1} photo={photos[g.slug]} pair={pair} />)}
        </div>
      )}
      <p class="mt-8"><a href="/goals" class="label-code underline underline-offset-4">See all goals →</a></p>
    </div>
  );
}
