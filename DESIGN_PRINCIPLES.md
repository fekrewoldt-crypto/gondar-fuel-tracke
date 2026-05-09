# Gondar Fuel Tracker - Design Principles

## Philosophy

- **Map-first**: Map takes 80%+ of screen
- **Progressive disclosure**: Show essential first, details on tap
- **Single action focus**: One primary action per screen
- **Speed**: No loading spinners, use skeletons

## App Analysis Findings

### Fuel/Energy Apps

**GasBuddy (US)**
- Layout: Map fills 70% top, list bottom sheet
- Navigation: Bottom tab bar (4 items), floating search
- Progressive disclosure: List shows name + price only; tap expands details
- Status: Color-coded prices (green/yellow/red), fuel type icons
- Animation: Smooth 200ms bottom sheet transitions
- Color: White background, green accent for savings

**Waze Fuel Layer**
- Layout: Full-screen map with minimal overlay
- Navigation: Floating search bar (top), fuel toggle chip
- Progressive disclosure: Tap station shows price in tooltip, full card on second tap
- Status: Large price number overlay on marker
- Animation: Markers bounce on selection
- Color: Dark map theme, high contrast markers

**African Fuel Apps**
- Limited options found; most African fuel tracking is via aggregator apps
- Common pattern: List-first with map toggle

### Fintech/Payments (Africa)

**Wave (Senegal)**
- Layout: Full-screen content, no map. Dominant action buttons
- Navigation: Bottom nav (4 items: Send, Cash Out, Save, More)
- Progressive disclosure: Home shows balance + last transaction. Tap reveals history
- Status: Large balance number, transaction status badges (green/pending/red)
- Animation: Fast 150ms transitions, successful transfers get confetti
- Color: Purple primary (#6941C6), black backgrounds, white text
- Design: Extremely minimal, one primary action per screen

**M-Pesa (Kenya)**
- Layout: Transaction-centric, icon grid home
- Navigation: Icon grid (8 items), no bottom tabs
- Progressive disclosure: Balance hidden by default, shown after auth
- Status: Clear receipt-style transaction confirmations
- Animation: Simple fade transitions
- Color: Green (#25D366) primary, trusted feel, high contrast

**TymeBank (South Africa)**
- Layout: Card-based, swipe between sections
- Navigation: Bottom tab bar (5 items)
- Progressive disclosure: Balance prominent, transactions in scrollable list
- Status: Transaction icons + amounts
- Animation: Card carousel transitions
- Color: Orange accent (#FF6B35), clean white surfaces

### Navigation Apps

**Uber**
- Layout: Map-first (85% screen), bottom sheet for details
- Navigation: Minimal header, bottom sheet for actions
- Progressive disclosure: Trip status prominent, driver details hidden until match
- Status: Large status banner, ETA countdown, map updates
- Animation: Smooth driver position updates, sheet slides at 300ms
- Color: Black UI, white text, green for confirmations

**Bolt**
- Layout: Map-first, cleaner than Uber
- Navigation: Top bar (menu, profile), bottom sheet
- Progressive disclosure: Single action focus per screen
- Status: Large pickup time, price estimate
- Animation: Quick 200ms transitions, smooth map panning
- Color: White background, teal accent (#00B682)

**Google Maps**
- Layout: Full-bleed map, search bar overlay at top
- Navigation: Bottom sheets for directions, side sheets for place details
- Progressive disclosure: Search bar always visible, full filters on tap
- Status: Live ETA updates, traffic overlay colors
- Animation: Continuous map movement, smooth sheet transitions
- Color: Light mode default, dark mode available

### Modern SaaS

**Linear**
- Layout: Left sidebar (240px), content area. Full height utilization
- Navigation: Keyboard-first (Cmd+K for search, shortcuts everywhere)
- Progressive disclosure: List shows title + status only, full details on expand
- Status: Color-coded priority dots, status badges
- Animation: Instant 100ms transitions, keyboard-driven, no loading states
- Color: Dark theme (#1C1C1E), purple accent, high contrast text

**Vercel**
- Layout: Dark background, content cards with subtle borders
- Navigation: Top nav, sidebar for project settings
- Progressive disclosure: Dashboard shows deploy status, click for details
- Status: Green/red deployment indicators, live build logs
- Animation: Subtle 200ms transitions, skeleton loading
- Color: Black background (#000000), white text, minimal color

**Raycast**
- Layout: Centered command palette, floating window
- Navigation: Keyboard-only, Cmd+K activates
- Progressive disclosure: Instant search results, detail on selection
- Status: Icon + name + description in results
- Animation: Instant (50ms), no perceptible delay
- Color: Dark floating window, blur backdrop

---

## Color System

```css
/* Dark theme with fuel status colors */
--bg-primary: #0a0a0f;      /* Deep black */
--bg-surface: #161622;        /* Card surfaces */
--bg-elevated: #1e1e2e;      /* Modals, sheets */

--status-available: #22c55e;   /* Green - fuel available */
--status-low: #eab308;        /* Yellow - running low */
--status-empty: #ef4444;      /* Red - out of fuel */

--accent-primary: #6366f1;    /* Indigo - trust */
--accent-secondary: #8b5cf6;  /* Purple - premium */

--text-primary: #f8fafc;      /* White text */
--text-secondary: #94a3b8;    /* Muted text */
```

### Light Theme (Optional - for sunlight readability)

```css
--bg-primary: #ffffff;
--bg-surface: #f1f5f9;
--bg-elevated: #ffffff;

--status-available: #16a34a;
--status-low: #ca8a04;
--status-empty: #dc2626;

--accent-primary: #4f46e5;
--accent-secondary: #7c3aed;

--text-primary: #0f172a;
--text-secondary: #64748b;
```

## Layout Structure

```
┌─────────────────────────────────┐
│ ☰  Gondar Fuel         EN ⚙️  │ <- Minimal header (40px)
├─────────────────────────────────┤
│    🔍 Search stations...       │ <- Floating search
├─────────────────────────────────┤
│ [🚗] [⛽] [🔧] [🛠️]           │ <- Category chips
├─────────────────────────────────┤
│                                 │
│         FULL MAP                │ <- Map fills space
│                                 │
│    [Station Markers]            │
│                                 │
│                           [+🗺️]│ <- FAB (bottom right)
└─────────────────────────────────┘

When logged in, bottom nav:
┌─────────────────────────────────┐
│              Map                │ <- Active
├─────────────────────────────────┤
│ [🗺️] [⛽] [📊] [👤]           │ <- Bottom nav (56px)
└─────────────────────────────────┘
```

## Key UI Patterns

### 1. Floating Search Bar
- Centered, rounded pill shape
- Icon + placeholder text
- Expand on tap, collapse on tap outside
- Height: 48px, padding: 12px 16px

### 2. Horizontal Chip Filters
- Below search, scrollable horizontally
- Single-select or multi-select
- Subtle active state (bg color change)
- Icons + text, padding: 8px 12px

### 3. Bottom Sheet for Details
- Slides up from bottom
- Drag handle at top (48px wide, 4px tall)
- Peek height: 30% (default collapsed)
- Full height on drag up
- Backdrop blur effect

### 4. Status Badges on Markers
- Colored dot based on status
- Pulse animation for urgent (empty stations)
- Tap to select, long-press for quick actions
- Size: 12px dot, 32px touch target

### 5. FAB for Quick Actions
- "+" expands to action list
- Options: Report, Navigate, Call
- 300ms expansion animation (spring easing)
- Position: bottom-right, 16px margin

### 6. Map Markers
- Custom SVG markers with status colors
- Clustered when zoomed out
- Selected state: larger + shadow
- Cluster shows count badge

## Modals vs Bottom Sheets

**Use Bottom Sheet for:**
- Station details (prices, services, reviews)
- Filters panel
- User profile
- Booking confirmation
- Report submission form

**Use Modal for:**
- Authentication (Sign In, Register)
- Payment flow
- Confirmation dialogs
- Settings that need full attention

## Typography

```css
--font-heading: 'Inter', system-ui, sans-serif;
--font-body: 'Inter', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', monospace; /* For numbers/prices */

--text-xs: 0.75rem;   /* 12px - captions, labels */
--text-sm: 0.875rem;  /* 14px - body small, chips */
--text-base: 1rem;   /* 16px - body text */
--text-lg: 1.125rem;  /* 18px - headings, station names */
--text-xl: 1.25rem;   /* 20px - titles */
--text-2xl: 1.5rem;   /* 24px - main titles, prices */
--text-3xl: 2rem;     /* 32px - hero numbers (balance) */
```

### Amharic Support
- Use Inter or Noto Sans for Amharic glyphs
- Allow 20% more width for Amharic text
- Test all UI text with Ethiopic characters

## Spacing System

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
```

## Animation Guidelines

```css
--transition-fast: 150ms ease-out;
--transition-base: 200ms ease-out;
--transition-slow: 300ms ease-out;

--spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* Bouncy */
--ease-out: cubic-bezier(0.16, 1, 0.3, 1); /* Smooth out */

/* Entrance animations */
@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes slideUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
}

@keyframes scaleIn {
    from { transform: scale(0.95); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
}

@keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.2); opacity: 0.8; }
}
```

## Dark Theme Specifics

- Never pure black (#000) - use #0a0a0f for depth
- Elevated surfaces progressively lighter (#161622, #1e1e2e)
- Keep text high contrast (f8fafc on dark backgrounds)
- Status colors double as accent colors
- Subtle borders (1px rgba(255,255,255,0.1))
- Card shadows use rgba(0,0,0,0.5)

## Ethiopian Context Considerations

### Device Constraints
- Target: 1-2GB RAM phones (低端手机)
- No heavy animations - keep under 60fps
- Lazy load all images
- Use system fonts to reduce bundle size

### Network Constraints
- 2G/3G common in Gondar area
- Skeleton screens, never spinners
- Cache map tiles aggressively
- Debounce search (300ms)
- Offline mode: show cached stations with stale indicator

### Accessibility
- High contrast ratios (7:1 minimum)
- Touch targets: 44x44px minimum
- Large text option in settings
- Screen reader support (ARIA labels)

### Localization
- RTL support ready (future Arabic/Hausa markets)
- Date/time in Ethiopian calendar option (not Ethiopian calendar - Ethiopian doesn't have its own)
- Currency: Ethiopian Birr (ETB) symbol: Birr or Br

## Mobile-First Guidelines

1. **Touch Targets**: Minimum 44x44px, preferred 48px
2. **Bottom Sheets**: Thumb-friendly, drag handle obvious
3. **No Hover States**: Design for touch only
4. **Swipe Gestures**:
   - Swipe left on station card to report
   - Swipe down to close sheets
   - Pull to refresh on lists
5. **Skeleton Loading**: Show layout structure while loading

## Performance Checklist

- [ ] Lazy load map tiles
- [ ] Virtual scrolling for lists (100+ items)
- [ ] Debounce search input (300ms)
- [ ] Cache responses in localStorage
- [ ] Skeleton screens, not spinners
- [ ] Compress images (WebP preferred)
- [ ] Code split (map module separate)
- [ ] Tree shake unused code

## Screen Breakdown

### 1. Home/Map Screen
- Header: 40px (hamburger, title, language, settings)
- Search bar: 48px floating, centered
- Filter chips: 40px horizontal scroll
- Map: remaining space (flex: 1)
- FAB: bottom-right
- Bottom nav (logged in): 56px

### 2. Station Detail Bottom Sheet
- Drag handle: 32px height
- Station name: text-xl
- Status badge: inline, colored
- Price: text-2xl with font-mono
- Services list: horizontal scroll chips
- Contact buttons: Call, Directions (2 columns)
- Reviews section: collapsible, 3 preview
- "See All" link: bottom

### 3. Report Station Flow
- Bottom sheet (no full modal)
- Current status shown
- Status picker: 3 large buttons (Available, Low, Empty)
- Price input (optional): numeric keyboard
- Submit: large button, loading state

### 4. My Profile Screen
- Bottom sheet or full screen
- Vehicle cards (swipe to delete)
- Add vehicle FAB
- Recent reports list
- Settings links

## Comparison: Current UI vs Target

| Aspect | Current | Target |
|--------|---------|--------|
| Map coverage | 50% | 85%+ |
| Visible elements | 15+ | 5-7 |
| Actions per screen | Multiple | One focus |
| Loading state | Spinner | Skeleton |
| Filters | Sidebar | Chips |
| Station details | Full page | Bottom sheet |

## Implementation Priority

1. **P0 (Must have)**:
   - Map-first layout
   - Bottom sheet for details
   - Floating search + chips
   - Dark theme
   - Status badges on markers

2. **P1 (Important)**:
   - Bottom nav for logged-in state
   - FAB with actions
   - Skeleton loading
   - Pull to refresh

3. **P2 (Nice to have)**:
   - Swipe gestures
   - Animation polish
   - RTL support
   - Offline mode

---

## Sources

Design principles derived from analysis of:
- GasBuddy, Waze - fuel tracking benchmarks
- Wave, M-Pesa, TymeBank - African fintech UX leaders
- Uber, Bolt, Google Maps - navigation UX standards
- Linear, Vercel, Raycast - modern SaaS design patterns

Additional context for Ethiopian market constraints.