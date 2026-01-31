# Feature Ideas (Proposed)

Status: Proposed ideas only (not implemented). No code changes implied.
Audience: planning and future roadmap.

---

## 0) Map view + directions (now planned)

Goal:
Add a map to Explore plus routing/directions to help families visualize schools and travel.

Plan link:
- `docs/MAP_FEATURE_PLAN.md`

Notes:
- Explore map uses the same filters as the list (advies + search).
- Home pin appears when postcode/advice are set.
- School detail shows cycling route and Google Maps link.
- Open Days gets a “Today” section with a “Take me there” link.

---

## 1) Gamification: milestones, achievements, progress

Goal:
Make the school-choice journey engaging for kids with visible progress.

Core concept:
Introduce a "Journey" component (progress bar / timeline / badge wall) that updates as tasks are completed.

Milestones (v1):
1. Home Base Set
   - Trigger: home address configured (or "area" / postcode set)
   - Reward: badge + progress bump
2. Shortlist Started
   - Trigger: first school saved to shortlist
   - Reward: badge + progress bump
3. Shortlist Builder
   - Trigger: X schools saved (e.g., 3 / 6 / 9 / 12)
   - Reward: tiered badges or a single badge with levels
4. School Rated
   - Trigger: first rating recorded (for any saved school)
   - Reward: badge + progress bump
5. All Shortlisted Schools Rated + Notes Added
   - Trigger: all schools in the final shortlist have:
     - a rating, and
     - at least one note (or "notes present")
   - Reward: badge + "decision-ready" progress state
6. Open Day Attended
   - Trigger: user marks an open day as attended (per school event)
   - Reward: badge per attendance (or streak counter)
7. Ranked List Finalised
   - Trigger: user marks "Ranked list locked"
   - Reward: badge + progress bump + visual "locked" state
8. Submitted to Government
   - Trigger: manual flag: "submitted our 12"
   - Reward: celebratory badge + progress bump
9. Placement Received
   - Trigger: manual flag: "placement received"
   - Reward: final celebration state

UX notes:
- Keep it lightweight: "tap to mark done" rather than complex flows.
- Make it kid-friendly: playful names, friendly icons, obvious progress.
- Avoid pressure: achievements encourage, not shame (no "failure" states).

Open questions:
- Is "invite family" optional or part of the journey?
- Should "notes + ratings" be required for completion or just encouraged?
- Do we show overall progress as % or as steps completed?
- Is "placement received" tracked as a manual flag or just a celebration prompt?

---

## 2) Data quality improvements: open days + richer school metadata

Problem statement:
- School list from a government API is stable and can be refreshed infrequently (e.g., yearly).
- Open-day information sourced from a third-party aggregator can be inaccurate.
- The app already includes warnings to verify on the school site.

Direction A: "Verified from School Website" enrichment
- Curate a higher-quality dataset by extracting open-day details + school metadata from official school websites.

Extractable fields (examples):
- Open day details: date/time, location, booking link, registration requirements
- School metadata: programs, facilities, profiles/streams, subject emphasis, unique offerings

Suggested output fields / tags:
- openDaySource: aggregator | school_site | manual
- openDayConfidence: low | medium | high
- lastVerifiedAt: timestamp
- bookingRequired: boolean (when detectable)
- schoolTags: list of extracted tags (e.g., bilingual, arts focus, STEM focus)

Direction B: Government inspection / report indicator
- Show a simple indicator on the school card/listing:
  - Green/Red (or "No issue" / "Attention")
  - If red, show how long ago the most recent red flag occurred ("time since")
- Data source: government reporting dataset that publishes inspection outcomes

---

## 3) Community "Report inaccurate data" mechanism

Goal:
Let parents/kids flag inaccurate open days or school info to improve reliability.

UX:
- Add a "Report issue" action on:
  - open day entries
  - school info pages (optional)
- Simple reason set:
  - "Date/time wrong"
  - "Event does not exist"
  - "Booking link wrong"
  - "Other"

Display logic (two options):
- Threshold warning: show a warning only after reportCount >= N (optionally within a time window)
  - Text: "This has been reported by other users - please double-check on the school website."
- Soft label: show a subtle "Reported" label immediately; elevate to warning after threshold.

Moderation / safety notes:
- Rate-limit reports per user/device to reduce spam.
- Show "last verified" + "source" alongside warnings for context.

---

## 4) Long-term: post-enrolment feedback & community ratings

Goal:
Create a feedback loop so future families can benefit from real experiences beyond open-day impressions.

Concept:
- After placement + a few months, prompt families:
  - "How did onboarding go?"
  - "How happy are you with the choice?"
  - optional short comments
- Aggregate into a community rating surface per school.

Constraints / risks:
- Prevent harassment / review wars.
- Protect child privacy and anonymity.
- Moderation and clear guidelines.

---

## 5) Access & authentication: make it easier for kids (without weakening security)

Problem statement:
- PWA home screen is workable, but long-term session persistence can fail.
- Children may not have email; magic-link re-auth can be annoying.

Options discussed:
Option 1 - PWA-like experience
- Ensure app launches in an app-like display mode (no browser chrome).

Option 2 - Hybrid wrapper (native shell)
- Wrap the web app in a native shell (e.g., Capacitor).
- Benefits: potentially more reliable session persistence + native affordances.
- Tradeoff: app-store packaging/release complexity.

Option 3 - Kid-friendly re-auth patterns
- Add a simpler secondary login method for kid devices:
  - short PIN (set by parent)
  - QR code pairing flow (parent email login once, then link kid device)

---

## 6) Monetisation options (conceptual)

Options:
- Freemium subscription: core planning free; premium for enhanced insights / curated data / advanced tools
- One-time unlock: pay once to enable premium features
- Partnerships/sponsorships: handled carefully to preserve trust
- Small add-ons: truly optional paid extras (avoid paywalling essentials)

Pricing note:
- No validated willingness-to-pay research yet (requires user discovery).
