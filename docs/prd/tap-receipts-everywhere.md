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
off the receipt and share flow. The vote this serves is whichever goals
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
  4. No new endpoint, table, outcome or settings key; every page's
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

## Users
The visitor who reached a goal page from a share link, a search or the
`/goals` list, entered an address on the landing earlier, and taps a
square in the sidebar: the same modal as on `/results`, no detour. The
visitor on a member page (from the whip table, a search, the "Your
representative" line) who taps the DC number: a receipt against the
member's first open goal, then the share card. The act-page visitor who
taps "Call Rep. Correa · (202) …": the receipt card fills in behind the
dialer, as if "I did it" had been pressed. Nobody types anything new.

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

### 6. Owner device test
1. Owner runs on iPhone Safari and Android Chrome against production:
   `/goals/senate-leader/` call and write square → modal → postmark;
   district line → modal; `/m/<id>` DC button → modal; whip table number
   → modal; act page "Call" button → receipt card; `/results/<goal>`
   unchanged. One screenshot per surface.

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
  written from every surface; `cut-ties:place` read, never written.

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
  `receipt-flow.tsx` and `ReceiptGoal`.
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
- [ ] No share control renders before a receipt on any surface.
- [ ] Budgets: `/goals/<slug>` ≤100 KB transferred before any tap, LCP
      ≤1.5 s on a mid-range phone over 4G; `/m/<id>` and the whip page
      initial requests include no modal or poster chunk; `/api/receipt`
      ≤2 s p95; $0/month infra. The PR quotes the measured chunk sizes
      for `GoalTargets`, `MemberContact`, `WhipReceipts` and `Results`.

## Rollout & metrics
No flag; ships with the next deploy, one PR per section in build order
(§1 first, since every other section mounts it). Measure in the weekly
digest: receipts by page (`/goals`, `/m`, whip, act, `/results`) for two
weeks after each section ships. Success: receipts per visit to
`/goals/<slug>` rise from zero to within 20 % of `/results/<goal>`'s, with
no drop in `/results` receipts.

## State (updated 2026-11-10)
- Sections:
  - [ ] 1. Receipt engine
  - [ ] 2. Goal page stack
  - [ ] 3. Act page buttons
  - [ ] 4. Member page
  - [ ] 5. Whip table
  - [ ] 6. Owner device test
- Completed: none
- Folded: none
- Branch / open PRs: `docs/tap-receipts-everywhere` (this PRD)
- Files changed (file:line map): none yet. Build order: §1 extracts
  `Results.tsx:142-262` into `receipt-flow.tsx` and adds the district-line
  handler at `Target.tsx:143`; §2 touches `GoalTargets.tsx` and
  `pages/goals/[slug].astro:107`; §3 `ActForm.tsx:384,398,409`; §4
  `pages/m/[id].astro:47-49` + `Offices.astro` → `MemberContact.tsx`; §5
  `WhipTable.astro:88` + `WhipReceipts.tsx`.
- Tests run + result: none yet
- Remaining: §1–6
- Decisions since last update: owner 2026-11-10: every phone and email
  button kicks off the receipt and share flow (reverses the
  `share-from-results` scope of `/results` only); the act page keeps its
  own receipt card rather than the modal (Goals 3).
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

## Changes
- 2026-11-10 — created (READY, auto) from the owner's report that the
  `/goals/senate-leader/` squares open the dialer without the receipt and
  share flow, and the decision that every phone and email button on the
  site runs it.
