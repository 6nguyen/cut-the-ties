// call-follow-through §1, §3, §4: what the receipt screen adds after "I did it". ActForm imports this
// module lazily once a receipt exists, so the act page's own bundle does not carry it.
import { useState } from 'preact/hooks';
import { addCommitment, defaultDue, fmtDue, receiptedTargets, reminderIcs, retryDue, retryFor } from '../lib/commitments';
import { downloadIcs } from '../lib/ics';
export { default as Counts } from './Counts';

interface NextOfficeProps { goal: string; action: string; choices: { id: string; label: string }[]; /** false while the email step's "I sent it" is the filled button on screen. */ primary?: boolean }
/**
 * one-screen-receipt §2.4: "Next: call <office>'s office →" for each target of the goal without a receipt from this
 * device in 24 h. The first is the receipt screen's one filled button, the rest are bordered; nothing when the goal
 * lists one target.
 */
export function NextOffice({ goal, action, choices, primary = true }: NextOfficeProps) {
  const named = choices.filter((c) => c.label);
  if (named.length < 2) return null;
  const done = receiptedTargets(goal, action);
  const left = named.filter((c) => !done.has(c.id));
  return (
    <div class="flex flex-wrap gap-2 items-center" data-next-office>
      {left.length ? left.map((c, i) => <a href={`/goals/${goal}/act/${action}?target=${c.id}`} class={`btn ${i === 0 && primary ? 'btn-primary' : 'btn-ghost'}`} data-next-primary={i === 0 ? true : undefined}>Next: call {c.label}'s office →</a>)
        : <p class="text-sm font-semibold" data-next-done>{named.length === 3 ? 'All three called this week.' : 'All of your targets called this week.'}</p>}
    </div>
  );
}

interface RemindProps { goal: string; action: string; target: string; title: string; decision: string | null; /** A call was made: the reminder is for a second call before the vote. */ again: boolean }
/**
 * one-screen-receipt §2.6: the reminder text link. One tap stores the private commitment for the default date (next
 * weekday 10:00 local, never past the decision date) and downloads its `.ics`. No date input; nothing posts.
 */
export function Remind({ goal, action, target, title, decision, again }: RemindProps) {
  const [saved, setSaved] = useState(false);
  function remind() {
    const due = defaultDue(new Date(), decision).toISOString();
    addCommitment({ goal, action, target, due });
    downloadIcs(`call-${goal}`, reminderIcs(goal, title, due, `${location.origin}/goals/${goal}`));
    setSaved(true);
  }
  return saved ? <p class="font-semibold" data-remind>Reminder saved</p>
    : <button type="button" class="underline text-left self-start cursor-pointer" onClick={remind} data-remind>{again ? 'Remind me before the vote (.ics)' : 'Remind me to call (.ics)'}</button>;
}

interface RetryProps { goal: string; action: string; target: string; who: string; title: string }
/** call-follow-through §1: under `no_answer`, the voicemail line and one "Try again" that stores a `retry` commitment due at the DC office's next open slot (≥60 min ahead). Nothing posts. */
export function Retry({ goal, action, target, who, title }: RetryProps) {
  const [due, setDue] = useState<string | null>(() => retryFor(goal, target)?.due ?? null);
  const url = `${location.origin}/goals/${goal}/act/${action}?target=${target}`;
  function tryAgain() {
    const iso = retryDue(new Date()).toISOString();
    addCommitment({ goal, action, target, due: iso, kind: 'retry', who });
    setDue(iso);
  }
  return (
    <div class="flex flex-col gap-2" data-retry>
      <p class="text-sm">Voicemail counts. Offices tally messages daily; say your street address so yours is logged.</p>
      {due ? (
        <div class="flex flex-wrap gap-2 items-center">
          <p class="text-sm font-semibold" data-retry-due>Try {who} again by {fmtDue(due)}. It's on your week.</p>
          <button type="button" class="btn btn-ghost" onClick={() => downloadIcs(`retry-${goal}`, reminderIcs(goal, title, due, url, true))}>Add reminder (.ics)</button>
        </div>
      ) : <button type="button" class="btn btn-ghost self-start" onClick={tryAgain}>Try again</button>}
    </div>
  );
}
