# Routes & UI

## Pages (MVP)
- / (Explore / public landing)
  - public hero search (postcode + advies)
  - public list of schools (minimal filters)
  - logged-in view adds search + sort + advice badge
  - save/heart/notes actions require login
  - “Start je lijst” CTA routes to /login

- /profile (Dashboard hub)
  - child name + address + advies badge
  - journey progress (stepper, not stars)
  - quick stats: My list / Planned / Visited
  - menu links (settings, language, how-it-works, feedback, admin if allowlisted, about, invite, logout)

- /schools/[id] (School detail)
  - school info + website link
  - open days list (with warning + last synced)
  - planned toggle per open day
  - visit notes (per member) + shared 1–5 star rating
  - category ratings (emoji scale) + Fit % badge
  - add/remove from ranked list

- /planner (Open Days)
  - chronological list
  - filters: event type, date range, shortlist-only
  - planned status toggle (login required)

- /shortlist (My List)
  - single list of saved schools
  - ranked subset (cap depends on advice: 4/6/12)
  - reorder ranked items with up/down controls

- /shortlist/print (Print export)
  - printable ranked list

- /release-notes
  - user-facing overview of main features + recent changes

- /feedback
  - submit feedback (bug/idea/question/other)
  - list your feedback + admin responses

- /how-it-works
  - kid-friendly tutorial with key dates from Keuzegids (mainstream lottery path)
  - clarify: this is the Amsterdam Year‑8 → Secondary 2026 process (not app UI training)

- /settings
  - workspace name
  - home location: postcode + house number
  - advies: single or combined (combined requires both levels)
  - workspace members (invite/add)

- /admin (Admin hub, allowlisted only)
  - entry point to admin sync tools
  - requires admin allowlist + admin token guard

- /admin/feedback (Admin)
  - review feedback
  - respond + set status

## UI states (every page)
- Loading
- Empty state (what to do next)
- Error state (what happened + retry)

## Global UI
- Bottom nav (mobile only):
  - Logged out: Explore / My List / Login
  - Logged in: Explore / My List / Open Days / Profile
- Top-right menu (desktop only):
  - Language toggle
  - Login/Signup when logged out
  - Profile, Feedback, Print/Export, Admin (allowlisted), Logout when logged in
  - About + How it works always visible

## Setup flow (first login)
- Step 1: Profile details (mandatory). Explain why (advies filtering + commute times).
- Step 2: Invite family (optional). Explain shared workspace + per‑member notes.
- Step 3: How it works tutorial (optional). Emphasize it’s the Amsterdam 2025/26 process.
- Invited users (new accounts) can start tutorial or skip to Dashboard.
- Explore stores postcode + advice locally so setup can prefill after login.

## Routing note
- /planner is the canonical route.
- /open-days should redirect to /planner to preserve old links.
- /schools list view is removed; Explore now lives at /.
- User-facing wording should say “Open Days” (avoid “planner”).
