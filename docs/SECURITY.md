# Security

## Server-only secrets
Never expose these to the browser:
- SUPABASE_SERVICE_ROLE_KEY
- ADMIN_SYNC_TOKEN
- MAPBOX_ACCESS_TOKEN

## Token-gated admin routes
Routes under /api/admin/*:
- must require x-admin-token = ADMIN_SYNC_TOKEN
- must also require a valid user session
- must verify the user is an admin via allowlist/is_admin check (ADMIN_ALLOWLIST_EMAILS)
- must run server-side only
- must not be callable from an unauthenticated context

## RLS expectations
- Workspace-scoped data must only be accessible to workspace members.
- Shared reference data (schools, open_days) can be readable to all authenticated users.
- Public Explore requires anon read on `schools` (no PII): policy `public read schools`.
- Writes must be restricted to:
  - workspace owners/members for workspace-owned tables
  - service role only for ingestion tables if desired (schools/open_days)

## Feedback (RLS)
- Users can insert/select only their own feedback.
- Admin responses + status updates are handled server-side with service role + admin allowlist.

## High-risk areas to review before production
- Any code path using SUPABASE_SERVICE_ROLE_KEY must be:
  - server-only
  - protected by token gate
  - scoped to the correct workspace (avoid “first row wins” patterns)
- Any route using MAPBOX_ACCESS_TOKEN (e.g., `/api/maps/route`) must remain server-only.
