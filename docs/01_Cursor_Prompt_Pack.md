Cursor Prompt Pack — Amsterdam Schools

How to use this pack

[Instruction] Copy one prompt at a time into Cursor’s chat.
[Instruction] Keep each change “PR-sized” (small, reviewable).
[Instruction] After Cursor proposes changes, require it to:
	•	list files it will touch
	•	state assumptions
	•	align to docs/PRD.md + docs/ACCEPTANCE_CRITERIA.md

⸻

A) Repo audit + documentation alignment

A1 — Repo audit + write architecture doc

Prompt

Inspect this repository and summarize the current stack and structure. Create/Update docs/ARCHITECTURE.md with: framework, language, package manager, folder layout, environment variables, and how to run locally. Keep it concise. Do not change product scope.

A2 — Validate docs consistency (PRD vs acceptance vs domain)

Prompt

Read docs/PRD.md, docs/DOMAIN_MODEL.md, docs/DATA_SOURCES.md, and docs/ACCEPTANCE_CRITERIA.md. Identify inconsistencies or missing decisions. Propose minimal edits to make them consistent. Apply the edits in the same PR.

A3 — Add a “definition of done” checklist

Prompt

Add docs/DEV_CHECKLIST.md with a short checklist for PRs: validation, loading/empty/error states, tests or test plan, no secrets committed, docs updated when scope changes.

⸻

B) Foundation: dev environment + quality gates

B1 — One-command local dev

Prompt

Ensure a clean clone can run with one command. Add/adjust scripts so pnpm dev (or the existing package manager) works. Add .env.example listing all required env vars with comments. Update README.md to include only the essential setup and commands.

B2 — Add CI (GitHub Actions)

Prompt

Add a GitHub Actions workflow that runs on PR: install, lint, typecheck, and tests. Keep it minimal and fast. If no tests exist yet, add a placeholder test step and a note in docs/DEV_CHECKLIST.md.

B3 — Add basic lint/format rules

Prompt

Add ESLint config and formatting conventions consistent with Next.js + TypeScript. Keep configuration minimal and avoid style bikeshedding.

⸻

C) Supabase integration (Auth + DB) — vertical slice first

C1 — Supabase client + env wiring

Prompt

Integrate Supabase client into the app. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.example and document in README. Add a small lib/supabaseClient.ts (or equivalent) and a health-check page showing “connected” when env vars exist. Do not commit secrets.

C2 — Auth: sign in/out + protected routes

Prompt

Implement Supabase auth with email magic link (or simplest supported method). Add sign-in and sign-out UI. Protect the app so schools/shortlist pages require login. Keep UI minimal.

C3 — Workspace model (multi-tenant)

Prompt

Implement Workspace + WorkspaceMember tables and server logic so each user has at least one workspace. Add a settings page to view current workspace and switch/create another workspace. Keep it simple and secure (Row Level Security if using Supabase policies).

⸻

D) Workspace settings: home + advies + matching toggle

D1 — Workspace settings UI + persistence

Prompt

Implement workspace settings fields: home_postcode, home_house_number, advies_levels (single or combined), and match_mode (either/both). Add validation and persistence. UI must include loading/empty/error states. Use the domain constraints from docs.

D2 — Combined advice toggle behavior

Prompt

Implement the combined advice behavior: default match is EITHER, with a toggle to require BOTH. Ensure the UI only shows the toggle when two advies levels are selected. Add unit tests for the filter logic.

⸻

E) Schools dataset ingestion (prefer structured source)

E1 — Schools ingest: Schoolwijzer (structured/API preferred)

Prompt

Implement a schools import/sync job from Schoolwijzer (prefer structured/API endpoints if available rather than scraping HTML). Store: name, address, website URL, supported levels (normalized), and coordinates (lat/lng) when possible. Record schools_last_synced_at. Document the approach in docs/DATA_SOURCES.md.

E2 — Schools list page (advies filtered)

Prompt

Create /schools list page that defaults to filtering schools by the workspace’s advies profile and match_mode. Add search by name and basic sort. Ensure UI states are present.

E3 — Level normalization mapping

Prompt

Create a level normalization mapping in one place (e.g., lib/levels.ts). Convert source labels (e.g., “VMBO-theoretical”, “VMBO-basic”, “HAVO”, “VWO”) into internal enums. Add tests for the mapping.

⸻

F) Open days ingestion + freshness + honesty

F1 — Open days ingest from Schoolkeuze020 (best-effort)

Prompt

Implement open day import/sync from Schoolkeuze020 open days list. Store: date/time, school association, source="schoolkeuze020", source_url (prefer school website link), and last_synced_at. Include change detection fields (source_hash, last_seen_at, optional status). Document in docs/DATA_SOURCES.md.

F2 — Open days UI requirements (non-negotiable)

Prompt

Wherever open days are shown (school detail, Open Days page), always display:
	•	Warning text: “Open day times can change — confirm on the school’s own website.”
	•	“Last synced” timestamp (if available)
Add a “Refresh” action (server-triggered re-sync) if feasible.

F3 — Change detection UX

Prompt

Add UI states for open days: normal, updated, removed_from_source. If removed_from_source, hide by default but allow “show removed” toggle. Ensure copy encourages checking school websites.

⸻

G) Commute (bike time + distance)

G1 — Home geocoding from postcode + house number

Prompt

Implement geocoding for workspace home location from NL postcode + house number. Store resolved lat/lng. Add a fallback UI to pick from multiple results if ambiguous. Do not store more personal data than necessary.

G2 — Bike routing time + distance + caching

Prompt

Implement cycling ETA and distance from home lat/lng to school lat/lng using the chosen routing provider. Cache results per (workspace, school). Display on /schools list and school detail. Add sorting/filter by max cycling minutes.

⸻

H) Visits, rating, and the Top 12

H1 — Visit notes + 1–5 star rating

Prompt

On school detail, implement visit notes + a single 1–5 star rating per school (workspace-specific). Add “attended” flag. Include validation and UI states.

H2 — Shortlist: strict 12 cap + ranking

Prompt

Implement a Top 12 shortlist per workspace with strict cap of 12. Prevent adding a 13th with clear UI messaging. Add ranking (drag-and-drop or up/down controls). Add tests for the cap rule and ranking persistence.

H3 — Export/print view

Prompt

Add an export/print-friendly page for the Top 12 showing: rank, school name, rating, and key notes. Keep styling minimal and readable.

⸻

I) Hardening and deployment

I1 — Seed/demo data

Prompt

Add a safe “seed demo data” script (dev only) that creates a demo workspace, a few schools, and example open days/visits for UI testing. Ensure it cannot run in production accidentally.

I2 — Deployment checklist

Prompt

Create docs/DEPLOYMENT.md describing how to deploy on Vercel with Supabase env vars, and how to run migrations. Keep it short and practical.

⸻

Quality and guardrails (paste into any prompt when needed)

Add-on snippet

Constraints:
	•	Follow docs/PRD.md and docs/ACCEPTANCE_CRITERIA.md
	•	Keep changes small and PR-sized
	•	Don’t refactor unrelated code
	•	Add loading/empty/error UI states
	•	Add at least one test or provide a minimal test plan
	•	Don’t commit secrets; update .env.example when adding env vars
