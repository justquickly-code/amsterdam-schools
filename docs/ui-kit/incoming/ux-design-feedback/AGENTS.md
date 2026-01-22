# Scholenwijzer Amsterdam - Codex Context

## Project Overview
A mobile-first school selection app for Amsterdam kids (11-12 years old) choosing secondary schools. The UX is inspired by Airbnb - discovery-focused, visually engaging, and fun rather than bureaucratic.

## Target Audience
- Primary: Dutch pre-teens exploring secondary school options
- Secondary: Parents helping with the process
- Language: All UI copy is in **Dutch**

## The User Journey
1. **Start** - Enter postcode and schooladvies (school recommendation level)
2. **Ontdekken** - Browse and discover schools
3. **Shortlist** - Save favorites and rank them
4. **Open Dagen** - Plan and attend school open days
5. **Keuze** - Make final decision

## Design System

### Colors (defined in `app/globals.css`)
- **Primary**: Warm coral/salmon (`oklch(0.65 0.18 25)`) - used for CTAs, hearts, accents
- **Accent**: Teal (`oklch(0.7 0.12 185)`) - secondary actions, tags
- **Background**: Warm off-white (`oklch(0.98 0.005 80)`)
- **Foreground**: Dark blue-gray (`oklch(0.2 0.02 250)`)

### Typography
- **Sans (body)**: DM Sans - friendly, modern
- **Serif (headings)**: Fraunces - warm, distinctive
- Use `font-sans` for body text, `font-serif` for hero headings

### Spacing & Radius
- Large border radius: `rounded-2xl` for cards, `rounded-xl` for buttons
- Consistent padding: `p-4` for cards, `p-6` for sections
- Touch targets: minimum 44px for all interactive elements

## Component Patterns

### School Cards (`components/school-card.tsx`)
Airbnb-style cards with:
- Large photo with heart overlay
- School name + neighborhood
- Quick stats: distance, student count, rating
- Vibe tags: "Creatief", "Sportief", etc.
- Friends badge when applicable

### Bottom Navigation (`components/bottom-nav.tsx`)
Fixed bottom nav with 4 tabs:
- Ontdek (Search icon) → `/`
- Mijn Lijst (Heart icon) → `/favorites`
- Open Dagen (Calendar icon) → `/calendar`
- Profiel (User icon) → `/profile`

### Journey Progress (`components/journey-progress.tsx`)
Horizontal progress indicator showing the 5-step journey with icons and connecting lines.

## File Structure
```
/app
  /page.tsx              # Homepage with search + school grid
  /favorites/page.tsx    # Ranked favorites list
  /calendar/page.tsx     # Open dagen calendar
  /profile/page.tsx      # User profile & settings
  /school/[id]/page.tsx  # School detail page
/components
  /hero-section.tsx      # Homepage hero with search
  /school-card.tsx       # Reusable school card
  /journey-progress.tsx  # Progress tracker
  /bottom-nav.tsx        # Fixed bottom navigation
  /ui/*                  # shadcn/ui components
/lib
  /data.ts               # Mock school data
  /utils.ts              # Utility functions (cn)
```

## Key Conventions

### State Management
- Use React `useState` for local component state
- Favorites stored in state (would connect to database in production)

### Styling
- Tailwind CSS v4 with semantic design tokens
- Mobile-first responsive design
- Use `cn()` utility for conditional classes

### Images
- School photos in `/public/images/`
- Always include alt text in Dutch
- Use `object-cover` for consistent aspect ratios

### Interactive Elements
- Hearts for favoriting (red fill when active)
- Cards link to detail pages
- Bottom nav highlights active route

## Dutch Terminology
- Ontdek = Discover
- Mijn Lijst = My List
- Open Dagen = Open Days
- Schooladvies = School advice/recommendation level
- Postcode = Postal code
- Vrienden = Friends
- Bekijken = View
- Opslaan = Save
- Delen = Share

## Things to Avoid
- Login walls before value is shown
- Government/bureaucratic language
- Empty star ratings (use journey progress instead)
- Overwhelming text blocks
- Desktop-first patterns
