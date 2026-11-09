# Site imagery

## Purpose
Every photo the site shows comes from one library under one policy: a real,
sourced, licensed photograph, never a generated picture of a person or a
real place. Every photo gets the same ink treatment and a credit line on
`/about`. This spec covers the library, the policy check, the `Photo`
component and the credits. It stops at the component: no page places a
photo yet, so today `/about` has no credits section.

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
4. **Photo.** `<Photo id widths sizes eager? class? />` is the only way a
   photo reaches a page. It fills its parent, which must be positioned and
   carry the slot's gradient (`hero-gradient`). It renders a `<picture>`
   with AVIF and WebP sources and a JPEG fallback at the given widths
   (widths above the original's are dropped), the manifest `alt`, lazy
   loading unless `eager` (then eager at high fetch priority). An unknown
   id stops the build.
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
8. **In use.** An image is in use when a page, component or layout source
   holds a literal `<Photo id="…" />`. Once any of them calls `imageFor(`
   or `imageIdFor(`, every published goal's image is in use. The
   `portraits` row is in use once `web/src/assets/portraits/` holds a
   `.webp`. Test files never count.

## Data & contracts
- `manifest.yaml` row: `id`, `file` | `dir`, `alt`, `subject`
  (`place` | `person` | `scene` | `texture`), `source_url`, `author`,
  `licence`, optional `credit`, `generator`, `prompt`, `taken`.
- `web/src/lib/images.ts`: `validate(rows)` → one message per problem;
  `MANIFEST`; `rowFor(id)`; `imageById(id)` → the original for
  `astro:assets`; `imageIdFor(goal)` / `imageFor(goal)`; `usedIds(sources,
  goalIds)`; `creditLine(row)`, `creditsFor(ids)`, `credits(goals)`;
  `TREATMENT`.
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

## Performance budget
- Each original ≤600 KB; the five files total ≤3 MB (1.56 MB today).
- A page without a photo transfers no extra bytes: `/` is 38,402 B gzip
  (HTML + CSS + JS) with and without the library. Tailwind scans these
  source files, so a bare utility name in a comment or a key adds CSS to
  every page; keep them out.
- Landing ≤100 KB transferred, LCP ≤1.5 s on a mid-range phone over 4G
  (CLAUDE.md §Performance budgets).
