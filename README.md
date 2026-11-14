# cut-the-ties

Cut the Ties helps you call Congress to cut the ties that work against you: US military ties with Israel, the lobby money behind them, wars without end, healthcare held hostage, and the Democratic leaders who keep all of it in place. Live at https://cutthetiesmovement.org/ (deploy runbook: `docs/guides/deploy.md`); the evidence is in `docs/research/civic-action-levers/`, the queue in `docs/prd/README.md` §Next.

Run locally (Node ≥22): `npm ci`, then `npm run seed -w worker` (YAML/CSV → local D1),
then `npm run dev` (Worker on 8787, site on 4321). Tests: `npm test`. No environment
variable is needed locally; `.env.example` lists every production one.

<!-- Current behavior lives in docs/specs/; proposed changes in docs/prd/. -->
