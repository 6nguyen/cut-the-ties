# Email to a congressional office: impact relative to a call, placement in the flow, and the delivery pipeline
Researched: 2026-11-08 · Informs: [email-button](../prd/email-button.md)

All URLs read 2026-11-08 unless a line says otherwise. "Not verified" marks claims
seen only in search snippets or secondary summaries, never in the primary source.

## Summary
- **Impact verdict:** a *personalised* written message rates at least as high as a call in every CMF
  staff survey (2010: letters 90 %, email 88 %, calls 84 %; 2015: email 92 %, calls 84 %, form email
  56 %); form/identical mail rates lowest. Offices log calls, voicemails and emails into one CMS
  with "no distinction" (former staffer, WaPo 2025-02-11; quote not verified verbatim), and emails
  are logged more reliably than calls (95 % of offices log letters/email vs 79 % log calls, CMF data
  2013–14). Calls win only on *visible disruption* (1,600 calls/min, Feb 2025) and speed; an email
  is a tally mark the office cannot miss but the public never sees.
- **Placement:** (c) **fallback after the call attempt, on the receipt step**, promoted when the
  office did not answer / voicemail full / after hours, and offered quietly as "also send it in
  writing" after a completed call. Reason: the chaining evidence (Lee & Hsieh 2013, Kristofferson
  2014) predicts a *private, related* second act raises follow-through, but an easier substitute
  offered *before* the hard act lowers it, and signing did not raise intent for higher-cost acts.
  Never (a); (d) leaves non-callers with nothing.
- **Pipeline:** (a) deep link to the member's own form (`contact_form_url`, already in
  `members.csv`) + "Copy your letter" + a per-chamber field hint; Senate homepage-only senators get
  the homepage with a "find Contact" hint. $0, no address transits the Worker, and a hand-submitted
  form lands in the *individual* mail queue, which CWC vendor traffic explicitly does not. CWC
  vendor status (House + Senate) is free but needs a legal entity, XML integration, 72-hour support
  duty and accurate constituent addresses; defer. Form automation and `mailto:` guessing are
  rejected.

## A. Impact

### A.1 CMF staff surveys: share of staff saying the tactic has "some" or "a lot" of influence on an undecided member
| Tactic | 2004 | 2010 (pub. 2011) | 2015 (pub. 2017) | Source / status |
|---|---|---|---|---|
| In-person constituent visit | 99 % | 97 % | 94 % | ppgbuffalo.org CMF release 2017-03-15, Roll Call 2017-02-13 (both read today) |
| Individualised postal letter | — | 90 % | — | 2010 figure from this repo's `civic-action-levers/organizing-channels-and-tools.md` §63 citing the 2011 report; CMF PDF at `congressfoundation.org/storage/documents/CMF_Pubs/cwc-perceptions-of-citizen-advocacy.pdf` returned an HTML 404 today; **not re-verified** |
| Individualised email | — | 88 % | 92 % | 2015 figure: ppgbuffalo.org release (read today); 2010 figure as above |
| Phone call | — | 84 % | 84 % | 2015 figure: CS Monitor 2017-02-13 paraphrases Fitch ("phone calls are tallied for or against, useful but less valuable"); the 84 % number appears only in search snippets of USA Today/CMF coverage, **not verified** against the report |
| Form email | — | lower (figure not retrieved) | 56 % | 56 %: search snippet only, **not verified**; CS Monitor confirms the ordering email > call > form email |
| Mass social-media posts | — | — | "scored lower" | Neblo survey cited at the 2025-12-17 House Administration hearing (govinfo transcript) |

- Series: CMF ran nine staff surveys and four advocate surveys Aug 2004–Jul 2016, >1,200 responses
  (Roll Call 2017-02-13,
  https://rollcall.com/2017/02/13/report-shows-untapped-power-of-constituent-advocacy/).
- CMF's stated reason calls rate below individualised email: the wide range in call quality; calls
  are tallied only as for/against, email carries the local-impact detail 91 % of staff find helpful
  but only 9 % of constituents include (CS Monitor,
  https://csmonitor.com/USA/Politics/2017/0213/Getting-a-busy-signal-when-you-call-Congress-Here-s-how-to-get-through;
  ppgbuffalo release
  https://ppgbuffalo.org/news-and-events/news/article:03-15-2017-12-00am-congressional-management-foundation-releases-report-outlining-the-most-effective-ways-of-contacting-congress/).
- CMF 2021 "Future of Citizen Engagement: Rebuilding the Democratic Dialogue" principle:
  "constituent advocacy must prioritize content and quality over medium and quantity" (press release
  2021-09-01,
  https://www.congressfoundation.org/news/press-releases/1865-new-report-outlines-problems-with-how-congress-communicates-with-citizens-offers-guidance-examples-to-improve-constituent-relationships;
  read via search summary, not verified verbatim). No CMF report 2022–2026 on channel influence or
  AI mail was found; the CMF hub page returned 404 today.

### A.2 How offices tally
- **One CMS, one tally.** Washington Post 2025-02-11 (Shira Ovide, "This app is turbocharging calls
  to Congress…", syndicated at
  https://cdn-www.adn.arcpublishing.com/nation-world/2025/02/11/this-app-is-turbocharging-calls-to-congress-about-trumps-policies,
  403 to our fetcher; WaPo and archive copies also blocked): a former House staffer (Anne Meeker,
  POPVOX Foundation) says offices log constituent calls, voicemails and emails into the same
  software; "There really is no distinction." Also: ~700,000 calls through 5 Calls in one week, site
  crashed. **Quote from search summary, not verified verbatim.**
- **Email is logged more reliably than a call.** CMF survey of 107 House offices (2013–14, written
  up at
  https://www.legbranch.org/2018-7-25-managing-constituent-correspondence-effects-on-citizen-advocacy-and-congressional-learning/):
  emails are logged automatically and 95 % of offices log letters/emails; phone calls need manual
  entry and 79 % of offices record them; 65 % of offices note the constituent's position; only 9
  offices break pro/con out in mail reports; 71 % report total volume. So a call that hits a full
  voicemail or a distracted intern can go uncounted; a form submission always enters the CMS.
- **Logging practice (Fireside21 help center,
  https://firesidehelp.zendesk.com/hc/en-us/articles/17474587709083-Quick-Log-FS-Guide):** staff
  "Log a Message" during the call, match the caller to a constituent record, and it is batched with
  other mail receiving the same form letter. The House phone-log form at
  https://bera.house.gov/phone-call-logging-form asks ZIP first "to see if the person is a
  constituent." Intranet Quorum docs not found (not verified).
- **Form mail dominates.** Staff interviewed for an EA Forum write-up (2024-07-02,
  https://ea.greaterwrong.com/posts/anQJZ9EnfJNH8CWex/how-congressional-offices-process-constituent-communication)
  estimate pre-generated form emails are ≥66 % and up to 90 % of incoming mail; mail reports list
  the top 3–5 issues; constituent text is forwarded only when "unique or important". POPVOX's
  long-standing guidance: offices ignore identical form letters (search summary, not verified).
- **The advocacy case for calls** (5 Calls, https://5calls.org/why-calling-works/; "Call Them In" in
  CS Monitor) rests on speed and disruption, not persuasion: calls are tallied immediately, emails
  are read and sorted in batches, a call takes ~2.5 minutes of an intern's time. CS Monitor's
  reporting adds that heavy call volume makes staff fall behind on tallying while emails are easier
  to count.

### A.3 AI-written mail
- No published 2024–2026 CMF or POPVOX finding that offices discount AI-written constituent
  messages. POPVOX Foundation announced a project on AI's impact on constituent communication and an
  early read of staff interviews that AI was affecting their work "not much" (Future-Proofing
  Congress newsletter, 118th-Congress wrap-up,
  https://futureproofingcongress.substack.com/p/future-proofing-congress-241122; date and quote from
  search summary, not verified). Results not located.
- House Administration Modernization subcommittee hearing 2025-12-17 (transcript
  https://www.govinfo.gov/content/pkg/CHRG-119hhrg62407/html/CHRG-119hhrg62407.htm): CAO witness
  says advocacy groups "are already leveraging AI to reach and influence Congress"; Noveck: 81
  million calls into Congress per year; Neblo: 80 % of citizens find AI chatbots unacceptable for
  substance; no witness said offices flag or discount AI-written mail. Aubrey Wilson's (POPVOX)
  written testimony
  (https://www.congress.gov/119/meeting/house/118781/witnesses/HHRG-119-HA27-Wstate-WilsonA-20251217.pdf,
  extracted locally) covers chatbots abroad, not mail triage.
- Implication: our script is personalised (name, address, the named vote, the member's own record),
  so it reads as individual mail, which rates highest. The risk is identical phrasing across
  thousands of users, which pattern-matches a form campaign; the block-combinatorics in
  `leader-call-scripts.md` already limit that.

### A.4 Volume and visibility
- Senate phone system ~1,500–1,600 calls/min vs 25–40 normal, early Feb 2025; Senate SAA memo;
  voicemail boxes hold ~1,000 messages (PBS/AP
  https://www.pbs.org/newshour/politics/senate-offices-receive-unusually-high-volume-of-calls-in-trumps-first-weeks;
  Daily Beast; read via search summaries). Email volume produces no comparable public signal: there
  is no switchboard to jam, and offices publish neither volumes nor response times.
- Auto-replies: every form submission gets an automatic acknowledgement; a substantive reply comes
  weeks later or never (CMF 2011 response-time data not retrieved, **not verified**). The House CWC
  standard defines "respond" as "a response by a human being", excluding auto-generated replies (CWC
  LOS Standards v1.1, Dec 2015, §A.2(f)), which is the institution's own acknowledgement that
  auto-replies are not responses.

### A.5 Leadership offices, out-of-district mail, caucus votes
- Indivisible 2018-10-08 (https://indivisible.org/?p=4311): staff ask for ZIP; out-of-district
  callers are not weighed and let the office dismiss the issue as "out-of-state troublemakers";
  leadership is no exception ("only call Nancy Pelosi if you live in CA-12", same for Schumer and
  McConnell). FiveThirtyEight (URL dead, redirects) reported staff put out-of-district feedback "in
  the discard pile" (not verified).
- House forms are ZIP-gated (Jeffries, Correa: "Zip Code" field present, observed today); the gate
  itself enforces constituent-only email. Senate forms take state/ZIP but are not hard-gated.
- No reporting found on whether member offices count constituent email differently for an internal
  caucus/leadership vote than for a floor vote. One advocacy group claimed >5,000 constituent emails
  to Democrats urging replacement of Jeffries and Schumer (search summary, 2025-11; unverified,
  self-reported). Treat as unknown; the Nov/Dec 2026 leadership votes are secret ballots, so no
  office has a public position to defend, which if anything favours mail that creates a record over
  a tally mark.

## B. Placement

Evidence on chaining a second ask after the first:
- **Lee & Hsieh, CHI 2013** (https://bibtex.github.io/CHI-2013-LeeH.html; n=759 MTurk): signing an
  online petition made people significantly more likely to donate to a *related* cause (consistency;
  ~1.92× per this repo's prior read), non-signers gave more to an *unrelated* charity (moral
  balancing); signing raised intent to sign more petitions but **not** intent for higher-cost acts
  (protests).
- **Kristofferson, White & Peloza, JCR 2014** (ideas.repec.org/a/oup/jconrs/doi10.1086-674137.html):
  *private* token support increases later meaningful support; *public* token support decreases it.
  Our funnel is private (nothing stored, no badge), which is the condition under which the second
  act helps.
- **Moral licensing meta-analysis** (Blanken et al., 91 studies, d = 0.31, published > unpublished
  effects;
  https://researchgate.net/profile/Marcel-Zeelenberg/publication/272837497_A_Meta-Analytic_Review_of_Moral_Licensing/...):
  licensing is real but small and driven by public acts.
- Foot-in-the-door effects are "unreliable" when the first act is impression-managed (Moussaoui et
  al. 2022, cited in `civic-action-levers/behavioral-science-and-virality.md` §13; not re-read).
- No tool (5 Calls, Resistbot, Indivisible, Action Network) publishes a call→email or email→call
  conversion figure. Resistbot's own data shows people choose the easier channel when offered: it
  moved from fax to electronic delivery when offices disconnected fax machines, and now reports 56.9
  M letters (resist.bot, read today) against 5 Calls' >7 M calls (prior research), i.e. the written
  channel attracts roughly an order of magnitude more completions when it is the primary offer.

Reading for our four options:
- **(a) email before the call as warm-up: reject.** Lee & Hsieh: a low-cost act does not raise
  intent for a higher-cost one; Resistbot's volume shows the easy channel substitutes. Offering
  email first cannibalises the call, which is the only channel that produces visible pressure (A.4).
- **(b) right after the receipt, "also send it in writing": acceptable as a secondary line.**
  Private + related → consistency predicts uptake without licensing cost. But CMF's "quality over
  quantity" and the form-mail share (≥66 %) mean a second identical message from the same person
  adds one more tally mark, not a second persuadable signal; so it earns a muted button, not a card.
- **(c) fallback when the call fails or cannot happen: adopt as the primary rule.** This is where
  email strictly adds impact: a call to a full voicemail is unlogged (A.2), an email always lands.
  It also serves users who cannot call (hearing, speech, anxiety, after 6 pm ET when both offices
  are closed).
- **(d) none, push to the second goal: reject.** The second goal is also a call; a user who could
  not call once gets nothing.

**Decision rule for the receipt step:** `office_response ∈ {no_answer, voicemail_full, closed}` or
local time outside office hours or user taps "I can't call" → show **Email instead** as the primary
action, pre-filled with the same script as a letter. `office_response ∈ {answered, left_voicemail}`
→ show **Put it in writing** as a secondary text link under the receipt. Never show either before
the call buttons. Count the email as its own receipt kind so the "one of N" echo does not inflate
call counts.

## C. Pipeline options

| # | Option | Coverage of 535 | Monthly maintenance | Privacy exposure | $0 fit | Verdict |
|---|---|---|---|---|---|---|
| 1 | Deep link to member's own form + "Copy your letter" + chamber field hint | 100 % of Senate (86 forms + 14 homepages), House via `<site>/contact` (ZIP-gated; 2 forms in dataset) | Roster import already refreshes `contact_form_url`; spot-check 404s weekly (~0.5 h) | None server-side; user types address into the .gov form | Yes | **Adopt** |
| 2 | Same, with the per-member field list from `unitedstates/contact-congress` YAML to say "this form asks for: prefix, name, address, ZIP, email, topic, message" | 792 member YAMLs (incl. former); current-member coverage not counted | Pull YAML at import time; repo had 100+ commits since 2025-11-01, last 2026-10-22, 2 open PRs | None | Yes | **Adopt later** if the hint matters in testing; data only, no automation |
| 3 | `mailto:` to district-office staff addresses | ~0 %: members publish no staff emails; patterns are guessable but unverified and not routed as constituent mail | High (bounce churn) | Low, but mail from unknown senders is spam-filtered and not logged | Yes | **Reject** (coverage, ethics) |
| 4 | House CWC + Senate SCWC vendor status | House member offices only (CWC agreement §3(a): "does not provide an opportunity to communicate with committee, leadership, or support offices"; personal offices of Jeffries/Schumer are member offices); Senate via SOAPBox | XML integration, sandbox tests, 72-h reply duty, 2-h emergency reply, duplicate-rate enforcement; vendor identity (legal name, EIN/DUNS optional, FARA attestation) | Name, address, email, phone of every sender must be accurate (§A.12) and transit our Worker; CAO can ask delivery status per message → we would need message IDs | Fee: none (agreement §3(d)) but needs an entity and an on-call maintainer | **Defer**; revisit if a fiscal sponsor exists |
| 5 | Partner vendor (Action Network letters, Quorum/Capitol Canary, VoterVoice, Resistbot) | Action Network routes by address to all federal targets; mechanism for Congress not verified (help article 403 today); VoterVoice from $5,000/yr (Capterra); Quorum quote-only | Low for us | High: sender name, email, address go to the vendor's database and the org's list ("you agree to receive periodic messages") | Action Network basic tier is free; others are not | **Reject** for this site's no-list, nothing-stored promise |
| 6 | Server-side form automation (headless browser, ZIP-gated forms) | In principle 100 % | High: forms change (contact-congress needs ~10 commits/month), CAPTCHA breaks | Address, name, email transit the Worker; hCaptcha (Correa), Cloudflare Turnstile (Jeffries), reCAPTCHA (Schumer) observed today; House privacy policy: hCaptcha exists "to prevent automated submissions" | Yes technically | **Reject**: ToS/CAPTCHA circumvention, CFAA exposure after Van Buren (2021) is narrower but ToS-breach civil claims remain (not researched further), and CWC exists as the sanctioned path |
| 7 | Senate homepage-only senators (14) | 14 of 100 | Covered by roster import | None | Yes | Part of option 1: link homepage, hint "Contact → Email" |

Facts behind the table:
- **B.1 No public email addresses.** House: `<member>.house.gov/contact`, ZIP gate observed on
  Jeffries and Correa today. Senate: 86 of 100 have a form in `senators_cfm.xml`; 14 list only a
  homepage (`roster-and-district-offices.md`, 2026-11-05). `congress-legislators` carries
  `contact_form` for 88 of 539 (86 senators, 2 reps); the House side has no form URL in the Clerk
  feed.
- **B.2 CWC (House).** Page:
  https://www.house.gov/doing-business-with-the-house/communicating-with-congress-cwc. "Advocacy
  vendors" apply by emailing the CWC Application to CWCVendors@mail.house.gov; CAO Acquisitions
  Management reviews; Web Systems sends technical info. Individuals are told to use Find Your
  Representative; "individual messages are kept separate from advocacy communications." Level of
  Service Standards v1.1 (Dec 2015; PDF at
  https://www.house.gov/sites/default/files/2026-07/CWC%20LOS%20Standards%20Final%20-%20Advocacy%20Vendors%20-%2001-2016.pdf,
  text extracted today): XML standard v1.0, sandbox, 72-hour mutual response, 2-hour emergency
  response, §A.12 message integrity (no duplicates, accurate name/address/phone/email/district, spam
  checks; 5 business days to fix or be suspended). Usage Agreement
  (https://www.house.gov/sites/default/files/uploads/documents/CWC-USAGE-AGREEMENT.pdf, extracted
  today): no fee (§3(d)); member offices only (§3(a)); vendor ID on every message, campaign ID per
  campaign (§6); background certification incl. SAM exclusions and FARA (§4); access "may be denied
  or withdrawn at will" (§5(a)). No turnaround time for approval is published.
- **B.2 SCWC (Senate).** https://www.senate.gov/senators/scwc.htm: for "third-party advocacy
  organization or vendor (Delivery Agent)" email on behalf of citizens, via the SOAPBox API;
  application at https://soapbox.senate.gov/registration (fields read today: company legal name, web
  address, principal officers, EIN/DUNS/CAGE optional, states authorised, technical contacts,
  House-CWC status, FARA and SAM questions; changes within 2 business days to
  SAACWC@saa.senate.gov). No fee listed. Sen. King's office page encourages delivery agents to use
  the API and says a confirmation email is the only sign a manual form submission matched
  (https://www.king.senate.gov/political-advocacy-groups, search summary).
- **B.3 contact-congress / Democracy.io / Resistbot.** `unitedstates/contact-congress`: pushed
  2026-10-22, 659 stars, 792 member YAMLs, 100+ commits since 2025-11-01, 2 open PRs (GitHub API
  today). EFF's `phantom-of-the-capitol` (the form-filling server) last commit 2018-09-06.
  democracy.io returns 200 today as a JS app; `sinak/democracy.io` pushed 2026-05-20 (Sina Khanifar,
  Taskforce.is); maintainer statement on the page not retrievable (not verified). Resistbot
  (resist.bot, read today): "by email, fax or postal mail", 56,859,957 letters, 10.16 M users, free
  over SMS, physical delivery listed under paid Premium; its 2019 engineering post listed queues
  `web_form`, `cwc`, `email`, `fax`, `mail` and assumed "one US Representative reachable by CWC"
  (search summary); current channel mix not published.
- **B.4 Automation exposure.** CAPTCHAs observed today on three of three member sites checked. House
  privacy policy (https://www.house.gov/privacy-policy, read today) names hCaptcha "to prevent
  automated submissions, spam, and abuse of website forms." Our constraint makes the trade-off
  one-sided: the only reason to run a server-side submitter is to spare the user a form, and the
  price is the user's address passing through the Worker plus a brittle scraper; the member's form
  costs the user ~60 seconds.
- **B.5 Cost tiers.** VoterVoice entry $5,000/yr per Capterra
  (https://www.capterra.com/p/185592/VoterVoice/); Quorum: quote only; Capitol Canary: none
  published; "Resistbot for orgs": not found (not verified). Action Network letters: free tier
  exists, Congress delivery mechanism not verified today (help article
  https://help.actionnetwork.org/hc/en-us/articles/203112859 returned 403); passes sender name,
  email, address to the target (search summary).

## D. Freshness
- Form URLs: `contact-congress` averages ~9 commits/month over the last year, nearly all
  single-member YAML fixes (field names, success-page markers), i.e. member sites change their forms
  roughly weekly across the 535. URL-level churn is lower: House `/contact` paths and Senate
  `/contact` or `/contact/email` paths were stable for every member checked today; the January
  swearing-in replaces ~10 % of URLs (roster churn in `roster-and-district-offices.md`).
- `congress-legislators` tracks `contact_form` only where the Senate XML provides it (88/539 on
  2026-11-05); House forms are derived, not tracked. Our weekly roster import already refreshes
  both; add a HEAD check that flags non-200 `contact_form_url` rows.
- CMF survey data is a decade old (last staff survey 2016); no newer channel-influence survey
  exists. Re-check CMF and POPVOX Foundation for an AI-mail study before any PRD claims a number
  about AI-written messages.

## Open unknowns
1. Verbatim text of the WaPo 2025-02-11 Meeker quote and the CMF 2017 figures for calls (84 %) and
   form email (56 %); the primary pages were paywalled/404 today. A human read of the WaPo article
   and the CMF PDF closes both.
2. Whether any office treats constituent mail differently for the secret-ballot caucus leadership
   votes (Nov/Dec 2026) than for floor votes; no reporting found.
3. Action Network's actual delivery path to Congress (CWC vs form-fill vs email) and whether the
   free tier includes federal letter campaigns.
4. The CAO's approval turnaround and whether a volunteer-run unincorporated site can be an "advocacy
   vendor" at all; the forms ask for a legal name and optional EIN, which suggests an entity is
   expected but not required.
5. Current-member coverage of `contact-congress` (792 files include former members); count against
   `members.csv` before adopting option 2.
6. Any measured call→email or email→call completion rates; none published by 5 Calls, Resistbot,
   Indivisible or Action Network.
