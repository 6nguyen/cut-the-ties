# Results pages

## Purpose
`/results` shows the visitor's two actions as summary cards; each opens
`/results/<goal>`, a one-action page where the full result card renders and
where a tap on a call or write square is itself the receipt: the dialer (or
the office's contact form) opens, `POST /api/receipt` is sent, and a receipt
modal with the stamp, the count echo, one ask about the office's answer, the
share card and the next office is on screen when the visitor comes back. The same flow runs on every phone
and email control on the site (`tap-receipts-everywhere`): the goal page's
stack, the member page, the whip table; the act page posts its own receipt
card on a tap. Shipped from `docs/prd/share-from-results.md` (§1–3; its
§4 device test is open) and
`docs/prd/archive/2026-11-receipt-sheet-and-done-stamps.md`.

## Behavior
1. **Summary cards (`/results`).** Header, delegation line and the page's
   `lg` stamp are unchanged (`action-router.md` §5, `countdown-stamp.md`
   §3). The cards are `web/src/components/SummaryCard.tsx`, in the
   `/goals` card anatomy: the route's open goals (not done, below) give
   the first two as "Action 1" / "Action 2", then every done goal follows,
   newest first (`Results.tsx` `splitGoals`). An open card: the goal's
   16:9 photo band with the category chip and the "Action n" chip over it, the title at its foot, the
   card's own countdown stamp at the top-right (or "Decision: <date>" for a
   past date), then a body with one meta line of bordered Space Mono chips
   ("Call or write" when any office has a contact form or is a member-elect,
   else "Call"; "<n> office(s)"; "House + Senate" on a split card; the
   action's `short_label` when present), one offices line (up to three 30 px
   portraits overlapping, then surnames "Correa · Padilla · Schiff" by
   `names.ts` `surname`), and the CTA "Open this action →". The whole card is
   one `<a href="/results/<goal>">` (`data-summary-card`); the first card's
   CTA is filled, the second bordered. No phone number, ask text, counts line
   or target card renders here. A split leadership card (`also`) is one
   summary card: its photo and stamp, the `pair` title, no `short_label`
   chip, one offices line per block House first, each led by its action's
   `short_label` ("Jeffries vote · Correa"; `data-offices=<label>`, a
   block with no targets is left out), one link. A done goal (every office
   of every block has a receipt from this device in 7 days, §7) wears the
   96 px DONE postmark (`kind="done"`, the last receipt's day and time)
   in place of its countdown, hanging over the band's top-right
   (`data-done="goal"`, `data-postmark="done"`), a muted band, a "Done"
   chip, one "All <n> offices" chip in place of the "Call or write" and
   count chips, the offices lines, and a ghost CTA "See your receipts →".
   The page stamp covers the open cards only. With goals but none open
   the cards are followed by "You have done every action open for your
   district this week." (`data-all-done`) and a "See all goals →" link.
   The first band loads `eager` with `fetchpriority="high"` (the LCP
   element), the others lazily. Zero eligible goals, "Change address"
   and the `/goals` link behave as before.
2. **One-action page (`/results/<goal>`).** One static page per published
   goal (`web/src/pages/results/[goal].astro`, `getStaticPaths` over
   `publishedGoals()`) mounting the `Results` island with `goal=<slug>`.
   Ticker "← Your two actions" (link to `/results`) · "Action n of N" over
   the open goals (a third or fourth route slot opens as "Action 3 of 4"),
   or "Done · <day>" for a done goal, whose card wears the DONE postmark
   on its band over the done target cards of §7; H1
   and `document.title` the goal title, or the `pair` title on a split
   card; the result card as `action-router.md` §5 describes it
   (band and stamp, ask, "Get my script →", target stack with the `Counts`
   line); on a split card (`also`) the headline and summary are the House
   goal's `pair` copy (fallback: the card goal's own), then a "House"
   block, then a "Senate" block under a 2 px full-width rule
   (`data-split-rule`); each block opens with its goal's title as an h3
   (`headline-sm`) and the "<Chamber> · Decision: <date>" label, the ask,
   CTA, targets and counter line, and "More on this vote →" to
   `/goals/<slug>` (`data-more`); below it the mini card
   "Your other action" (`data-other-action`, the other goal's title, or
   the `pair` title when the other is a split card, photo and stamp,
   linking `/results/<other>`): the pair's other for Action 1 or 2, the
   next open goal beyond the pair, and, titled "Your next action", the
   first open goal for a done goal; omitted with no other open goal.
   The island finds the card by its slug or its `also` slug
   (`Results.tsx` `cardFor`), so `/results/senate-leader` opens the
   split card.
   The route comes from `sessionStorage` `cut-ties:route` (`store.ts`
   `peekRoute`, which no longer clears the key) or a fresh `POST /api/route`
   with the stored place, cached on arrival; no stored place → `/`. A goal
   outside the route's slots shows "This isn't one of your two actions
   this week." with `/results` and `/goals/<slug>` links.
3. **Write square.** Every target with a `contact_form_url` gains a 44 px
   paper square with an envelope glyph left of the call square
   (`data-write-square`, `aria-label="Write to <name>"`, `title` from
   `lib/contact.ts` `CONTACT_LABEL[contact_kind]`, `href=contact_form_url`,
   `rel="noopener noreferrer"`, `target="_blank"` only when the card has an
   `onContact` handler). A member-elect's hazard Contact square counts as
   the write square. The call square is unchanged in look.
4. **Tap = receipt.** The flow is `web/src/components/receipt-flow.tsx`
   `useReceiptFlow`, which `Results`, `GoalTargets`, `MemberContact` and
   `WhipReceipts` mount. On `/results/<goal>` a tap on either square lets the
   link proceed and, in the same handler, posts `POST /api/receipt {goal,
   action, target, state, district, device, channel: 'call' | 'email'}`
   with `keepalive: true` (state goals send `district: null`) and opens the
   modal at once with no count line. A 2xx or a 429 `limit_repeat` writes
   the `cut-ties:receipts` row with its `channel` and the outcome becomes
   the count echo; `limit_day`, `limit_ip` and a network failure write no
   row and show the server's `message` (or "Couldn't count this one. Your
   call still counts with the office." / "… Your message …") in its place.
   **The ask.** A hazard strip in the modal (§5) asks one question, with no
   gate on anything else in it. Call: "What did the office say?" and a 2×2
   grid of chips "With us · Undecided · Opposed · No answer"
   (`data-ask-chip="will_support|undecided|opposed|no_answer"`); a tap
   fills the chip (ink, acid text, `aria-pressed`), posts `POST /api/report
   {goal, target, outcome, device}` (no `note`) and on a 2xx shows a
   crimson mono "Saved" beside the question; a second chip posts again and
   the last tap stands. A failed post reads "Could not save that. Try
   again." under the grid and leaves the chips tappable; the rest of the
   modal is unchanged. A small "Skip" link under the grid posts nothing and
   collapses the strip to "Skipped". Write: "Did it go through?" with
   "Sent it · Form didn't work" (`sent` / `form_failed`), no reminder line;
   neither posts; "Form didn't work" swaps Next for a filled "Call <Role
   Surname> instead →" (`data-call-instead`) when the office has a phone,
   which closes the modal and rings the call square on the done card, whose
   tap is a call receipt of its own. The answer goes on the device's receipt
   row (`outcome`); a receipt that was not counted keeps none, though the
   report still posts. A report never changes a count.
5. **The modal** (`web/src/components/ReceiptModal.tsx`) is a `<dialog>`
   opened with `showModal()`: backdrop ink at 70 %, paper panel with a 2 px
   ink border and the large shadow, 16 px side gutters, max 440 px wide,
   scrollable inside, ✕ at the top-right; Esc, ✕ and a backdrop tap close it.
   Top to bottom: the header, a 96 px circular crimson postmark
   (`web/src/components/Postmark.tsx`, "CALLED" / "WROTE" between the day
   and the local time, double ring, −12°, the act stamp's grain; `role="img"`
   named "Called <name>, <day> <time>" / "Wrote to <name>, …",
   `data-postmark="called|wrote"`) with three cancellation lines and a mono
   "<Role Surname> · <seat>" (`data-receipt-who`) beside it; the `Counts`
   island in `echo` mode (or the message of §4); the hazard strip of §4
   (`data-ask="call|write"`); the share block of
   `social-sharing.md` §3–5 unchanged, the poster drawn from
   `receiptSpec(channel === 'email' ? 'letter' : 'call', …)` while the
   dialer is open; one filled button "Next: call <Role Name> →" for the
   goal's first target with no receipt from this device in 24 h
   (`commitment-funnel.md` §7), which closes the modal, rings that
   target's call square in crimson (`data-next`) and scrolls it into view,
   the ring clearing on its tap; when every target has a receipt the filled
   control is a link "Your next action →" to the first open goal
   ("Your other action →" while this goal is open, "See all goals →"
   with none); then "Not now" and, for a call only, "No answer? Remind me
   tomorrow" (the `retry` commitment of `commitment-funnel.md` §6). No
   share control is filled.
6. **Chunks.** `ReceiptModal` (with `ShareRow` and the poster module) is a
   dynamic `import()` on the first tap, absent from the initial requests.
7. **After closing.** The tapped target's card is newsprint-muted
   (`data-done="call|email"`) and wears the 64 px `Postmark` on its top-right
   corner, hanging 8 px over the border (`data-postmark-size="64"`); the
   header text keeps 56 px clear of it and the role line carries no suffix.
   Both squares give way to one row under the record line: the bordered
   "✓ Share" pill (`data-share-pill`), which reopens the modal with the
   counted outcome, the saved answer (chip filled, or "Skipped") and no new
   POST, and an answer chip (`data-answer-chip`) "Said: with us · Said:
   undecided · Said: opposed · No answer" when one of the four was given
   (none for Skip, "Sent it" or "Form didn't work"); after "Form didn't
   work" the call square stands in that row too, ringed as the Next office.
   Focus returns to the pill on close. The state is
   `commitments.ts` `receiptsByTarget` over `cut-ties:receipts` (24 h), so
   a reload keeps it and the squares return after 24 h. A goal whose every
   office has a receipt in 7 days is done (`goalDone`, §1–2): done is
   computed in the browser from the rows, never sent, and the goal reopens
   at its rank on day 8. A second office's
   tap posts its own receipt and opens the modal again.
8. **Repeat limit per office.** `limit_repeat` keys on device, goal,
   action, channel and target (`district-counters.md` §8): two offices
   within 10 minutes both count.

## Data & contracts
- Routes: `/results` (`web/src/pages/results/index.astro`) and
  `/results/<goal>` (`[goal].astro`), static.
- `receipt-flow.tsx`: `useReceiptFlow({goal: ReceiptGoal | null, state,
  district, other: {href, label}}) → {done, next, handlers(block), modal}`.
  `ReceiptGoal` is the `GoalCard` slice the flow reads (`slug`, `title`,
  `what_we_want`, `category`, `action`, `targets`, optional `chamber` and
  `also`); `action: null` → no handlers, plain links. `state` '' means no
  stored place: the receipt takes the tapped office's own seat.
- `POST /api/route` goal cards carry `action` (slug), `short_label`
  (nullable, from `data/actions/*.yaml`) and `what_we_want`; targets carry
  `contact_form_url` and `contact_kind` (`worker/src/route.ts`).
- `data/goals/<slug>.yaml` optional `pair: {title ≤40, summary ≤400}`,
  allowed only on a `leadership` goal whose actions all target the House
  (`worker/src/load.ts` `checkPair`; no D1 column). The build reads it
  with `web/src/lib/goals.ts` `leadershipPair()`, both results pages pass
  it to the island as `pair`, and `Results.tsx` `cardCopy(g, pair)` uses
  it only for a card with `also`.
- `POST /api/receipt`: body unchanged; `receiptLimitCounts`' `repeat`
  SUM (`worker/src/repo.ts`) also matches `target_id`.
- `cut-ties:receipts` rows are kept 7 days (`KEEP_MS`); `receiptsByTarget`
  reads 24 h (`DAY_MS`), `goalDone(goal, action, targetIds, now)` 7 days;
  `Results.tsx` `goalDoneAt(g)`, `splitGoals(goals) → {open, done}`;
  `SummaryCard` and `Card` take `done: {at} | null`. Route `goals` holds
  up to four cards (`action-router.md`), the first two as before.
- `cut-ties:receipts` rows (`LoggedReceipt`) gain `channel?: 'call' |
  'email'` (missing = call) and `outcome?: 'will_support' | 'undecided' |
  'opposed' | 'no_answer' | 'skip' | 'sent' | 'form_failed'` (the last
  three client-only, never posted; `setReceiptOutcome` writes it,
  `receiptsByTarget` returns it); the modal's reminder writes the
  `cut-ties:commitments` `retry` row.
- `POST /api/report` unchanged (`worker/src/index.ts` `OUTCOMES`); the modal
  posts the four office answers only, with the device id and no `note`. `cut-ties:route` is read without being cleared.
- `Target` props: `done?: {channel, at, outcome?}`, `ring?: boolean`,
  `onContact?(target, channel)`, `onShare?(target)`; `TargetStack` takes
  `done` (map by target id), `next` and the handlers. Without them the goal
  page renders as before.
- `lib/contact.ts`: `CONTACT_LABEL` (square title) and `CONTACT_ACTION`
  (act page link text) by `contact_kind`.
- `ReceiptModal` props gain `at` (the receipt's time for the postmark),
  `answer?` (the row's saved answer on a pill reopen) and `onAnswer(outcome)
  → Promise<boolean>` (false = the report failed); `Postmark` takes
  `{kind?: 'called' | 'wrote' | 'done', name, at, size: 96 | 64 | 32, id,
  class?}`. The act page keeps
  `ReceiptStamp`.

## Invariants (regression checklist)
- [ ] No share control renders on `/results` or `/results/<goal>` before
      the tap that posts the receipt.
- [ ] The summary cards carry no `tel:`, ask text, counts line or target
      card; each is one link to `/results/<goal>`.
- [ ] A done card sits after every open card with the DONE postmark and
      "Done" chip; nothing about done is posted.
- [ ] The modal/share chunk is absent from `/results/<goal>`'s initial
      requests and arrives on the first tap.
- [ ] The modal has exactly one filled control (next office, or the other
      action); the poster for `channel: 'email'` reads "I WROTE".
- [ ] A tap posts once with `keepalive: true`, the target id and the
      channel; `limit_repeat` still shows the pill; `limit_day` shows the
      message, writes no row and keeps the squares.
- [ ] A reload after a receipt shows the pill, not the squares; the pill
      reopens the modal without a POST.
- [ ] Two offices within 10 minutes both return 201.
- [ ] The ask has a Skip and gates nothing; the postmark, count, ask, share
      card and Next are on screen when the modal opens; Next follows the
      share card.
- [ ] A report never changes a count; Skip, "Sent it" and "Form didn't
      work" never post; a chip tap posts exactly one report.

## Performance budget
`/results` (with four goals, the third and fourth bands lazy) and
`/results/<goal>` ≤100 KB transferred before any tap (build 2026-11-09:
HTML 4.1 KB + CSS 6.6 KB + island JS 24.0 KB gzip, plus the first band
≤26 KB at 768 w); LCP ≤1.5 s on a mid-range phone over 4G; the share chunk
`ShareRow` ≤4 KB gzip (3.99 KB; `ReceiptModal` 2.35 KB rides with it),
requested only after the tap; `Postmark` lives in the `Target` chunk
(3.93 KB) since the done card renders it on load, so no request is added;
`/api/route` ≤2 s p95 with four slots; $0/month infra.
