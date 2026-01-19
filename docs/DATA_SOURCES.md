# Data Sources

## Schools (Amsterdam secondary schools)
Source (preferred): Schoolwijzer Amsterdam (structured/API if available)
Reference UI: https://schoolwijzer.amsterdam.nl/en/vo/list/

Scope note: We only include schools that participate in the **central lottery/matching** system.
We exclude praktijkonderwijs, voortgezet speciaal onderwijs (VSO), kopklas, kleinschalig ondersteunend voortgezet onderwijs (kovo), and internationale schakelklassen.

Supplement: Some regular schools listed in the 2026 Keuzegids are not present in the Schoolwijzer API.
We maintain a small manual supplement list in the admin sync to keep those schools in the dataset.

We store:
- name
- address
- supported levels (normalized)
- website URL
- coordinates (lat/lng) if available, otherwise derived via geocoding

## Open days
Source: Schoolkeuze020 open days list
https://schoolkeuze020.nl/open-dagen/

Important: Open day times can change.
UI must always show:
- Warning: “Open day times can change — confirm on the school’s own website.”
- Last synced timestamp

We store per event:
- source = "schoolkeuze020"
- source_url (prefer the school’s own website link where available)
- last_synced_at
- change detection fields (optional): source_hash, last_seen_at, status
