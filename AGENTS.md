# Codex Agent Instructions — Amsterdam Schools

## Goal
Provide a reliable, step-by-step workflow for Codex sessions and keep this repo’s specs and implementation aligned.

## Quick Start (for a new Codex session)
1) Read the sources of truth in `docs/`:
   - `docs/00_PROJECT_BRIEF.md`
   - `docs/PRD.md`
   - `docs/PRD-status.md`
   - `docs/ACCEPTANCE_CRITERIA.md`
   - `docs/RELEASE_PLAN.md`
   - `docs/CHANGELOG.md`
   - `docs/CHANGELOG_AUDIT.md`
   - `docs/DOMAIN_MODEL.md`
   - `docs/ROUTES_UI.md`
   - `docs/DESIGN.md`
   - `docs/SECURITY.md`
   - `docs/DEPLOYMENT.md`
   - `docs/OPERATIONS.md`
   - `docs/DATA_SOURCES.md`
2) Find the next incomplete step in `docs/RELEASE_PLAN.md` and work on it **alone**.
3) Before code changes, restate the exact “Done when” checks from the plan.
4) After changes, summarize what changed, run lint/build, and list manual checks.
5) At the end of each session, update `AGENTS.md` with the latest Current State Summary and Open Items.

## Recommended Session Start Prompt (copy/paste)
Read `AGENTS.md` and `docs/00_PROJECT_BRIEF.md`, then confirm the next step from `docs/RELEASE_PLAN.md` and proceed only with that step.

## Context Hygiene
- Start a fresh Codex session after each milestone.
- Paste the session start prompt + any new decisions instead of relying on long chat history.

## Project Structure
- `web/` — Next.js App Router frontend
- `web/src/app/` — pages and API routes
- `web/src/components/` — shared UI
- `web/src/lib/` — utilities
- `supabase/migrations/` — SQL migrations
- `docs/` — product + ops specs

## Required Commands (from repo root)
- `pnpm -C web lint`
- `pnpm -C web build`

Note: `next build` may fail in constrained environments due to Turbopack port binding. If so, report it and continue.

## Current State Summary
- Core MVP complete; Airbnb-style design refresh merged into `main`.
- Explore is public at `/` (hero + schools list); login required for save/plan actions.
- Explore shows a single continuous list with combined search + sort controls.
- Explore includes a map view aligned to list filters (home + school pins).
- Combined advice (e.g., HAVO/VWO) requires schools that offer both levels.
- Advice pill shows when filters are applied; hearts add to My List.
- Fit % badge appears on school cards when category ratings exist.
- Dashboard content now lives in `/profile` (Profile hub layout).
- Open days list is public; planner actions are login‑gated.
- Open Days has a “Today” panel with directions for planned visits.
- My List is a single list with ranked subset controls (cap by advice) and consistent row cards.
- Setup wizard restyle aligned to shared input/button styles.
- Open days now show upcoming dates only (labeled as remaining).
- Admin hub exists; admin routes require allowlist + token.
- SEO basics in place (metadata, Open Graph, robots, sitemap).
- Vercel Analytics enabled.
- Hero headers are unified across main pages (same background image + height + title placement).
- Top desktop menu uses floating pill navigation and a white wordmark pill on hero headers.
- School address links open Google Maps locations (non-directional).
- DUO “School facts” section added to school detail (collapsible) with attribution and empty states.
- DUO schema additions + import script exist (schools identifiers + school_metrics).

## Design Refresh Branch
- Redesign merged into `main` (no active redesign branch).
- Design reference kit: `docs/ui-kit/incoming/ux-design-feedback`
- Design plan + decisions are in `docs/DESIGN.md` (Design Refresh Plan section).

## Open Items
- Confirm desktop top‑right menu and mobile bottom‑nav parity.
- Known issue: language selection may revert to Dutch after magic-link login.
- UI consistency audit pending review (hero headers + typography; see docs/UI_CONSISTENCY_AUDIT.md).
- DUO school data enrichment proposal pending review (see docs/SCHOOL_DATA_ENRICHMENT_PROPOSAL.md).
- DUO import is paused (matching 8/82); revisit improved matching or manual overrides.

## Suggested Session Prompt (Redesign Work)
“Switch to `design/airbnb-refresh`. Read `docs/DESIGN.md` (Design Refresh Plan). Implement Phase 1 only (theme + shared components), no functional changes.”

## UX Decisions to Keep
- Bottom nav is **mobile only**; desktop uses top‑right menu.
- Profile is default landing after login (Dashboard content lives there).
- Setup gating until child name + address + advies are set
- Planner route is `/planner` (with `/open-days` redirect)
- Shortlist is one list with ranked subset
- Open days are best-effort with verify message

## Security & Admin Rules
- Admin APIs require `x-admin-token` + session + allowlisted email.
- Admin allowlist env var: `ADMIN_ALLOWLIST_EMAILS`.
- Server-only secrets: `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_SYNC_TOKEN`, `MAPBOX_ACCESS_TOKEN`.

## Migrations Required
- `supabase/migrations/20260117123000_commute_cache_rls_member.sql` (RLS for commute cache)
- `supabase/migrations/20260117140000_add_workspace_child_name.sql` (child_name field)
- `supabase/migrations/20260124190000_add_school_image_url.sql` (schools.image_url)
- `supabase/migrations/20260124220000_public_read_schools.sql` (anon read for schools)
- `supabase/migrations/20260201090000_add_duo_school_metrics.sql` (DUO identifiers + school_metrics)

Apply locally with:
```
supabase db push --local
```

## Coding Rules
- Minimal, incremental changes; avoid refactors unless requested in plan.
- Keep docs in sync (CHANGELOG + related specs).
- Update `docs/CHANGELOG_AUDIT.md` if a CL item changes status.
- Use TypeScript and App Router conventions.

## Manual Checks to Mention
- Setup wizard completes and redirects to `/profile`.
- Bottom nav only on mobile; desktop shows top‑right menu.
- Explore `/` works logged out; save/plan actions redirect to login.
- Open days list loads logged out; planner actions gated.
- Admin routes blocked for non‑allowlisted users.
