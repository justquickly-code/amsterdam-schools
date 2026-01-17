# Release Plan (MVP → v1)

This plan turns the audit findings into an execution order with clear “done” checks.

Legend:
- P0 = must fix before public use
- P1 = completes Acceptance / removes major friction
- P2 = improvements (nice to have)
- P3 = polish

---

## Phase 0 — Safety + correctness (P0)

### 0.1 Fix commute compute workspace scoping (CL-036 / CL-037)
**Why:** current API can operate on the wrong workspace (service role + `.limit(1)`).

**Work**
- Update `/api/admin/compute-commutes` to compute for the correct workspace:
  - **Option A (MVP clean):** require `workspace_id` in body and validate ownership (session-aware lookup) before writing.
  - **Option B:** use user session to select workspace under RLS, then scoped writes.

**Done when**
- Commute compute always targets the caller’s workspace (verified by logging workspace_id).
- No `.limit(1)` on workspaces with service role remains.
- Home lat/lng updates only occur on the correct workspace.

---

### 0.2 Fix ICS route to avoid service role in public GET (CL-023)
**Why:** public GET + service role is an unnecessary risk.

**Work**
- Change `/api/open-days/[id]/ics` to fetch event data without service role:
  - Use anon key + read-only `open_days` access (already exists) or a safe DB view.
- Keep same .ics output and headers.

**Done when**
- Route works for signed-in users.
- No service role key is used in this endpoint.

---

### 0.3 Open days sync hardening (CL-025 / CL-026 / CL-033)
**Why:** risk of data wipe + fail-open token + duplicate logic.

**Work**
- Enforce fail-closed token in production.
- Remove delete-first pattern:
  - stage/swap via `sync_run_id`, or
  - upsert first then prune.
- Extract parsing+upsert logic into one shared module; keep only one canonical API route.

**Done when**
- A failed sync cannot remove existing open days.
- Route is protected consistently.
- Only one implementation exists.

---

## Phase 1 — Acceptance completeness (P1)

### 1.1 Canonical Planner route (CL-018)
**Work**
- Create `/planner` (or rename `/open-days` → `/planner`).
- Add redirect so old links still work.

**Done when**
- `/planner` is the canonical planner experience.
- Existing links don’t break.

---

### 1.2 Shortlist print/export view (CL-011)
**Work**
- Add `/shortlist/print` (or `/shortlist/export`) with:
  - rank
  - school name
  - rating
  - attended
  - notes + pros/cons (or a condensed summary)
  - optional commute time if available
- Add “Print / Export” button on `/shortlist`.

**Done when**
- Print page renders cleanly (browser print preview looks good).
- Contains required fields from Acceptance.

---

### 1.3 Schools list sort by bike time (CL-014)
**Work**
- Add sort toggle: Name / Bike time.
- When “Bike time”:
  - items with commute_cache appear first sorted ascending duration
  - unknown commutes go to bottom.

**Done when**
- Sort works and is stable.
- If no home address or no commute cache, UI explains why.

---

### 1.4 Open Days: syncedAt, year handling, event_type normalization (CL-050 / CL-055 / CL-056)
**Work**
- Synced timestamp = max(last_synced_at) across rows.
- Ensure year label is correct:
  - filter to a selected year, or default to latest year.
- Normalize event types across DB/scraper/UI/ICS:
  - choose canonical set and map/convert consistently.

**Done when**
- UI shows correct “Synced at”.
- Filtering by event type always behaves as expected.
- Year shown matches data actually displayed.

---

### 1.5 Make commute computation user-safe (CL-034)
**Work (recommended MVP path)**
- On-demand compute for missing schools:
  - when rendering list/open-days and commute missing, queue a limited number per view (rate limited)
  - cache results in `commute_cache`
- Keep admin batch compute as fallback.

**Done when**
- A normal user can set home address and see commute times populate without visiting admin pages.

---

## Phase 2 — Improvements (P2)

### 2.1 Settings validation + postcode normalization (CL-052 / CL-053 / CL-054)
**Work**
- Enforce postcode+house number pairing.
- Normalize postcode to `1234AB`.
- Fix stale comment about membership model.

**Done when**
- Invalid combinations are blocked with a friendly message.
- Stored data is consistent.

---

### 2.2 Admin token handling and admin gating (CL-031 / CL-032)
**Work**
- Stop persisting admin token in localStorage (sessionStorage or none).
- Add server-side allowlist/is_admin gate for admin pages/routes (optional but recommended).

**Done when**
- Admin token is not stored long-term in the browser.
- Admin endpoints can’t be used by non-admins even if signed in.

---

### 2.3 Clean UI copy artifacts (CL-040)
**Work**
- Remove `oai_citation:*` in UI copy.

**Done when**
- No citation artifacts appear in UI.

---

## Phase 3 — Polish (P3)

### 3.1 Compute only missing commutes (CL-038)
**Work**
- Select schools missing cache or add pagination cursor.

### 3.2 Retry once on shortlist rank conflicts (CL-060)
**Work**
- On unique constraint fail, refresh + retry once.

### 3.3 Friendly supported level labels (CL-061)
**Work**
- Map tokens → user-friendly text in UI.

---

## Suggested execution order (fastest risk reduction)
1) Phase 0.1 commute scoping
2) Phase 0.2 ICS service-role removal
3) Phase 0.3 open-days sync hardening
4) Phase 1.4 open-days correctness (syncedAt/year/event_type)
5) Phase 1.1 planner route
6) Phase 1.3 schools sort by bike time
7) Phase 1.2 shortlist export/print
8) Phase 1.5 user-safe commute compute
9) Phase 2 + 3 polish items

---