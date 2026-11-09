# Share from results — PRD
Status: IN PROGRESS 2026-11-09 (§1–3 built, §4 owner device test) · Owner: George Nguyen · Last updated: 2026-11-09

## Problem
The share poster and share row exist only at the end of the script flow
(`/goals/<slug>/act/<action>`, `social-sharing.md` §3). On `/results` each
office card carries a plain `tel:` square (`target-cards.md` §1) that most
visitors use directly: the tap leaves no receipt, feeds no count and never
reaches a share. The owner wants social sharing to be the main feature
after a call or an email from the results page, and the results page itself
to read like `/goals`: one summary card per action with its countdown
stamp, opening a page for that action alone. Mock-ups A–D were reviewed on
2026-11-09; D without its outcome sheet is the chosen direction.

## Goals / Non-goals
- Goals: (1) every call or write from the results flow leaves a receipt
  and reaches the share row; (2) `/results` becomes two summary cards with
  stamps, each opening `/results/<goal>` showing that action alone; (3) the
  receipt and share appear as a modal over the darkened page, never as
  text appended to the card; (4) an email gets the same flow as a call,
  with the "I wrote" poster; (5) a chain of offices counts one receipt per
  office.
- Non-goals: no outcome question before the share (the tap is the
  receipt, owner decision 2026-11-09); no change to the act page's own
  receipt screen; no new poster or share control (the row is
  `social-sharing.md` §3–5 as shipped); the goal detail page's call
  squares stay as they are (`## Next` idea); no account, no server-side
  share card; no share before a receipt, as everywhere else on the site.

## Research (what the best products do → adopt / adapt / reject)
Relies on: [post-contact-share-prompt](../research/post-contact-share-prompt.md),
[social-sharing](../research/social-sharing.md).
| Pattern | Seen in | Verdict | Why |
|---|---|---|---|
| Outcome buttons per office before anything else | 5 Calls | Reject | Adds a step before the share; the question-behaviour effect is small and the answer would change no number we show |
| Receipt → next office → share, share never first | 5 Calls, Kristofferson 2014 | Adopt | Private hard act first; the modal's one filled button is the next office |
| "Peers acted" line over a self badge | Bond 2012 | Adopt | The modal's count line, from `GET /api/counts`, sits above the poster |
| Receipt as an image into the OS sheet, dark social first | Resistbot, Mobilize, Strava | Adopt | Already the poster + `navigator.share` row; reused unchanged |
| Share first on the thank-you page, bare links | Change.org, Action Network | Reject | Bare links get no reach on X; share-first lowers follow-through |
| Share reveals that you acted, not what you said | Countable | Adopt | Poster carries no name, city, number or office response (unchanged) |
| Summary card per item, detail on tap | `/goals` (own site) | Adopt | Owner pick: the results page should resemble All goals |
| Full-screen `/done` page | 5 Calls | Adapt | A modal over the darkened one-action page instead of a route, so the office list is one tap away |

## Users
A returning visitor with a stored district who taps a number straight from
the results page (the majority path, phone, one hand). A visitor who
cannot call and taps the write square. A desktop visitor whose `tel:` does
nothing: the modal still opens, and the share row shows the intent links.
Copy stays plain English; nothing asks for a name.

## Expected behavior

### 1. Summary cards on `/results`
1. Header, delegation line and the page's `lg` stamp are unchanged
   (`action-router.md` §5, `countdown-stamp.md` §3). The two slots become
   two summary cards in the `/goals` card anatomy (`goal-pages.md` §1):
   the goal's 16:9 photo band with the category chip and an "Action 1" /
   "Action 2" chip over it and the title at its foot, the card's own
   countdown stamp at the top-right (or the past decision date), then a
   body with one meta line (bordered Space Mono chips: "Call or write",
   "<n> offices", the decision label such as "NDAA §219 / §224" from the
   action's `short_label` when present), one line of the offices (up to
   three 30 px portraits overlapping, then "Casten · Duckworth · Durbin"
   by surname), and a CTA "Open this action →" linking `/results/<goal>`.
   The whole card is the link; the first card's CTA is filled, the second
   bordered. No phone number, ask text, counts line or target cards on
   this page.
2. A split leadership card (`action-router.md` §5 `also`) is one summary
   card for the card goal: its photo and stamp, meta chip "House + Senate",
   the offices of both blocks, one link. "Race not called" seats add
   nothing here.
3. The first band loads eagerly and is the LCP element; the second lazily
   (`site-imagery.md` Behavior 10). Zero eligible goals, "Change address"
   and the `/goals` link behave as today.

### 2. One-action page `/results/<goal>`
1. One static page per published goal (`web/src/pages/results/[goal].astro`,
   `getStaticPaths` over goals) hosting the results island in single mode.
   Ticker line "← Your two actions" (link to `/results`) and "Action n of
   2"; H1 the goal title; then the result card exactly as `action-router.md`
   §5 describes a card today: band and stamp, the ask, "Get my script →",
   the target stack with the `Counts` line, House and Senate blocks for a
   split card. Below the card, a mini card "Your other action · <stamp>"
   with the other goal's title and photo, linking `/results/<other goal>`;
   with one eligible goal it is omitted.
2. The route comes from the cached route (`sessionStorage`, `cut-ties:route`)
   or a fresh `POST /api/route` with the stored place, as `/results` does.
   No stored place → redirect to `/`. A goal that is not one of this
   visitor's two actions shows "This isn't one of your two actions this
   week." with links to `/results` and `/goals/<slug>`.
3. Every target card gains a write square beside the call square when the
   target has a `contact_form_url`: 44 px, paper fill, 2 px ink border,
   envelope glyph, `aria-label="Write to <name>"`, `title` by
   `contact_kind` as the act page's contact link is labelled
   (`personalised-documents.md` §4 email step), `href=contact_form_url`,
   new tab, `rel="noopener noreferrer"`. The call square is unchanged in
   look. A member-elect's hazard Contact square counts as the write square.
   Order left to right: write, call.

### 3. Receipt modal after a call or a write
1. **Tap = receipt.** On `/results/<goal>` a tap on a call or write square
   lets the link proceed (dialer, or the contact form in a new tab) and in
   the same handler: posts `POST /api/receipt {goal, action, target, state,
   district, device, channel: 'call' | 'email'}` with `keepalive: true`
   (the fetch survives the switch to the dialer), and opens the receipt
   modal at once, so it is on screen when the visitor comes back. A 2xx or
   a 429 `limit_repeat` writes the `cut-ties:receipts` row (already counted
   is still done); `limit_day`, `limit_ip` and a network failure write no
   row and the modal shows the server's message (or "Couldn't count this
   one. Your call still counts with the office.") in place of the count
   line. Nothing asks whether the office answered.
2. **The modal** is a `<dialog>` opened with `showModal()`: backdrop ink at
   72 %, paper panel with 2 px ink border and the 6 px shadow, 16 px side
   gutters at 390 px, max 440 px wide, scrollable inside when taller than
   the viewport, ✕ at the top-right, Esc and a backdrop tap close it, focus
   returns to the element described in 3.4. Top to bottom:
   - the stamp "I called" (call) or "I wrote" (email): crimson block,
     newsprint Bebas Neue, turned −2°, as on the act page's receipt;
   - the `Counts` island in `echo` mode ("You're one of <N> constituents
     in <STATE-NN> who called this week", state line, or nothing;
     `district-counters.md` §6), with the channel's verb;
   - the share block of `social-sharing.md` §3–5 unchanged (thumbnail,
     Share / Copy link / Message, Save poster fallback, intent links from
     1024 px), the poster drawn with the office, the act and today's date
     (§2); the hint line under it;
   - one filled button: "Next: call <Role Name> →" for the first target
     of this goal with no receipt from this device in 24 h
     (`commitment-funnel.md` §7 rule); it closes the modal and scrolls that
     target's card into view with its call square ringed in crimson until
     tapped. When every target has a receipt the button reads "Your other
     action →" and links `/results/<other goal>` ("See all goals →" to
     `/goals` with one eligible goal);
   - two text links: "Not now" (closes) and "No answer? Remind me
     tomorrow" (call only; stores the `retry` commitment of
     `commitment-funnel.md` §6 and closes; the receipt stays counted).
   No share control is filled; the one filled control is the next office.
3. **Chunks.** The share chunk (`ShareRow.tsx` + `poster.ts`) and the
   modal load on the first tap, never on page load; the poster is drawn
   while the dialer is open.
4. **After closing.** The tapped target's card turns newsprint-muted, its
   role line gains "· Called 2:14 pm" / "· Wrote 2:14 pm", and both
   squares give way to one bordered pill "✓ Share" that reopens the modal
   (no new POST). The state comes from `cut-ties:receipts` (24 h), so a
   reload keeps it; the pill is where focus returns. A second office's
   tap posts its own receipt and opens the modal again with the new
   count; its pill is its own.
5. **Repeat limit per office.** `limit_repeat` keys on device, goal,
   action, channel **and target** (today it omits the target, so the
   second office in a chain within 10 minutes is refused and not stored).
   A call then an email to one office still both count.

### 4. Owner device test
iPhone Safari and Android Chrome on the preview URL: tap a number from
`/results/<goal>`, return, confirm the modal is there with the poster;
Share lands in Instagram Story; "Next" scrolls to the next office; the pill
survives a reload; write square → contact form in a new tab → modal with
"I wrote". Desktop Chrome: tap with no phone handler, modal opens with
intent links. Measured budgets quoted in State.

## Data & contracts
- Routes: `/results/<goal>` (static, one per published goal). `/results`
  unchanged as a URL.
- `POST /api/receipt`: body unchanged; `limit_repeat` key gains
  `target_id` (`worker/src/repo.ts` `receiptLimitCounts`, the `repeat`
  SUM; captain-list rows unchanged).
- Client state: `cut-ties:receipts` rows now also written from the results
  page (same shape, 24 h prune); `cut-ties:commitments` `retry` rows from
  the modal's reminder link. Nothing new is sent.
- `GET /api/counts` in `echo` mode from the modal: unchanged contract.
- Props: the results island receives per target `contact_form_url`,
  `contact_kind`, and per card `action` (slug) and the action's `short_label`
  from `/api/route`, which today returns `action_href` only: `route` adds
  `action` (slug) and `short_label` (nullable) per goal card.
- Target component: `Target` takes an optional `onContact(target, channel)`
  handler and a `done?: {channel, at}` prop; with no handler and no `done`
  it renders as today (goal page unchanged).

## Spec delta
- ADDED `docs/specs/results-pages.md`: the whole spec (Purpose: summary
  cards on `/results`, the one-action page, the receipt modal; Behavior
  §1–3 above; Data & contracts; budget). Invariants: no share control
  renders before the tap that posts the receipt; the summary cards carry
  no `tel:`; the share chunk is absent from `/results/<goal>`'s initial
  requests; the modal has one filled control; the poster for
  `channel: 'email'` reads "I WROTE"; a reload after a receipt shows the
  pill, not the squares.
- MODIFIED `docs/specs/action-router.md` §Behavior 5: the card anatomy
  text (two slots … `Counts` island) → "two summary cards, each opening
  `/results/<goal>` where the full card renders; see `results-pages.md`";
  the delegation line, split leadership rules, member-elect, zero-goal,
  columns and "Change address" sentences stay.
- MODIFIED `docs/specs/target-cards.md` §Behavior 1: after the call
  square sentence add the write square (§2.3) and the `onContact` / `done`
  props (§3.4 muted card, role-line suffix, "✓ Share" pill).
- MODIFIED `docs/specs/countdown-stamp.md` §Behavior 3: "Each card wears
  its own soonest upcoming target's stamp" → also on the summary cards and
  on `/results/<goal>`'s card and its "Your other action" mini card.
- MODIFIED `docs/specs/social-sharing.md` §Behavior 3: "on the receipt
  screen, after the count line" → "on the act page's receipt screen and in
  the results receipt modal (`results-pages.md` §3), after the count line".
- MODIFIED `docs/specs/commitment-funnel.md` §Behavior 7: the "Next:"
  rule also drives the modal's one filled button, which scrolls in-page
  instead of linking the act page.
- MODIFIED `docs/specs/district-counters.md` §Behavior 8: "a second
  receipt for the same device, goal, action and channel" → "… device,
  goal, action, channel and target".

## Acceptance criteria
- [ ] `/results` shows two summary cards with stamps, photo bands, meta
      chips, office portraits and "Open this action →"; no phone number
      on the page; the first band is the LCP element.
- [ ] `/results/<goal>` shows the full card for that goal alone, the
      "Your other action" mini card, and every target with a write square
      (when `contact_form_url` exists) left of the call square.
- [ ] Tapping a call square on iPhone opens the dialer; on return the
      modal is open with "I called", the echo line, the poster thumbnail
      and the share row; `POST /api/receipt` was sent with `channel:
      'call'` and the target id.
- [ ] Tapping a write square opens the contact form in a new tab and the
      modal with "I wrote"; the poster reads "I WROTE"; the receipt has
      `channel: 'email'`.
- [ ] Share hands the poster file to the OS sheet when `canShare({files})`
      is true; otherwise "Save poster" and the intent links appear.
- [ ] "Next: call <name> →" closes the modal and scrolls that card into
      view with its call square ringed; after the last office the button
      reads "Your other action →".
- [ ] After closing, the office card is muted with "· Called <time>" and a
      "✓ Share" pill that reopens the modal without a new POST; a reload
      keeps it; after 24 h the squares return.
- [ ] Two offices tapped within 10 minutes both return 201 and both rows
      exist; a second tap on the same office within 10 minutes returns
      `limit_repeat` and the card still shows the pill.
- [ ] `limit_day` shows the server message in the modal, no local row, the
      squares stay.
- [ ] `<dialog>`: focus moves into the modal on open, Esc and backdrop
      close it, focus returns to the pill; axe reports no violation.
- [ ] Desktop Chrome with no `tel:` handler: the modal opens on the tap.
- [ ] Budgets: `/results` and `/results/<goal>` ≤100 KB transferred
      before any tap; LCP ≤1.5 s on a mid-range phone over 4G; the share
      chunk ≤4 KB gzip, requested only after the tap; `/api/route` ≤2 s
      p95; $0/month infra.
- [ ] Worker tests cover the per-target repeat key; web tests cover the
      summary card, the one-action page, the tap handler (keepalive post,
      modal open, 2xx / `limit_repeat` / `limit_day` paths), the pill and
      the "I wrote" poster.

## Rollout & metrics
No flag: the pages replace `/results` on merge. Measure in the weekly
digest (`maintainer-tooling.md` §3): receipts per day split by `channel`
and `via: share` routes, the week before against the week after; the
owner device test (§4) closes the PRD.

## State (updated 2026-11-09, PR #89)
- Sections: (build order; `[ ]` todo · `[~]` in progress · `[x]` merged · `[!]` blocked: reason)
  - [~] 1. Summary cards on `/results` · feat/share-from-results · PR #89
  - [~] 2. One-action page `/results/<goal>` · feat/share-from-results · PR #89
  - [~] 3. Receipt modal after a call or a write · feat/share-from-results · PR #89
  - [ ] 4. Owner device test
- Completed: §1–3 built and tested (one branch, one PR, owner asked for end to end)
- Folded: §1, §2, §3 (`docs/specs/results-pages.md` added; action-router §5,
  target-cards §1/§3, countdown-stamp §3, social-sharing §3,
  commitment-funnel §7, district-counters §8, specs README index)
- Branch / open PRs: `feat/share-from-results` · PR #89
- Files changed (file:line map): `web/src/pages/results/index.astro` (moved),
  `web/src/pages/results/[goal].astro`; `web/src/components/SummaryCard.tsx`,
  `ReceiptModal.tsx`, `ReceiptStamp.tsx`, `Results.tsx` (single-goal mode,
  `open()` lazy-imports the modal, `onContact` POST keepalive), `Target.tsx`
  (write square, `done`/`ring`/`onContact`/`onShare`, `TargetStack done/next`);
  `web/src/lib/store.ts` `peekRoute`, `commitments.ts` `ReceiptChannel`
  `receiptsByTarget`, `contact.ts` `CONTACT_LABEL`/`CONTACT_ACTION`;
  `worker/src/route.ts` GoalCard `action`/`short_label`/`what_we_want`,
  TargetCard `contact_form_url`/`contact_kind`; `worker/src/repo.ts` repeat SUM
  keyed on `target_id`; `schema.sql`/`migrate.ts`/`load.ts` `actions.short_label`;
  `data/actions/*.yaml` `short_label`
- Tests run + result: `quiet-check test-web` PASS (SummaryCard.test.tsx 9,
  results-page.test.tsx 7 new), `tsc` PASS, `test` PASS (counts.test.ts
  per-target repeat), `build` PASS, `prd-lint` PASS, `doc-lint` PASS.
  Budgets (gzip, build 2026-11-09): `/results` 4.1 KB HTML + 6.6 KB CSS +
  24.0 KB island JS + 26 KB first band ≈ 61 KB ≤ 100 KB; ShareRow chunk
  3.99 KB ≤ 4 KB, loaded only on the tap (dynamic import confirmed).
- Remaining: §4 (owner device test on the Pages preview)
- Decisions since last update: modal stamp reuses the act page's
  `ReceiptStamp` (paper/crimson dashed, −4°) rather than a new crimson
  block; `what_we_want` added to GoalCard; `short_label` is a new
  `actions` column; `LoggedReceipt.channel` optional (missing = call);
  `CONTACT_LABEL` (square title) split from `CONTACT_ACTION` (act page);
  tests stub `ShareRow` and block happy-dom navigation on external links.
- Known failures / blockers: none
- Next action: §4 device test on the preview below, then merge PR #89, then `/implement-prd-section docs/prd/share-from-results.md` (next: none);
  `https://feat-share-from-results.cut-ties.pages.dev`
## Open questions
1. Should the goal detail page's call squares get the same tap-receipt and
   modal? Proposal: not in this PRD; row in `## Next` (`results-pages`
   stem) once §3 has shipped and the owner has used it.
2. The write square opens the contact form with nothing to paste; should
   it open the act page's "Send it in writing" card instead? Proposal:
   contact form, as the owner asked for the same flow as a call; the
   message is one tap away under "Get my script →". Revisit if the digest
   shows email receipts without `via` traffic.
3. A receipt on the tap counts a call that may not have connected.
   Proposal: accepted by the owner on 2026-11-09; the "No answer? Remind
   me tomorrow" link keeps the retry path and the count line already
   says "who called this week", not "who reached an office".

## Changes
- 2026-11-09 — created from mock-up D minus the outcome sheet (READY, auto).
- 2026-11-09 — §1–3 built on `feat/share-from-results` (PR #89, owner asked for end to end): summary cards, `/results/<goal>`, write square, tap-is-receipt modal; `limit_repeat` keyed on target; spec delta folded (`results-pages.md` added). Stamp reuses `ReceiptStamp`. IN PROGRESS; §4 next.
