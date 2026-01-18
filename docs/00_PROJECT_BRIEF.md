# 00 — Project Brief (Amsterdam Schools MVP)

This repo builds a lightweight planner for Amsterdam parents + children to:
- discover schools,
- see open days,
- shortlist & rank schools,
- plan visits,
- capture notes/ratings,
- and (optionally) see bike commute estimates.

This document is the **entry point** for humans and Cursor. It is intentionally short and rule-like.

---

## 1) Ground rules (for Cursor + humans)

### 1.1 Follow the plan, step-by-step
- The execution order is defined in `docs/RELEASE_PLAN.md`.
- Work in **small steps** (one change at a time).
- After each step:
  - run `pnpm -r lint`
  - run `pnpm -r --filter web build`
  - sanity-check the acceptance criteria touched by the change

### 1.2 Don’t over-engineer
- Prefer minimal changes that satisfy the acceptance criteria.
- Avoid new abstractions unless repeated code is clearly painful and the plan explicitly calls for refactor.
- If an edge case opens a rabbit hole, document it and park it.

### 1.3 Keep documentation up to date as we go
When code changes, update docs in the same PR:
- `docs/CHANGELOG.md` (what changed, user-visible + ops-visible)
- `docs/CHANGELOG_AUDIT.md` (only if it affects an audited item / CL-* reference)
- `docs/OPERATIONS.md` (if an endpoint/job behavior changes)
- `docs/ROUTES_UI.md` (if navigation/routes change)
- `docs/DOMAIN_MODEL.md` (if schema/data meaning changes)
- `docs/SECURITY.md` (if auth/keys/RLS behavior changes)
- `docs/DEPLOYMENT.md` (if env/deploy steps change)

### 1.4 Check in with the user between steps
- Before starting a step: restate the exact acceptance criteria / “Done when”.
- After finishing: report what changed + what passed (lint/build) + what to manually verify.

---

## 2) The agreed docs (source of truth)

Cursor must treat these files as authoritative:
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

---

## 3) UX decisions locked so far

### 3.1 Navigation
- Mobile should have a **bottom nav** (always visible).
- Default landing after login: **Dashboard** (lightweight, high value).
- Core screens remain simple: Dashboard, Schools, Open days, Shortlist.
- Settings, Print/Export, Language toggle, and Sign out live in the top-right menu.
- Admin entry appears in the top-right menu only for allowlisted admin accounts.

### 3.2 Language
- App supports **Dutch + English**.
- Default language: **Dutch**.
- Language is toggled from the **top-right menu** (not the Settings form).

### 3.3 Onboarding requirement (critical)
- Users must enter **postcode + house number + advice/level** early (setup flow).
- This is central to the value proposition.

### 3.4 Open day “inactive” behavior (agreed)
- Public `/planner` (with `/open-days` redirect) should **not** surface “inactive”.
- Keep the capability for ops/debug **in admin tooling** only.

### 3.5 Shortlist model (agreed direction)
- Option A: **One list** with a **Top 12 subset view**.
- Parents may explore more than 12; the UI must still highlight the top 12.

### 3.6 Planned visits
- A simple status is enough for now: **Planned** (no separate “Booked” yet).
- There may be multiple open days per school; the UI should make it easy to spot schools with **no planned open day**.

---

## 4) Production intent

- Public app must not use service role where unnecessary.
- Admin endpoints are token-gated and server-only (see `docs/OPERATIONS.md` + `docs/SECURITY.md`).
- Sync jobs run via Supabase Cron during open-days season (details in `docs/OPERATIONS.md` and `docs/DEPLOYMENT.md`).

---

## 5) Cursor execution prompt (paste this into Cursor)

You are working in the amsterdam-schools repo.

Rules:
1) Read and follow: docs/RELEASE_PLAN.md, docs/ACCEPTANCE_CRITERIA.md, docs/SECURITY.md, docs/OPERATIONS.md, docs/ROUTES_UI.md, docs/DOMAIN_MODEL.md.
2) Implement ONE step at a time in the order in docs/RELEASE_PLAN.md. Do not jump ahead.
3) Before changes: state which step you are doing, why, and the “Done when” checks.
4) After changes: summarize exactly what changed (files), and how to verify (commands + quick manual check).
5) Keep docs updated in the same change (CHANGELOG + any relevant docs above).
6) Do not over-engineer. If you’re uncertain, stop and ask a single focused question.

Start with the next incomplete step in Phase 1.1 (or the next not-done item in RELEASE_PLAN).
