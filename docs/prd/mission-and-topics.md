# Mission and topics — PRD
Status: DRAFT · Owner: George Nguyen · Last updated: 2026-11-13

## Problem
The site is built as a general "call your representatives about the
open decision" machine (goals with a category, an ask, eligibility,
targets, reasons, script blocks, counters and reminders), but every
piece of copy says it is about one thing: US military ties with Israel
(`README.md` line 3, `web/src/pages/index.astro` eyebrow and subhead,
`web/src/layouts/Base.astro` default description, `card.png.ts`,
`web/src/pages/goals/index.astro`, CLAUDE.md §Don'ts). The owner's
decision (2026-11-13) widens the mission: cut the ties that work against
what Democratic voters want, which today means US military ties with
Israel, the lobby money behind them, wars without end, healthcare, and
the Democratic leaders who keep all of those in place. Three things block
that today: goals carry no topic, so nothing can group or label decisions
by what they are about; the leadership asks name one condition (stop
Israel's integration) where the mission now has several; and the
generation screen (`worker/src/generate.ts` `screenSystemPrompt`) judges
the caller's "why" text against that one goal's title and ask only, so a
caller who types their healthcare or lobby-money reason on the defense
bill goal is bounced as off topic, and three bounces in a day lock the
device for a day. The homepage-copy and FAQ PRDs (PR #107) carry the
Israel-only keyword in most of their strings and wait on this one.

## Goals / Non-goals
- Goals: one mission statement, signed off, used everywhere the site
  says what it is for; a `topics` list on every goal, checked at build,
  shown on cards and goal pages; leadership asks with a sourced list of
  conditions instead of one; a screen that accepts any reason to hold
  the official accountable on a mission topic; docs (README, CLAUDE.md,
  `data/README.md`) rewritten to the mission.
- Non-goals: any new campaign goal (a healthcare vote, an AIPAC-money
  goal) — each is its own PRD with its sourced rows; a repeat-call
  cadence ("call again until the office says will support") — its own
  PRD on `commitment-funnel`; primaries and candidate naming
  (`primary-2028-picks`, counsel-gated); renaming the site or domain;
  a topic filter UI beyond labels (four active goals do not need one).

## Research (what the best products do → adopt / adapt / reject)
Relies on: `docs/research/social-platform-trends.md` (one frame spreads;
section numbers do not travel).
| Pattern | Seen in | Verdict | Why |
|---|---|---|---|
| Umbrella brand with named campaigns underneath | Indivisible, 5 Calls | adopt | "Cut the Ties" stays the brand; each tie is a named topic, each decision a goal |
| Issue tags on every action, filterable | 5 Calls, Resistbot | adapt | Tags yes (labels on cards); a filter only once more than ~6 goals are active |
| Demands list on a leadership ask | Justice Democrats, Sunrise | adopt | "Unless they promise, in public, to: …" with one source per line |
| Vague mission ("the party's interests") | many PACs | reject | Says nothing a caller can repeat; the mission names the ties |
| Screen the caller's reason against one goal | current site | reject | Bounces legitimate reasons; the mission and the official's record are on topic |

## Users
Callers who come for one tie (Israel, today) and find the others; callers
whose reason is another tie (their premiums, a war, a donor list) and
need the script to carry it; the maintainer adding a goal, who must say
what it is about in one field; crawlers and answer engines, which get
one consistent statement of what the site is for.

## Expected behavior
### 1. Mission strings
Every row is a string and nothing else; the owner edits "Proposed" in
this PR (Open question 0). PR #107's rows that overlap are rewritten to
match after this PRD leaves DRAFT.

| # | Element (file) | Current | Proposed |
|---|---|---|---|
| 1 | Mission line (`README.md`, `/about` first paragraph, `MISSION` constant) | Civic-action tool to end US aid, ties and military partnership with Israel at the federal, state and local levels. | Cut the Ties helps you call Congress to cut the ties that work against you: US military ties with Israel, the lobby money behind them, wars without end, healthcare held hostage, and the Democratic leaders who keep all of it in place. |
| 2 | The four ties (`TOPIC` labels, cards, goal pages, FAQ) | — | US ties with Israel · Lobby money · Wars · Healthcare |
| 3 | Hero eyebrow (`index.astro`) | Call your people in Congress · US military ties with Israel | Call Congress · Cut the ties |
| 4 | H1 (`index.astro`) | Find the two things you can do **this week** | Call Congress to cut the ties **that work against you** |
| 5 | Subhead (`index.astro`) | One site to end US aid to Israel and get the US military out of its wars. Enter your address. We find the people who represent you in Congress and give you the exact words to say when you call. | US military ties with Israel. The lobby money behind them. Wars without end. Healthcare held hostage. Enter your address: we find who represents you, pick the two calls that matter most this week, and give you a 60-second script for each. |
| 6 | `<title>` (`index.astro`) | Cut the Ties — find the two things you can do this week | Cut the Ties — call Congress on Israel, lobby money, wars and party leaders |
| 7 | Default description (`Base.astro`, `/goals`, OG card) | Enter your address. We find the people who represent you in Congress and the two things you can do this week to cut US military ties with Israel. | Enter your address to find your House member, senators and state treasurer, then get a 60-second script for this week's calls on US ties with Israel, lobby money, wars and healthcare. |
| 8 | Leadership ask, House (`house-caucus.yaml` `what_we_want`) | Your representative votes for a new leader unless Jeffries promises, in public, to stop Israel's integration into the US military. | Your representative votes for a new leader unless Jeffries promises, in public, to every condition below. |
| 9 | Leadership ask, Senate (`senate-leader.yaml` `what_we_want`) | Your senator votes for a new leader unless Schumer promises, in public, to stop Israel's integration into the US military and to oppose a new long-term weapons deal with Israel. | Your senator votes for a new leader unless Schumer promises, in public, to every condition below. |
| 10 | Conditions, both leadership goals (`conditions`, new) | — | Stop Israel's integration into the US military (topic: israel) · Oppose a new long-term weapons deal with Israel (israel) · Refuse AIPAC and every Israel-lobby PAC's money, and ask the caucus to do the same (lobby_money) · No new war without a vote of Congress (wars) · Whip the caucus for Medicare for All, or the public option the caucus has already voted for (healthcare) |
| 11 | CLAUDE.md §Don'ts first bullet | Don't aim a feature at "cut aid" alone. The live decision points are the NDAA integration sections… | Don't aim a feature at a tie in the abstract. Every goal names the vote, leadership ballot, treasurer decision or primary it targets and the topics it is about; the live Israel decision points are the NDAA integration sections (219/1217), the 2028 MOU replacement, named appropriations votes and primaries. |

Row 10's conditions are proposals; the owner sets the list. Each needs a
`source_url` before it publishes (a vote, a statement or a filing that
shows the leader on the wrong side), or it carries none and the goal
page marks it "position unsourced". Row 10 names no bill number.

### 2. Topics on goals
`data/goals/*.yaml` gains `topics`: a list of one or more of `israel`,
`lobby_money`, `wars`, `healthcare` (the `TOPICS` constant in
`worker/src/types.ts` with the row 2 labels; adding a topic is one entry
there and one in `data/README.md`). The loader fails the seed and the
build on a goal with no `topics` or an unknown one, naming the goal.
Today's rows: `ndaa-1217`, `ndaa-report-vote` → `[israel, wars]`;
`house-caucus`, `senate-leader` → the topics of their conditions;
`state-bonds` → `[israel]`. D1 `goals.topics` holds the JSON list; the
route and goal payloads carry it. Landing and `/goals` cards show the
topic labels as small text under the `CATEGORY` chip (not a second chip
row); the goal page shows them under the title. The ranking is
unchanged: topics do not affect which two goals a caller sees.

### 3. Conditions on leadership asks
A `leadership` goal gains `conditions`: a list of `{topic, text,
source_url?, source_date?}`; the loader requires ≥1 and a known topic,
and rejects a non-leadership goal that carries it. The goal page renders
"What we want" as the `what_we_want` sentence followed by the conditions
as a list, each with its topic label and a "source" link (or "position
unsourced"). The act page's "Not sure what to say?" panel gets one
`reasons` angle per condition topic, written by the maintainer in YAML
as today. The standard script's ask line keeps `what_we_want` and
appends the conditions as "that means: …" joined with semicolons
(`worker/src/standard.ts`, same text as the goal page). The generation
prompt lists the conditions after the ask so a model-drafted script can
name the one the caller wrote about; the leader line and all limits are
unchanged.

### 4. The screen accepts the mission
`screenSystemPrompt` gains the mission line and the topic labels and
redefines `ok` as: about this goal, about any of the site's ties, about
this official's record (votes, money taken, statements) on any of them,
or the writer's own reason to care. `off_topic` becomes: none of those
(a product complaint, another country's politics, a request unrelated to
Congress). `injection` and `harmful` are unchanged. An `off_topic`
screening no longer counts toward the three-in-24-hours device block
(Open question 2); `injection` and `harmful` still do. A fixture test
runs the screen prompt's wording through the existing screen tests with
three new cases: a healthcare reason on the defense-bill goal (ok), an
AIPAC-money reason on the Senate leader goal (ok), and a complaint about
the website (off_topic).

### 5. Docs and FAQ follow
`README.md` line 3 and `/about`'s first paragraph carry row 1;
`data/README.md` documents `topics` and `conditions`; CLAUDE.md §Repo
map's first line and §Don'ts carry rows 1 and 11. `faq-and-structured-data`
answers 9 and 10 and the `Organization` description reuse row 1 verbatim.

## Data & contracts
- `data/goals/*.yaml`: `topics` (required list), `conditions`
  (leadership only); `worker/schema.sql` `goals.topics TEXT NOT NULL`
  and `goals.conditions TEXT` (JSON), seeded by `scripts/seed.ts`.
- `worker/src/types.ts`: `TOPICS`, `Topic`, `Goal.topics`,
  `Goal.conditions`, `MISSION`.
- `/api/route` goal payload and the goal-page props carry `topics`
  (and `conditions` for leadership goals). No new endpoint.
- Screening rows are unchanged; the block query filters by class.

## Spec delta
- MODIFIED `docs/specs/action-router.md` §Behavior 1: landing eyebrow, H1, subhead, title and description → §1 rows 3–7; each card shows its topic labels under the category chip.
- MODIFIED `docs/specs/goal-pages.md` §Behavior 2: a goal carries `topics` (shown under the title) and a leadership goal a `conditions` list rendered under "What we want" with sources; §Data & contracts: the two YAML fields and D1 columns.
- MODIFIED `docs/specs/standard-scripts.md` §Behavior 3: a leadership goal's ask line appends its conditions as "that means: …".
- MODIFIED `docs/specs/personalised-documents.md` §Behavior 2: the screen's `ok` and `off_topic` definitions carry the mission and the official's record; `off_topic` does not count toward the 24-hour device block; the generation prompt lists a leadership goal's conditions.
- MODIFIED `docs/specs/member-pages.md` §Behavior 3: a member's goal rows show the goal's topic labels.

## Acceptance criteria
- [ ] Every string in §1 renders exactly as the signed-off Proposed
      column; `grep -ri "military ties with israel"` over the built site
      finds only goal and FAQ text that names Israel as a topic.
- [ ] A goal YAML without `topics`, or with an unknown topic, or a
      non-leadership goal with `conditions`, fails `scripts/quiet-check.sh
      build` and `npm run seed` naming the goal.
- [ ] Both leadership goal pages list every condition with its topic
      label and source link; the standard script for each carries the
      "that means: …" line; the two goal-page and script tests pin it.
- [ ] The three new screen cases pass; a healthcare reason typed on the
      defense-bill act form produces a script (not a 422) in the preview.
- [ ] Three `off_topic` screenings in 24 hours do not block the device;
      three `injection` screenings still do (worker test).
- [ ] `/results` ranking for the three fixture addresses is unchanged.
- [ ] Landing stays ≤100 KB transferred; LCP unchanged (labels are text).

## Rollout & metrics
No flag; one PR per section in order (§1 strings and §5 docs can land
with §2). Measure: screened-out `off_topic` rows per week in the digest
before and after §4 (today's rate is the baseline the first digest after
merge records).

## State (updated 2026-11-13)
- Sections: (build order; `[ ]` todo · `[~]` in progress · `[x]` merged · `[!]` blocked: reason)
  - [ ] 1. Mission strings
  - [ ] 2. Topics on goals
  - [ ] 3. Conditions on leadership asks
  - [ ] 4. The screen accepts the mission
  - [ ] 5. Docs and FAQ follow
- Completed: none.
- Branch / open PRs: `docs/mission-and-topics` (this PRD).
- Remaining: all; blocked on Open question 0.
- Next action: owner edits §1 in the PR; then `/implement-prd-section` 1.

## Open questions
0. `[blocking]` Owner sign-off on every §1 string, including the
   condition list (row 10). Proposal: the owner edits the column in this
   PR; when accepted, Status becomes READY and §1 may start.
1. Topic set: `israel`, `lobby_money`, `wars`, `healthcare`. Is a fifth
   needed now (e.g. `labor`, `climate`)? Proposal: no; a topic is added
   when its first goal is written, in that goal's PRD.
2. Should `off_topic` stop counting toward the 24-hour block? Proposal:
   yes; the block exists for injection and abuse, and a wrong `ok`
   costs one model call, which the per-device and daily caps already
   bound.
3. Does "Kick out Jeffries / Schumer" stay the title once the ask has
   five conditions? Proposal: yes; the summary and the conditions carry
   the conditions, the title stays the frame that spread.

## Changes
- 2026-11-13 — created (DRAFT, blocking: owner mission sign-off) from
  the owner's decision to widen the mission beyond US ties with Israel.
