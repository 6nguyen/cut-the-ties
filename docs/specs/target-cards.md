# Target cards

## Purpose
Renders each person a visitor should call as one card in the style
guide's spec 06 ("target chips"), on `/results` and the goal page's
"Who to call" island, so a name, role, phone and position read at a
glance and the call button is a thumb-sized square. It stops at
presentation: who the targets are and what each line says come from
`action-router.md` (targets, positions, prior votes, elects) and
`district-counters.md` (the counter line).

## Behavior
1. **Card.** `web/src/components/Target.tsx` `Target`: a paper `<li>`
   with a 2 px ink border and the small shadow (`data-target`). Header
   row: for a sitting member with a portrait file, a 48 px portrait
   (`Avatar`, `data-portrait`: `/portraits/<bioguide_id>.webp`, `alt=""`,
   lazy, low fetch priority, a 48×48 box showing the top of the file)
   with a 2 px party-coloured border (D cobalt, R crimson, others hazard)
   and the party letter as a 16 px corner tag in the same colour. The
   party letter on the party colour is the layer under it; the image and
   the tag appear only once the image has loaded, so a blocked or failed
   image leaves the letter, never a broken-image icon. A member-elect, a
   treasurer and a member listed in
   `web/src/assets/portraits/missing.json` keep the 40 px party badge
   (D/R/I in Bebas Neue, the same colours, ink border) with no `<img>`.
   Then the
   name in Bebas Neue uppercase (`text-2xl`), under it a Space Mono role
   line (`data-role-line`) "Representative · CA-46", "Senator · CA",
   "Representative · AK at large", "Treasurer · MD", or the role alone
   when the card has no state, then the prior-vote ticker line; at the
   right a 44 px acid call square (phone glyph, `aria-label="Call
   <name>"`, `title="Call <phone>"`, `href="tel:…"`). Below, in this
   order and only when present: the elect line, the district office
   line, the position chip with its source link, the holdings line, the
   visit line, the record line.
2. **Member-elect.** No phone, so the square is hazard with an arrow
   glyph, `aria-label="Contact <name>"`, linking `contact_url`; the role
   line reads "Representative-elect"/"Senator-elect".
3. **Stack.** `TargetStack({label, targets, partner, children})`: a
   `label-code` line ("Who to call (n)" on `/results`; "Who to call in
   <where> (n) · your two actions" on the goal page), the cards 12 px
   apart, then `children` (the `Counts` line, itself a bordered
   newsprint strip). No enclosing box; the stack sits directly in the
   result card body or the goal sidebar.

## Data & contracts
- `TargetCard` (`worker/src/route.ts`): `state` and `district` (null for
  a senator or treasurer) build the role line; `party`, `role`, `name`,
  `phone`, `position`, `prior_vote`, `elect`, `office`, `holdings` and
  `bioguide_id` feed the other lines (`action-router.md` Data &
  contracts).
- Tokens: `shadow-brutal-sm`, `border-ink`, `bg-acid`, `bg-hazard`
  (`web/src/styles/global.css`); tests in
  `web/src/components/Target.test.ts` and `Results.test.tsx`.

## Invariants (regression checklist)
- [ ] Every target renders as its own bordered, shadowed card; no
      target shares a box with another.
- [ ] The role line comes from `state`/`district`, never parsed from
      the name; a senator shows "Senator · <ST>", an at-large member
      "<ST> at large".
- [ ] The call square carries `tel:` and "Call <name>"; an elect without
      a phone gets the hazard "Contact <name>" square, never the
      switchboard.
- [ ] Line order is header, elect, district, position, holdings, visit,
      record; absent data drops its line without a gap.
- [ ] The stack is label, cards, counter line; the counter line is the
      same component as `district-counters.md` describes.

## Performance budget
Part of the landing/results budget (≤100 KB transferred): the glyphs
are two inline SVGs, no icon font or image.
