# Design System (MVP)

Style reference: iOS Settings / Apple Health (calm, list-first).

## Core patterns
- Lists and rows are the primary UI pattern.
- Cards are reserved mainly for Dashboard summary tiles.
- Chips are used sparingly: Planned, Attended, Ranked, Verify.

## Layout
- Mobile padding: p-4
- Desktop padding: p-6
- Section spacing: space-y-4
- Row padding: py-3

## Typography
- Page title: text-xl font-semibold
- Body: text-sm
- Secondary: text-xs text-muted-foreground

## Controls
- Segmented control for list scopes (All / My / Ranked)
- One primary CTA per page (others are outline/link)
- Sticky filters for long lists

## Color
- One accent color for active state + links
- Warning color only for “Verify/outdated” messaging

## Voice & tone
- Calm and friendly for parents.
- Informal and fun for kids where appropriate (tutorial content), while keeping dates/facts accurate.
- Setup/tutorial copy should be light and encouraging, but explicit about what each step is for.

## Progress bar (Dashboard)
- Show completion % and a short “recently completed” list (e.g., Profile done, Invite sent, Tutorial completed).
- Use the recent list to explain early % values so the progress feels grounded.
