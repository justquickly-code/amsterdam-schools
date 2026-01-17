# Operations

## Admin endpoints (token gated)
All admin routes require `ADMIN_SYNC_TOKEN` via header `x-admin-token`.
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

### Compute Commutes (bike)
- Endpoint: POST /api/admin/compute-commutes
- Purpose: geocode home and compute cycling ETA+distance to schools via Mapbox; cache results
- Writes:
  - workspaces.home_lat/home_lng (if missing)
  - commute_cache rows per (workspace, school, mode="bike")

IMPORTANT (must fix):
- Ensure the route computes commutes for the caller’s workspace (not “first workspace in DB”).