# One-screen receipt: stamped poster, icon share buttons, no funnel steps — PRD
Status: IN PROGRESS 2026-11-08 (§1–§2 merged, PR #77 and #79; §3 in review; §4 to build) · Owner: George Nguyen · Last updated: 2026-11-08

## Problem
The owner's phone test on 2026-11-08 (Chrome on iPhone; Story, Post, Reel
and Message all took the file-only poster) found the screen after "I did
it" unusable as shipped. It is three steps with 5 buttons and 9 inputs
(commit to a date, name three people with a channel each, office
response, a reflection line); the share row is hidden until the first two
are answered or skipped; and the ghost "Send" at the foot only sends the
office response, so the owner read the whole card as one form whose
"Send" would submit everything, and it did not. The poster's "I JUST
CALLED" line reads as a headline, not as a finished action, and the
poster tells the viewer nothing to do. This is the screen every caller on
the military-bill goal (`ndaa-1217`, conference report expected
2026-12-10) sees; the four largest states showed zero counted receipts in
the week to 2026-11-08, so every extra step here costs calls and shares
the goal does not have.

Owner picks from the mockups of 2026-11-08: poster 1B (the countdown's
stamp plus a call to action), stamp text "I CALLED", receipt screen 2B
without the "Counted. No name, no address…" line.

## Goals / Non-goals
- Goals: after "I did it" one screen with one filled button; the poster
  and the screen both carry a stamp that reads as a completed action;
  the poster tells the viewer to call and where; share is three
  icon-and-text buttons (Instagram, copy link, message) visible at once;
  every choice saves on the tap that makes it; the captain list leaves
  the product; no new endpoint, table or cost.
- Non-goals: a share button before the receipt (mockups 1d and 3a were
  not picked; the poster stays a receipt); our own Story / Reel / Post /
  Message picker (a web page cannot open a chosen Instagram composer
  with an image attached; that needs a native app and a Meta App ID,
  which breaks the $0 budget, and Instagram's own chooser already asks
  after the OS sheet); a national or all-time counter; changing the
  receipt limits or the counter threshold; a second poster size.

## Research (what the best products do → adopt / adapt / reject)
Relies on: `docs/research/social-sharing.md`,
`docs/research/action-conversion-levers.md`.
| Pattern | Seen in | Verdict | Why |
|---|---|---|---|
| "I Voted" sticker: a completed act as a badge others see | US polling places, Facebook 2010 (Bond 2012) | adopt | the stamp is the receipt; "I CALLED" plus office and date is checkable and specific |
| Call to action on the shared image itself | Change.org share cards, campaign Story templates | adopt | an Instagram image carries no tappable link; the viewer has to be told what to do and where |
| Platform icon on the share button | Spotify, Strava, NYT share menus | adapt | the Instagram glyph on the poster button; it still opens the OS sheet, with a one-line hint |
| Save on selection, no submit button | iOS settings, Typeform single-choice | adopt | removes the "Send" the owner mistook for the whole card's submit |
| Private commitment and named recruits before any public act | `commitment-funnel.md` §1–4 (Kristofferson 2014, Gollwitzer) | reject (owner decision 2026-11-08) | three screens between the call and the share lost the tester; the private hard act (the call) still comes first and the reminder stays as one link |
| In-app Instagram composer picker | native apps with a Meta App ID | reject | not possible from a web page |

## Users
- A caller on a phone who has just hung up: one glance, one obvious next
  tap, share in two taps.
- A caller who emailed or wrote instead: same screen, stamp "I WROTE".
- A desktop visitor: no share sheet; download, copy link and the four
  intent links as today.
- People with a saved commitment or retry on "Your week": unchanged.
  People with a saved captain list: the list disappears (§4).

## Expected behavior
### 1. Poster: stamp and call to action
1. `drawPoster` keeps the 1080×1920 canvas, the ink background, the acid
   top rule, the band (x 72–1008, y 285–1635) and the chip line. Inside
   the band, top to bottom: chip line, **stamp**, goal title, crimson
   rule, `what_we_want`, and on the band's foot the **call to action**.
   The verb line, the target line and the date line are gone (their
   content moves into the stamp).
2. **Stamp.** One box rotated −4° about its centre, horizontally centred
   in the band: paper (#FFFFFF) fill, 14 px dashed crimson border,
   crimson text, three centred lines: the office (`targetLine`, 40 px
   Space Mono; steps down 2 px at a time to 32 px to fit one line, then
   ends in an ellipsis), the act ("I CALLED" for a call receipt, "I
   WROTE" for a letter, a comment or an emailed script; 200 px Bebas
   Neue) followed by a tick drawn as a stroked path (neither face has
   the glyph), and the date ("NOV 8, 2026", 40 px Space Mono). All four
   rotated corners stay inside the band. Canvas 2D only: rotation, flat
   fill, dashed stroke, text; no grain filter or mask (Safari has no
   canvas filter).
3. **Title, rule, ask.** Unchanged rules: title 96 px, ≤3 lines, 84 px
   when it needs three; 6 px crimson rule; `what_we_want` 44 px Inter,
   ≤2 lines, ellipsis on overflow.
4. **Call to action**, anchored to the band's foot: an acid block the
   full band width with ink Bebas Neue text "YOUR TURN. CALL YOUR REP"
   on one line, and under it an arrow (stroked path, acid) pointing at
   "CUTTHETIESMOVEMENT.ORG" (48 px Space Mono, acid). The block text is
   sized by `measureText` after the fonts load: the largest size from
   120 px down to 72 px in 4 px steps whose width fits the block minus
   32 px padding each side; it is never clipped (the mockup's fixed size
   was cut off). The address line's descenders stay inside the band (its
   baseline sits above the band's foot; today the "g" hangs below the
   feed crop).
5. **Fit.** With a three-line title and a two-line ask the stack still
   clears the call to action by ≥24 px; when it would not, the stamp's
   act line steps from 200 px to 160 px. No text is drawn over other
   text for any goal in `data/goals/`.
6. Never on the poster: unchanged list (name, city, district, phone,
   generated text, office response). Image alt text: "Poster: I called
   <Role Surname>'s office about <goal title>" ("I wrote to …").
7. Until §4 merges, the captain-list poster keeps its two verb and
   target lines in place of the stamp and gains the call to action.

### 2. Receipt screen: one screen
After a successful `POST /api/receipt` the card shows, top to bottom,
with no intermediate step:
1. **Stamp.** The countdown stamp's markup (`countdown-stamp.md` §1)
   reading "I CALLED" + tick, the office and "NOV 8" on one or two
   lines ("I WROTE" as in §1.2), `role="status"`, accessible name "I
   called <Role Name>'s office, <date>". The line "Counted. No name, no
   address: just this goal, this office, today." is removed.
2. **Count line**, only when `/api/counts` returns a district or state
   number at or over the threshold: "You're one of <N> constituents in
   <where> who <verb> this week". With no number nothing renders (the
   "Counted." fallback goes; the stamp says it).
3. **Share block** (§3).
4. **Next office.** The first target of the goal with no receipt from
   this device in 24 h is the screen's only filled button: "Next: call
   <Role Name>'s office →" (same link as today). Further such targets
   follow as bordered buttons. All called: "All three called this
   week." / "All of your targets called this week." One-target goal:
   nothing, and the screen has no filled button.
5. **Office response.** "What did the office say? (optional)" with the
   chips Will support · Undecided · Opposed · No answer · Other. Tapping
   a chip posts `POST /api/report` at once, fills the chip (ink, tick),
   shows "Saved" beside the label and disables the other chips; there is
   no "Send" button. "Other" posts nothing on tap: it opens the 140
   character field with a bordered "Save note" button beside it, which
   posts `other` with the note (Enter does the same). A failed post says
   "Could not save that. Try again." under the chips and re-enables
   them. `no_answer` still shows the voicemail line, "Try again" and
   "Email it instead", both bordered; any other saved outcome still
   shows "Put it in writing (2 min)".
6. **Two text links**, underlined, not boxed: "Remind me before the
   vote (.ics)" ("Remind me to call (.ics)" after a letter, comment or
   emailed script) and "This site is one person's project. Chip in for
   the hosting and the drafts →". The reminder link downloads the
   existing `.ics` for the default date (next weekday 10:00 local, never
   later than the decision date) and stores the same local commitment
   as "Yes, I'll call" did, so "Your week" and the act page nudge are
   unchanged; it then reads "Reminder saved". No date input.
7. Removed from the screen: the commitment step, the captain step, the
   reflection line and "Your other action" as a button (it becomes a
   third text link, "Your other action", to `/results`).
8. **Rules** the screen keeps: at most one filled button; everything
   tappable is a bordered button with the hard shadow except the three
   text links, which are underlined; nothing that is not tappable has a
   border except the stamp's dashed edge; a choice saves on tap.

### 3. Share buttons: icon and text
1. The share block is a 96 px wide thumbnail of the poster (blob URL,
   alt as §1.6) beside three bordered buttons, each a 20 px monochrome
   inline SVG icon plus text, in this order:
   - Instagram glyph (rounded square, circle, dot; ink, no brand
     colours) + "Share": calls `navigator.share` with the poster file
     alone, synchronously in the tap handler, exactly as the poster
     button does today. Rendered only when a file exists and
     `canShare({files})` is true. Under the block one hint line: "Pick
     Instagram, then Story, Post, Reel or Message."
   - Link icon + "Copy link": copies the caption line and the
     `?via=share` link; reads "Link copied" for 2 s. Always rendered.
   - Speech-bubble icon + "Message": hands the sheet the text and URL
     only (today's "Share link"). Rendered only when `navigator.share`
     exists.
2. **No file share** (`canShare({files})` false, no share API, or the
   poster share threw): the Instagram button is replaced by a download
   icon + "Save poster" (`<a download="cut-the-ties-<slug>.png">`, the
   iOS long-press note as today) and a text link "Open Instagram ↗"
   follows the block. "Copy caption" and the 270 px inline poster go
   (the thumbnail and "Copy link" cover them).
3. Intent links (Facebook, X, Threads, Bluesky) are unchanged: from
   1024 px, or whenever `navigator.share` is absent.
4. `POSTER_LABEL` is removed; this replaces the label rule of
   `social-sharing.md` (PRD) §1.2. That PRD's §1 keeps the Android run
   and the `SHARE_PAYLOAD` choice.
5. The share block still renders only after a receipt.

### 4. Retire the captain list
1. `Funnel.tsx`'s commitment and captain steps are deleted (the
   reminder link of §2.6 is all that remains of them).
2. "Your week" no longer shows a captain list, its checkboxes, "Counted:
   one list…" or its "Share"; `cut-ties:captain` is deleted from
   `localStorage` on load. Commitments and retries are unchanged.
3. The poster's "THREE OF US ARE CALLING" lines and `YourWeek`'s poster
   import are deleted.
4. The Worker is unchanged: `POST /api/receipt` still accepts `action:
   captain-list` (cached old clients) and `/api/counts` still returns
   `captain_lists`, which decays to 0 within seven days.
5. Root `CLAUDE.md` §Don'ts line "Don't make a public act the first
   step…" is rewritten in this PR: the funnel is the private hard act
   (call or letter), then the public receipt, with an optional private
   reminder; no share before a receipt.

## Data & contracts
- No new endpoint, table, cookie, environment variable or request.
  `POST /api/report` and `POST /api/receipt` bodies are unchanged.
- `web/src/lib/poster.ts`: `PosterSpec` becomes `{ act: 'called' |
  'wrote', target, title, what, date, url? }` (`verb` goes in §4);
  `Ctx` gains `save`, `restore`, `translate`, `rotate`, `strokeRect`,
  `setLineDash`, `beginPath`, `moveTo`, `lineTo`, `stroke`, `lineWidth`,
  `strokeStyle`, `lineCap`; new exports `CTA = 'YOUR TURN. CALL YOUR
  REP'`, `fitSize(ctx, text, width, from, to, step)`; `POSTER_LABEL`
  removed.
- `web/src/components/ShareRow.tsx`: selectors `[data-share-poster]`,
  `[data-share-copy]`, `[data-share-message]`, `[data-share-save]`,
  `[data-share-thumb]`; `[data-share-link]` and "Copy caption" go.
- `web/src/components/ActForm.tsx`: `[data-receipt-stamp]`,
  `[data-next-primary]`, `[data-outcome-saved]`, `[data-remind]`.
- Persisted client state: `cut-ties:commitments` and
  `cut-ties:receipts` unchanged; `cut-ties:captain` removed (§4).

## Spec delta
- MODIFIED `docs/specs/social-sharing.md` §Purpose: "no share affordance
  before the private commitment and captain steps" → "no share
  affordance before the receipt".
- MODIFIED `docs/specs/social-sharing.md` §Behavior 2: verb line, target
  line and date line → the stamp of §1.2 here, and the URL line → the
  call to action of §1.4–1.5.
- MODIFIED `docs/specs/social-sharing.md` §Behavior 3: poster button,
  "Share link", "Your other action" → thumbnail plus Instagram "Share",
  "Copy link", "Message" and the hint line (§3.1).
- MODIFIED `docs/specs/social-sharing.md` §Behavior 4: inline poster,
  "Download poster", "Copy caption", "Open Instagram" → "Save poster"
  in place of the Instagram button and the "Open Instagram ↗" link.
- REMOVED `docs/specs/social-sharing.md` §Behavior 6 (captain-list
  share).
- MODIFIED `docs/specs/social-sharing.md` §Data & contracts and
  §Invariants: `POSTER_LABEL`, `verb`, `[data-share-link]` out; the
  stamp, the call to action, the fit rule and the new selectors in;
  "nor before the commitment and captain steps" and the captain-list
  invariant out.
- MODIFIED `docs/specs/commitment-funnel.md` §Purpose and §Behavior 1:
  the commitment step → the reminder link of §2.6.
- REMOVED `docs/specs/commitment-funnel.md` §Behavior 2, 4 and 8, the
  captain list in §Behavior 5–6, and the invariants on the captain
  field, the third tick and "no public act precedes the private one"
  (replaced by "no share before a receipt").
- MODIFIED `docs/specs/commitment-funnel.md` §Behavior 10: "Next:" links
  after the funnel steps → first remaining target as the one filled
  button; the echo line renders only with a number.
- MODIFIED `docs/specs/personalised-documents.md` §Behavior (receipt
  tail): commitment line, captain list, picker with "Send", reflection
  line → the order and save-on-tap rules of §2 here.
- MODIFIED `docs/specs/district-counters.md` §Behavior 6–7: `echo` reads
  "Counted." on an empty or failed response → renders nothing.

## Acceptance criteria
- [ ] The poster is 1080×1920 and every glyph, the four corners of the
      rotated stamp and the address line's descenders lie inside x
      72–1008, y 285–1635.
- [ ] A call receipt's poster stamp reads the office, "I CALLED" with a
      tick and the date; a letter, comment or emailed script reads "I
      WROTE". The words "I JUST" appear nowhere on it.
- [ ] "YOUR TURN. CALL YOUR REP" is on one line, fully inside its block
      at whatever size `fitSize` returns, with the arrow and the address
      under it; checked on an iPhone and in desktop Chrome with the web
      fonts loaded and with them blocked.
- [ ] For every goal in `data/goals/` no two text boxes overlap and the
      stack clears the call to action by ≥24 px (unit test over a
      recording context).
- [ ] After "I did it" the screen shows, in order: stamp, count line
      (only with a number), share block, next office, office response,
      three text links; no date input, no name field, no reflection
      field, no "Send", no "Counted. No name, no address…".
- [ ] At most one filled button is on the receipt screen in every state
      (no answer, email step closed, all offices called).
- [ ] Tapping "Opposed" makes exactly one `POST /api/report`, shows
      "Saved" and disables the other chips; "Other" posts nothing until
      "Save note"; a failed post shows the error and re-enables the
      chips.
- [ ] On a phone that shares files: the Instagram-glyph "Share" hands
      the sheet the file alone; "Copy link" puts line + `?via=share`
      link on the clipboard; "Message" hands the sheet text and URL
      only. Without file share: "Save poster" downloads
      `cut-the-ties-<slug>.png` and "Open Instagram ↗" shows.
- [ ] No share control renders before a receipt.
- [ ] "Remind me before the vote (.ics)" downloads a valid `.ics`,
      stores one commitment that appears on "Your week", and makes no
      request.
- [ ] After §4: "Your week" shows no captain list for a browser that
      had one, `cut-ties:captain` is gone, and a stored commitment and a
      retry still show.
- [ ] No request leaves the page between receipt and share other than
      `/api/counts`; the Worker test suite is unchanged and green.
- [ ] Performance: landing ≤100 KB transferred (unchanged); poster chunk
      ≤4 KB gzip (1.8 KB today), still loaded only on the receipt
      screen; draw + encode ≤300 ms on a mid-range Android (desktop
      Chromium today: 11–23 ms); act page LCP unchanged.

## Rollout & metrics
No flag, no migration. Build order §1, §2, §3, §4, one PR each; §2 and
§3 both edit `ActForm.tsx` and `ShareRow.tsx`, so they run in sequence.
PR #70 (rejected-receipt message) merges before §2 starts. Measured in the weekly digest: receipts
per week, reports per receipt (expected up once a chip saves on tap) and
"Routes by via: share".

## State (updated 2026-11-08) — ≤30 lines
- Sections: (build order; `[ ]` todo · `[~]` in progress · `[x]` merged · `[!]` blocked: reason)
  - [x] 1. Poster: stamp and call to action · feat/one-screen-receipt-poster-stamp-cta · PR #77 merged
  - [x] 2. Receipt screen: one screen · feat/one-screen-receipt-receipt-screen · PR #79 merged
  - [~] 3. Share buttons: icon and text · feat/one-screen-receipt-share-buttons
  - [ ] 4. Retire the captain list
- Completed: §1 (merged, PR #77); §2 (merged, PR #79); §3 code, tests and spec fold (in review)
- Folded: §1 (`social-sharing.md` §Behavior 2, the alt text in §Behavior 4, the `poster.ts` line of §Data & contracts, the poster invariants); §2 (`commitment-funnel.md` §Purpose, §Behavior 1 and 10; `personalised-documents.md` §Behavior receipt tail; `district-counters.md` §Behavior 6–7); §3 (`social-sharing.md` §Behavior 3–4, `POSTER_LABEL` out of §Data & contracts, `[data-share-link]` out and the new selectors in, the share-payload and no-file-share invariants, one new invariant "every share control is bordered"). Not folded, left for §4: `social-sharing.md` §Purpose, §Behavior 6, `verb`, the captain-list lines in §Behavior 2 and §Performance budget, the invariants "nor before the commitment and captain steps" and the captain-list share; `commitment-funnel.md` §Behavior 2, 4 and 8, the captain list in §Behavior 5–6 and its invariants.
- Branch / open PRs: feat/one-screen-receipt-share-buttons (§1 merged as PR #77, §2 as PR #79; this PRD merged as PR #72)
- Files changed (file:line map), §3: `web/src/components/ShareRow.tsx` L35–46 `ICONS` / `Icon` / `BTN`, L48–92 state, the blob URL for thumbnail and "Save poster", the 2 s "Link copied" timer, `sharePoster` / `copyLink` / `message`, L94–119 the block (`[data-share-thumb]`, `[data-share-buttons]`, `[data-share-poster]`, `[data-share-save]`, `[data-share-copy]`, `[data-share-message]`, `[data-share-hint]`, `[data-share-fallback]`, `[data-share-intents]`); `web/src/lib/poster.ts` L7–13 (`POSTER_LABEL` removed); tests `web/src/components/share.test.tsx` (rewritten), `receipt.test.tsx` L38–39 (`filled()` counts the share block). §2: `ActForm.tsx`, `ReceiptExtras.tsx`, `Counts.tsx`. §1: `web/src/lib/poster.ts`.
- Tests run + result: `test-web` PASS (27 files, 225 tests, 2 skipped), `build` PASS, `prd-lint` PASS, `doc-lint` PASS. Headless Chrome at 390×844 and 1280×800 with a stubbed share sheet: "Share" hands over `{files}` alone (one 217 KB PNG), "Message" `{text, url}`, "Copy link" the line plus the `?via=share` link and reads "Link copied" for 2 s; without file share "Save poster" downloads `cut-the-ties-ndaa-1217.png`; one filled button on the receipt side in every share state (the next office); no horizontal overflow; receipt to share block makes only `POST /api/receipt` and `GET /api/counts`. Poster chunk 2.7 KB gzip (budget 4 KB, unchanged), `ShareRow` chunk 1.8 KB, `ActForm` 7.7 KB.
- Remaining: §4
- Decisions since last update: see `## Changes` 2026-11-08 "§3 built" (buttons in one column beside the thumbnail, no-file block, `[data-share-fallback]` kept, "Copy link" always copies, `other` prop left for §4, invariants folded)
- Known failures / blockers: none. Follow-ups: owner check of the share block on an iPhone and an Android phone (the real sheet, Instagram's Story / Post / Reel / Message targets, the long-press save); the screenshots were taken but not looked at, so the block's look is checked by measured boxes only; §4.1 deletes the unrendered `Funnel.tsx` steps and `ShareRow`'s unused `other` prop; act page LCP not measured; §1's follow-ups (poster on an iPhone, the stamp's look) still open.
- Next action: merge the §3 PR, then `/implement-prd-section docs/prd/one-screen-receipt.md` (next: §4. Retire the captain list)
## Open questions
1. Retire the captain list entirely, or only take it off the receipt
   screen? Proposal: retire it in §4 (the owner asked on 2026-11-08 for
   the referral step to go because sharing moves to social media; with
   no way to start a list the rest is dead code). To keep lists already
   saved, drop §4 in review; §1–§3 do not depend on it.
2. One call to action for every poster, or one per target ("CALL YOUR
   SENATOR", "CALL YOUR TREASURER")? Proposal: one, "YOUR TURN. CALL
   YOUR REP"; the site routes the viewer to the right office.
3. Instagram glyph before the Android run of `social-sharing.md` §1?
   Proposal: yes on both platforms, on the iPhone result; if the Android
   sheet does not offer Instagram, that PRD's §1 records it and the
   glyph becomes a generic share icon there.
4. May a saved office response be changed? Proposal: no; one report per
   call, chips lock after the first save (each `POST /api/report` is a
   new row).
5. Keep the reflection line somewhere? Proposal: no; it never left the
   page and nothing read it.

## Changes
- 2026-11-08 — created from the owner's phone test and mockup picks (1B,
  2B, stamp "I CALLED", no "Counted…" line); no blocking questions,
  APPROVED (auto).
- 2026-11-08 — Status APPROVED → READY. Status word moved to the board vocabulary in `docs/prd/README.md` (READY, IN PROGRESS, DEV COMPLETE, TESTING); no scope change. PR #70 and this PRD (PR #72) are merged, so §1–§4 are all buildable.
- 2026-11-08 — §1 built. Status READY → IN PROGRESS. Decisions the section left open: (1) the stamp box is as wide as its widest line plus padding (44 px each side, 34 px top and bottom), capped so the turned corners stay in the band, not a fixed width; (2) at the 72 px floor a face still too wide for the block is condensed by `fillText`'s `maxWidth` instead of clipped (measured: 104 px with the web faces, 80 px with them blocked, so the floor is not reached in Chrome); (3) the address is drawn in capitals 16 px above the band's foot, with a right-pointing arrow before it; (4) the captain-list poster drops its date line with the others (§1.1) and keeps `verb` as an optional field until §4; (5) the alt text of §1.6 landed on the existing fallback `<img>` through a new `posterAlt`, since the thumbnail is §3. With today's spacing the stack clears the block by ≥100 px even with a three-line title and a two-line ask, so the 160 px step of §1.5 is a guard that no goal in `data/goals/` reaches.
- 2026-11-08 — §2 built (§1 merged as PR #77). Decisions the section left open: (1) "at most one filled button": after a receipt the call buttons, the closed-office email button and the contact-form link drop to bordered and the first remaining office holds the fill; while the email step is open after a receipt, "I sent it" holds it and the next office is bordered; with no office left nothing is filled. (2) The chips lock after the first saved outcome (open question 4's proposal); "Save note" with an empty field saves `other` without a note. (3) "Reports go to the maintainer; they never change a listed position on their own." stays as one small line after a save. (4) "Put it in writing (2 min)" stays a muted underlined link and "I can't call right now" stays in the call row (both "still show", §2.5; neither is new), so §2.8's "three text links" counts the links row only. (5) The card keeps its frame; its inner dividers are gone and the count line lost its box. (6) The stamp's day is the device's local date, "Nov 8" in the accessible name and capitals on the face. (7) `Funnel.tsx` is no longer rendered and is left in place for §4.1 to delete, with its tests; `ShareRow`'s `other` prop is no longer passed and its own divider and intent links wait for §3. (8) The reminder link, the next-office fill and the unboxed count line landed in `ReceiptExtras.tsx` and `Counts.tsx`, the lazy receipt chunk, so the act page's own bundle carries no new import. (9) Not met until §3: where the browser can share files, the share block's "Share poster" is still filled, so the screen shows two filled buttons (measured in headless Chrome); the share buttons' look is §3.1, which replaces that button.
- 2026-11-08 — §3 built (§2 merged as PR #79). Decisions the section left open: (1) the buttons stack in one 192 px column beside the thumbnail (96 + 12 + 192 px fits the 390 px card with no wrap); the thumbnail is 96 px wide including its 2 px border and shows whenever a poster file exists, in both states, and "Save poster" downloads from the same blob URL. (2) With no file (still drawing, or the draw failed) the block is "Copy link" and "Message" alone: no thumbnail, no "Save poster", no "Open Instagram ↗". (3) Without file share the iPhone long-press note takes the hint line's place and "Open Instagram ↗" sits under it as a text link; `[data-share-fallback]` stays as the selector for that note and link, and `[data-share-buttons]` and `[data-share-hint]` are new beside the five selectors of §Data & contracts. (4) "Copy link" always copies, also where a share sheet exists (the old "Share link" opened the sheet there; "Message" does that now); a second tap inside the 2 s does not restart them. (5) The Instagram glyph ships on both platforms (open question 3's proposal); the icons are four inline SVG paths, no dependency. (6) `ShareRow`'s unused `other` prop still renders after the buttons until §4.1 removes it. (7) The "at most one filled button" criterion now holds with the share block counted: `receipt.test.tsx` no longer leaves the block out, and headless Chrome counts one filled button on the receipt side (the next office) in all three share states at 390×844 and 1280×800; the site header's "Donate" is the only other fill on the page and is not part of the receipt screen. (8) Folded with §3 beyond the entries the delta names: the two `social-sharing.md` invariants that described "Share link" and the fallback row, and one new invariant (every share control bordered). Left for §4: §Purpose, §Behavior 6, `verb`, the captain-list lines and "nor before the commitment and captain steps".
