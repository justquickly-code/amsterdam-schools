# Map View + Directions Plan

## Scope (approved)
- **Explore map** lives at the top of the Explore screen (no separate route).
- **Filters**: map uses the same filtered list as Explore (advies + search).
- **Logged out**: show all schools; once postcode + advice selected, show **home pin** and filter by advice.
- **Logged in**: show home pin when postcode + house number exist; list filtered by advice.
- **Pins**:
  - Schools: `web/public/branding/mijnschoolkeuze-ui-exports/pins/pin-default-48.png`
  - Selected: `.../pin-selected-48.png`
  - Home: `.../pin-saved-48.png`
- **Mobile**: map is collapsed by default with a “Show map” toggle.
- **Desktop**: map is visible by default.
- **School detail**: show cycling route from home to school (Mapbox Directions) + “Open in Google Maps”.
- **Open Days**: add “Today” section with planned visits and a “Take me there” button (current location → school).
- **Addresses**: make school addresses clickable to Google Maps (destination only).

---

## Phase 1 — Explore Map (top of list)
**Goal:** map and list are fully aligned.

**Work**
- Add map panel above school cards.
- Use same filtered list as Explore list.
- Pins clickable → mini card + “View school” link.
- Fit bounds to filtered schools + home pin.
- Show home pin only when we have postcode + advice (logged out) or home address (logged in).

**Done when**
- Map results match list results.
- Home pin appears at the right times.
- Pins navigate to detail.

---

## Phase 2 — School Detail Cycling Route
**Goal:** show home → school cycling route and external directions.

**Work**
- Add “Cycling route” section in school detail.
- If home + school coords exist, draw route line (Mapbox Directions, cycling).
- If missing, show a prompt to set home address.
- Add “Open in Google Maps” link (cycling).

**Done when**
- Route section renders for valid coords.
- Google Maps link opens cycling directions.

---

## Phase 3 — Open Days “Today”
**Goal:** help parents get directions on the day.

**Work**
- Add “Today” panel at top of Open Days for planned events happening today.
- Each item shows time + school + “Take me there”.
- Button opens Google Maps cycling route from current location.

**Done when**
- “Today” section appears only if there are planned visits today.
- “Take me there” opens Google Maps with cycling mode.
