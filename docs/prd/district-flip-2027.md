# District flip to the 120th Congress — PRD
Status: READY 2026-11-13 (§1 gated: not before 2027-01-03) · Owner: George Nguyen · Last updated: 2026-11-13

## Problem
The 120th Congress is seated on 2027-01-03, and several states vote under
new House maps. The site is pinned to the 119th map until then. Both
district sets already ship (`web/public/districts/` = cd119,
`web/public/districts-120/` = cd120 with Missouri kept on cd119) and the
switch is three constants (`archive/2026-11-district-vintage-rollover.md`,
PR #32). What is left is the dated flip itself, about half a day of work
that cannot start before 2027-01-03. It was split out of the shipped
rollover PRD instead of holding that PRD open for seven weeks.

## Goals / Non-goals
- Goals: on 2027-01-03, both the Worker and the browser answer with
  120th-Congress districts in one PR whose revert is the rollback.
- Non-goals: rebuilding geometry, changing the Missouri override,
  deleting the cd119 files in the flip PR.

## Users
Every visitor who enters an address or taps "use my location".

## Expected behavior
### 1. Dated flip
Follow `docs/guides/deploy.md` §6 on or after 2027-01-03:
1. Merge the roster PR first (roster-freshness §4: `left_office` set on
   departed members, `import-members` re-run for the 120th).
2. One PR: `ACTIVE_CONGRESS = 120` in `web/src/lib/pip.ts`;
   `DISTRICT_VINTAGE = "Current_Current"` in `worker/wrangler.jsonc`
   `vars` and `.env.example`; `SEATS_CONGRESS = 120` in
   `worker/src/districts.ts`; overrides unchanged; flip the two
   "ACTIVE_CONGRESS picks the directory" assertions in
   `web/src/lib/pip.test.ts`. Fixture 120 is the gate.
3. On the day, `npx tsx scripts/probe-districts.ts --set 120` prints zero
   mismatches against `Current_Current` (Census can re-cut the layer).
4. One deploy later, a second PR deletes the cd119 files, never in the
   flip PR. Rollback: revert the flip PR; both sets are still deployed.

## Spec delta
- MODIFIED `docs/specs/action-router.md` §Behavior 3 (Lookup):
  "`ACS2025_Current` = 119th map until 2027-01-03" → `Current_Current` =
  120th map since 2027-01-03, Missouri still overridden.
- MODIFIED `docs/specs/deployment.md` §Behavior: the `DISTRICT_VINTAGE`
  row's value becomes `Current_Current`; the flip checklist is marked done.
- MODIFIED `docs/specs/on-device-districts.md` §Behavior 2 (Lookup):
  `ACTIVE_CONGRESS` is 120.

## Acceptance criteria
Moved from `archive/2026-11-district-vintage-rollover.md`:
- [ ] Flipping `ACTIVE_CONGRESS` and `DISTRICT_VINTAGE` in one PR changes
      every fixture-120 point and no cd119 test; reverting restores the
      old answers with no rebuild.
- [ ] Landing ≤100 KB transferred: the active set loads only its own
      state file; the inactive directory is never requested.
      `/api/route` p95 ≤2 s including the Missouri re-query. Static
      hosting cost $0 with both sets (≈+1.25 MB gzip).
- [ ] `scripts/quiet-check.sh test`, `test-web` and `build` green.

## Rollout & metrics
No flag: the flip PR is the rollout and its revert the rollback. Watch
`/api/route` errors for the first day.

## State (updated 2026-11-13)
- Sections: (build order; `[ ]` todo · `[~]` in progress · `[x]` merged · `[!]` blocked: reason)
  - [!] 1. Dated flip · blocked: not before 2027-01-03, and after the roster PR
- Completed: none here; §1–2 of the rollover are in `archive/2026-11-district-vintage-rollover.md`.
- Branch / open PRs: none (the flip gets its own branch on 2027-01-03).
- Remaining: §1.
- Known failures / blockers: date gate; roster-freshness §4 PR must merge first.
- Next action: on 2027-01-03, `/implement-prd-section docs/prd/district-flip-2027.md` §1 following `docs/guides/deploy.md` §6.

## Open questions
None.

## Changes
- 2026-11-13 — created by splitting §3 (dated flip) out of
  `archive/2026-11-district-vintage-rollover.md` (`docs/prd/README.md`
  Lifecycle 5); READY (auto), gated on the date. The original said
  `wrangler.toml`; the file is `worker/wrangler.jsonc`.
