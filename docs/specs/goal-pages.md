# Goal pages

## Purpose
The public pages behind the two result cards: the goals overview, each
goal's detail and prep pages, the goal lifecycle that decides which goals
are published, and the static `/donate`, `/about` and `/privacy` pages.
Address lookup, ranking and the result cards are in `action-router.md`;
the act page is in `personalised-documents.md`. Split out of
`action-router.md` on 2026-11-05; the behavior numbers below were 8–15
there.

## Behavior
1. **Goals overview (`/goals`).** Every `active` goal as a card in
   rank order: category chip, "Impact n" chip (the goal's `priority`,
   `action-router.md` Ranking), title, summary (≤60
   words, enforced at seed), "We want" sentence, decision date or "not yet
   scheduled", CTA to `/goals/<slug>`. The card's header is a 16:9 band
   of the goal's photo under the chips and title; the first card's loads
   eagerly, the rest lazily ([site-imagery.md](site-imagery.md) Behavior
   10). Below, a text-only "Outcomes" strip lists
   every `completed` and `expired` goal with its `outcome_note` and
   decision date (empty state: "No goal has closed yet"). Two columns at
   ≥768 px. The footer, and each goal page's aside, carry the
   decision-date feed link (`decision-feed.md`).
2. **Goal detail (`/goals/<slug>`).** Hero (category chip, status chip
   when closed, title, summary, decision date) over the goal's photo,
   full bleed; the prep page's hero carries the same photo
   ([site-imagery.md](site-imagery.md) Behavior 12); "The basics / What is
   going on" (`detail_md` rendered as markdown, else the summary); "What
   we are asking for"; "Who makes the call, and when" (`decider`, decision
   date, window end); "Who we would back instead" block when `our_picks` is non-empty (first pick: name, rationale,
   source link, signal date); the goal's actions as buttons to
   `/goals/<slug>/act/<action>`; partner campaign link when `partner_url`
   is set; sources list (`sources` rows) or a "not yet sourced" line.
   A "Where everyone stands →" link opens `/goals/<slug>/whip` for goals
   that have a whip table (`member-pages.md`). The
   sidebar's "Who to call" island reads the stored `{state, district}`
   and calls `GET /api/goals/<slug>/targets` (for a leadership goal: the
   incoming delegation's Democratic-caucus seats, members-elect included,
   `action-router.md` Behavior 7); with nothing stored it shows
   "Enter your address" linking to `/`. Targets render as the same
   cards as a result card (`target-cards.md`), with the counter line
   below the stack when the list is non-empty (`district-counters.md`).
   A tap on a card's call or write square posts the receipt and opens the
   receipt modal of `results-pages.md` §4–7 (`tap-receipts-everywhere`
   §2), with the same done card and postmark; Next links to `/results`
   once every office is done; a goal with no action keeps plain links.
   A closed goal shows its outcome
   block instead of targets and actions. Every page carries Open Graph
   and Twitter share metadata with a 1200×630 card at
   `/goals/<slug>/card.png` (other pages use `/card.png`). The card shows
   the goal's photo (`/card.png`: `capitol-dome-dusk`) behind the two ink
   gradients the page hero uses, cropped about its centre (`/card.png`:
   `CARD_CROP`, so the dome sits right of the title) with the `Photo`
   filter and no halftone. The top bar, category line, title, rule,
   what-we-want line and logo mark are where they were before photos; only
   the ground behind them changed. Over the lightest point of any library
   photo the title is at least 3:1 (large text) and the two smaller lines
   at least 4.5:1 ([site-imagery.md](site-imagery.md) Behavior 16).
3. **Goal lifecycle.** `upcoming → active → completed | expired`. An
   `upcoming` goal has no page, is absent from `/api/goals` and from the
   ranking. When the goal naming it in `successor_slug` is `completed` or
   `expired`, the loader flips it to `active` on the next seed and build,
   so retiring a goal is one YAML edit and no code change.
4. **Prep page (`/goals/<slug>/prep`).** Built for every published goal
   with a non-empty `prep_md` (never for `upcoming` goals); the goal page
   links to it ("Prep: what to say"). Hero with a "Take action" anchor;
   for a `leadership` goal the page leads with "Our picks / Who we would
   back instead": up to three
   `our_picks` in order, each a card with an 80×100 box
   (`data-pick-badge`) beside the name, rationale, source link, signal and
   signal date (plus "as of" the latest signal date). The box holds the
   pick's initial on the party colour of its `bioguide_id` member (hazard
   without one) and, over it once loaded, that member's portrait when a
   file exists; never a placeholder face. Then "What to ask for, in one
   line" = `what_we_want` followed by "Our first pick: <name>." (just
   `what_we_want` with no picks; a leadership goal with no picks says so
   instead of naming anyone). Then the six `prep_md` sections as numbered
   blocks (where things stand, timeline, what to say in 30 seconds, likely
   pushback and answers, what counts as a win, sources; the goal's
   `sources` rows are listed under Sources). `[VERIFY: …]` markers render
   as visible chips. The "Take action" island reads the stored
   `{state, district}`, calls `GET /api/goals/<slug>/targets` and links each
   target to `/goals/<slug>/act/<action>?target=<bioguide_id>` for every
   action of the goal (no `target` for a target without a bioguide id; no
   stored place shows "Enter your address" plus a plain link to the first
   action). A closed goal has no Take action block.
5. **Donate (`/donate`).** States "This site is built and paid for by
    one volunteer, not a PAC or organisation. Donations are not
    tax-deductible and are not political contributions to any candidate.",
    then "Donations pay for hosting and the model that drafts your
    documents. Nothing else is funded." No running cost is shown; actual
    spend and the LLM budget are internal (`LLM_MONTHLY_BUDGET_USD`).
    Three Stripe Payment Link buttons ($5 one time, $1 every month, "Any
    amount" custom) open in a new tab with
    `rel="noopener noreferrer"`. A link that is unset or not `https://`
    renders a disabled button reading "link not configured". The header
    carries a Donate button and the footer the self-funding line with a
    Donate link on every page.
6. **About and privacy.** `/about` ends with a generated "Photo credits"
    section, one line per image a page shows and absent while none does
    ([site-imagery.md](site-imagery.md)). It says who runs the site (one person,
    not a PAC), what it does, who pays and links to `/donate` and
    `/privacy`. `/about` opens "Cut the Ties is built and run by one
    volunteer. It is not a PAC, a campaign or an organisation, and it is
    not affiliated with any candidate or party." No page names the owner
    or links the owner's GitHub account; a build test enforces it
    (`web/test/no-owner-ties.test.ts`, run after `build` in CI).
    `/privacy` lists what is stored (district only in the browser and on
    the server, never the address; receipts without identity; shingle
    hashes, not document text) and what is sent where
    (address → Census Geocoder through the Worker, not logged; when
    `PUBLIC_SUGGEST_PROVIDER` is set, that bullet instead names the
    provider and the three paths: the characters typed go from the
    browser to the provider to suggest addresses, a picked address stays
    in the browser, which sends only state and district, and a submit
    without a pick goes to the Census geocoder through the Worker as
    before; `none` keeps today's bullet; form fields
    → Anthropic, not retained by the site; Turnstile; Stripe handles
    payments in its own tab). A "District-office visits" bullet names the
    organiser's contact link as personal data they chose to share, handed
    only to people who say they will come, deletable with the listing
    (docs/specs/office-visits.md).
7. **State goal copy.** The treasurer target (results card and the goal
    page's "Who to call") carries one holdings line built by code from
    the `states.csv` row's `holdings_status`: `held` → "Israel Bonds:
    holds $<israel_bonds_usd> (as of <holdings_date>)" with a "source"
    link to `holdings_source`; `none` → "Israel Bonds: holds none (as of
    <holdings_date>)" with the same source link; `unknown` → "Israel
    Bonds: not yet sourced", with no link. The state action's ask replaces
    `{decider}` with the row's `decider` when set, else "your state
    treasurer" (static pages, which have no state, always show the
    fallback). `worker/src/state-copy.ts`: `holdingsLine`, `fillAsk`,
    `moneyUsd`.
8. **Electoral goal.** A `category: electoral` goal is a one-seat sourced
    record ranked at priority 1 with an "On the record" block and
    primary/filing-deadline dates; see `electoral-record.md`.

## Data & contracts
- `GET /api/goals` lists active goals in rank order without eligibility
  rules. `GET /api/goals/:slug/targets?state=XX&district=N` → `{targets:
  TargetCard[]}` for one active goal, same rules as the results cards;
  400 `missing`, 404 `no_goal` (unknown, upcoming or closed) or
  `no_delegation`.
- D1 tables `goals`, `actions`, `members`, `positions`, `states`
  (`worker/schema.sql`) are regenerated from `data/` by
  `npm run seed -w worker`; the seed validates slugs, categories,
  priorities, summary length (≤60 words), `outcome_note` on closed goals,
  `our_picks` (≤3 rows with name, rationale, source_url and an optional
  `bioguide_id`, which must be a `members.csv` row or the load stops with
  `goal <slug>: our_picks[<i>] bioguide_id <id> is not in members.csv`),
  `prep_md` (when
  non-empty: exactly the six `##` headings of `worker/src/prep.ts` in
  order, each non-empty, "Where things stand" carrying an ISO date),
  `sources`
  (`{title, url}` rows), `successor_slug` targets, `image` (optional;
  when set, an id with a `file` row in
  `web/src/assets/img/manifest.yaml`, else the error names the goal and
  the id; unset shows the category default,
  [site-imagery.md](site-imagery.md) Behavior 13), and that every
  position row carries a source. `goals.status` also allows `upcoming`;
  `goals.decider` is the one-line "who decides". `goals.decision_at`
  (optional, ISO 8601 with an offset, same calendar day as
  `decision_date` or the seed fails) and `goals.decision_date_confirmed`
  (`true|false`, default false) feed the countdown stamp; production D1
  gets new columns through `seed-remote`'s migrate step
  (`deployment.md` Behavior 3).
- The static site reads `data/` at build through the Worker's loader
  (Vite alias `@worker` → `worker/src`, `web/src/lib/goals.ts`), so
  pages and API agree on every row and on the lifecycle. Share cards are
  rendered at build by `sharp` from an SVG template with the logo mark
  composited at 120 px in the top-right corner: `renderCard(svg,
  imageId?)` in `web/src/pages/goals/[slug]/card.png.ts`. With a manifest
  id the photo is the base layer, the template's solid ground (`BACKDROP`)
  becomes `inkLayers()` and the file is an 8-bit palette PNG (`CARD` in
  `web/src/lib/images.ts`): a 1200×630 photograph is over 200 KB as
  truecolour, and the URL and `image/png` type stay as they were. Goal
  cards pass `imageIdFor(goal)`. Without an id the output is the
  truecolour file it was before photos, byte for byte; member cards use
  that (`member-pages.md` Behavior 6). Absolute share URLs
  need `SITE_URL` in the Pages build environment.
- Type tokens (`web/src/styles/global.css`): every H1/H2 and display
  utility in Bebas Neue, body Inter 400/600, labels, chips and buttons
  Space Mono 700; `Base.astro` loads exactly those three families.
- Donation config is read at build, not by the Worker (the pages are
  static): `STRIPE_LINKS` (JSON
  `{once_5, monthly_1, custom}` of Stripe Payment Link URLs, default
  `{}`). Set it in the Pages build environment, like `SITE_URL`;
  parsing is `web/src/lib/donate.ts`. Invalid values fall back to the
  defaults.

## Invariants (regression checklist)
- [ ] Flipping a goal to `completed`/`expired` in YAML moves its
      `upcoming` successor to `active` on the next load, the ranking picks
      it up, and a closed goal without `outcome_note` fails the seed
      (`worker/test/goals.test.ts`).
- [ ] An `upcoming` goal has no page, no act page and is absent from
      `/api/goals`; `/api/goals/:slug/targets` returns Democratic-caucus
      seats of the incoming delegation only for leadership goals and the
      treasurer row for state goals.
- [ ] Every goal with `prep_md` has `/goals/<slug>/prep` with all six
      sections and no `upcoming` goal has one; a `prep_md` missing a
      heading, out of order, with an empty section or an undated "Where
      things stand" fails the seed (`worker/test/prep.test.ts`); a
      leadership goal with `our_picks` shows them in order before any
      section, and the ask names the first pick; every date, count or name
      in `prep_md` is a `data/` row or carries a `[VERIFY: …]` marker.
- [ ] A goal whose `image` has no manifest `file` row fails the seed and
      the build, naming the goal and the id
      (`worker/test/goals.test.ts`); `/goals/<slug>/act/…` and the whip
      page show no photo (`web/src/lib/images.test.ts`).
- [ ] Every published goal's card and `/card.png` are 1200×630 PNGs of at
      most 200,000 bytes; card text passes AA over every library photo;
      `renderCard` without an id writes the bytes it wrote before photos
      (`web/src/lib/card.test.ts`).
- [ ] A tap on any phone or email control in the sidebar posts one receipt
      and opens the modal; the done card and its postmark are the
      `/results` ones (`web/src/components/receipt-surfaces.test.tsx`).

## Performance budget
`/goals`, `/goals/<slug>` and `/goals/<slug>/prep` ≤100 KB transferred on
a phone, own origin, fonts excluded. Measured 2026-11-08 on a local
preview build, with the photos: `/goals` 46.5 KB at 390 px (three bands
of 6.4 to 12.6 KB before a scroll; 50.4 KB with all four) and 80.1 KB at
1440 px; `/goals/<slug>` 48.4 to 64.4 KB at 390 px over four goals (hero
8.3 to 24.1 KB) and 71.0 to 91.8 KB at 1440 px (hero 30.8 to 51.5 KB);
`/goals/<slug>/prep` 44.4 to 56.0 KB and 67.4 to 83.4 KB. Without the
photos the three pages are 19.2, 40.4 and 32.0 KB (`/donate` 1.4 KB gzip,
2026-11-04). LCP ≤1.5 s on a mid-range phone over 4G, the photo being the
LCP element (412 px, CPU 4x, localhost): goal and prep pages 576 to
592 ms on Fast 4G and 1,400 to 1,424 ms on Slow 4G; `/goals`
580 to 592 ms and 1,408 ms, its first band being the element. Every page is static, so no Worker call is on the render
path except the "Who to call" and "Take action" islands. "Who to call" is
1.2 KB gzip plus the shared `receipt-flow` chunk (2.8 KB, 2026-11-10); the
modal chunk loads on the first tap.
