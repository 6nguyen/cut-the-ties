import { useEffect, useState } from 'preact/hooks';
import { districtLabel } from '../lib/api';
import { clearPlace, loadPlace, type Place } from '../lib/store';
import { atDue, clearFunnel, dropCaptain, fmtDue, isOverdue, keyOf, kindOf, loadCommitments, loadVisits, saveCommitments, ymd, type Commitment, type JoinedVisit } from '../lib/commitments';
import { fmtWhen, withdrawVisit } from '../lib/visits';

/** The build-time slice of every published goal the card needs (index.astro passes it). */
export interface WeekGoal { slug: string; title: string; status: 'upcoming' | 'active' | 'completed' | 'expired'; decision_date: string | null; outcome_note: string | null; what_we_want?: string }
interface Props { goals: WeekGoal[] }

/** commitment-funnel §3: the return visitor's checklist above the address field. */
export default function YourWeek({ goals }: Props) {
  const [place, setPlace] = useState<Place | null>(null);
  const [items, setItems] = useState<Commitment[]>([]);
  const [dropped, setDropped] = useState<string[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const [visits, setVisits] = useState<JoinedVisit[]>([]);
  const goalOf = (slug: string) => goals.find((g) => g.slug === slug);

  useEffect(() => {
    dropCaptain(); // one-screen-receipt §4.2: the captain list is retired; a stored one goes, unread
    const p = loadPlace();
    setPlace(p);
    setVisits(loadVisits().filter((j) => j.ends_at >= new Date().toISOString().slice(0, 16)));
    if (!p) return;
    // §2.2 closed goals: drop the item, say the outcome once.
    const gone: string[] = [];
    const closed = (slug: string) => { const g = goalOf(slug); if (g && g.status === 'active') return false; gone.push(g ? `${g.title}: ${g.outcome_note ?? (g.status === 'expired' ? 'the window closed' : 'closed')}.` : 'One goal is no longer listed; its item was dropped.'); return true; };
    const keep = loadCommitments().filter((c) => !closed(c.goal));
    saveCommitments(keep);
    setItems(keep);
    setDropped([...new Set(gone)]);
  }, []);

  // office-visits: a joined visit shows even without a stored address (one can be joined from a member page).
  if (!place && visits.length === 0) return null;
  const where = place ? districtLabel(place.state, place.district) : '';
  const open = items.filter((c) => !hidden.includes(keyOf(c)));
  if (open.length === 0 && dropped.length === 0 && visits.length === 0) return null;

  function update(list: Commitment[]) { saveCommitments(list); setItems(list); }
  function newDate(key: string, apply: (iso: string) => void) {
    const d = atDue(date);
    if (Number.isNaN(d.getTime())) return;
    apply(d.toISOString()); setEditing(null);
  }
  function startOver() { clearFunnel(); clearPlace(); setItems([]); setDropped([]); setVisits([]); setPlace(null); }
  async function leave(id: number) { await withdrawVisit(id); setVisits(visits.filter((j) => j.id !== id)); }

  const dateInput = (key: string, apply: (iso: string) => void) => (
    <span class="flex flex-wrap gap-2 items-center">
      <input type="date" class="input-field text-sm" aria-label="New date" min={ymd(new Date())} value={date} onInput={(e) => setDate((e.target as HTMLInputElement).value)} />
      <button type="button" class="btn btn-ghost" onClick={() => newDate(key, apply)}>Set</button>
    </span>
  );

  return (
    <section class="card bg-newsprint text-ink p-4 mb-6 flex flex-col gap-3" aria-labelledby="your-week" data-your-week>
      <div class="flex flex-wrap justify-between gap-2 items-baseline">
        <h2 id="your-week" class="headline-md">Your week</h2>
        {where && <span class="label-code">{where}</span>}
      </div>
      {dropped.map((line) => <p class="text-sm" data-outcome>{line}</p>)}
      {open.map((c) => {
        const g = goalOf(c.goal);
        const late = isOverdue(c.due);
        const key = keyOf(c);
        const retry = kindOf(c) === 'retry';
        const drop = () => update(items.filter((x) => keyOf(x) !== key));
        return (
          <div class="border-t-2 border-ink pt-3 flex flex-col gap-2" data-commitment data-kind={kindOf(c)}>
            <p class="font-semibold">{late ? 'Still on? ' : ''}{retry
              ? <>Try {c.who ?? 'the office'} again about <a href={`/goals/${c.goal}/act/${c.action}?target=${c.target}`} class="underline">{g?.title ?? c.goal}</a> by {fmtDue(c.due)}.</>
              : <>You said you'd call about <a href={`/goals/${c.goal}/act/${c.action}`} class="underline">{g?.title ?? c.goal}</a> by {fmtDue(c.due)}.</>}</p>
            <div class="flex flex-wrap gap-2 items-center">
              <button type="button" class="btn btn-primary" onClick={drop}>Done</button>
              {late ? (
                <>
                  {editing === key ? dateInput(key, (iso) => update(items.map((x) => (keyOf(x) === key ? { ...x, due: iso } : x)))) : <button type="button" class="btn btn-ghost" onClick={() => { setDate(ymd(new Date())); setEditing(key); }}>New date</button>}
                  <button type="button" class="btn btn-ghost" onClick={drop}>Drop</button>
                </>
              ) : <button type="button" class="btn btn-ghost" onClick={() => setHidden([...hidden, key])}>Not yet</button>}
            </div>
          </div>
        );
      })}
      {visits.map((j) => (
        <div class="border-t-2 border-ink pt-3 flex flex-col gap-2" data-joined-visit={j.id}>
          <p class="font-semibold">You're visiting <a href={`/m/${j.member}#visits`} class="underline">{j.name}</a>'s office in {j.city}, {fmtWhen(j.starts_at, j.ends_at)}.</p>
          <div class="flex flex-wrap gap-2 items-center">
            <a href={j.contact_url} rel="noopener noreferrer" class="btn btn-primary" data-contact>Contact the organiser ↗</a>
            <button type="button" class="btn btn-ghost" onClick={() => void leave(j.id)}>Withdraw</button>
          </div>
        </div>
      ))}
      <div class="border-t-2 border-ink pt-3 flex flex-wrap gap-3 items-center text-sm">
        <a href="/results" class="underline font-semibold">Your two actions →</a>
        <button type="button" class="underline" onClick={() => { clearPlace(); setPlace(null); }}>Change address</button>
        <button type="button" class="underline text-ink/70 ml-auto" onClick={startOver}>Start over</button>
      </div>
    </section>
  );
}
