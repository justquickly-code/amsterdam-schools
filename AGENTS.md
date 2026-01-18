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
- Phases 0–3 complete.
- Phase 4 added to `docs/RELEASE_PLAN.md`.
- Current work should proceed from Phase 4.

## Open Items (Phase 4)
- 4.3 Planned open days (workspace join + UI)
- 4.4 Workspace member sharing
- 4.5 Language setting (NL default + EN)

## UX Decisions to Keep
- Bottom nav always visible (main screens)
- Dashboard is default landing after login
- Setup gating until child name + address + advies are set
- Planner route is `/planner` (with `/open-days` redirect)
- Shortlist is one list with Top 12 subset
- Open days are best-effort with verify message

## Security & Admin Rules
- Admin APIs require `x-admin-token` + session + allowlisted email.
- Admin allowlist env var: `ADMIN_ALLOWLIST_EMAILS`.
- Server-only secrets: `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_SYNC_TOKEN`, `MAPBOX_ACCESS_TOKEN`.

## Migrations Required
- `supabase/migrations/20260117123000_commute_cache_rls_member.sql` (RLS for commute cache)
- `supabase/migrations/20260117140000_add_workspace_child_name.sql` (child_name field)

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
- Setup wizard completes and redirects to Dashboard.
- Bottom nav visible on main screens, hidden on login/auth/admin/setup/print.
- Top menu shows Settings/Print/Sign out and closes on selection.
- Commutes compute after setup/Settings change and show on Schools.
- Admin routes blocked for non-allowlisted users.
