# PRD Status (Audit)

This checklist reflects current implementation status based on code + DB audit.

Legend:
- ✅ Done
- 🟨 Partial
- ⛔ Not started

---

## 1) Auth + Workspace

- ✅ Sign-in required to use core pages (schools, open days, shortlist, settings).
- ✅ Workspace exists (MVP assumes one workspace per user).
- 🟨 Shareable workspace with friends/family (PRD mentions sharing) — not implemented (current RLS is creator-only).

---

## 2) Settings

- ✅ Store home address (postcode + house number) on workspace.
- ✅ Store advies levels (1–2) and match mode (either/both).
- 🟨 Validation/normalization improvements needed (postcode spacing; postcode/house pairing).

---

## 3) Schools list

- ✅ Load all schools (from Schoolwijzer sync).
- ✅ Search by name.
- ✅ Filter by advies levels (based on supported_levels).
- ✅ Add to shortlist from list.
- 🟨 Sort by cycling time (acceptance requirement) — not implemented yet.

---

## 4) School detail

- ✅ View basic school info (levels, address, website).
- ✅ Visit notes: attended, rating 1–5, notes, pros, cons.
- ✅ Save uses upsert per (workspace_id, school_id).
- ✅ Add to shortlist from detail.

---

## 5) Shortlist (Top 12)

- ✅ Add/remove.
- ✅ Hard cap max 12 enforced in DB.
- ✅ Rank ordering and up/down via RPC swap.
- 🟨 Print/export view (acceptance requirement) — not implemented yet.

---

## 6) Open Days (Planner)

- ✅ Ingest open days and store snapshot rows.
- ✅ Open days list UI: grouped by date.
- ✅ Filters: event type + date range + shortlist-only.
- ✅ Show commute if cached.
- ✅ “Add to calendar” generates .ics.
- 🟨 Canonical `/planner` route (acceptance wording) — not implemented (currently `/open-days`).
- 🟨 Open days “synced at” accuracy + year handling.
- 🟨 event_type normalization across DB/scraper/UI/ICS.

---

## 7) Commute times

- ✅ Commute cache table exists and is shown on list items where available.
- 🟨 Commute compute is currently admin-triggered and has a workspace scoping bug in API route.
- 🟨 User-safe computation (on-demand/background) not implemented yet.

---

## 8) Operations / Admin

- ✅ Sync schools route is token-gated and non-destructive upsert.
- 🟨 Sync open days route needs hardening (fail-closed token, non-destructive sync, remove duplication).
- 🟨 Admin token storage in UI uses localStorage (should be improved).

---

## 9) Security

- ✅ RLS is enabled; private tables are workspace-scoped and creator-only.
- 🟨 Public GET .ics route currently uses service role (should be changed).