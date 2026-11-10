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
CALLED or WROTE. Mock-ups: `design/mockups/receipt-sheet-v3.html` (S7–S9,
the ask on today's receipt card) and `receipt-sheet-v2.html` #pm (P1–P3
the postmark); `receipt-sheet.html` and v2 S5–S6 hold the rejected
rounds. The vote this serves is whichever goals
`/results` routes today, the NDAA §219/§1217 integration sections first.

## Goals / Non-goals
- Goals:
  1. Today's receipt card gains one data point: a single ask ("What did
     the office say?" / write: "Did it go through?") with the stamp, the
     count, the existing share card and then the next office all visible
     at once. One tap answers; it posts the act page's `POST /api/report`
     where an outcome fits. Nothing is gated on the answer, "Skip" is one
     tap, there is no second question (owner, 2026-11-09).
  2. The done card wears a CALLED / WROTE postmark on its top-right corner
     (P1, owner 2026-11-09) in place of the role-line suffix, adding no top
     padding to the card, with the answer as a chip when there is one
     ("Said: with us").
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
  - A two-step question (answered? → what did they say?) or revealing the
    receipt only after an answer: rejected by the owner on 2026-11-09 as
    a three-step flow (mock-ups S1–S3).

## Research (what the best products do → adopt / adapt / reject)
Relies on: `docs/research/post-contact-share-prompt.md`.
| Pattern | Seen in | Verdict | Why |
|---|---|---|---|
| Outcome chips after the call (`contact · voicemail · unavailable · skip`), then "Next up: call Y" | 5 Calls | adapt | One chip row, same funnel; the receipt and the next office render with the question, not after it |
| Outcome before the share | 5 Calls | adapt | The ask sits above the share card on the same receipt card; the next office follows the share card; nothing public is the first step |
| Ask only when the answer is used | question-behaviour literature (small effect, research L54) | adopt | The answer renders on the done card and drives the `no_answer` retry path; it does not feed a count |
| Office-response chips with "Put it in writing" | this site's act page (`personalised-documents.md` §4) | adopt | Same `POST /api/report`, same outcomes and copy; one contract |
| Postmark on the completed item | postal apps, cancelled-stamp receipts | adopt | Owner pick (V4 family); shrunk so it adds no height to the card |

## Users
The visitor who just tapped a square on `/results/<goal>`, phone in hand,
dialer or contact form in front: one question, one tap, no typing, and the
receipt already on screen if they ignore it. The visitor who comes back
to the page later reads the stamp before any text.

## Expected behavior

### 1. Receipt sheet after a call
1. The tap on the call square behaves as `results-pages.md` §4 (link
   proceeds, `POST /api/receipt` with `keepalive`, the modal opens at
   once). The sheet is today's `ReceiptModal` `<dialog>` as shipped
   (centred paper panel, ✕, Esc and backdrop close); no bottom-sheet
   redesign (owner, 2026-11-09: "use the existing share card").
2. Top to bottom (mock-ups S7–S9): `ReceiptStamp` "I CALLED" and ✕, the
   `Counts` echo (or the §4 message), the ask, the existing share card
   (`ShareRow`: poster thumbnail, Share / Copy link / Message, hint),
   then the filled "Next: call <Role Name> →" (or "Your other action →"),
   then "Not now" and "No answer? Remind me tomorrow". The ask is the one
   addition; its placement is Open question 1 (S9 proposed: a mono label
   "The office said" with a "Skip" link, and one segmented control `With
   us | Undecided | Opposed | No answer` → `will_support · undecided ·
   opposed · no_answer`; S7 puts a display-face question and chip row
   above the stamp, S8 a hazard strip with a 2×2 chip grid under the
   echo). Everything renders on open; the ask gates nothing.
3. A chip tap posts `POST /api/report {goal, target, outcome, device}`
   (no `note`), fills the segment (ink, acid text) and shows "Saved" in
   crimson mono beside the label on a 2xx; a second tap on another
   segment posts again (the act page already allows this). A failed post
   reads "Could not save that. Try again." under the control with the
   segments still tappable. `Skip` hides the control with no post and no
   "Saved".
4. The answer is stored on the receipt row (`LoggedReceipt.outcome`) so a
   reload and the done card (§3) know it; a receipt that was `limit_day`,
   `limit_ip` or a network failure writes no row and the answer is posted
   but not kept.
5. The reminder link renders for every call, as today; the goal detail
   page is unchanged.

### 2. Write variant
1. A tap on the write square opens the same modal with the "I WROTE"
   stamp, the echo ("who wrote this week"), the ask "Did it go through?"
   as `Sent it | Form didn't work` with "Skip", the share card, Next and
   "Not now" (no reminder link), all visible on open.
2. `Sent it` and `Skip` post nothing; `Sent it` fills and shows no
   "Saved" (there is nothing to save).
3. `Form didn't work` posts nothing (no D1 outcome fits, Non-goals),
   keeps the receipt row (the attempt is counted) and swaps the filled
   control for "Call <Role Surname> instead →" when that office has a
   phone and no call receipt in 24 h: it closes the sheet, rings that
   office's call square (`data-next`) and scrolls to it. Without a phone
   the filled control is the usual Next.
4. A member-elect's hazard Contact square is a write for this section.

### 3. Done-card postmark
1. After the sheet closes, the tapped office's card (`data-done`) keeps
   its newsprint mute and its ✓ Share pill, drops the "· Called 2:14 pm"
   suffix from the role line, and gains a crimson postmark (double ring,
   the `ReceiptStamp` grain filter, −12°) reading CALLED or WROTE with the
   day above and the time below ("NOV 9" / "2:14 PM"). The card's top
   padding does not change. Placement P1 (owner, 2026-11-09): 64 px on
   the top-right corner, hanging 8 px over the edge, the header text
   keeping 56 px clear on the right, the ✓ Share pill and the answer chip
   on one line under the role line.
2. When the receipt row carries an outcome, one chip reads the answer:
   `Said: with us · Said: undecided · Said: opposed · No answer`; none
   after Skip, Sent it or Form didn't work.
3. The postmark has the accessible name "Called <name>, <day> <time>" /
   "Wrote to <name>, …" (`role="img"`); the pill keeps its label. It
   clears with the receipt row after 24 h, as the mute does today.
4. The act page's done state is untouched; the postmark is a results-page
   rendering of `Target` `done`.

### 4. Owner device test
1. Owner runs the §1–3 flow on iPhone Safari and Android Chrome against
   production after merge: tap call → modal opens → each answer path (no
   answer, with us, skip, second answer) → postmark on the
   card → reload keeps it; tap write → S4 path including "Form didn't
   work" → crimson ring on the call square. One screenshot per path.

## Data & contracts
- `POST /api/report` unchanged (`worker/src/index.ts` `OUTCOMES`: `will_support ·
  undecided · opposed · no_answer · other`); the sheet posts `{goal,
  target, outcome, device}` with no `note`.
- `cut-ties:receipts` rows (`LoggedReceipt`, `web/src/lib/commitments.ts`)
  gain `outcome?: 'will_support' | 'undecided' | 'opposed' | 'no_answer' |
  'skip' | 'sent' | 'form_failed'` (the last three are client-only, never
  posted). `logReceipt` writes it; `receiptsByTarget` returns it.
- `Target` `done` becomes `{channel, at, outcome?}`; `ReceiptModal`
  gains an `outcome` prop and `onOutcome(outcome)`; the postmark is
  `web/src/components/Postmark.tsx`.
- No schema, seed or endpoint change; no new settings key.

## Spec delta
- MODIFIED `docs/specs/results-pages.md` §Purpose: "a receipt modal with
  the stamp, the count echo, the share block and the next office" → "a
  receipt modal with the stamp, the count echo, one ask about the
  office's answer, the share card and the next office".
- MODIFIED `docs/specs/results-pages.md` §4: "Nothing asks whether the
  office answered." → the ask of §1.2–1.3 and §2.1–2.3 above, with the
  `POST /api/report` mapping.
- MODIFIED `docs/specs/results-pages.md` §5: the modal's order gains the
  ask between the echo and the share block (or as Open question 1
  decides); the rest unchanged.
- MODIFIED `docs/specs/results-pages.md` §7: "its role line gains
  '· Called 2:14 pm' / '· Wrote 2:14 pm'" → the CALLED / WROTE postmark
  and the answer chip of §3.
- MODIFIED `docs/specs/results-pages.md` §Data & contracts: `LoggedReceipt`
  gains `outcome?`; `Target` `done` gains `outcome?`.
- MODIFIED `docs/specs/results-pages.md` §Invariants: add "The ask has a
  Skip and gates nothing; the stamp, count, share card and Next are on
  screen when the modal opens; Next follows the share card" and "A report
  never changes a count".
- MODIFIED `docs/specs/results-pages.md` §Performance budget: the lazy
  chunk may grow by ≤2 KB gzip for the question row and `Postmark`.

## Acceptance criteria
- [ ] Tap a call square on `/results/<goal>` at 375 px: today's modal
      opens with the stamp, count echo, the ask, the share card (thumbnail
      and buttons), the filled Next after it, "Not now" and the reminder,
      all without a further tap.
- [ ] `No answer` → one `POST /api/report` with `outcome: 'no_answer'`,
      the segment fills, "Saved" appears; `With us` → one post with
      `will_support`; then `Opposed` → a second post with `opposed`.
- [ ] `Skip` → no post, no "Saved"; the rest of the modal is unchanged.
- [ ] A failed report shows "Could not save that. Try again." and the
      segments remain tappable; the rest of the modal is unchanged.
- [ ] Write square: "Did it go through?"; `Form didn't work` posts
      nothing, the filled control reads "Call <Surname> instead →" and
      rings that call square; the receipt row stands.
- [ ] After closing, the done card shows the CALLED / WROTE postmark with
      day and time, no role-line suffix, the same top padding as before,
      the ✓ Share pill and the answer chip when one was chosen; a reload
      keeps all of it; after 24 h the squares return.
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
  - [ ] 3. Done-card postmark
  - [ ] 4. Owner device test
- Completed: none
- Folded: none
- Branch / open PRs: `docs/receipt-sheet-prd` (this PRD)
- Files changed (file:line map): —
- Tests run + result: —
- Remaining: §1–4
- Decisions since last update: owner 2026-11-09: one ask on today's
  receipt card (no two-step flow, no gating, no bottom-sheet redesign),
  Next after the share card; postmark P1; proposals of Open questions
  1–3 are the decisions.
- Known failures / blockers: none
- Next action: merge the PRD PR, then `/implement-prd-section
  docs/prd/receipt-sheet-and-done-stamps.md` (§1)

## Open questions
1. Where does the ask sit on the receipt card
   (`design/mockups/receipt-sheet-v3.html`)? Proposal: S9, one segmented
   line under the count echo (no heading, ~60 px). S7 (question and chip
   row above the stamp) reads first but pushes the stamp down; S8 (hazard
   strip, 2×2 grid) is the loudest and tallest.
2. Should "Form didn't work" become a D1 outcome? Proposal: no; it is
   client-only until the digest shows it is chosen often enough to count.
3. Should a second answer after "Change" post again? Proposal: yes, as
   the act page does; `reports` keeps every row and the digest reads the
   latest per device and target.

## Changes
- 2026-11-09 — created (READY, auto): reverses the 2026-11-09 "no outcome
  question" decision of `share-from-results.md` at the owner's request;
  mock-ups S1–S4 and V1–V4 in `design/mockups/receipt-sheet.html`.
- 2026-11-09 — owner review: the two-step sheet (S1→S3) is replaced by one
  question row with today's receipt beneath it (S5–S6); the stamp is the
  postmark, shrunk so the card gains no top padding (P1–P3).
- 2026-11-09 — owner review 2: keep the existing receipt card and share
  card as shipped (no bottom sheet); add one data point and keep Next
  after the share card (S7–S9 in `receipt-sheet-v3.html`); postmark P1
  decided.
