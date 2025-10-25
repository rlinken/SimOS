# GolfSimOS - Multi-Tenant Golf Simulator Management Platform

## Project Overview
GolfSimOS is a multi-tenant SaaS platform for indoor golf simulator facilities to manage bay bookings, memberships, lessons, club fittings, and products. The platform supports multiple facilities with customizable configurations and includes embeddable widgets for websites.

## Current Status (MVP Phase)

### Completed Features
- ✅ Multi-tenant database schema with PostgreSQL
- ✅ User authentication with Replit Auth (OIDC)
- ✅ Role-based access control (super_admin, owner, administrator, instructor, club_fitter, support, customer, member)
- ✅ Smart bay assignment algorithm (auto-assigns bay with lowest usage)
- ✅ Backend API with all CRUD endpoints
- ✅ Frontend pages: Landing, Dashboard, Bays, Bookings, Members, Memberships, Lessons (with Packages), Fittings, Facilities, Settings, Contacts, Sales, Offers, Staff, Schedule
- ✅ Real-time dashboard statistics from actual data
- ✅ Professional golf-themed UI with Tailwind CSS
- ✅ Lesson packages (pay-per-lesson, bundles, recurring subscriptions)
- ✅ Club fitting scheduling with customer selection
- ✅ CRM with lead tracking (new, contacted, qualified, converted, lost)

### In Progress
- 🔨 Facility onboarding wizard
- 🔨 Embeddable booking widgets
- 🔨 Standalone sales pages
- 🔨 Widget customization dashboard

### Deferred (User Request)
- ⏸️ Stripe Connect integration (build core functionality first)

## Technical Architecture

### Database Schema
- **facilities**: Multi-tenant core with subdomain, branding, feature flags
- **users**: Extended Replit Auth with facility scoping and roles
- **bays**: Simulator bays with tiers (standard/premium/vip), status tracking
- **bookings**: Reservations with auto bay assignment, payment tracking
- **membership_tiers**: Customizable membership plans per facility
- **lessons**: Instructor-student scheduling
- **lesson_packages**: Lesson pricing packages (pay-per-lesson, bundles, recurring subscriptions)
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

#### Fittings
- `GET /api/fittings` - List fittings with fitter/user data
- `POST /api/fittings` - Create fitting

#### Dashboard
- `GET /api/dashboard/stats` - Real-time facility statistics

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

The sidebar is organized into three sections:

### Navigation
- Dashboard
- Facilities (super admin only)
- Settings

### Business
- Contacts (Leads and CRM)
- Members (Membership members)
- Sales
- Offers
- Staff

### Operations
- Schedule
- Bays
- Bookings
- Memberships (Membership tiers/plans)
- Lessons
- Fittings

## Notes
- Database uses `varchar` UUIDs for all primary keys
- All timestamps in UTC
- Frontend uses TanStack Query v5 for data fetching
- Sidebar navigation with Shadcn components
- Design follows design_guidelines.md (golf theme, spacing, interactions)
- Lesson package types: pay_per_lesson, package, recurring with billing intervals (monthly, quarterly, annual)
- Lead status tracking uses enum: new, contacted, qualified, converted, lost
