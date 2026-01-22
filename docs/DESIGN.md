# Design System (MVP)

Style reference: iOS Settings / Apple Health (calm, list-first).

## Core patterns
- Lists and rows are the primary UI pattern.
- Cards are reserved mainly for Dashboard summary tiles.
- Chips are used sparingly: Planned, Attended, Ranked, Verify.

## Layout
- Mobile padding: p-4
- Desktop padding: p-6
- Section spacing: space-y-4
- Row padding: py-3

## Typography
- Page title: text-xl font-semibold
- Body: text-sm
- Secondary: text-xs text-muted-foreground

## Controls
- Segmented control for list scopes (All / My / Ranked)
- One primary CTA per page (others are outline/link)
- Sticky filters for long lists

## Color
- One accent color for active state + links
- Warning color only for “Verify/outdated” messaging

## Voice & tone
- Calm and friendly for parents.
- Informal and fun for kids where appropriate (tutorial content), while keeping dates/facts accurate.
- Setup/tutorial copy should be light and encouraging, but explicit about what each step is for.

## Progress bar (Dashboard)
- Show completion % and a short “recently completed” list (e.g., Profile done, Invite sent, Tutorial completed).
- Use the recent list to explain early % values so the progress feels grounded.

---

# Design Refresh Plan (Airbnb‑inspired, MVP‑safe)

## Goal
Create a more engaging, Airbnb‑style experience while preserving all MVP functionality, routes, and data rules.

## Principles
- **Public first**: show value before asking for login.
- **Journey‑oriented**: visual progress should feel encouraging, not like a score.
- **Respectable tone**: exciting for kids, not gimmicky; suitable for parents.
- **No functional changes**: only UI/UX and copy until explicitly approved.

## Decisions
- **Explore is the public entry** (hero search + school cards).
- **Login is triggered by “save/heart/notes”** actions.
- **Profile replaces Dashboard in nav** (Dashboard content lives inside Profile).
- **Shortlist UI label becomes “My List.”**
- **Advice is set in setup and only editable in Settings.** Show it as a badge.

## Screen Plan (approved)
1) **Explore / Home (Public)**
   - Hero search (postcode + advice), preview cards, journey teaser.
   - Logged‑out bottom nav: Explore / My List / Login.
2) **Explore / Schools List**
   - Photo cards, heart save, advice badge.
3) **My List**
   - Single list; top‑N ranked via drag; top‑N visually highlighted.
4) **Open Days (Planner)**
   - Date‑grouped cards, collapsed filters, “Add to planner”.
5) **Profile (Dashboard hub)**
   - Child name + avatar, journey progress, planner preview, settings list.
6) **School Detail**
   - Full‑page, destination style; notes + ratings present.
7) **Setup Wizard**
   - Step‑based progress; profile required, invite + tutorial optional.
8) **Login**
   - Simple email; “no password”; polite spam reminder; language toggle.

## Implementation Order
1) Theme + shared components (cards, buttons, journey)
2) Explore/Home (public hero)
3) Login (overlay‑styled route)
4) Schools list
5) School detail
6) Open days
7) My List (drag + top‑N highlight)
8) Profile (Dashboard hub)
9) Setup wizard restyle
