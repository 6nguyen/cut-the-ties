# Results pages

## Purpose
`/results` shows the visitor's two actions as summary cards; each opens
`/results/<goal>`, a one-action page where the full result card renders and
where a tap on a call or write square is itself the receipt: the dialer (or
the office's contact form) opens, `POST /api/receipt` is sent, and a receipt
modal with the stamp, the count echo, one ask about the office's answer, the
share card and the next office is on screen when the visitor comes back. The goal detail page's squares are
unchanged (no tap receipt there). Shipped from
`docs/prd/share-from-results.md` (§1–3) and
`docs/prd/receipt-sheet-and-done-stamps.md` (§1–3, the ask and the
postmarks); the owner device tests (§4 of each) are open.

## Behavior
1. **Summary cards (`/results`).** Header, delegation line and the page's
   `lg` stamp are unchanged (`action-router.md` §5, `countdown-stamp.md`
   §3). The two slots are `web/src/components/SummaryCard.tsx`, in the
   `/goals` card anatomy: the goal's 16:9 photo band with the category chip
   and an "Action 1" / "Action 2" chip over it, the title at its foot, the
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
   summary card: its photo and stamp, the offices of both blocks House
   first, one link. The first band loads `eager` with `fetchpriority="high"`
   (the LCP element), the second lazily. Zero eligible goals, "Change
   address" and the `/goals` link behave as before.
2. **One-action page (`/results/<goal>`).** One static page per published
   goal (`web/src/pages/results/[goal].astro`, `getStaticPaths` over
   `publishedGoals()`) mounting the `Results` island with `goal=<slug>`.
   Ticker "← Your two actions" (link to `/results`) · "Action n of N"; H1
   the goal title; the result card as `action-router.md` §5 describes it
   (band and stamp, ask, "Get my script →", target stack with the `Counts`
   line, House and Senate blocks on a split card); below it the mini card
   "Your other action" (`data-other-action`, the other goal's title, photo
   and stamp, linking `/results/<other>`), omitted with one eligible goal.
   The route comes from `sessionStorage` `cut-ties:route` (`store.ts`
   `peekRoute`, which no longer clears the key) or a fresh `POST /api/route`
   with the stored place, cached on arrival; no stored place → `/`. A goal
   that is not one of the visitor's two shows "This isn't one of your two
   actions this week." with links to `/results` and `/goals/<slug>`.
3. **Write square.** Every target with a `contact_form_url` gains a 44 px
   paper square with an envelope glyph left of the call square
   (`data-write-square`, `aria-label="Write to <name>"`, `title` from
   `lib/contact.ts` `CONTACT_LABEL[contact_kind]`, `href=contact_form_url`,
   `rel="noopener noreferrer"`, `target="_blank"` only when the card has an
   `onContact` handler). A member-elect's hazard Contact square counts as
   the write square. The call square is unchanged in look.
4. **Tap = receipt.** On `/results/<goal>` a tap on either square lets the
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
   first target of this goal with no receipt from this device in 24 h
   (`commitment-funnel.md` §7 rule), which closes the modal, rings that
   target's call square in crimson (`data-next`) and scrolls it into view,
   the ring clearing on its tap; when every target has a receipt the filled
   control is a link "Your other action →" to `/results/<other>` ("See all
   goals →" to `/goals` with one eligible goal); then "Not now" and, for a
   call only, "No answer? Remind me tomorrow", which stores the `retry`
   commitment of `commitment-funnel.md` §6 and closes. No share control is
   filled.
6. **Chunks.** `ReceiptModal` (with `ShareRow` and the poster module) is a
   dynamic `import()` on the first tap; the initial requests of
   `/results/<goal>` never include it.
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
   a reload keeps it and the squares return after 24 h. A second office's
   tap posts its own receipt and opens the modal again.
8. **Repeat limit per office.** `limit_repeat` keys on device, goal,
   action, channel and target (`district-counters.md` §8), so two offices
   tapped within 10 minutes both count.

## Data & contracts
- Routes: `/results` (`web/src/pages/results/index.astro`) and
  `/results/<goal>` (`[goal].astro`), both static.
- `POST /api/route` goal cards carry `action` (slug), `short_label`
  (nullable, `data/actions/*.yaml` `short_label`, D1 `actions.short_label`)
  and `what_we_want`; targets carry `contact_form_url` and `contact_kind`
  (`worker/src/route.ts` `GoalCard`, `TargetCard`).
- `POST /api/receipt`: body unchanged; the `repeat` SUM in
  `worker/src/repo.ts` `receiptLimitCounts` also matches `target_id`.
- `cut-ties:receipts` rows (`LoggedReceipt`) gain `channel?: 'call' |
  'email'` (missing = call) and `outcome?: 'will_support' | 'undecided' |
  'opposed' | 'no_answer' | 'skip' | 'sent' | 'form_failed'` (the last
  three client-only, never posted; `setReceiptOutcome` writes it,
  `receiptsByTarget` returns it); `cut-ties:commitments` `retry` rows come
  from the modal's reminder.
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
  `{wrote, name, at, size: 96 | 64, id, class?}`. The act page keeps
  `ReceiptStamp`.

## Invariants (regression checklist)
- [ ] No share control renders on `/results` or `/results/<goal>` before
      the tap that posts the receipt.
- [ ] The summary cards carry no `tel:`, ask text, counts line or target
      card; each is one link to `/results/<goal>`.
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
`/results` and `/results/<goal>` ≤100 KB transferred before any tap (build
2026-11-09: HTML 4.1 KB + CSS 6.6 KB + island JS closure 24.0 KB gzip, plus
the first band ≤26 KB at 768 w); LCP ≤1.5 s on a mid-range phone over 4G;
the share chunk `ShareRow` ≤4 KB gzip (3.99 KB; `ReceiptModal` 2.35 KB
rides with it, grown ≤2 KB from 1.45 KB for the ask and the postmark header;
build 2026-11-09), requested only after the tap; `Postmark` lives in the
`Target` chunk (3.93 KB, from 3.07 KB) since the done card renders it on
load, so no request is added;
`/api/route` ≤2 s p95; $0/month infra.
