# GolfSimOS - Multi-Tenant Golf Simulator Management Platform

### Overview
GolfSimOS is a multi-tenant SaaS platform designed for indoor golf simulator facilities. Its primary purpose is to streamline the management of various operational aspects including bay bookings, memberships, lessons, club fittings, and product sales. The platform supports multiple facilities with customizable configurations and provides embeddable widgets for seamless integration into existing websites. The business vision is to become the leading management solution for golf simulator businesses, offering comprehensive tools to enhance efficiency, customer experience, and revenue generation.

### User Preferences
I want the agent to prioritize core functionality and stable releases. I prefer iterative development with clear communication on progress and potential roadblocks. Do not make changes to the `replit.nix` file. Do not make changes to the `.replit` file. I prefer detailed explanations for complex technical decisions.

### System Architecture
**UI/UX Decisions:** The platform features a professional, golf-themed UI with a primary green color (#22c55e), designed with Tailwind CSS for a modern aesthetic, professional spacing, and clear hierarchy. Sidebar navigation is organized into "Operations" (daily activities like Schedule, Bookings, Lessons, Fittings) and "Business" (configuration, sales, marketing) to optimize staff workflow, with "Operations" appearing first. All product/service pages (Memberships, Transformation Packages, Fittings, Offers, Lessons) implement a unified edit functionality where clicking a card opens an edit dialog, pre-populating the form with existing data. The bookings page features inline editable dropdowns for booking type and payment method, plus a single "Collect Payment" button that opens a comprehensive payment dialog with card-on-file and new-card/POS options. The payment dialog includes a detailed review section displaying customer name, booking type, date/time, duration, assigned bays, and total amount with proper currency formatting before payment processing. Unpaid bookings display with a yellow/amber border for visual identification.

**Technical Implementations:**
*   **Database:** PostgreSQL with a multi-tenant schema where all queries are filtered by `facilityId` (except for super-admin). Uses `varchar` UUIDs for primary keys and UTC timestamps.
*   **Authentication:** Replit Auth (OIDC) integrated with role-based access control (super_admin, owner, administrator, instructor, club_fitter, support, customer, member).
*   **Custom Roles System:** Facility-specific custom roles with 50 granular permissions covering all platform features. System roles (owner, administrator, etc.) are protected from editing/deletion. Users can be assigned either a system role OR a custom role.
*   **Staff Payment Structures:** Flexible payment types including hourly (default), commission, salary, and tips. Each staff member has paymentType field, hourlyRate, salary, and commissionRate fields in the database.
*   **Commission & Referral System:** Comprehensive commission tracking with `commissionStructures` table defining flexible rules per product type (flat fee or percentage, one-time/x-months/forever recurring), `commissionPayments` table tracking individual earnings, and `referredBy` field on all sales tables (bookings, lessons, fittings, memberships, transformation packages) for referral attribution.
*   **Payroll System:** `payrollPayments` table for record keeping, backend API for calculating staff earnings by date range with breakdowns by hourly wages, salary, commissions, and tips. Facility-configurable payroll frequency settings.
*   **GolfMarketingOS:** Event-driven marketing automation platform built into GolfSimOS. Features an in-memory event bus (upgradable to Kafka/NATS), pluggable channel adapters (email, SMS, in-app banners, notifications), and a marketing orchestrator for triggering campaigns based on customer behavior. Database schema includes tables for events, triggers, campaigns, templates, segments, message queue, delivery logs, and contact preferences. Designed to scale from simple triggered messages to complex multi-step customer journeys.
*   **Trackman Integration:** Complete OAuth 2.0 authentication service with automatic token refresh (5-minute buffer before expiry). Stores per-facility credentials with token refresh timestamps. Session tracking schema captures both booked and walk-in activity via optional `bookingId`, with comprehensive shot metrics (25+ fields including ball/club speeds, spins, launch angles, impact data, distances) enabling dual use: bay wear calculation and swing pattern detection for marketing triggers. Bay wear tracking aggregates data by time period (daily/weekly/monthly) with booked vs walk-in breakdown and cumulative lifetime metrics.
*   **Backend:** Express.js with a comprehensive API supporting CRUD operations, including PATCH for updates.
*   **Frontend:** Vite with React, utilizing TanStack Query v5 for data fetching and Shadcn components for UI.
*   **Smart Bay Assignment:** An algorithm auto-assigns the bay with the lowest usage hours when a booking is made without a specified bayId.
*   **Shareable Purchase URLs:** Publicly accessible URLs allow customers to purchase memberships, lesson packages, transformation packages, and offers without logging in, featuring facility branding and customer signup forms.

**Feature Specifications:**
*   **Facility Management:** Super-admin can create and manage facilities, each with customizable branding, subdomain, feature flags, and individual payment settings.
*   **Booking Management:** Supports bay reservations with automatic optimal bay assignment. Bookings include referral tracking, inline editable booking types (Sim Rental, Lesson, Club Fitting, Event), and payment methods (Paid Online, Member, Pay At Desk, Card on File). Consolidated payment collection through a single dialog interface.
*   **Membership Management:** Customizable membership tiers with shareable purchase URLs. Membership sales include referral tracking.
*   **Lesson & Fitting Management:** Scheduling for lessons (including packages and recurring subscriptions) and club fittings. Fittings include referral tracking.
*   **Transformation Packages:** Comprehensive training bundles combining lessons, fittings, bay access, and on-course practice, also with shareable purchase URLs. Enrollments include referral tracking.
*   **CRM:** Lead tracking with a status pipeline (new, contacted, qualified, converted, lost).
*   **Staff Management:** Comprehensive system including time tracking (clock in/out), task management with assignment and priority, commission structure management (flexible rules by product type with recurring options), referral attribution on all sales, and payroll calculations with detailed earnings breakdowns by date range (hourly wages, salary, commissions, tips).
*   **Marketing Automation (GolfMarketingOS):** Event-driven marketing platform capable of triggering email, SMS, and in-app messages based on customer behavior. Foundation includes event bus infrastructure, channel adapters, marketing engine orchestrator, and database schema for campaigns, triggers, templates, segments, and message tracking. Built to scale from simple automation (e.g., "slice detected → send lesson offer") to complex multi-channel journeys.
*   **Real-time Dashboard:** Displays statistics based on live data.

**System Design Choices:**
*   **Multi-tenancy:** Core architectural decision with `facilityId` filtering for data isolation and per-facility configurations.
*   **Role-Based Access Control (RBAC):** Middleware enforces access based on user roles for protected endpoints.
*   **Payment Settings:** Each facility can configure its own Stripe credentials for independent payment processing, with secure masking of secret keys. The architecture is designed to support additional payment providers in the future.

### External Dependencies
*   **Database:** PostgreSQL
*   **Authentication:** Replit Auth (OIDC)
*   **Payment Processing:** Stripe (per-facility configuration for publishable and secret keys)