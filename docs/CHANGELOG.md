# Changelog

## Unreleased
- Public /planner: remove/hide “Show inactive” toggle (not intuitive for end users).
- Admin: keep “Show inactive” capability, move it to an admin-only open-days view (/admin/open-days).
- Docs: clarified canonical planner route and Top 12 wording; added Doc Audit Report to CHANGELOG_AUDIT.
- Docs: aligned PRD-status CL IDs, Open Days routing notes, Top 12 subset wording, planned open day model, and admin auth requirements.
- Docs: aligned Open Days wording in README/PRD-status/Cursor prompt pack.
- Docs: removed boilerplate web/README.md (use root README only).
- Docs: added minimal web/README.md pointer to root README.
- Admin: compute-commutes now requires explicit workspace_id and validates against session.
- Security: open-days ICS endpoint no longer uses service role.
- Open Days: calendar download now uses authenticated fetch to support RLS.
- Admin: sync-open-days now requires ADMIN_SYNC_TOKEN in production (fail-closed).
- Routes: /planner is canonical; /open-days now redirects to /planner.
- Shortlist: added /shortlist/print export view with print button.
