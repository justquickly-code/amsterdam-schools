# Operations

## Admin endpoints (token gated)
All admin routes require `ADMIN_SYNC_TOKEN` via header `x-admin-token` and a valid user session.
Server must also check the session user against an admin allowlist via `ADMIN_ALLOWLIST_EMAILS`.
These routes use SUPABASE_SERVICE_ROLE_KEY and must remain server-only.

### Sync Schools
- Endpoint: POST /api/admin/sync-schools
- Purpose: fetch Schoolwijzer VO locations and upsert into `schools`
- Writes:
  - schools (source=schoolwijzer, source_id, name, address, supported_levels, website_url, lat/lng, last_synced_at)
  - data_sync_runs (source=schoolwijzer_schools)

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

### Feedback (admin)
- Endpoint: GET/PATCH /api/admin/feedback
- Purpose: list user feedback and respond as admin.
- Requires allowlisted admin session (Authorization header).

### On-demand Commute Compute (user-safe)
- Endpoint: POST /api/commutes/compute
- Purpose: compute a limited batch of missing commutes for the signed-in user.
- Requires Authorization header (session JWT) and `workspace_id` + `school_ids`.
- Uses RLS-safe writes to `commute_cache` and Mapbox server token.
