# Call the right office — PRD
Status: READY 2026-11-10 (auto) · Owner: George Nguyen · Last updated: 2026-11-10

## Problem
Every call action today is a vote or leadership ask, and those belong to a
member's DC office. The act page still offers both numbers with "Either
number works and both log your call", and lists the district number
**first** whenever DC is closed (after 15:00 for a Pacific caller). Goal and
results cards print a "District: <city> <phone>" line under the DC call
square with no hint which to use. On 2026-11-10 a constituent who called
Rep. Correa's district office about the House leadership vote was told only
DC handles it and the message would not be passed on. Advocacy guidance
agrees: calls about a vote or a timely issue go to the Washington office;
district offices do casework and local issues
(`docs/research/call-office-routing.md`).

## Goals / Non-goals
- Goals:
  - Each call action names the office that handles its ask, and every
    surface that shows a number for that ask shows that office's number
    only.
  - A closed DC office stays the target: the caller is told voicemail
    counts, and the email fallback takes over, instead of being sent to
    the district office.
  - Data, not code, decides the office, so a future local ask (an office
    visit, casework) can route to the district office.
- Non-goals:
  - `/m/<id>` member pages keep both numbers: they are a general contact
    page, not an ask. The DC button is already first and primary.
  - The whip table already shows the DC number only; no change.
  - The state treasurer target has one number; no change.
  - No per-staffer routing (asking for the defense LA or chief of staff)
    in the UI; scripts may say it.

## Research (what the best products do → adopt / adapt / reject)
Relies on: [call-office-routing](../research/call-office-routing.md)
| Pattern | Seen in | Verdict | Why |
|---|---|---|---|
| "Calling about a vote? Always call the Washington office" | UCS, ANCOR advocacy guides | Adopt | Every current congressional ask is a vote or leadership vote |
| District office for casework and local issues | CRS R44696, AAPM&R | Adopt as the `district` value | Keeps the door open for local asks without misrouting today's |
| District number first when DC is closed | our `call-follow-through` (from action-conversion-levers) | Reject for `dc` asks | A live person in the wrong office loses the message; a DC voicemail is tallied |
| Show both numbers, let the caller pick | our act page and target cards today | Reject | The caller cannot know which office handles the ask |

## Users
Callers reaching their own members from the act page, `/results` and the
goal page "Who to call" stack. Most are first-time callers who will dial
whatever number is shown first.

## Expected behavior
### 1. Route each call to the action's office
1. **Office per action.** Each `data/actions/*.yaml` call action has
   `office: dc | district`. Missing means `dc`. All five current actions
   resolve to `dc` (the treasurer action ignores it: one number).
2. **Act page (`/goals/<slug>/act/<action>`), `dc` action.** The call row
   shows one button, "Call Rep./Sen. <name> · <DC phone>", with its
   open/closed chip. No "District office" button, no "Either number
   works" line, no "DC office closed; district office answers" line. When
   the DC office is closed, the line under the button reads "The DC office
   is closed. Leave a voicemail with your name and street address; offices
   count every message." and the email affordance is promoted to the
   primary "The office is closed. Email instead" button (today's
   one-number rule). A member with no DC phone on file shows the Capitol
   switchboard, 202-224-3121, labelled "Capitol switchboard", which
   connects to the DC office. (`tap-receipts-everywhere` §3 later
   attaches its tap receipt to this one button, the switchboard button
   and the "Email instead" button; nothing here waits for it.)
3. **Act page, `district` action.** The call row shows the district
   office number only, with its state-hours chip; the closed copy reads
   "The district office is closed." with the same email promotion. (No
   action uses this yet; covered by a test fixture.)
4. **Target cards (`/results`, `/results/<goal>`, goal page "Who to
   call").** The call square dials the number of the office the goal's
   call action names. The "District: <city> <phone>" line is not rendered
   for a `dc` action. For a `district` action the square dials the
   district number and no DC line is added.
5. **Receipts.** `POST /api/receipt` and the office-keyed repeat logic are
   unchanged; the office key is whichever office the caller dialled.
6. **Edge cases.** A member-elect (no phone) keeps the contact link. A
   goal with more than one call action uses each action's own office on
   its act page; cards use the goal's first call action by `order`.

### 2. Owner check on a phone
On production, from a phone with a CA-46 address: the act page for
`house-caucus-call` before and after 15:00 PT and the `/results` cards
match the Acceptance criteria; the owner notes the result in State.

## Data & contracts
- `data/actions/*.yaml`: optional `office: dc | district` (default `dc`).
  Seed validation rejects any other value.
- D1 `actions.office TEXT NOT NULL DEFAULT 'dc' CHECK (office IN
  ('dc','district'))` in `worker/schema.sql`; `worker/scripts/seed.ts`
  writes it.
- `worker/src/generate.ts` `TargetContact.phones`: only the action's
  office number (`dc` → `[dc_phone ?? SWITCHBOARD]`, `district` →
  `[district phone]`); adds `office: 'dc' | 'district' | null` (null for
  treasurer and member-elect) so the client labels and picks the hours
  zone without guessing from array position.
- `worker/src/route.ts` `TargetCard`: `phone` is the routed office's
  number; `district_phone`/`district_city` are null when the goal's call
  action is `dc`.
- `web/src/components/ActForm.tsx` `phoneOrder` keys on `office`, not on
  index; the two-number branch is removed.

## Spec delta
- MODIFIED `docs/specs/personalised-documents.md` §Behavior 4: "`tel:`
  links for every phone on file … with two numbers each button names its
  office … either works and both log the call; when the DC office is
  closed the district number is listed first" → one `tel:` link for the
  office the action names (`dc` default, Capitol switchboard when no DC
  phone); when it is closed, the voicemail line and the one-number email
  promotion.
- MODIFIED `docs/specs/personalised-documents.md` §Data & contracts:
  `target.phones[]` holds only the routed office's number; `target.office`
  added.
- MODIFIED `docs/specs/target-cards.md` §Behavior 1: the district office
  line renders only for a `district` action; the call square dials the
  routed office.
- MODIFIED `docs/specs/target-cards.md` §Data & contracts: `TargetCard`
  `phone` is the routed office's number; `district_phone` null for a `dc`
  action.
- MODIFIED `docs/specs/action-router.md` §Data & contracts: actions gain
  `office: dc | district` (YAML optional, D1 default `dc`).

## Acceptance criteria
- [ ] `/goals/house-caucus/act/house-caucus-call` for CA-46 at 16:00 PT
      on a weekday: one call button, 202-225-2965, chip "Closed · opens
      Mon 06:00" style, voicemail line shown, primary "The office is
      closed. Email instead"; no district number anywhere on the page.
- [ ] Same page at 10:00 PT: one call button, chip "Open now", no
      voicemail line, "I can't call right now" link.
- [ ] `/goals/senate-leader/act/senate-leader-call` and both NDAA actions:
      only DC numbers, at any hour.
- [ ] `/results` and the goal page "Who to call" for CA-46: no "District:"
      line on any card; each call square's `title` is the DC number.
- [ ] `/goals/state-bonds/act/state-bonds-call`: unchanged, the
      treasurer's one number.
- [ ] A fixture action with `office: district` renders only the district
      number on the act page and card (unit test).
- [ ] Seeding an action with `office: capitol` fails with a message naming
      the file.
- [ ] A member with no DC phone shows the switchboard button.
- [ ] `/m/<id>` still shows both buttons (non-goal, regression check).
- [ ] Landing ≤100 KB transferred and `/api/route` ≤2 s p95 unchanged
      (no new requests; payload shrinks).

## Rollout & metrics
No flag. One D1 migration (column with default), applied by the deploy
seed. Shares `Target.tsx` and `ActForm.tsx` with
`tap-receipts-everywhere` (merged, PR #93): this PRD lands first of the
three open PRDs (then `leadership-card-two-goals` §2–5, then
tap-receipts), it is small and the House caucus vote is about
2026-11-18; §1.4 removes the cards' district line, so tap-receipts wires
no handler to it. Measure: share of
call receipts reported `no_answer` or `other` on leadership goals in the
week before and after (from `POST /api/report`); expect fewer "wrong
office" reports in `other`.

## State (updated 2026-11-10)
- Sections:
  - [ ] 1. Route each call to the action's office
  - [ ] 2. Owner check on a phone
- Completed: PRD and research.
- Folded: none.
- Branch / open PRs: PRD merged in PR #95; cohesion pass with
  `leadership-card-two-goals` and `tap-receipts-everywhere` in
  `docs/one-shot-plan`.
- Files changed (file:line map): none yet. Build touches
  `data/actions/*.yaml`, `worker/schema.sql`, `worker/scripts/seed.ts`,
  `worker/src/generate.ts:168-179`, `worker/src/route.ts:18-23,103-123`,
  `web/src/components/ActForm.tsx:63-72,395-408`,
  `web/src/components/Target.tsx:106,142-144` and their tests.
- Tests run + result: none (docs only).
- Remaining: both sections.
- Decisions since last update: owner 2026-11-10 (cohesion pass): lands
  first in the order `call-the-right-office` §1 → `leadership-card-two-goals` §2–5 → `tap-receipts-everywhere` §1–6 + §9 → `tap-receipts-everywhere` §7–8; the act page's single button is
  where tap-receipts §3 attaches its tap receipt.
- Known failures / blockers: none.
- Next action: `/implement-prd-section call-the-right-office`.

## Open questions
1. Should the act page tell DC callers to ask for a named staffer
   ("the legislative assistant for defense" for NDAA asks, "the chief of
   staff" for leadership)? Proposal: no UI change; add the line to the
   action's `prompt`/standard script in a later data-only PR.
2. Should `/m/<id>` label the district button "Local issues and
   casework"? Proposal: no; it is outside the ask flow, and the label
   adds copy without a decision behind it.

## Changes
- 2026-11-10 — created (READY, auto: no blocking questions).
- 2026-11-10 — cohesion pass with `leadership-card-two-goals` and
  `tap-receipts-everywhere`: landing order fixed (this PRD first);
  §1.2 notes where the tap receipt attaches later; rollout note updated
  (tap-receipts PRD is merged). No behaviour change.
