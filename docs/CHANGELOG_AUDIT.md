# Changelog Audit (Gap → Fix)

This document is a worklist of discovered gaps + decisions, each with a stable reference ID (CL-###).
Use it when updating Release Plan, Acceptance, and Documentation.

Legend:
- **Status**: OPEN / IN PROGRESS / DONE / PARKED
- **Priority**: P0 (blocker) / P1 / P2 / P3
- **Area**: UX / Data / Security / Ops / Tech debt

---

## Open items

| ID | Priority | Area | Status | Summary | Notes / Decision |
|---:|:--:|:--|:--|:--|:--|
| CL-011 | P1 | UX | OPEN | Shortlist print/export view | Needs /shortlist/print (or export) per Acceptance. |
| CL-014 | P1 | UX | OPEN | Schools list sort by bike time | Toggle Name/Bike time; unknown at bottom. |
| CL-018 | P1 | UX | OPEN | Canonical “Planner” route | Decide /planner as canonical; redirect /open-days. |
| CL-031 | P2 | Security | OPEN | Stop storing admin token long-term | Prefer sessionStorage; optional server allowlist gate. |
| CL-034 | P1 | UX/Ops | OPEN | Make commute computation user-safe | On-demand compute for missing; admin batch remains fallback. |
| CL-038 | P3 | Ops | OPEN | Compute only missing commutes | Reduce batch and/or pagination cursor. |
| CL-040 | P2 | UX | OPEN | Remove oai_citation artifacts | Clean UI copy. |
| CL-052 | P2 | UX/Data | OPEN | Postcode + house number validation | Enforce pairing. |
| CL-053 | P2 | Data | OPEN | Postcode normalization | Store as 1234AB. |
| CL-054 | P2 | Docs | OPEN | Remove stale “membership” comment | Update settings docs + code comment. |
| CL-055 | P1 | Data/UX | OPEN | Open days year filtering correctness | Default to latest year; allow selection. |
| CL-056 | P1 | Data/UX | OPEN | Normalize event_type | Align DB/scraper/UI/ICS; map consistently. |
| CL-060 | P3 | UX | OPEN | Retry once on shortlist rank conflicts | Handle unique constraint fail with refresh + retry. |
| CL-061 | P3 | UX | OPEN | Friendly supported level labels | Map tokens to human text. |

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

---

## Decisions log

- Public /open-days: do not show “inactive” (ops/debug belongs in admin tooling).
- Shortlist: one list + Top 12 subset view (Option A).
- Planned visits: single status “Planned” for now (no separate Booked).
- Bilingual support required; default Dutch; language setting required.
- Bottom nav on mobile; dashboard landing after login.