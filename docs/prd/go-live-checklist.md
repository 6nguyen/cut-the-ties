# Go-live checklist — PRD
Status: TESTING (§1 owner go-live checklist: 2 of 11 ticked) · Owner: George Nguyen · Last updated: 2026-11-13

## Problem
The site has been live at `https://cutthetiesmovement.org/` since
2026-11-06 and deploys on every merge to `main`
(`archive/2026-11-deploy.md`, PR #29). The launch checklist in
`docs/guides/deploy.md` §5 has one of eleven items ticked, so nothing
records that the donate buttons work, that the digest email arrives, that
Turnstile refuses a bare request, or that the performance budgets hold on
the production domain (`docs/specs/action-router.md` §Performance budget
still quotes local numbers). Two items need the owner's accounts: the
`STRIPE_LINKS` variable and the Cloudflare bill. This was split out of
the shipped deploy PRD instead of holding it open.

## Goals / Non-goals
- Goals: every §5 item ticked and committed with its measured number; the
  production budgets recorded in the spec; a known-good preview path.
- Non-goals: new infrastructure, a paid plan, monitoring or alerting.

## Users
The owner (accounts, billing, Stripe) and an agent session (curl checks,
Lighthouse, p95 timing scripts).

## Expected behavior
### 1. Go-live checklist
Work through `docs/guides/deploy.md` §5 and tick each item in the same
commit that records its number:
1. The three fixture addresses (CA-46, TX-35, PA-1) route on the live site.
2. Owner sets `STRIPE_LINKS` (`once_5`, `monthly_1`, `custom`) in GitHub
   Actions variables; the three `/donate` buttons open Stripe.
3. One generation streams end to end with the real `ANTHROPIC_API_KEY`.
4. The digest's manual trigger delivers one email to `MAINTAINER_EMAIL`.
5. `POST /api/route` without a Turnstile token is refused.
6. Measured on the production domain and recorded in
   `docs/specs/action-router.md` §Performance budget: landing KB, LCP
   (Lighthouse mobile, slow 4G), `/api/route` p95 over 20 requests, first
   token and complete p95.
7. After one week live, Cloudflare billing shows $0 for Pages, Workers,
   D1, Turnstile and Email Routing.
8. A PR preview routes a fixture address. Today it does not: preview
   `/api/*` returns a 404 page (checked on PR #104's preview, 2026-11-11).
   The fix restores specced behavior (`docs/specs/deployment.md` preview
   rule), so it is a fix PR, not a section here; this item is ticked when
   it merges.

## Spec delta
Moved from `archive/2026-11-deploy.md`:
- MODIFIED `docs/specs/action-router.md` §Performance budget: local and
  2026-11-08 numbers → measured on the production domain, with LCP,
  `/api/route` p95 and the generation p95s filled in.

## Acceptance criteria
Moved from `archive/2026-11-deploy.md`:
- [ ] A merge to `main` that changes a goal YAML shows the change on the
      live site within five minutes with no manual step.
- [ ] A PR opened against `main` gets a preview URL whose landing page
      routes a fixture address.
- [ ] The go-live checklist is ticked and committed with the measured
      numbers: landing ≤100 KB transferred, LCP ≤1.5 s on a mid-range
      phone over 4G, `/api/route` ≤2 s p95, first streamed token ≤3 s
      p95, generation complete ≤10 s p95.
- [ ] Cloudflare billing shows $0 for Pages, Workers, D1, Turnstile and
      Email Routing after the first week.

## Rollout & metrics
No flag. Each ticked item is its own small docs commit with the number.

## State (updated 2026-11-13)
- Sections: (build order; `[ ]` todo · `[~]` in progress · `[x]` merged · `[!]` blocked: reason)
  - [~] 1. Go-live checklist · owner and agent tick `docs/guides/deploy.md` §5
- Completed: §5 README item (2026-11-08); §1.5 Turnstile refusal (2026-11-13, 403). Everything else in `archive/2026-11-deploy.md`.
- Branch / open PRs: none.
- Remaining: §1.1–1.4, 1.6–1.8.
- Known failures / blockers: §1.6 fails on two budgets (2026-11-13): landing 117.7 KB first-party plus 1,974 KB Turnstile, and LCP 4.2 s; each needs a fix PR. Turnstile refuses the automated browser, so §1.1's address path and §1.3 need a person in a real browser. Preview `/api/*` 404s (§1.8). §1.2 and §1.7 need the owner's GitHub and Cloudflare accounts.
- Next action: the owner routes the three fixture addresses and runs one generation in their own browser (DevTools Network for `/api/route` and `/api/generate` timing) and does §1.2, 1.4, 1.7; fix PRs for landing weight and LCP, then re-measure §1.6; a fix PR for §1.8.

## Open questions
1. Is a generation (§1.3) worth its LLM cost just to tick the box?
   Proposal: yes, one run; it is the only end-to-end check of the API key
   and streaming in production.

## Changes
- 2026-11-13 — created by splitting §3 out of `archive/2026-11-deploy.md`
  (`docs/prd/README.md` Lifecycle 5); no blocking questions, READY (auto),
  Status TESTING because only verification remains. Added §1.8 for the
  preview 404 found on 2026-11-11.
- 2026-11-13 — agent run on the live site: §1.5 passes (403
  `turnstile`). §1.6 measured and recorded in `docs/guides/deploy.md` §5, not the spec, because `action-router.md` is at doc-lint's 16 KB cap (the spec only drops its "no third-party script" claim): landing 117.7 KB
  first-party plus 1,974 KB Turnstile and a 10.2 KB Cloudflare Insights
  beacon; LCP 4.2 s; `/api/route` 395 ms p95 on the district path only.
  Landing and LCP fail. §1.1's address path and §1.3 are not run: Turnstile
  refuses the automated browser. The `{state, district}` path does return
  CA-46 Correa, TX-35 Casar and PA-1 Fitzpatrick.
