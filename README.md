# amsterdam-schools

A mobile-first web app to help a family plan Amsterdam secondary-school open days, capture notes + a 1–5 star rating, and produce a ranked Top 12 shortlist.

Read the project brief:
/docs/00_PROJECT_BRIEF.md

## What it does
- Sign in (Supabase Auth)
- Browse Amsterdam secondary schools (Schoolwijzer data)
- Set home address (NL postcode + house number) and show bike commute time/distance (when computed)
- Set advies levels (single or combined) + match mode (Either/Both)
- Save visit notes per school (notes + pros/cons + attended + 1–5 stars)
- Open Days (best-effort from Schoolkeuze020):
  - warning to verify on school website
  - export single event to calendar (.ics)
- Lists:
  - save many schools
  - Top 12 is a strict cap and ranked

## Data sources & trust
- Schools: Schoolwijzer Amsterdam (structured API)
- Open days: Schoolkeuze020 open days list (non-authoritative)
- Always verify open day details on the school website (times can change).

## Environment variables
Required:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY

Server-only (do not expose):
- SUPABASE_SERVICE_ROLE_KEY
- ADMIN_SYNC_TOKEN
- MAPBOX_ACCESS_TOKEN

## Admin tasks (token gated)
- Sync schools: /admin/sync-schools
- Sync open days: /admin/sync-open-days
- Compute commutes: /admin/compute-commutes

## Notes
- Open days are best-effort. The UI must always show “verify” messaging and freshness.
- Commute computation uses Mapbox and is cached per (workspace, school).
- Route note: /planner is canonical; /open-days redirects to /planner.
