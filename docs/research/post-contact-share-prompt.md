# Post-contact share prompt
Researched: 2026-11-09 · Informs: [share-from-results](../prd/archive/2026-11-share-from-results.md)

Question: how do the best civic-action products prompt a share right after
a call or an email to a legislator, in what order, and what does the
evidence say about prompting at that moment. Complements
[social-sharing.md](social-sharing.md) (platforms, poster, image specs),
which this file does not repeat. Decided in share-from-results on 2026-11-09.

## Products (what → order → networks → image)
| Product | After the act | Order | Networks | Image |
|---|---|---|---|---|
| 5 Calls (web) | per office: `contact / voicemail / skip / unavailable` → "Contacted X! Next up: call Y" → after the last office `/done`: voter-registration CTA, share card, donate tiles | outcome → next office → done → share | Bluesky, Threads, Facebook, Mastodon intents | server-rendered card `api.5calls.org/v1/issue/{id}/share/t` |
| Resistbot (SMS) | letter delivered → `image` returns a shareable picture of the letter; `invite` earns coins; petition signers get a personalised image | deliver → receipt image → campaign/invite | whatever SMS share supports (dark social) | yes, per letter |
| Mobilize.us | RSVP → "bring a friend" via native share sheet → follow-on event | act → share → next act | OS sheet (SMS first) | none |
| Action Network / EveryAction | thank-you page → Facebook, X, email share with admin copy; referrer ids attribute new actions to the sharer | share first | FB, X, email | og:image only |
| ActBlue | donate → recurring upsell → share | money ask → share | FB, X | og:image |
| Change.org | sign → "Take the next step": share → chip in → comment | share first | FB, X, WhatsApp, email, Instagram (mobile), copy link | none |
| Countable | vote → message sent → share reveals *that* you acted, not what you said | act → share | OS sheet | none |
| Strava | activity → stats sticker over a photo → Instagram Stories direct, or copy a transparent PNG | act → image | Instagram Stories | image first, no link |
| charity: water | no immediate share; impact proof by email 18–21 months later | slow receipt | email | none |
| Indivisible / Newmode call tools | thank-you page, email and SMS after the call; no outcome capture or share card | thank-you only | — | none |

Sources: github.com/5calls/5calls (`react/src/components/Outcomes.tsx`,
`Reps.tsx`, `Share.tsx`, `layouts/done/single.html`); resist.bot/guide;
join.mobilize.us/blog/continually-helping-supporters-do-more (14% of signups
from bring-a-friend links; +6% signups from the prompt revamp; +20%
registrations from social-share clicks);
help.actionnetwork.org/hc/en-us/articles/203846135;
community.bonterratech.com/social-sharing-21/understanding-referrer-tracking-and-social-share-buttons-598;
support.actblue.com/?p=607; help.change.org/en_US/sharing-a-petition;
en.wikipedia.org/wiki/Countable_(company);
support.charitywater.org/hc/en-us/articles/203674369;
support.newmode.net/support/use-the-calling-tool-for-maximum-impact.

## Evidence
- A public token act lowers later follow-through; a private act raises it
  (Kristofferson, White & Peloza, JCR 2014, core.ac.uk/download/214236115.pdf).
- A social "I voted" message showing friends who acted: +60k direct and
  +280k contagion votes, RCT n=61M (Bond et al., Nature 2012,
  pmc.ncbi.nlm.nih.gov/articles/PMC3834737). Peers-acted copy beats a
  badge about the self.
- High-arousal states raise sharing (Berger 2011; Berger & Milkman 2012),
  which favours prompting at completion. No RCT compares an immediate with
  a delayed prompt; the evidence for "right after" is practitioner
  consensus plus the arousal work.
- Bare links on X get ≈0 % engagement for non-Premium accounts since March
  2025 (Buffer, 18.8M posts, buffer.com/resources/links-on-x); images and
  text keep reach.
- JustGiving 2023 (vendor data): a post-donation share click is worth £47
  and 1.5 further donations.
- The question-behaviour effect is small (d≈0.09–0.24,
  eprints.whiterose.ac.uk/90698): asking "how did it go?" first is not
  itself a share lever, so an outcome step earns its place only when the
  answer is used.
- Share card versus plain link in WhatsApp or iMessage: no independent
  study, vendor claims only.

## Implications, strongest evidence first
1. Never make the public share the first or only step: private act, then
   the next hard ask, then the share (Kristofferson 2014).
2. Share copy shows that peers acted ("212 in IL-06 today"), not a badge
   about the self (Bond 2012).
3. On X and Bluesky share an image with the URL in the text, never a bare
   link (Buffer 2025).
4. Prompt at completion: act → next office → share (5 Calls; Berger;
   Mobilize +6 %/+20 %).
5. Native share sheet gated on `canShare({files})`, intent links as the
   fallback; SMS and WhatsApp are the main channels (Mobilize; caniuse).
6. Share that you acted, not what you said (Countable): no name, city,
   number or office response on the poster.
7. Outcome buttons feed a whip count only when the answer changes a number
   the product shows; otherwise they are a step before the share with a
   small effect (question-behaviour literature). The owner chose no outcome
   step: the tap on the call or write control is the receipt.
