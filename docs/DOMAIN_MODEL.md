# Domain Model

## Core entities
- User
- Workspace
  - child_name (optional, MVP: one child per workspace)
  - language (nl default; en optional)
- WorkspaceMember (role: owner/editor/viewer)

## Auth model (MVP)
- Parent email login (Supabase). One family account used across devices.
- No child accounts in MVP.
- (Optional later) Visits/notes may include a simple author label: Kid | Parent.

- School
  - name
  - address
  - supported_levels (internal enum list)
  - website_url
  - lat/lng (if available)

- OpenDayEvent
  - school_id
  - starts_at / ends_at (or date + time)
  - source (e.g., "schoolkeuze020")
  - source_url
  - last_synced_at
  - status: active | updated | removed_from_source (optional)

- Visit (workspace-specific)
  - school_id
  - attended: boolean
  - rating_stars: 1–5

- VisitNote (per member)
  - school_id
  - user_id
  - notes

- SavedSchool (workspace-specific)
  - school_id
  - saved_at

- Top12Item (workspace-specific ranked subset)
  - school_id
  - rank: 1–12 (max 12)

- PlannedOpenDay (workspace-specific join)
  - open_day_id
  - planned_at
  - attended_at (optional)

- CommuteCache
  - workspace_id + school_id
  - mode = bike
  - duration_minutes
  - distance_km
  - computed_at
  - provider (e.g., mapbox)

- AdviesProfile (workspace-specific)
  - advies_levels: array (e.g., ["havo"] or ["havo","vwo"])
  - match_mode: either | both

## Non-negotiables
- Top 12 hard cap: 12 (subset of saved schools)
- One rating per school (1–5 stars)
- Advies can be combined (two levels)
- Open days must show “verify on school website” + “last synced”
