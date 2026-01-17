# Routes & UI

## Pages (MVP)
- / (Dashboard)
  - upcoming open days (next 30 days)
  - reminders to add notes after attended visits
  - quick link to Top 12

- /schools (Schools list)
  - default filtered by advies
  - search + basic filters
  - shows bike time/distance when home location is set

- /schools/[id] (School detail)
  - school info + website link
  - open days list (with warning + last synced)
  - visit notes + 1–5 star rating
  - add/remove from Top 12

- /open-days (Open Days)
  - chronological list
  - filters: event type, date range, shortlist-only
  - (next) planned status + “export planned as ICS”

- /shortlist (Top 12)
  - add/remove
  - strict cap: 12
  - drag/drop ranking 1–12
  - export/print view

- /settings
  - workspace name
  - home location: postcode + house number
  - advies: single or combined + match mode either/both
  - workspace members (invite later)

## UI states (every page)
- Loading
- Empty state (what to do next)
- Error state (what happened + retry)

## Routing note
- /open-days is canonical until Phase 1.1 is complete.
- /planner is planned for Phase 1.1; once live, /open-days should redirect to /planner.
- User-facing wording should say “Open Days” (avoid “planner”).
