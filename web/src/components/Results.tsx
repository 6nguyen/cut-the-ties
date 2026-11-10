import { useEffect, useMemo, useState } from 'preact/hooks';
import { goalDone } from '../lib/commitments';
import Postmark, { postmarkDay } from './Postmark';
import { districtLabel, route, type GoalCard, type RouteResponse } from '../lib/api';
import type { Chamber, LeadershipPair } from '@worker/types';
import { cacheRoute, clearPlace, loadPlace, peekRoute } from '../lib/store';
import { CATEGORY, TargetStack, fmtDate, type TargetDone, type TargetHandlers } from './Target';
import SummaryCard from './SummaryCard';
import Counts from './Counts';
import { useReceiptFlow } from './receipt-flow';
export { blocksOf, targetId, doneMap, nextTarget } from './receipt-flow';
import { blocksOf, targetId } from './receipt-flow';
import Countdown, { targetOf } from './Countdown';

/** tap-receipts-everywhere §7.1: a goal this device finished this week; `at` is its newest receipt. */
export interface GoalDone { at: string }
/**
 * §7.1: done when every target of every block (both blocks of a split card) has a receipt row from this device in
 * the last 7 days; `at` is the newest across the blocks. A block without an action or any targets is never done.
 */
export function goalDoneAt(g: GoalCard, now: Date = new Date()): GoalDone | null {
  const blocks = blocksOf(g).filter((b) => b.targets.length > 0);
  if (blocks.length === 0) return null;
  let at = '';
  for (const b of blocks) {
    const d = b.action ? goalDone(b.slug, b.action, b.targets.map(targetId), now) : null;
    if (!d) return null;
    if (d.at > at) at = d.at;
  }
  return { at };
}
/** §8.2: the route's slots split into the open goals in route order and the done ones, newest `at` first. */
export function splitGoals(goals: readonly GoalCard[], now: Date = new Date()): { open: GoalCard[]; done: { g: GoalCard; at: string }[] } {
  const open: GoalCard[] = [];
  const done: { g: GoalCard; at: string }[] = [];
  for (const g of goals) {
    const d = goalDoneAt(g, now);
    if (d) done.push({ g, at: d.at }); else open.push(g);
  }
  done.sort((a, b) => (a.at > b.at ? -1 : a.at < b.at ? 1 : 0));
  return { open, done };
}

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

/** leadership-card-two-goals §2.3–2.4: a card holding two goals (`also`) takes the House goal's `pair` title and summary; any other card, or no pair in data, keeps its own. */
export function cardCopy(g: GoalCard, pair?: LeadershipPair | null): { title: string; summary: string } {
  return g.also !== undefined && pair ? { title: pair.title, summary: pair.summary } : { title: g.title, summary: g.summary };
}
/** §5: the route's card that is this slug, or holds it as `also`; `/results/senate-leader` opens the split card too. */
export const cardFor = (goals: readonly GoalCard[], slug: string): GoalCard | undefined => goals.find((g) => g.slug === slug || g.also?.slug === slug);

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
 * `done` (tap-receipts-everywhere §7.3): the goal is finished on this device; the DONE postmark replaces the countdown.
 */
export function Card({ g, n, state, district, photo, st, pair, done = null }: { g: GoalCard; n: number; state: string; district: number; photo?: string; st?: CardState; pair?: LeadershipPair | null; done?: GoalDone | null }) {
  const band = bandHtml(photo);
  const date = fmtDate(g.decision_date);
  const split = g.chamber !== undefined && (g.also !== undefined || (g.uncalled?.length ?? 0) > 0);
  const two = g.also !== undefined;
  const copy = cardCopy(g, pair);
  const chambers: Chamber[] = ['house', 'senate'];
  // §4.4: the stamp counts to this card's target (on a split card, the sooner chamber block) and replaces the
  // "Decision:" line for an upcoming date; a past or empty date keeps the line and shows no stamp.
  const stamp = done ? null : soonest([g]);
  return (
    <article class={`relative card-lg flex flex-col ${done ? 'mt-8' : stamp ? 'mt-6' : ''}`} data-done={done ? 'goal' : undefined}>
      {done && <Postmark kind="done" name={copy.title} at={done.at} size={96} id={`card-${g.slug}`} class="absolute -top-8 right-3.5 z-10" />}
      {stamp && (
        <Countdown at={stamp.g.decision_at} date={stamp.g.decision_date} confirmed={stamp.g.decision_date_confirmed} id={stamp.g.slug}
          title={split && stamp.g.chamber ? CHAMBER[stamp.g.chamber] : null} class="absolute -top-6 right-3.5 z-10" />
      )}
      <div class={`relative hero-gradient text-newsprint p-5 aspect-video overflow-clip flex flex-col justify-end ${stamp || done ? 'pt-16' : ''} ${done ? 'opacity-60' : ''}`} data-band={photo}>
        <div class="absolute inset-0 halftone pointer-events-none" />
        {band && <div class="contents" dangerouslySetInnerHTML={{ __html: band }} />}
        <div class="relative flex gap-2 mb-3">
          <span class="chip bg-hazard text-ink border-ink">{CATEGORY[g.category]}</span>
          <span class="chip bg-ink text-newsprint border-newsprint">{done ? 'Done' : `Action ${n}`}</span>
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

/** results-pages §2.1: the "Your other action" mini card under the one-action page's card; "Your next action" under a done goal (tap-receipts-everywhere §8.4). */
function OtherAction({ g, photo, pair, label = 'Your other action' }: { g: GoalCard; photo?: string; pair?: LeadershipPair | null; label?: string }) {
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
        <p class="label-code">{label}</p>
        <p class="font-condensed uppercase tracking-wide text-2xl leading-none">{cardCopy(g, pair).title}</p>
      </div>
    </a>
  );
}

/**
 * §1.3 results: exactly two cards for the stored district; §1.5 "change address". `photos` maps a goal slug to its
 * image id (site-imagery §2.3). With `goal` (results-pages §2) the island is the one-action page: that goal's full
 * card, the receipt modal on a square tap (§3) and the "Your other action" mini card. `pair` is the split leadership
 * card's copy from data/ (leadership-card-two-goals §2), read at build.
 */
export default function Results({ photos = {}, goal, pair = null }: { photos?: Record<string, string>; goal?: string; pair?: LeadershipPair | null }) {
  const [data, setData] = useState<RouteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cached = peekRoute<RouteResponse>();
    if (cached) { setData(cached); return; }
    const place = loadPlace();
    if (!place) { location.replace('/'); return; }
    route(place).then((r) => { cacheRoute(r); setData(r); }).catch((e: Error) => setError(e.message));
  }, []);

  const current = useMemo(() => (goal && data ? cardFor(data.goals, goal) ?? null : null), [goal, data]);
  // tap-receipts-everywhere §8.2: the open goals in route order and the done ones; re-read after every receipt.
  const [tick, setTick] = useState(0);
  const { open, done } = useMemo(() => splitGoals(data?.goals ?? []), [data, tick]);
  const doneAt = current ? done.find((d) => d.g === current)?.at ?? null : null;
  // §8.4: an open goal's other is the other of the pair (the next open one beyond the pair); a done goal's next is the first open goal.
  const idx = current ? open.indexOf(current) : -1;
  const others = open.filter((x) => x !== current);
  const other = !current ? null : doneAt ? others[0] ?? null : idx < 2 ? others.find((x) => open.indexOf(x) < 2) ?? others[0] ?? null : open[idx + 1] ?? others[0] ?? null;
  const nextLabel = doneAt ? 'Your next action' : 'Your other action';
  // tap-receipts-everywhere §1: the receipt engine (results-pages §3–4); the next-action link once every office is done.
  const flow = useReceiptFlow({ goal: current, state: data?.state ?? '', district: data?.district ?? null, other: other ? { href: `/results/${other.slug}`, label: `${nextLabel} →` } : { href: '/goals', label: 'See all goals →' } });
  useEffect(() => setTick((t) => t + 1), [flow.done]);
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
    if (!current) return (
      <div>
        <p class="label-ticker mb-2"><a href="/results" class="underline">← Your two actions</a></p>
        <div class="card p-5 max-w-xl">
          <p class="font-semibold">This isn't one of your two actions this week.</p>
          <p class="mt-4 flex flex-wrap gap-4"><a href="/results" class="btn btn-primary">Your two actions →</a><a href={`/goals/${goal}`} class="btn btn-ghost">About this goal →</a></p>
        </div>
      </div>
    );
    const g = current;
    const st: CardState = { done: flow.done, next: flow.next, handlers: flow.handlers };
    const n = idx + 1;

    return (
      <div>
        <p class="label-ticker mb-2"><a href="/results" class="underline">← Your two actions</a> · {doneAt ? `Done · ${postmarkDay(new Date(doneAt))}` : `Action ${n} of ${open.length}`}</p>
        <h1 class="display-lg">{cardCopy(g, pair).title}</h1>
        <div class="mt-8 max-w-3xl">
          <Card g={g} n={n} state={data.state} district={data.district} photo={photos[g.slug]} st={st} pair={pair} done={doneAt ? { at: doneAt } : null} />
        </div>
        {other && <div class="mt-10 max-w-3xl"><OtherAction g={other} photo={photos[other.slug]} pair={pair} label={nextLabel} /></div>}
        {flow.modal}
      </div>
    );
  }

  const shown = open.slice(0, 2); // §8.2: today's two open goals; the rest of the open ones wait for a rollover
  const page = soonest(shown); // §4.5 / §7.4: one page-wide stamp for the soonest target across the open goals
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
          {shown.map((g, i) => <SummaryCard g={g} n={i + 1} photo={photos[g.slug]} pair={pair} />)}
          {done.map(({ g, at }, i) => <SummaryCard g={g} n={shown.length + i + 1} photo={photos[g.slug]} pair={pair} done={{ at }} />)}
        </div>
      )}
      {data.goals.length > 0 && shown.length === 0 && (
        <div class="card p-5 mt-8 max-w-xl" data-all-done>
          <p class="font-semibold">You have done every action open for your district this week.</p>
          <a href="/goals" class="btn btn-ghost mt-4">See all goals →</a>
        </div>
      )}
      <p class="mt-8"><a href="/goals" class="label-code underline underline-offset-4">See all goals →</a></p>
    </div>
  );
}
