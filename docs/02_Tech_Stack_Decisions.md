Tech Stack Decisions — Amsterdam Schools

Purpose

[Goal] Lock key engineering decisions so parallel development chats and Cursor changes stay consistent and avoid re-deciding fundamentals.

⸻

Locked Decisions

[User-provided] Auth + DB: Supabase
[User-provided] Rating: single 1–5 stars
[User-provided] One list of saved schools with a ranked subset (cap depends on advice)
[User-provided] Home input: NL postcode + house number
[User-provided] Advies filtering: combined advice supported; default match EITHER with toggle for BOTH
[User-provided] Open days UI honesty: always warn users to verify on school websites + show last synced

⸻

Decision 1 — App framework & structure

[Decision] Next.js + TypeScript (App Router)

[Reason] Easiest path for a shareable web app with auth, server routes, and Vercel deployment.

[Decision] Repo layout:
	•	web/ contains the Next.js app
	•	docs/ contains specs and decisions (source of truth)

[Constraint] Changes must follow docs/PRD.md and docs/ACCEPTANCE_CRITERIA.md.

⸻

Decision 2 — Package manager

[Decision] pnpm
[Reason] Faster installs, good monorepo support, common in modern TS projects.

[Requirement] Commit lockfile (pnpm-lock.yaml) and pin Node in .nvmrc.

⸻

Decision 3 — Database schema & migrations

Option A — Supabase migrations only (SQL-first)

[Decision] Default to Supabase SQL migrations (supabase/migrations) for schema changes.

[Reason] Simple, transparent, works well with Supabase RLS policies and versioning.

[Constraint] Keep schema changes small and reviewed.

Option B — Prisma (optional later)

[Proposal] Add Prisma only if we strongly want typed models and query ergonomics.

[Reason] Prisma adds another layer; for MVP, keep operational complexity low.

⸻

Decision 4 — Authorization model (multi-tenant)

[Decision] Use Workspace-based multi-tenancy.

[Requirement] All workspace-owned data tables include workspace_id.

[Requirement] Use Supabase Row Level Security (RLS):
	•	Users can read/write data only for workspaces they belong to.
	•	Only workspace owners can invite/remove members.

[Proposal] Roles:
	•	owner, editor, viewer (viewer is optional for MVP)

⸻

Decision 5 — Data ingestion approach

Schools source

[Decision] Prefer Schoolwijzer structured data (API/OpenData) over scraping HTML.

[Reason] Less brittle, more reliable fields (levels, addresses, potentially coordinates).

[Fallback] If the structured source isn’t accessible for a required field:
	•	Scrape only as a controlled import job
	•	Store source_url + last_synced_at + provenance fields

Open days source

[Decision] Use Schoolkeuze020 open days list as best-effort input.

[Requirement] Open days are non-authoritative:
	•	Always show “Verify on school website”
	•	Always show “Last synced”
	•	Store event source_url (prefer school website link if available)

[Proposal] Sync cadence:
	•	Weekly outside “open day season”
	•	Daily during open day season (configurable)

⸻

Decision 6 — Geocoding & cycling ETA/distance

[Decision] Choose the easiest operational provider with cycling routing.

[Proposal] Default to Mapbox (single token, geocoding + directions with cycling profile).
[Fallback] If Mapbox setup becomes a blocker, consider Google Routes API.

[Requirement] Cache commute results per (workspace_id, school_id, mode="bike").

[Privacy] Store only what’s needed:
	•	postcode, house number, lat/lng
	•	no extra personal data

⸻

Decision 7 — UI constraints & state handling

[Requirement] All pages include: loading, empty, and error states.
[Requirement] Avoid complex UI early; prioritize correctness and clarity.
[Requirement] Mobile-first layouts.

[Open days UI requirement (non-negotiable)]
[Requirement] Any open days list must show:
	•	“Open day times can change — confirm on the school’s own website.”
	•	“Last synced: <date/time>”

⸻

Decision 8 — Testing strategy (MVP)

[Decision] Keep tests minimal but real:
	•	Unit tests for pure logic (advies filtering, shortlist cap, mapping normalization)
	•	One lightweight integration test for core flows if feasible

[Requirement] Any new feature requires at least:
	•	one unit test OR
	•	a test plan in the PR description (temporary measure)

⸻

Decision 9 — Deployment

[Decision] Deploy to Vercel.

[Requirement] .env.example must list all env vars and be kept up to date.

⸻

Remaining Open Decisions (to resolve when needed)

[Decision needed] Final routing/geocoding provider (Mapbox vs Google) — choose whichever you can get running fastest.
[Decision needed] Whether to include Prisma (likely post-MVP).
[Decision needed] Exact internal enum list for levels (vmbo variants etc.) once we see Schoolwijzer labels at scale.

⸻

“Do not regress” checklist

[Constraint] Do not remove or weaken:
	•	Shortlist hard cap = 12
	•	Single 1–5 rating
	•	Combined advice requires schools to offer both levels
	•	Open days warning + last synced
	•	Workspace isolation (multi-tenant)
