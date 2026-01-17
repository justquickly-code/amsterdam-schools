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
| Accounts + Workspace model | 🟡 | Works for single workspace, but membership-sharing needs implementation (CL-062). |
| Home address (postcode + house number) | ✅ | Settings exists; used for commute compute. |
| Cycling time + distance (bike) | 🟡 | Cached compute exists; user-safe on-demand compute still needed (CL-034). |
| Advies filtering + Either/Both toggle | ✅ | Implemented per acceptance criteria. |
| Open days best-effort with “verify” + last synced | ✅ | Implemented warning + ICS; year/event_type handling still needed (CL-055/056). User-facing wording should say “Open Days”. |
| Save visit notes + 1–5 rating | ✅ | Visits + rating implemented. |
| Top 12 subset view + ranked order | ✅ | Ranking implemented. |
| Planned open days | 🟡 | Open days page exists; “planned” status still to implement (CL-065). |
| Dashboard landing | 🟡 | Route exists in spec; implement real dashboard content + setup nudges (CL-063/064). |

## UX/navigation decisions (locked)
- Mobile bottom nav (CL-101)
- Dashboard default after login (CL-063)
- First-run setup gating (CL-064)
- Language setting NL default + EN optional (CL-104)
- One list + Top12 subset view (CL-107)
