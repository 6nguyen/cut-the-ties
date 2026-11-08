# Research routines

## Purpose
Keeps the maintainer's recurring research (federal positions and decision
dates, Senate-leader candidate signals, state holdings) running on a
schedule without handing an LLM write access to the site: each routine is
a prompt file in the repository, run as a scheduled Claude Code task that
ends in a reviewable `data/` PR or in nothing. A deterministic CLI turns a
House roll call into position rows and member flags. Nothing here writes
to `data/` directly or touches D1.

## Behavior
1. **Research routines** — three prompt files under `.claude/routines/`
   (`federal-positions.md`, `senate-leader-signals.md`,
   `state-holdings.md`) are the maintainer's recurring research, run by a
   scheduled Claude Code task whose stored prompt is one line pointing at
   the file. All three carry one identical `## Output contract`: the run
   starts from `main` on `data/<routine>-<YYYY-MM-DD>` and ends in one PR
   titled `data: <routine> <YYYY-MM-DD>` (or none); it writes at most one
   new dated `docs/research/` snapshot (with `Supersedes`, `## What
   changed`, index row), CSV rows a draft CLI printed, and the goal YAML
   fields `decision_date`, `this_week`, `this_week_date`, `sources`,
   `our_picks` and `[VERIFY]` chips; the PR body is `## Changed`,
   `## VERIFY`, `## Not found`; the run is capped at 100 tool calls and
   40 fetched pages, one request per second per host, a fixed
   `User-Agent`, no retry on 403, back-off on 429/503, and runs
   `check-data` before opening the PR. Cadences: federal positions
   Tuesday and Friday 14:00 UTC 2026-11-07 to 2026-12-19 (plus named
   manual runs); Senate leader signals Mondays 14:00 UTC from 2026-11-09
   until the caucus vote; state holdings 2026-11-12 and 2026-12-03 (ten
   states each). Each file's `## Steps` section holds its own work.
2. **Roll-call import** — `npm run import-rollcall -w worker --
   <clerk-xml-url> <goal> [--flag <column>]` fetches one House Clerk
   roll-call XML (`clerk.house.gov/evs/<year>/roll<nnn>.xml`), maps each
   `recorded-vote` to the member by `name-id` (the bioguide id) and prints
   either `data/positions/<goal>.csv` rows (`Yea`/`Aye` → `for`,
   `No`/`Nay` → `against`, `Not Voting`/`Present` → no row; `source_url`
   = the XML URL, `source_date` = the XML's `action-date` as
   `YYYY-MM-DD`, `changed_by` = `import-rollcall`; header first) or, with
   `--flag`, the whole `members.csv` with that column set for every
   member in the XML (`yes`/`no` for a vote cast, `not voting`/`present`
   otherwise) and left as is for the rest. A `name-id` not in
   `members.csv` is printed to stderr as `# unknown member <id> <name>`
   and skipped; exit 0 so the rest of the vote lands. Nothing is written;
   the maintainer pastes stdout into a `data/` PR. Senate roll calls are
   not fetched (senate.gov refuses non-browser clients); their rows are
   typed by hand with the `senate.gov` vote URL as source. Exit codes: 64
   usage, 65 unknown goal slug or flag column, 66 non-200 or non-XML
   response (nothing on stdout).

## Data & contracts
- Research routines: `.claude/routines/<routine>.md` (`## Output contract`
  identical across files, `worker/test/routines.test.ts`; then `## Steps`,
  `## Cadence`). Scheduled tasks `cut-ties/federal-positions`,
  `cut-ties/senate-leader-signals`, `cut-ties/state-holdings` on
  `6nguyen/cut-the-ties` (claude.ai/code/routines; state holdings is two
  one-shot routines, one per batch date; no connectors, no Worker cron,
  no D1 access). The routine API sets neither branch-scoped write access
  nor an `ANTHROPIC_API_KEY` secret: the output contract plus PR-only
  merges are the gate, and a keyless run lists candidate statements under
  `## VERIFY` instead of running a draft CLI. Branch
  `data/<routine>-<YYYY-MM-DD>`, PR title `data: <routine> <YYYY-MM-DD>`,
  body sections `## Changed`, `## VERIFY`, `## Not found`.
- Roll-call import: `worker/scripts/import-rollcall.ts` (CLI) →
  `worker/src/import-rollcall.ts` (pure, no fetch or file write):
  `parseRollCall(xml)` → `{date, rollCallNum, question, legisNum, votes:
  [{nameId, name, vote}]}` (throws unless `isRollCallXml`),
  `rollCallRows(parsed, members, sourceUrl)` → `{rows, unknown}` (rows in
  `POSITIONS_HEADER` order, `CHANGED_BY = import-rollcall`),
  `rollCallFlags(parsed, membersCsv, column)` → `{csv, unknown, set}`,
  `clerkDate` (`15-Jul-2026` → `2026-07-15`), `positionOf`, `flagOf`.
  Fixture `worker/test/fixtures/roll-call.sample.xml`; `package.json`
  script `import-rollcall`. Positions rows keep
  `bioguide_id,position,source_url,source_date,changed_by`; `changed_by`
  gains the value `import-rollcall`.

## Invariants (regression checklist)
- [ ] A routine never pushes to `main`, never writes `worker/`, `web/`,
      `docs/specs/` or D1, writes a CSV row only when a draft CLI printed
      it, and removes a `[VERIFY]` chip only with its source in the same
      commit.
- [ ] `import-rollcall` never writes a file and prints a row only for a
      vote recorded in the XML (`Not Voting`/`Present` and unknown ids
      print no row); a non-200 or non-XML response exits 66 with nothing
      on stdout.

## Performance budget
Research routines add about 15 scheduled runs through 2026-12-19, each a
Claude Code task (claude-sonnet-5-5) capped at 100 tool calls and 40
pages plus the Haiku draft-CLI calls in `maintainer-tooling.md`; a run
that finds nothing opens no PR (first run 2026-11-08: 6 tool calls, 23 s).
`import-rollcall` is one HTTP request and no model call. Infra stays $0.
