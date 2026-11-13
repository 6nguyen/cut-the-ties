# FAQ and structured data — PRD
Status: DRAFT · Owner: George Nguyen · Last updated: 2026-11-13

## Problem
The site answers no plain question a first-time visitor or an AI answer
engine asks: how to contact Congress about this, what to say, whether
calls work, how much aid there is, what the defense-bill section is, why
Jeffries and Schumer, what Israel Bonds are, whether the address is kept,
who runs the site. Those answers exist only inside goal pages and
scripts. No page carries JSON-LD, and nothing shows when the site was
last updated, so an answer engine that quotes the site has no date to
attach. The owner's content guide (2026-11-13) supplied twelve FAQs with
`[DATE]` placeholders and some claims that conflict with the product
(`no-owner-ties.md`: no owner name; `/privacy`: district is stored) or
with CLAUDE.md (numbers and dates never typed into prose).

## Goals / Non-goals
- Goals: a FAQ section on `/` whose every date, name and holdings claim
  is read from `data/` at build; the same rows emitted as `FAQPage`
  JSON-LD so markup and visible text never diverge; `Organization` and
  `WebSite` JSON-LD on every page; a visible "Updated <date>" line;
  every factual answer carries a source link.
- Non-goals: FAQ rich results in Google search (restricted to government
  and health sites since 2023; the schema is for answer engines);
  per-goal `Event` schema; a search box; client-side JavaScript for the
  accordion; the About page (`no-owner-ties.md`); the landing strings
  (`homepage-copy.md`).

## Research (what the best products do → adopt / adapt / reject)
| Pattern | Seen in | Verdict | Why |
|---|---|---|---|
| Native `<details>/<summary>` accordion, no script | GOV.UK, USA.gov | adopt | Static HTML, crawlable, keyboard-accessible, zero bytes of JS |
| FAQPage JSON-LD generated from the same rows as the visible FAQ | Google structured-data guidelines | adopt | Mismatched markup is a manual-action risk; one source avoids it |
| FAQ dates typed by hand | Owner guide | reject | Dates live in `data/goals/*.yaml`; a closed goal must drop its answer |
| Visible "last updated" + `dateModified` | CRS, Ballotpedia | adopt | The one freshness signal answer engines read |
| Organization schema naming a person | Owner guide | reject | `no-owner-ties`: the site names no person |

## Users
Visitors who scroll past the cards without entering an address (they
want to know what this is first), and answer engines and crawlers quoting
the site. The FAQ never replaces the funnel: every answer that can ends
with the address form or a goal page.

## Expected behavior
### 1. FAQ rows in data
`data/faq.yaml`: one row per question with `id`, `question`,
`answer_md` (Markdown; the first sentence is the direct answer), optional
`source` `{title, url}`, optional `goal` (slug). Tokens inside
`answer_md`, filled at build from `data/`: `{date:<slug>}` → the goal's
`decision_date` as "Nov 18, 2026" or "not yet scheduled";
`{title:<slug>}` → the goal's title; `{switchboard}` → the Capitol
switchboard number from one constant. A row with `goal` renders only
while that goal is `active`. A token naming an unknown goal, or a row
with an empty first sentence, fails the build with the row id. The file
is read at build through the same loader the goal pages use; it is not
seeded into D1 (no API serves it).

The twelve answers, verbatim for sign-off (Open question 0). Bracketed
notes are to the owner and are not published.

1. **How do I contact my members of Congress about Israel?**
   Enter your address at the top of this page. We find your US House
   member and your two senators, show the office to call and give you a
   short script to read. You can also reach any member through the
   Capitol switchboard at {switchboard}.
2. **What do I say when I call?**
   Keep it to 30 to 60 seconds; you will usually reach a staffer, and you
   do not need to be an expert. The shape is: "Hi, my name is [name], I'm
   a constituent from [city]. I'm calling to ask [the member] to [the
   ask]. [One sentence on why it matters to you.] Please record my
   position. Thank you." After you enter your address we fill in the
   names and the ask for you.
3. **Do calls to Congress work?**
   Staff log every call and report the tally to the member. The
   Congressional Management Foundation's surveys of congressional staff
   find that personal contact from constituents can move an undecided
   member, and that a call from a real constituent counts for more than a
   form letter. One call will not decide an issue; many calls on one ask
   in a short window get noticed. [source: CMF, "Citizen-Centric
   Advocacy", 2017]
4. **How much US military aid does Israel receive?**
   Under a ten-year agreement signed in 2016, covering fiscal years 2019
   to 2028, the US committed $38 billion: about $3.3 billion a year in
   Foreign Military Financing and $500 million a year for missile
   defense. Since October 2023 Congress has approved billions more in
   emergency funding on top of that. The agreement runs out after fiscal
   year 2028, and its replacement is being negotiated now. [source: CRS
   RL33222 "U.S. Foreign Aid to Israel"; the owner confirms the current
   edition's figures before sign-off]
5. **What is the Israel section in the defense bill?** (`goal: ndaa-1217`)
   Both versions of this year's defense bill (the NDAA) create a US-Israel
   Defense Technology Cooperation Initiative inside the Pentagon: section
   219 in the House bill, section 1217 in the Senate bill. It would
   coordinate joint research, testing and industrial work for the long
   term. Supporters call it cooperation between allies; opponents say it
   locks the US military into Israel's and removes US leverage. A small
   House-Senate group is settling the final text now, with a decision
   expected {date:ndaa-1217}. [source: the goal's `sources` rows; the
   build links the bill text]
6. **Why does this site target Jeffries and Schumer?** (`goal: house-caucus`)
   Hakeem Jeffries leads House Democrats and Chuck Schumer leads Senate
   Democrats, and only Democratic members vote on whether they keep those
   jobs: the House vote is {date:house-caucus}, the Senate vote
   {date:senate-leader}. We ask Democratic members to vote for a new
   leader unless the current one promises, in public, to stop Israel's
   integration into the US military. If your members are Republicans,
   the defense bill and Israel Bonds asks are yours.
7. **What are Israel Bonds, and does my state hold them?** (`goal: state-bonds`)
   Israel Bonds are loans to the Israeli government sold through the
   Development Corporation for Israel. Some state treasuries and public
   pension funds buy them, and the treasurer decides whether to buy again
   when they mature. Enter your address above: if the Israel Bonds call
   is one of your two, the card says whether your state holds them, with
   the source, and who to call.
8. **Is my address stored?**
   No. Your address goes only to the US Census Bureau's geocoder to find
   your district, and our server does not log or keep it. Your state and
   district are kept, in your browser and on our server, so you do not
   have to re-enter the address. The privacy page lists everything that
   is stored. [link `/privacy`]
9. **Who runs this site, and who pays for it?**
   Cut the Ties is built and run by one volunteer. It is not a PAC, a
   campaign, a party or an organisation, and it is not affiliated with
   any candidate. Donations pay for hosting and the model that drafts
   your documents; nothing else is funded. [wording from
   `no-owner-ties` §1; link `/about`]
10. **Is this about US policy or about Israelis?**
    It is about US policy: how the United States spends public money and
    where it sends its military. It is not about Israelis or Jewish
    people, and the site opposes antisemitism and every other bigotry.
    [owner's position statement: confirm or rewrite before sign-off]
11. **What happens after I call?**
    The office logs your call as a constituent contact on this issue.
    Tap "I did it" and we count one more call for your district, with no
    name or address, and offer a reminder for the next one. If you want a
    written answer, ask the staffer to note a follow-up.
12. **Can I do anything if I am not a US constituent?**
    Members of Congress weigh calls from their own constituents, so the
    tool needs a US address. From outside the US you can send this page
    to friends and family in the US, or support the site with a donation.

### 2. FAQ section on the landing
Below the cards and above the footer on `/`: eyebrow "Questions", H2
"Common questions", then one `<details>` per published row, its
`<summary>` the question (an `<h3>`), its body the rendered Markdown and,
when the row has a `source`, a last line "Source: <title>" linking the
URL with `rel="noopener"`. The first item is open on load; the others
closed. No script. On a 375 px viewport the summary wraps, never
truncates. The section is absent when no row publishes.

### 3. Structured data and freshness
`Base.astro` emits one `<script type="application/ld+json">` holding an
`@graph` of `Organization` (`name` "Cut the Ties", `url` the site origin,
`logo` `/icon-512.png`, `description` the §1.9 first sentence) and
`WebSite` (`name`, `url`); no person, no `sameAs`. The landing adds
`FAQPage` built from the same published rows (`mainEntity` of
`Question`/`Answer` with the answer as plain text, tokens filled, source
line included). Every page's footer gains "Updated <Mon D, YYYY>" set to
the build date (every merge rebuilds, so this is the last deploy), and
`WebSite.dateModified` carries the same ISO date. A web test parses every
JSON-LD block of the built landing, asserts the `FAQPage` question count
equals the rendered `<details>` count and that no `{` token survives in
any answer.

## Data & contracts
- New `data/faq.yaml` (schema in §1); documented in `data/README.md`.
- One constant for the Capitol switchboard number (`202-224-3121`) in the
  worker's copy module, shared with any script that cites it.
- No endpoint or D1 change.

## Spec delta
- ADDED `docs/specs/faq.md`: the whole capability (§1–3: rows, tokens, publish rule, accordion, JSON-LD, build test).
- MODIFIED `docs/specs/goal-pages.md` §Behavior 5: the footer carries "Updated <date>" from the build date next to the self-funding line.
- MODIFIED `docs/specs/action-router.md` §Behavior 1: the landing ends with the FAQ section (link to `faq.md`) and carries `FAQPage` JSON-LD.

## Acceptance criteria
- [ ] Every published answer renders exactly as the signed-off text with
      tokens filled from `data/`; marking a goal `completed` in YAML drops
      its row and its `FAQPage` entry on the next build.
- [ ] A row with an unknown goal slug or a bad token fails
      `scripts/quiet-check.sh build` naming the row.
- [ ] Google's Rich Results Test on the preview URL reports valid
      `FAQPage`, `Organization` and `WebSite` with no errors.
- [ ] The accordion works with JavaScript disabled and by keyboard.
- [ ] Every answer with a factual claim (3, 4, 5, 7) links a source.
- [ ] No answer names a person who runs the site (the `no-owner-ties`
      build guard passes).
- [ ] Landing stays ≤100 KB transferred with the FAQ and JSON-LD added;
      LCP unchanged (the section is below the fold and script-free).

## Rollout & metrics
No flag. One PR for §1–2, one for §3, or one PR for all three. Measure
after 30 days, if the owner adds the domain to Search Console: landing
impressions and the queries that show it; otherwise nothing is measured
on the site (no analytics, per `/privacy`).

## Open questions
0. `[blocking]` Owner sign-off on the twelve answers in §1, including the
   two position statements (6 and 10). Proposal: the owner edits the text
   in this PR; when every answer is accepted, Status becomes READY.
1. "Updated" date source: build date (every merge) or the last commit
   date of `data/`? Proposal: build date; the Pages build checks out with
   no history, and every merge does redeploy.
2. Should answer 5 and 6 show on goal pages too (as `FAQPage` there)?
   Proposal: no; one FAQ on the landing, goal pages keep "What is going
   on".

## Changes
- 2026-11-13 — created (DRAFT, blocking: owner answer sign-off) from the
  owner's homepage copy guide, Part 2 and Part 3.
