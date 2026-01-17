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
| Accounts + Workspace model | 🟡 | Works for single workspace, but membership-sharing needs implementation (CL-140). |
| Home address (postcode + house number) | ✅ | Settings exists; used for commute compute. |
| Cycling time + distance (bike) | 🟡 | Works via cached compute, but admin route scoping must be fixed (CL-201). |
| Advies filtering + Either/Both toggle | ✅ | Implemented per acceptance criteria. |
| Open days best-effort with “verify” + last synced | ✅ | Implemented warning + ICS; change detection still needed (CL-202). |
| Save visit notes + 1–5 rating | ✅ | Visits + rating implemented. |
| Top 12 strict cap + ranked order | ✅ | Ranking implemented. |
| Planned open days | 🟡 | Open days page exists; “planned” status still to implement (CL-105). |
| Dashboard landing | 🟡 | Route exists in spec; implement real dashboard content + setup nudges (CL-102/103). |

## UX/navigation decisions (locked)
- Mobile bottom nav (CL-101)
- Dashboard default after login (CL-102)
- First-run setup gating (CL-103)
- Language setting NL default + EN optional (CL-104)
- One list + Top12 subset view (CL-107)