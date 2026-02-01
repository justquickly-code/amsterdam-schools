# School Data Enrichment Proposal (DUO open data seed)

Date: 2026-01-31

## Source file reviewed
`/Users/jmontgomery/Desktop/amsterdam_vo_schools_seed.xlsx`

Sheets:
- README (summary + licensing notes)
- Schools_AMS_main (Amsterdam VO vestigingen excluding PRO)
- Schools_AMS_excluded_PRO (includes PRO for review)
- Metrics_long (long‑form metrics per school_id)
- Field_Dictionary (column definitions)

## Snapshot of what’s in the file
- `Schools_AMS_main`: 82 rows, 45 columns (all `include_in_main_db = 1`).
- `Schools_AMS_excluded_PRO`: 8 rows (PRO‑included, for review).
- `Metrics_long`: 910 rows across 85 school_id values.
- `public_use_ok`: all rows are marked as OK for public use with DUO CC‑BY 4.0 attribution.

## Data completeness notes (Schools_AMS_main)
- Many exam metrics are missing for some schools:
  - VWO exam metrics missing in ~58.5% of rows.
  - HAVO exam metrics missing in ~56.1% of rows.
- `has_*` flags contain `Error: #VALUE!` in multiple columns (needs cleanup on import).
- `vestigingsnaam` repeats across multiple vestigingen (51 unique names across 82 rows).
- `notes` column is entirely empty.

## Matching considerations vs current app data
- Current app schools come from Schoolwijzer + supplemental list (per `docs/DATA_SOURCES.md`).
- The seed uses DUO identifiers (`school_id = BRIN + vestiging_nr`) and formal DUO names.
- Many DUO vestigingsnamen won’t match the app’s display names directly without mapping.

## Recommended integration options (decision)

Chosen: **Option A — “Parent facts” section on school detail** (collapsible block).

### Option A — “Parent facts” section on school detail (minimal UI change)
Add a collapsible “School facts (DUO data)” block on `/schools/[id]` showing:
- Pupil counts (total, by track where available)
- Exam pass rates and average CE/final where available
- Data period + attribution text

Pros: Minimal new navigation; parents see data in context.
Cons: Requires careful layout to avoid overwhelming the child‑focused UI.

### Option B — New tab/section for each school
Add a “For parents” tab or secondary section on `/schools/[id]` with a structured table:
- Basic school facts (denominatie, address, website)
- Pupil counts by track
- Exam results by track

Pros: Clear separation; can hide behind a tab for parents.
Cons: More UI work, needs tabbed layout.

### Option C — “Compare schools” table view
Add a new page with a filterable, sortable table for parents:
- `/compare` or `/schools/data` listing key metrics side‑by‑side
- Useful for shortlist comparison

Pros: Enables ranking/filters; great for parents.
Cons: Larger design + data‑table work.

## Suggested data model (proposal)
1) **Add identifiers to `schools`** (if missing): `brin`, `vestiging_nr`, `duo_school_id`.
2) **Add a `school_metrics` table** (long‑form):
   - `school_id` (FK to schools.id)
   - `duo_school_id`
   - `metric_name`, `metric_group`
   - `value`, `unit`, `period`
   - `source`, `public_use_ok`, `notes`
3) **Optional `school_profiles` table** for DUO‑specific fields (denominatie, phone, etc).

## Import + cleaning steps (proposal)
- Convert the xlsx to CSV (one‑time import step).
- Map `Error: #VALUE!` to `NULL`.
- Normalize `has_*` flags to booleans.
- Use `include_in_main_db` and `public_use_ok` for filtering.
- Join on `duo_school_id` (preferred) or fallback on name + address + postcode.

## Attribution + licensing requirements
- Display attribution wherever the data is surfaced:
  - “Data source: DUO Open Onderwijsdata (CC‑BY 4.0).”
- Keep any non‑open sources (e.g., Scholen op de kaart) separate and permission‑gated.

## Proposed implementation plan (tracking)
Status legend: Not started / In progress / Done

| Step | Status | Notes |
|---|---|---|
| Decide UI option (A/B/C) | Done | Option A selected (collapsible “School facts” section). |
| Decide schema additions (schools identifiers + school_metrics) | Done | Migration added (20260201090000_add_duo_school_metrics.sql). |
| Build importer script for xlsx → CSV → DB | Done | Script added; requires env vars and Supabase access. |
| Map DUO schools to existing `schools` rows | Paused | Auto-matching currently low; revisit improved matcher or manual overrides. |
| Implement UI rendering + attribution | Done | Collapsible section on school detail with attribution and empty state. |
| Validate data coverage + empty states | Paused | Dependent on successful DUO import. |

## Implementation log
- DUO import dry run currently matches 8/82 schools; feature paused until improved matching or manual overrides.
