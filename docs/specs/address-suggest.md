# Address suggestions

## Purpose
Lets a visitor pick their street address from a short list instead of
typing it in full, without the typed text ever reaching the Worker: the
suggestion request goes from the browser to the configured provider, and
a picked suggestion is resolved to a district on the device
(`on-device-districts.md`). Off by default; the Pages build turns it on
with a provider flag. Split out of `action-router.md` (landing §1) on
2026-11-14 when that spec passed the size cap; the text is unchanged.

## Behavior
1. **Combobox.** When the Pages build sets `PUBLIC_SUGGEST_PROVIDER`
   (`mapbox` or `geoapify`, with `PUBLIC_SUGGEST_TOKEN`), the landing's
   address field (`action-router.md` §1) is a combobox (`role="combobox"`,
   `aria-expanded`, `aria-controls`, `aria-activedescendant`,
   `autocomplete="off"`, a polite live count): three or more typed
   characters followed by 250 ms idle request up to five US street
   addresses, each shown as "street, city, ST ZIP" built from the
   provider's structured fields; the open list shows the provider's
   attribution under it; ArrowDown/ArrowUp move the highlight, Enter or a
   tap picks it (`action-router.md` §3), Escape or blur closes. A new
   keystroke aborts the request in flight; a failure, a 429 or a 2 s
   timeout closes the list with no message. With `none` the plain field
   renders unchanged.
2. **Picking.** A picked suggestion never reaches the Worker: the page
   resolves its point to a district on the device and posts
   `{state, district, by_suggestion: true}` (`action-router.md` §3 and
   §Data & contracts); the unresolved message with a provider configured
   is `action-router.md` §4.

## Data & contracts
- Pages build env: `PUBLIC_SUGGEST_PROVIDER` = `none | mapbox | geoapify`
  (default `none`), `PUBLIC_SUGGEST_TOKEN` = the provider's public,
  URL-restricted token. `web/src/lib/suggest.ts`: `configuredProvider()`
  (read once in `index.astro`, warns and yields `none` on an unknown value
  or a missing token), `shouldSuggest(q)`, `suggestLoop(suggester,
  onResult, timings)` (debounce, abort, timeout, failure → `[]`) and
  `suggest(q, signal): Promise<Suggestion[]>`, `Suggestion = {label, state,
  lon, lat}`. One adapter per provider maps the response, builds the label
  from structured fields (`shortLabel`) and drops results without a house
  number, city, two-letter state, ZIP or point; a non-2xx response (429
  included) rejects, which the loop turns into a closed list:
  - Mapbox: `GET https://api.mapbox.com/search/geocode/v6/forward?q=…&autocomplete=true&country=us&types=address&limit=5&proximity=ip&access_token=…`;
    `state` from `properties.context.region.region_code`, the point from
    `geometry.coordinates`.
  - Geoapify: `GET https://api.geoapify.com/v1/geocode/autocomplete?text=…&filter=countrycode:us&limit=5&apiKey=…`;
    features with `properties.housenumber`, `state` from
    `properties.state_code`, `lon`/`lat` from properties.
  `PROVIDER_NAME` gives the name `/privacy` prints. Mapbox's geocoding
  terms allow responses only "in conjunction with a Mapbox map", which
  this on-device use is not, so the flag flip uses `geoapify`; the Mapbox
  adapter stays behind the flag. Picking calls `resolveInState(state,
  lon, lat)` from `web/src/lib/pip.ts`, then `route({state, district,
  by_suggestion: true})`; `null` → `route({address: label})`.

## Invariants (regression checklist)
- [ ] Suggestion requests never fire for a bare ZIP, text under three
      characters, or when the provider flag is `none`; a failed suggestion
      request never shows an error or blocks a submit
      (`web/src/lib/suggest.test.ts`,
      `web/src/components/AddressForm.test.tsx`).
