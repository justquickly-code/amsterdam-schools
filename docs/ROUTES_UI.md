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
  - visit notes (per member) + shared 1–5 star rating
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

- /shortlist/print (Print export)
  - printable Top 12

- /feedback
  - submit feedback (bug/idea/question/other)
  - list your feedback + admin responses

- /settings
  - workspace name
  - home location: postcode + house number
  - advies: single or combined + match mode either/both
  - workspace members (invite/add)

- /admin (Admin hub, allowlisted only)
  - entry point to admin sync tools
  - requires admin allowlist + admin token guard

- /admin/feedback (Admin)
  - review feedback
  - respond + set status

## UI states (every page)
- Loading
- Empty state (what to do next)
- Error state (what happened + retry)

## Global UI
- Bottom nav (Dashboard, Schools, Open Days, Shortlist).
- Top-right menu: Settings, Print/Export, Language toggle, Sign out.
- Admin entry appears in top-right menu for allowlisted users.

## Routing note
- /planner is the canonical route.
- /open-days should redirect to /planner to preserve old links.
- User-facing wording should say “Open Days” (avoid “planner”).
