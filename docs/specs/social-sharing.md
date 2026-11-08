# Social sharing

## Purpose
After a receipt (and after a completed captain list) the person can share
a poster of the action they just took: a 1080×1920 image drawn on the
device from the goal and action copy, handed file-only to the OS share
sheet so Instagram and every other app on the phone can take it, with a
text-and-link share beside it and a download, caption and intent-link row
where files cannot be shared. Nothing leaves the page while drawing or
sharing; the only server-visible trace is an optional `via` tag on the
next visitor's `POST /api/route`. It stops at the share: no account, no
share counts per person, no identifier on the image or in the link, and
no share affordance before the private commitment and captain steps
(`commitment-funnel.md` §4).

## Behavior
1. **Pre-render on receipt.** When the receipt screen mounts, the act
   page loads the share chunk (`web/src/components/ShareRow.tsx`, which
   imports `web/src/lib/poster.ts`), awaits the display faces
   (`document.fonts.load`), draws the poster on a 1080×1920 canvas,
   encodes it with `toBlob('image/png')` and keeps the `File` and the
   `navigator.canShare({files})` answer in state. A `null` blob, a
   missing canvas context or a thrown error leaves the file `null`;
   the row then behaves as in 4 with no poster.
2. **The poster.** `drawPoster(ctx, spec)` is pure over a 2D context.
   Ink background, an acid rule across the top, then inside the central
   4:5 band (y 285–1635, x 72–1008) top to bottom: the chip line
   "CONSTITUENT ACTION · CUT THE TIES" (40 px Space Mono, hazard), the
   verb line in the user's voice (72 px Bebas Neue, newsprint: "I JUST
   CALLED", "I JUST WROTE TO" for a letter or comment receipt, "THREE OF
   US ARE CALLING" after a list), the target line (72 px, acid, ≤2
   lines: "REP. <SURNAME>'S OFFICE" / "SEN. <SURNAME>'S OFFICE" / "THE
   <STATE> TREASURER", "… BEFORE <MON D>" after a list), the goal title
   (96 px, ≤3 lines; 84 px when it needs three), a crimson rule, the
   goal's one-line `what_we_want` (44 px Inter, ≤2 lines), the date
   ("Nov 8, 2026", 40 px) and `cutthetiesmovement.org` (48 px) on the
   band's foot. Lines wrap greedily by `measureText`; an overflowing last
   line ends in an ellipsis. Never on the poster: the user's name, city,
   district, phone, the generated text or anything from the office
   response.
3. **The share row** (after the funnel steps, in place of the old
   "Share" button) reads, in order: the poster button (`POSTER_LABEL`,
   "Share poster" until the owner's device matrix sets it) only when a
   file exists and `canShare({files})` is true; "Share link"; "Your other
   action". The poster button calls `navigator.share` synchronously in
   the tap handler with the cached file and the `SHARE_PAYLOAD` shape
   (`files` alone, or with `title: ''`); `AbortError` is ignored, any
   other error replaces the button with the fallback row (4). "Share
   link" hands the sheet text and URL only: "I just called <Role
   Surname>'s office about <goal title>. Yours takes two minutes:" ("I
   just wrote to" for a letter or comment; "the <State> Treasurer" for a
   treasurer target) with `https://cutthetiesmovement.org/goals/<slug>?via=share`;
   without a share API it copies line + link and reads "Link copied".
4. **Fallback row.** When a file exists but `canShare({files})` is false,
   `navigator.share` is absent, or the poster share threw: the poster
   shows inline (`<img>` from a blob URL, 270 px wide, alt "Poster: <goal
   title>") with "Download poster" (`<a download="cut-the-ties-<slug>.png">`;
   on iOS a note says the image opens for long-press save), "Copy
   caption" (the line from 3 plus the link; reads "Caption copied") and
   "Open Instagram ↗" (`https://www.instagram.com/`, new tab,
   `rel="noopener"`).
5. **Intent links.** From 1024 px, or whenever `navigator.share` is
   absent, four links follow the row: Facebook `sharer.php?u=<link>`, X
   `x.com/intent/tweet?text=&url=`, Threads
   `threads.com/intent/post?text=&url=`, Bluesky
   `bsky.app/intent/compose?text=` (link inside the text), each in a new
   tab with `rel="noopener"`. Their preview is the build-time 1200×630
   goal card (`goal-pages.md`), unchanged.
6. **Captain-list share.** The "Share" after a completed list on "Your
   week" (`commitment-funnel.md` §8) draws the same poster with the
   "THREE OF US ARE CALLING" verb line and "<ROLE> <SURNAME>'S OFFICE
   BEFORE <MON D>" (or "OUR OFFICES BEFORE <MON D>" with no captain
   name) once the list is receipted, and attaches it when the sheet
   takes files; the district stays off the image. Text and link are
   unchanged.
7. **`via` on the next visit.** A `?via=<tag>` on the landing rides on
   that visitor's `POST /api/route` as `via`; the goal page's "Enter your
   address" link carries it to the landing. The client passes only a
   1–16 character `[a-z0-9-]` tag and drops anything else; the Worker
   rejects a malformed tag with 400 `bad_request`, stores a valid one on
   no row (a per-day counter in `meta`, `via:<YYYY-MM-DD>:<tag>`) and
   prints "Routes by via: <tag> <n>, …" in the weekly digest
   (`maintainer-tooling.md` §3). Via counts alone never send a digest.

## Data & contracts
- `web/src/lib/poster.ts` (lazy chunk): `SHARE_PAYLOAD: 'files' |
  'files+title'`, `POSTER_LABEL`, `W = 1080`, `H = 1920`, `BAND`,
  `drawPoster(ctx, {verb, target, title, what, date, url?})`,
  `wrapText`, `posterDate`, `targetLine(role, name, state?)`,
  `captionFor(type, role, surname, title, slug) → {text, url, caption}`,
  `intentLinks(text, url)`, `sharePayload(file)`, `canShareFile(file)`,
  `posterFile(spec, name?) → Promise<File | null>`.
- `web/src/components/ShareRow.tsx`: `preparePoster(spec, slug)`,
  `receiptSpec(type, role, name, state, title, what)`, the row itself
  (`[data-share-row]`, `[data-share-poster]`, `[data-share-link]`,
  `[data-share-fallback]`, `[data-share-intents]`).
- `web/src/lib/api.ts`: `validVia(search?)`, `viaQuery(search?)`;
  `route()` body gains optional `via`.
- `POST /api/route` optional `via` (`action-router.md`); `Repo.bumpVia(via,
  day)` and `Repo.viaCountsSince(day)`; `digestTable(d, abuse, spend?,
  via?)`. No new endpoint, table, cookie or environment variable.

## Invariants (regression checklist)
- [ ] No share affordance renders before the receipt, nor before the
      commitment and captain steps are answered or skipped.
- [ ] The poster is 1080×1920; every glyph lies within y 285–1635 and
      x 72–1008; headline ≥72 px, body ≥44 px, URL ≥40 px; it names the
      goal, the office role and surname, the date and the site, and
      carries no first name, city, district, phone or generated text.
- [ ] The poster share payload holds the file only (plus `title: ''` if
      `SHARE_PAYLOAD` says so); "Share link" holds text and URL only, and
      the link ends in `?via=share`.
- [ ] With `canShare` false the fallback row renders a PNG download named
      `cut-the-ties-<slug>.png`, a caption equal to the line plus link,
      and "Open Instagram"; without a share API the four intent links
      carry the encoded line and link and open with `rel="noopener"`.
- [ ] The captain-list share attaches the 9:16 poster; its text is
      unchanged.
- [ ] No request leaves the page between receipt and share.
- [ ] `POST /api/route` with `via: 'share'` succeeds and the digest counts
      it; `via: 'x'.repeat(17)` or `via: 'A B'` is 400 `bad_request`; no
      receipts, reports, generations or screenings row is written for it,
      and an address-only route still calls no repo writer.

## Performance budget
- Landing ≤100 KB transferred (unchanged by this capability).
- The poster chunk ≤4 KB gzip, loaded only on the receipt screen and
  "Your week" after a receipted list; the act page's LCP is unchanged.
- Draw + encode ≤300 ms on a mid-range Android.
