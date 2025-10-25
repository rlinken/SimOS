# GolfSimOS Design Guidelines

## Design Approach

**Selected Approach:** Modern SaaS Design System  
**Rationale:** As a B2B productivity platform with data-heavy admin interfaces and customer-facing booking widgets, we'll adopt a clean, professional aesthetic inspired by industry leaders like Linear, Stripe, and Vercel. This approach prioritizes clarity, efficiency, and scalability while maintaining visual sophistication.

**Key Design Principles:**
- **Clarity First:** Information hierarchy guides every decision
- **Professional Minimalism:** Clean interfaces that inspire confidence
- **Scalable Components:** Reusable, white-label-ready design elements
- **Frictionless Booking:** Customer-facing flows must be effortless

---

## Typography

**Font Families:**
- **Primary (Interface):** Inter or System UI Stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI'`)
- **Secondary (Data/Numbers):** JetBrains Mono or SF Mono for tabular data, booking times, and metrics

**Type Scale:**
- **Hero/Landing:** text-5xl to text-6xl (48-60px), font-bold
- **Page Titles:** text-3xl to text-4xl (30-36px), font-semibold
- **Section Headers:** text-2xl (24px), font-semibold
- **Component Headers:** text-lg (18px), font-medium
- **Body Text:** text-base (16px), font-normal
- **Secondary/Meta:** text-sm (14px), font-normal
- **Labels/Captions:** text-xs (12px), font-medium, uppercase tracking-wide

**Hierarchy Rules:**
- Admin dashboard titles: Bold, larger scale for quick scanning
- Booking forms: Medium weight, generous line-height (1.6) for readability
- Data tables: Monospace for numbers, regular weight for text
- Widget headers: Semibold to establish clear boundaries

---

## Layout System

**Spacing Primitives:** Use Tailwind units of **2, 4, 8, 12, 16** for consistent rhythm
- Micro spacing (buttons, inputs): p-2, p-4, gap-2
- Component spacing: p-4, p-6, gap-4
- Section spacing: p-8, py-12, gap-8
- Page-level padding: p-8, py-16

**Grid System:**
- **Admin Dashboard:** 12-column grid with sidebar (w-64 fixed)
- **Booking Calendar:** Full-width calendar with sidebar filters (2-column on desktop)
- **Forms:** Single column, max-w-2xl centered
- **Widgets:** Fluid containers, max-w-full with internal padding

**Container Widths:**
- Admin content: max-w-7xl
- Forms/Modals: max-w-2xl
- Embeddable widgets: 100% of parent container
- Sales pages: max-w-6xl

**Responsive Breakpoints:**
- Mobile-first approach
- Sidebar collapses to hamburger below `md:` (768px)
- Calendar switches to list view on mobile
- Admin tables scroll horizontally with sticky first column

---

## Component Library

### Navigation

**Admin Sidebar:**
- Fixed left sidebar (w-64), dark background
- Icon + label navigation items (h-10, px-4, rounded-md)
- Active state: subtle background fill
- Collapsible sections for Bookings, Memberships, Settings

**Top Bar:**
- Facility selector dropdown (multi-tenant)
- User profile menu (right-aligned)
- Notification bell icon with badge
- Height: h-16, border-b

**Customer Widget Navigation:**
- Minimal header with logo + booking type tabs
- Breadcrumb trail for multi-step booking flows
- Progress indicator (step 1 of 3)

### Forms & Inputs

**Text Inputs:**
- Height: h-12
- Padding: px-4
- Border radius: rounded-lg
- Border width: border
- Focus: ring-2 with offset

**Select Dropdowns:**
- Match input styling
- Custom chevron icon (right-aligned)
- Dropdown menu: shadow-lg, rounded-lg, max-h-60 with scroll

**Date/Time Pickers:**
- Integrated calendar popup (FullCalendar styling)
- Time slots displayed as grid buttons (h-10, rounded-md)
- Disabled slots: opacity-40, cursor-not-allowed

**Checkboxes/Radio:**
- Size: w-5 h-5
- Rounded: rounded-md (checkbox), rounded-full (radio)
- Custom checkmark icon

### Buttons

**Primary CTA:**
- Height: h-12
- Padding: px-6
- Font: font-semibold, text-base
- Rounded: rounded-lg
- Full-width on mobile, auto on desktop
- Loading state: spinner + "Processing..."

**Secondary:**
- Match primary sizing
- Border variant with hover fill transition

**Tertiary/Ghost:**
- No background, underline on hover
- Used for "Cancel" or secondary actions

**Icon Buttons:**
- Square: w-10 h-10
- Rounded: rounded-lg
- Used for filters, actions in tables

### Data Display

**Tables:**
- Row height: h-14
- Striped rows: subtle alternating backgrounds
- Sticky header on scroll
- Sortable columns: header with sort icon
- Action column: right-aligned icon buttons
- Mobile: Cards with stacked key-value pairs

**Cards:**
- Padding: p-6
- Rounded: rounded-xl
- Border: border with shadow-sm
- Hover: subtle shadow-md transition
- Usage: Membership tiers, bay cards, lesson packages

**Metrics/Stats Cards:**
- Large number display: text-3xl, font-bold, monospace
- Label below: text-sm, opacity-70
- Trend indicator: small arrow icon + percentage
- Grid layout: 2-4 columns on desktop

**Calendar:**
- FullCalendar integration with custom styling
- Bay-specific color coding per tier (visual legend)
- Event cards: rounded, with bay name + time
- Drag-to-book enabled for admins
- Day/Week/Month views with clear type hierarchy

### Overlays

**Modals:**
- Max width: max-w-2xl
- Backdrop: backdrop-blur-sm with dark overlay
- Content: p-8, rounded-2xl
- Header with close button (top-right)
- Footer with action buttons (right-aligned)

**Toasts/Notifications:**
- Position: top-right
- Width: w-96
- Auto-dismiss after 5s
- Success/Error/Info variants with icons
- Slide-in animation from right

**Tooltips:**
- Small, rounded-md
- Arrow pointing to trigger
- Max width: max-w-xs
- Appear on hover with 200ms delay

### Embeddable Widgets

**Booking Widget:**
- Clean white container with subtle border
- Step indicator at top
- Large, tappable date/time selection buttons
- Minimal form fields (name, email, phone)
- Single CTA: "Complete Booking"
- Responsive: full-width on mobile, max-w-lg on desktop

**Calendar Widget:**
- Month view with available slots highlighted
- Click to view day details
- Smooth transitions between views
- Loading skeleton states

**Membership Sales Widget:**
- Card-based tier comparison
- "Most Popular" badge on recommended tier
- Feature list with checkmarks
- Stripe checkout integration on click

---

## Sales Pages & Landing Pages

**Hero Section:**
- Height: min-h-[600px] (not forced to viewport)
- Two-column layout: Left (copy), Right (hero image or calendar preview)
- Headline: text-5xl, font-bold, leading-tight
- Subheadline: text-xl, opacity-80, max-w-2xl
- CTA buttons: Primary + Secondary side-by-side
- Background: subtle gradient or facility image with overlay

**Feature Sections:**
- Alternating image-text layouts (avoid repetition)
- Three-column grid for feature cards on desktop
- Each card: icon (top), title, 2-sentence description
- Icons: w-12 h-12, rounded-lg background

**Testimonials:**
- Two-column grid on desktop
- Card format with quote, name, facility name
- Photo: rounded-full, w-12 h-12

**Pricing/Membership Tiers:**
- Three-column comparison table
- Highlighted "Recommended" tier with border accent
- Feature list with checkmarks/crosses
- CTA button at bottom of each column

**Footer:**
- Three-column layout: About, Quick Links, Contact
- Newsletter signup form
- Social media icons
- Legal links (Privacy, Terms) at bottom

---

## Images

**Hero Images:**
- Use high-quality photos of indoor golf simulators in use
- Show bay equipment, golfers mid-swing, modern facility interiors
- Apply subtle overlay (opacity-30 to 40) for text contrast when needed
- Image placement: Right side on desktop (50% width), full-width on mobile above text

**Feature Section Images:**
- Calendar/dashboard screenshots (with blur on sensitive data)
- Bay equipment close-ups
- Happy golfers/instructors
- Modern facility interiors

**Placement Strategy:**
- Hero: Large, prominent right-column image
- Features: Alternate left/right with text
- Testimonials: Small circular headshots
- No images in admin dashboard (focus on data)

---

## Animations & Transitions

**Minimal Motion Strategy:**
- Subtle fade-ins on page load (200ms)
- Smooth transitions for dropdowns and modals (150ms ease-out)
- Hover state transitions: 100ms for background changes
- Loading skeletons: pulse animation for data fetching
- NO scroll-triggered animations
- NO parallax effects
- Focus on performance and accessibility

---

## Multi-Tenant Customization

**White-Label Ready:**
- Logo upload replaces default in sidebar and widgets
- Primary accent color picker (applied to buttons, links, active states)
- Custom domain support for embeds
- Facility name appears in top bar and page titles
- Theming CSS variables for easy override

**Widget Embed Code:**
- Generates iframe or script tag
- Responsive container queries
- Inherits parent website fonts (optional setting)
- Minimal CSS footprint to avoid conflicts