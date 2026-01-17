# Deployment

## Hosting
- Web app: Vercel
- DB/Auth: Supabase

## Required env vars (Vercel)
Public:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY

Server-only:
- SUPABASE_SERVICE_ROLE_KEY
- ADMIN_SYNC_TOKEN
- MAPBOX_ACCESS_TOKEN

## Supabase migrations
- Apply SQL migrations from supabase/migrations in order.
- Verify RLS policies after applying migrations.

## Scheduled jobs
Use Supabase Cron (seasonal):
- Sync open days: weekly during open-day season
- (Optional) schools sync: monthly/quarterly as needed

## Release checklist (minimum)
- Admin endpoints token-gated and not exposed
- RLS verified for workspace-owned tables
- No secrets committed
- Basic error handling on core screens