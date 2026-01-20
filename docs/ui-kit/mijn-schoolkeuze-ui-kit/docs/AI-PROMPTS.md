# AI Prompts for Mijn Schoolkeuze

Use these prompts with Codex, Cursor, v0, or other AI coding assistants to build features using this UI kit.

---

## Setup Prompt (Use First)

```
I'm building a school-planning app called "mijn schoolkeuze" using Next.js, React, and Tailwind CSS.

The app uses a custom UI kit located in /components/schoolkeuze/ with these components:
- AppHeader: Top navigation with logo and menu
- BottomNav: Mobile bottom tabs (dashboard, schools, opendays, shortlist)
- SchoolCard/InfoCard: White cards with soft borders
- StickerChip: Status stickers (visited, planned, favourite)
- Chip/ChipGroup: Tags and filters
- Callout: Info/success/warning/error alerts
- ListRow/ListGroup: Data rows
- SearchInput: Search field
- SelectDropdown: Custom select
- SKButton: Buttons (primary/secondary/tertiary/outline/info/ghost)
- EmptyState: Empty content placeholder
- Toast: Notifications
- ProgressCard: Star-based progress

Theme colors:
- Background: #FAF8F5 (warm off-white)
- Cards: #FFFFFF (white)
- Primary: #DC4545 (red)
- Accent/Info: #14B8A6 (teal)
- Progress: #FBBF24 (yellow)
- Borders: #E5E1DB (soft)

Always use these components and theme colors. Mobile-first design.
```

---

## Feature Prompts

### Dashboard Page

```
Create a dashboard page for mijn schoolkeuze using the UI kit components.

Include:
1. AppHeader with the logo
2. A greeting "Hanna's Dashboard"
3. ProgressCard showing 5/7 stars completed
4. InfoCard with "Next important dates" showing:
   - Explore (Nov-Feb): 17 Nov - 13 Feb
   - Provisional advice (January): 1 Jan - 31 Jan
5. InfoCard with "Upcoming open days - Shortlist" showing school names and dates
6. BottomNav with dashboard active

Use ListRow/ListGroup inside the InfoCards.
```

### Schools List Page

```
Create a schools list page for mijn schoolkeuze.

Include:
1. AppHeader with title "Schools"
2. SearchInput for filtering schools
3. ChipGroup with filter chips: "VWO", "HAVO", "Gymnasium", "Nearby"
4. List of SchoolCards, each showing:
   - School name
   - Address
   - Distance (e.g., "2.3 km")
   - StickerChips for status (visited/planned/favourite)
   - Education types as Chips
5. BottomNav with schools active

Make the cards clickable to navigate to school details.
```

### School Detail Page

```
Create a school detail page for mijn schoolkeuze.

Include:
1. AppHeader with back button and school name
2. Hero section with school image placeholder
3. Row of StickerChips (visited, planned, favourite) that can be toggled
4. InfoCard "About" with school description
5. InfoCard "Education types" with Chips
6. InfoCard "Contact" with ListRows for address, phone, website
7. InfoCard "Open days" with ListRows showing dates
8. Fixed bottom bar with SKButton "Plan visit" (info variant)

No BottomNav on detail pages.
```

### Open Days Page

```
Create an open days calendar page for mijn schoolkeuze.

Include:
1. AppHeader with title "Open days"
2. SelectDropdown for month filter
3. Callout (info) about registration deadlines
4. List of SchoolCards grouped by date, showing:
   - Date header
   - School name
   - Time
   - StickerChip if planned
   - SKButton "Plan" (outline)
5. BottomNav with opendays active

Show an EmptyState if no open days match the filter.
```

### Shortlist Page

```
Create a shortlist/favorites page for mijn schoolkeuze.

Include:
1. AppHeader with title "Shortlist"
2. SearchInput for filtering
3. ProgressCard showing comparison progress
4. List of SchoolCards for favorited schools showing:
   - School name
   - All StickerChips
   - Quick action buttons
5. EmptyState if no favorites yet
6. BottomNav with shortlist active

Add a Callout suggesting to visit at least 3 schools.
```

### Settings/Profile Page

```
Create a settings page for mijn schoolkeuze.

Include:
1. AppHeader with title "Settings"
2. InfoCard "Profile" with:
   - Student name field
   - Current school field
   - Education level SelectDropdown
3. InfoCard "Preferences" with:
   - Location SearchInput
   - Distance SelectDropdown
4. InfoCard "Notifications" with toggle ListRows
5. SKButton "Save changes" (primary, full width)
6. SKButton "Log out" (tertiary)
```

### Comparison Page

```
Create a school comparison page for mijn schoolkeuze.

Include:
1. AppHeader with title "Compare schools"
2. Horizontal scrollable row of selected schools (max 3)
3. Comparison table using ListGroup with ListRows:
   - Education types
   - Distance
   - Open day dates
   - Rating
4. Callout if less than 2 schools selected
5. SKButton "Add school" (outline) if under 3 schools
```

---

## Component Prompts

### Add Loading State

```
Add a loading skeleton state to the schools list page.

Create SchoolCardSkeleton component with:
- Animated pulse effect
- Placeholder for title, address, chips
- Same dimensions as SchoolCard

Show 3 skeletons while data is loading.
```

### Add Pull-to-Refresh

```
Add pull-to-refresh functionality to the dashboard page.

Use a subtle loading indicator at the top.
Refresh the progress and upcoming dates data.
Show a Toast on successful refresh.
```

### Add Filter Sheet

```
Create a bottom sheet filter component for the schools list.

Include:
- Education type checkboxes
- Distance slider
- City SelectDropdown
- "Apply filters" SKButton (primary)
- "Reset" SKButton (tertiary)

Open from a filter icon in the AppHeader.
```

### Add Onboarding Flow

```
Create an onboarding flow with 3 steps for new users.

Step 1: Welcome screen with app explanation
Step 2: Select education level (chips)
Step 3: Set location (SearchInput)

Use SchoolCard for each step content.
Include progress dots at bottom.
SKButton "Next" / "Get started"
```

---

## Styling Prompts

### Dark Mode Support

```
Add dark mode support to the mijn schoolkeuze theme.

Dark mode colors:
- Background: #1F2937
- Cards: #374151
- Borders: #4B5563
- Keep primary red, teal, and yellow accents

Add a toggle in settings.
```

### Animations

```
Add subtle animations to the UI kit:

1. Cards: Scale up slightly on tap (active:scale-[0.98])
2. Chips: Bounce effect when selected
3. Page transitions: Fade in from bottom
4. Toast: Slide in from top
5. BottomNav icons: Bounce on tap

Use Tailwind transitions and transforms.
```

---

## Data Integration Prompts

### Connect to Supabase

```
Set up Supabase for mijn schoolkeuze with these tables:

1. schools: id, name, address, city, lat, lng, description, education_types[], image_url
2. open_days: id, school_id, date, start_time, end_time, registration_url
3. user_schools: id, user_id, school_id, is_favourite, is_visited, is_planned, notes
4. users: id, name, email, education_preference, location_city

Create API routes and hooks for:
- Fetching schools with filters
- Toggling favourite/visited/planned status
- Getting user's shortlist
```

### Add Search with Filters

```
Implement school search with filters:

1. Text search on name and city
2. Filter by education type (VWO, HAVO, etc.)
3. Filter by distance from user location
4. Sort by name, distance, or open day date

Use SWR for caching.
Show loading skeletons while searching.
Debounce search input by 300ms.
```
