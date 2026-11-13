# Android share test — PRD
Status: TESTING (§1 needs an Android phone; the owner has none) · Owner: George Nguyen · Last updated: 2026-11-13

## Problem
The poster share after a receipt (`docs/specs/social-sharing.md`) shipped
in PR #67 and passed on an iPhone on 2026-11-08: the file-only share sheet
offered Instagram Story, Post, Reel and Message, and each opened with the
poster. It has never run on Android. Chrome and Samsung Internet hand files
to the share sheet through their own code paths, so nobody knows whether
Instagram is listed there, which composers it offers, or whether drawing
and encoding the poster fits the 300 ms budget on a mid-range phone. The
owner has no Android phone, which is why this was split out of the
shipped PRD (`archive/2026-11-social-sharing.md`) instead of holding it
open.

## Goals / Non-goals
- Goals: one recorded Android run in Chrome and Samsung Internet; a final
  value for `SHARE_PAYLOAD` in `web/src/lib/poster.ts`; a measured phone
  draw + encode time.
- Non-goals: any new share target, poster change or copy change; the
  button label (`one-screen-receipt` fixed it, so `POSTER_LABEL` is gone).

## Users
The owner, or one volunteer with an Android phone and Instagram signed in.

## Expected behavior
### 1. Android device test
1. On an Android phone with Instagram installed and signed in, open
   `https://cutthetiesmovement.org/` in Chrome, enter an address, make a
   call and reach the receipt. Tap the poster share button.
2. Record: is Instagram in the share sheet; which composers it offers
   (Story, Feed, Message, Reels); does each open with the poster loaded.
3. Repeat in Samsung Internet.
4. If Instagram is missing or opens empty, set `SHARE_PAYLOAD` to
   `'files+title'` on a branch, open its preview, and repeat 1–3. Keep
   whichever value works; if neither does, record that and keep `'files'`.
5. Measure draw + encode once in Chrome with remote debugging (Performance
   panel, from the share tap to the sheet opening) and the act page's LCP.
6. Log one dated line per browser in `## Changes`, with the Android,
   browser and Instagram versions.

## Spec delta
- none — `docs/specs/social-sharing.md` already describes the shipped
  file-only payload; if §1.4 switches it, that PR MODIFIES the payload
  line of `docs/specs/social-sharing.md` §Behavior.

## Acceptance criteria
Moved from `archive/2026-11-social-sharing.md`:
- [ ] On an Android phone with Instagram installed (Chrome and Samsung
      Internet), the primary button opens the OS share sheet with
      Instagram listed, and choosing it offers at least the feed composer
      with the poster loaded; the composers offered are logged in
      `## Changes`.
- [ ] Draw + encode ≤300 ms on a mid-range Android; the act page's LCP
      is unchanged. (Landing 38.5 KB and the 1.8 KB gzip poster chunk were
      measured in PR #69 and still hold.)

## Rollout & metrics
No flag. A payload change ships as a one-line PR. The digest's "routes by
via" line is the metric, as before.

## State (updated 2026-11-13)
- Sections: (build order; `[ ]` todo · `[~]` in progress · `[x]` merged · `[!]` blocked: reason)
  - [!] 1. Android device test · blocked: needs an Android phone with Instagram (Open question 1)
- Completed: none here. The shipped feature and its iPhone run are in `archive/2026-11-social-sharing.md`.
- Branch / open PRs: none.
- Remaining: §1.
- Known failures / blockers: no Android phone available to the owner.
- Next action: the owner finds a tester (Open question 1) and pastes the results; then `/implement-prd-section docs/prd/android-share-test.md` logs them, sets `SHARE_PAYLOAD` if needed, ticks the criteria and archives this PRD.

## Open questions
1. Who runs it? Proposal: one volunteer with an Android phone follows
   §1.1–1.3 on the live site (about five minutes) and sends screenshots;
   §1.4–1.5 only if the first pass fails. A cloud device lab (BrowserStack,
   LambdaTest) is the fallback, but it needs a signed-in Instagram account
   on a shared device, so it is second choice.

## Changes
- 2026-11-13 — created by splitting the Android run out of
  `archive/2026-11-social-sharing.md` (`docs/prd/README.md` Lifecycle 5);
  no blocking questions, READY (auto), Status TESTING because only
  verification remains.
