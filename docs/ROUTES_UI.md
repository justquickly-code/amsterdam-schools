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
  - highlight schools missing a planned open day

- /schools/[id] (School detail)
  - school info + website link
  - open days list (with warning + last synced)
  - planned toggle per open day
  - visit notes + 1–5 star rating
  - add/remove from Top 12

- /planner (Open Days)
  - chronological list
  - filters: event type, date range, shortlist-only
  - planned status toggle

- /shortlist (Top 12)
  - add/remove
  - strict cap: 12
  - drag/drop ranking 1–12
  - export/print view

- /settings
  - workspace name
  - home location: postcode + house number
  - advies: single or combined + match mode either/both
  - workspace members (invite/add)

## UI states (every page)
- Loading
- Empty state (what to do next)
- Error state (what happened + retry)

## Routing note
- /planner is the canonical route.
- /open-days should redirect to /planner to preserve old links.
- User-facing wording should say “Open Days” (avoid “planner”).
