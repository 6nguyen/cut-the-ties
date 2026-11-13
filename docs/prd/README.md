# PRDs — one file per change

`docs/specs/` describes the app as shipped today. A PRD here is a **change**:
a proposal with an explicit `## Spec delta`, approved **before** code. A PRD
opened as a PR is approved on creation, with Status `READY`, unless it has a
`[blocking]` open question (see the template's `## Open questions`); the
owner can still reject it in review.

## Lifecycle
Specced in `docs/specs/prd-lifecycle.md` (template repo only). The spec is
the source of truth; a change to one updates the other in the same PR.

1. **Propose.** Read `docs/FEATURES.md` first (what exists, is building or
   is queued). `docs/prd/<change>.md` from the template below, including
   `## Spec delta`; delete the `## Next` row it replaces in the same commit. Add its row to the index below at its priority (rules under
   `## Index`). A brand-new capability's delta is ADDED: the whole spec
   file (template in `docs/specs/README.md`).
2. **Build.** `/implement-prd-section` loads the PRD range plus only the spec
   sections the delta names. State is read and written only through
   `state.sh get|set`; `prd-lint.sh <prd>` runs before every PRD commit.
3. **Fold.** When a section merges, its delta is applied to `docs/specs/` in
   that same PR and State records `Folded: §…`.
4. **Ship.** The PR that ships the final section (State `Remaining: none`)
   also sets Status `SHIPPED YYYY-MM-DD (PR #n)`, `git mv`s the PRD to
   `archive/YYYY-MM-<change>.md`, removes its row from the index below and
   deletes its pointer lines from the root `CLAUDE.md`.
5. **Split the tail.** A PRD whose build is done, or done but for one
   small step, and that now waits only on something outside the build (a
   review, a device test, an owner checklist or account step, counsel, a
   date) does not stay open for it. The next docs commit:
   - writes `docs/prd/<tail>.md` holding only the remaining work: Problem
     says what is left and what it waits on; Expected behavior holds the
     moved section(s) verbatim; the original's unticked acceptance
     criteria and any unfolded `## Spec delta` entries move with it; its
     first Changes line names the archived original;
   - ships the original as in step 4, Status `SHIPPED YYYY-MM-DD (PR #n)`
     naming its last merged build PR, the moved section marked
     `[x] … · moved to <tail>.md` and each moved criterion suffixed
     `→ <tail>.md`;
   - gives the tail its own index row at its priority and repoints every
     link and code comment that named the moved section.
   Not a tail: work that is the PRD's main payload (a multi-batch data
   sweep, a section still to be designed). That PRD stays open.
6. **Superseded or abandoned** PRDs move to `archive/` with Status
   `SUPERSEDED by <prd>` or `DROPPED`, no fold, and the same pointer
   deletion.

A PRD pointer is one root `CLAUDE.md` line carrying
`<!-- prd-pointer: docs/prd/<change>.md -->`. Archiving a PRD deletes every
line with its marker, in the same commit as the `git mv`; these are the only
`CLAUDE.md` lines any process removes automatically.

No PRD and no spec change: refactors and fixes that restore specced
behavior. A fix that *changes* specced behavior edits the spec directly in
the fix PR and gives the reason in the commit body (a PRD only if the owner
asks). `archive/` is history only: archived PRDs are never edited and agents
never load them.

## Index (open changes only, in priority order)
This table is the one state holder for every open PRD. Row 1 is the next
PRD to build; `Needs` names the PRDs that must merge first, and a row with
no `Needs` entry can run in parallel with the row above it. Rules:
- Creating a PRD inserts its row at its priority and renumbers the rest;
  rows are never appended by default. Buildable rows rank above rows
  blocked on the owner, counsel or a date.
- `Status` mirrors the PRD's `Status:` line: one word from the table
  below, then the section still open and why in parentheses. The same
  commit that changes a PRD's Status or State block updates its row.
- A PRD that ships, is superseded or is dropped loses its row in the
  commit that archives it (Lifecycle 4–6); completed work never stays here.
- A row whose build is done and that waits only on a review, a device
  test, an owner step, counsel or a date is split (Lifecycle 5): the
  original archives and the tail PRD takes a row of its own.
- `prd-lint` fails on a `docs/prd/*.md` without a row, a row whose PRD is
  missing or archived, and a row whose Status word differs from the PRD's.

Status follows the board a team would keep. The word comes from the PRD's
`Sections:` markers, never from a guess:

| Status | Means | Sections markers |
|---|---|---|
| `DRAFT` | A `[blocking]` question is open; no code | all `[ ]` |
| `READY` | Approved, nothing started | all `[ ]`, or `[!]` where a gate (owner, counsel, a date) holds the first section |
| `IN PROGRESS` | Build work remains: a section is being built, not yet started, or blocked | some `[x]` or `[~]`, and a build section still `[ ]`, `[~]` or `[!]` |
| `DEV COMPLETE` | All code is merged; verification has not started | every build section `[x]`; a verification section `[ ]` |
| `TESTING` | Only verification remains and it is under way or waiting on the owner (device matrix, go-live checklist, measured budgets) | every build section `[x]`; a verification section `[~]` or `[!]` |
| `SHIPPED` | Resolved: verified, archived, no row here | all `[x]` |

`docs/FEATURES.md` keeps its own coarser words (PLANNED, BUILDING, SHIPPED);
it is generated from the same markers.

| # | PRD | Status | Needs | Owner surfaces |
|---|---|---|---|---|
| 1 | [no-owner-ties.md](no-owner-ties.md) | READY 2026-11-11 (auto) | — | `/about` and `/donate` say "one volunteer" instead of the owner's name; an unsourced state's holdings line drops the "help us find it" GitHub link (`RESEARCH_URL` deleted); a build test fails on the owner's surname or `github.com/6nguyen` in any page; §2 owner checklist: Stripe public details, Instagram sign-up identity |
| 2 | [state-holdings-sweep.md](state-holdings-sweep.md) | IN PROGRESS (§2 maintainer research sweep) | — | `draft-holding`, `states.csv` checks, 50-state sweep; maintainer research, runs alone |
| 3 | [go-live-checklist.md](go-live-checklist.md) | TESTING (§1 owner go-live checklist: 2 of 11 ticked) | — | Split from the shipped deploy PRD: tick `docs/guides/deploy.md` §5 with measured production numbers; owner sets `STRIPE_LINKS` and checks the Cloudflare bill; preview `/api/*` 404 needs a fix PR |
| 4 | [android-share-test.md](android-share-test.md) | TESTING (§1 needs an Android phone; the owner has none) | — | Split from the shipped social-sharing PRD: one Android run (Chrome, Samsung Internet) of the poster share to Instagram, final `SHARE_PAYLOAD`, phone draw time |
| 5 | [primary-2028-picks.md](primary-2028-picks.md) | READY 2026-11-13 (§1 gated: counsel) | — (counsel's written answer) | Split from the shipped primary-2028 PRD: picks with a disclosure line, or the state's filing-list link; no candidate name anywhere until counsel answers |
| 6 | [district-flip-2027.md](district-flip-2027.md) | READY 2026-11-13 (§1 gated: not before 2027-01-03) | — (date-gated 2027-01-03; roster PR first) | Split from the shipped district rollover PRD: one PR flips both district paths to the 120th Congress per `docs/guides/deploy.md` §6 |

## Next (ideas without a PRD, in intended order; ≤10)
Targets is an existing spec stem or `new`. Writing the PRD deletes its row
in the same commit; dropping an idea deletes its row.
| # | Idea | Targets | Notes |
|---|---|---|---|
| 1 | Weekly social-trend watch: which frames about Jeffries, Schumer, the military bill and Israel are moving on Instagram, TikTok and search; proposes goal-title and `this_week` changes as a PR | maintainer-tooling | Needs a logged-in trend source or a listening tool; never edits `data/` on its own; follows `plain-english-copy` |

## Template (copy for a new feature)

```markdown
# <Change name> — PRD
Status: DRAFT | READY | IN PROGRESS | DEV COMPLETE | TESTING | SHIPPED YYYY-MM-DD (PR #n) | SUPERSEDED by <prd> | DROPPED · Owner: <name> · Last updated: YYYY-MM-DD

## Problem
What is wrong or missing today, in one paragraph, with the evidence.

## Goals / Non-goals
- Goals: the 2–5 outcomes this must achieve.
- Non-goals: what we deliberately leave out (and why).

## Research (what the best products do → adopt / adapt / reject)
Relies on: links to the `docs/research/<topic>.md` files behind this PRD, or
omit the line. The PRD states every decision a build needs; builds never
read research.
| Pattern | Seen in | Verdict | Why |

## Users
Who uses this and how their needs differ (copy, density, defaults).

## Expected behavior
Numbered, screen by screen. Each step: what the user sees, what they can do,
what happens next, edge cases (empty data, offline, first run vs return).

## Data & contracts
New/changed endpoints, models, settings keys, persisted client state.

## Spec delta
One entry per `docs/specs/<file>.md` § heading this change touches. Each is
ADDED (new text), MODIFIED (old → new) or REMOVED. A new capability is one
ADDED entry: the whole spec file. Example:
- MODIFIED `docs/specs/home.md` §Behavior 3: streak resets after 1 missed day → after 2 missed days.

## Acceptance criteria
Checkbox list a tester can verify without reading code, including failure
paths and the performance budget (from CLAUDE.md §Performance budgets).

## Rollout & metrics
Feature flag? Migration? What we measure to know it worked.

## State (updated YYYY-MM-DD, PR #n) — medium/long features only; ≤30 lines
- Sections: (build order; `[ ]` todo · `[~]` in progress · `[x]` merged · `[!]` blocked: reason)
  - [x] <heading text> · PR #n merged
  - [~] <heading text> · <branch> · PR #n
  - [ ] <heading text>
- Completed: …
- Folded: §… (spec deltas applied to `docs/specs/` so far)
- Branch / open PRs: …
- Files changed (file:line map): …
- Tests run + result: …
- Remaining: …
- Decisions since last update: …
- Known failures / blockers: …
- Next action: …
The implementing session updates this in the same PR. A fresh session
resumes from this block, not from conversation history. `Sections:` items
are heading text (prefix match, no line numbers); `/implement-prd-section`
with no range picks the next one and both it and `/handoff` keep the
markers current (merged PRs flip to `[x]` on the next run).

## Open questions
Numbered. Each has a `Proposal:`. Mark one `[blocking]` only if its answer
changes Expected behavior, Data & contracts, Acceptance criteria or scope, or
is costly to reverse. No blocking questions → Status `READY YYYY-MM-DD
(auto)` at PR creation, proposals become decisions, logged under Changes.
Any blocking question → Status `DRAFT`, PR body lists them, no code yet.

## Changes
- YYYY-MM-DD — created (DRAFT).
```
