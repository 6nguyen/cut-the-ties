# No owner ties — PRD
Status: IN PROGRESS (§1 site copy, link removal and build guard) · Owner: George Nguyen · Last updated: 2026-11-13

## Problem
The owner is about to open an Instagram account for the site and pitch it
to large socialist and Democratic distribution accounts. Nothing a visitor
or a follower can reach from the site or that account should lead to the
owner's name. An audit on 2026-11-11 found three places on the live site
that do:
- `/about` opens "Cut the Ties is built and run by George Nguyen, one
  person." (`web/src/pages/about.astro:12`).
- `/donate` opens "This site is built and paid for by George Nguyen, one
  person…" (`web/src/pages/donate.astro:9`).
- A state treasurer target whose holdings are `unknown` shows "help us
  find it →", linking `github.com/6nguyen/cut-the-ties/…/state-israel-bonds.md`
  (`worker/src/state-copy.ts:6`, `web/src/components/Target.tsx:151`).
  That repository's owner profile carries the owner's name, email and
  location.

The GitHub link is not load-bearing. It asks visitors to help source a
state's Israel Bonds holdings, but the page it opens is a research file
written for maintainers, with no form and no way to submit anything. No
issue or pull request has ever come in from it. Sourcing is done by the
maintainer research sweep (`state-holdings-sweep` §2).

The domain's registration is already private (Cloudflare registrar, the
registrant fields redacted). The footer already reads "Built and paid for
by one person" with no name.

## Goals / Non-goals
- Goals:
  - No page of the built site contains the owner's name or a link to the
    owner's GitHub account or repository.
  - The site still says who is behind it in kind (one person, not a PAC,
    not affiliated with a candidate or party) and how it is paid for.
  - A test fails the build if the name or the repository link comes back.
  - The owner's checklist covers what the site's code cannot: the Stripe
    public details and the Instagram account's sign-up identity.
- Non-goals:
  - GitHub activity stays as it is: the repository, its commit authors,
    the `Owner:` lines in PRDs and the research routines' User-Agent
    (which names the repository to the sites they crawl). The owner
    accepted these on 2026-11-11; none of them is reachable from the site
    or the social account.
  - No replacement contribution channel (tip form, contact email) for
    unsourced states. If outside tips are wanted later, that is a
    separate PRD with its own moderation.
  - No link from the site to the Instagram account. That comes with the
    social strategy PRD.

## Research (what the best products do → adopt / adapt / reject)
| Pattern | Seen in | Verdict | Why |
|---|---|---|---|
| Name the project, not a person, as operator; state what it is not (PAC, campaign, party) | Owner direction 2026-11-11 (not researched further) | Adopt | Keeps the transparency the current copy gives, without the name |
| "Help us find it" crowd-sourcing link to a repo file | This site today | Reject | It opens a maintainer document with no way to submit anything, and it ties the site to the owner |

## Users
Visitors, and anyone following a link from the Instagram account or a
partner's repost. The copy change is the same for every visitor.

## Expected behavior
### 1. Site copy, link removal and build guard
1. **`/about`.** The first paragraph reads: "Cut the Ties is built and run
   by one volunteer. It is not a PAC, a campaign or an organisation, and
   it is not affiliated with any candidate or party." The rest of the page
   is unchanged.
2. **`/donate`.** The first paragraph reads: "This site is built and paid
   for by one volunteer, not a PAC or organisation. Donations are not
   tax-deductible and are not political contributions to any candidate."
   The second paragraph and the donate buttons are unchanged.
3. **State target, holdings `unknown`.** The holdings line reads "Israel
   Bonds: not yet sourced" with no link after it, on the results card and
   the goal page's "Who to call". `held` and `none` keep their "source"
   link to `holdings_source`.
4. **Guard.** A test reads every HTML file `astro build` writes and fails
   if any contains the owner's surname or `github.com/6nguyen`, naming the
   file. Photo credits that link `github.com/unitedstates/images` still
   pass.

### 2. Owner checklist
1. The owner sets the Stripe public details and the Instagram account's
   identity to the two owner criteria under Acceptance criteria.
2. After §1 deploys, the owner (or an agent) runs the deployed-HTML grep
   and records the result here.

## Data & contracts
- `RESEARCH_URL` is deleted from `worker/src/state-copy.ts`; nothing else
  imports it.
- No data, endpoint or stored-state change.

## Spec delta
- MODIFIED `docs/specs/goal-pages.md` §Behavior 5 (Donate): "This site is
  built and paid for by George Nguyen, one person, not a PAC or
  organisation." → "This site is built and paid for by one volunteer, not
  a PAC or organisation."
- MODIFIED `docs/specs/goal-pages.md` §Behavior 6 (About and privacy): add
  "`/about` opens 'Cut the Ties is built and run by one volunteer. It is
  not a PAC, a campaign or an organisation, and it is not affiliated with
  any candidate or party.' No page names the owner or links the owner's
  GitHub account; a build test enforces it."
- MODIFIED `docs/specs/goal-pages.md` §Behavior 7 (State goal copy):
  "`unknown` → 'Israel Bonds: not yet sourced' with a 'help us find it'
  link to the research file on GitHub (`RESEARCH_URL`)" → "`unknown` →
  'Israel Bonds: not yet sourced', with no link".

## Acceptance criteria
- [ ] `/about` and `/donate` show the copy in Expected behavior 1–2; the
      owner's name appears on neither.
- [ ] A state target with `holdings_status: unknown` shows "Israel Bonds:
      not yet sourced" and no link; `held` and `none` targets still show
      "source" linking `holdings_source` (`Target.test.ts` updated, not
      weakened: the held and none cases keep their assertions).
- [ ] The build guard fails when either string is put back into any page
      (checked once by hand during the build, then reverted), and passes
      on the shipped build.
- [ ] `grep -ri -E 'nguyen|github.com/6nguyen'` over the deployed site's
      HTML (`/`, `/about/`, `/donate/`, `/privacy/`, every `/goals/*` and
      a state results page) finds nothing.
- [ ] Owner: the Stripe account's public business name, statement
      descriptor, support email and support phone shown on Payment Link
      checkout and on receipts carry no personal name or personal
      contact.
- [ ] Owner: the Instagram account is signed up with an address on
      `cutthetiesmovement.org`, is not linked to a personal Facebook or
      Instagram account in Accounts Center, has contact syncing off and
      has "suggest account to others" off.
- [ ] Landing page weight is unchanged (≤100 KB transferred).

## Rollout & metrics
No flag; ships on the next deploy. Measure: the deployed-HTML grep above
returns nothing.

## State (updated 2026-11-13, PR #103)
- Sections:
  - [~] 1. Site copy, link removal and build guard · `feat/no-owner-ties-site-copy-build-guard`
  - [ ] 2. Owner checklist
- Completed: PRD written; §1 built (copy on `/about` and `/donate`, `unknown`
  holdings line has no link, `RESEARCH_URL` deleted, build guard
  `web/test/no-owner-ties.test.ts`, CI runs `build` before `test-web` so the
  guard sees `web/dist`).
- Folded: §1 (goal-pages.md §Behavior 5–7).
- Branch / open PRs: `feat/no-owner-ties-site-copy-build-guard` (§1).
- Files changed (file:line map): `web/src/pages/about.astro:12`,
  `web/src/pages/donate.astro:9`, `web/src/components/Target.tsx:147-150`,
  `worker/src/state-copy.ts` (RESEARCH_URL removed),
  `web/src/components/Target.test.ts:30-50`, `web/test/no-owner-ties.test.ts`
  (new), `.github/workflows/ci.yml:17`, `docs/specs/goal-pages.md` §5–7,
  `docs/prd/state-holdings-sweep.md:68-69`.
- Tests run + result: build PASS, test-web PASS (guard hand-checked: name
  put back in donate.astro → FAIL naming `dist/donate/index.html`, reverted
  → PASS), tsc PASS, test PASS. Landing `/` HTML 24.8 KB raw / 6.1 KB gzip.
- Remaining: §2 (owner: Stripe public details and Instagram identity; then
  the deployed-HTML grep after §1 deploys).
- Decisions since last update: CI target order changed to run `build`
  before `test-web`, and the guard fails (not skips) when `CI` is set and
  `web/dist` is missing, so it cannot be skipped in CI.
- Known failures / blockers: §2.1 needs the owner's Stripe and Instagram
  accounts; an agent cannot do it.
- Next action: merge §1's PR, then `/implement-prd-section docs/prd/no-owner-ties.md` §2.
## Open questions
1. Does dropping the name from the "paid for by" line break a disclosure
   rule? Proposal: no change needed now. Federal disclaimer rules reach
   internet communications only when they are placed for a fee on another
   person's site, and this site funds no candidate. "One volunteer, not a
   PAC" keeps the useful part. When `primary-2028` §2 goes to counsel, add
   this line to that review: the electoral goals will name candidates.
2. Should "volunteer" be "person"? Proposal: "volunteer". It reads as
   grassroots to the accounts being pitched and says the same thing.

## Changes
- 2026-11-11 — created (READY, auto): no blocking questions. Proposals 1–2
  became decisions.
- 2026-11-13 — §1 built: `/about` and `/donate` copy, `unknown` holdings
  line loses its link, `RESEARCH_URL` deleted, build guard added; CI runs
  `build` before `test-web` so the guard checks the real `web/dist`. Spec
  delta folded into goal-pages.md §5–7.
