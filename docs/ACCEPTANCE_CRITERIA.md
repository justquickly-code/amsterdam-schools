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
- Can add/remove from Top 12

## Open days
- Each open day includes a source link where possible
- If open days data is old (policy later): show “may be outdated” label

## Shortlist (Top 12)
- User can save schools to one list
- Top 12 is a ranked subset view capped at 12
- App prevents adding a 13th to the Top 12
- User can rank 1–12 (drag/drop or up/down)
- Export/print view shows ranked list with ratings and key notes
