# Senate leader pick: Van Hollen — PRD
Status: READY 2026-11-09 (auto) · Owner: George Nguyen · Last updated: 2026-11-09

## Problem
The "Kick out Chuck Schumer" goal (`data/goals/senate-leader.yaml`) asks
Democratic senators to vote only for a leader who promises, in public, to
strip the Israel integration section from the military bill and to oppose a
new long-term weapons deal. Its `our_picks` is empty, so the prep page says
no one is named, the standard script's `{{pick_line}}` is blank and the
generated script has no name to put to the condition. Since 2026-11-06
senators and senators-elect have been urging Chris Van Hollen (MD) to run
against Schumer; on 2026-11-09 he said the caucus "needs to have a
discussion" before it crowns anyone (The Baltimore Banner). He is the one
possible leader with a record on the exact section this goal targets: he
led the July 2026 Senate letter against the NDAA's Israel provisions and
filed the amendments to strike §1217 (`docs/research/senate-leader-candidates.md`).
A caller who asks "vote for a new leader" with no name to offer gets "who?"
back from staff.

## Goals / Non-goals
- Goals:
  1. Name Chris Van Hollen as the goal's first and only pick, with a
     sourced rationale, so the prep page, the standard script and the
     generated script all carry him.
  2. Keep the ask a condition, not a coronation: the promise is asked of
     Van Hollen too, and of anyone else who runs.
  3. Keep the goal copy true to the reporting as of 2026-11-09 (urged to
     run, not declared).
- Non-goals: a second or third pick (the research lists Murphy and Booker;
  the owner chose one name); any change to the house-caucus goal; any code
  change (the pick rendering shipped with goal-pages); naming a pick on an
  electoral goal (primary-2028 §2 stays blocked on counsel).

## Research (what the best products do → adopt / adapt / reject)
Relies on: `docs/research/senate-leader-candidates.md` (2026-11-04 scan;
its "Picks" section proposes this row) and `docs/research/leader-call-scripts.md`.
| Pattern | Seen in | Verdict | Why |
|---|---|---|---|
| Name a replacement, not just "someone else" | Indivisible's replace-Schumer call, draft-Van-Hollen push on Politico Playbook | adopt | Staff log a name; "a new leader" logs as nothing |
| Endorse a declared candidate only | Party whip operations | reject | Nobody has declared; the draft is the lever this week |
| Condition the endorsement on the promise | Our own leadership goals | adopt | A new leader without the promise is the same problem with a new face |

## Users
- A caller with a Democratic senator: wants one name to say and one
  condition to attach to it. Copy stays plain, no vote counts.
- A caller whose senator already backs Van Hollen: needs the follow-up ask
  (get the promise from him in public), already in the pushback list.
- Maintainers: the pick row's `signal`/`signal_date` is the thing to
  refresh when he declares or rules it out.

## Expected behavior
### 1. Pick row
`data/goals/senate-leader.yaml` `our_picks` holds one row: `name` Chris
Van Hollen, `bioguide_id` V000128, a rationale in plain English (his
letter and amendments against the section, his arms-sale votes, that he
refuses AIPAC money, that he has not declared and is being urged to run,
and that the condition is put to him too), `source_url` the Truthout
report on the July 2026 letter, `signal` the 2026-11-09 Banner line and
El-Sayed's endorsement, `signal_date` 2026-11-09. Rendered per
`docs/specs/goal-pages.md` Behavior 2 ("Who we would back instead") and
Behavior 4 (prep page leads with the pick card, 80×100 badge with his
initial on the Democratic colour and portrait when a file exists; the
one-line ask ends "Our first pick: Chris Van Hollen."). The standard
script's `{{pick_line}}` becomes "Our pick for that job is Chris Van
Hollen." and the generator's facts name the pick.

### 2. Goal copy
`prep_md` "Where things stand", the 30-second script and the pushback
answers say he is our pick, why, and that he has not declared; the
sentence "he is not our pick" (PR #92) goes. `sources` gains the Truthout
and UpriseRI rows behind the rationale. Every name and date in `prep_md`
is a `data/` row or carries `[VERIFY: …]`.

### 3. Verify
`scripts/quiet-check.sh test` (loader: pick row shape, `bioguide_id` in
`members.csv`, prep headings, standard-script word range with the pick
line for every senate target) and `build` pass; `/goals/senate-leader/prep`
in the local web dev server shows the pick card first and the one-line
ask names him.

## Data & contracts
Data rows only: `our_picks` (shape in `data/README.md` §Goal status
lifecycle: ≤3 `{name, rationale, source_url, signal, signal_date,
bioguide_id?}`), `sources`, `prep_md`, `this_week`. No endpoint, schema or
client state changes.

## Spec delta
- none — data rows only; `docs/specs/goal-pages.md` Behaviors 2 and 4 and `docs/specs/standard-scripts.md` already specify how a leadership goal's picks render.

## Acceptance criteria
- [ ] `/goals/senate-leader` shows "Who we would back instead" with Chris Van Hollen, the rationale, the source link and the signal date.
- [ ] `/goals/senate-leader/prep` leads with his pick card and the one-line ask ends "Our first pick: Chris Van Hollen."
- [ ] A senate standard script for a non-incumbent target contains "Our pick for that job is Chris Van Hollen." and stays inside the action's word range (seed check).
- [ ] The prep copy says he has not declared and that the promise is asked of him too.
- [ ] `scripts/quiet-check.sh test`, `prd-lint`, `doc-lint` and `build` pass.
- [ ] Performance budgets unchanged (one data row; no new asset).

## Rollout & metrics
No flag. Ships with the next deploy of `main` (D1 reseed). Watch
`/results/senate-leader` receipts and reports mentioning Van Hollen; refresh
`signal`/`signal_date` when he declares or rules it out.

## State (updated 2026-11-09, PR #92)
- Sections:
  - [ ] 1. Pick row
  - [ ] 2. Goal copy
  - [ ] 3. Verify
- Completed: —
- Folded: none (Spec delta none)
- Branch / open PRs: `chore/senate-leader-van-hollen` · PR #92
- Files changed: —
- Tests run + result: —
- Remaining: all
- Decisions since last update: owner picked Van Hollen alone (2026-11-09)
- Known failures / blockers: none
- Next action: §1

## Open questions
1. Should Murphy and Booker follow as picks 2 and 3 as the research
   proposes? Proposal: no; one name is what a caller can say, and the owner
   chose one.

## Changes
- 2026-11-09 — created (READY, auto); owner decision to name Van Hollen as the pick after PR #92 added him to the copy without one.
