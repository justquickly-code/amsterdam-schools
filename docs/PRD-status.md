# PRD Status — Amsterdam Schools

Source of truth:
- docs/PRD.md
- docs/ACCEPTANCE_CRITERIA.md
- docs/ROUTES_UI.md

## Legend
- ✅ Done
- 🟡 Partial
- ⛔ Not started

## Core requirements
| Requirement | Status | Notes |
|---|---|---|
| Accounts + Workspace model | ✅ | Workspace sharing + invite/join flow implemented (CL-062). |
| Home address (postcode + house number) | ✅ | Settings exists; used for commute compute. |
| Cycling time + distance (bike) | ✅ | Cached compute exists; user-safe on-demand compute implemented. |
| Advies filtering + Either/Both toggle | ✅ | Implemented per acceptance criteria. |
| Open days best-effort with “verify” + last synced | ✅ | Implemented warning + ICS; year/event_type handling completed. User-facing wording should say “Open Days”. |
| Save visit notes + 1–5 rating | ✅ | Visits + rating implemented; notes are per member. |
| Ranked subset view + ranked order (cap by advice) | ✅ | Ranking implemented. |
| Planned open days | ✅ | Workspace-specific planned toggle implemented (CL-065). |
| Dashboard landing | ✅ | Dashboard content now lives in /profile (Profile hub). |
| Public Explore entry | ✅ | Explore (/), schools list, and open days support public view; auth required for save/plan actions. |

## UX/navigation decisions (locked)
- Mobile bottom nav (mobile only)
- Profile is default post-login hub (Dashboard content lives in /profile)
- First-run setup gating (CL-064)
- Language setting NL default + EN optional (CL-104)
- One list + ranked subset view (cap by advice) (CL-107)
- /schools deprecated (Explore lives at /)
