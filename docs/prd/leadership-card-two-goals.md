# Leadership card names both goals — PRD
Status: READY 2026-11-10 (auto) · Owner: George Nguyen · Last updated: 2026-11-10

## Problem
When a visitor has a Democratic representative and at least one Democratic
senator, the router folds the two leadership goals into one slot
(`action-router.md` §Behavior 5): the higher-scoring goal is the card and
the other rides on it as `also`. The card takes all of its framing from
the first goal. On `/results/house-caucus/` the owner, with Rep. Correa and
two Democratic senators, saw the headline "Kick out Hakeem Jeffries", a
summary about Jeffries and House Democrats only, then three offices to
call: Correa about Jeffries, and two senators about Chuck Schumer. Schumer
appears only in the small "Senate · Decision: …" label and in the Senate
block's ask text (`Results.tsx:98,107,57-60`). The `/results` summary card
has the same Jeffries-only title, a "House caucus vote" chip that belongs
to the House action alone, and one surname line mixing both chambers
(`SummaryCard.tsx:9-22,54`). A visitor cannot tell that the card is two
goals with different leaders, different voters and different dates, and
`/results/senate-leader/` does not open the card at all for that visitor,
because the page looks up only the card's own slug (`Results.tsx:178`).
The votes this serves: the House Democratic caucus leadership vote
(placeholder 2026-11-18) and the Senate Democratic leadership ballot
(placeholder 2027-01-05).

## Goals / Non-goals
- Goals:
  1. A split card says in its headline and summary that it holds two
     goals, and names both leaders.
  2. Each block says which leader it is about, before its ask, so the
     visitor knows which call is which.
  3. The `/results` summary card shows which offices belong to which
     leader.
  4. Either goal's `/results/<slug>` opens the split card for a visitor
     whose slot holds both.
- Non-goals:
  - Un-merging the slot. "Your two actions this week" stays two slots;
    giving each leadership goal its own slot would push out the military
    bill or the state goal, which is the reason the slot was shared.
  - A new `/results/leadership` route or slug. Both existing slugs keep
    working; adding a third would split counts and shared links.
  - Changing the receipt modal, share card, postmark or counts. They are
    already per block (each block posts its own goal and action).
  - The card's photo band and countdown stamp. The stamp already names
    the chamber on a split card.
  - The single-goal card and the "race not called" line.
  - `/goals/house-caucus` and `/goals/senate-leader`, which are separate
    pages already.

## Research (what the best products do → adopt / adapt / reject)
| Pattern | Seen in | Verdict | Why |
|---|---|---|---|
| One issue per page, each contact labelled with their office and the ask for that office | 5 Calls | adopt | The block title and chamber label do this for each half of the card |
| One combined campaign headline over several asks | Action Network multi-target campaigns | adapt | Fine as a headline only if each ask below names its own target; the per-block title is that |
| Tabs per chamber | some congressional call tools | reject | Hides the second half; the owner missed the Senate half with both on screen |
| Split the bundle into two separate cards | — | reject | Costs a slot; see Non-goals |

## Users
A visitor with a Democratic representative and Democratic senators
(most of California, New York, Illinois and others). They read the
headline and the summary, then call down the list. They need to know,
before the first call, that the representative is asked about Jeffries
and the senators about Schumer. A visitor with only one Democratic
chamber sees a one-goal card and nothing in this PRD.

## Expected behavior
Applies only when a leadership card carries `also` (both goals eligible).
Copy follows `plain-english-copy` rules.

### 1. Pair copy and card framing
1. `data/goals/house-caucus.yaml` gains a `pair` block, the only place
   the combined copy lives:
   - `title`: "Kick out Jeffries and Schumer"
   - `summary`: "Democrats in Congress are about to pick their leaders.
     House Democrats vote on whether Hakeem Jeffries keeps his job, and
     Senate Democrats vote on Chuck Schumer. Your representative votes in
     the first and your senators in the second, so this action has a call
     for each."
2. The House goal carries it because the House block always renders
   first. The loader rejects a `pair` block on any other goal.
3. On a split card, whichever goal is the card, the headline is
   `pair.title` and the summary paragraph is `pair.summary`. That applies
   to the result card (`Results.tsx` `Card`), the one-action page H1, the
   "Your other action" mini card and the `/results` summary card. On the
   one-action page the island sets `document.title` to
   "<pair.title> — Cut the Ties".
4. When `pair` is missing, the split card falls back to today's single
   title and summary. Data never blocks the page.

### 2. Block anatomy
Each chamber block on a split card, House first, renders top to bottom:
1. A rule (`border-t` ink) above the Senate block, to separate the two.
2. The block goal's title as an `h3` ("Kick out Hakeem Jeffries",
   "Kick out Chuck Schumer"), `headline-sm`.
3. The existing label line: "House · Decision: <date>" /
   "Senate · Decision: <date>".
4. The ask text, "Get my script →", the target stack and counter line,
   as today.
5. A text link "More on this vote →" to `/goals/<block slug>`.

A one-goal card is unchanged: no `h3`, no rule, no link.

### 3. Summary card on `/results`
On a split summary card:
1. The title is `pair.title`.
2. The chips are "Call or write" / "Call", the office count, and
   "House + Senate". The action `short_label` chip is dropped, because it
   belonged to the card goal's action alone.
3. The offices line becomes two lines, House first. Each line is the
   block action's `short_label`, then that block's portraits and
   surnames: "Jeffries vote · Correa" and "Schumer vote · Padilla ·
   Schiff". A block with no targets is left out.
4. `data/actions/house-caucus-call.yaml` `short_label` becomes "Jeffries
   vote" and `senate-leader-call.yaml` becomes "Schumer vote". The
   one-goal summary card shows the same chip text.

### 4. Either slug opens the split card
On `/results/<slug>`, the island finds the card whose own slug or whose
`also` slug equals `<slug>`. So `/results/senate-leader/` and
`/results/house-caucus/` both render the same split card with the same
"Action n of N". The summary card keeps linking the card's own slug.

### 5. Live check
After deploy, on cutthetiesmovement.org with an address in CA-46 (a
Democratic representative and two Democratic senators), the owner sees §1–4
on a phone at 390 px. Shared receipts and the share card name the block's
own goal.

## Data & contracts
- `data/goals/<slug>.yaml`: optional `pair: {title: string ≤40,
  summary: string ≤400}`. Allowed only on `house-caucus`; the loader
  (`worker/src/load.ts`) fails the seed and the web build on any other
  goal or on a missing field. No D1 column: the web build reads it from
  `data/` (`web/src/lib/goals.ts`, new `leadershipPair()`), and the
  `/results` and `/results/<goal>` pages pass it to the `Results` island
  as a `pair` prop. `POST /api/route` and `GoalCard` are unchanged.
- `short_label` values change as in §3.4; no shape change.
- No new persisted client state.

## Spec delta
- MODIFIED `docs/specs/action-router.md` §Behavior 5: "the card shows a
  'House' block, then a 'Senate' block, each with that goal's decision
  date, targets, counter line, ask and CTA" → "the card's headline and
  summary are the House goal's `pair` copy (fallback: the card goal's
  own), then a 'House' block, then a 'Senate' block under a rule; each
  block opens with its goal's title as an h3 and the '<Chamber> ·
  Decision: <date>' label, then the ask, CTA, targets and counter line,
  and ends with 'More on this vote →' to `/goals/<slug>`".
- MODIFIED `docs/specs/action-router.md` §Data & contracts: ADDED the
  optional `pair` block on `house-caucus.yaml`, read at build time, not
  part of `GoalCard`.
- MODIFIED `docs/specs/results-pages.md` §Behavior 1: "A split leadership
  card (`also`) is one summary card: its photo and stamp, the offices of
  both blocks House first, one link" → "… one summary card: its photo and
  stamp, the `pair` title, no `short_label` chip, one offices line per
  block House first, each led by its action's `short_label`, one link".
- MODIFIED `docs/specs/results-pages.md` §Behavior 2: "H1 the goal title"
  → "H1 the goal title, or the `pair` title on a split card"; ADDED "the
  island finds the card by its slug or its `also` slug".

## Acceptance criteria
- [ ] CA-46 (D rep, two D senators): `/results` summary card title "Kick
      out Jeffries and Schumer", chips include "House + Senate" and not
      "House caucus vote" or "Jeffries vote", offices lines "Jeffries vote
      · Correa" then "Schumer vote · Padilla · Schiff".
- [ ] CA-46 `/results/house-caucus/`: H1, card headline and tab title use
      the pair title; the summary paragraph names both Jeffries and
      Schumer; an h3 "Kick out Hakeem Jeffries" above Correa's block and
      an h3 "Kick out Chuck Schumer" above the senators' block; each
      block's "More on this vote →" opens its own `/goals/<slug>`.
- [ ] CA-46 `/results/senate-leader/` renders the same card, not the
      "not one of your actions" state.
- [ ] A visitor with a Republican representative and Democratic
      senators sees the one-goal "Kick out Chuck Schumer" card with no
      h3, rule or pair copy. Same for a Democratic representative and two
      Republican senators.
- [ ] Tapping a senator's square on the split card posts a receipt for
      `senate-leader` / `senate-leader-call`, and the share card names
      that goal (unchanged behaviour, regression check).
- [ ] With `pair` removed from the YAML, the split card renders today's
      title and summary and the build passes.
- [ ] A `pair` block on `senate-leader.yaml` fails `npm run seed` and the
      web build with a message naming the file.
- [ ] Tests: `Results.test.tsx` (split card title, h3s, rule, link,
      fallback, `also`-slug lookup), `SummaryCard.test.tsx` (pair title,
      per-block offices lines, no `short_label` chip), `worker/test`
      loader check for `pair`. `test`, `tsc` and `build` targets green.
- [ ] `/results` stays within the landing budget: ≤100 KB transferred;
      the pair copy adds under 1 KB.

## Rollout & metrics
No flag; ships with the next deploy. Measure: share of split-card
visitors who make at least one Senate-block call (receipts with
`senate-leader-call` over visitors whose route returned a split card),
before and after, from the existing receipt rows.

## State (updated 2026-11-10, PR #94)
- Sections:
  - [ ] 1. Pair copy and card framing
  - [ ] 2. Block anatomy
  - [ ] 3. Summary card on `/results`
  - [ ] 4. Either slug opens the split card
  - [ ] 5. Live check
- Completed: none
- Folded: none
- Branch / open PRs: `docs/leadership-card-two-goals` (this PRD), PR #94
- Files changed (file:line map): none yet. §1–4 build as one PR:
  `data/goals/house-caucus.yaml` (`pair`), `data/actions/*-call.yaml`
  (`short_label`), `worker/src/load.ts:330` (validate `pair`),
  `web/src/lib/goals.ts` (`leadershipPair()`),
  `web/src/pages/results/[goal].astro` + `results/index.astro` (prop),
  `Results.tsx:57-120` (`Block` h3/rule/link, `Card` title/summary),
  `:134` (mini card), `:178` (`also` lookup), `:269` (H1),
  `SummaryCard.tsx:9-22,54`.
- Tests run + result: none yet
- Remaining: §1–5
- Decisions since last update: owner 2026-11-10: the split card must
  say it is two goals; slot stays shared.
- Known failures / blockers: `tap-receipts-everywhere` §1 moves
  `Results.tsx:142-262` into `receipt-flow.tsx`; whichever lands second
  rebases. This PRD does not touch those lines.
- Next action: `/implement-prd-section docs/prd/leadership-card-two-goals.md`
  for §1–4 in one PR.

## Open questions
1. Headline wording. Proposal: "Kick out Jeffries and Schumer", which
   matches the two goal titles and fits `headline-lg` at 390 px on two
   lines. Alternative: "New Democratic leaders in Congress".
2. Should the `/goals` index or the home page show the pair? Proposal:
   no; those list goals, and the pair exists only on the routed slot.

## Changes
- 2026-11-10 — created (READY, auto: no blocking questions).
