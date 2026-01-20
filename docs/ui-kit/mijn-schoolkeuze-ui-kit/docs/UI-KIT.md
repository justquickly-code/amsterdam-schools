# Mijn Schoolkeuze UI Kit

A mobile-first, calm and warm UI kit for school-planning applications.

## Installation

1. Download this project using the **Download ZIP** option or use the shadcn CLI
2. Copy the `/components/schoolkeuze/` folder to your project
3. Copy the theme variables from `/app/globals.css` to your project's CSS
4. Install the Nunito font (already configured in layout.tsx)

## Theme Colors

```css
--background: #FAF8F5;     /* Warm off-white */
--card: #FFFFFF;           /* White cards */
--border: #E5E1DB;         /* Soft borders */
--primary: #DC4545;        /* Red accent */
--accent: #14B8A6;         /* Teal (info/planned) */
--progress: #FBBF24;       /* Soft yellow */
```

---

## Components

### AppHeader

Top navigation with logo, title, and menu.

```tsx
import { AppHeader } from '@/components/schoolkeuze'

<AppHeader 
  title="Dashboard" 
  showNotification={true}
  onMenuClick={() => setMenuOpen(true)}
/>
```

**Props:**
- `title?: string` - Page title (default: none, shows logo)
- `showNotification?: boolean` - Show red notification dot
- `onMenuClick?: () => void` - Menu button handler

---

### BottomNav

Mobile bottom navigation bar.

```tsx
import { BottomNav } from '@/components/schoolkeuze'

<BottomNav 
  activeTab="dashboard"
  onTabChange={(tab) => router.push(`/${tab}`)}
/>
```

**Props:**
- `activeTab: 'dashboard' | 'schools' | 'opendays' | 'shortlist'`
- `onTabChange?: (tab: string) => void`

---

### SchoolCard / InfoCard

Content cards with soft borders and subtle elevation.

```tsx
import { SchoolCard, InfoCard } from '@/components/schoolkeuze'

// Basic card
<SchoolCard>
  <h3>Card Title</h3>
  <p>Card content</p>
</SchoolCard>

// Interactive card
<SchoolCard 
  onClick={() => navigate('/details')}
  className="hover:border-primary"
>
  Content here
</SchoolCard>

// Info card with header
<InfoCard title="Next important dates">
  <ListGroup>...</ListGroup>
</InfoCard>
```

---

### StickerChip

Status stickers for schools.

```tsx
import { StickerChip } from '@/components/schoolkeuze'

<StickerChip variant="visited" />   // ✅ Bezocht
<StickerChip variant="planned" />   // 📅 Gepland  
<StickerChip variant="favourite" /> // ⭐ Favoriet

// Small size
<StickerChip variant="visited" size="sm" />

// Interactive
<StickerChip 
  variant="favourite" 
  onClick={() => toggleFavourite()}
/>
```

---

### Chip / ChipGroup

General purpose chips for tags and filters.

```tsx
import { Chip, ChipGroup } from '@/components/schoolkeuze'

// Single chip
<Chip variant="default">VWO</Chip>
<Chip variant="primary">Gymnasium</Chip>
<Chip variant="info">Open dag</Chip>
<Chip variant="progress">In progress</Chip>

// Removable chip
<Chip 
  variant="primary" 
  removable 
  onRemove={() => removeFilter('vwo')}
>
  VWO
</Chip>

// Chip group
<ChipGroup>
  <Chip variant="primary">Filter 1</Chip>
  <Chip variant="info">Filter 2</Chip>
</ChipGroup>
```

---

### Callout

Informational callouts and alerts.

```tsx
import { Callout } from '@/components/schoolkeuze'

<Callout variant="info" title="Tip">
  Je kunt meerdere scholen vergelijken.
</Callout>

<Callout variant="success" title="Gelukt!">
  School toegevoegd aan je shortlist.
</Callout>

<Callout variant="warning" title="Let op">
  De inschrijving sluit over 3 dagen.
</Callout>

<Callout variant="error" title="Fout">
  Er ging iets mis. Probeer opnieuw.
</Callout>
```

---

### ListRow / ListGroup

List items for displaying data rows.

```tsx
import { ListRow, ListGroup } from '@/components/schoolkeuze'

<ListGroup title="Upcoming open days">
  <ListRow 
    label="Berlage Lyceum"
    value="21/01/2026"
  />
  <ListRow 
    label="Barlaeus Gymnasium"
    value="23/01/2026"
    onClick={() => navigate('/school/123')}
  />
</ListGroup>

// With icon
<ListRow 
  icon={<MapPin className="w-4 h-4" />}
  label="Amsterdam"
  value="2.3 km"
/>
```

---

### SearchInput

Search field with clear functionality.

```tsx
import { SearchInput } from '@/components/schoolkeuze'

const [search, setSearch] = useState('')

<SearchInput
  value={search}
  onChange={setSearch}
  placeholder="Zoek scholen..."
  onClear={() => setSearch('')}
/>
```

---

### SelectDropdown

Custom select dropdown.

```tsx
import { SelectDropdown } from '@/components/schoolkeuze'

const [city, setCity] = useState('')

<SelectDropdown
  value={city}
  onChange={setCity}
  placeholder="Kies een stad"
  options={[
    { value: 'amsterdam', label: 'Amsterdam' },
    { value: 'rotterdam', label: 'Rotterdam' },
    { value: 'utrecht', label: 'Utrecht' },
  ]}
/>
```

---

### SKButton

Buttons in multiple variants.

```tsx
import { SKButton } from '@/components/schoolkeuze'

// Primary (red)
<SKButton variant="primary">Inschrijven</SKButton>

// Secondary (muted background)
<SKButton variant="secondary">Annuleren</SKButton>

// Tertiary (text only)
<SKButton variant="tertiary">Meer info</SKButton>

// Outline
<SKButton variant="outline">Bekijk details</SKButton>

// Info (teal)
<SKButton variant="info">Plan bezoek</SKButton>

// Ghost
<SKButton variant="ghost">Sluiten</SKButton>

// Sizes
<SKButton size="sm">Small</SKButton>
<SKButton size="md">Medium</SKButton>
<SKButton size="lg">Large</SKButton>

// Full width
<SKButton fullWidth>Volledige breedte</SKButton>

// With icon
<SKButton variant="primary">
  <Plus className="w-4 h-4 mr-2" />
  Toevoegen
</SKButton>
```

---

### EmptyState

Placeholder for empty content.

```tsx
import { EmptyState } from '@/components/schoolkeuze'

<EmptyState
  icon={<Heart className="w-12 h-12" />}
  title="Geen favorieten"
  description="Je hebt nog geen scholen als favoriet gemarkeerd."
  action={
    <SKButton variant="primary" onClick={() => navigate('/schools')}>
      Scholen bekijken
    </SKButton>
  }
/>
```

---

### Toast / ToastContainer

Notification toasts.

```tsx
import { Toast, ToastContainer, useToast } from '@/components/schoolkeuze'

// In your app root
<ToastContainer />

// Using the hook
const { showToast } = useToast()

showToast({
  variant: 'success',
  title: 'Opgeslagen',
  message: 'Je wijzigingen zijn opgeslagen.'
})

showToast({
  variant: 'error', 
  title: 'Fout',
  message: 'Er ging iets mis.'
})

showToast({
  variant: 'info',
  title: 'Tip',
  message: 'Je kunt meerdere scholen selecteren.'
})
```

---

### ProgressCard

Star-based progress visualization.

```tsx
import { ProgressCard } from '@/components/schoolkeuze'

<ProgressCard
  completed={5}
  total={7}
  message="You're all set. Nice work!"
  recentActions={['Overview done', 'Visit marked']}
/>
```

---

## Page Layout Template

```tsx
import {
  AppHeader,
  BottomNav,
  SchoolCard,
} from '@/components/schoolkeuze'

export default function SchoolsPage() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Schools" />
      
      <main className="px-4 py-4 space-y-4">
        <SchoolCard>
          {/* Content */}
        </SchoolCard>
      </main>
      
      <BottomNav activeTab="schools" />
    </div>
  )
}
```

---

## Design Tokens Quick Reference

| Token | Value | Usage |
|-------|-------|-------|
| `bg-background` | #FAF8F5 | Page backgrounds |
| `bg-card` | #FFFFFF | Card backgrounds |
| `border-border` | #E5E1DB | Soft borders |
| `bg-primary` | #DC4545 | Primary actions |
| `bg-accent` | #14B8A6 | Info/planned states |
| `bg-progress` | #FBBF24 | Progress indicators |
| `text-foreground` | #1F2937 | Main text |
| `text-muted-foreground` | #6B7280 | Secondary text |
