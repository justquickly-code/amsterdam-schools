# Changelog Audit (Gap → Fix)

This document is a worklist of discovered gaps + decisions, each with a stable reference ID (CL-###).
Use it when updating Release Plan, Acceptance, and Documentation.

Legend:
- **Status**: OPEN / IN PROGRESS / DONE / PARKED
- **Priority**: P0 (blocker) / P1 / P2 / P3
- **Area**: UX / Data / Security / Ops / Tech debt

---

## Doc Audit Report — 2026-01-17 (Updated)

✅ Ready
- docs/00_PROJECT_BRIEF.md: scope + ground rules are clear and consistent.
- docs/ACCEPTANCE_CRITERIA.md: aligns with PRD core requirements.
- docs/DOMAIN_MODEL.md: core entities and non‑negotiables align with PRD/brief.
- docs/DESIGN.md: consistent with MVP UI constraints.
- docs/SECURITY.md + docs/OPERATIONS.md: consistent on admin token + service role usage.
- docs/DEPLOYMENT.md + docs/DATA_SOURCES.md: consistent with PRD + tech decisions.
- docs/02_Tech_Stack_Decisions.md: consistent with repo structure and PRD.

⚠️ Needs clarification (questions)
None.

❌ Needs changes (exact file + section + proposed text)
None.

Top 5 risks if we proceed without fixes
1) Admin allowlist/is_admin check is still pending, leaving admin endpoints less protected than intended.
2) Shortlist vs saved‑list ambiguity could force data model changes mid‑build.
3) Missing/legacy CL IDs undermine planning and progress tracking.
4) Planned‑status modeling uncertainty risks late schema changes and rework.
5) Admin auth expectations mismatch increases security risk and inconsistent implementation.

## Open items

| ID | Priority | Area | Status | Summary | Notes / Decision |
|---:|:--:|:--|:--|:--|:--|
| CL-011 | P1 | UX | DONE | Shortlist print/export view | Needs /shortlist/print (or export) per Acceptance. |
| CL-014 | P1 | UX | DONE | Schools list sort by bike time | Toggle Name/Bike time; unknown at bottom. |
| CL-018 | P1 | UX | DONE | Canonical “Planner” route | /planner canonical; /open-days redirects. |
| CL-031 | P2 | Security | DONE | Stop storing admin token long-term | Prefer sessionStorage; optional server allowlist gate. |
| CL-034 | P1 | UX/Ops | DONE | Make commute computation user-safe | On-demand compute for missing; admin batch remains fallback. |
| CL-038 | P3 | Ops | DONE | Compute only missing commutes | Reduce batch and/or pagination cursor. |
| CL-040 | P2 | UX | DONE | Remove oai_citation artifacts | Clean UI copy. |
| CL-052 | P2 | UX/Data | DONE | Postcode + house number validation | Enforce pairing. |
| CL-053 | P2 | Data | DONE | Postcode normalization | Store as 1234AB. |
| CL-054 | P2 | Docs | DONE | Remove stale “membership” comment | Update settings docs + code comment. |
| CL-055 | P1 | Data/UX | DONE | Open days year filtering correctness | Default to latest year; allow selection. |
| CL-056 | P1 | Data/UX | DONE | Normalize event_type | Align DB/scraper/UI/ICS; map consistently. |
| CL-060 | P3 | UX | DONE | Retry once on shortlist rank conflicts | Handle unique constraint fail with refresh + retry. |
| CL-061 | P3 | UX | DONE | Friendly supported level labels | Map tokens to human text. |
| CL-062 | P1 | UX | OPEN | Workspace member sharing | Invite/add members to share a workspace. |
| CL-063 | P1 | UX | OPEN | Dashboard content + setup nudges | Dashboard needs real content and setup prompts. |
| CL-064 | P1 | UX | OPEN | First-run setup gating | Require home + advies setup early in flow. |
| CL-065 | P1 | UX/Data | OPEN | Planned open days (workspace-specific) | Store planned/attended per workspace via join table. |
| CL-032 | P2 | Security | DONE | Admin allowlist/is_admin check | Require admin session + allowlist in admin routes. |

---

## Recently completed (already addressed)

| ID | Priority | Area | Status | Summary | Notes |
|---:|:--:|:--|:--|:--|:--|
| CL-023 | P0 | Security | DONE | Remove service role from public ICS | ICS fetch is non-service-role; maintains output. |
| CL-025 | P0 | Ops | DONE | Open days sync non-destructive | No delete-first; tracking seen/missing; stable IDs. |
| CL-026 | P0 | Ops | DONE | Track missing open days | is_active + missing_since + last_seen_at behavior. |
| CL-033 | P0 | Tech debt | DONE | Remove duplicate open day sync logic | One canonical route remains. |
| CL-036 | P0 | Security/Ops | DONE | Commute compute workspace scoping | User-scoped workspace lookup before service role writes. |
| CL-037 | P0 | Security/Ops | DONE | Remove “first workspace” selection risk | No limit(1) w/ service role for workspace selection. |
| CL-050 | P1 | UX/Data | DONE | Open days show active by default | Public page shows active; inactive retained for ops/debug. |
| CL-101 | P1 | UX | DONE | Mobile bottom nav | Navigation decision locked. |
| CL-104 | P1 | UX | DONE | Language setting NL default + EN optional | Decision locked. |
| CL-107 | P1 | UX | DONE | One list + Top 12 subset view | Decision locked. |

---

## Decisions log

- Public /planner: do not show “inactive” (ops/debug belongs in admin tooling).
- Shortlist: one list + Top 12 subset view (Option A).
- Planned visits: single status “Planned” for now (no separate Booked).
- Bilingual support required; default Dutch; language setting required.
- Bottom nav on mobile; dashboard landing after login.
- Admin routes require x-admin-token plus a valid admin session (allowlist/is_admin).
