# amsterdam-schools
App for selecting secondary schools in amsterdam (for parents and kids)

README — “What this app does”
	•	Sign in with a parent email
	•	Browse Amsterdam secondary schools
	•	Set your child’s “advies” and filter schools accordingly
	•	Save visit notes per school
	•	Build a ranked Top 12 shortlist
	•	See open days (from Schoolkeuze020) with event type tags
	•	Export open days to calendar (.ics)
	•	(Optional) show bike commute time/distance when computed

README — “Data sources & trust”
	•	Schools list: [your seeded/imported dataset]
	•	Open days: Schoolkeuze020 “Open dagen” page (parsed snapshot)
	•	Warning: open day details can change; verify on the school website

README — “Admin tasks”
	•	Sync schools dataset
	•	Compute commute cache (bike mode) for all schools
	•	Sync open days (per school year label, e.g. 2025/26)
	•	Run once per year (Jan/Feb season) unless data changes

README — “Environment variables”
	•	NEXT_PUBLIC_SUPABASE_URL
	•	NEXT_PUBLIC_SUPABASE_ANON_KEY
	•	SUPABASE_SERVICE_ROLE_KEY (admin-only server routes)
	•	ADMIN_SYNC_TOKEN (protect admin sync endpoints)
	•	NEXT_PUBLIC_MAPBOX_TOKEN (commute computation)

Docs — “Schema overview” (short)
	•	workspaces (home coords + advies settings)
	•	schools
	•	commute_cache
	•	visits
	•	shortlists + shortlist_items (rank 1–12)
	•	open_days (source snapshot + event_type + links)
	•	data_sync_runs