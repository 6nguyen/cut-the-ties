# Email step

## Purpose
Gives a constituent who cannot or will not call a written channel to the
same office from the act page, with the exact text they already have:
the subject the action names and the body as shown, no second model
call. It opens from the call row and posts the same receipt with
`channel: 'email'`, so the funnel after it is the letter funnel. Split
out of `personalised-documents.md` (§4) on 2026-11-14 when that spec
passed the size cap; the text is unchanged.

## Behavior
1. **Card (`email-button`).** "I can't call right now", the
   closed-offices button, "Email it instead" and "Put it in writing" all
   open, in place of the call row, a card "Send it in writing" with the
   subject (the action's `email_subject`, `{city}` filled from the city
   field), the message (`Dear <Role> <Surname>,` + blank line + the body
   exactly as shown, standard script included + blank line +
   `<first_name>, <city>`; nothing else, no model call), "Copy subject
   and message", the contact link labelled by `contact_kind` ("Open the
   contact form ↗" / "Open the contact form (asks for your ZIP first) ↗" /
   "Open the office website, then Contact ↗"), a field hint by chamber
   (House: name, address, ZIP, topic, message box, plus the ZIP+4
   fallback; Senate: name, address, email, topic, message box; no
   chamber: "Paste the message into the comment box."), "I sent it" and
   "Back to calling". No `contact_form_url` → "This office lists no
   contact form; the DC number is the only channel." and no "I sent it".
   "I sent it" posts the call receipt's body plus `channel: 'email'`; the
   funnel then runs as for a letter. A refused draft, a letter or a
   comment action has no email step.
2. **Where it sits.** The call row, the receipt and the funnel around it
   are `personalised-documents.md` §4; the receipt `channel` and its
   counting are `district-counters.md` §1 and `commitment-funnel.md` §1.
