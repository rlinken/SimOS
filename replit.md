# GolfSimOS - Multi-Tenant Golf Simulator Management Platform

### Overview
GolfSimOS is a multi-tenant SaaS platform designed for indoor golf simulator facilities. Its primary purpose is to streamline the management of various operational aspects including bay bookings, memberships, lessons, club fittings, and product sales. The platform supports multiple facilities with customizable configurations and provides embeddable widgets for seamless integration into existing websites. The business vision is to become the leading management solution for golf simulator businesses, offering comprehensive tools to enhance efficiency, customer experience, and revenue generation.

### User Preferences
I want the agent to prioritize core functionality and stable releases. I prefer iterative development with clear communication on progress and potential roadblocks. Do not make changes to the `replit.nix` file. Do not make changes to the `.replit` file. I prefer detailed explanations for complex technical decisions.

### System Architecture
**UI/UX Decisions:** The platform features a professional, golf-themed UI with a primary green color (#22c55e), designed with Tailwind CSS for a modern aesthetic, professional spacing, and clear hierarchy. Sidebar navigation is organized into "Operations" (daily activities like Schedule, Bookings, Lessons, Fittings) and "Business" (configuration, sales, marketing) to optimize staff workflow, with "Operations" appearing first. All product/service pages (Memberships, Transformation Packages, Fittings, Offers, Lessons) implement a unified edit functionality where clicking a card opens an edit dialog, pre-populating the form with existing data.

**Technical Implementations:**
*   **Database:** PostgreSQL with a multi-tenant schema where all queries are filtered by `facilityId` (except for super-admin). Uses `varchar` UUIDs for primary keys and UTC timestamps.
*   **Authentication:** Replit Auth (OIDC) integrated with role-based access control (super_admin, owner, administrator, instructor, club_fitter, support, customer, member).
*   **Backend:** Express.js with a comprehensive API supporting CRUD operations, including PATCH for updates.
*   **Frontend:** Vite with React, utilizing TanStack Query v5 for data fetching and Shadcn components for UI.
*   **Smart Bay Assignment:** An algorithm auto-assigns the bay with the lowest usage hours when a booking is made without a specified bayId.
*   **Shareable Purchase URLs:** Publicly accessible URLs allow customers to purchase memberships, lesson packages, transformation packages, and offers without logging in, featuring facility branding and customer signup forms.

**Feature Specifications:**
*   **Facility Management:** Super-admin can create and manage facilities, each with customizable branding, subdomain, feature flags, and individual payment settings.
*   **Booking Management:** Supports bay reservations with automatic optimal bay assignment.
*   **Membership Management:** Customizable membership tiers with shareable purchase URLs.
*   **Lesson & Fitting Management:** Scheduling for lessons (including packages and recurring subscriptions) and club fittings.
*   **Transformation Packages:** Comprehensive training bundles combining lessons, fittings, bay access, and on-course practice, also with shareable purchase URLs.
*   **CRM:** Lead tracking with a status pipeline (new, contacted, qualified, converted, lost).
*   **Staff Management:** Includes time tracking (clock in/out), task management with assignment and priority, and payroll features for commissions and tips.
*   **Real-time Dashboard:** Displays statistics based on live data.

**System Design Choices:**
*   **Multi-tenancy:** Core architectural decision with `facilityId` filtering for data isolation and per-facility configurations.
*   **Role-Based Access Control (RBAC):** Middleware enforces access based on user roles for protected endpoints.
*   **Payment Settings:** Each facility can configure its own Stripe credentials for independent payment processing, with secure masking of secret keys. The architecture is designed to support additional payment providers in the future.

### External Dependencies
*   **Database:** PostgreSQL
*   **Authentication:** Replit Auth (OIDC)
*   **Payment Processing:** Stripe (per-facility configuration for publishable and secret keys)