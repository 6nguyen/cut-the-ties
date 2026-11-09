# Site imagery — PRD
Status: IN PROGRESS 2026-11-08 (§1 in review; §2–§5 to build) · Owner: George Nguyen · Last updated: 2026-11-08

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
  - [~] 1. Image library, policy and credits · feat/site-imagery-image-library-policy
  - [ ] 2. Landing and results heroes
  - [ ] 3. Goal pages
  - [ ] 4. Portraits: picks, targets and member pages
  - [ ] 5. Share cards
- Completed: §1 built, in review: five sourced originals and `manifest.yaml`, the policy check (a bad row fails `build` with the row named), `Photo.astro`, `/about` "Photo credits" (absent while no page shows a photo)
- Folded: §1 entries only: ADDED `docs/specs/site-imagery.md` (library, policy and check, `Photo` treatment, credits); MODIFIED `docs/specs/goal-pages.md` §Behavior 6 (`/about` credits). The §2–§5 parts of the delta are not folded.
- Branch / open PRs: feat/site-imagery-image-library-policy (PR pending)
- Files changed (file:line map): web/src/assets/img/ (5 jpg, manifest.yaml) · web/src/lib/images.ts:1-184 · web/src/lib/images.test.ts:1-152 · web/src/components/Photo.astro:1-57 · web/src/pages/about.astro:3-6,19-28 · docs/specs/site-imagery.md · docs/specs/README.md:36 · docs/specs/goal-pages.md:79-81
- Tests run + result: test-web PASS · build PASS · landing `/` 38,402 B gzip (HTML + CSS + JS) before and after · a build with two bad rows fails and names both · preview build: 5 of 5 photos load, 0 of 5 with images blocked
- Remaining: §2–§5
- Decisions since last update: Changes 2026-11-08 (the five picks; six deviations)
- Known failures / blockers: none. Owner review: the Architect of the Capitol usage notice on `capitol-dome-dusk`; `house-floor` (1080 px) and `senate-chamber` (946 px) are narrower than a desktop hero
- Next action: open the §1 PR
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
