# Release Plan (MVP → v1)

This plan turns the audit findings into an execution order with clear “done” checks.

Status update: As of **January 18, 2026**, all items in Phases 0–4 are complete. This file is kept for history and future planning.

Legend:
- P0 = must fix before public use
- P1 = completes Acceptance / removes major friction
- P2 = improvements (nice to have)
- P3 = polish

---

## Phase 0 — Safety + correctness (P0) ✅ Done

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

## Phase 1 — Acceptance completeness (P1) ✅ Done

### 1.1 Canonical Planner route (CL-018)
**Work**
- Create `/planner` (or rename `/open-days` → `/planner`).
- Add redirect so old links still work.
- User-facing wording should remain “Open Days” (avoid “planner” in UI copy).

**Done when**
- `/planner` is the canonical route after Phase 1.1.
- Existing links don’t break.

---

### 1.2 Shortlist print/export view (CL-011)
**Work**
- Add `/shortlist/print` (or `/shortlist/export`) with:
  - rank (1–N, where N = advice-based cap)
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

## Phase 2 — Improvements (P2) ✅ Done

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

## Phase 3 — Polish (P3) ✅ Done

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

## Phase 4 — Remaining MVP commitments (P1/P2) ✅ Done

### 4.1 Dashboard + bottom nav (CL-063 / CL-101)
**Work**
- Implement mobile bottom nav (always visible).
- Make Dashboard the default landing after login.
- Add real Dashboard content (setup nudges + upcoming open days summary).

**Done when**
- Bottom nav appears on all core screens.
- Login routes to Dashboard by default.
- Dashboard shows at least one meaningful summary plus setup nudges.

---

### 4.2 First-run setup gating (CL-064)
**Work**
- Require postcode + house number + advies before accessing main content.
- Provide a lightweight setup flow that users can complete once.

**Done when**
- Users without required settings are guided through setup.
- Main screens are gated until setup is complete.

---

### 4.3 Planned open days (CL-065)
**Work**
- Add a workspace-specific join table for planned open days.
- Add “Planned” toggle in Open Days and School detail.
- Highlight schools with no planned open day.

**Done when**
- Planned status persists per workspace.
- Planned items are visible in the Open Days UI.

---

### 4.4 Workspace member sharing (CL-062)
**Work**
- Add invite/add flow to share a workspace.
- Enforce roles (owner/editor/viewer) in UI and RLS.

**Done when**
- Another user can join a workspace and see the same data.
- Role enforcement works as expected.

---

### 4.5 Language setting (CL-104)
**Work**
- Add language setting with Dutch default and English option.
- Use the setting in UI copy (at least for main navigation and core labels).

**Done when**
- Language can be switched and persists.
- Dutch is the default for new users.

## Phase 5 — Keuzegids tutorial + timeline (Planned)

### 5.1 “How it works” tutorial (mainstream lottery path)
**Work**
- Create a kid-friendly tutorial based on Keuzegids dates (facts accurate).
- Keep tone informal and fun while preserving accuracy.
- Include the Keuzegids guidance on minimum list length by advice (4/6/12) with the profile‑class caveat.

**Done when**
- Tutorial is readable and complete for the mainstream lottery path.

### 5.2 Setup flow (optional)
**Work**
- Add optional tutorial step after family invite in setup (skip allowed).
- Explain why profile data is needed (advies filtering + commute times).
- Explain shared workspace + per‑member notes on invite step.

**Done when**
- Users can start or skip the tutorial during setup without blocking progress.
- Copy makes clear the tutorial is the Amsterdam 2025/26 process (not app UI training).

### 5.3 Top-right menu entry
**Work**
- Add a “How it works” entry so it’s always accessible.

**Done when**
- Tutorial is reachable from any main screen via the menu.

### 5.4 Dashboard next dates
**Work**
- Show the next important date(s) from the timeline on the Dashboard.

**Done when**
- Dashboard highlights the upcoming key date(s) clearly.

### 5.5 Progress milestone
**Work**
- Add a progress milestone for completing the tutorial.
- Show “recently completed” items so early % completion feels grounded.

**Done when**
- Progress reflects tutorial completion.
- Recently completed list is visible on Dashboard.

## Phase 6 — Production readiness + UX polish (Planned)

### 6.1 Production hardening (P0/P1)
**Work**
- Verify Supabase email templates are updated (Magic Link + Invite).
- Confirm admin sync jobs/cron for open days (if used).
- Validate production env vars (SUPABASE keys, ADMIN_SYNC_TOKEN, MAPBOX token).

**Done when**
- Production login/invites work with updated templates.
- Admin sync runs without errors.
- All required env vars are set and documented.

### 6.2 iOS Home Screen login (P1)
**Work**
- Decide whether to support PWA login.
- If yes: add in-app OTP or paste-link flow so session is created inside standalone context.

**Done when**
- Standalone iOS app stays logged in after first login.
- Documented in OPERATIONS or PROJECT_BRIEF.

### 6.3 UX polish (P2)
**Work**
- Tighten copy on setup/tutorial/about.
- Improve shortlist ergonomics (rank guidance, labels, ordering).
- Open days filter defaults and badges (if agreed).

**Done when**
- Copy is consistent and user-tested.
- Shortlist and open days feel clear and low-friction.

### 6.4 Lightweight analytics (P2)
**Work**
- Track setup completion, shortlist creation, tutorial completion, and feedback usage.
- Add a simple admin view or logging for adoption metrics.

**Done when**
- Key funnel events are tracked.
- Basic admin visibility into adoption.

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
