# PRD — Amsterdam Schools Open Day Planner

## Goal
Help a family plan Amsterdam secondary school open days, capture notes + a 1–5 star rating, and produce a ranked shortlist (cap depends on advice) within a larger saved list.

## Key requirements
- Accounts + Workspace (shareable with friends)
- Home address: NL postcode + house number
- Cycling time + distance to each school (bike)
- Advies filtering (single dropdown with combined options; combined advice requires schools that offer both levels)
- Open days are “best effort”: show last synced + warn users to verify on school websites
- One saved list of schools with a ranked subset (cap depends on advice)
- One rating only (1–5 stars)
- Auth: Parent email login (Supabase). One family account used across devices. Sessions should stay logged in by default.
- Save many schools; the ranked subset cap depends on advice (4/6/12). The saved list never shrinks if advice changes.
- Scope: focus on schools in the **central lottery/matching** system. Exclude praktijkonderwijs, voortgezet speciaal onderwijs (VSO), kopklas, kleinschalig ondersteunend voortgezet onderwijs (kovo), and internationale schakelklassen.
- Tutorial: an optional, kid-friendly “How it works” walkthrough based on Keuzegids dates. Accessible from setup and from the top-right menu.
- Profile (Dashboard hub): show the next important date(s) from the lottery timeline.
- Setup flow: Profile details (mandatory) → Invite family (optional) → “How it works” tutorial (optional).
  - Explain why profile data is needed (advies filtering + commute times).
  - Invite step explains shared workspace and per-member notes.
  - Tutorial copy must clearly explain the **Amsterdam Year‑8 → Secondary 2026 process**, not app UI training.
- Shortlist guidance (from Keuzegids FAQ): recommended minimum list length depends on advice:
  - vmbo-b / vmbo-bk / vmbo-k / vmbo-kgl-tl: **4 schools**
  - vmbo-gl-tl / vmbo-gl-tl-havo: **6 schools**
  - havo / havo-vwo / vwo: **12 schools**
  - Note: if adding profile classes at the same school, the list may need to be longer.
- Category ratings: shared per school with emoji scale; show Fit % badge based on rated categories (ignore “unsure”).

## Data sources (high level)
- Schools: Schoolwijzer Amsterdam (prefer API/structured source)
- Open days: Schoolkeuze020 open days list (non-authoritative)
