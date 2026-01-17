# PRD — Amsterdam Schools Open Day Planner

## Goal
Help a family plan Amsterdam secondary school open days, capture notes + a 1–5 star rating, and produce a ranked Top 12 shortlist (cap 12) within a larger saved list.

## Key requirements
- Accounts + Workspace (shareable with friends)
- Home address: NL postcode + house number
- Cycling time + distance to each school (bike)
- Advies filtering (single or combined) + toggle for Either/Both match
- Open days are “best effort”: show last synced + warn users to verify on school websites
- One saved list of schools with a ranked Top 12 subset (cap 12)
- One rating only (1–5 stars)
- Auth: Parent email login (Supabase). One family account used across devices. Sessions should stay logged in by default.
- Save many schools; Top 12 is a ranked subset view capped at 12.

## Data sources (high level)
- Schools: Schoolwijzer Amsterdam (prefer API/structured source)
- Open days: Schoolkeuze020 open days list (non-authoritative)
