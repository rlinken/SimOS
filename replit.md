# GolfSimOS - Multi-Tenant Golf Simulator Management Platform

## Project Overview
GolfSimOS is a multi-tenant SaaS platform for indoor golf simulator facilities to manage bay bookings, memberships, lessons, club fittings, and products. The platform supports multiple facilities with customizable configurations and includes embeddable widgets for websites.

## Current Status (MVP Phase)

### Completed Features
- ✅ Multi-tenant database schema with PostgreSQL
- ✅ User authentication with Replit Auth (OIDC)
- ✅ Role-based access control (super_admin, owner, administrator, instructor, club_fitter, support, customer, member)
- ✅ Smart bay assignment algorithm (auto-assigns bay with lowest usage)
- ✅ Backend API with all CRUD endpoints (including PATCH for updates)
- ✅ Frontend pages: Landing, Dashboard, Bays, Bookings, Members, Memberships, Lessons (with Packages), Fittings, Facilities, Settings, Contacts, Sales, Offers, Transformation Packages, Staff, Schedule
- ✅ Real-time dashboard statistics from actual data
- ✅ Professional golf-themed UI with Tailwind CSS
- ✅ Lesson packages (pay-per-lesson, bundles, recurring subscriptions)
- ✅ Club fitting scheduling with customer selection
- ✅ CRM with lead tracking (new, contacted, qualified, converted, lost)
- ✅ Shareable membership purchase URLs with public access (no login required)
- ✅ Transformation Packages - comprehensive training bundles with lessons, club fittings, bay access, and on-course practice
- ✅ **Edit functionality for all product/service pages** - Click any card to edit (Memberships, Transformation Packages, Fittings, Offers, Lessons)
- ✅ **Payment Settings** - Each facility can configure their own Stripe credentials for payment processing

### In Progress
- 🔨 Facility onboarding wizard
- 🔨 Embeddable booking widgets
- 🔨 Widget customization dashboard
- 🔨 Shareable purchase URLs (memberships complete, lessons/offers/bookings pending)

### Deferred (User Request)
- ⏸️ Stripe Connect integration (build core functionality first)

## Technical Architecture

### Database Schema
- **facilities**: Multi-tenant core with subdomain, branding, feature flags, payment settings (Stripe credentials per facility)
- **users**: Extended Replit Auth with facility scoping and roles
- **bays**: Simulator bays with tiers (standard/premium/vip), status tracking
- **bookings**: Reservations with auto bay assignment, payment tracking
- **membership_tiers**: Customizable membership plans per facility
- **lessons**: Instructor-student scheduling
- **lesson_packages**: Lesson pricing packages (pay-per-lesson, bundles, recurring subscriptions)
- **transformation_packages**: Comprehensive training programs bundling lessons, fittings, bay access, and on-course practice
- **fittings**: Club fitting appointments
- **leads**: CRM lead tracking with status pipeline
- **sessions**: Replit Auth session storage

### Key Design Decisions
1. **Smart Bay Assignment**: When booking without bayId, backend selects bay with lowest usage hours
2. **Multi-tenant Isolation**: All queries filtered by facilityId (except super-admin)
3. **Role-Based Access**: Middleware checks user.role for protected endpoints
4. **Golf-Themed Design**: Primary green (#22c55e), professional spacing, clear hierarchy

### API Endpoints

#### Authentication (Replit OIDC)
- `GET /api/login` - Initiate OAuth flow
- `GET /api/callback` - OAuth callback
- `GET /api/logout` - End session
- `GET /api/auth/user` - Get current user

#### Facilities (Super Admin only)
- `GET /api/facilities` - List all facilities
- `POST /api/facilities` - Create new facility

#### Bays
- `GET /api/bays` - List bays for user's facility
- `POST /api/bays` - Create bay (admin only)

#### Bookings
- `GET /api/bookings` - List bookings with enriched bay/user data
- `POST /api/bookings` - Create booking (auto-assigns bay if not provided)

#### Memberships
- `GET /api/memberships` - List membership tiers
- `POST /api/memberships` - Create membership tier (admin only)
- `PATCH /api/memberships/:id` - Update membership tier (admin only)

#### Members
- `GET /api/members` - List members with tier data

#### Lessons
- `GET /api/lessons` - List lessons with instructor/student data
- `POST /api/lessons` - Create lesson

#### Lesson Packages
- `GET /api/lesson-packages` - List lesson packages
- `POST /api/lesson-packages` - Create lesson package (admin only)
- `PATCH /api/lesson-packages/:id` - Update lesson package (admin only)
- `DELETE /api/lesson-packages/:id` - Delete lesson package (admin only)

#### Transformation Packages
- `GET /api/transformation-packages` - List transformation packages
- `POST /api/transformation-packages` - Create transformation package (admin only)
- `PATCH /api/transformation-packages/:id` - Update transformation package (admin only)
- `DELETE /api/transformation-packages/:id` - Delete transformation package (admin only)

#### Fittings
- `GET /api/fittings` - List fittings with fitter/user data
- `POST /api/fittings` - Create fitting
- `PATCH /api/fittings/:id` - Update fitting (admin only)

#### Dashboard
- `GET /api/dashboard/stats` - Real-time facility statistics

#### Payment Settings (Admin only)
- `GET /api/payment-settings` - Get payment settings for facility (secret key masked for security)
- `PATCH /api/payment-settings` - Update payment settings (Stripe credentials, payment provider, payments enabled)

#### Public Purchase Pages (No Authentication)
- `GET /api/public/membership/:id` - Get membership tier details with facility branding
- `GET /api/public/lesson-package/:id` - Get lesson package details with facility branding
- `GET /api/public/transformation-package/:id` - Get transformation package details with facility branding
- `GET /api/public/offer/:id` - Get offer details with facility branding
- `GET /api/public/facility/:id` - Get facility details and bays for booking

## Development Workflow

### Running the Application
```bash
npm run dev  # Starts Express (backend) + Vite (frontend) on port 5000
```

### Database Management
```bash
npm run db:push  # Sync schema to PostgreSQL
```

### Environment Variables
- `DATABASE_URL` - PostgreSQL connection (auto-provided by Replit)
- `SESSION_SECRET` - Session encryption key
- `REPL_ID`, `ISSUER_URL`, `REPLIT_DOMAINS` - Replit Auth config

## User Workflows

### New Facility Onboarding (In Progress)
1. Super admin creates facility via /facilities page
2. Facility admin logs in and sets up:
   - Bays (name, tier, status)
   - Membership tiers (pricing, hours, bay access)
   - Services (enable/disable lessons, fittings)
3. Invite members and instructors

### Booking Flow
1. User navigates to /bookings
2. Clicks "New Booking"
3. Selects date, start time, end time, type
4. Backend auto-assigns optimal bay based on:
   - Active status
   - Lowest usage hours
   - Availability during requested time
5. Booking created and appears in list

### Member Management
1. Users self-register or admin invites
2. Admin assigns membership tier
3. Monthly credits auto-populate
4. Bay access controlled by tier settings

## Next Phase Features (Planned)
1. Bay rotation & maintenance tracking
2. Instructor commission system
3. Advanced analytics & reporting
4. GoHighLevel CRM integration
5. Multi-location support for chains
6. Custom domain support per facility
7. Template marketplace for quick setup

## Sidebar Navigation Organization

The sidebar is organized into three sections with **Operations first** for daily activities:

### Navigation
- Dashboard
- Facilities (super admin only)
- Settings

### Operations (Daily Activities - Appears First)
- Schedule (Upcoming activities and calendar)
- Bookings (Bay reservations)
- Lessons (Instruction sessions)
- Fittings (Club fitting appointments)

### Business (Configuration & Sales - Appears Second)
- Bays (Simulator bay configuration)
- Memberships (Membership tiers/plans)
- Packages (Transformation packages - renamed from "Transformation Packages")
- Contacts (Leads and CRM)
- Members (Membership members)
- Sales (Revenue tracking and analytics)
- Offers (Promotional campaigns and sales pages)
- Staff (Team member management)

**Design Rationale:** Operations section contains daily service delivery tasks and appears first to optimize workflow for facility staff who primarily interact with bookings, lessons, and fittings. Business section contains configuration, setup, and sales/marketing tasks used less frequently.

## Shareable Purchase URLs

Admins can copy shareable links for memberships that allow customers to view details and sign up without logging in.

### Available Purchase Pages
- **Memberships**: `/buy/membership/:id` - Complete implementation
  - Displays tier details, pricing, and benefits
  - Customer signup form (name, email, phone)
  - Facility branding (logo, colors)
  - Success/error state handling
  - **Admin Action**: Click "Copy Shareable Link" button on any membership tier card

- **Transformation Packages**: `/buy/transformation-package/:id` - Complete implementation
  - Displays package details with all included services (lessons, fittings, bay access, on-course practice)
  - Billing frequency display (one-time, monthly, quarterly, annual)
  - Duration and enrollment limits
  - Customer signup form with waitlist support for full packages
  - Facility branding
  - **Admin Action**: Navigate to Operations > Transformation Packages → Click "Copy Shareable Link" button on any package card

### Pending Implementation (Same Pattern)
- **Lesson Packages**: `/buy/lesson-package/:id` 
- **Offers**: `/buy/offer/:id`
- **Bookings**: `/buy/booking/:facilityId`

### Implementation Details
- Public API endpoints return data without authentication
- Purchase pages collect customer information (Stripe integration deferred)
- All dynamic content includes data-testid attributes for testing
- Error handling distinguishes network errors from not-found states
- Responsive design follows design guidelines

## Notes
- Database uses `varchar` UUIDs for all primary keys
- All timestamps in UTC
- Frontend uses TanStack Query v5 for data fetching
- Sidebar navigation with Shadcn components
- Design follows design_guidelines.md (golf theme, spacing, interactions)
- Lesson package types: pay_per_lesson, package, recurring with billing intervals (monthly, quarterly, annual)
- Lead status tracking uses enum: new, contacted, qualified, converted, lost
- Shareable purchase URLs use pattern: `/buy/{type}/{id}` (public access, no authentication)
- Architectural separation: Operations manages services delivered, Business manages sales/marketing
- Offers page focuses on promotional campaigns and sales pages for any service type (lessons, memberships, fittings, transformation packages)

## Payment Settings

Each facility can configure their own Stripe payment credentials for independent payment processing:
- **Location**: Settings page > Payments tab (admin only)
- **Configuration**: Stripe publishable key, secret key, payment provider selection, payments enabled toggle
- **Security**: Secret keys are masked in the UI (displayed as "sk_****"), only full key is stored in database
- **Multi-tenant**: Each facility maintains separate Stripe credentials for isolated payment processing
- **Setup Instructions**: Link to Stripe dashboard (https://dashboard.stripe.com/apikeys) provided in UI
- **Future Support**: Architecture prepared for additional payment providers (Square, etc.)

### How to Get Stripe Keys
1. Visit https://dashboard.stripe.com/apikeys
2. Copy "Publishable key" (starts with `pk_`) - safe for public use
3. Copy "Secret key" (starts with `sk_`) - must be kept secure
4. Configure in Settings > Payments tab

## Edit Functionality Pattern
All product/service pages (Memberships, Transformation Packages, Fittings, Offers, Lessons) implement unified edit functionality:
- **Click card to edit**: All cards are clickable and open the edit dialog
- **Same dialog for create/edit**: Dialog title and submit button adapt based on mode
- **Form pre-population**: Editing pre-fills form with existing data via useEffect
- **Dual mutations**: Separate create (POST) and update (PATCH) mutations
- **Button stop propagation**: Buttons inside cards (e.g., "Copy Shareable Link") prevent card click
- **State management**: `editingX` state tracks current edit target and clears on dialog close
