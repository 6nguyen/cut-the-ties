# Tap receipts everywhere — PRD
Status: READY 2026-11-10 (auto) · Owner: George Nguyen · Last updated: 2026-11-10

## Problem
On `/goals/senate-leader/` the "Who to call" squares open the dialer or
the contact form and nothing else happens: no `POST /api/receipt`, no
receipt modal, no share card, no postmark. The owner reported it on
2026-11-10 from production. The cause is a decision, not a bug:
`share-from-results.md` scoped the tap-is-receipt flow to
`/results/<goal>` and `docs/specs/results-pages.md` §Purpose records "The
goal detail page's squares are unchanged (no tap receipt there)".
`web/src/components/GoalTargets.tsx:51` renders `<Target t={t} />` with no
`onContact` / `onShare`, so `Target` falls back to plain links
(`Target.tsx:102-104`). The same is true of every other phone or email
control on the site. The audit of 2026-11-10:

| Surface | Control | Today |
|---|---|---|
| `/results/<goal>` | call square, write square, elect Contact square | receipt + modal (`Results.tsx:211-247`) |
| `/results/<goal>`, `/goals/<slug>` | "District: <city> <phone>" `tel:` link under a card (`Target.tsx:143`) | plain link |
| `/goals/<slug>` "Who to call" | call square, write square, elect Contact square (`GoalTargets.tsx`) | plain links |
| `/goals/<slug>/act/<action>` | "Call <Role Name> · <phone>" buttons, "Open the contact form ↗" / contact-form link (`ActForm.tsx:384,398,409`) | plain links; the receipt waits for the separate "I did it" / "I sent it" button |
| `/m/<id>` hero | "Call DC office", "District office" `tel:` buttons, contact link (`pages/m/[id].astro:47-49`) | plain links, static |
| `/m/<id>` district offices | one `tel:` link per office card (`Offices.astro`) | plain links, static |
| `/goals/<slug>/whip` table | DC phone `tel:` per row (`WhipTable.astro:88`) | plain link, static; the row's "Call" button goes to the act page |

The receipt is the funnel's private hard act (`CLAUDE.md` §Don'ts: the
private act, then the public receipt); a call that leaves no receipt is
invisible to the counts, the share card and the reminder. The owner's
decision of 2026-11-10: every phone and email button on the site kicks
off the receipt and share flow. The owner added the same day, for the
"My 2 goals" page (`/results`): a call or email made toward a goal from
any page counts toward that goal; a goal whose every office is done
wears a DONE stamp like the CALLED / WROTE postmarks on
`/results/house-caucus/`; and a done goal drops to the end of `/results`
with its stamp while the next ranked goal takes its slot. Today
`POST /api/route` returns at most two goals (`ranking.ts` `topTwo`), so
there is nothing to roll in, and `cut-ties:receipts` rows are pruned at
24 h on every read (`commitments.ts:52`), so a goal could stay "done"
for a day at most. The same day the owner added the act page's "Not sure
what to say?" panel: it is one radio group (`ActForm.tsx:335`, one pick
replaces the last), and its points say "my party's leader" and "that
person" where a caller on `/goals/senate-leader/act/senate-leader-call/`
should read "Chuck Schumer" and on `/goals/house-caucus/act/
house-caucus-call/` "Hakeem Jeffries". The vote this serves is whichever goals
the site routes today, the Senate leader goal and the NDAA §219/§1217
integration sections first.

## Goals / Non-goals
- Goals:
  1. One receipt engine. The flow `Results.tsx` owns today (tap → link
     proceeds → `POST /api/receipt` with `keepalive` → `ReceiptModal` with
     the postmark, count echo, ask, share card, Next → done-card postmark,
     24 h `cut-ties:receipts` state) moves into one reusable module that
     every surface mounts; `Results.tsx` becomes its first consumer with
     no behaviour change.
  2. Every `tel:` link and every contact-form or email link on the site
     goes through it: the goal page's stack, the district-office lines,
     the act page's buttons, the member page's hero and office cards, the
     whip table's numbers.
  3. The act page keeps its own one-screen receipt card
     (`personalised-documents.md` §4): a tap there posts the same receipt
     the "I did it" / "I sent it" button posts and renders that card; it
     does not open the results modal.
  4. A receipt counts toward the goal it was posted against, whichever
     page posted it: the `/results` cards, the `/results/<goal>` done
     cards and the `Counts` lines all read the same rows.
  5. A goal whose every office has a receipt from this device in the
     last 7 days is done: a DONE postmark on its summary card and its
     one-action card, the card last on `/results`, and the next ranked
     goal in its slot, so the page always offers two open actions while
     the district has them.
  6. The act page's reasons panel takes any number of picks and names
     the goal's leader in the points, deterministically from `data/`,
     never from a model.
  7. No new endpoint, table, outcome or settings key; every page's
     performance budget holds; the modal chunk stays lazy on every page.
- Non-goals:
  - Changing what the modal, the ask, the share card or the postmark look
    like or say (`receipt-sheet-and-done-stamps.md`, shipped PR #91).
  - A receipt for the whip table's "Call" button or the prep page's
    action buttons: they link to the act page, which takes the receipt.
  - Counting a call made from a number read off the screen without a
    tap: the act page's "I did it" button stays for that case; no other
    page gains one.
  - Share before receipt, anywhere (`CLAUDE.md` §Don'ts).
  - A server-side notion of "done": the Worker never learns which goals
    a device finished; `/results` orders the cards in the browser from
    `cut-ties:receipts`.
  - Changing the ranking, eligibility rules or the state-goal padding
    (`action-router.md` §Data): the route returns more of the same
    ranked list, in the same order.
  - A goal-level receipt limit or a "done" badge on `/goals` cards.
  - Footer, About, Privacy or partner links: none is a phone or email
    control.

## Research (what the best products do → adopt / adapt / reject)
Relies on: `docs/research/post-contact-share-prompt.md`.
| Pattern | Seen in | Verdict | Why |
|---|---|---|---|
| Tapping the number is the log entry; no "I called" step | 5 Calls | adopt | Already the rule on `/results`; this PRD makes it the rule on every page |
| One contact component everywhere a rep appears | 5 Calls, Resistbot | adopt | One engine, one contract, one set of tests; a page passes the goal and gets the flow |
| A page with no campaign context still logs the call | 5 Calls member search | adapt | The member page posts against the member's first open goal (§4); no goal, no receipt, plain link |
| "I did it" button beside the number | this site's act page | keep | Stays for calls dialled from another phone; the tap now posts the same receipt first |
| Completed items sink to the bottom with a check; the list refills from the queue | Todoist, 5 Calls "done" issues | adopt | Done goals last with the DONE postmark; the next ranked goal fills the slot |
| Done state expires with the campaign week | 5 Calls weekly reset | adapt | 7 days from the last receipt, matching "this week" on the page and the counts |

## Users
The visitor who reached a goal page from a share link, a search or the
`/goals` list, entered an address on the landing earlier, and taps a
square in the sidebar: the same modal as on `/results`, no detour. The
visitor on a member page (from the whip table, a search, the "Your
representative" line) who taps the DC number: a receipt against the
member's first open goal, then the share card. The act-page visitor who
taps "Call Rep. Correa · (202) …": the receipt card fills in behind the
dialer, as if "I did it" had been pressed. The visitor back on
`/results` after finishing a goal: the finished one sits last, stamped
DONE, and a new open action sits in its place. Nobody types anything
new.

## Expected behavior

### 1. Receipt engine
1. `web/src/components/receipt-flow.tsx` exports `useReceiptFlow({goal,
   state, district, other})` and everything `Results.tsx:142-262` does
   today moves into it: the `done` map (`doneMap`), the Next ring
   (`next`, `toNext`), the modal state, the lazy `import('./ReceiptModal')`
   on the first tap, the `answers` ref, `handlers(block)` →
   `TargetHandlers`, `answer()`, `closeModal()` (focus to the pill) and the
   `NextStep` (`nextTarget` over the goal's blocks, else the `other` link).
   It returns `{done, next, handlers, modal}` where `modal` is the rendered
   `<ReceiptModal>` (or null) the page places once.
2. `goal` is a `GoalCard` or the subset the flow reads: `slug`, `title`,
   `what_we_want`, `category`, `action` (the slug the receipt posts with),
   `targets`, `chamber?`, `also?`. A page that has no `GoalCard` builds
   one from static data (`ReceiptGoal`, §2.2).
3. `Results.tsx` mounts the hook for the one-action page and its
   behaviour is unchanged: `results-pages.md` §3–8 and every test in
   `results-page.test.tsx` pass as they are.
4. `Target` gains the handler on the district-office line: the `tel:` link
   in "District: <city> <phone>" calls `onContact(t, 'call')` when the
   card has one, so a tap on it is a call receipt for that office (the
   receipt carries no office field; the count is per target). A done
   card keeps the line as a plain link.
5. A receipt that `limit_repeat` answers is done, as today (§4 of
   `results-pages.md`); a tap on a done card's square after "Form didn't
   work" posts its own call receipt, as today.

### 2. Goal page stack
1. `GoalTargets` mounts the hook. `pages/goals/[slug].astro` passes what
   the flow needs from the static goal: `title`, `what_we_want`,
   `category`, `action` (`actionsFor(goal)[0]?.slug`, null when the goal
   lists no action), and the island keeps fetching
   `/api/goals/<slug>/targets` as today; `targets` come from that
   response. The island passes `handlers(goal)` to every `Target` and
   renders `modal` after the stack, so a tap on the call square, the
   write square, an elect's Contact square or the district line on
   `/goals/<slug>` posts `POST /api/receipt {goal, action, target, state,
   district, device, channel}` (`district: null` for a state goal) and
   opens the modal at once, exactly as on `/results/<goal>`.
2. `other` is `{href: '/results', label: 'Your two actions →'}`: when
   every target in the stack has a receipt in 24 h the filled control
   links there (the goal page has no second action to point at).
3. A goal with `action: null` has no handlers: plain links, as today.
   `no_place`, `error` and empty stacks are unchanged.
4. The done state is the same `cut-ties:receipts` row, so a visitor who
   called from `/results/<goal>` sees the postmark on `/goals/<slug>` and
   the other way round; the ✓ Share pill reopens the modal with no new
   POST.
5. The `Counts` line under the stack keeps echoing receipts; a receipt
   from this page is counted like one from `/results`.

### 3. Act page buttons
1. On `/goals/<slug>/act/<action>` a tap on any "Call <Role Name> · <phone>"
   button calls `didIt('call')` in the click handler (the `tel:` link still
   proceeds); a tap on the contact-form link in the writing view or the
   "Open the contact form ↗" link calls `didIt('email')`. The receipt
   card then renders as `personalised-documents.md` §4 describes (stamp,
   count, share row, office response, next office): no results modal here.
2. A tap while a receipt exists or one is in flight posts nothing
   (`counting`, `receipt !== null`); the second office's button after a
   receipt still opens the dialer and still reads as the next office.
3. The "I did it" and "I sent it" buttons stay for the visitor who dials
   from another phone. After a tap posted the receipt they disappear, as
   they do after a press today.
4. The rejected-receipt message under the button, `limit_*` handling and
   the `logReceipt` row are unchanged.

### 4. Member page
1. The hero's "Call DC office", "District office" and contact buttons and
   every district-office card's number (`Offices.astro`) move into one
   island, `web/src/components/MemberContact.tsx`, mounted `client:load`
   with the member's static data (`bioguide_id`, name, role, party,
   state, district, phones, `contact_form_url`, `contact_kind`) and the
   member's first open goal (`goalsFor(m)[0]`: slug, title,
   `what_we_want`, category, first action slug). The markup is the
   markup of `member-pages.md` §3 today, `OpenChip` included; only the
   handlers are new.
2. A tap on any of them posts the receipt against that goal with
   `state` and `district` from the stored place when there is one, else
   the member's own seat (`district: null` for a senator or a state
   goal), and opens the modal with `other = {href: '/results', label:
   'Your two actions →'}` when a place is stored, else `{href: '/goals',
   label: 'See all goals →'}`. Next is never another member (the page has
   one); the filled control is that link.
3. A member with no open goal, or a goal with no action, keeps plain
   links.
4. After the modal closes the buttons stay (there is no card to mute);
   the island shows the 64 px postmark beside the hero title and the
   "✓ Share" pill in the button row for 24 h, from the same receipt row.
   The "Latest constituent report" and "Your representative" lines are
   unchanged.

### 5. Whip table
1. Each DC-phone `tel:` link in `WhipTable.astro` carries the row's
   target as data attributes (`data-receipt-target` with id, name, role,
   party, state, district, phone). One island, `WhipReceipts`, mounted
   once per table with the goal's static data and first action slug,
   delegates clicks on those links and runs the flow: receipt, modal,
   `other = {href: '/results', …}` or `/goals` as §4.2.
2. The row with a receipt in 24 h shows a 32 px postmark after the number
   in place of the link and the "Call" button stays (it leads to the act
   page, which takes its own receipt).
3. Closed goals (`member-pages.md` §11) keep plain links.

### 6. Receipts count from every page
1. A receipt is one `cut-ties:receipts` row and one `receipts` row keyed
   on goal, action, target, device and channel, whichever page posted it
   (§1–5). `doneMap` on `/results/<goal>`, the summary card of §7, the
   goal page's stack and the `Counts` lines read those rows, so a call
   made from `/goals/<slug>`, `/m/<id>`, the whip table or the act page
   shows as a done office on the goal's `/results/<goal>` card and in
   its count, and the other way round.
2. The act page's receipt (`logReceipt` in `ActForm.tsx:224`) writes
   `channel` (`'email'` for "I sent it" or a contact-form tap) so the
   results done card reads WROTE for it; today it writes none, which
   reads as a call.
3. A member-page or whip-table receipt posts against that member's first
   open goal (§4.1); when that goal is one of the visitor's slots the
   office shows done there. A goal the visitor's district is not routed
   to still takes the receipt and the count; it is simply not on
   `/results`.

### 7. Goal done stamp
1. A goal is done on this device when every target of its card (both
   blocks of a split leadership card) has a receipt row from this device
   in the last 7 days; `commitments.ts` gains `goalDone(goal, action,
   targetIds, now) → {at} | null` where `at` is the newest of those
   receipts. The rows are kept 7 days (`DAY_MS` → 7 × `DAY_MS` in the
   prune); `receiptsByTarget` keeps its 24 h window, so the office
   squares return after a day while the goal stays done for the week.
2. On `/results` a done summary card wears the `Postmark` at 96 px with
   the word DONE (`data-postmark="done"`), the day above and the time
   below from `at`, in place of the card's countdown stamp at the band's
   top-right; `role="img"` named "Done: <goal title>, <day> <time>". The
   band is newsprint-muted like a done target card, the "Action n" chip
   reads "Done", the meta line's first chip reads "All <n> offices", the
   offices line is unchanged and the CTA reads "See your receipts →"
   (bordered). The card still links to `/results/<goal>`.
3. On `/results/<goal>` a done goal's card wears the same DONE postmark
   on its band, its target cards are the done cards of
   `results-pages.md` §7 (postmarks, pills, answer chips), and the
   receipt modal's filled control reads "Your next action →" to the
   first open goal of §8 ("See all goals →" when none).
4. The `lg` page stamp on `/results` is the soonest decision across the
   open goals only; with no open goal it is absent.
5. The goal page (`/goals/<slug>`) and `/goals` cards show no goal
   stamp (Non-goals); the stack's done cards are enough there.

### 8. Rollover on `/results`
1. `POST /api/route` returns `goals` as the top **four** ranked slots for
   the district instead of two (`ranking.ts` `topTwo` → `topSlots(goals,
   d, today, 4)`): the first two are exactly today's two (the state-goal
   padding rule included, so a district with one eligible goal still
   gets it plus the state goal), followed by the next ranked eligible
   slots; fewer when the district has fewer. Each is a full `GoalCard`.
   The response stays cached in `sessionStorage` `cut-ties:route`.
2. `/results` splits the cards in the browser: `open` = goals not done
   (§7.1) in route order, `done` = the rest, newest `at` first. The grid
   shows the first two of `open` as "Action 1" and "Action 2" (first
   CTA filled, second bordered, as today), then every done goal with its
   DONE postmark. Two open and one done is three cards; both done and
   two more eligible is four; a district with only two eligible goals
   and both done shows the two stamped cards and the message "You have
   done every action open for your district this week." with the
   `/goals` link.
3. The H1 stays "Your two actions this week"; the delegation line and
   "change address" are unchanged. The page-wide stamp follows §7.4.
4. `/results/<goal>` for a goal in `open`: "Action n of N" counts the
   open goals; "Your other action" is the other open goal in the pair
   (the next in `open` when the goal is beyond the pair). For a done
   goal: "Done · <day>" in the ticker, the §7.3 card, and the mini card
   is "Your next action" for the first open goal. A goal in the route's
   four is never "not one of your two actions"; one outside them still
   gets that message.
5. The first band of the grid keeps `eager` + `fetchpriority="high"`; the
   third and fourth bands load lazily. A done goal falling out of the
   7-day window moves back into `open` at its rank on the next render.

### 9. Reason picks name the leader
1. The "Not sure what to say?" panel (`ActForm.tsx:319-347`) lists its
   points as checkboxes in the rows the radios have today (same border
   and newsprint fill when on, `accent-ink`), so any number can be on.
   The boxed instruction reads: "Pick any that fit. They drop into
   "<why label>", then change them so they sound like you."
2. The "why" field is the caller's own words, then every picked point in
   panel order, joined by a space. Checking adds that point at the end;
   unchecking removes that point's exact text (and one surrounding
   space) and nothing else; a point the caller has already edited is no
   longer matched, so its checkbox clears on the next change and the
   edited words stay. A pick that would pass the field's 280 characters
   is refused: the box stays off and the panel shows "That is more than
   the field holds. Uncheck one first." (`role="status"`). Focus lands
   on the field after each change, as today.
3. A point may carry the placeholder `{{leader}}`. The act page fills it
   before render, in the browser and on every pick, with the goal's
   leader name from a `leader` prop (`string | null`) the page computes
   at build time: `web/src/lib/goals.ts` `leaderOf(goal)` = the
   `incumbents` of the goal's first action's `script_blocks`
   (`leadership.yaml`: `J000294`, `S000148`) filtered to the goal's
   `chamber`, named from the members rows ("Hakeem Jeffries", "Chuck
   Schumer"). No model, no request: the same goal always fills the same
   name, and it is the same name `leaderLine` (`generate.ts:105-125`)
   uses in the script.
4. Data: `house-caucus.yaml` "… a Democratic leader defending it. I
   cannot support a caucus led by that person." → "… led by
   {{leader}}."; `senate-leader.yaml` "… my party's leader defending it.
   I cannot support a caucus led by that person." → "… led by
   {{leader}}." and "I do not want my party's leader negotiating another
   decade-long weapons commitment …" → "I do not want {{leader}}
   negotiating …". A point names the leader once, where "that person" or
   "my party's leader" would leave the office asking who; a first
   mention that sets up the sentence ("my party's leader defending it")
   stays. So the owner's example reads "I watched Gaza unfold with
   American weapons and my party's leader defending it. I cannot support
   a caucus led by Chuck Schumer." on the Senate page and "… led by
   Hakeem Jeffries." on the House page.
5. The loader (`load.ts:82-95`) allows `{{leader}}` only on a goal whose
   `leaderOf` resolves (a leadership goal with a chamber and an incumbent
   of that chamber), rejects any other `{{…}}` token or a brace left in a
   point, and counts the 130-character limit on the point with the name
   filled. The NDAA and state goals' panels change only in §9.1–2.
6. Nothing else about the act page changes: the same `why` text reaches
   `POST /api/generate`, so the generated and standard scripts carry the
   name only through the caller's words, as they would if typed.

### 10. Owner device test
1. Owner runs on iPhone Safari and Android Chrome against production:
   `/goals/senate-leader/` call and write square → modal → postmark;
   district line → modal; `/m/<id>` DC button → modal; whip table number
   → modal; act page "Call" button → receipt card; `/results/<goal>`
   unchanged; finish every office of one goal from the goal page →
   `/results` shows it last with DONE and a new "Action 2"; the Senate
   act page's Gaza point reads "led by Chuck Schumer" and two picks sit
   in the field together. One screenshot per surface.

## Data & contracts
- `POST /api/receipt`, `POST /api/report`, `GET /api/goals/:slug/targets`
  and D1 unchanged. A member-page or whip-table receipt is an ordinary
  receipt row keyed on goal, action, target, device, channel; the
  `limit_repeat` key (`district-counters.md` §8) already covers a second
  tap on the same office within 10 minutes from any page.
- `web/src/components/receipt-flow.tsx`: `useReceiptFlow(opts: {goal:
  ReceiptGoal; state: string; district: number | null; other: NextStep &
  {kind: 'link'}}) → {done, next, handlers, modal}`. `ReceiptGoal =
  Pick<GoalCard, 'slug' | 'title' | 'what_we_want' | 'category' | 'action'
  | 'targets'> & Partial<Pick<GoalCard, 'chamber' | 'also'>>`.
- `Target` `TargetHandlers` unchanged; the district line now calls
  `onContact(t, 'call')`.
- `GoalTargets` props gain `title`, `what`, `category`, `action`.
- New islands: `MemberContact.tsx` (member page hero + offices),
  `WhipReceipts.tsx` (one per whip table, click delegation on
  `a[data-receipt-target]`).
- Persisted client state: `cut-ties:receipts` rows, unchanged shape, now
  written from every surface and kept 7 days instead of 24 h
  (`commitments.ts` prune; `receiptsByTarget` still filters to 24 h);
  `goalDone(goal, action, targetIds, now) → {at: string} | null`;
  `cut-ties:place` read, never written; `cut-ties:route` holds up to four
  goals.
- `POST /api/route` response: `goals` is at most **four** `GoalCard`s in
  rank order (was two); the first two are unchanged. `ranking.ts`
  `topSlots(goals, d, today, n)` replaces `topTwo` (`topTwo` = `n: 2`,
  kept for the tests). No request change.
- `Postmark` props: `wrote: boolean` → `kind: 'called' | 'wrote' | 'done'`
  (`wrote` kept as an alias for a release), `name` is the goal title for
  `done`; `data-postmark="done"`.
- `SummaryCard` gains `done?: {at: string}`; `Results` computes it per
  card from `goalDone` over `officesOf(g)`.
- Goal YAML `reasons[].points[]` may hold `{{leader}}`, the only
  placeholder; the loader fills it to check the 130-character limit and
  rejects it on a goal without a leader. `web/src/lib/goals.ts`
  `leaderOf(goal) → string | null`; `ActForm` gains `leader: string |
  null` and `picked` becomes `string[]`. No D1 change: `reasons` is
  stored as written and filled in the web build and the browser.

## Spec delta
- MODIFIED `docs/specs/results-pages.md` §Purpose: "The goal detail
  page's squares are unchanged (no tap receipt there)." → "The same flow
  runs on every phone and email control on the site
  (`tap-receipts-everywhere`): the goal page's stack, the district lines,
  the member page, the whip table; the act page posts its own receipt
  card on a tap."
- MODIFIED `docs/specs/results-pages.md` §4: "a tap on either square" →
  "a tap on either square or on the district-office line's number"; the
  flow lives in `receipt-flow.tsx` `useReceiptFlow`, which `Results`
  mounts.
- MODIFIED `docs/specs/results-pages.md` §Data & contracts: add
  `receipt-flow.tsx` and `ReceiptGoal`; `cut-ties:receipts` rows kept 7
  days, `goalDone`; `Postmark` `kind`; `SummaryCard` `done`; route
  `goals` up to four.
- MODIFIED `docs/specs/results-pages.md` §1: "The two slots are …" → the
  open goals' first two as Action 1 and 2, then every done goal with the
  96 px DONE postmark in place of its countdown, muted band, "Done" chip,
  "All <n> offices" chip and "See your receipts →" (§7.2, §8.2 above);
  the both-done message; the page stamp over open goals only.
- MODIFIED `docs/specs/results-pages.md` §2: "Action n of N" over the
  open goals; the done goal's ticker, card postmark and "Your next
  action" mini card (§8.4); "not one of your two actions" only for a
  goal outside the route's four.
- MODIFIED `docs/specs/results-pages.md` §5: the filled link when every
  target has a receipt → "Your next action →" to the first open goal,
  "See all goals →" with none.
- MODIFIED `docs/specs/results-pages.md` §7: the 24 h office window
  unchanged; add "a goal whose every office has a receipt in 7 days is
  done (§7.1 above); done is computed in the browser, never sent".
- MODIFIED `docs/specs/action-router.md` §Data & contracts: "`goals` is at
  most two `GoalCard`s" → "at most four, the first two as before";
  `topTwo` → `topSlots(…, 4)`.
- MODIFIED `docs/specs/action-router.md` §Invariants: "Two slots for a
  resolved district" → "The first two slots for a resolved district are
  the same two as before; up to two more follow in rank order".
- MODIFIED `docs/specs/personalised-documents.md` §4 (second entry): the
  act page's `logReceipt` row carries `channel`.
- MODIFIED `docs/specs/personalised-documents.md` §1: "pick one reason,
  it drops into the "why" field, then rewrite it) and lists the goal's
  `reasons` as one radio group … Picking one puts it in the "why" field
  in place of the previous pick (after the caller's own words, if any)
  and focuses the field." → "pick any that fit, they drop into the "why"
  field, then rewrite them) and lists the goal's `reasons` as
  checkboxes … Each pick is appended after the caller's own words in
  panel order, an uncheck removes that point's exact text, an edited
  point clears its box, a pick past 280 characters is refused with a
  status line; `{{leader}}` in a point is the goal leader's name, filled
  from `leaderOf` before render" (§9 above).
- MODIFIED `docs/specs/personalised-documents.md` §Data & contracts
  (`reasons[]`): add "`{{leader}}` allowed on a goal with a chamber
  leader, no other placeholder; the 130-character limit counts the
  filled name".
- MODIFIED `docs/specs/goal-pages.md` §Behavior 2: the "Who to call"
  island's squares and district lines post the receipt and open the
  receipt modal of `results-pages.md` §4–7 (§2 above); Next links to
  `/results` when every office is done; a goal with no action keeps plain
  links.
- MODIFIED `docs/specs/goal-pages.md` §Invariants: add "A tap on any
  phone or email control in the sidebar posts one receipt and opens the
  modal; the done card and its postmark are the `/results` ones".
- MODIFIED `docs/specs/goal-pages.md` §Performance budget: the "Who to
  call" island may grow by ≤2 KB gzip for the flow; the modal chunk is
  requested only on the first tap.
- MODIFIED `docs/specs/target-cards.md` §Behavior 1: the district office
  line's `tel:` link carries the card's `onContact` when the card has
  one.
- MODIFIED `docs/specs/personalised-documents.md` §4: "and 'I did it' →
  `POST /api/receipt`" → "a tap on a call button, the contact-form link or
  'I did it' / 'I sent it' → `POST /api/receipt`, once per office"; the
  buttons stay for calls dialled from another phone.
- MODIFIED `docs/specs/member-pages.md` §3: the hero buttons and the
  district-office numbers are the `MemberContact` island; a tap posts a
  receipt against the member's first open goal (§4 above) and opens the
  results modal; a postmark and ✓ Share pill for 24 h.
- MODIFIED `docs/specs/member-pages.md` §8: the DC phone link carries
  `data-receipt-target`; `WhipReceipts` posts the receipt and opens the
  modal; a 32 px postmark marks a called row for 24 h.
- MODIFIED `docs/specs/member-pages.md` §Invariants: add "Every `tel:`
  link on `/m/<id>` and the whip table posts one receipt on tap while the
  member has an open goal with an action".
- MODIFIED `docs/specs/member-pages.md` §Performance budget: `/m/<id>` and
  the whip page gain one island each, ≤3 KB gzip; the modal chunk is lazy.

## Acceptance criteria
- [ ] `/goals/senate-leader/` at 375 px with a stored place: tap the call
      square → dialer opens, one `POST /api/receipt` with `channel: 'call'`
      and the goal's action slug, the modal opens with the CALLED postmark,
      count echo, ask, share card and Next; close → the card wears the
      postmark and the ✓ Share pill; reload keeps it; `/results/<goal>`
      shows the same done card.
- [ ] Same for the write square (`channel: 'email'`, WROTE) and for the
      district-office line's number (`channel: 'call'`).
- [ ] When every office in the stack is done the filled control reads
      "Your two actions →" and links to `/results`.
- [ ] A goal page with no stored place still shows "Enter your address";
      a goal with no action has plain links and no modal.
- [ ] `/goals/<slug>/act/<action>` after a script: tap "Call Rep. … ·
      <phone>" → dialer opens and the receipt card renders (stamp, count,
      share row, office response) with no further press; a second tap
      posts nothing; "I did it" is gone. Tap the contact-form link in
      the writing view → the WROTE receipt card.
- [ ] `/m/<id>` for a member with an open goal: tap "Call DC office" →
      receipt against that goal (state and district from the stored
      place, else the member's seat), the modal, then the postmark beside
      the title and a ✓ Share pill for 24 h; a district-office card's
      number does the same. A member with no open goal: plain links.
- [ ] `/goals/<slug>/whip`: tap a row's DC number → receipt, modal; the
      row shows a 32 px postmark; the "Call" button still links to the
      act page.
- [ ] `/results/<goal>`: every behaviour of `results-pages.md` §3–8
      unchanged; `results-page.test.tsx` passes without edits to its
      assertions.
- [ ] A call square tapped on `/goals/<slug>` shows as a done office on
      `/results/<goal>` and in its `Counts` line; "I sent it" on the act
      page shows as WROTE on the results done card.
- [ ] Finish every office of a goal (from any mix of pages): `/results`
      shows that card last with the 96 px DONE postmark (day and time of
      the last receipt), muted band, "Done" chip, "All <n> offices",
      "See your receipts →"; a third goal appears as "Action 2"; the page
      stamp is the soonest open goal's.
- [ ] The done card persists across reloads and days 2–7 while its office
      squares on `/results/<goal>` have returned after 24 h; on day 8 it
      is an open card again at its rank.
- [ ] Both slots done in a district with four eligible goals: two new
      open cards first, two stamped cards last. Both done with only two
      eligible: two stamped cards and "You have done every action open
      for your district this week."
- [ ] `/results/<goal>` for a done goal: DONE postmark on the band, done
      target cards, "Your next action" mini card; the modal's filled link
      reads "Your next action →" once every target is done.
- [ ] `POST /api/route` returns the same first two goals as before for
      every fixture district in `worker/test/route.test.ts`, then up to
      two more in rank order; nothing about "done" is in the request.
- [ ] `/goals/senate-leader/act/senate-leader-call/`: the Gaza point
      reads "… I cannot support a caucus led by Chuck Schumer."; on
      `/goals/house-caucus/act/house-caucus-call/` the same point reads
      "… led by Hakeem Jeffries."; no point on any page shows a brace.
- [ ] Checking two points puts both in the "why" field in panel order
      after the caller's words; unchecking the first removes only its
      text; editing a dropped point clears its box and keeps the edit;
      a pick past 280 characters leaves the box off with the status
      line. Tests in `web/src/components/` (`reasons.test.tsx`) and
      `worker/test/goals.test.ts` (`{{leader}}` on the NDAA goal and an
      unknown `{{x}}` both fail the seed naming the goal and point).
- [ ] No share control renders before a receipt on any surface.
- [ ] Budgets: `/goals/<slug>` ≤100 KB transferred before any tap, LCP
      ≤1.5 s on a mid-range phone over 4G; `/m/<id>` and the whip page
      initial requests include no modal or poster chunk; `/results` with
      four goals ≤100 KB transferred (two extra lazy bands) and
      `/api/route` ≤2 s p95 with four slots; `/api/receipt` ≤2 s p95;
      $0/month infra. The PR quotes the measured chunk sizes for
      `GoalTargets`, `MemberContact`, `WhipReceipts` and `Results` and the
      four-slot route's p95.

## Rollout & metrics
No flag; ships with the next deploy, one PR per section in build order
(§1 first, since every other section mounts it). Measure in the weekly
digest: receipts by page (`/goals`, `/m`, whip, act, `/results`) for two
weeks after each section ships, and the share of devices with a receipt
on a third or fourth slot (a rollover happened). Success: receipts per
visit to `/goals/<slug>` rise from zero to within 20 % of
`/results/<goal>`'s, no drop in `/results` receipts, and ≥10 % of devices
that finish one goal post a receipt on the goal that rolled in within the
week.

## State (updated 2026-11-10)
- Sections:
  - [ ] 1. Receipt engine
  - [ ] 2. Goal page stack
  - [ ] 3. Act page buttons
  - [ ] 4. Member page
  - [ ] 5. Whip table
  - [ ] 6. Receipts count from every page
  - [ ] 7. Goal done stamp
  - [ ] 8. Rollover on `/results`
  - [ ] 9. Reason picks name the leader
  - [ ] 10. Owner device test
- Completed: none
- Folded: none
- Branch / open PRs: `docs/tap-receipts-everywhere` (this PRD)
- Files changed (file:line map): none yet. Build order: §1 extracts
  `Results.tsx:142-262` into `receipt-flow.tsx` and adds the district-line
  handler at `Target.tsx:143`; §2 touches `GoalTargets.tsx` and
  `pages/goals/[slug].astro:107`; §3 `ActForm.tsx:384,398,409`; §4
  `pages/m/[id].astro:47-49` + `Offices.astro` → `MemberContact.tsx`; §5
  `WhipTable.astro:88` + `WhipReceipts.tsx`; §6 `ActForm.tsx:224`
  (`channel` on the row); §7 `commitments.ts:49-52` (7-day prune,
  `goalDone`), `Postmark.tsx:18` (`kind`), `SummaryCard.tsx`,
  `Results.tsx` (`/results` render, `/results/<goal>` ticker and mini
  card, modal Next); §8 `worker/src/ranking.ts:177` (`topSlots`),
  `route.ts:197` (`buildRoute`), `Results.tsx` open/done split,
  `worker/test/route.test.ts`; §9 `ActForm.tsx:116,263-273,319-347`
  (checkboxes, `picked[]`, leader fill), `web/src/lib/goals.ts:33`
  (`leaderOf`), `act/[action].astro:27` (`leader` prop),
  `worker/src/load.ts:82-95` (`{{leader}}`), `data/goals/house-caucus.yaml:106`,
  `data/goals/senate-leader.yaml:141,154`.
- Tests run + result: none yet
- Remaining: §1–10
- Decisions since last update: owner 2026-11-10: every phone and email
  button kicks off the receipt and share flow (reverses the
  `share-from-results` scope of `/results` only); the act page keeps its
  own receipt card rather than the modal (Goals 3). Owner 2026-11-10:
  receipts count toward the goal from any page; a finished goal wears a
  DONE postmark and drops last on `/results` while the next ranked goal
  rolls in (§6–8); the done window is 7 days (Open question 4's
  proposal). Owner 2026-11-10: the act page's reasons panel takes
  several picks and names the leader in the points (§9); checkboxes
  rather than radios (Open question 6).
- Known failures / blockers: none
- Next action: /implement-prd-section tap-receipts-everywhere.md (next: §1. Receipt engine)

## Open questions
1. Which goal does a member-page or whip-table call count toward when the
   visitor's stored place is not that member's district? Proposal: the
   member's first open goal, with the visitor's stored place on the row
   when there is one (the counters are per place, and the visitor is the
   one who acted), else the member's seat.
2. Should the act page's tap open the results modal instead of its own
   receipt card? Proposal: no; the act page's card already holds the
   stamp, count, share row and office response, and the modal would
   cover the script the caller is reading.
3. Should the whip table's "Call" button also post a receipt? Proposal:
   no; it leads to the act page, which posts on the tap there.
4. How long is a goal done? Proposal: 7 days from the last receipt, the
   "this week" the page and the counts name; the office squares keep
   their 24 h window so a second call to the same office later in the
   week is still one tap. A 24 h goal window would put the finished
   goal back in slot 1 the next morning.
5. How many slots should the route return? Proposal: four; a device
   that finishes four goals in a week sees the both-done message and the
   `/goals` link rather than a longer list, and the response stays
   small (two more cards of targets the district already has).
6. The owner asked for a "multi select radio button". Proposal:
   checkboxes in the radio rows' exact look; a radio group can hold one
   pick by definition, and a screen reader then announces "checkbox,
   checked" for each pick, which is what the caller did.
7. Should the name be the leader's full name or surname? Proposal: full
   name, as the owner's example reads and as `leaderLine` writes it; a
   caller reading the script aloud says the whole name once.

## Changes
- 2026-11-10 — created (READY, auto) from the owner's report that the
  `/goals/senate-leader/` squares open the dialer without the receipt and
  share flow, and the decision that every phone and email button on the
  site runs it.
- 2026-11-10 — owner adds the `/results` asks: receipts count toward the
  goal from any page (§6), a DONE postmark on a finished goal (§7), the
  finished goal last and the next ranked goal rolled in (§8); the route
  returns four slots, done is computed in the browser for 7 days.
- 2026-11-10 — owner adds the act page's reasons panel (§9): checkboxes
  for several picks, `{{leader}}` in the points filled with the goal
  leader's name from `data/` ("led by Chuck Schumer" / "led by Hakeem
  Jeffries"); owner device test becomes §10.
