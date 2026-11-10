import type preact from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { GoalCard, TargetCard } from '../lib/api';
import type { RecordLine } from '@worker/electoral';
import { RESEARCH_URL } from '@worker/state-copy';
import { BIOGUIDE, visitLine, visitsFor, type VisitPublic } from '../lib/visits';
import NO_PORTRAIT from '../assets/portraits/missing.json';
import { CONTACT_LABEL } from '../lib/contact';
import type { ReceiptOutcome } from '../lib/commitments';
import Postmark from './Postmark';

export const CATEGORY: Record<GoalCard['category'], string> = { federal_vote: 'Vote in Congress', leadership: 'Who leads the Democrats', state: 'Your state', electoral: 'Election' };
const POSITION: Record<TargetCard['position'], string> = { for: 'With us', uncommitted: 'Uncommitted', against: 'Against', unknown: 'No stated position' };
const POSITION_CLASS: Record<TargetCard['position'], string> = { for: 'bg-acid', uncommitted: 'bg-hazard', against: 'bg-crimson text-paper', unknown: 'bg-newsprint' };

export function fmtDate(d: string | null): string | null {
  if (!d) return null;
  const t = Date.parse(d + 'T00:00:00');
  return Number.isNaN(t) ? d : new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const ROLE: Record<string, string> = { 'Rep.': 'Representative', 'Sen.': 'Senator' };
/** Party badge: D cobalt, R crimson, anyone else hazard (owner, 2026-11-08: the D was acid green). */
export const PARTY_CLASS = (party: string | null) => (party === 'D' ? 'bg-cobalt text-paper' : party === 'R' ? 'bg-crimson text-paper' : 'bg-hazard text-ink');
const PARTY_BORDER = (party: string | null) => (party === 'D' ? 'border-cobalt' : party === 'R' ? 'border-crimson' : 'border-hazard');

/** site-imagery §4: where a sitting member's portrait is served, on the site's own origin (`pages/portraits/[id].webp.ts`). */
export const portraitSrc = (id: string): string => `/portraits/${id}.webp`;
const WITHOUT: ReadonlySet<string> = new Set(NO_PORTRAIT as string[]);
/** True when the card asks for a portrait: a sitting member (a Bioguide id, never a member-elect or a treasurer) the import wrote a file for. */
export function showsPortrait(t: Pick<TargetCard, 'bioguide_id' | 'elect'>, without: ReadonlySet<string> = WITHOUT): boolean {
  return !t.elect && BIOGUIDE.test(t.bioguide_id ?? '') && !without.has(t.bioguide_id);
}

/**
 * site-imagery §4.2: the head of a target card. With a portrait it is a 48 px box with a 2 px party-coloured border; the
 * party badge is its base layer and the photo and the 16 px party tag are drawn over it only once the image has loaded
 * (`.portrait` in global.css), so a blocked or missing file shows the badge and never a broken image. Without one
 * (member-elect, treasurer, a member the import found no photo for) it is the 40 px party badge.
 */
export function Avatar({ t }: { t: TargetCard }) {
  const [loaded, setLoaded] = useState(false);
  const img = useRef<HTMLImageElement>(null);
  // An image that finished loading before this component mounted never fires `load` here.
  useEffect(() => { const i = img.current; if (i && i.complete && i.naturalWidth > 0) setLoaded(true); }, []);
  if (!showsPortrait(t)) return <span class={`w-10 h-10 shrink-0 border-2 border-ink shadow-brutal-sm flex items-center justify-center font-condensed text-[20px] leading-none ${PARTY_CLASS(t.party)}`}>{t.party ?? '·'}</span>;
  return (
    <span class={`portrait w-12 h-12 border-2 ${PARTY_BORDER(t.party)} shadow-brutal-sm font-condensed text-[20px] ${PARTY_CLASS(t.party)}`} data-portrait={t.bioguide_id} data-loaded={loaded ? '1' : undefined}>
      {t.party ?? '·'}
      <img ref={img} loading="lazy" fetchpriority="low" decoding="async" src={portraitSrc(t.bioguide_id)} alt="" width={48} height={48} onLoad={() => setLoaded(true)} />
      <span aria-hidden="true" class={`portrait-tag font-mono font-bold text-[10px] ${PARTY_CLASS(t.party)}`} data-party-tag>{t.party ?? '·'}</span>
    </span>
  );
}

/** urgency-and-readability §7.3: "Senator · VA", "Representative · KY-04", "Representative-elect · NY-10", "Treasurer · MD". */
export function roleLine(t: Pick<TargetCard, 'role' | 'state' | 'district'>): string {
  const role = ROLE[t.role] ?? t.role;
  const seat = seatOf(t);
  return seat ? `${role} · ${seat}` : role;
}
/** "VA", "KY-04", "NY at large"; null without a state. */
export function seatOf(t: Pick<TargetCard, 'state' | 'district'>): string | null {
  if (!t.state) return null;
  return t.district === null || t.district === undefined ? t.state : t.district === 0 ? `${t.state} at large` : `${t.state}-${String(t.district).padStart(2, '0')}`;
}

const PHONE_SVG = (
  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25c1.1.37 2.3.57 3.6.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1L6.6 10.8z" /></svg>
);
const ARROW_SVG = (
  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square"><path d="M5 12h13M12 5l7 7-7 7" /></svg>
);
const ENVELOPE_SVG = (
  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square"><path d="M3 5h18v14H3z" /><path d="M3 6l9 7 9-7" /></svg>
);
const SQUARE = 'w-11 h-11 shrink-0 border-2 border-ink shadow-brutal-sm flex items-center justify-center hover:bg-ink hover:text-acid';
/** results-pages §3.6: the "Next" office's call square carries a 3 px crimson ring until it is tapped. */
const RING = 'ring-[3px] ring-crimson ring-offset-2 ring-offset-paper';

export type Channel = 'call' | 'email';
/** results-pages §7: this device's receipt for one office in the last 24 h; the card renders muted with the postmark, a ✓ Share pill and the answer chip. */
export interface TargetDone { channel: Channel; at: string; outcome?: ReceiptOutcome }
/** §7: the chip reading the office's answer; Skip, "Sent it" and "Form didn't work" show none. */
export const ANSWER_CHIP: Partial<Record<ReceiptOutcome, string>> = { will_support: 'Said: with us', undecided: 'Said: undecided', opposed: 'Said: opposed', no_answer: 'No answer' };
export interface TargetHandlers {
  /** A tap on the call or write square (results-pages §3.1); the href still opens. Absent → plain links. */
  onContact?: (t: TargetCard, channel: Channel) => void;
  /** A tap on the ✓ Share pill of a done office (§3.5). */
  onShare?: (t: TargetCard) => void;
}

/**
 * One target card (urgency-and-readability §7, style-guide spec 06): paper, 2 px ink border, small shadow. Header row =
 * portrait or party badge (`Avatar`), name over the role line, the prior-vote status line, and the 44 px squares: write
 * (paper, results-pages §1.1, when the office has a contact form) then call (acid), or a hazard contact square for a
 * member-elect. Below it, in order: elect line, district line, position chip, holdings, visit, "On the record".
 * Every value is a data/ row. A `done` office (results-pages §7) is muted, wears the 64 px postmark on its top-right
 * corner (the header text keeps 56 px clear of it), and under the role line carries the ✓ Share pill, the answer chip
 * and, after "Form didn't work", the call square again so "Call <Surname> instead" has something to ring.
 */
export function Target({ t, partner, done, ring, onContact, onShare }: { t: TargetCard; partner?: string | null; done?: TargetDone; ring?: boolean } & TargetHandlers) {
  const id = t.bioguide_id ?? t.name;
  const tap = (channel: Channel) => (onContact ? () => onContact(t, channel) : undefined);
  const external = onContact ? { target: '_blank' } : {};
  const callSquare = t.phone && (
    <a href={`tel:${t.phone.replace(/[^\d+]/g, '')}`} class={ring ? `${SQUARE} ${RING} bg-acid` : `${SQUARE} bg-acid`} aria-label={`Call ${t.name}`} title={`Call ${t.phone}`} onClick={tap('call')} data-call-square data-next={ring ? '' : undefined}>{PHONE_SVG}</a>
  );
  const chip = done?.outcome ? ANSWER_CHIP[done.outcome] : undefined;
  return (
    <li class={done ? 'relative bg-newsprint/60 border-2 border-ink shadow-brutal-sm p-3.5' : 'bg-paper border-2 border-ink shadow-brutal-sm p-3.5 hover:bg-hazard/10'} data-target={id} data-done={done ? done.channel : undefined}>
      {done && <Postmark wrote={done.channel === 'email'} name={t.name} at={done.at} size={64} id={`done-${id}`} class="absolute -top-2 right-2.5 z-10" />}
      <div class="flex items-start gap-3">
        <Avatar t={t} />
        <div class={done ? 'min-w-0 flex-1 pr-14' : 'min-w-0 flex-1'}>
          <p class="font-condensed uppercase tracking-wide text-2xl leading-none">{t.name}</p>
          <p class="font-mono text-xs uppercase tracking-[0.08em] mt-1" data-role-line>{roleLine(t)}</p>
          <p class="label-ticker text-ink/70 mt-1">{t.prior_vote}</p>
          {done && (
            <div class="mt-2 -mr-14 flex items-center gap-2 flex-wrap" data-done-row>
              <button type="button" class="btn btn-ghost shrink-0 px-3 py-2 text-sm" onClick={onShare ? () => onShare(t) : undefined} data-share-pill aria-label={`Share that you ${done.channel === 'email' ? 'wrote to' : 'called'} ${t.name}`}>✓ Share</button>
              {chip && <span class="chip bg-paper" data-answer-chip={done.outcome}>{chip}</span>}
              {done.outcome === 'form_failed' && callSquare}
            </div>
          )}
        </div>
        {!done && (
          <>
            {t.contact_form_url && (
              <a href={t.contact_form_url} class={`${SQUARE} bg-paper`} rel="noopener noreferrer" {...external} aria-label={`Write to ${t.name}`} title={CONTACT_LABEL[t.contact_kind ?? 'homepage']} onClick={tap('email')} data-write-square>{ENVELOPE_SVG}</a>
            )}
            {callSquare}
            {!t.phone && t.elect && (
              <a href={t.elect.contact_url} class={`${SQUARE} bg-hazard`} rel="noopener noreferrer" {...external} aria-label={`Contact ${t.name}`} title="Contact" onClick={tap('email')} data-write-square>{ARROW_SVG}<span class="sr-only">Contact</span></a>
            )}
          </>
        )}
      </div>
      {t.elect && (
        <p class="mt-2 text-sm label-ticker" data-elect-line>Takes office {fmtDate(t.elect.takes_office)}, replaces {t.elect.replaces_name}</p>
      )}
      {t.district_phone && (
        <p class="mt-2 text-sm label-ticker" data-district-line>District: {t.district_city ? `${t.district_city} ` : ''}<a href={`tel:${t.district_phone.replace(/[^\d+]/g, '')}`} class="underline">{t.district_phone}</a></p>
      )}
      <p class="mt-2 text-sm"><span class={`chip mr-2 ${POSITION_CLASS[t.position]}`}>{POSITION[t.position]}</span>
        {t.position_source_url && <a href={t.position_source_url} class="underline label-ticker" rel="noopener">source</a>}
      </p>
      {t.holdings_status && (
        <p class="mt-1 text-sm label-ticker text-ink/70">
          {t.holdings_status === 'unknown'
            ? <a href={RESEARCH_URL} class="underline" rel="noopener noreferrer">help us find it →</a>
            : t.holdings_source_url && <a href={t.holdings_source_url} class="underline" rel="noopener noreferrer">source</a>}
        </p>
      )}
      {BIOGUIDE.test(t.bioguide_id) && <VisitLine member={t.bioguide_id} partner={partner} />}
      {t.record && (
        <div class="mt-3 border-t border-rule pt-2">
          <p class="label-code text-xs">On the record</p>
          {t.record.length === 0
            ? <p class="text-sm text-ink/70 mt-1">No goal this site tracked has named this member yet.</p>
            : <ul class="mt-1 text-sm flex flex-col gap-2">{t.record.map((r) => <RecordRow r={r} />)}</ul>}
        </div>
      )}
    </li>
  );
}

/** §7.1–7.2: the stack of cards under a "Who to call (n)" line; the counter line renders below it. `done` and `next` come from results-pages §3. */
export function TargetStack({ label, targets, partner, children, done, next, onContact, onShare }: { label: string; targets: TargetCard[]; partner?: string | null; children?: preact.ComponentChildren; done?: ReadonlyMap<string, TargetDone>; next?: string | null } & TargetHandlers) {
  return (
    <div class="flex flex-col gap-3" data-target-stack>
      <p class="label-code">{label}</p>
      <ul class="flex flex-col gap-3">{targets.map((t) => {
        const id = t.bioguide_id ?? t.name;
        return <Target t={t} partner={partner} done={done?.get(id)} ring={next === id} onContact={onContact} onShare={onShare} />;
      })}</ul>
      {children}
    </div>
  );
}

/** primary-2028 §1.2: one tracked goal, the member's newest sourced position (with source and date) and recorded vote. Rows only; no verdict. */
export function RecordRow({ r }: { r: RecordLine }) {
  return (
    <li>
      <p class="font-semibold leading-tight">{r.goal_title}{r.decision_date ? <span class="label-ticker text-ink/70 font-normal"> · {fmtDate(r.decision_date)}</span> : null}</p>
      <p class="mt-1"><span class={`chip mr-2 ${POSITION_CLASS[r.position]}`}>{POSITION[r.position]}</span>
        {r.source_url
          ? <a href={r.source_url} class="underline label-ticker" rel="noopener">source{r.source_date ? ` · ${fmtDate(r.source_date)}` : ''}</a>
          : <span class="label-ticker text-ink/70">no sourced statement</span>}
        <span class="label-ticker text-ink/70"> · {r.vote}</span>
      </p>
    </li>
  );
}

/** office-visits §2.1: the next approved visit to this member's district office, or the invitation to list one. Nothing until the fetch answers. */
export function VisitLine({ member, partner }: { member: string; partner?: string | null }) {
  const [visits, setVisits] = useState<VisitPublic[] | null>(null);
  useEffect(() => { void visitsFor(member).then(setVisits); }, [member]);
  if (visits === null) return null;
  const v = visits[0];
  return (
    <p class="mt-1 text-sm" data-visit-line>
      {v
        ? <a href={`/m/${member}#visits`} class="underline font-semibold">{visitLine(v)} →</a>
        : <>No visit listed yet. <a href={`/m/${member}#organise`} class="underline">Organise one</a>{partner && <> · <a href={partner} rel="noopener" class="underline">partner campaign ↗</a></>}</>}
    </p>
  );
}
