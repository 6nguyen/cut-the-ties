# 2028 primary picks — PRD
Status: READY 2026-11-13 (§1 gated: counsel) · Owner: George Nguyen · Last updated: 2026-11-13

## Problem
The 2028 primary goal shipped as a sourced record with no candidate
advocacy (`archive/2026-11-primary-2028.md`, PR #29, spec
`docs/specs/electoral-record.md`). Whether the site may also name a
challenger depends on a legal answer the owner does not have: whether
naming one on an uncompensated personal website falls under the FEC's
individual internet-activity exemption, and whether the site's Stripe
donations, if spent on such content, could make it a political
committee. Until a written answer from a campaign-finance lawyer or the
FEC information line is recorded here, no candidate name appears
anywhere in the repo. This was split out of the shipped PRD instead of
holding it open on counsel.

## Goals / Non-goals
- Goals: once counsel answers, either picks with a disclosure line, or a
  link to the state's candidate filing list, on every electoral card.
- Non-goals: endorsements beyond a sourced rationale; any electoral card
  before a member carries `target_2028 = 1` (a `data/` PR citing a
  recorded roll call, `data/README.md`).

## Users
Visitors whose House member is a 2028 target.

## Expected behavior
### 1. Picks (blocked until counsel answers)
1. If permitted: `our_picks` as on the Senate leader goal, each with
   rationale, source and signal date, and a disclosure line on the card
   and `/about`.
2. If not permitted: no picks; the card links the state's candidate
   filing list instead.

## Spec delta
Moved from `archive/2026-11-primary-2028.md`:
- MODIFIED `docs/specs/electoral-record.md` §Behavior 4 (Ask): adds the
  picks with the disclosure line (permitted) or the filing-list link (not
  permitted).

## Acceptance criteria
Moved from `archive/2026-11-primary-2028.md`:
- [ ] The electoral card contains none of: vote for, vote against,
      support, oppose, elect, defeat, re-elect (grep test over the build
      output; `electoral.test.ts` already covers `data/` and templates).
- [ ] If picks are permitted, the disclosure line is on the card and on
      `/about`; if not, no candidate name appears anywhere on the site
      (grep test over the build output).
- [ ] Performance budget: unchanged (≤100 KB per page).

## Rollout & metrics
No flag. Lands only after counsel's answer is recorded in Open question 1.

## State (updated 2026-11-13)
- Sections: (build order; `[ ]` todo · `[~]` in progress · `[x]` merged · `[!]` blocked: reason)
  - [!] 1. Picks (blocked until counsel answers) · blocked: no written campaign-finance answer recorded in Open question 1
- Completed: none here; §1 of the primary goal is in `archive/2026-11-primary-2028.md`.
- Branch / open PRs: none.
- Remaining: §1.
- Known failures / blockers: counsel; no member carries `target_2028 = 1` yet.
- Next action: the owner records counsel's answer in Open question 1; then `/implement-prd-section docs/prd/primary-2028-picks.md` §1.

## Open questions
1. Counsel's answer (from `archive/2026-11-primary-2028.md` Open question
   1, decided 2026-11-04 by the owner: §1 stays `[!]` until it is
   recorded here). Proposal: nothing from §1 ships before the answer is
   recorded; the owner records it with its date and source.

## Changes
- 2026-11-13 — created by splitting §2 (picks) out of
  `archive/2026-11-primary-2028.md` (`docs/prd/README.md` Lifecycle 5);
  READY (auto), gated on counsel.
