# Member pages and whip count

## Purpose
Gives every sitting member of Congress a static public page that says where
they stand on each active goal and how to reach them, and gives every
federal goal a "where everyone stands" table whose counts come from the
sourced rows in `data/positions/`. It also fills `data/members.csv` from
the public roster so every page, the router and the whip counts cover all
541 members. Positions are entered by the maintainer tooling
(`maintainer-tooling.md`), never here, and nothing here calls an LLM.

## Behavior
1. **Roster import (`npm run import-members -w worker`).** Reads the
   `unitedstates/congress-legislators` `legislators-current.yaml`
   (first argument, else downloaded from `main`) and, with
   `--senate-xml <path|url>`, the Senate directory `senators_cfm.xml`, and
   merges each person's last term into `data/members.csv`. A row already
   in the file keeps its `name` (the file's common name wins over
   `official_full`, so "Lou Correa" stays), its `district_phone`, `money_url`, `not_returning`, `left_office` and
   every flag column (`hasc`, `conferee`, `rc243`, `jrd_april_2026`,
   `btb_cosponsor`, `target_2028`); `party`, `chamber`, `state`,
   `district`, `dc_phone`, `contact_form_url` and `contact_kind` are
   refreshed when the dataset has a value. The contact link by
   kind: a roster `contact_form` (http(s), not the homepage) is `form`; a senator without one
   gets the XML `email` as `form` unless it is the homepage, else
   the homepage as `homepage`; a representative without one gets
   `terms[-1].url + '/contact'` as `zip_gate`. A row with a `contact_kind`
   keeps its link unless the dataset has a form.
   New members get the dataset's name and empty flags. Members absent
   from the roster are never deleted: before 2027-01-03
   (`TRANSITION_DATE`) they print under `stale:`, unchanged; from that
   day the import sets `left_office` to the run date (kept once set) and
   prints them under `left:`. Rows sort by state,
   House before Senate, district, name.
   At-large seats, DC and the territories keep district `0`; senators
   an empty one. `--portraits` alone writes only the portraits
   (`site-imagery.md` §14).
2. **Seed checks.** `loadRows` rejects `members.csv` when a `bioguide_id`
   repeats, a senator carries a district, a House district is outside the
   state's seat count (`worker/src/districts.ts`, `SEATS_CONGRESS` 119; the 2020
   apportionment holds through the 120th), a
   single-seat state uses a district other than `0`, a state code is
   unknown, `contact_kind` is outside `form · zip_gate · homepage`, a
   `contact_form_url` is not https or has no kind, or
   `left_office` is not an ISO date.
   `district_offices.csv` (`checkOffices`) is rejected on a `bioguide_id`
   not in `members.csv`, an unknown state, a repeated `office_id` or a
   phone that is not ten digits after stripping punctuation. After the
   checks an empty `district_phone` is derived in memory as the member's
   first office phone in file order; a filled cell wins. The error names
   the file and the row.
3. **Member page (`/m/<bioguide_id>`).** One static page per member,
   built from `data/`. Hero: the portrait (`site-imagery.md` §Behavior 15),
   party and seat chip (`CA-46`, `TX at large`,
   `VT` for a senator), chamber chip, title "Rep./Del./Sen. Name", `tel:` buttons for the DC office and the
   district office (`district_phone`) and the
   contact link labelled by `contact_kind`: "Contact form", "Contact form (asks
   for your ZIP)" or "Office website"; a link without a kind is never
   shown. Each `tel:` button carries an "Open now" / "Closed · opens
   <weekday> <time>" chip (`web/src/components/OpenChip.tsx`) after hydration: DC is Mon–Fri 09:00–18:00 ET,
   the district office follows its sourced `hours` in the state's zone or
   the same default shifted there (`web/src/lib/hours.ts`); the static
   order stays DC first. The buttons are the `MemberContact` island
   (`tap-receipts-everywhere` §4): while the member's first open goal has
   an action, a tap on any of them or on a district-office number below
   posts one receipt against that goal (stored place, else the member's
   seat) and opens the receipt modal of `results-pages.md` §4–7, whose
   Next is `/results` (`/goals` with no place); for 24 h the title wears
   the 64 px postmark and the row a ✓ Share pill. Otherwise plain links.
   Under the hero (`components/Offices.astro`): for a
   `not_returning` member the line "Leaves office 2027-01-03. Votes on the
   NDAA and the funding bill until then.", then every district office from
   `data/district_offices.csv` in file order (city, `tel:` phone,
   address, hours when present), or "No
   district office listed yet" when the member has none. Below,
   one block per active goal whose targets include the member (same
   first-action scope rule as the result cards): goal title linking to
   `/goals/<slug>`, the newest sourced position as a chip (`for`,
   `uncommitted`, `against`, `unknown`) with its source link and date, or
   "No sourced statement yet"; the member's prior-vote and role flags
   spelled out ("NDAA conferee", "Roll call 243 …", …) or "No recorded
   vote yet" when every flag is empty; the action's ask text and a
   "Call →" button to the act page with `?target=<bioguide_id>`, which
   preselects the member. A member no active goal targets sees "No
   open decision" and the contact buttons. All of this renders without
   JavaScript.
4. **Your representative.** One inline script reads the stored
   `cut-ties:place` (`{state, district}`); when it matches the page's
   state and, for a representative, district, a "Your representative"
   chip appears and the buttons read "Call now →". Nothing is sent
   anywhere.
5. **Latest constituent report.** The same script calls
   `GET /api/members/<bioguide_id>/reports?goal=<slug>` for each goal block
   and, when `latest` is non-null, shows one line: "Latest call: office
   said they are undecided — "<note>" (<date>; reported by a constituent,
   unverified)". A report never changes the position chip or any count;
6. **Share card (`/m/<bioguide_id>/card.png`).** 1200×630 PNG built like
   the goal cards: category stripe, "<Name> on <goal title>" and the
   position line; members without an open goal get "no open decision
   right now". `renderCard`, logo mark, no photo; the page's Open Graph
   tags point at it.
7. **Unknown ids.** Only sitting members are built: a row with
   `left_office` gets no page, sitemap entry, share card or whip count
   (`web/src/lib/members.ts` `members()` and `whipTargets` drop it),
   though its row stays in `data/` so positions and receipts resolve. Any other `/m/…` path (and
   any unknown goal path) is served the static 404 page ("Nothing on file
   at this address", link to `/goals`).
8. **Whip table (`/goals/<slug>/whip`).** Exists for every published goal
   whose first action targets a chamber (`house`, `senate` or `both`;
   state-scope goals have none). Hero: category chip, "Where everyone
   stands", goal title, "Updated <date>" from the newest `source_date` in
   that goal's positions (or "never — no sourced position yet") and the
   decision date while open. Four tiles — For, Uncommitted, Against,
   Unknown — count every voting member the goal targets, using each
   member's newest position row; delegates are listed but never counted.
   Then the filter links and the table: member (link to `/m/…`), seat,
   position chip, source date linking to the source, role (`conferee`,
   `HASC`, `delegate, no floor vote`), DC phone as `tel:` and, while the
   goal is open, a "Call" button to the act page with `?target=`. The
   open goal's numbers carry `data-receipt-target`; the `WhipReceipts`
   island posts the receipt on tap and opens the modal, and a row called
   in 24 h shows a 32 px postmark in place of its number.
9. **Sort and default view.** Rows sort conferees first, then HASC
   members, then by position (`uncommitted`, `unknown`, `against`,
   `for`), then state, House before Senate, district, name; delegates
   last. The default view is the movable set: the chamber's Democrats
   and Independents plus every conferee (House for a House or
   both-chambers goal, Senate for a Senate goal). Leadership goals target one party's caucus, so their table
   is that caucus.
10. **Filters.** Every filter is a pre-rendered page reached by a plain
    link, so it works without JavaScript: `/whip/all` (every targeted
    member), `/whip/<STATE>`, `/whip/<STATE>/<PARTY>` and
    `/whip/party/<PARTY>`; a state or party filter applies to the full
    target set. A `?state=TX&party=R` (or `?all`) link is mapped onto the
    matching page by an inline script, else it shows the default view.
11. **Closed goals.** A `completed` or `expired` goal keeps its table and
    counts; a status chip and an "Outcome" block with the `outcome_note`
    and decision date sit above the tiles, and the "Call" column is empty.
12. **Goal detail link.** The goal page's sidebar shows "Where everyone
    stands →" for every goal that has a whip table.
13. **Sitemap and robots.** `/sitemap.xml` lists every static page,
    goal, prep, whip and member page, absolute when `SITE_URL` is set at
    build. `/robots.txt` allows everything except `/api/` and names it.

## Data & contracts
- `data/members.csv`: one row per member the roster has listed, columns
  `bioguide_id,name,party,chamber,state,district,dc_phone,district_phone,
  contact_form_url,hasc,conferee,rc243,jrd_april_2026,btb_cosponsor,
  target_2028,money_url,district_office_address,district_office_city,
  contact_kind,not_returning,left_office,caucus` (`district_office_*` are
  empty until sourced, see office-visits; `district_phone` empty means
  "derive"; `contact_kind` ∈ `form · zip_gate · homepage`; `not_returning`
  is `1` or empty, hand-set with the source URL in the commit body; `left_office` is an ISO date the import sets; `caucus`
  is `D`, `R` or empty, derived from a `D`/`R` party; an empty `I` row
  fails the seed, so King and Sanders carry `D`). Provenance and the merge rules in `data/README.md`.
- `data/members_elect.csv` (leadership-routing §1.3): one row per called
  race, columns `elect_id,name,party,caucus,chamber,state,district,replaces,
  contact_url,phone,source_url,source_date`. `elect_id` is
  `<STATE>-<district | S>-<surname-kebab>`; `replaces` is the bioguide id
  of the departing member (`not_returning` or `left_office` set);
  `contact_url` is the member-elect's own https site; `phone` optional, ten
  digits, from that site; `source_url`/`source_date` cite the call. Any
  caucus is accepted. `checkMembersElect` (`worker/src/load.ts`) fails
  naming the row on a duplicate or seat-mismatched `elect_id`, an
  unknown, other-seat or returning `replaces`, two rows for one
  `replaces`, a bad phone, URL or date, or a row after `ELECT_EXPIRY`
  2027-01-10. Seeded into the `members_elect` D1 table;
  `Repo.membersElect(state)` returns a state's rows in file order.
- `data/district_offices.csv`: one row per district office, columns
  `bioguide_id,office_id,city,state,zip,address,suite,building,phone,fax,
  hours,lat,lng`, sorted by `bioguide_id` then `office_id`; generated by
  `npm run import-offices -w worker [path]` from
  `legislators-district-offices.yaml` (CC0), dropping offices of unknown
  members and clearing (and printing) phones that are not ten digits. Seeded into the `district_offices` table with members.
- `worker/scripts/import-members.ts` — `senateContacts(xml)`,
  `contactFor(term, senate?)`, `rosterRows(yaml, senate?)`,
  `merge(existing, roster, today) → {rows, stale, left, added, changed}`,
  `toCsv(rows)`, `TRANSITION_DATE`; the CLI prints the counts per
  `contact_kind` and the `changed:`, `stale:` and `left:` lists.
- `worker/scripts/import-offices.ts` — `officeRows(yaml, memberIds) →
  {rows, dropped, skippedMembers}`, `toOfficesCsv(rows)`.
- `worker/src/load.ts` — `checkOffices(rows, memberIds)`,
  `tenDigitPhone(raw)`, `deriveDistrictPhones(members, offices)`;
  `loadRows` returns `offices` beside `members`. `Repo.offices(bioguide_id)`
  returns them in file order (D1 and in-memory); `web/src/lib/members.ts`
  exposes `officesFor(m)`, `contactLabel(m)` and `LEAVES_LINE`.
- `worker/src/districts.ts` — `HOUSE_SEATS` (119th apportionment plus the
  six delegate seats), `isDelegate(member)`, `districtError(state,
  district)`.
- `worker/src/whip.ts` — `whipTargets(goal, action, members)`,
  `latestPosition(positions, bioguideId, goalId)`, `whipRows(...)`,
  `whipCounts(rows)` (skips delegates), `updatedAt(positions, goalId)`,
  `applyFilters(rows, {state, party, all})`. The web pages import these
  through `web/src/lib/members.ts`; no page computes a count itself.
- `GET /api/members/:bioguide_id/reports?goal=<slug>` → `{latest: {outcome,
  note, created_at} | null}`: the newest non-hidden report for that member
  and goal. 404 `no_member` / `no_goal`, 400 `no_goal` when `goal` is
  missing. `Repo.latestReport(bioguideId, goalId)` backs it.
- Pages: `web/src/pages/m/[id].astro`, `web/src/pages/m/[id]/card.png.ts`,
  `web/src/pages/goals/[slug]/whip.astro`,
  `web/src/pages/goals/[slug]/whip/[...filter].astro` (shared component
  `web/src/components/WhipTable.astro`), `web/src/pages/sitemap.xml.ts`,
  `web/src/pages/404.astro`, `web/public/robots.txt`.

## Invariants (regression checklist)
- [ ] `/m/C001110` with JavaScript disabled shows the NDAA block with a
      position chip, a source link or "No sourced statement yet", and a
      `tel:` button.
- [ ] `/m/NOPE000` is the 404 page.
- [ ] The four tiles on `/goals/ndaa-1217/whip` sum to the number of
      non-delegate members the goal targets and equal the per-position
      counts a test computes from `data/positions/ndaa-1217.csv`.
- [ ] The default House view contains no Republican who is not a conferee
      and every conferee; `/whip/TX/R` lists only Texas Republicans;
      `/whip/all` lists every targeted member, delegates last and tagged.
- [ ] Posting a report for a member changes the "Latest call" line on
      their page and nothing else on it or on the whip table.
- [ ] Running the import twice in a row leaves `members.csv` byte-identical;
      a fixture member keeps its name and flags; a member missing from the
      roster is printed under `stale:` and still in the file.
- [ ] A `members.csv` row with `TX,37`, `WY,1`, a duplicate id or a senator
      with a district fails the seed with a message naming the row; so does
      a `district_offices.csv` row with an unknown member, state or a
      seven-digit phone.
- [ ] `/m/C001110` lists the Santa Ana office with a `tel:` link and the
      ZIP-gate contact label; every member has a contact link with a kind; a `not_returning` member shows the departing line
      and a `left_office` member has no page, no sitemap entry and no whip
      row while its positions still load.
- [ ] `/sitemap.xml` lists every `/m/` and `/whip` page; `/robots.txt`
      disallows `/api/`.
- [ ] Every `tel:` link on `/m/<id>` and the whip table posts one receipt
      on tap while the member has an open goal with an action
      (`web/src/components/receipt-surfaces.test.tsx`).

## Performance budget
- Member page ≤100 KB transferred, fonts excluded (2026-11-08, 390 px,
  gzip: 65.0 to 66.4 KB with a portrait, 61.2 KB without; the share card
  loads only for link previews). LCP ≤1.5 s on a mid-range phone over 4G.
  The member and whip pages each gain one island (1.3 and 1.0 KB gzip plus
  `receipt-flow` 2.8 KB, 2026-11-10); the modal chunk is lazy.
- House whip page ≤150 KB transferred (measured: default view 11.4 KB
  gzipped HTML, `/whip/all` 23.2 KB).
- Zero LLM calls at build or request time; infra cost unchanged at
  $0/month (static pages, one D1 read per report lookup).
