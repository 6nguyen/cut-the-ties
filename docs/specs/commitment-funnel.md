# Commitment funnel

## Purpose
After a receipt, offers one private reminder (a call by a date, stored
by one tap), keeps it only in the browser and shows it as a checklist on
the next visit. No share is offered before a receipt. It stops at the
device: nothing in these lists is sent. The captain list (three first
names) was retired by `one-screen-receipt` §4; a stored one is deleted
unread. The receipt itself and the share sheet are in
`personalised-documents.md`; the landing page in `action-router.md`.

## Behavior
1. **Reminder link** (`one-screen-receipt` §2.6). On the receipt
   screen, the first of its three text links (`[data-remind]`): "Remind
   me to call (.ics)" after a letter, a comment or an emailed script
   (`personalised-documents.md` §4 email step, receipt `channel
   'email'`), "Remind me before the vote (.ics)" after a call. One tap
   downloads the `.ics` of §2 for the default date (10:00 local on the
   next weekday, never later than the goal's decision date; 10:00
   anywhere in the US falls inside DC office hours,
   `call-follow-through`), stores the same commitment locally and
   replaces the link with "Reminder saved". There is no date input and
   no "Skip"; the date moves later from "Your week" (§4). Nothing is
   sent and no counter moves.
2. **Reminder.** The `.ics` is built in the browser: one event at the
   due time (15 minutes, display alarm 15 minutes before) titled "Call
   about: <goal>", with the goal deep link as URL and description. It
   holds no name.
3. **Your week (`/`).** A visitor with a stored district and any open
   commitment sees a "Your week" card above the address field instead of
   being redirected to `/results`. Each open commitment shows "You said
   you'd call about <goal> by <due>" (goal linked to its act page) with
   "Done" (removes it) and "Not yet" (hides it this visit). On load the
   card deletes `cut-ties:captain` unread: a browser that saved a captain
   list sees no list, no checkboxes and no "Share", and a list alone
   shows no card. The card's footer links to `/results`, offers "Change
   address" (clears the place and route cache, keeps every commitment)
   and "Start over" (clears the place and every commitment).
4. **Overdue and closed.** An item past its due time reads "Still on?"
   with "Done", "New date" (a date input, 10:00 local) and "Drop"
   (deletes it locally). On load, items whose goal is no longer active
   are removed and the card shows one line per goal: "<title>:
   <outcome_note>" (or "the window closed" / "closed"); a goal no longer
   listed yields "One goal is no longer listed; its item was dropped."
5. **Act page nudge.** The act page of a goal with an open commitment
   shows "You said you'd call by <due>" above the form.
6. **Voicemail retry** (`call-follow-through` §1). Choosing `no_answer`
   in the office-response picker shows "Voicemail counts. Offices tally
   messages daily; say your street address so yours is logged." and one
   "Try again" button. The tap stores a commitment of kind `retry` for
   the same goal and target, due at the DC office's next open slot at
   least 60 minutes ahead (`retryDue`, `hours.ts`), replaces the button
   with "Try <Role Name> again by <due>" and offers "Add reminder (.ics)"
   (a "Try again: <title>" event). One open retry per goal and target:
   a remount finds it and offers no second one. On "Your week" the item
   reads "Try <office> again about <title> by <due>", links to the act
   page with `?target=<id>` (both numbers, DC first), and has the same
   Done / Not yet / Still on? controls as a call. A retry never posts
   anything; nothing counts until a new receipt.
7. **Next office and echo** (`call-follow-through` §3–4,
   `one-screen-receipt` §2.2 and §2.4). Under the share row the receipt
   screen shows "Next: call <Role Name>'s office →" for each target
   of the goal with no receipt from this device in the last 24 h (local
   log `cut-ties:receipts`, written when `/api/receipt` succeeds), each
   linking to `/goals/<slug>/act/<action>?target=<id>`. The first
   (`[data-next-primary]`) is the screen's one filled button and the
   rest are bordered; while the email step shows "I sent it" that
   button holds the fill and the first drops to bordered. When every
   target has a receipt it reads "All three called this week." (two
   targets: "All of your targets called this week."); a goal with one
   target shows nothing. Above the share row, with a stored place, the
   `Counts` island in `echo` mode: "You're one of <N> constituents in
   <STATE-NN> who called this week", the state line when the district
   is under threshold, else nothing (`district-counters.md` §6). Both
   load with the receipt screen, after the act page's own bundle. The
   same 24 h rule picks the results receipt modal's one filled button
   ("Next: call <Role Name> →", `results-pages.md` §5), which closes the
   modal and scrolls to that office's ringed call square instead of
   linking the act page.

## Data & contracts
- `localStorage` `cut-ties:commitments` = `[{v: 1, goal, action, target,
  due, kind?, who?}]` (`due` ISO; `kind` `call` (default) or `retry`;
  `who` the "Role Name" a retry shows). Key = `call:<goal>` or
  `retry:<goal>:<target>`: one call per goal, one retry per goal and
  target (`keyOf`); `cut-ties:receipts` = `[{v: 1, goal, action, target,
  at}]`, one row per goal, action and target, pruned to 24 h on every
  read, cleared by "Start over". `cut-ties:captain` (the retired captain
  list) is never read: `/` deletes it on load and so does "Start over".
  Records with another `v` or a wrong shape are ignored.
  `cut-ties:device` (`web/src/lib/store.ts`) is shared with the receipt
  flow. Nothing in these keys is ever sent.
- Deadline rules (`web/src/lib/commitments.ts`, `DUE_HOUR = 10`): default
  = next weekday 10:00 local, capped at the decision date's 10:00; a
  missing decision date means no cap.
- `POST /api/receipt` still accepts `{goal, action: 'captain-list', state?,
  district?, device}` (no shipped client sends it; cached old ones may): the goal must be active, `target` must be absent
  (else 400 `bad_request`), and the row is written with `kind
  'captain-list'`, `action_id NULL`, `target_id NULL`. Ordinary receipts
  are unchanged and carry `kind 'action'`.
- `receipts` (`worker/schema.sql`): `action_id` and `target_id` are
  nullable; `kind TEXT NOT NULL DEFAULT 'action' CHECK (kind IN
  ('action','captain-list'))`; a CHECK ties `kind = 'action'` to both
  ids present and `'captain-list'` to both absent, so the FK still
  guards every ordinary receipt. Index `receipts_kind_goal (kind,
  goal_id, state, district)` serves a later per-goal/district count.
  Decision over a synthetic `action_id` value: an FK column cannot hold
  a string, and a fake `actions` row would leak into action listings.
- `.ics` (`web/src/lib/ics.ts`): RFC 5545 with CRLF line ends, 75-octet
  folding, TEXT escaping; `VCALENDAR` (VERSION 2.0, PRODID) › `VEVENT`
  (UID, DTSTAMP, DTSTART/DTEND in UTC, SUMMARY, DESCRIPTION, URL) ›
  `VALARM` (DISPLAY, `-PT15M`). File name `call-<goal>.ics`.
- Islands: `web/src/components/ReceiptExtras.tsx` (steps 1, 6 and 7, in
  the lazy receipt chunk `ActForm.tsx` loads after a receipt),
  `web/src/components/YourWeek.tsx` (steps 3–4, mounted above
  `AddressForm` on `/` with every published goal's `{slug, title, status,
  decision_date, outcome_note}` as props).

## Invariants (regression checklist)
- [ ] No share control renders before a receipt
      (`web/src/components/receipt.test.tsx`).
- [ ] `/` deletes `cut-ties:captain` on load and shows no captain list,
      checkbox or "Share"; a stored commitment and a retry still show,
      nothing is posted and no poster module loads (`funnel.test.ts`,
      `commitments.test.ts`).
- [ ] "Next:" lists only targets without a receipt in the last 24 h,
      links carry `?target=`, and the slot is empty for a one-target goal
      (`funnel.test.ts`, `commitments.test.ts`).
- [ ] `no_answer` → "Try again" stores exactly one `retry` due ≥60 min
      ahead inside DC hours, a remount offers no second one, and no
      request is made (`funnel.test.ts`, `commitments.test.ts`).
- [ ] `POST /api/receipt` with `action: captain-list` and no `target`
      still stores `kind 'captain-list'` with null ids
      (`worker/test/generate.test.ts`).
- [ ] The `.ics` parses (CRLF, ≤75 octets per line, required properties
      in order), carries the goal link and no name (`web/src/lib/ics.test.ts`).
- [ ] The default deadline is the next weekday 10:00 local and never
      later than the decision date (`web/src/lib/commitments.test.ts`).
- [ ] A return visit with an open item shows "Your week" above the
      address field and does not redirect; "Change address" keeps the
      items; "Start over" clears them; a closed goal's item is dropped
      with its outcome line.

## Performance budget
Landing ≤100 KB transferred with the island (measured 2026-11-04: 24.0
KB gzip for `index.html`, CSS, both islands and the Preact runtime);
LCP ≤1.5 s; no new Worker endpoint.
