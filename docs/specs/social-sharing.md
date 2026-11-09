# Social sharing

## Purpose
After a receipt the person can share a poster of the action they just
took: a 1080×1920 image drawn on the
device from the goal and action copy, handed file-only to the OS share
sheet so Instagram and every other app on the phone can take it, with a
text-and-link share beside it and a download, caption and intent-link row
where files cannot be shared. Nothing leaves the page while drawing or
sharing; the only server-visible trace is an optional `via` tag on the
next visitor's `POST /api/route`. It stops at the share: no account, no
share counts per person, no identifier on the image or in the link, and
no share affordance before the receipt.

## Behavior
1. **Pre-render on receipt.** When the receipt screen mounts, the act
   page loads the share chunk (`web/src/components/ShareRow.tsx`, which
   imports `web/src/lib/poster.ts`), awaits the display faces
   (`document.fonts.load`), draws the poster on a 1080×1920 canvas,
   encodes it with `toBlob('image/png')` and keeps the `File` and the
   `navigator.canShare({files})` answer in state. A `null` blob, a
   missing canvas context or a thrown error leaves the file `null`;
   the row then behaves as in 4 with no poster.
2. **The poster.** `drawPoster(ctx, spec)` is pure over a 2D context
   (fills, strokes, text and one rotation; no filter or mask). Ink
   background, an acid rule across the top, then inside the central 4:5
   band (y 285–1635, x 72–1008) top to bottom:
   - the chip line "CONSTITUENT ACTION · CUT THE TIES" (40 px Space
     Mono, hazard);
   - the **stamp**: one box turned −4° about its centre, horizontally
     centred in the band, paper (#FFFFFF) fill, 14 px dashed crimson
     border, three centred crimson lines: the office ("REP. <SURNAME>'S
     OFFICE" / "SEN. <SURNAME>'S OFFICE" / "THE <STATE> TREASURER"; 40 px
     Space Mono, stepping down 2 px at a time to 32 px to fit one line,
     then ending in an ellipsis), the act ("I CALLED" for a call receipt,
     "I WROTE" for a letter, a comment or an emailed script; 200 px
     Bebas Neue) followed by a tick drawn as a stroked path, and the date
     ("NOV 8, 2026", 40 px Space Mono). The box is as wide as its widest
     line plus padding, capped so that all four turned corners stay
     inside the band;
   - the goal title (96 px Bebas Neue, newsprint, ≤3 lines; 84 px when
     it needs three), a 6 px crimson rule, the goal's one-line
     `what_we_want` (44 px Inter, ≤2 lines);
   - anchored to the band's foot, the **call to action**: an acid block
     the full band width with ink Bebas Neue "YOUR TURN. CALL YOUR REP"
     centred on one line, and under it an acid arrow (stroked path)
     pointing at "CUTTHETIESMOVEMENT.ORG" (48 px Space Mono, acid), its
     baseline 16 px above the band's foot so no descender leaves the
     feed crop. The block text takes the largest size from 120 px down
     to 72 px in 4 px steps whose measured width fits the block minus
     32 px each side (`fitSize`, after the faces load: 104 px with the
     web faces, 80 px with the fallback faces in desktop Chrome); at
     72 px a face still too wide is condensed by `fillText`'s
     `maxWidth`, never clipped.

   Lines wrap greedily by `measureText`; an overflowing last line ends
   in an ellipsis. **Fit:** the stack clears the block by ≥24 px with a
   three-line title and a two-line ask; when it would not, the act line
   steps from 200 px to 160 px. Never on the poster: the user's name,
   city, district, phone, the generated text or anything from the
   office response.
3. **The share block** (on the receipt screen, after the count line) is
   a 96 px wide thumbnail of the poster (`<img>` from a blob URL, alt
   "Poster: I called <Role Surname>'s office about <goal title>", "I
   wrote to …" for a letter or comment) beside a column of bordered
   buttons, each a 20 px monochrome inline SVG icon (ink, no brand
   colour) plus text, in this order:
   - Instagram glyph (rounded square, circle, dot) + "Share", only when
     a file exists and `canShare({files})` is true. It calls
     `navigator.share` synchronously in the tap handler with the cached
     file and the `SHARE_PAYLOAD` shape (`files` alone, or with `title:
     ''`); `AbortError` is ignored, any other error replaces the button
     as in 4. One hint line follows the block: "Pick Instagram, then
     Story, Post, Reel or Message."
   - Link icon + "Copy link", always. It copies the line "I just called
     <Role Surname>'s office about <goal title>. Yours takes two
     minutes:" ("I just wrote to" for a letter or comment; "the <State>
     Treasurer" for a treasurer target) plus
     `https://cutthetiesmovement.org/goals/<slug>?via=share`, and reads
     "Link copied" for 2 s.
   - Speech-bubble icon + "Message", only when `navigator.share` exists.
     It hands the sheet that line and URL only.

   No share control is filled: the one filled button on the receipt
   screen is the next office (`commitment-funnel.md` §7).
4. **No file share.** When a file exists but `canShare({files})` is
   false, `navigator.share` is absent, or the poster share threw: a
   download icon + "Save poster" (`<a download="cut-the-ties-<slug>.png">`
   on the thumbnail's blob URL) takes the Instagram button's place, the
   hint line gives way to a note that on iPhone the poster lands in
   Files and a long press on the image saves it to Photos, and a text
   link "Open Instagram ↗" (`https://www.instagram.com/`, new tab,
   `rel="noopener"`) follows the block. With no file (still drawing, or
   the draw failed) there is no thumbnail and the block is "Copy link"
   and "Message" alone.
5. **Intent links.** From 1024 px, or whenever `navigator.share` is
   absent, four links follow the row: Facebook `sharer.php?u=<link>`, X
   `x.com/intent/tweet?text=&url=`, Threads
   `threads.com/intent/post?text=&url=`, Bluesky
   `bsky.app/intent/compose?text=` (link inside the text), each in a new
   tab with `rel="noopener"`. Their preview is the build-time 1200×630
   goal card (`goal-pages.md`), unchanged.
6. **`via` on the next visit.** A `?via=<tag>` on the landing rides on
   that visitor's `POST /api/route` as `via`; the goal page's "Enter your
   address" link carries it to the landing. The client passes only a
   1–16 character `[a-z0-9-]` tag and drops anything else; the Worker
   rejects a malformed tag with 400 `bad_request`, stores a valid one on
   no row (a per-day counter in `meta`, `via:<YYYY-MM-DD>:<tag>`) and
   prints "Routes by via: <tag> <n>, …" in the weekly digest
   (`maintainer-tooling.md` §3). Via counts alone never send a digest.

## Data & contracts
- `web/src/lib/poster.ts` (lazy chunk): `SHARE_PAYLOAD: 'files' |
  'files+title'`, `W = 1080`, `H = 1920`, `BAND`,
  `drawPoster(ctx, {act: 'called' | 'wrote', target, title, what, date,
  url?})`, `CTA = 'YOUR TURN. CALL YOUR REP'`, `fitSize(ctx, text, width,
  from, to, step)` (largest size in the steps whose measured width
  fits, `to` when none does; swaps the px size in `ctx.font`),
  `wrapText`, `posterDate`, `targetLine(role, name, state?)`,
  `posterAlt(type, role, surname, title)`,
  `captionFor(type, role, surname, title, slug) → {text, url, caption}`,
  `intentLinks(text, url)`, `sharePayload(file)`, `canShareFile(file)`,
  `posterFile(spec, name?) → Promise<File | null>`. The `Ctx` the draw
  needs: `fillRect`, `fillText`, `measureText`, `save`, `restore`,
  `translate`, `rotate`, `strokeRect`, `setLineDash`, `beginPath`,
  `moveTo`, `lineTo`, `stroke`, `fillStyle`, `strokeStyle`, `lineWidth`,
  `lineCap`, `font`, `textBaseline`.
- `web/src/components/ShareRow.tsx`: `preparePoster(spec, slug)`,
  `receiptSpec(type, role, name, state, title, what)`, the block itself
  (`[data-share-row]`, `[data-share-thumb]`, `[data-share-buttons]`,
  `[data-share-poster]`, `[data-share-save]`, `[data-share-copy]`,
  `[data-share-message]`, `[data-share-hint]`, `[data-share-fallback]`
  for the note and the Instagram link, `[data-share-intents]`).
- `web/src/lib/api.ts`: `validVia(search?)`, `viaQuery(search?)`;
  `route()` body gains optional `via`.
- `POST /api/route` optional `via` (`action-router.md`); `Repo.bumpVia(via,
  day)` and `Repo.viaCountsSince(day)`; `digestTable(d, abuse, spend?,
  via?)`. No new endpoint, table, cookie or environment variable.

## Invariants (regression checklist)
- [ ] No share affordance renders before the receipt.
- [ ] The poster is 1080×1920; every glyph, the four corners of the
      turned stamp and the address line's descenders lie within y
      285–1635 and x 72–1008; title ≥72 px, body ≥44 px, call to action
      ≥72 px, address ≥40 px; it names the goal, the office role and
      surname, the date and the site, and carries no first name, city,
      district, phone or generated text.
- [ ] A call receipt's stamp reads the office, "I CALLED" with a tick
      and the date; a letter, comment or emailed script reads "I WROTE";
      "I JUST" appears nowhere on the poster.
- [ ] "YOUR TURN. CALL YOUR REP" is on one line inside its block at the
      size `fitSize` returns, with the arrow and the address under it;
      for every goal in `data/goals/` no two text boxes overlap and the
      stack clears the block by ≥24 px.
- [ ] The poster share payload holds the file only (plus `title: ''` if
      `SHARE_PAYLOAD` says so); "Message" holds text and URL only; "Copy
      link" copies the line plus link; the link ends in `?via=share`.
- [ ] Every share control is bordered with a 20 px inline SVG icon; none
      is filled, in any state.
- [ ] With `canShare` false "Save poster" downloads a PNG named
      `cut-the-ties-<slug>.png` and "Open Instagram ↗" follows the block;
      the page holds one poster `<img>`, 96 px wide; without a share API
      "Message" is absent and the four intent links carry the encoded
      line and link and open with `rel="noopener"`.
- [ ] No poster carries "THREE OF US ARE CALLING"; "Your week" loads no
      poster module.
- [ ] No request leaves the page between receipt and share.
- [ ] `POST /api/route` with `via: 'share'` succeeds and the digest counts
      it; `via: 'x'.repeat(17)` or `via: 'A B'` is 400 `bad_request`; no
      receipts, reports, generations or screenings row is written for it,
      and an address-only route still calls no repo writer.

## Performance budget
- Landing ≤100 KB transferred (unchanged by this capability).
- The poster chunk ≤4 KB gzip, loaded only on the receipt screen; the
  act page's LCP is unchanged.
- Draw + encode ≤300 ms on a mid-range Android.
