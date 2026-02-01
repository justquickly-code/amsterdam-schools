# UI Consistency Audit — Headers + Page Typography

Date: 2026-01-31

## Scope
Desktop + mobile header consistency across public and logged‑in pages (hero headers, titles, subtitle spacing, and top actions).
No code changes in this audit; this is a recommendations + tracking doc.

## Key inconsistencies found (examples)
- Header height is inconsistent: Explore lacks `min-h` while most other pages use `min-h-[260px] md:min-h-[320px]`.
- Title sizing varies: some pages use `text-3xl` only, others use `text-3xl sm:text-4xl`, and Login uses `text-2xl`.
- Title spacing varies: some pages include `mt-10` on the header container, others don’t, so titles sit higher/lower.
- Subtitle sizes vary (`text-xs`, `text-sm`, `text-base`) for similar header roles.
- Header container widths vary (`max-w-3xl`, `max-w-4xl`, `max-w-5xl`) without a consistent rule tied to the page layout.
- Header padding varies (`px-4` vs `px-5`, `sm:px-6`), causing title alignment drift across pages.
- Back link placement is inconsistent (above title on Settings/School detail vs right‑aligned on About).

## Page-by-page notes (header patterns)
- Explore `/`: `web/src/app/page.tsx` — no `min-h`, title is `text-3xl sm:text-4xl`, subtitle `text-base`, extra wordmark + language toggle only on mobile.
- Planner `/planner`: `web/src/app/planner/page.tsx` — `min-h` present, title `text-3xl`, count is in header row, warning text is `text-xs`.
- Profile `/profile`: `web/src/app/profile/page.tsx` — `min-h` present, `px-4` header padding, `max-w-5xl`, uses inline address + advice pills.
- Shortlist `/shortlist`: `web/src/app/shortlist/page.tsx` — `min-h` present, `px-5`, subtitle `text-sm`.
- School detail `/schools/[id]`: `web/src/app/schools/[id]/page.tsx` — `max-w-4xl`, back link above title, `px-4` header padding.
- Settings `/settings`: `web/src/app/settings/page.tsx` — `max-w-4xl`, back link above title, `px-4` header padding.
- About `/about`: `web/src/app/about/page.tsx` — `max-w-5xl`, title `text-3xl sm:text-4xl`, back link right‑aligned in header row.
- How it works `/how-it-works`: `web/src/app/how-it-works/page.tsx` — title `text-3xl sm:text-4xl`, subtitle `text-base`.
- Feedback `/feedback`: `web/src/app/feedback/page.tsx` — `px-4` header padding, `max-w-5xl`, subtitle `text-sm`.
- Release notes `/release-notes`: `web/src/app/release-notes/page.tsx` — `max-w-4xl`, subtitle `text-sm`, `px-4` header padding.
- Setup `/setup`: `web/src/app/setup/page.tsx` — `max-w-3xl`, header includes brand pill + step counter, subtitle `text-sm`.
- Invite `/invite` and Login `/login`: `web/src/app/invite/page.tsx`, `web/src/app/login/page.tsx` — full‑screen card layout, header typography diverges from hero pages.

## Recommendations
1) **Define a single hero header spec**
   - Height: `min-h-[260px] md:min-h-[320px]` for all hero headers (including Explore).
   - Title: `text-3xl sm:text-4xl font-serif font-semibold` (only vary size for special one‑offs).
   - Subtitle: `text-sm text-white/90` (reserve `text-xs` for metadata lines, not the main subtitle).
   - Spacing: `pt-10 pb-12`, `mt-10` on the title container for consistent vertical rhythm.

2) **Standardize header container width to match body width**
   - If body uses `max-w-5xl`, header should too (Explore, Planner, Profile, Shortlist, Feedback, About, How‑it‑works).
   - If body uses `max-w-4xl`, header should match (Settings, School detail, Release notes).
   - If body uses `max-w-3xl`, header should match (Setup, Invite, Login).

3) **Unify header padding rules**
   - Default hero padding: `px-4 sm:px-6` (or `px-5 sm:px-6`) but be consistent across pages.
   - Avoid mixing `px-4` and `px-5` on pages that should align.

4) **Normalize “back link” placement**
   - Use a single pattern: back link above title, left‑aligned, same typography.
   - Avoid right‑aligned back links in hero rows (About) if other pages are left‑aligned.

5) **Create a shared `HeroHeader` component**
   - Props: `title`, `subtitle`, `actions`, `backHref`, `meta`, `maxWidth`.
   - A “compact” variant can handle Login/Invite/Setup with a consistent typographic scale.

6) **Move warning copy out of hero where possible**
   - For Planner, keep the “verify” or policy notes inside the first content card to avoid tiny text in the hero.

## Proposed plan (tracking)
Status legend: Not started / In progress / Done

| Step | Status | Notes |
|---|---|---|
| Finalize hero header spec (title/subtitle sizes, padding, min-height) | Not started | Align with `docs/DESIGN.md` typography rules. |
| Decide standard widths for page groups (5xl / 4xl / 3xl) | Not started | Tie to body container width. |
| Design `HeroHeader` component API (props + variants) | Not started | Include back link + action slot. |
| Update pages to use `HeroHeader` | Not started | Start with Explore/Planner/Profile/Shortlist. |
| Normalize remaining pages (Settings, School detail, About, Feedback, Release notes, Setup, Login, Invite) | Not started | Make sure header/body widths align. |
| Re‑check mobile + desktop alignment and spacing | Not started | Visual pass on core pages. |

## Implementation log
- No changes applied yet (audit only).
