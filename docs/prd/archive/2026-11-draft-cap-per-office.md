# Draft cap per office — PRD
Status: SHIPPED 2026-11-08 (PR #78) · Owner: George Nguyen · Last updated: 2026-11-08

## Problem
`/api/generate` allows 3 drafts per device per action per 24 hours
(`LIMITS.device_action_day`, `worker/src/generate.ts`) and answers the
fourth with 429 `limit_action`. The cap was sized as "exactly one call per
target" (`docs/prd/archive/2026-11-call-follow-through.md`), so on an ask
with three offices (both senators and the representative:
`ndaa-1217-call`, `ndaa-report-vote-call`) a caller who drafts one script
per office has no draft left to reword any of them, and on a one-office ask
the fourth press is a dead end. On 2026-11-08 the owner hit it on the
production act page for `house-caucus-call`: the page showed no script and
a message they could not interpret. The hourly limit (5 per device) stops
the same caller even earlier on a three-office ask. A code-built template
script already exists for every active action and costs nothing
(`docs/specs/standard-scripts.md`), but it only runs when the model may not
run for everyone (cap, budget, no key, upstream failure); a caller past
their own limit gets an error instead of that script.

## Goals / Non-goals
- Goals:
  - A caller gets 3 personalised drafts for each office on each ask per
    24 hours, so a three-office ask allows nine.
  - A caller past that cap gets the template script, labelled, never an
    error.
  - Model spend per device stays bounded by the existing 20-per-day and
    30-per-IP limits and the global daily cap; no new cost.
- Non-goals:
  - Raising the 20-per-device-per-day, 30-per-IP-per-day or global caps.
  - Showing the caller the clock time at which personalised drafts
    reopen (the why line states the limit and the 24-hour window).
  - Storing why a template row was served; `generations` keeps
    `model = 'standard'` and nothing more.
  - Changing receipt limits (`/api/receipt`) or the email step.

## Research (what the best products do → adopt / adapt / reject)
| Pattern | Seen in | Verdict | Why |
|---|---|---|---|
| Past a personal usage limit, serve a cheaper deterministic or smaller answer instead of an error | ChatGPT free tier (falls back to a smaller model) | adopt | The caller still leaves with a usable script; the limit protects spend, not the action |
| One fixed script per issue for every caller, no cap | 5 Calls | adapt | The template is the floor every caller can always reach; personalised drafts sit on top of it |
| Hard 429 with a wait time | Public APIs | reject for the per-office cap, keep for the day and IP limits | A dead end at the moment of a call loses the call; the two hard limits remain as the abuse bound |

## Users
A constituent on the act page, usually on a phone, about to call one to
three offices. They reword a script because the first one did not sound
like them; they do not track limits and must never have to. The copy
says what happened and that the script in front of them is usable now.

## Expected behavior

### 1. Per-office cap with template fallback
1. **Count.** The cap counts `generations` rows for this device hash,
   this action and this target written by a model (`model` is not
   `'standard'`) in the last 24 hours, rolling. Refused model drafts
   count (they cost tokens). Template rows do not count.
2. **Under the cap (0–2 counted rows).** Nothing changes: screen, draft,
   output check, stream.
3. **At the cap (3 counted rows).** The request is not rejected. The
   standard decision sets `reason: limit` and the route serves the
   action's standard script on the same SSE stream with no Anthropic
   request, exactly as for `capacity`. The act page shows the existing
   "Standard script — not personalised today" label and this why line:
   "You have had 3 personalised drafts for this office in the last 24
   hours, which is the limit, so this one is built from our template
   with your lines dropped in." Receipt, commitment, captain, share,
   email step and report are unchanged.
4. **Reason precedence.** `budget`, then `unconfigured`, then `limit`,
   then `capacity`; `upstream` is decided later, as today.
5. **Other offices and asks.** Each office on an ask has its own count:
   three drafts for one senator leave the other senator and the
   representative at zero. The same office on a different ask also has
   its own count.
6. **Regenerate button past the cap.** An action composed from script
   blocks (`house-caucus-call`, `senate-leader-call`) keeps "Another
   version": each press sends a new seed and returns a different
   template script. An action with a plain template returns the same
   text for the same fields, so with `reason: limit` the regenerate
   button is not rendered; Copy, Download and the form (to change the
   fields) remain.
7. **Hourly limit removed.** `limit_hour` (5 per device per hour) is
   deleted. It never bounded daily spend (the day limit is 20 either
   way) and it stops a three-office caller at the sixth draft, before
   the per-office cap can apply.
8. **Hard limits kept.** 20 requests per device per 24 hours
   (`limit_day`) and 30 per IP per 24 hours (`limit_ip`) still answer
   429 and still count every row, template rows included, so a looped
   client cannot write unbounded rows. Their messages and their place
   beside the pressed button are those of PR #68.
9. **Global daily cap.** `global_day` counts model rows only. A template
   row costs $0, and with template rows now reachable by any caller past
   their cap, counting them would spend the day's model cap (floor 20)
   on scripts that used no model.
10. **Edge cases.** A device with no prior rows, a member-elect target
    and a state target follow the same count by `target_id`. A template
    fill that fails the output check returns `error {refused}` as today.
    When the oldest counted row passes 24 hours, the next request is
    personalised again with no action from the caller.

## Data & contracts
- `LIMITS` (`worker/src/generate.ts`): remove `device_hour` and
  `device_action_day`; add `device_target_day: 3`. `device_day: 20` and
  `ip_day: 30` unchanged.
- `Repo.generationCounts(deviceHash, ipHash, actionId, targetId, now)`
  returns `{device_day, device_target_day, ip_day, global_day}`
  (`worker/src/types.ts`, D1 and `MemoryRepo` in `worker/src/repo.ts`):
  `device_target_day` = rows with this device, action and target and
  `model != 'standard'` in 24 h; `global_day` = rows with
  `model != 'standard'` in 24 h. Still one `SELECT` over the last 24
  hours of `generations`; no schema change, no migration, no new index.
- `StandardReason` gains `'limit'`; it travels in `status {stage:
  'standard', reason}` and `done.reason` like the others.
- `POST /api/generate` 429 errors become `limit_day | limit_ip`;
  `limit_hour` and `limit_action` no longer exist.
- `web/src/components/ActForm.tsx`: `STANDARD_WHY.limit` (copy in §1.3);
  the regenerate button is omitted when `doc.standard`, `doc.reason ===
  'limit'` and `doc.variant` is absent.
- No persisted client state changes.

## Spec delta
- MODIFIED `docs/specs/personalised-documents.md` §Behavior 2: guardrail
  order "per-device and per-IP limits → standard decision (budget 0, no
  key, or today's count ≥ `dailyCap`)" → "per-device-day and per-IP
  limits → standard decision (budget 0, no key, 3 model drafts for this
  device, action and target in 24 h, or today's model-draft count ≥
  `dailyCap`)".
- MODIFIED `docs/specs/personalised-documents.md` §Behavior 5: reasons
  `capacity | unconfigured | budget | upstream` → add `limit` (the
  caller's own per-office cap), with its why line.
- MODIFIED `docs/specs/personalised-documents.md` §Data & contracts: 429
  `limit_hour | limit_day | limit_action | limit_ip` → `limit_day |
  limit_ip`; limits "5 per device per hour, 20 per day, 3 per device per
  action per day, 30 per IP per day" → "20 per device per day and 30 per
  IP per day (hard, every row), 3 model drafts per device per action per
  target per day (then the standard script)"; the global cap counts
  model rows only.
- MODIFIED `docs/specs/personalised-documents.md` §Invariants: add "the
  fourth request for one office on one ask in 24 h streams the standard
  script with `reason: limit` and makes no Anthropic call; another
  office on the same ask is still personalised".
- MODIFIED `docs/specs/standard-scripts.md` §Behavior 1: "When it runs"
  gains `limit`; "so counts and limits see it" → "so the per-device-day
  and per-IP limits see it; the per-office cap and the global daily cap
  count model rows only".
- MODIFIED `docs/specs/standard-scripts.md` §Behavior 4: the regenerate
  button is not rendered for a plain-template action when the reason is
  `limit`.

## Acceptance criteria
- [x] On a three-office ask, one device drafts three personalised
      scripts for each office (nine requests) inside one hour and none
      is rejected.
- [x] The fourth request for the same office and ask within 24 hours
      returns 200, streams the standard script with `reason: limit`,
      makes no Anthropic request (asserted on the injected fetch) and
      writes one `generations` row with `model = 'standard'` and zero
      tokens.
- [x] After that fourth request, a request for a different office on the
      same ask, and one for the same office on a different ask, are both
      personalised.
- [x] Any number of template rows for an office leaves its count
      unchanged: with two model rows and five template rows in 24 h, the
      next request is personalised.
- [x] 24 hours after the first of three model drafts, the next request
      for that office is personalised.
- [x] A budget of 0 or a missing key reports `budget` or `unconfigured`,
      not `limit`, for a device past its cap.
- [x] Template rows do not move the global count: with the day's cap at
      20 and 19 model rows plus 50 template rows, the next request under
      its own cap is personalised.
- [x] The 21st request from one device in 24 hours, template rows
      included, returns 429 `limit_day`; the 31st from one IP returns
      429 `limit_ip`; no response anywhere carries `limit_hour` or
      `limit_action`.
- [x] Act page, past the cap: the script is shown with the label
      "Standard script — not personalised today" and the §1.3 why line;
      no alert is rendered. On `house-caucus-call` the button reads
      "Another version" and a press returns a different script; on
      `ndaa-1217-call` no regenerate button is rendered and Copy and
      Download work.
- [x] Every number in the why line and in the limit decisions comes from
      `LIMITS` and the SQL count; none from a model.
- [x] Performance: `prepare()` still issues one counts query; the
      template path meets "first streamed token ≤3 s p95" and makes zero
      Anthropic requests; `scripts/quiet-check.sh test` and `tsc` pass.

## Rollout & metrics
No flag, no migration; ships with the Worker and web deploy on merge.
Measure in the daily digest: the standard-script count per action
(`worker/src/digest.ts`) is expected to rise by the requests that used
to be 429s, model cost per day stays under `dailyCap`, and receipts per
drafting device should not fall. Worker logs show no `limit_action` or
`limit_hour` after the deploy.

## State (updated 2026-11-08, PR #78) — ≤30 lines
- Sections: (build order; `[ ]` todo · `[~]` in progress · `[x]` merged · `[!]` blocked: reason)
  - [~] 1. Per-office cap with template fallback · feat/draft-cap-per-office-per-office-cap · PR #78
- Completed: §1 built (code, tests, specs), awaiting merge of PR #78
- Folded: §1
- Branch / open PRs: `feat/draft-cap-per-office-per-office-cap`, PR #78
- Files changed (file:line map): `worker/src/generate.ts:14-21` (`LIMITS`),
  `:479` (`StandardReason`), `:511-526` (limits and standard decision);
  `worker/src/repo.ts:110-126` (D1 counts query), `:419-431`
  (`MemoryRepo`); `worker/src/types.ts:200-205,224`;
  `web/src/components/ActForm.tsx:41-42` (`STANDARD_WHY.limit`), `:356`
  (regenerate button); `worker/test/generate.test.ts:219-322,453-718`;
  `web/src/components/limit.test.tsx:1-138`;
  `docs/specs/personalised-documents.md` §Behavior 2, §Behavior 5, §Data
  & contracts, §Invariants; `docs/specs/standard-scripts.md` §Behavior 1,
  §Behavior 4
- Tests run + result: `tsc` PASS (0 type errors); `test` PASS (372
  passed, 26 files); `test-web` PASS (179 passed, 2 skipped, 25 files);
  `build` PASS; `prd-lint` PASS; `doc-lint` PASS. Template path asserted
  under 3000 ms with zero Anthropic requests and one counts query; the
  D1 `SELECT` checked against sqlite3 with a scratch table
- Remaining: none
- Decisions since last update: the why line's 3 is a literal in
  `ActForm.tsx` (no worker code in the web bundle); `limit.test.tsx`
  asserts it equals `LIMITS.device_target_day`
- Known failures / blockers: none; not checked in a browser
- Next action: merge PR #78; nothing left to build (next: none)
## Open questions
1. Is the cap per office per ask, or per office across all asks?
   Proposal: per office per ask (device + action + target). A
   representative who is the target of two asks would otherwise get the
   template on the second ask from the first press, and the count stays
   a tightening of today's per-action key.
2. Remove the hourly limit, or keep it as a second template trigger?
   Proposal: remove it (§1.7). Worst-case model drafts per device per
   day are 20 with or without it, and keeping it at 5 would make "3 per
   office" unreachable inside an hour on a three-office ask.
3. Should the two hard limits (20 per device, 30 per IP) also fall back
   to the template? Proposal: no. They are the only bound on rows a
   looped client can write, and a real caller reaching 20 requests in a
   day has had a usable script many times over.
4. Should refused model drafts count toward the cap? Proposal: yes; they
   cost tokens, and a caller whose wording keeps failing the output
   check reaches the template, which always passes for valid fields.

## Changes
- 2026-11-08 — created; no blocking questions, APPROVED (auto).
- 2026-11-08 — Status APPROVED → READY. Status word moved to the board vocabulary in `docs/prd/README.md` (READY, IN PROGRESS, DEV COMPLETE, TESTING); no scope change.
- 2026-11-08 — Status READY → IN PROGRESS; §1 build started on `feat/draft-cap-per-office-per-office-cap`.
- 2026-11-08 — §1 built as specified: `device_hour` and `device_action_day` removed, `device_target_day: 3` added, reason `limit` served from the template, global cap counts model rows only. Spec delta folded into `docs/specs/personalised-documents.md` and `docs/specs/standard-scripts.md`. No scope change.
- 2026-11-08 — Status IN PROGRESS → SHIPPED (PR #78); no section left, archived to `docs/prd/archive/2026-11-draft-cap-per-office.md`. `docs/specs/personalised-documents.md` §Behavior 5 points at `standard-scripts.md` Behavior 1 for the reasons and the `limit` why line, to stay under the 16,000-byte spec limit.
