# Receipt sheet and done-card stamps — PRD
Status: READY 2026-11-09 (auto) · Owner: George Nguyen · Last updated: 2026-11-09

## Problem
On `/results/<goal>` a tap on a call or write square is the receipt: the
dialer opens, `POST /api/receipt` fires and the receipt modal shows the
stamp, the count echo, the share block and the next office
(`docs/specs/results-pages.md` §4–5). Nothing asks what happened on the
call. The act page does ask (`personalised-documents.md` §4: the
office-response chips post `POST /api/report`), so the visitor who reaches
an office from `/results` leaves no report, the `no_answer` retry path
("Try again" / "Email it instead") never appears there, and the only
record of the call is the receipt row. The done card then reads "· Called
2:14 pm" in the role line, a detail that is easy to miss in a stack of
three cards. The owner decided on 2026-11-09 that "the tap is the receipt"
with no outcome question (`share-from-results.md` Non-goals; research
`post-contact-share-prompt.md` implication 7); this PRD reverses that
decision at the owner's request the same day: the receipt sheet asks
whether the call was answered, and a done card wears a stamp that says
CALLED or WROTE. Mock-ups: `design/mockups/receipt-sheet.html` (S1–S4 the
sheet, V1–V4 the stamps). The vote this serves is whichever goals
`/results` routes today, the NDAA §219/§1217 integration sections first.

## Goals / Non-goals
- Goals:
  1. After the tap, the receipt sheet asks one question before it shows
     the rest: "Did someone pick up?" for a call, "Did your message go
     through?" for a write. An answer posts the act page's `POST
     /api/report` where an outcome fits; "Skip" is always one tap away and
     the stamp, the count and the next office follow either way.
  2. A call that reached staff gets one more row, "What did they say?",
     with the office-response outcomes the act page already stores.
  3. The done card wears a CALLED / WROTE stamp (one of V1–V4, Open
     question 1) in place of the role-line suffix, with the answer under
     it when there is one ("Said: with us").
  4. No new endpoint, table or outcome value; no share before the receipt;
     the budgets of `results-pages.md` hold.
- Non-goals:
  - Whip counts or any number computed from reports; counts stay the
    receipt counts (`Counts` echo). A report changes nothing the product
    shows except the visitor's own done card.
  - Changing the act page's outcome chips, the goal detail page's squares
    or the `/done` page.
  - A new `form_failed` outcome in D1 (`reports.outcome` CHECK); the write
    variant's "Form didn't work" is client-only (§2).
  - Redesigning the big "I CALLED" / "I WROTE" `ReceiptStamp`.

## Research (what the best products do → adopt / adapt / reject)
Relies on: `docs/research/post-contact-share-prompt.md`.
| Pattern | Seen in | Verdict | Why |
|---|---|---|---|
| Outcome chips after the call (`contact · voicemail · unavailable · skip`), then "Next up: call Y" | 5 Calls | adopt | Same funnel: private act → outcome → next office; "Skip" stays so the question never blocks the receipt |
| Outcome before the share | 5 Calls | adapt | The share block stays in the sheet but below the question and the Next button; nothing public is the first step |
| Ask only when the answer is used | question-behaviour literature (small effect, research L54) | adopt | The answer renders on the done card and drives the `no_answer` retry path; it does not feed a count |
| Office-response chips with "Put it in writing" | this site's act page (`personalised-documents.md` §4) | adopt | Same `POST /api/report`, same outcomes and copy; one contract |
| Rubber-stamp receipt on the completed item | ballot-tracker and postal apps; this site's `ReceiptStamp` | adopt | Owner ask; a stamp reads at a glance where "· Called 2:14 pm" does not |

## Users
The visitor who just tapped a square on `/results/<goal>`, phone in hand,
dialer or contact form in front: one question, big chips, no typing
("Other" / "Didn't say" needs no note here). The visitor who comes back
to the page later reads the stamp before any text.

## Expected behavior

### 1. Receipt sheet after a call
1. The tap on the call square behaves as `results-pages.md` §4 (link
   proceeds, `POST /api/receipt` with `keepalive`, the sheet opens at
   once). The sheet is the same `<dialog>` as today's modal (`ReceiptModal`)
   drawn as a bottom sheet on viewports under 640 px (grab bar, full
   width, 3 px ink top border, slides up) and as the centred panel above;
   Esc, ✕ and a backdrop tap still close it.
2. Top to bottom while the question is open (mock-up S1): the ticker line
   "<Role Surname>'s office · calling…" (crimson), the question "Did
   someone pick up?" in the display face, one chip row `Spoke to staff ·
   Left a voicemail · No answer · Skip` (Skip dashed and muted), a rule,
   and one muted line "Your stamp, the count and the next office land
   here once you answer (or skip)." Nothing below it; no share control.
3. `Left a voicemail` and `No answer` post `POST /api/report {goal,
   target, outcome: 'no_answer', device}`; `Spoke to staff` posts nothing
   yet and opens row two; `Skip` posts nothing. A failed post shows "Could
   not save that. Try again." under the chips and the chips stay tappable;
   the sheet never waits on the post to continue.
4. After any answer (mock-up S2) the question collapses to one line with
   the chosen chip filled (ink, acid text) and "Saved" in crimson mono
   when a post returned 2xx, and the rest of today's modal renders below
   in order: `ReceiptStamp` "I CALLED", the `Counts` echo (or the §4
   message), the filled "Next: call <Role Name> →" (or "Your other
   action →"), then one row of two bordered buttons "Share" and "Not now",
   then for `no_answer` the link "No answer? Remind me tomorrow". "Share"
   opens the share block of `social-sharing.md` §3–5 in place (poster
   drawn lazily on that tap, not on open). After `Skip` the same, without
   the "Saved" mark.
5. Row two, after `Spoke to staff`: "What did they say?" with chips `With
   us · Undecided · Opposed · Didn't say` → `will_support · undecided ·
   opposed · other`; a tap posts the report and reveals the rest as in 4.
   `other` posts with no note. The rest of the sheet is not gated on row
   two: a visitor who leaves row two open still sees the stamp, count and
   Next below it after a 2 s delay, so an unanswered second question never
   hides the receipt.
6. The answer is stored on the receipt row (`LoggedReceipt.outcome`) so a
   reload and the done card (§3) know it; a receipt that was `limit_day`,
   `limit_ip` or a network failure writes no row and the answer is posted
   but not kept.
7. The reminder link appears only for `no_answer` or `Skip` (a call that
   reached staff needs no retry); `Not now` closes; the goal detail page is
   unchanged.

### 2. Write variant
1. A tap on the write square opens the sheet with the ticker "<Role
   Surname>'s contact form · opened in a new tab" and the question "Did
   your message go through?" with chips `Sent it · Form didn't work ·
   Skip` (mock-up S4).
2. `Sent it` and `Skip` post nothing and reveal the rest: "I WROTE" stamp,
   the echo ("who wrote this week"), Next, Share / Not now. No reminder
   link.
3. `Form didn't work` posts nothing (no D1 outcome fits, Non-goals), keeps
   the receipt row as today (the attempt is counted), and swaps the filled
   control for "Call <Role Surname> instead →" when that office has a
   phone and no call receipt in 24 h: it closes the sheet, rings that
   office's call square (`data-next`) and scrolls to it. Without a phone
   the filled control is the usual Next. The stamp still reads "I WROTE".
4. A member-elect's hazard Contact square is a write for this section.

### 3. Done-card stamp
1. After the sheet closes, the tapped office's card (`data-done`) keeps
   its newsprint mute and its ✓ Share pill, drops the "· Called 2:14 pm"
   suffix from the role line, and gains a stamp that reads CALLED or WROTE
   with the day and time ("NOV 9 · 2:14 PM") in the design Open question 1
   settles (V1 rubber stamp proposed: crimson dashed, −7°, the
   `ReceiptStamp` grain filter and under-inked mask, hanging over the
   card's top-right edge, the card taking 26 px more top padding so no
   text is covered).
2. When the receipt row carries an outcome, one chip under the header row
   reads the answer: `Said: with us · Said: undecided · Said: opposed ·
   Said: didn't say · Voicemail / no answer`; no chip after Skip or for
   a write.
3. The stamp has the accessible name "Called <name>, <day> <time>" /
   "Wrote to <name>, …" (`role="img"`); the pill keeps its label. The
   stamp clears with the receipt row after 24 h, as the mute does today.
4. The act page's done state is untouched; the stamp is a results-page
   rendering of `Target` `done`.

### 4. Owner device test
1. Owner runs the §1–3 flow on iPhone Safari and Android Chrome against
   production after merge: tap call → sheet opens as a bottom sheet →
   each chip path (voicemail, spoke to staff → with us, skip) → stamp on
   the card → reload keeps it; tap write → S4 path including "Form didn't
   work" → crimson ring on the call square. One screenshot per path.

## Data & contracts
- `POST /api/report` unchanged (`worker/src/index.ts` `OUTCOMES`: `will_support ·
  undecided · opposed · no_answer · other`); the sheet posts `{goal,
  target, outcome, device}` with no `note`.
- `cut-ties:receipts` rows (`LoggedReceipt`, `web/src/lib/commitments.ts`)
  gain `outcome?: 'will_support' | 'undecided' | 'opposed' | 'no_answer' |
  'other' | 'skip' | 'sent'` (`skip` and `sent` are client-only, never
  posted). `logReceipt` writes it; `receiptsByTarget` returns it.
- `Target` `done` becomes `{channel, at, outcome?}`; `ReceiptModal`
  gains `question` state and an `onOutcome(outcome)` prop; the shared
  stamp is `web/src/components/DoneStamp.tsx`.
- No schema, seed or endpoint change; no new settings key.

## Spec delta
- MODIFIED `docs/specs/results-pages.md` §Purpose: "a receipt modal with
  the stamp, the count echo, the share block and the next office" → "a
  receipt sheet that asks whether the office answered, then shows the
  stamp, the count echo, the next office and the share".
- MODIFIED `docs/specs/results-pages.md` §4: "Nothing asks whether the
  office answered." → the question rows of §1.2–1.5 and §2.1–2.3 above,
  with the `POST /api/report` mapping.
- MODIFIED `docs/specs/results-pages.md` §5: the modal order → the sheet
  (bottom sheet under 640 px) in the order of §1.2 and §1.4: question,
  then stamp, echo, Next, "Share" / "Not now", reminder (no_answer or
  Skip only); the share block opens on "Share"; the poster draws on that
  tap.
- MODIFIED `docs/specs/results-pages.md` §7: "its role line gains
  '· Called 2:14 pm' / '· Wrote 2:14 pm'" → the CALLED / WROTE stamp and
  the "Said: …" chip of §3.
- MODIFIED `docs/specs/results-pages.md` §Data & contracts: `LoggedReceipt`
  gains `outcome?`; `Target` `done` gains `outcome?`.
- MODIFIED `docs/specs/results-pages.md` §Invariants: add "The sheet's
  question has a Skip chip; the stamp, count and Next render after any
  chip; no share control renders while the question is open" and "A
  report never changes a count".
- MODIFIED `docs/specs/results-pages.md` §Performance budget: the lazy
  chunk may grow by ≤2 KB gzip for the question rows and `DoneStamp`;
  the poster module loads on "Share", not on open.

## Acceptance criteria
- [ ] Tap a call square on `/results/<goal>` at 375 px: a bottom sheet
      opens with the question and four chips; no stamp, count, Next or
      share control is visible until a chip is tapped.
- [ ] `Left a voicemail` → one `POST /api/report` with `outcome:
      'no_answer'`, "Saved", then the stamp, echo, filled Next, Share /
      Not now and "No answer? Remind me tomorrow".
- [ ] `Spoke to staff` → no post; "What did they say?" with four chips;
      `With us` → one post with `will_support`; leaving row two open still
      reveals the receipt after ~2 s.
- [ ] `Skip` → no post, no "Saved", the rest renders; no reminder for a
      write.
- [ ] A failed report shows "Could not save that. Try again." and the
      receipt still renders; the chips remain tappable.
- [ ] Write square: "Did your message go through?"; `Form didn't work`
      posts nothing, the filled control reads "Call <Surname> instead →"
      and rings that call square; the receipt row stands.
- [ ] After closing, the done card shows the CALLED / WROTE stamp with
      day and time, no role-line suffix, the ✓ Share pill, and the
      "Said: …" chip when an outcome was chosen; a reload keeps all three;
      after 24 h the squares return.
- [ ] No count on the page changes with any outcome; the `Counts` echo is
      the receipt count.
- [ ] Desktop (≥640 px): the same content in the centred panel.
- [ ] Budgets: `/results/<goal>` initial requests unchanged (≤100 KB, no
      sheet or poster chunk); lazy chunk growth ≤2 KB gzip; `/api/report`
      ≤2 s p95; $0/month infra. The PR quotes the measured chunk sizes.

## Rollout & metrics
No flag; ships with the next deploy. Measure in the weekly digest: share
of `/results` receipts with a report, outcome mix, and whether the
`no_answer` share from `/results` matches the act page's. Success: ≥50 %
of results-page call receipts carry an outcome in the first two weeks
with no drop in receipts per visit.

## State (updated 2026-11-09)
- Sections:
  - [ ] 1. Receipt sheet after a call
  - [ ] 2. Write variant
  - [ ] 3. Done-card stamp
  - [ ] 4. Owner device test
- Completed: none
- Folded: none
- Branch / open PRs: `docs/receipt-sheet-prd` (this PRD)
- Files changed (file:line map): —
- Tests run + result: —
- Remaining: §1–4
- Decisions since last update: created; proposals of Open questions 1–3
  are the decisions.
- Known failures / blockers: none
- Next action: merge the PRD PR, then `/implement-prd-section
  docs/prd/receipt-sheet-and-done-stamps.md` (§1)

## Open questions
1. Which done-card stamp design? Proposal: V1 rubber stamp
   (`design/mockups/receipt-sheet.html` #stamps): the same family as the
   big "I CALLED" stamp, reads as a stamp, costs 26 px of card height. V2
   ink block is the fallback if the rotation fights the list rhythm on
   the owner's phone. V3 and V4 are rejected (V3 reads as a header, V4
   only works for WROTE).
2. Question first (S1→S2) or today's modal with an outcome row (S3)?
   Proposal: question first, as asked; Skip and the 2 s reveal of §1.5
   keep the receipt from ever being hidden behind the question.
3. Should "Form didn't work" become a D1 outcome? Proposal: no; it is
   client-only until the digest shows it is chosen often enough to count.

## Changes
- 2026-11-09 — created (READY, auto): reverses the 2026-11-09 "no outcome
  question" decision of `share-from-results.md` at the owner's request;
  mock-ups S1–S4 and V1–V4 in `design/mockups/receipt-sheet.html`.
