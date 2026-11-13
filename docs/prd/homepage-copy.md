# Homepage copy — PRD
Status: DRAFT · Owner: George Nguyen · Last updated: 2026-11-13

## Problem
A content review of the mobile homepage (owner-supplied guide, 2026-11-13)
found copy that no longer matches the product or the facts:
- The H1 "Find the two things you can do this week", the `<title>` and the
  default meta description in `web/src/layouts/Base.astro` all promise
  "two things", but the landing lists every `active` goal (four on
  2026-11-13). Only `/results` shows two.
- The address line "Full street address, or use your location: nothing is
  stored." is wrong: `/privacy` says the state and district are kept in
  the browser and on the server. Only the address itself is never stored.
- Every card ends in the same "See the goal →"; nothing on the landing
  says what the visitor gets (a script) or when the decision is.
- No page carries the phrase people would search for ("call Congress",
  "US military ties with Israel") in its title or H1; the title is the
  product's inside name for itself.
- The footer trust line is the only place the landing says who runs the
  site, and it sits below the fold on every phone.
The guide's other items were checked and are either done already (static
HTML, one H1, crawlers unblocked, a page per goal with its own metadata,
descriptive alt text on every photo) or belong to other PRDs (About page
copy: `no-owner-ties.md`; FAQs and schema: `faq-and-structured-data.md`).

## Goals / Non-goals
- Goals: every string on the landing is true of the product today; the
  title, H1 and description say what the site is for in the words a
  visitor would use; each card names what the tap gives and when the
  decision is; the landing says who runs the site above the fold; nothing
  hard-codes a count or a date that `data/` owns.
- Non-goals: goal titles and summaries in `data/goals/*.yaml` (the frames
  were decided in `archive/2026-11-plain-english-copy.md`; see Open
  questions 1); the category chips (`CATEGORY` labels are shared by the
  goal pages, `/goals` and the result cards); `/about` and `/donate`
  (`no-owner-ties.md`); the FAQ and JSON-LD (`faq-and-structured-data.md`);
  the photo treatment; any new page.

## Research (what the best products do → adopt / adapt / reject)
Relies on: [social-platform-trends](../research/social-platform-trends.md)
(the frames that travel), [action-conversion-levers](../research/action-conversion-levers.md).
| Pattern | Seen in | Verdict | Why |
|---|---|---|---|
| Title tag = the action + the subject, brand last | 5 Calls ("Make your voice heard. Call your representatives"), Indivisible | adopt | The title is the search snippet; "Cut the Ties" alone says nothing to a stranger |
| Hero promise names the concrete output (who to call, what to say) | 5 Calls, Resistbot | adopt | Replaces "two things" with what the tool actually hands over |
| Hard-coded counts in headlines ("Four decisions") | Owner guide | reject | The card list is `activeGoals()`; `ndaa-report-vote` flips to active on the next close |
| Bill section numbers on the cards | Owner guide | reject | Decided in `plain-english-copy`: numbers in scripts and FAQs, not titles or cards |
| Decision date on each card | `/goals` overview (this site), Countdown stamp on results | adopt | Urgency on the landing without a new component |
| Trust line near the hero | ActBlue, Resistbot footers moved up on mobile | adopt | One line, data from `no-owner-ties` wording |

## Users
First-time visitors from a social post, on a phone, who have never called
Congress. Returning callers see the same words; nothing in the funnel
(address → results → act → receipt) changes.

## Expected behavior
### 1. Landing strings
Every row is a string change and nothing else; the owner edits the
"Proposed" column in this PR before the PRD leaves DRAFT (Open question
0). "Current" is verbatim from the file named.

| # | Element (file) | Current | Proposed | Why |
|---|---|---|---|---|
| 1 | `<title>` (`index.astro`) | Cut the Ties — find the two things you can do this week | Call Congress on US military ties with Israel — Cut the Ties | Action and subject in the first 60 characters; brand last, same separator as every other page |
| 2 | Meta description, landing and `Base.astro` default | Enter your address. We find the people who represent you in Congress and the two things you can do this week to cut US military ties with Israel. | Enter your address to find your House member, senators and state treasurer, then get a 60-second script for the calls that matter most this week on US military ties with Israel. | What, who and how in one sentence; no "two" |
| 3 | Hero eyebrow (`index.astro`) | Call your people in Congress · US military ties with Israel | Call Congress · US military ties with Israel | Leads with the verb; shorter on a phone |
| 4 | H1 (`index.astro`) | Find the two things you can do **this week** | Call Congress to cut US military ties **with Israel** | The keyword in the H1; drops the "two" claim; the acid span moves to the subject |
| 5 | Subhead (`index.astro`) | One site to end US aid to Israel and get the US military out of its wars. Enter your address. We find the people who represent you in Congress and give you the exact words to say when you call. | Enter your address. We find the people who represent you, pick the two calls that matter most this week, and give you a 60-second script for each. | One concrete promise; "two" now describes `/results`, which does show two |
| 6 | Address placeholder (`AddressForm.tsx`, both fields) | Street address, city, state | Your street address, city, state | Says the input is about the visitor |
| 7 | Submit button (`AddressForm.tsx`) | Find my actions → | Find my reps and script → | Names what the tap gives |
| 8 | Privacy line (`AddressForm.tsx`) | ✓ Full street address, or use your location: nothing is stored. | We use your address only to find your district, then forget it. Privacy → | True of `/privacy`; the ✓ chip goes (it reads as a consent box); "Privacy" links `/privacy` |
| 9 | Section eyebrow (`index.astro`) | What you can change | Being decided now | No count |
| 10 | Section H2 (`index.astro`) | What's being decided right now | The decisions your call can still change | Keeps urgency, says why to call |
| 11 | Card date line (new, `index.astro`) | — | Decision: {fmtDate(decision_date)} or "Decision: not yet scheduled" | Same line `/goals` already shows; from `data/` |
| 12 | Card CTA (`index.astro`) | See the goal → | Get the script → | Names what the tap gives; links `/goals/<slug>#actions` (the "Your move" section) |
| 13 | Link under the cards (`index.astro`) | All goals → | See all goals → | A complete action |
| 14 | Trust line (new, `index.astro`, between hero and cards) | — | Run by one volunteer. Not a PAC, a campaign or a party. About → | Trust above the fold; wording from `no-owner-ties` §1 |
| 15 | Footer line (`Base.astro`) | Built and paid for by one person; donations keep it up. Donate | Built and paid for by one volunteer. Donations keep it running. Donate | Matches `no-owner-ties` wording |

Rules the build keeps: one H1; card titles stay `<h3>` under the section
`<h2>` (a correct outline; heading level is not a ranking signal); the
`CATEGORY` chip on each card is unchanged; `/results` keeps "Your two
actions this week"; `/goals` keeps its subhead. The Turnstile widget,
combobox, "Use my location instead" and the "Your week" card are untouched.

Tests that pin the old strings (`web/src/components/AddressForm.test.tsx`,
`results-page.test.tsx`, `funnel.test.ts`, any `index` build assertion)
are updated to the new strings in the same PR, never loosened.

## Data & contracts
None. No endpoint, model or stored state changes. `data/goals/*.yaml` is
read, not written (row 11).

## Spec delta
- MODIFIED `docs/specs/action-router.md` §Behavior 1: the quoted landing strings (field placeholder, button, privacy line) → the Proposed column of §1 rows 6–8; the privacy line links `/privacy`; each landing card carries a "Decision: <date>" line and a "Get the script →" link to `/goals/<slug>#actions`; a trust line between the hero and the cards; the landing `<title>` and description are the §1 rows 1–2 strings.
- MODIFIED `docs/specs/goal-pages.md` §Behavior 5: the footer self-funding line → "Built and paid for by one volunteer. Donations keep it running." with the Donate link.

## Acceptance criteria
- [ ] Every string in §1 renders exactly as the signed-off Proposed column
      on `/`, on a 375 px viewport and on desktop; no other page's copy
      changes except the footer and the default description.
- [ ] The landing has one H1, and `curl -A Googlebot` of the production
      landing returns the new `<title>` and description in the static HTML.
- [ ] The address line contains no claim that contradicts `/privacy`.
- [ ] Each landing card shows its goal's decision date from `data/` (or
      "not yet scheduled") and its CTA opens the goal page scrolled to
      "Your move".
- [ ] No test assertion was weakened; the web suite passes.
- [ ] Landing stays ≤100 KB transferred and LCP ≤1.5 s on a mid-range
      phone over 4G (CLAUDE.md §Performance budgets): text-only change,
      measured once on the preview.

## Rollout & metrics
No flag. One PR. The owner signs off the strings in the PRD, then reviews
the Pages preview on a phone before merging. Optional owner step: add the
production domain to Google Search Console (free, DNS record) so landing
impressions and the query list can be read after 30 days; nothing on the
site changes for it.

## Open questions
0. `[blocking]` Owner sign-off on every Proposed string in §1. Proposal:
   the owner edits the column in this PR; when every row is accepted or
   rewritten, the question is closed, Status becomes READY and the build
   may start.
1. Keep "Kick out Hakeem Jeffries" / "Kick out Chuck Schumer" as the card
   titles? The guide proposes "Vote Jeffries Out as House Democratic
   Leader", which drops the condition the site actually asks for (a new
   leader *unless* he promises in public to stop the integration).
   Proposal: keep the titles (the frame that spread, per
   `social-platform-trends`); the summaries already carry the condition.
2. Trust line placement (row 14): between hero and cards, or inside the
   hero under the address form? Proposal: between, as its own one-line
   strip, so the hero keeps one message.

## Changes
- 2026-11-13 — created (DRAFT, blocking: owner string sign-off) from the
  owner's homepage copy guide; About page items handed to `no-owner-ties`,
  FAQ and schema items to `faq-and-structured-data`.
