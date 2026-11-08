# Email button on the call page — PRD
Status: SHIPPED 2026-11-08 (PR #66) · Owner: George Nguyen · Last updated: 2026-11-08

## Problem
The act page ends in a call or nothing. A caller who reaches a full
voicemail, who opens the page after 18:00 ET when both offices are
closed, or who cannot use the phone (hearing, speech, anxiety, a
workplace) has no second channel, and a voicemail that is full is never
logged by the office. The evidence says the written channel is not a
lesser one: in every Congressional Management Foundation staff survey a
personalised email rates at or above a phone call for influence on an
undecided member (2010: letters 90 %, email 88 %, calls 84 %; 2015: email
92 %, calls 84 %, form email 56 %), offices log calls, voicemails and
email into one constituent-mail tally, and email is logged more reliably
than calls (95 % of offices vs 79 %). Calls win only on visible
disruption and speed. So the call stays centre stage, and an email is
the fallback that turns a failed or impossible call into a tally mark,
never a warm-up that cannibalises the call
(`docs/research/email-vs-call.md` §A–B).

## Goals / Non-goals
- Goals: a caller whose call failed or who cannot call sends the same
  personalised message in writing through the member's own contact form
  within two minutes; a caller whose call went through can add a written
  copy in one tap without being nudged toward it; email receipts are
  counted separately so call counts never inflate; nothing identifying
  transits the Worker; $0 and no new model call.
- Non-goals: email before or beside the call as an equal option (the
  easy substitute lowers completion of the hard act); an `email` action
  type on results cards; House/Senate CWC vendor registration (needs a
  legal entity, an XML integration and a 72-hour support duty; revisit if
  a fiscal sponsor exists); server-side form filling (hCaptcha, Turnstile
  and reCAPTCHA on every member site checked, the user's address would
  transit our Worker, House policy names the CAPTCHA as anti-automation);
  `mailto:` to guessed staff addresses (no public addresses, unlogged
  spam); partner vendors such as Action Network or VoterVoice (sender data
  lands on their lists); a second model generation for the email.

## Research (what the best products do → adopt / adapt / reject)
Relies on: `docs/research/email-vs-call.md`,
`docs/research/civic-action-levers/organizing-channels-and-tools.md`.
| Pattern | Seen in | Verdict | Why |
|---|---|---|---|
| Call first, written channel as the fallback for voicemail and after hours | 5 Calls (calls only, "left voicemail" outcome), Indivisible guides | adopt | voicemail that is full is unlogged; an email always lands in the same tally |
| Letter as the primary, one-tap channel | Resistbot (56.9 M letters vs 5 Calls' 7 M calls) | reject | the easy channel substitutes for the call, the only channel offices feel as disruption |
| Deep link to the member's own form plus a copy button | JVP "Email Congress", this site's letter actions | adopt | 100 % Senate coverage, House `/contact` ZIP gate; nothing stored, nothing transits |
| Per-member form field hints | `unitedstates/contact-congress` YAML (active, ~9 commits/month) | defer | a chamber-level hint covers the common case; adopt the YAML only if testing shows drop-off at the form |
| Deliver through CWC/SCWC as an approved vendor | Quorum, Capitol Canary, Resistbot | reject for now | free but needs an entity, XML integration, accurate sender addresses through our Worker and on-call support |
| Private, related second ask right after the hard act | Kristofferson 2014, Lee & Hsieh 2013 | adapt | consistency raises uptake of a related private act; a muted "Put it in writing" link, never a card |

## Users
- A caller after 18:00 ET or on a weekend: both offices closed, wants to
  do something now. Needs the email path promoted, not hidden.
- A caller who got a full mailbox or no answer: already has a retry
  reminder (`commitment-funnel.md` §9); needs the written copy to land
  today.
- A constituent who cannot call: needs "I can't call" visible on the
  first screen of the output, with no explanation demanded.
- A caller who got through: may want a written copy; must not be nudged
  into a second identical message as if it were a second signal.

## Expected behavior
### 1. Email step on the receipt screen
1. The output screen is unchanged above the call buttons: the script,
   copy / download / regenerate, then every `tel:` button with its
   open/closed chip. No email affordance renders above or beside the call
   buttons.
2. Under the call buttons one text link, "I can't call right now", always
   renders. When every office on file is closed (`isOpen` false for each
   phone's office, `web/src/lib/hours.ts`) it is replaced by a primary
   button "Both offices are closed. Email instead" (one office:
   "The office is closed. Email instead") above the call buttons' note.
3. In the office-response picker, choosing `no_answer` keeps the
   voicemail line and "Try again" (`commitment-funnel.md` §9) and adds a
   primary button "Email it instead" beside "Try again". Choosing any
   other outcome shows, under the reported line, a muted text link "Put
   it in writing (2 min)".
4. Any of those opens the **email step** in place of the call row: a
   card headed "Send it in writing" with (a) the subject line, (b) the
   message, (c) "Copy subject and message", (d) the contact link, (e) a
   one-line field hint, (f) "I sent it".
   - Subject = the action's `email_subject` (new YAML field, ≤80
     characters, maintainer-authored).
   - Message = `Dear <Role> <Surname>,` + blank line + the generated body
     exactly as shown (standard script included) + blank line +
     `<first_name>, <city>`. The first name and city are the user's own
     fields already on the device; nothing else is added and no model
     runs. A refused draft has no email step (there is no body).
   - Contact link labelled by `contact_kind` as on member pages: "Open
     the contact form ↗" (`form`), "Open the contact form (asks for your
     ZIP first) ↗" (`zip_gate`), "Open the office website, then Contact ↗"
     (`homepage`). A target with no `contact_form_url` shows "This office
     lists no contact form; the DC number is the only channel." and no
     "I sent it".
   - Field hint by chamber: House "The form asks for your name, address
     and ZIP, then a topic and a message box: paste the message there."
     Senate "The form asks for your name, address and email, a topic and a
     message box: paste the message there." State treasurer actions: "Paste
     the message into the comment box."
   - "Back to calling" returns to the call row with nothing lost.
5. "I sent it" → `POST /api/receipt` with `channel: 'email'` and the same
   goal, action, target, state, district and device as a call receipt →
   the receipt card reads "Counted. No name, no address: just this goal,
   this office, today." and the funnel runs as for a letter
   (`commitment-funnel.md` §1: "Will you call by <date>?", then the
   captain list, then next office, echo and share). A device that already
   posted a call receipt for the same goal, action and target within 10
   minutes may still post one email receipt (`limit_repeat` keys on
   channel); a second email receipt in 10 minutes is `limit_repeat`.
6. The echo line and district counters count call receipts only; an
   email receipt never moves "N constituents in <STATE-NN> called this
   week". Email receipts appear in the weekly digest as their own column.

### 2. Data, seed and roster checks
1. `data/actions/<slug>.yaml` gains `email_subject` (required while the
   goal is active; ≤80 characters; no URL, email or phone; the seed
   rejects anything else). Each of the five call actions gets one in the
   same PR, in plain English, naming the vote (e.g. "Constituent in
   {city}: vote only for a leader who drops the integration section";
   `{city}` is the one allowed placeholder).
2. `worker/schema.sql` `receipts` gains `channel TEXT NOT NULL DEFAULT
   'call' CHECK (channel IN ('call','email'))`; `kind 'captain-list'` rows
   keep `'call'` by default and are never read by channel. Index
   `receipts_kind_goal` is extended to `(kind, channel, goal_id, state,
   district)`.
3. The weekly roster workflow (`maintainer-tooling.md` §6) adds a HEAD
   check of every `contact_form_url`: a non-2xx/3xx answer is listed in the
   PR body under "Contact links to check" and never changes the row on
   its own. `roster-and-district-offices` research puts URL churn at
   ~10 % at the January swearing-in and near zero between.

## Data & contracts
- `POST /api/receipt` body gains optional `channel: 'call' | 'email'`
  (default `'call'`); any other value is 400 `bad_request`; `channel` with
  `action: 'captain-list'` is 400 `bad_request`. Stored on the row.
  `limit_repeat` counts rows with the same device hash, goal, action,
  target **and channel** in 10 minutes. `limit_day` and `limit_ip` are
  unchanged and count both channels.
- `GET /api/counts` and `Repo.counts` filter `kind = 'action' AND channel
  = 'call'`; no response shape change.
- Weekly digest (`maintainer-tooling.md` §3): the receipts table gains an
  `emails` column per goal.
- Action YAML: `email_subject` as above; `ActForm` receives it with the
  action props and the target's `contact_form_url`, `contact_kind` and
  `chamber` in `done.target` (`contact_kind` and `chamber` are new on the
  `done` payload; `contact_form_url` already is).
- No new endpoint, no new model call, no new table, nothing stored but
  the receipt row.

## Spec delta
- MODIFIED `docs/specs/personalised-documents.md` §Behavior 4: add the
  "I can't call" link, the closed-offices button, the `no_answer` "Email
  it instead" button, the "Put it in writing" link and the email step
  (§1.2–1.5 above); §Data & contracts: `POST /api/receipt` `channel`,
  `limit_repeat` keyed on channel, `done.target.contact_kind` and
  `chamber`, action YAML `email_subject`.
- MODIFIED `docs/specs/commitment-funnel.md` §Behavior 1: the letter
  wording ("Will you call by <date>?") also applies after an email
  receipt.
- MODIFIED `docs/specs/district-counters.md` §Behavior 1 and §Data &
  contracts: counts filter `channel = 'call'`.
- MODIFIED `docs/specs/maintainer-tooling.md` §Behavior 3 (digest
  `emails` column) and §Behavior 6 (contact-link HEAD check in the roster
  PR body).

## Acceptance criteria
- [ ] With both offices open, the output screen shows no email button,
      card or link above or beside the `tel:` buttons; the only email
      affordance is the "I can't call right now" text link below them.
- [ ] With the clock set to 20:00 ET on a weekday, "Both offices are
      closed. Email instead" renders as a primary button and the `tel:`
      buttons are still present.
- [ ] Choosing `no_answer` shows "Try again" and "Email it instead";
      choosing `will_support` shows only the muted "Put it in writing"
      link after the report posts.
- [ ] The email step's message is the generated body verbatim between
      the greeting and the first name + city, with no model request
      (network log shows no `/api/generate`); copy puts subject and
      message on the clipboard; the contact link opens the target's
      `contact_form_url` in a new tab with the label for its
      `contact_kind`.
- [ ] "I sent it" posts exactly one receipt with `channel: 'email'`, the
      Worker stores it, `/api/counts` for that district does not change,
      and the weekly digest shows it under `emails`.
- [ ] A call receipt then an email receipt for the same target within 10
      minutes both succeed; a second email receipt is 429 `limit_repeat`.
- [ ] `channel: 'fax'` and `channel` on a captain-list receipt are 400
      `bad_request`.
- [ ] The seed rejects an active action without `email_subject`, one
      over 80 characters, or one holding a URL, email or phone.
- [ ] A target with no `contact_form_url` shows the "no contact form"
      line and no "I sent it".
- [ ] No request carries a name, city, address or the message: the
      receipt body is the same shape as a call receipt plus `channel`.
- [ ] Performance: no new endpoint; the act island grows ≤2 KB gzip; the
      landing page stays ≤100 KB transferred; `/api/receipt` p95
      unchanged.

## Rollout & metrics
No flag: the step ships with the schema change and the five
`email_subject` lines in one PR, behind the existing "I did it" flow.
Measure in the weekly digest: email receipts per goal, the share of email
receipts posted outside DC office hours, and whether call receipts per
visit fall after the change (the cannibalisation check; a fall of more
than 10 % over two weeks means the closed-offices button demotes to a
text link).

## Open questions
1. Should the email step reuse `contact_form_url` for the 14 homepage-only
   senators or hide "I sent it" for them? Proposal: show the homepage with
   the "then Contact" label and keep "I sent it"; the roster HEAD check
   covers link rot.
2. Should the House hint name the ZIP gate's known failure (a ZIP that
   straddles districts is refused)? Proposal: one extra sentence, "If the
   form refuses your ZIP, use your ZIP+4 from usps.com." Added in §1.4.
3. Adopt the per-member field lists from `unitedstates/contact-congress`?
   Proposal: not now; log the drop-off between "Open the contact form" and
   "I sent it" in the digest first (two counts, no identity) and revisit if
   under 50 % of openers post a receipt.

## Changes
- 2026-11-08 — created; no blocking questions, APPROVED (auto).
- 2026-11-08 — §1–2 built on `feature/email-button-fe0ba7` (PR #66), spec
  deltas folded, archived. Decisions: open question 1 adopted as proposed
  (homepage-only targets keep "I sent it" under the "then Contact" label;
  a member-elect or treasurer URL is `contact_kind 'homepage'`); question 2
  adopted (ZIP+4 sentence in the House hint); question 3 deferred as
  proposed. Schema: the `channel` CHECK is written `channel = 'call' OR
  channel = 'email'` so `migrate.ts`'s column parser (no commas in a
  column line) accepts it; the `receipts_kind_goal` index change is an
  owner step because MIGRATIONS only adds columns. The digest's receipts
  block is new (no per-goal receipts table existed before), so "emails"
  arrives with "calls" and "captain lists" in one block. Act island
  6833 → 7682 B gzip (+849 B). Owner steps: (1) `npm run seed:remote -w worker`, which
  applies the pending MIGRATIONS (`actions.email_subject`,
  `receipts.channel`) and reseeds so the five subjects land; (2) on production D1 `DROP INDEX IF EXISTS
  receipts_kind_goal; CREATE INDEX receipts_kind_goal ON receipts(kind,
  channel, goal_id, state, district);`; (3) deploy the Worker before the
  site; (4) read the digest's emails column for two weeks and demote the
  closed-offices button to a text link if call receipts per visit fall
  more than 10 %.
