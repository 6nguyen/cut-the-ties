import type { GoalCard, TargetCard } from '../lib/api';
import type { LeadershipPair } from '@worker/types';
import { surname } from '@worker/names';
import { CATEGORY, PARTY_CLASS, fmtDate, portraitSrc, showsPortrait } from './Target';
import Countdown from './Countdown';
import { bandHtml, blocksOf, cardCopy, soonest } from './Results';

/** results-pages §1.1–1.2: every office the card's blocks name, House block first on a split card. */
export function officesOf(g: GoalCard): TargetCard[] {
  const blocks = g.also ? [g, g.also].sort((a) => (a.chamber === 'house' ? -1 : 1)) : [g];
  return blocks.flatMap((b) => b.targets);
}

/** §1.1: "Casten · Duckworth · Durbin" by surname (`names.ts` drops Jr./III). */
export const officesLine = (targets: TargetCard[]): string => targets.map((t) => surname(t.name)).join(' · ');

/**
 * leadership-card-two-goals §4.3: the offices lines. A card holding two goals gets one line per block with targets,
 * House first, each led by that block action's `short_label` ("Jeffries vote · Correa"); any other card one unlabelled line.
 */
export function officesLines(g: GoalCard): { label: string | null; targets: TargetCard[] }[] {
  if (g.also === undefined) return [{ label: null, targets: officesOf(g) }];
  return blocksOf(g).filter((b) => b.targets.length > 0).map((b) => ({ label: b.short_label, targets: b.targets }));
}

/** §1.1: the meta chips in order; a chip is one bordered Space Mono label. A card holding two goals drops the `short_label` chip (leadership-card-two-goals §4.2). */
export function metaChips(g: GoalCard): string[] {
  const offices = officesOf(g);
  const writes = offices.some((t) => t.contact_form_url || t.elect);
  const chips = [writes ? 'Call or write' : 'Call', `${offices.length} ${offices.length === 1 ? 'office' : 'offices'}`];
  if (g.also) chips.push('House + Senate');
  else if (g.short_label) chips.push(g.short_label);
  return chips;
}

/** §1.3: the first band is the LCP element, so its photo loads eagerly. */
export function eagerBand(html: string | null): string | null {
  return html && html.replace(/loading="lazy"/, 'loading="eager" fetchpriority="high"');
}

/**
 * results-pages §1: one summary card on `/results` in the `/goals` card anatomy. The whole card is the link to
 * `/results/<goal>`; no phone number, ask, counts line or target card renders here. `photo` is the band's image id.
 * `pair` (leadership-card-two-goals §4): a card holding two goals takes the pair title and one offices line per block.
 */
export default function SummaryCard({ g, n, photo, pair }: { g: GoalCard; n: number; photo?: string; pair?: LeadershipPair | null }) {
  const band = n === 1 ? eagerBand(bandHtml(photo)) : bandHtml(photo);
  const stamp = soonest([g]);
  const date = fmtDate(g.decision_date);
  const title = cardCopy(g, pair).title;
  return (
    <a href={`/results/${g.slug}`} class={`relative card-lg flex flex-col no-underline text-ink hover:bg-hazard/10 ${stamp ? 'mt-6' : ''}`} data-summary-card={g.slug} aria-label={`Action ${n}: ${title}. Open this action`}>
      {stamp && (
        <Countdown at={stamp.g.decision_at} date={stamp.g.decision_date} confirmed={stamp.g.decision_date_confirmed} id={`summary-${g.slug}`}
          title={g.also && stamp.g.chamber ? (stamp.g.chamber === 'house' ? 'House' : 'Senate') : null} class="absolute -top-6 right-3.5 z-10" />
      )}
      <div class={`relative hero-gradient text-newsprint p-5 aspect-video overflow-clip flex flex-col justify-end ${stamp ? 'pt-16' : ''}`} data-band={photo}>
        <div class="absolute inset-0 halftone pointer-events-none" />
        {band && <div class="contents" dangerouslySetInnerHTML={{ __html: band }} />}
        <div class="relative flex gap-2 mb-3">
          <span class="chip bg-hazard text-ink border-ink">{CATEGORY[g.category]}</span>
          <span class="chip bg-ink text-newsprint border-newsprint">Action {n}</span>
        </div>
        <h2 class="relative headline-lg">{title}</h2>
        {date && !stamp && <p class="relative label-code mt-2 text-hazard">{g.election ? 'Primary' : 'Decision'}: {date}</p>}
      </div>
      <div class="p-5 flex flex-col gap-3 flex-1">
        <p class="flex flex-wrap gap-2" data-meta>{metaChips(g).map((c) => <span class="chip border-ink bg-paper">{c}</span>)}</p>
        {officesLines(g).map(({ label, targets }) => {
          const faces = targets.filter((t) => showsPortrait(t)).slice(0, 3);
          return (
            <p class="flex items-center gap-2 text-sm" data-offices={label ?? undefined}>
              {faces.length > 0 && (
                <span class="flex shrink-0" aria-hidden="true">
                  {faces.map((t, i) => (
                    <img src={portraitSrc(t.bioguide_id!)} alt="" width="30" height="30" loading="lazy" decoding="async"
                      class={`w-[30px] h-[30px] rounded-full object-cover border-2 ${PARTY_CLASS(t.party).split(' ')[0].replace('bg-', 'border-')} bg-newsprint ${i > 0 ? '-ml-2.5' : ''}`} />
                  ))}
                </span>
              )}
              <span class="font-mono text-xs uppercase tracking-[0.08em]">{label ? `${label} · ` : ''}{officesLine(targets)}</span>
            </p>
          );
        })}
        <span class={`btn ${n === 1 ? 'btn-primary' : 'btn-ghost'} self-start mt-auto`}>Open this action →</span>
      </div>
    </a>
  );
}
