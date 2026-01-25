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
- ADMIN_ALLOWLIST_EMAILS

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
- Public read policy for `schools` verified (Explore needs anon read)
- No secrets committed
- Basic error handling on core screens
- Vercel build passes (`pnpm -C web build`)
- Supabase Auth redirect URLs set for production domain
- Admin allowlist configured (`ADMIN_ALLOWLIST_EMAILS`)
- Run admin sync: schools + open days
- Seed school images (image_url) if using local assets
- Mapbox key set (geocoding + commutes)
- Feedback + admin feedback console tested
- Planner shows open days with advice filter applied
