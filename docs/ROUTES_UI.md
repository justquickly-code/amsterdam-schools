# Routes & UI

## Pages (MVP)
- / (Dashboard)
  - upcoming open days (next 30 days)
  - reminders to add notes after attended visits
  - quick link to ranked list

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
  - add/remove from ranked list

- /planner (Open Days)
  - chronological list
  - filters: event type, date range, shortlist-only
  - planned status toggle

- /shortlist (Ranked list)
  - add/remove
  - rankable cap depends on advice (4/6/12)
  - drag/drop ranking 1–N (N = cap)
  - export/print view

- /shortlist/print (Print export)
  - printable ranked list

- /feedback
  - submit feedback (bug/idea/question/other)
  - list your feedback + admin responses

- /how-it-works
  - kid-friendly tutorial with key dates from Keuzegids (mainstream lottery path)
  - clarify: this is the Amsterdam Year‑8 → Secondary 2026 process (not app UI training)

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
- Top-right menu: Settings, Print/Export, Language toggle, Sign out, How it works.
- Admin entry appears in top-right menu for allowlisted users.

## Setup flow (first login)
- Step 1: Profile details (mandatory). Explain why (advies filtering + commute times).
- Step 2: Invite family (optional). Explain shared workspace + per‑member notes.
- Step 3: How it works tutorial (optional). Emphasize it’s the Amsterdam 2025/26 process.
- Invited users (new accounts) can start tutorial or skip to Dashboard.

## Routing note
- /planner is the canonical route.
- /open-days should redirect to /planner to preserve old links.
- User-facing wording should say “Open Days” (avoid “planner”).
