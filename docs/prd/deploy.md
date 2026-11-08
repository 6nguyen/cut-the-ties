# Production deployment — PRD
Status: BUILDING · Owner: George Nguyen · Last updated: 2026-11-08

## Problem
The action-router shipped (archive/2026-11-action-router.md) as code that
builds and passes 99 tests, but nothing runs outside `localhost`: no
Cloudflare account resources exist, `worker/wrangler.jsonc` carries a
placeholder D1 id, no secrets are set, CI has no deploy step, there is no
domain, and the Stripe links render "link not configured". Every
queued feature is invisible until this lands.

## Goals / Non-goals
- Goals: the site and API reachable on one domain over HTTPS; a merged PR
  to `main` deploys both within five minutes with no manual step; the
  production D1 seeded from `data/`; every secret and variable documented
  in one place; cost stays at the $0 infra budget.
- Non-goals: real roster or bond-holdings data (own PRDs); monitoring
  beyond Cloudflare's built-in analytics; a staging environment (preview
  deployments per PR are enough); custom email beyond the digest route.

## Research (what the best products do → adopt / adapt / reject)
| Pattern | Seen in | Verdict | Why |
|---|---|---|---|
| Deploy from CI on merge, not from a laptop | every Pages/Workers project | adopt | reproducible; the only path that keeps `data/` and D1 in step |
| Preview deployment per PR | Cloudflare Pages default | adopt | free; lets the owner click a PR before merging |
| Worker routed under the site's `/api/*` | PRD §Infrastructure | adopt | same origin, no CORS, no cookies |
| Separate staging account | larger teams | reject | one person, $0 budget; previews cover it |

## Users
The maintainer (one person) runs the one-time provisioning and reads the
runbook when something breaks. Site visitors only notice that the site
exists and that donate links work.

## Expected behavior
### 1. Provisioning runbook and config
1. `docs/guides/deploy.md` lists, in order, every one-time step with the
   exact command: `wrangler login`, `wrangler d1 create cut_ties`, paste
   the id into `worker/wrangler.jsonc`, `wrangler secret put` for
   `TURNSTILE_SECRET` and `ANTHROPIC_API_KEY`, create the Pages project
   from the GitHub repo (build command `npm run build -w web`, output
   `web/dist`, Node 22), set the Pages build variables (`SITE_URL`,
   `STRIPE_LINKS`), add the custom domain, enable
   Email Routing with `MAINTAINER_EMAIL` as a verified destination, create
   a Turnstile widget for the domain and put its site key in the web env.
2. `worker/wrangler.jsonc` keeps the placeholder D1 id and no route;
   `worker/scripts/render-deploy-config.ts` renders the gitignored
   `wrangler.deploy.json` at deploy time with the id from
   `D1_DATABASE_ID` and the `<domain>/api/*` route from `SITE_DOMAIN`
   (wrangler does not interpolate env vars in its config), so the
   checked-in file works for local dev and CI alike.
3. A `.env.example` at the repo root lists every variable and secret with
   one line each: where it is set (Pages build env, Worker var, Worker
   secret, GitHub Actions secret) and what breaks without it.

### 2. CI deploy on merge
1. `.github/workflows/deploy.yml` runs on push to `main` after `ci.yml`
   passes: `npm ci`, `scripts/quiet-check.sh deploy-worker` (`wrangler
   deploy`), then `scripts/quiet-check.sh seed-remote` (`npm run
   seed:remote -w worker`), then `scripts/quiet-check.sh deploy-web`
   (`wrangler pages deploy web/dist`). Secrets `CLOUDFLARE_API_TOKEN` and
   `CLOUDFLARE_ACCOUNT_ID` come from GitHub Actions.
2. Pull requests get a Pages preview URL posted by `deploy.yml`'s
   `preview` job (the Pages project is Direct Upload, which has no Git
   integration); the preview's `/api/*` is proxied to the production
   Worker by a Pages Function (read-only endpoints are safe; `generate`
   is rate-limited per device).
3. A failed deploy step fails the workflow and leaves the previous
   deployment live; nothing is half-deployed because the Worker deploys
   before the seed and the seed before the pages.

### 3. Go-live checklist
1. `docs/guides/deploy.md` ends with a checklist the maintainer ticks on
   first launch: address routes for the three fixture states, `/donate`
   shows three working Stripe links ($5 once, $1 monthly, custom amount;
   no running cost is shown, spend is internal reporting only), a
   generation streams with a real `ANTHROPIC_API_KEY`, the digest cron
   fires once by `wrangler deploy --dry-run`-free manual trigger and the
   email arrives, Turnstile blocks a request without a token, the landing
   transfer size is measured and recorded in the spec.
2. `README.md` replaces "Nothing is built yet" with the live URL and a
   three-line "run locally" block.

## Data & contracts
- New files: `.github/workflows/deploy.yml`, `.env.example`,
  `docs/guides/deploy.md`.
- `scripts/quiet-check.sh` targets `deploy-worker`, `seed-remote`,
  `deploy-web` (not in `CI_TARGETS`; only the deploy workflow calls them).
- `worker/wrangler.jsonc` unchanged in git; `worker/wrangler.deploy.json`
  (generated, gitignored) carries `routes` and the real `database_id`.
  `web/functions/api/[[path]].ts` proxies preview `/api/*` to `API_ORIGIN`.
- GitHub Actions secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`,
  `D1_DATABASE_ID`; variables `SITE_DOMAIN`, `PAGES_PROJECT`,
  `STRIPE_LINKS`, `PUBLIC_TURNSTILE_SITE_KEY`. No new
  Worker endpoints or tables.

## Spec delta
- ADDED `docs/specs/deployment.md`: how a merge reaches production,
  the variable table, the preview rule and the rollback rule (redeploy
  the previous commit from the Actions UI).
- MODIFIED `docs/specs/action-router.md` §Performance budget: "measured
  2026-11-04 locally" → measured on the production domain, with the
  LCP and `/api/route` p95 numbers filled in.

## Acceptance criteria
- [ ] A merge to `main` that changes a goal YAML shows the change on the
      live site within five minutes with no manual step.
- [ ] `wrangler.jsonc` in git contains no account-specific id; `npm run
      dev` and `npm test` still work from a clean clone.
- [ ] A PR opened against `main` gets a preview URL whose landing page
      routes a fixture address.
- [ ] Every name in `.env.example` is read somewhere in `web/` or
      `worker/` (grep test) and every `env.X` read in `worker/src` is in
      `.env.example`.
- [ ] The go-live checklist is ticked and committed with the measured
      numbers: landing ≤100 KB transferred, LCP ≤1.5 s on a mid-range
      phone over 4G, `/api/route` ≤2 s p95, first streamed token ≤3 s
      p95, generation complete ≤10 s p95.
- [ ] Cloudflare billing shows $0 for Pages, Workers, D1, Turnstile and
      Email Routing after the first week.

## Rollout & metrics
No flag: the first deploy is the rollout. Metrics: deploy workflow
duration, Cloudflare request counts and error rate for `/api/*`, the
measured budget numbers above.

## State (updated 2026-11-08)
- Sections: (build order; `[ ]` todo · `[~]` in progress · `[x]` merged · `[!]` blocked: reason)
  - [x] 1. Provisioning runbook and config · PR #29
  - [x] 2. CI deploy on merge · PR #29
  - [~] 3. Go-live checklist · `feat/deploy-donate-tiers` · owner ticks `docs/guides/deploy.md` §5 by hand; no code waits on it
- Completed: §1–2 merged via PR #29. Provisioning (runbook steps 1–12) done by the owner: production job (deploy worker → seed remote D1 → deploy web) green on every merge to `main` since 2026-11-06; PR previews on `*.cut-ties.pages.dev`; `https://cutthetiesmovement.org/` live. `README.md` carries the live URL. `/donate` tiers set to $5 once / $1 monthly / custom, no cost line (this branch).
- Folded: docs/specs/deployment.md (ADDED), docs/specs/README.md index row,
  docs/specs/maintainer-tooling.md §Behavior 4 (seed:remote / schema:remote);
  2026-11-08: goal-pages.md Behavior 5 + config, deployment.md env table (donate tiers, `MONTHLY_COST_USD` removed).
- Branch / open PRs: `feat/deploy-donate-tiers`.
- Files changed: .github/workflows/deploy.yml; .env.example; docs/guides/deploy.md;
  docs/specs/deployment.md; worker/scripts/render-deploy-config.ts;
  web/functions/api/[[path]].ts; worker/test/env-example.test.ts;
  worker/package.json:8-14; worker/scripts/seed.ts:16-19; worker/wrangler.jsonc vars;
  scripts/quiet-check.sh:19-22; README.md:3; web/src/lib/donate.ts (+ donate.test.ts);
  web/src/pages/donate.astro; worker/src/cost.ts:21 (comment).
- Tests run: quiet-check prd-lint, doc-lint, tsc, test, test-web, build (see PR for counts).
  Not run: anything against Cloudflare from this session beyond reading the deploy workflow runs.
- Remaining (all owner, manual; tick in `docs/guides/deploy.md` §5 and commit the numbers):
  1. Three fixture addresses (CA-46, TX-35, PA-1) route on the live site.
  2. Set `STRIPE_LINKS` (`once_5`, `monthly_1`, `custom`) in GitHub Actions variables and check the three buttons.
  3. One generation streams end to end with the real `ANTHROPIC_API_KEY`.
  4. Digest manual trigger delivers one email.
  5. `POST /api/route` without a Turnstile token is refused.
  6. Measure and record in `docs/specs/action-router.md` §Performance budget: landing KB, LCP, `/api/route` p95, first token / complete p95.
  7. After one week live: Cloudflare billing $0 for Pages, Workers, D1, Turnstile, Email Routing.
  Internal only (not on the site): actual monthly spend vs `LLM_MONTHLY_BUDGET_USD`.
- Next action: merge this PR; owner works through Remaining 1–7, then a docs PR ticks §5, records the numbers and archives this PRD.
## Open questions
1. Domain name. Proposal: the owner registers one `.org` before §3; the
   runbook uses `<domain>` until then. Not blocking: nothing in §1–§2
   depends on the name. Decided 2026-11-08: `cutthetiesmovement.org`,
   live on Cloudflare.
2. Deploy on every merge or on tags? Proposal: every merge; `data/`
   changes are the most frequent deploys and should not wait for a tag.

## Changes
- 2026-11-08 — provisioning is done: production deploys (Worker, D1
  seed, Pages) succeed on every merge to `main`, PR previews publish to
  `*.cut-ties.pages.dev`, and `https://cutthetiesmovement.org/` serves
  the site. §3 moves from blocked to in progress; what is left is the
  owner's manual checklist (`docs/guides/deploy.md` §5). Owner decision:
  `/donate` offers $5 once, $1 monthly and a custom amount, and shows no
  running cost (`MONTHLY_COST_USD` removed from the build env, the
  workflow, `wrangler.jsonc` and `.env.example`; actual spend and the LLM
  budget are internal reporting only). `README.md` carries the live URL.
- 2026-11-04 — §1–§2 built (feat/deploy). Mechanism change: wrangler
  does not interpolate env vars inside `wrangler.jsonc`, so instead of an
  env block the deploy renders `wrangler.deploy.json` from it
  (`render-deploy-config.ts`, `--config`), injecting `D1_DATABASE_ID` and
  the `SITE_DOMAIN` route; git keeps the placeholder. `seed:remote` now
  applies `seed.sql` only, with `PRAGMA defer_foreign_keys` (the old
  schema+seed would drop every user table on each merge and the data
  deletes would hit D1's enforced FKs); `schema:remote` runs once at
  provisioning. Previews come from a `preview` job plus a Pages Function
  proxy, because a Direct Upload Pages project (required for
  `wrangler pages deploy`) has no Git integration. §3 text written,
  unticked; needs the owner's accounts.
- 2026-11-04 — created (APPROVED, auto: every question carries a
  proposal, none blocking). Added to `## Next` and written in the same
  PR because no queued feature can reach users without it.
- 2026-11-04 — §1–2 merged via PR #29; §3 stays blocked on provisioning (docs/guides/deploy.md §1, then §5).
- 2026-11-05 — the positional-id known bug is fixed by `docs/prd/stable-data-ids.md` (explicit ids + `data/ids.md`); dropped from Remaining.
