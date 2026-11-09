# Site imagery — PRD
Status: IN PROGRESS 2026-11-08 (§1 merged, PR #80; §2 merged, PR #82; §3 merged, PR #84; §4 merged, PR #85; §5 in progress) · Owner: George Nguyen · Last updated: 2026-11-08

## Problem
The Stitch screens (`design/stitch/screens/`) put a photograph behind every
hero and goal card: the Capitol dome at dusk on the landing page, results
cards and share assets; the House floor, Senate chamber and a state capitol
on the goal cards; the Armed Services hearing room on the NDAA goal; the
Senate chamber and three senator portraits on the leader briefing. The
shipped site renders every one of those slots as the flat `hero-gradient`
plus halftone (`web/src/styles/global.css:65`), and `Base.astro` loads one
image in total, the 48 px wordmark. The design brief's first principle is
"image carries the feeling, text carries the ask"
(`docs/research/ui-design-brief.md`), and that half is missing: the pages
read as a well-set form, not as a campaign. The eight photos Stitch
generated (`design/stitch/images/`) cannot ship: they are AI renderings of
real buildings, unlicensed, and the brief already says to replace them.

## Goals / Non-goals
- Goals:
  1. Every hero and goal-card slot the Stitch screens photograph gets a real
     photograph with the ink treatment, on the landing page, results, goals
     overview, goal detail, prep page and the two share images.
  2. Every person the site names in a picks block, target card or member
     page is shown with their official portrait, never a generated likeness.
  3. One image library with provenance per file (source, author, licence,
     AI or not) and a generated credits block on `/about`, so a staffer or
     journalist can check any picture.
  4. Budgets hold: landing ≤100 KB transferred on the phone measurement
     that the LCP budget already targets, LCP ≤1.5 s, no third-party request.
- Non-goals: photos on the act form, document, receipt, donate, about and
  error screens (Stitch left those text-only on purpose: the user is
  writing or reading); photographs of Gaza or the war (the brief allows
  them sparingly, but no screen has a slot and a documentary photo next to
  a call button changes the register); a CMS or image upload path (files
  are committed like every other row in this repo); per-member photos on
  the whip table (a 435-row table with thumbnails is slower and no clearer).

## Research (what the best products do → adopt / adapt / reject)
Relies on: `docs/research/ui-design-brief.md` (image-sourcing table and
the Stitch prompts that specified each slot).

| Pattern | Seen in | Verdict | Why |
|---|---|---|---|
| Full-bleed photo under a dark gradient, headline in white | Stitch 01/02/03/04/05, 5 Calls, ACLU action pages | Adopt | Already the mock-up; the `from-ink` gradients make white type pass AA on any photo |
| One consistent photo treatment across mixed sources | Newspapers' campaign microsites, The Marshall Project | Adopt | Public-domain photos vary in colour and age; a fixed desaturate + contrast + halftone makes them read as one set and hides source differences |
| Official portraits next to a legislator's name | 5 Calls, GovTrack, Ballotpedia, the Senate's own site | Adopt | Recognition is the point of a name; official portraits are public-domain US government works and exist for every sitting member |
| AI-generated hero of a real place or person | The Stitch export itself | Reject | A rendering of the Capitol with the wrong number of columns, or a "Candidate A" face, is exactly what a Hill staffer or reporter screenshots to dismiss the site; real photos of these places are free and abundant |
| AI-generated mood scene with no identifiable place or person (hands on a phone at a kitchen table, a stack of letters) | Many 2025–26 nonprofit sites | Adapt | Allowed by policy, marked in the manifest and on `/about`; no v1 slot needs one, so v1 ships zero AI images and the policy stays ready for the brief's "person on a phone" slot when a screen gets it |
| Hot-linking portraits from a public CDN | Many civic sites using `theunitedstates.io` | Reject | Third-party request on every page leaks visitor IPs and breaks the "nothing is stored" stance; copies are committed instead |
| Blur-up / LQIP placeholder | Medium, Unsplash | Adapt | The existing `hero-gradient` is the placeholder: the photo fades in over it, so a slow or failed image leaves today's design intact |

## Users
- **Visitor from TikTok or a share link, on a phone.** Decides in two
  seconds whether this is real. The photo does that; it must not cost the
  address field a second of load time.
- **Staffer or reporter following a link.** Checks whether the pictures are
  what they claim. Alt text names the place; `/about` names the source and
  licence; a portrait is the one their own office issued.
- **Maintainer adding a goal.** Picks an image id in the goal's YAML or
  takes the category default; adds a new photo by dropping a file and a
  manifest row, and the build refuses a file without a licence.

## Expected behavior

### 1. Image library, policy and credits
1. `web/src/assets/img/` holds the originals (JPEG or PNG, ≤2000 px on the
   long side, ≤600 KB each) and `web/src/assets/img/manifest.yaml`, one
   row per file (fields under Data & contracts). The build (`astro:assets`
   with the installed `sharp`) emits AVIF and WebP at the widths each slot
   declares; nothing else resizes at request time.
2. **Policy, enforced by a vitest in `web/`:** every image the pages
   reference has a manifest row; every row has `source_url`, `author`,
   `licence` and `alt`; `licence` is one of `us-gov`, `pd`, `cc0`,
   `cc-by`, `ai`; a row with `subject: person` or `subject: place` may not
   have `licence: ai`; a `licence: ai` row needs `generator` and `prompt`.
   The test fails the `build` target, so a photo of a person or a real
   place can never be generated, and a generated image can never pass as
   a photograph.
3. **Treatment.** One `Photo.astro` component wraps `<Picture>` and
   applies the ink treatment: `filter: grayscale(.35) contrast(1.15)
   brightness(.95)`, the Stitch gradient pair (`from-ink via-ink/85
   to-ink/40` left-to-right, `from-ink via-transparent to-black/40`
   bottom-to-top) and the existing `halftone` layer. The photo sits over
   `hero-gradient`, so before it loads, or if it never does, the slot
   looks exactly as it does today.
4. **Credits.** `/about` gains a "Photo credits" section generated from
   the manifest: one line per image in use, "<alt>: <author>, <source>
   (<licence>)", with the source link; a line for any `ai` row reads
   "<alt>: illustration generated with <generator>; no photo of a person
   or a real place on this site is generated." The section is absent when
   no image is in use.
5. **Starting set** (all real photographs, sourced as the table in
   `docs/research/ui-design-brief.md` §Image sourcing says, with the
   licence check above): `capitol-dome-dusk` (Architect of the Capitol or
   Wikimedia, US-gov/PD), `house-floor` (House Creative Services or
   Wikimedia, US-gov), `senate-chamber` (Senate Photo Studio or Wikimedia,
   US-gov), `hasc-hearing-room` (Department of Defense, US-gov),
   `state-capitol` (Wikimedia, PD/CC0 preferred, CC BY with credit
   otherwise). CC BY-SA, NC, ND and news-agency photos are not accepted,
   so no licence ever constrains the recompressed copies.

### 2. Landing and results heroes
1. **Landing (`/`).** The hero section carries `capitol-dome-dusk` as a
   full-bleed `Photo` behind the existing label, H1, "Your week" card and
   address form; the text column keeps its max width and left alignment.
   The image is the LCP element: `loading="eager"`,
   `fetchpriority="high"`, a `<link rel="preload">` for the matching
   source, widths 640/960/1440/1920, `sizes="100vw"`. Mobile source ≤35
   KB, desktop ≤75 KB.
2. **Landing goal cards.** Each "What's being decided right now" card's
   header band becomes a 16:9 `Photo` of the goal's image (Data &
   contracts: `image` or the category default) with the chip and title
   over the bottom gradient, as in Stitch 01; `loading="lazy"`, widths
   480/768, `sizes` from the grid; ≤25 KB each on the phone.
3. **Results (`/results`).** Each of the two result cards gets the same
   16:9 band above the CTA; the CTA stays first in the body (PR #62
   decision), the band only sits above it. Lazy, same widths.
4. **Failure paths.** A missing or unloadable image shows the gradient
   slot with no broken-image glyph (the `<img>` is `alt`-labelled and the
   slot's background is the gradient). An `upcoming` goal has no page and
   no card, so nothing to render.

### 3. Goal pages
1. **Goals overview (`/goals`).** Every active-goal card gets the 16:9
   band (as 2.2); the Outcomes strip stays text-only.
2. **Goal detail (`/goals/<slug>`).** The hero carries the goal's image as
   a full-bleed `Photo` (eager, `fetchpriority="high"`, preload), chips
   and title over it. The share card for the page (5.1) uses the same
   image so the link preview and the page match.
3. **Prep page (`/goals/<slug>/prep`).** Same hero as the goal page. For a
   `leadership` goal the picks block shows each pick's portrait (4.1) at
   80 px beside name and rationale; a pick without a `bioguide_id` shows
   the party-coloured initial badge instead, never a placeholder face.
4. **Category defaults** (`web/src/lib/images.ts`): `federal_vote` →
   `capitol-dome-dusk`; `leadership` → `house-floor` when the goal's
   eligibility names the House, else `senate-chamber`; `state` →
   `state-capitol`; `electoral` → `capitol-dome-dusk`. A goal's `image`
   field overrides the default; `ndaa-1217` and `ndaa-report-vote` set
   `image: hasc-hearing-room` so the two NDAA goals do not share the
   landing's Capitol photo.

### 4. Portraits: picks, targets and member pages
1. **Source and storage.** `npm run import-members -w worker` gains a
   `--portraits` step: for every row in `data/members.csv` and
   `data/members_elect.csv` with no file at
   `web/src/assets/portraits/<bioguide_id>.jpg`, it downloads the
   225×275 official portrait from the `unitedstates/images` repository
   (public-domain US government works; the Bioguide photo as fallback),
   recompresses to 160×200 WebP ≤8 KB, and writes the file. Existing
   files are kept, so the step is idempotent and offline-safe; the
   manifest gets one `portraits` row covering the directory. A member
   with no portrait in either source gets no file and renders the badge.
2. **Target cards.** The 40 px party badge becomes a 48 px portrait with
   a 2 px party-coloured border (D cobalt, R crimson, other hazard) and
   the party letter as a 16 px corner tag in the same colour, so the
   colour code survives; a member-elect or a treasurer, who has no
   portrait, keeps today's badge. `alt=""` (the name is beside it).
3. **Member page (`/m/<bioguide_id>`).** The hero shows the portrait at
   120×150 left of the title on ≥640 px and above it below; the portrait
   has the ink treatment's contrast step but no gradient.
4. **Treasurers and state officials.** No portrait in v1 (state photo
   licences vary; see Open questions 2); the badge renders.

### 5. Share cards
1. `/goals/<slug>/card.png` and `/card.png` composite the goal's photo
   (the landing's `capitol-dome-dusk` for `/card.png`) behind the
   existing ink gradient and text with `sharp`, at 1200×630, output
   ≤200 KB, and the text block is unchanged. Stitch 09 is the reference.
2. The 1080×1350 share card from Stitch 09 is out of scope here: it ships
   with the social-sharing change when that PRD lands and reuses `Photo`'s
   treatment constants.

## Data & contracts
- `web/src/assets/img/manifest.yaml`: list of `{id, file, alt, subject:
  place|person|scene|texture, source_url, author, licence: us-gov|pd|cc0|
  cc-by|ai, credit?, generator?, prompt?, taken?: YYYY-MM-DD}`; plus one
  `{id: portraits, dir: ../portraits, subject: person, licence: us-gov,
  source_url: https://github.com/unitedstates/images, alt: Official
  congressional portraits}` row.
- `web/src/lib/images.ts`: `imageFor(goal): ImageMetadata` (field, then
  category default), `credits(): CreditLine[]`, `TREATMENT` constants
  shared with the card renderer.
- `web/src/components/Photo.astro`: `{id, widths, sizes, eager?, class?}`.
- Goal YAML: optional `image: <manifest id>`; the loader
  (`worker/src/loader.ts`) rejects an id not in the manifest at seed, the
  same way it rejects a bad `successor_slug`. `our_picks[]` gains an
  optional `bioguide_id`.
- `web/src/assets/portraits/<bioguide_id>.webp` (160×200, ≤8 KB), written
  by `import-members --portraits`, read by `Target.tsx`, `prep.astro`,
  `m/[id].astro`.
- `web/src/pages/goals/[slug]/card.png.ts` `renderCard(svg, imageId)`.
- No new endpoint, no client state, no third-party request at runtime.

## Spec delta
- ADDED `docs/specs/site-imagery.md`: the whole capability (library and
  manifest, licence policy and the build-time check, the `Photo`
  treatment, credits on `/about`, portrait import and storage, per-slot
  size budgets).
- MODIFIED `docs/specs/action-router.md` §Behavior 1: landing hero is the
  gradient → full-bleed `capitol-dome-dusk` photo with the ink treatment
  over the gradient; result cards gain a 16:9 photo band above the CTA.
- MODIFIED `docs/specs/action-router.md` §Performance budget: "29.2 KB
  gzip … fonts excluded" → the same page plus the mobile hero source, ≤100
  KB on the phone measurement, ≤170 KB on desktop, with the new numbers.
- MODIFIED `docs/specs/goal-pages.md` §Behavior 1, 2, 4: overview cards get
  the photo band; goal and prep heroes carry the goal's photo; picks show
  portraits; share card composites the photo.
- MODIFIED `docs/specs/goal-pages.md` §Data & contracts: goal row gains
  `image`; `our_picks[]` gains `bioguide_id`.
- MODIFIED `docs/specs/goal-pages.md` §Performance budget: new measured
  numbers for `/goals`, `/goals/<slug>`, `/goals/<slug>/prep` with photos.
- MODIFIED `docs/specs/target-cards.md` §Behavior 1: 40 px party badge →
  48 px portrait with party border and corner tag; badge kept when no
  portrait exists.
- MODIFIED `docs/specs/member-pages.md` §Behavior 1: roster import gains
  `--portraits`; §Behavior 3: hero shows the portrait; §Performance
  budget: new measured number.
- MODIFIED `docs/specs/goal-pages.md` §Behavior 2 ("donate/about/privacy"
  copy): `/about` gains the generated "Photo credits" section.

## Acceptance criteria
- [ ] `/`, `/results`, `/goals`, `/goals/<slug>`, `/goals/<slug>/prep`
      show a photograph in every slot Stitch photographs; `/act`, the
      receipt, `/donate`, `/about`, `/privacy`, `/404` show none.
- [ ] Every photo on the site is of a real place, and every portrait is an
      official one; `grep licence: ai web/src/assets/img/manifest.yaml`
      is empty in v1.
- [ ] Adding a manifest row without `licence` or `source_url`, or a
      `subject: place` row with `licence: ai`, fails
      `scripts/quiet-check.sh build` with the row named.
- [ ] `/about` lists every image in use with author, source link and
      licence; removing a photo from every page removes its line.
- [ ] With images blocked in devtools, every slot shows today's gradient
      and no broken-image icon; the H1 text passes AA over every photo at
      its darkest and lightest point (checked with the contrast picker).
- [ ] Landing on an emulated mid-range phone over 4G: ≤100 KB transferred
      including the hero source, fonts excluded; LCP ≤1.5 s with the hero
      image as the LCP element; desktop ≤170 KB. Numbers quoted in the PR.
- [ ] `/goals/<slug>` and `/goals/<slug>/prep` ≤100 KB on the phone
      measurement; `/m/<id>` ≤100 KB.
- [ ] No request leaves the site's origin for an image (network panel on
      `/`, `/results`, `/m/<id>`).
- [ ] `import-members --portraits` on a clean checkout writes one WebP ≤8
      KB per member with a source portrait, prints the ids with none, and
      a second run changes no bytes.
- [ ] Target cards show the portrait with the party-coloured border and
      letter tag; a member-elect and a treasurer show the badge; the call
      square, role line and every other line are unchanged.
- [ ] `/goals/ndaa-1217/card.png` renders the hearing-room photo behind the
      text, 1200×630, ≤200 KB; `/card.png` renders the Capitol.
- [ ] Repository growth from this change ≤6 MB (five photos ≤3 MB,
      portraits ≤4.5 MB measured, budget total in the PR).

## Rollout & metrics
No flag: static build, every slot has the gradient fallback. Ships in
section order; §1 alone is invisible. Measure on the Pages preview: Chrome
Lighthouse mobile LCP and transferred bytes for `/` before and after §2,
quoted in the PR. Success is the budget holding; there is no engagement
metric a static site can read without analytics, and the site has none.

## State (updated 2026-11-08) — ≤30 lines
- Sections: (build order; `[ ]` todo · `[~]` in progress · `[x]` merged · `[!]` blocked: reason)
  - [x] 1. Image library, policy and credits · PR #80 merged
  - [x] 2. Landing and results heroes · PR #82 merged
  - [x] 3. Goal pages · PR #84 merged
  - [x] 4. Portraits: picks, targets and member pages · PR #85 merged
  - [~] 5. Share cards · feat/site-imagery-share-cards
- Completed: §1 merged (library and `manifest.yaml`, policy check, `Photo.astro`, `/about` credits). §2 merged (landing hero photo with its preload link, 16:9 photo band on landing goal cards and result cards, landscape `capitol-dome-dusk`). §3 merged (16:9 band on every `/goals` card, goal and prep hero photos, the goal `image` field end to end with the loader check). §4 merged: `import-members --portraits` (538 WebP files and `missing.json`), `/portraits/<bioguide_id>.webp`, 48 px portraits on target cards, the 120×150 member hero portrait, the prep picks block with `our_picks[].bioguide_id` and its loader check, filled buttons on the member hero, `/about` lists six credits
- Folded: §1 (ADDED `docs/specs/site-imagery.md`; `goal-pages.md` §Behavior 6). §2: `action-router.md` §Behavior 1 and §Performance budget; `site-imagery.md` §Behavior 9–11 and §Performance budget. §3: `goal-pages.md` §Behavior 1 and 2, §Data & contracts (`image`), §Invariants, §Performance budget; `site-imagery.md` §Behavior 7, 10, 12, 13, contracts, invariants and budgets. §4: `target-cards.md` §Behavior 1; `member-pages.md` §Behavior 1, 3 and §Performance budget; `goal-pages.md` §Behavior 4 and §Data & contracts (`our_picks[].bioguide_id`); `site-imagery.md` §Behavior 14 and 15, contracts, invariants and budgets. Left for §5: the share card compositing the photo (`goal-pages.md` §Behavior 2)
- Branch / open PRs: feat/site-imagery-share-cards
- Files changed (file:line map): .github/workflows/roster.yml (portrait step, `add-paths`) · docs/specs/maintainer-tooling.md §6 · worker/scripts/import-members.ts:5,10,124-212,222 · worker/src/load.ts:126-132,251,297 · worker/src/types.ts:113 · worker/test/goals.test.ts:6,197-214 · worker/test/members.test.ts:7,187-249 · web/src/assets/portraits/ (538 `.webp` + `missing.json`) · web/src/assets/img/manifest.yaml:59 · web/src/pages/portraits/[id].webp.ts:1-14 · web/src/components/Target.tsx:2,7,21-51,71,79 · web/src/components/Results.test.tsx:9,137-177 · web/src/components/Target.test.ts:116,119 · web/src/lib/goals.ts:6,9,51-57 · web/src/lib/images.ts:6-7,193-205,212 · web/src/lib/images.test.ts:8-11,238-298 · web/src/pages/m/[id].astro:9-10,16-17,29-36,44-45,48-49 · web/src/pages/goals/[slug]/prep.astro:6-9,22-23,61-66,74 · web/src/styles/global.css:66-71 · docs/specs/target-cards.md · docs/specs/member-pages.md · docs/specs/goal-pages.md · docs/specs/site-imagery.md
- Tests run + result: tsc PASS (0 type errors) · test PASS (26 files, 383 tests) · test-web PASS (27 files, 247 tests) · build PASS (11 s, as before) · prd-lint PASS · doc-lint PASS · import: 538 written (14 from Bioguide), 1 with no source portrait (A000383), 1,574,374 bytes, largest 5,404; second run 0 written, no byte changed · local build served with gzip, 390 px @2x, fonts excluded: `/m/<id>` 65.0 to 66.4 KB with a portrait (2.9 to 4.1 KB), 61.2 KB without · `/results` 94.2 KB (84.9 before; three portraits 8.8 KB) · `/results` LCP 1,596 to 1,604 ms (1,556 to 1,564 before; Slow 4G, CPU 4x), a card band both times · `/m/<id>` LCP 484 to 492 ms, the portrait · 0 image requests off-origin · portraits blocked: 0 visible, 0 broken-image icons
- Remaining: §5
- Follow-ups: §5 builds 3.2's share card using the goal's image; `docs/specs/action-router.md` §Performance budget quotes landing bytes 2.2 KB under today's (not this PR's file)
- Decisions since last update: Changes 2026-11-08 (§4 built; eleven decisions and deviations)
- Known failures / blockers: none. Owner review: 14 portraits come from the Bioguide fallback, which the `unitedstates/images` licence statement does not cover (ids in Changes): confirm or drop; A000383 has no portrait in either source and shows the badge; `/results` LCP is over 1.5 s on this run's Slow 4G profile before and after this section, re-check on the Pages preview; `house-floor` (1080 px) and `senate-chamber` (946 px) are stretched on a desktop hero wider than the file; production D1 needs the `goals.image` column (`worker/scripts/migrate.ts`) before the next seed
- Next action: finish §5 on feat/site-imagery-share-cards, then archive this PRD in the same PR
## Open questions
1. Which exact Capitol, House, Senate, hearing-room and state-capitol
   photos? Proposal: the implementing session picks the highest-resolution
   public-domain candidate for each from the sources named in §1.5, puts
   the five candidates' source links in the §1 PR body, and the owner
   swaps any one by replacing the file and the manifest row.
2. Portraits for state treasurers and other state officials? Proposal:
   none in v1; state photo licences vary by state and the `state` goal
   names one official per state, so a hand-checked `licence` row per
   portrait is a later change on `state-holdings-sweep`.
3. Should any v1 slot use an AI image? Proposal: no. Every v1 slot shows a
   real place or a real person, so the policy's `ai` licence stays unused
   until a screen gets a generic scene (the brief's "person on a phone").
4. Desktop landing budget. Proposal: the ≤100 KB budget was written with
   the phone LCP clause and stays on the phone measurement; desktop gets
   its own ≤170 KB line in the spec. If the owner wants ≤100 KB on desktop
   too, the desktop hero drops to ≤50 KB AVIF and the acceptance line
   changes; not blocking because the photo slots and sources are the same.
5. Keep the 435+100 portraits in git or fetch them in CI at build time?
   Proposal: commit them (≤4.5 MB WebP); CI stays offline-safe and a
   roster change is one reviewed diff, consistent with `web/public/districts/`.

## Changes
- 2026-11-08 — created; no blocking questions, APPROVED (auto).
- 2026-11-08 — Status APPROVED → READY. Status word moved to the board vocabulary in `docs/prd/README.md` (READY, IN PROGRESS, DEV COMPLETE, TESTING); no scope change.
- 2026-11-08 — §1 built. Open question 1 decided as proposed; the five picks, each from its Wikimedia Commons file page with the licence read from that page: `capitol-dome-dusk` (Architect of the Capitol, US government work), `house-floor` (Office of the Speaker, US government work), `senate-chamber` (United States Senate, US government work), `hasc-hearing-room` (TSgt. Jack Sanders, Department of Defense, US government work), `state-capitol` (Minnesota State Capitol, Aschbren, CC0). For the owner: the Architect of the Capitol asks for the credit "Architect of the Capitol" (recorded) and its own page limits use to educational, scholarly, news or personal purposes; `house-floor` is 1080 px wide and `senate-chamber` 946 px wide, the largest public-domain files found, so a hero wider than that upscales them; the Capitol photo is portrait.
- 2026-11-08 — §1 deviations from the text. (a) The policy check runs when `web/src/lib/images.ts` loads, which `/about` imports, so the `build` target fails on a bad row without a change to `web/package.json`; the vitest file runs the same check under `test-web`. (b) The `portraits` row carries an `author`, which the contract row lacked and the policy requires. (c) The category defaults of §3 item 4 ship now as `imageIdFor(goal)`, because the credits need to know which image a goal page will show; the goal `image` field and its loader check stay in §3 (the loader is `worker/src/load.ts`, not `loader.ts`). (d) "In use" is read from page sources: a literal `<Photo id>` or a call to `imageFor(`. (e) Without JavaScript a photo slot keeps its gradient; the photo appears only after its `load` event. (f) No page places a photo in §1, so `/about` has no credits section until §2.
- 2026-11-08 — §2 built: the landing hero is `capitol-dome-dusk` full bleed (eager, high fetch priority, a preload link carrying the hero's AVIF `srcset`, widths 640/960/1440/1920); landing goal cards and result cards carry a 16:9 band of the goal's image (lazy, 480/768); `/about` now lists four credits. `capitol-dome-dusk` was replaced: the §1 file was portrait (1306×2000), which a full-bleed landscape hero crops to a strip of sky. The new file is "Capitol at Dusk View from Library of Congress Jefferson Building", https://commons.wikimedia.org/wiki/File:Capitol_at_Dusk_View_from_Library_of_Congress_Jefferson_Building_(14144445175).jpg, author Architect of the Capitol, US government work (`PD-USGov-Congress-AOC` on the file page, Flickr review passed), resized from 2500×1466 to 2000×1173, 228 KB. For the owner: it carries the same Architect of the Capitol usage notice and credit as the file it replaces, and a small AOC logo in the bottom-right corner of the frame. Measured on a local preview build, own origin, fonts excluded: landing 94.9 KB at 390 px @3x, 84.5 KB at 412 px @1.75x, 98.8 KB at 1440 px; hero AVIF 15.2 to 25.6 KB on the phone and 25.6 KB on desktop; bands 3.9 to 12.3 KB each on the phone; LCP 532 ms at Fast 4G with CPU 4x and 1,432 ms at Slow 4G, the hero image being the LCP element; no image request leaves the origin on `/` or `/results`.
- 2026-11-08 — §2 deviations from the text. (a) Encoder quality is 30 for the hero and 22 for the bands (§1 shipped 35 for every slot), and below 768 px a band is declared at 36vw although the card is 92vw wide, so a phone takes the 480 px file: at 35 with the true width two bands passed 25 KB and the phone landing passed 100 KB. A browser with WebP but no AVIF at 768 px or wider gets the `house-floor` (36.4 KB) and `senate-chamber` (29.8 KB) bands over 25 KB. (b) Result cards are rendered in the browser, so `/results` ships one inert `<template>` per image holding the built `Photo` markup and each card copies it. (c) `Photo` gains a `quality` prop and `Base.astro` a `head` slot for the preload link. (d) Below 768 px the loaded hero photo is dimmed to `brightness(.75)`: the 18 px paragraph measured 3.67:1 over the lightest pixel behind it without the dimming and 5.96:1 with it; the H1 is 7.64:1 at 390 px and 8.27:1 at 1440 px. (e) Without JavaScript the hero stays the gradient (§1 deviation e), left as is. (f) The goal `image` field is §3, so every band shows the category default from `imageIdFor`. (g) LCP and bytes were measured against a localhost preview with Chrome's network and CPU throttling, not the Pages preview, so the LCP excludes real connection setup. (h) `docs/specs/action-router.md` sat at the 16,000-byte doc-lint limit, so the fold dropped two clauses from its §Behavior 1 that its §Data & contracts already states (which results an adapter drops; `none` as the default and for a missing token) and shortened the measured-bytes sentence; the file is now 15,974 bytes and the next fold into it needs a split.
- 2026-11-08 — §3 built: every `/goals` card carries the 16:9 band of its goal's image (the first eager, the rest lazy); `/goals/<slug>` and `/goals/<slug>/prep` carry the goal's image as a full-bleed hero (eager, high fetch priority, a preload link carrying the hero's AVIF `srcset`); goals gain the optional `image` field end to end (YAML → `worker/src/load.ts` → `Goal.image` → D1 `goals.image`), and the loader refuses an id with no `file` row in the manifest, naming the goal and the id; `ndaa-1217` and `ndaa-report-vote` set `hasc-hearing-room`, so `/about` lists five credits and the landing's NDAA card band is now the hearing room. Measured on a local preview build, own origin, fonts excluded: `/goals` 46.5 KB at 390 px @3x and at 412 px @1.75x (three bands of 6.4 to 12.6 KB), 80.1 KB at 1440 px; `/goals/<slug>` 48.4 to 64.4 KB on both phones over four goals (hero 8.3 to 24.1 KB), 71.0 to 91.8 KB at 1440 px (hero 30.8 to 51.5 KB); `/goals/<slug>/prep` 44.4 to 56.0 KB and 67.4 to 83.4 KB; the landing re-measured at 97.1 KB at 390 px @3x, 86.7 KB at 412 px @1.75x and 101.1 KB at 1440 px. LCP at 412 px with CPU 4x, the photo being the LCP element on every page: 576 to 592 ms on Fast 4G and 1,400 to 1,424 ms on Slow 4G. No image request leaves the origin on `/goals`, a goal page or a prep page; with images blocked every slot shows its gradient. Text over the lightest pixel behind it with the photo loaded, at 390, 768, 1024 and 1440 px: hero H1 5.99:1 or more, 18 px paragraph 6.27:1 or more, 13 px label 8.95:1 or more; `/goals` card title 4.45:1 or more (30 px type, where large text needs 3:1).
- 2026-11-08 — §3 decisions and deviations from the text. (a) 3.2's share card using the same image is built in §5; no `card.png.ts` changed. (b) 3.3's picks block (80 px portrait, initial badge, `our_picks[].bioguide_id`) moves to §4, which owns portraits: §3 built the prep hero only, and `goal-pages.md` §Behavior 4 and the `bioguide_id` contract stay unfolded for §4. (c) The loader is `worker/src/load.ts`, not the `loader.ts` the contract names; it looks for the manifest beside `data/`, then in the checkout the process runs in, and reads it only when a goal names an image. (d) `worker/scripts/migrate.ts` gains the `goals.image` column migration: the seed upserts every goal key, so production D1 needs the column before the next seed. (e) A hero file narrower than 1920 px also serves its own width (`house-floor` 1080 px, `senate-chamber` 946 px) rather than a 960 or 640 px copy stretched further; nothing is upscaled at build and neither photo was swapped, so a screen wider than the file still stretches it. For the owner: source wider public-domain photos of the two chambers, or accept the soft desktop hero on the leadership goals. (f) Goal and prep heroes declare 49vw below 768 px, so a phone takes the 640 px file: at 100vw a 3x phone took `house-floor` at 1080 px, 51.5 KB, and `senate-chamber` at 946 px, 45.7 KB, both over the 35 KB phone-hero slot (the page still held 100 KB: 91.8 KB). (g) The hero photo is dimmed to `brightness(.75)` below 1024 px (the landing: below 768 px): undimmed at 768 px the 18 px paragraph measured 4.02:1 and the 13 px label 4.14:1 over the lightest pixel behind them. (h) The first `/goals` band loads eagerly: lazy, it was the LCP element at 2,196 ms on Slow 4G; eager, 1,408 ms. (i) Not changed, for the owner: the prep hero's "About this goal" ghost button is ink text on the dark hero, 1.18:1 to 1.40:1 with the photo, and was as dark on the gradient before it; the landing bytes quoted in `docs/specs/action-router.md` §Performance budget are 2.2 KB stale (that spec is edited by another PR and sits at the doc-lint limit). (j) LCP and bytes were measured on localhost with Chrome's throttling, as in §2, not on the Pages preview.
- 2026-11-08 — §3 fix: the prep hero's "About this goal" button was a ghost button, ink text on the dark hero at 1.18 to 1.40:1; it is now filled newsprint with ink text, 18.48:1 (white on hover, 19.78:1), the same pairing as the "Prep" chip beside it. No other button changes.
- 2026-11-08 — §4 built: `import-members --portraits` writes one 160×200 WebP of at most 8 KB per sitting member to `web/src/assets/portraits/` and the ids with no source portrait to `missing.json`; the site serves each file at `/portraits/<bioguide_id>.webp`; a target card shows a 48 px portrait with the party-coloured border and corner tag over the party letter, the member hero a 120×150 portrait beside the title (above it under 640 px), and the prep picks block an 80×100 box per pick (the portrait over the party-coloured initial); `our_picks[]` takes an optional `bioguide_id`, which the loader checks against `members.csv`. Source: `unitedstates/images` (repository licence CC0-1.0; its README says the photos are from the Government Printing Office and in the public domain). Measured: 538 files written (14 from the Bioguide fallback), one member with no source portrait (A000383), 1,574,374 bytes in total (2,272 KB on disk), the largest 5,404 bytes (E000301); a second run wrote 0 files and changed no bytes. From a local build served with gzip at 390 px @2x, fonts excluded, before → after: `/m/C001110` 61.7 → 65.0 KB, `/m/P000145` 62.0 → 66.4 KB, `/m/A000383` (no portrait) 61.0 → 61.2 KB, `/results` for AZ-1 84.9 → 94.2 KB (8.8 KB is its three portraits), `/goals/senate-leader` 82.9 → 83.5 KB. `/results` LCP 1,556 to 1,564 ms before and 1,596 to 1,604 ms after (Slow 4G at 1.6 Mbps and 150 ms, CPU 4x, localhost), the element a card band both times; `/m/P000145` LCP 456 to 460 ms (the H1) before and 484 to 492 ms (the portrait) after. No image request leaves the origin on `/`, `/results` or `/m/<id>` (the only off-origin requests are the Google Fonts stylesheet and its font files). With `/portraits/*` blocked: 0 of 5 card portraits visible, 0 broken-image icons. Build 11 s before and after.
- 2026-11-08 — §4 decisions and deviations from the text. (a) The file is `<bioguide_id>.webp`; 4.1's `.jpg` is a slip (Data & contracts says `.webp`). (b) The import covers `data/members.csv` only: a `members_elect.csv` row has an `elect_id` and no Bioguide id, so a member-elect keeps the badge; rows with `left_office` are skipped because the site never builds, lists or routes them. (c) Each file has a stable URL from a static endpoint (`web/src/pages/portraits/[id].webp.ts`), because target cards render inside islands and cannot use hashed asset URLs; `images.ts` reads the directory from disk instead of an `import.meta.glob`, so no URL map reaches a client bundle. (d) The party badge is the base layer and the image shows only once it has loaded; `missing.json` lets a card skip the `<img>` for a member with no portrait, so no 404 is requested. A 403 from a source counts as "no portrait" like a 404; a network failure is printed as failed, exits 1 and is never recorded as missing. (e) 3.3's picks block is built here: the optional `bioguide_id`, the loader check naming the goal and the id, an 80×100 box, the party colour from the member row and hazard without an id. Every goal's `our_picks` is `[]`, so fixture tests cover it and the screenshot used an uncommitted fixture; no `data/` file changed. (f) The member hero's district-office and contact buttons were ghost buttons, ink text on the dark hero (1.2 to 1.4:1); they are filled newsprint with ink text, the pairing §3 gave the prep hero. (g) Portraits come from `unitedstates/images` and, for the 14 members it has no photo of, the Bioguide photo (B001321, B001323, B001324, B001328, F000485, G000606, G000607, G000608, H001104, M001245, M001246, V000139, W000831, W000832); the manifest's `portraits` row names both as author. For the owner: the `unitedstates/images` licence statement does not cover those 14 files, which are the official portraits the Biographical Directory publishes; confirm them or say so and the fallback comes out (those cards then show the badge). (h) A card portrait is a 48×48 box showing the top of the 160×200 file, lazy and with low fetch priority; the priority changed no measured number. (i) The other-party badge is ink text on hazard. (j) Two existing assertions describe behaviour this section replaces and were updated: `Target.test.ts` (a sitting member's header box is the portrait box, not the 40 px badge) and `images.test.ts` (the credits list gains the `portraits` row, six lines on `/about`). (k) A returning visitor's landing renders target cards, so it requests their portraits too (three files, 8.8 KB for AZ-1); a first visit requests none.
- 2026-11-08 — §4 review: the weekly roster workflow (`.github/workflows/roster.yml`) now runs `import-members --portraits` after the roster import and commits `web/src/assets/portraits/` with `data/` in its PR, so a roster PR that adds a member carries that member's portrait (or the `missing.json` line) and `test-web` stays green; a source the runner cannot reach only warns and the id is retried on the next run. `maintainer-tooling.md` §6 says so. The step was run locally (0 written, 538 kept, 1 with no source portrait, no byte changed); the workflow itself has not run on GitHub yet.
