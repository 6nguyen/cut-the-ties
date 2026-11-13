# Social sharing: a poster for the action you just took — PRD
Status: SHIPPED 2026-11-13 (PR #67) · Owner: George Nguyen · Last updated: 2026-11-13

## Problem
After a call the receipt screen offers one "Share" button that hands the
device share sheet a line of text and the goal link. That reaches
Messages and WhatsApp, but not the platform where this audience is:
Instagram is used by 51 % of US adults and 79 % of 18–29-year-olds, is
their top news source, and has no way to share a link from a web page.
A Story or feed post needs an image, and the only image this site makes
is a 1200×630 link card per goal, attached today only after a completed
captain list. No surveyed civic tool (5 Calls, Resistbot, Change.org,
Mobilize, Action Network) renders an image for the action a person just
took; all share canned text and a link. The evidence on observed
completed acts is strong (Bond 2012: ~340k extra votes through close
friends; Gerber 2008: disclosed turnout +8.1 pp), and so is the warning
that a public token act before the hard one lowers follow-through
(Kristofferson 2014), which is why the poster is a receipt and comes
after the call, never before (`docs/research/social-sharing.md`).

## Goals / Non-goals
- Goals: one poster per completed action, drawn on the device from the
  goal and action copy, that a phone user shares to an Instagram Story,
  feed post or DM in two taps; the same poster reaches every app in the
  OS share sheet; a text-and-link share stays one tap for every other
  platform; every path works without an account, without the Worker and
  with nothing identifying on the image; $0 and no change to the landing
  budget.
- Non-goals: a native app or Meta App ID (the only way to open the
  Story composer directly); server-side poster rendering (Workers Free
  gives 10 ms CPU per request against ~90 ms for a Satori render, and
  the URL would log what the user did); TikTok, Snapchat, LinkedIn,
  Reddit buttons (no web path, or the wrong audience and format); share
  counts per user or any identifier on the poster or in the link; a
  share before the private commitment and captain steps
  (`commitment-funnel.md` §4 stands); photos on the poster (text and
  shapes only, like the goal card).

## Research (what the best products do → adopt / adapt / reject)
Relies on: `docs/research/social-sharing.md`,
`docs/research/civic-action-levers/behavioral-science-and-virality.md`.
Platform priority, from US reach for 18–49, news use and what a web page
can hand each platform:
| # | Platform | Mechanism | Effort | Why this rank |
|---|---|---|---|---|
| 1 | Instagram Story, feed, DM | `navigator.share({files: [poster]})` → OS sheet → Instagram | M | 79 % of 18–29; their top news source; image is the only way in |
| 2 | The OS share sheet as a whole (Messages, WhatsApp, Signal, Telegram, Mail, Save Image) | the same call | S (ships with 1) | private channels match the funnel; one call, no per-platform work |
| 3 | Facebook | `sharer.php?u=` + the goal's OG card | S | 70 % of adults, 78 % of 30–49 |
| 4 | X, Threads, Bluesky | text + URL intents + OG card | S each | text-first; small US reach but high news use |
| 5 | TikTok, Snapchat, LinkedIn, Reddit, Mastodon | none usable, or wrong audience | — | deferred; TikTok has no web share at all |

| Pattern | Seen in | Verdict | Why |
|---|---|---|---|
| Canned line + link, per-platform intent buttons | 5 Calls (Bluesky, Threads, Facebook, Mastodon, X) | adopt for the desktop/fallback row | one link each, no state |
| Per-issue server image shown above the buttons, not attached | 5 Calls | reject | not shareable to Instagram; needs a server render |
| Bring-a-friend after sign-up (14 % of signups from invite links) | Mobilize | already adopted | the captain list is this site's version |
| "I voted" social proof through close friends | Facebook 2010 (Bond 2012) | adapt | a receipt of a completed act, shared to the person's own circles |
| Public badge before the act | petition sites | reject | lowers the sharer's own follow-through (Kristofferson 2014) |
| Image shared file-only, URL drawn on the image | field reports on iOS share targets | adopt | iOS targets take the link and drop "Save Image" when text and url ride along; Instagram never renders links in captions |

## Users
- A phone user who just called (most receipts): wants the Instagram
  Story in two taps; cannot be asked to pick a platform or edit text.
- A phone user on Firefox, an in-app browser or an old OS: no file
  sharing; needs the poster on screen, a download and a caption to
  paste.
- A desktop user: no Instagram target; needs the download plus the
  Facebook, X, Threads and Bluesky links.
- A person who finished a captain list on the landing page: the same
  poster, with the "three of us" line, in place of today's 1200×630 image.

## Expected behavior
### 1. Device test matrix
1. Before any copy says "Story", the owner runs the matrix from
   `docs/research/social-sharing.md` §7 on an iPhone (current iOS, current
   Instagram) and an Android phone (Chrome and Samsung Internet): file-only
   share vs `title: ''` vs text + url + file; which Instagram composers the
   sheet offers (Story, Feed, Message, Reels); whether Safari survives the
   round trip; whether the OG card renders in iMessage, WhatsApp, Telegram
   and Threads previews.
2. Results go into this PRD's `## Changes` as one dated line per device,
   and set two constants in `web/src/lib/poster.ts`: the share payload
   shape (`files` only, or with `title: ''`) and the primary button label
   ("Share to Instagram" when Story is offered on both platforms, else
   "Share poster").

### 2. Poster and share after a receipt
1. When the receipt screen shows the share row (after the commitment and
   captain steps, `commitment-funnel.md` §4), the island has already
   drawn the poster: on receipt mount it loads the display font
   (`document.fonts.load`), draws a 1080×1920 canvas and encodes it with
   `toBlob('image/png')`, keeping the `File` and the
   `navigator.canShare({files})` answer in state. A `null` blob or a
   thrown canvas error falls back to §3 silently.
2. The poster (`web/src/lib/poster.ts`, exported pure draw function over a
   `CanvasRenderingContext2D`) carries, inside the central 1080×1350 band
   (y 285–1635), top to bottom: the category chip line
   ("CONSTITUENT ACTION · CUT THE TIES"), a verb line in the user's voice
   set from the action type ("I JUST CALLED" / "I JUST WROTE TO" for an
   email receipt), the target line ("REP. <SURNAME>'S OFFICE" /
   "SEN. <SURNAME>'S OFFICE" / "THE <STATE> TREASURER"), the goal title
   (≤3 lines, 96 px), the goal's one-line `what_we_want` (44 px, ≤2
   lines), the date ("<Mon D, YYYY>") and the site URL
   (`cutthetiesmovement.org`, 48 px). Colours and faces are the goal
   card's (`web/src/pages/goals/[slug]/card.png.ts`). Never on the
   poster: the user's name, city, district, phone, the generated text or
   anything from the office response.
3. The share row reads, in order: the primary poster button (label from
   §1.2) when `canShare({files})` is true; "Share link" (today's text +
   URL share, `ActForm.tsx` `share()`), and "Your other action". The
   poster button calls `navigator.share` synchronously in the tap handler
   with the cached file; `AbortError` is ignored, any other error shows
   the §3 row in place of the button.
4. "Share link" text becomes "I just called <Role Surname>'s office about
   <goal title>. Yours takes two minutes:" with the goal deep link
   `https://cutthetiesmovement.org/goals/<slug>?via=share`. An email
   receipt reads "I just wrote to".
5. Nothing is posted to the Worker by any share; the share row renders
   only after a receipt, as today.

### 3. Fallback and desktop row
1. When `canShare({files})` is false, `navigator.share` is absent, or the
   poster share threw: the poster renders inline (`<img>` from the blob
   URL, 270 px wide, alt "Poster: <goal title>") with "Download poster"
   (`<a download="cut-the-ties-<slug>.png">`; iOS opens it in a new tab
   for long-press save, and the caption says so on iOS), "Copy caption"
   (the §2.4 line plus the link) and "Open Instagram"
   (`https://www.instagram.com/`, new tab).
2. From 1024 px, or whenever `navigator.share` is absent, four intent
   links follow: Facebook `sharer.php?u=<link>`, X
   `x.com/intent/tweet?text=&url=`, Threads
   `threads.com/intent/post?text=&url=`, Bluesky
   `bsky.app/intent/compose?text=` (link inside the text). Each opens in
   a new tab with `rel="noopener"`. The link preview on those platforms
   is the existing build-time 1200×630 goal card, unchanged.

### 4. Captain-list share uses the poster
1. The share after a completed captain list (`commitment-funnel.md` §8,
   `YourWeek.tsx` `shareImage`) switches from the 1200×630 canvas to the
   same `poster.ts` draw with the verb line "THREE OF US ARE CALLING" and
   the target line "<ROLE> <SURNAME>'S OFFICE BEFORE <MON D>"; the
   district stays off the image (it remains in the share text, as
   today). The payload follows §1.2; the text and link are unchanged.

## Data & contracts
- `web/src/lib/poster.ts`: `drawPoster(ctx, {verb, target, title, what,
  date, url})` (pure, 1080×1920, all text within y 285–1635, greedy wrap
  by `measureText`), `posterFile(spec): Promise<File | null>` (font load,
  canvas, `toBlob`, guarded), `SHARE_PAYLOAD` and `POSTER_LABEL` constants
  set by §1.2, `captionFor(type, role, surname, title, slug)`.
- Goal deep links in share text and intents carry `?via=share`; the
  landing and goal pages pass a `via` of at most 16 `[a-z0-9-]`
  characters through to `POST /api/route` as an optional `via` field,
  which the Worker stores on no row and counts in the weekly digest as
  "routes by via" (`maintainer-tooling.md` §3). Any other value is
  dropped client-side; the Worker rejects a malformed `via` with 400
  `bad_request`. No identifier, no cookie, no per-share row.
- No new endpoint, table or environment variable. The poster chunk loads
  with the receipt screen, after the act page's own bundle.

## Spec delta
- ADDED `docs/specs/social-sharing.md`: the poster template and its
  contents rule, the share row order, the file-only payload, the
  fallback and intent row, the `via` parameter.
- MODIFIED `docs/specs/personalised-documents.md` §Behavior 4: "Share"
  (device share sheet with the goal deep link, clipboard fallback) → the
  share row of `social-sharing.md` §2–3, still only after a receipt or a
  completed captain list.
- MODIFIED `docs/specs/commitment-funnel.md` §Behavior 8: the attached
  image is the 1080×1920 poster from `social-sharing.md` with the "three
  of us" verb line, district off the image; the payload follows
  `social-sharing.md`.
- MODIFIED `docs/specs/action-router.md` §Data & contracts: `POST
  /api/route` accepts optional `via`.
- MODIFIED `docs/specs/maintainer-tooling.md` §Behavior 3: digest gains
  "routes by via".

## Acceptance criteria
- [x] No share affordance renders before the receipt and before the
      commitment and captain steps are answered or skipped (existing
      `funnel.test.ts` invariant still passes).
- [ ] On an iPhone and an Android phone with Instagram installed, the
      primary button opens the OS share sheet with Instagram listed, and
      choosing it offers at least the feed composer with the poster
      loaded; the composers offered are logged in `## Changes`.
      iPhone passed 2026-11-08; Android → `android-share-test.md`.
- [x] The poster is 1080×1920, every glyph lies within y 285–1635 and x
      72–1008, headline ≥72 px, body ≥44 px, URL ≥40 px; it names the
      goal, the office role and surname, the date and the site, and
      contains none of: first name, city, district, phone, the generated
      text (`poster.test.ts` renders with a stub context and checks the
      text calls).
- [x] The poster share payload holds the file only (plus `title: ''` if
      §1 says so); "Share link" holds text and URL only.
- [x] With `canShare` stubbed false the fallback row renders with a
      working download (PNG, correct name), a caption copy that matches
      §2.4 plus the link, and "Open Instagram"; at 1024 px the four
      intent links carry the encoded caption and `?via=share` link.
- [x] The captain-list share attaches the 9:16 poster and its text is
      unchanged.
- [x] `POST /api/route` with `via: 'share'` succeeds and the digest's
      "routes by via" counts it; `via: 'x'.repeat(17)` or `via: 'A B'` is
      400; no table gains a row for it.
- [x] No request leaves the page during drawing or sharing (network log
      empty between receipt and share).
- [ ] Performance: landing stays ≤100 KB transferred; the poster chunk ≤4
      KB gzip and loaded only on the receipt screen; draw + encode ≤300
      ms on a mid-range Android; the act page's LCP is unchanged.
      Landing and chunk measured (PR #69); phone timing → `android-share-test.md`.

## Rollout & metrics
No flag. §1 is a half-day owner task and gates the Instagram copy only;
§2–3 ship together, §4 after. Measure in the weekly digest: `/api/route`
calls with `via: share` per goal (the only server-visible trace), against
receipts per goal. A second-week ratio under 2 % of receipts means the
poster is not travelling and the caption and poster copy get one revision
before any new platform is added.

## State (updated 2026-11-08)
- Sections:
  - [x] 1. Device test matrix · iPhone passed 2026-11-08; Android moved to android-share-test.md
  - [x] 2. Poster and share after a receipt · PR #67 merged
  - [x] 3. Fallback and desktop row · PR #67 merged
  - [x] 4. Captain-list share uses the poster · PR #67 merged
- Completed: §2–4 and `via` counting (PR #67); phone-free acceptance criteria verified and ticked (PR #69). §1 on iPhone: the share sheet offered Instagram Story, Post, Reel and Message and each opened with the poster.
- Folded: §2, §3, §4 (PR #67; `docs/specs/social-sharing.md` and the four MODIFIED specs)
- Branch / open PRs: none (PR #67 and PR #69 merged)
- Files changed (file:line map): `web/src/components/share.test.tsx:89-112` (share-link payload, intents at 1024 px); `web/src/components/funnel.test.ts:9-15,154-173` (captain-list poster attach)
- Tests run + result: test-web 168 passed, test (worker) 356 passed, tsc 0 errors, build PASS (PR #69). Landing 38.5 KB; poster chunk 1.8 KB gzip, lazy; desktop Chromium draw + encode 11–23 ms, 0 requests during drawing.
- Remaining: none. The Android run and the `SHARE_PAYLOAD` decision moved to `docs/prd/android-share-test.md`.
- Decisions since last update: none.
- Known failures / blockers: none here (see `docs/prd/android-share-test.md`).
- Next action: none; archived.
## Open questions
1. Should the poster carry a QR code for the Story link? Proposal: not
   now; the URL is seven syllables and a QR needs a ~5 KB library; add it
   if §1 shows Story link stickers are rarely used by this audience
   (unmeasurable today, so revisit with the first digest).
2. Should the poster offer two sizes (9:16 and 4:5) in the fallback row?
   Proposal: one 9:16 file; the feed composer crops to the central band
   where all the text sits.
3. Should the "N constituents in <STATE-NN> called this week" count go
   on the poster? Proposal: no; it dates the image within hours and puts
   the district on it.

## Changes
- 2026-11-08 — created; no blocking questions, APPROVED (auto).
- 2026-11-08 — §2–5 built: `poster.ts` + `ShareRow.tsx` (poster, share
  link, fallback, intents), `YourWeek.tsx` captain share on the poster,
  `via` on `/api/route` counted per day in `meta` for the digest's
  "Routes by via" line; spec delta folded into `docs/specs/`. §1 (the
  owner's device matrix) remains: run it, log one dated line per device
  here, and set `SHARE_PAYLOAD` / `POSTER_LABEL` in `poster.ts`.
- 2026-11-08 — State block added: §2–4 done (PR #67), §1 blocked on the
  owner's device matrix. Acceptance checked without a phone: three tests
  added (share-link payload is text + URL only, intent links at 1024 px
  with a share sheet, captain-list share attaches the poster); web 168 and
  worker 356 tests pass. Measured: landing 38.5 KB transferred, poster
  chunk 1.8 KB gzip and imported only after a receipt, draw + encode
  11–23 ms in desktop Chromium with no request during drawing (all faces
  already loaded on the act page). Still open, both need §1's phones: the
  Instagram composers criterion and draw + encode ≤300 ms on a mid-range
  Android (with the act page's LCP).
- 2026-11-08 — §1, iPhone (owner, Chrome on iPhone; iOS and Instagram
  versions not recorded): the file-only share sheet offered Instagram
  Story, Post, Reel and Message, and each opened with the poster. Android
  (Chrome and Samsung Internet) not run; phone draw time not measured.
  `SHARE_PAYLOAD` / `POSTER_LABEL` stay as they are until Android is in.
- 2026-11-08 — Status BUILDING → TESTING: all code is merged (PR #67, PR #69) and only §1 remains. Status word moved to the board vocabulary in `docs/prd/README.md` (READY, IN PROGRESS, DEV COMPLETE, TESTING); no scope change.
- 2026-11-13 — SHIPPED and archived by the split-the-tail rule (`docs/prd/README.md` Lifecycle 5): all code merged (PR #67, PR #69) and the iPhone run passed; the Android run waits on a phone the owner does not have, so it moved with its two criteria to `docs/prd/android-share-test.md`. `POSTER_LABEL` no longer exists (`one-screen-receipt` fixed the label); only `SHARE_PAYLOAD` is left to decide.
