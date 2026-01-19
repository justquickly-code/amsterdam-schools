# Acceptance Criteria (MVP)

## Workspace settings
- User can set postcode + house number
- User can set advies levels (single or combined)
- User can set match mode: either/both (only relevant for combined)
- Settings persist and validate

## Schools list
- Shows only schools matching advies by default
- If match mode = either: show schools with either level
- If match mode = both: show schools that offer both levels
- If home location is set: shows cycling time (min) + distance (km)
- Can sort by cycling time (ascending)

## School detail
- Shows school website link
- Shows open days with:
  - “verify on school website” warning
  - last synced timestamp
- Can add a visit note
- Can set a 1–5 star rating
- Can add/remove from ranked list (cap depends on advice)

## Open days
- Each open day includes a source link where possible
- If open days data is old (policy later): show “may be outdated” label

## Shortlist (Ranked list)
- User can save schools to one list
- Ranked list is a subset of the saved list; cap depends on advice (4/6/12)
- Users can add any number to the saved shortlist, but only rank up to the cap
- If advice changes, keep the saved list and adjust the rankable cap
- User can rank 1–N (drag/drop or up/down), where N = cap
- Export/print view shows ranked list with ratings and key notes
