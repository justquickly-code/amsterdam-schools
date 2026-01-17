# Audit Change Log (MVP → Release)

This file is the single source of truth for post-MVP changes identified during a code + DB audit.

Legend:
- P0 = must fix before public use
- P1 = should do soon (meets Acceptance / removes major friction)
- P2 = nice improvements
- P3 = polish / refactor

---

## P0 — Security / correctness

### CL-023 — Remove service role from public ICS route
**Area:** API  
**Current:** `GET /api/open-days/[id]/ics` uses `SUPABASE_SERVICE_ROLE_KEY` to fetch open_days.  
**Risk:** public endpoint + service role bypasses RLS; future query mistakes could leak data.  
**Change:** Use user-scoped server client (RLS) OR anon with explicit read-only policy/view.

---

### CL-036 / CL-037 — Fix compute-commutes workspace scoping
**Area:** API  
**Current:** `/api/admin/compute-commutes` selects workspace with `.limit(1)` while using service role.  
**Risk:** may compute/write commutes for the wrong workspace and update wrong home lat/lng.  
**Change:** Scope to the correct workspace:
- require `workspace_id` and validate ownership OR
- use session-aware lookup under RLS and then perform scoped writes.

---

### CL-025 / CL-026 / CL-033 — Open-days sync hardening + dedupe
**Area:** API / Ops  
**Current:** open-days sync (a) may be deployed without token (fail-open) and (b) deletes snapshot before upsert (data wipe risk) and (c) code is duplicated.  
**Change:**
- fail-closed token in production
- non-destructive sync (staging/swap or safe prune)
- extract logic into a shared module and keep one canonical route.

---

## P1 — Acceptance / major UX

### CL-018 — Create `/planner` canonical route + redirect
**Area:** Routing/UX  
**Current:** open days are at `/open-days`, but docs/acceptance reference a “planner” view.  
**Change:** Implement `/planner` and redirect `/open-days` to it (or vice versa, but pick one).

---

### CL-011 — Shortlist print/export view
**Area:** Feature  
**Acceptance:** Export/print view with rank + rating + key notes.  
**Change:** Add `/shortlist/print` (or `/shortlist/export`) and a button from shortlist page.

---

### CL-014 — Sort schools by bike time
**Area:** Schools list  
**Acceptance:** Allow sorting by cycling time when home address set.  
**Change:** Add sort toggle (Name / Bike time) and push unknown commutes to bottom.

---

### CL-050 / CL-055 / CL-056 — Open days: event_type + syncedAt + year handling
**Area:** Open days UI/Data  
**Current:**
- `syncedAt` derived from first row (ordered by starts_at), not newest sync time
- year label assumes single year
- event_type uses mixed values (`open_day` default vs scraper values)  
**Change:**
- show max(last_synced_at) as synced time
- filter by year or add year selector
- normalize event_type values across DB/scraper/UI/ICS

---

### CL-034 — Make commute compute user-safe (not admin-only)
**Area:** Product/UX  
**Current:** commutes require an admin-triggered batch job.  
**Change:** compute on-demand when missing (rate-limited) or background job after settings change.

---

## P2 — Improvements / hygiene

### CL-031 — Stop storing admin token in localStorage
**Area:** Admin UX/security  
**Current:** admin pages persist token in `localStorage`.  
**Change:** don’t persist, or use `sessionStorage` behind a “remember” toggle.

---

### CL-032 — Add admin allowlist gate
**Area:** Admin security  
**Current:** admin pages only check “signed in”; API routes rely on token.  
**Change:** add server-side allowlist (email) or `is_admin` profile flag for admin routes/pages.

---

### CL-040 — Remove `oai_citation:*` artifact from UI copy
**Area:** UI copy  
**Change:** replace with normal copy/link.

---

### CL-041 — Use one run timestamp in sync-schools
**Area:** Ops  
**Change:** set `runStartedAt` once and use for all school rows in a sync.

---

### CL-052 / CL-053 / CL-054 — Settings validation + normalization + comment cleanup
**Area:** Settings  
**Current:** house-number validation is unreachable; postcode validation counts spaces wrong; stale membership comment.  
**Change:** require postcode+house together; normalize postcode to `1234AB`; update comment to creator-only RLS model.

---

## P3 — Polish / robustness

### CL-038 — Compute only missing commutes (or paginate)
**Area:** API  
**Current:** always computes first N schools each run.  
**Change:** select schools missing cache, or add pagination cursor.

---

### CL-060 — Retry once on shortlist rank conflict
**Area:** Robustness  
**Change:** if insert fails due to unique rank conflict, re-fetch and retry once.

---

### CL-061 — Friendly labels for supported_levels
**Area:** UX  
**Change:** map tokens to human-readable labels in school detail/list.