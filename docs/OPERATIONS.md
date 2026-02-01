# Operations

## Admin endpoints (token gated)
All admin routes require `ADMIN_SYNC_TOKEN` via header `x-admin-token` and a valid user session.
Server must also check the session user against an admin allowlist via `ADMIN_ALLOWLIST_EMAILS`.
These routes use SUPABASE_SERVICE_ROLE_KEY and must remain server-only.

### Sync Schools
- Endpoint: POST /api/admin/sync-schools
- Purpose: fetch Schoolwijzer VO locations and upsert into `schools`
- Supplement: adds a small manual list of regular VO schools from Keuzegids 2026 if they are missing from Schoolwijzer.
- Writes:
  - schools (source=schoolwijzer, source_id, name, address, supported_levels, website_url, image_url, lat/lng, last_synced_at)
  - data_sync_runs (source=schoolwijzer_schools)
 - Notes: supplemental schools are geocoded via Mapbox when `MAPBOX_ACCESS_TOKEN` is available.
 - Images: school card images are stored in `web/public/branding/school_images_edited` and mapped to `schools.image_url` via `scripts/normalize-school-images.mjs` + `scripts/seed-school-images.mjs`.

### Sync Open Days
- Endpoint: POST /api/admin/sync-open-days
- Sync is non-destructive: rows are never deleted for a school year.
- Each sync run sets last_seen_at=now and is_active=true for events seen in the source.
- Events not seen in a run are set is_active=false and missing_since is set the first time they go missing.
- If an event reappears later, it becomes active again and missing_since is cleared.
- source_id is stable and ignores location formatting changes (prevents “new event” duplicates).
- Public /planner shows active open days only (inactive not user-facing).
- Admin tooling retains the ability to view inactive open days for ops/debug purposes.
- In production, `x-admin-token` is required (fail-closed if missing).

### Compute Commutes (bike)
- Endpoint: POST /api/admin/compute-commutes
- Purpose: geocode home and compute cycling ETA+distance to schools via Mapbox; cache results
- Writes:
  - workspaces.home_lat/home_lng (if missing)
  - commute_cache rows per (workspace, school, mode="bike")
- Requires `workspace_id` in the request body (validated against the session).

IMPORTANT:
- Ensure the route computes commutes for the caller’s workspace (never “first workspace in DB”).

### Map rendering (client)
- Client map uses a public token: `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`.
- Server-only token remains `MAPBOX_ACCESS_TOKEN` for directions/geocoding on API routes.

### Map directions (server)
- Endpoint: POST /api/maps/route
- Purpose: return a cycling route line between home and school for map previews.
- Requires server-side `MAPBOX_ACCESS_TOKEN`.

### Feedback (admin)
- Endpoint: GET/PATCH /api/admin/feedback
- Purpose: list user feedback and respond as admin.
- Requires allowlisted admin session (Authorization header).

### On-demand Commute Compute (user-safe)
- Endpoint: POST /api/commutes/compute
- Purpose: compute a limited batch of missing commutes for the signed-in user.
- Requires Authorization header (session JWT) and `workspace_id` + `school_ids`.
- Uses RLS-safe writes to `commute_cache` and Mapbox server token.

## DUO School metrics import (one-time)
Script: `scripts/import_duo_school_data.py`

Requires:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Usage:
```
python3 scripts/import_duo_school_data.py /path/to/amsterdam_vo_schools_seed.xlsx
```

Optional env vars:
- `DUO_IMPORT_DRY_RUN=1` (no writes, logs matches)
- `DUO_MATCH_NAME_ONLY=1` (allow name-only matches when unique)

Notes:
- Updates `schools` with DUO identifiers + contact/address fields (only when missing).
- Replaces existing `school_metrics` rows for matched schools.
- Use service role; do not expose in the browser.

## Supabase email templates (production)

Update templates in **Supabase → Authentication → Email Templates**.

**Magic Link**
- Subject: **Log in bij Mijn Schoolkeuze / Sign in to Mijn Schoolkeuze**
- Body: single template, NL-first with a short English helper line.

**Invite User**
- Subject: **Uitnodiging voor Mijn Schoolkeuze / Invitation to Mijn Schoolkeuze**
- Body: single template, NL-first with a short English helper line.

Full HTML templates: `docs/EMAIL_TEMPLATES.md`
