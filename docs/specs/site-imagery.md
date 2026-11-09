# Site imagery

## Purpose
Every photo the site shows comes from one library under one policy: a real,
sourced, licensed photograph, never a generated picture of a person or a
real place. Every photo gets the same ink treatment and a credit line on
`/about`. This spec covers the library, the policy check, the `Photo`
component, the credits and the slots that show a photo today: the landing
hero, the goal and prep page heroes, the card bands on the landing, the
results and `/goals`, and the share cards.

## Behavior
1. **Library.** Originals live in `web/src/assets/img/`: JPEG or PNG, at
   most 2000 px on the long side and 600 KB each, lower-case names
   (`a-z`, `0-9`, `-`). `manifest.yaml` beside them holds one row per file
   and one `dir` row for a directory of files that share a source and a
   licence (the official portraits). The files are `capitol-dome-dusk`,
   `house-floor`, `senate-chamber`, `hasc-hearing-room` and
   `state-capitol`: five real places, none generated.
2. **Policy.** A row needs `id`, `alt`, `subject`, `source_url`, `author`,
   `licence` and exactly one of `file` or `dir`. `licence` is one of
   `us-gov`, `pd`, `cc0`, `cc-by`, `ai`; anything else (share-alike,
   non-commercial, no-derivatives, agency or stock) is refused. `cc-by`
   needs `credit`. `ai` needs `generator` and `prompt` and is refused when
   `subject` is `person` or `place`. `source_url` is an https link, ids are
   unique, `taken` is `YYYY-MM-DD` when present.
3. **Check.** `web/src/lib/images.ts` checks the manifest each time it
   loads. `/about` imports it, so `scripts/quiet-check.sh build` fails on a
   bad row and the error names the row and the problem
   (`image "<id>": missing licence`). `test-web` runs the same check and
   also asserts one row per file, the size limits, and that every image id
   a page references has a row.
4. **Photo.** `<Photo id widths sizes eager? quality? class? />` is the
   only way a photo reaches a page. It fills its parent, which must be
   positioned and carry the slot's gradient (`hero-gradient`). It renders a
   `<picture>` with AVIF and WebP sources and a JPEG fallback at the given
   widths (widths above the original's are dropped; the original's own
   width when none fits), at encoder quality 30 unless the slot passes
   `quality`, with the manifest `alt` and lazy loading unless `eager` (then
   eager at high fetch priority). An unknown id stops the build.
5. **Treatment.** The image gets
   `filter: grayscale(.35) contrast(1.15) brightness(.95)`. Three layers
   sit over it: ink at 100% → 85% → 40% left to right; ink → clear → black
   at 40% bottom to top; and the `halftone` dots. The numbers live in
   `TREATMENT` so other renderers read the same ones.
6. **Unloaded photo.** The photo layer has zero opacity until the image's
   `load` event. A blocked, missing or failed image, or a browser without
   JavaScript, leaves the slot showing its gradient exactly as it does with
   no photo: no broken-image icon, no alt-text box.
7. **Credits.** `/about` ends with "Photo credits", one line per image in
   use, in manifest order: `<alt>: <author>, <source> (<licence>)`, where
   `<source>` links to `source_url` and `credit` replaces `author` when the
   row has one. An `ai` row reads `<alt>: illustration generated with
   <generator>; no photo of a person or a real place on this site is
   generated.` When no image is in use the heading and list are absent.
   Today it lists all five files.
8. **In use.** An image is in use when a page, component or layout source
   holds a literal `<Photo id="…" />`. Once any of them calls `imageFor(`
   or `imageIdFor(`, every published goal's image is in use. The
   `portraits` row is in use once `web/src/assets/portraits/` holds a
   `.webp`. Test files never count.
9. **Landing hero.** `/` shows `capitol-dome-dusk` (landscape, 2000×1173)
   full bleed behind the label, H1, "Your week" card and address form:
   eager, high fetch priority, widths 640/960/1440/1920, `sizes="100vw"`.
   The page head carries `<link rel="preload" as="image"
   type="image/avif" fetchpriority="high">` whose `imagesrcset` is the
   hero's AVIF `srcset`. Below 768 px, where the text runs over the
   lightest side of the photo, the loaded photo and its layers are dimmed
   to `brightness(.75)`.
10. **Card band.** Each landing goal card, result card and `/goals` card
    has a 16:9 header carrying the goal's image (`imageIdFor`) under the halftone,
    chip and title: lazy, widths 480/768, quality 22 (`BAND`). `sizes`
    follows the grid from 768 px up; below it the slot is declared at 36vw
    although the card is 92vw wide, so a phone at any pixel density takes
    the 480 px file. A header whose text needs more than 16:9 grows taller
    (`overflow: clip`), never cutting the title. On a result card the band sits above the body, whose
    first element stays the CTA. On `/goals` the first card's band is the
    LCP element on a phone and loads eagerly.
11. **Result cards.** The `Results` island renders the cards in the
    browser, so `/results` ships one inert
    `<template data-photo-band="<id>">` per image a published goal uses,
    each holding the built `Photo` markup, and passes the island a goal
    slug → image id map. A card copies its template's markup into its
    header. With no id or no template the header is the gradient alone.
12. **Goal and prep heroes.** `/goals/<slug>` and `/goals/<slug>/prep`
    show the goal's image (`imageIdFor`) full bleed behind the hero's
    chips, title, summary and date: eager, high fetch priority, with the
    same preload link as the landing. Widths are `heroWidths(original)`:
    640/960/1440/1920, and a file narrower than 1920 px also serves its
    own width instead of a smaller copy stretched further (`house-floor`
    640/960/1080, `senate-chamber` 640/946). `sizes` is `HERO.sizes`:
    100vw from 768 px up and 49vw below it, so a phone takes the 640 px
    file. Below 1024 px, where the text runs the full width, the loaded
    photo is dimmed to `brightness(.75)`. The act pages, the receipt and
    the whip page under a goal show no photo.
13. **A goal's image.** A goal YAML may set `image: <id>`. The loader
    (`worker/src/load.ts`) refuses an id with no `file` row in the
    manifest, so the seed, the worker tests and the site build stop with
    `goal <slug>: image <id> has no file row in
    web/src/assets/img/manifest.yaml`. `ndaa-1217` and `ndaa-report-vote`
    set `hasc-hearing-room`; every other goal shows its category default.
14. **Portrait import.** `npm run import-members -w worker -- --portraits`
    takes every `data/members.csv` row without `left_office` (a
    member-elect has no Bioguide id) and, for each id with no
    `web/src/assets/portraits/<bioguide_id>.webp`, fetches the 225×275
    official portrait from `unitedstates/images` (public domain, from the
    Government Publishing Office), then the Bioguide photo. `sharp` writes
    a 160×200 WebP cropped from the top, at the highest quality from 62
    down to 14 that fits 8 KB. An existing file is never fetched or
    rewritten, so a second run changes no bytes. An id whose sources
    answer 404 or 403, or serve no image, gets no file, is listed in
    `missing.json` and printed under `no portrait:`; a network failure
    prints `failed (network, run again):`, exits 1 and leaves
    `missing.json` alone. The step never rewrites `members.csv`.
15. **Portraits on pages.** A static endpoint
    (`web/src/pages/portraits/[id].webp.ts`) serves each file at
    `/portraits/<bioguide_id>.webp`, so an island builds the URL from the
    id and no URL map reaches a client bundle. The box (`.portrait` in
    `global.css`) holds the party letter or initial on the party colour;
    the `<img>` over it (`alt=""`, explicit width and height) has zero
    opacity until its `load` event sets `data-loaded`, so a blocked,
    missing or failed image, or no JavaScript, leaves the letter. Target
    cards: 48 px, lazy (`target-cards.md` §Behavior 1). Member hero:
    120×150, newsprint border, `filter: contrast()` at the treatment's
    step and no gradient, left of the title from 640 px and above it
    below; a member with no file gets no box and no gap. Prep picks:
    80×100, lazy (`goal-pages.md` §Behavior 4). Members-elect, treasurers
    and state officials have no portrait.
16. **Share cards.** `/card.png` (`capitol-dome-dusk`) and each goal's
    card put the photo under the text: centre cover crop, the Behavior 5
    filter and both gradients, no halftone (`goal-pages.md` §Behavior 2).
    Member cards carry no photo.

## Data & contracts
- `manifest.yaml` row: `id`, `file` | `dir`, `alt`, `subject`
  (`place` | `person` | `scene` | `texture`), `source_url`, `author`,
  `licence`, optional `credit`, `generator`, `prompt`, `taken`.
- `web/src/lib/images.ts`: `validate(rows)` → one message per problem;
  `MANIFEST`; `rowFor(id)`; `imageById(id)` → the original for
  `astro:assets`; `imageIdFor(goal)` / `imageFor(goal)`; `usedIds(sources,
  goalIds)`; `creditLine(row)`, `creditsFor(ids)`, `credits(goals)`;
  `TREATMENT`; `PHOTO_OUTPUT` (`formats` AVIF then WebP, `fallback` JPEG,
  `quality` 30); `BAND` (`widths` 480 and 768, `quality` 22);
  `fitWidths(original, widths)` → unique ascending widths no wider than
  the original, or the original's width; `HERO` (`widths` 640, 960, 1440
  and 1920, `sizes`); `heroWidths(original)` → the hero widths that fit
  plus the original's own width when it is under 1920; `CARD` (share
  card size, byte cap, PNG settings), `originalPath(id)`,
  `sharpTreatment()`.
- Goal row: optional `image` (YAML → `Goal.image` → D1 `goals.image TEXT`,
  column migration in `worker/scripts/migrate.ts`); null shows the
  category default. `worker/src/load.ts`: `MANIFEST_FILE`,
  `manifestPath(dataDir)` (beside `data/`, else the checkout the process
  runs in), `imageIds(path)` (ids of rows with a `file`) and
  `checkImage(goal, ids)`; the manifest is read only when a goal names an
  image.
- `imageIdFor(goal)`: the goal's `image` id when set (an unknown id
  throws), else by category: `state` → `state-capitol`; `leadership` →
  `house-floor` when the eligibility rule names the House, otherwise
  `senate-chamber`; `federal_vote` and `electoral` → `capitol-dome-dusk`.
- Licence labels on the page: `us-gov` "US government work, public
  domain", `pd` "public domain", `cc0` "CC0, public domain dedication",
  `cc-by` "CC BY". Source name: "Wikimedia Commons" for
  `commons.wikimedia.org`, otherwise the host without `www.`.
- `Photo` marks itself with `data-photo="<id>"` and, once loaded,
  `data-loaded`. Its styles are scoped to the component.
- `web/src/assets/portraits/`: `<bioguide_id>.webp` (160×200, ≤8 KB) and
  `missing.json` (sorted ids). `images.ts` reads the directory at build:
  `PORTRAIT`, `portraitIds()`, `hasPortraitFile(id)`.
- `worker/scripts/import-members.ts`: `portraitSources(id)`,
  `encodePortrait(bytes)`, `importPortraits(ids, dir, io)` →
  `{written, kept, missing, failed, fallback}` with the fetch, file and
  encoder functions injected (`PortraitIo`).
- `web/src/components/Target.tsx`: `Avatar`, `showsPortrait(t)`,
  `portraitSrc(id)`; `web/src/lib/goals.ts`: `pickBadge(pick, roster,
  hasFile)`.
- `web/src/layouts/Base.astro` has a `head` slot; the preload links of
  the landing, goal and prep pages are its users.
- `web/src/components/Results.tsx`: `Results({ photos })` takes the slug →
  image id map; `bandHtml(id, doc?)` → the template's markup or `null`
  (also for an id outside `a-z`, `0-9`, `-`); a card header with a band
  carries `data-band="<id>"`.

## Invariants (regression checklist)
- [ ] Every file in `web/src/assets/img/` has exactly one manifest row and
      every `file` row has its file.
- [ ] No row has `licence: ai` with `subject: person` or `place`.
- [ ] A row with no `licence` or no `source_url` fails
      `scripts/quiet-check.sh build`, and the error names the row.
- [ ] `/about` lists exactly the images in use; removing the last
      `<Photo>` from the pages removes the "Photo credits" section.
- [ ] With images blocked, a photo slot shows only its gradient.
- [ ] A page with no `<Photo>` ships no CSS, script or image from this
      capability.
- [ ] On the landing, a goal page and a prep page the preload's
      `imagesrcset` equals the hero's AVIF `srcset`, and the hero image is
      the page's LCP element.
- [ ] No image request leaves the site's origin on `/`, `/results`,
      `/goals`, a goal page or a prep page.
- [ ] A goal `image` with no manifest `file` row fails the seed and the
      build, naming the goal and the id.
- [ ] No hero or band is served wider than its original; the act, receipt
      and whip pages under a goal carry no `<Photo>`.
- [ ] A result card's CTA is the first element of its body; the band is
      above the body.
- [ ] The hero original is landscape and at least 1920 px wide; every
      original is at least 768 px wide.
- [ ] Every sitting member in `members.csv` has a portrait file or is in
      `missing.json`, never both; every file is a 160×200 WebP ≤8 KB.
- [ ] A portrait `<img>` is invisible until it has loaded; no page
      requests an image from another origin.

## Performance budget
- Each original ≤600 KB; the five files total ≤3 MB (1.33 MB today).
- Portraits: each ≤8 KB, the directory ≤4.5 MB. Imported 2026-11-08: 538
  files, 1.57 MB, the largest 5.4 KB; one member has no source portrait.
  Transferred at 390 px: 2.9 to 4.1 KB on a member page, 8.8 KB for the
  three members of one `/results` page, whose LCP element stays a card
  band (1.56 s before, 1.60 s after, Slow 4G with CPU 4x, localhost).
- Share card ≤200 KB (palette PNG). Built 2026-11-08: `/card.png`
  81.9 KB, goal cards 105.8 to 169.6 KB; title at least 3.2:1 over the
  photo's lightest pixel (large text, 3:1), other lines 10.7:1 or more.
- A page without a photo transfers no extra bytes. Tailwind scans these
  source files, so a bare utility name in a comment or a key adds CSS to
  every page; keep them out.
- Per slot, AVIF: a hero (landing, goal, prep) ≤35 KB on a phone and
  ≤75 KB on desktop; card band ≤25 KB each on the phone. Goal and prep
  heroes transferred 2026-11-08: 8.3 to 24.1 KB on a phone (the 640 px
  file) and 30.8 to 51.5 KB at 1440 px (`house-floor` at its own 1080 px
  is the largest). Built 2026-11-08: landing hero 8.2 / 15.0 /
  25.4 / 36.1 KB at 640 / 960 / 1440 / 1920 px; bands 3.7 to 12.1 KB at
  480 px and 7.6 to 22.3 KB at 768 px. The WebP fallbacks of `house-floor`
  (36.4 KB) and `senate-chamber` (29.8 KB) pass 25 KB at 768 px; a phone
  takes the 480 px file (WebP ≤17.7 KB).
- Landing ≤100 KB transferred on a phone and ≤170 KB on desktop, own
  origin, fonts excluded. Measured 2026-11-08 on a local preview build:
  97.1 KB at 390 px @3x (hero 25.6 KB and three bands loaded without a
  scroll), 86.7 KB at 412 px @1.75x (hero 15.2 KB), 101.1 KB at 1440 px;
  everything but photos is 44.1 KB. The NDAA card's band is the hearing
  room since goals carry `image`, 2.2 KB more than the Capitol band.
- LCP ≤1.5 s on a mid-range phone over 4G with the hero image as the LCP
  element (CLAUDE.md §Performance budgets). Measured 2026-11-08 at 412 px
  with CPU 4x: 532 ms on Fast 4G, 1,432 ms on Slow 4G, from localhost.
- H1 contrast over the lightest pixel behind it with the photo loaded:
  7.64:1 at 390 px, 8.27:1 at 1440 px; the 18 px paragraph 5.96:1 and
  9.37:1.
- Goal and prep heroes, lightest pixel behind each line of text with the
  photo loaded, at 390 / 768 / 1024 / 1440 px: H1 at least 7.40 / 9.05 /
  5.99 / 7.72:1; 18 px paragraph at least 6.88 / 6.27 / 6.95 / 9.06:1;
  13 px label at least 8.95:1. `/goals` card title: 4.45:1 at 390 px
  (30 px type, where large text needs 3:1), 5.88:1 or more from 768 px.
