# GolfSimOS - Multi-Tenant Golf Simulator Management Platform

### Overview
GolfSimOS is a multi-tenant SaaS platform for indoor golf simulator facilities, streamlining operations like bay bookings, memberships, lessons, club fittings, and product sales. It supports multiple facilities with customizable configurations and provides embeddable widgets for website integration. The vision is to be the leading management solution, enhancing efficiency, customer experience, and revenue.

### User Preferences
I want the agent to prioritize core functionality and stable releases. I prefer iterative development with clear communication on progress and potential roadblocks. Do not make changes to the `replit.nix` file. Do not make changes to the `.replit` file. I prefer detailed explanations for complex technical decisions.

### System Architecture
**UI/UX Decisions:** A professional, golf-themed UI (primary green: #22c55e) uses Tailwind CSS. Navigation is a hierarchical sidebar: Dashboard → Operations (Schedule, Bookings, Orders, Lessons, Fittings) → Business (Events, Memberships, Packages, Contacts, Members, Sales, Offers, Staff) → Settings. Operations and Business sections are collapsed by default. The Offers page includes quick navigation buttons. Bays and TrackMan settings are in Settings > General. All product/service pages use a unified edit dialog approach. The schedule and dashboard use absolute positioning for time-accurate booking visualization on a grid (150px/hour), preventing double-bookings with drag-and-drop rescheduling and edge-resize functionality (15-minute snap intervals). The Bookings page is split into Current & Upcoming, Unpaid Past (amber, 75% opacity), and Archived (60% opacity, hidden by default). It features inline editable dropdowns for booking type and payment, a comprehensive payment dialog, and customer selection (search existing or create new). Dashboard and Schedule pages feature a green "Add Booking" button for quick booking creation with auto-bay-assignment.

**Technical Implementations:**
*   **Database:** PostgreSQL with multi-tenant schema (`facilityId` filtering) and `varchar` UUIDs, UTC timestamps.
*   **Authentication:** Replit Auth (OIDC) with role-based access control (super_admin, owner, administrator, instructor, club_fitter, support, customer, member).
*   **Subscription & Billing:** SaaS pricing at $199/month with 14-day free trial. Trial starts automatically during onboarding (`subscriptionStatus="trialing"`, `trialStartAt`, `trialEndAt` set). Subscription fields include `stripeCustomerId`, `stripeSubscriptionId`, `subscriptionStatus` (enum: trialing, active, past_due, canceled, grace_period), and `monthlyRecurringRevenue`. Trial countdown banner displays days remaining with urgency-based styling (destructive for ≤3 days). Billing page in Settings shows subscription status, trial information, and Stripe IDs.
*   **Custom Roles System:** Facility-specific custom roles with 50 granular permissions; protected system roles.
*   **Staff Payment Structures:** Hourly, commission, salary, and tips with corresponding database fields.
*   **Commission & Referral System:** `commissionStructures` (flat/percentage, recurring), `commissionPayments`, and `referredBy` fields on sales tables.
*   **Payroll System:** `payrollPayments` table, API for calculating earnings by date range, facility-configurable frequency.
*   **GolfMarketingOS:** Event-driven marketing automation with an in-memory event bus, pluggable channel adapters (email, SMS, in-app), and a marketing orchestrator. Database includes tables for events, triggers, campaigns, templates, segments, and delivery logs.
*   **Trackman Integration:** OAuth 2.0 with automatic token refresh, per-facility credential storage. Session tracking for booked/walk-in activity with comprehensive shot metrics (25+ fields) for bay wear calculation and swing pattern detection. Bay wear aggregates data by time period. TrackMan Unit-to-Bay Mapping uses `trackmanUnitId` in bay settings; WebSocket handler resolves incoming shot data by matching TrackMan's `bayId` to `trackmanUnitId`.
*   **Backend:** Express.js with a comprehensive API (CRUD, PATCH).
*   **Frontend:** Vite with React, TanStack Query v5, and Shadcn components.
*   **Smart Bay Assignment:** Algorithm auto-assigns the bay with lowest usage for bookings without specified `bayId`.
*   **Bay Rental Pricing:** Flexible pricing by bay, tier (standard/premium/VIP), and duration (hourly, half-day, full-day). Backend supports promotional offers.
*   **Shareable Purchase URLs:** Public URLs for memberships, lesson packages, transformation packages, and offers, with facility branding and signup forms.
*   **Widget Payment Configuration:** Facility owners configure "Pay Online" (Stripe) and "Pay at Desk" options, and a default payment method, stored in `facilities` table. Anonymous bookings auto-create customer accounts.
*   **Automated Tag Management:** Tags stored as text arrays in various tables (memberships, bays, bookings, lessons, fittings, offerings, transformation packages) for webhook and Zapier integration.
*   **Stripe Webhook Integration:** POST endpoint at `/api/webhooks/stripe` handles `checkout.session.completed` events from Stripe. When a customer pays online, the webhook automatically updates booking `paymentStatus` to `paid_online`, creates product sales records, activates memberships, and updates transformation package enrollments. Webhook always returns 200 to prevent retry storms, includes comprehensive error handling and logging for all scenarios (success, missing metadata, validation errors). Metadata validation ensures numeric values are finite and required fields exist before processing. Future enhancement: signature verification for production security.

**Feature Specifications:**
*   **Facility Signup & Onboarding:** Guided 4-step workflow after Replit Auth: Basic Info, Bay Setup, Services, Membership Tiers.
*   **Facility Management:** Super-admin manages all facilities. Owners configure branding (logo, contact, colors, footer, legal links) in Settings > Brand.
*   **Booking Management:** Bay reservations with optimal bay assignment, referral tracking, inline editable types and payment methods. Auto-mark as paid when payment method changed to "Paid Online" or "Member". Payment Complete button shown when paid. Booking options menu (three-dot) for edit, refund, cancel, and bill more actions.
*   **Membership Management:** Customizable tiers with shareable purchase URLs and referral tracking.
*   **Lesson & Fitting Management:** Scheduling for lessons (packages, recurring) and club fittings with referral tracking.
*   **Transformation Packages:** Bundles combining lessons, fittings, bay access, and on-course practice with shareable URLs and referral tracking.
*   **Orders Management:** Searchable database consolidating all transactions with server-side filtering, client-side search, stats cards, financial reporting, manual payment recording, and professional receipt viewing/generation.
*   **CRM:** Lead tracking with status pipeline.
*   **Staff Management:** Time tracking, task management, commission structure management, referral attribution, and payroll calculations.
*   **Marketing Automation (GolfMarketingOS):** Event-driven platform for email, SMS, and in-app messages based on customer behavior.
*   **Real-time Dashboard:** Displays live statistics.

**System Design Choices:**
*   **Multi-tenancy:** Core architectural decision with `facilityId` filtering for data isolation.
*   **Role-Based Access Control (RBAC):** Middleware enforces access for protected endpoints.
*   **Payment Settings:** Each facility configures its own Stripe credentials; future support for additional providers.

### External Dependencies
*   **Database:** PostgreSQL
*   **Authentication:** Replit Auth (OIDC)
*   **Payment Processing:** Stripe