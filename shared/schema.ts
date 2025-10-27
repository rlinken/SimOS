import { sql } from "drizzle-orm";
import {
  pgTable,
  varchar,
  text,
  integer,
  timestamp,
  boolean,
  json,
  index,
  uniqueIndex,
  jsonb,
  pgEnum,
  numeric,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// ============================================================================
// ENUMS
// ============================================================================

export const userRoleEnum = pgEnum("user_role", [
  "super_admin",
  "owner",
  "administrator",
  "instructor",
  "club_fitter",
  "support",
  "customer", // Any user with an account (may or may not have purchased a membership package)
  "member", // Deprecated: use "customer" instead
]);

export const taskStatusEnum = pgEnum("task_status", [
  "pending",
  "in_progress",
  "completed",
  "cancelled",
]);

export const taskPriorityEnum = pgEnum("task_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);

export const recurrenceTypeEnum = pgEnum("recurrence_type", [
  "daily",
  "weekly",
  "monthly",
]);

export const bayTierEnum = pgEnum("bay_tier", ["standard", "premium", "vip"]);

export const bayStatusEnum = pgEnum("bay_status", [
  "active",
  "offline",
  "maintenance",
]);

export const bookingTypeEnum = pgEnum("booking_type", [
  "rental",
  "lesson",
  "fitting",
  "event",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "paid",
  "pending",
  "cancelled",
  "refunded",
]);

export const offeringTypeEnum = pgEnum("offering_type", [
  "lesson",
  "fitting",
  "product",
  "membership",
  "transformation_package",
]);

export const billingFrequencyEnum = pgEnum("billing_frequency", [
  "one_time",
  "monthly",
  "quarterly",
  "annual",
]);

export const leadStatusEnum = pgEnum("lead_status", [
  "new",
  "contacted",
  "qualified",
  "converted",
  "lost",
]);

export const leadSourceEnum = pgEnum("lead_source", [
  "website",
  "phone",
  "email",
  "referral",
  "walk_in",
  "social_media",
  "event",
  "other",
]);

export const paymentTypeEnum = pgEnum("payment_type", [
  "hourly", // Default - paid by the hour
  "salary", // Fixed annual/monthly salary
  "commission", // Paid based on sales/bookings commission
  "tips", // Primarily tips-based (e.g., service staff)
]);

export const commissionTypeEnum = pgEnum("commission_type", [
  "flat", // Fixed amount per sale (e.g., $50)
  "percentage", // Percentage of sale amount (e.g., 15%)
]);

export const recurringCommissionTypeEnum = pgEnum("recurring_commission_type", [
  "one_time", // Commission on initial payment only
  "x_months", // Commission for specific number of months
  "forever", // Commission on all recurring payments
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "card_on_file", // Charge saved card
  "new_card", // Process new card payment
  "pay_at_desk", // Customer pays when arriving
  "membership", // Covered by membership hours
]);

export const checkInStatusEnum = pgEnum("check_in_status", [
  "pending", // Not yet checked in
  "checked_in", // Customer has arrived
  "no_show", // Customer didn't show up
]);

export const productTypeEnum = pgEnum("product_type", [
  "booking",
  "lesson",
  "fitting",
  "membership",
  "transformation_package",
  "offering",
]);

export const payrollFrequencyEnum = pgEnum("payroll_frequency", [
  "weekly",
  "biweekly",
  "monthly",
]);

export const payrollStatusEnum = pgEnum("payroll_status", [
  "pending",
  "processing",
  "paid",
  "cancelled",
]);

// ============================================================================
// PERMISSIONS (for custom roles)
// ============================================================================

export const PERMISSIONS = [
  // Dashboard & Analytics
  "view_dashboard",
  "view_reports",
  "view_sales",
  
  // Bay Management
  "view_bays",
  "manage_bays",
  "view_schedule",
  
  // Bookings
  "view_bookings",
  "create_bookings",
  "manage_bookings",
  
  // Members & Memberships
  "view_members",
  "manage_members",
  "view_memberships",
  "manage_memberships",
  
  // Lessons
  "view_lessons",
  "create_lessons",
  "manage_lessons",
  "view_lesson_packages",
  "manage_lesson_packages",
  
  // Fittings
  "view_fittings",
  "create_fittings",
  "manage_fittings",
  
  // Products & Offers
  "view_offers",
  "manage_offers",
  "view_transformation_packages",
  "manage_transformation_packages",
  
  // Staff & Payroll
  "view_staff",
  "manage_staff",
  "view_tasks",
  "manage_tasks",
  "view_payroll",
  "manage_payroll",
  
  // CRM
  "view_crm",
  "manage_crm",
  
  // Settings
  "manage_settings",
  "manage_payment_settings",
  "manage_facility_settings",
  "manage_roles",
] as const;

export type Permission = typeof PERMISSIONS[number];

// ============================================================================
// SESSION TABLE (Required for Replit Auth)
// ============================================================================

export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// ============================================================================
// FACILITIES TABLE (Multi-tenant core)
// ============================================================================

export const facilities = pgTable("facilities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  subdomain: varchar("subdomain").notNull().unique(),
  customDomain: varchar("custom_domain"),
  logo: text("logo"),
  address: text("address"),
  phone: varchar("phone"),
  email: varchar("email"),
  
  // Widget customization
  primaryColor: varchar("primary_color").default("#16a34a"),
  accentColor: varchar("accent_color").default("#22c55e"),
  
  // Feature flags
  lessonsEnabled: boolean("lessons_enabled").default(true),
  fittingsEnabled: boolean("fittings_enabled").default(true),
  
  // Bay reservation options for lessons/fittings
  allowBayWithLessons: boolean("allow_bay_with_lessons").default(false),
  allowBayWithFittings: boolean("allow_bay_with_fittings").default(false),
  
  // Non-member pricing & access
  nonMemberBayRate: numeric("non_member_bay_rate", { precision: 10, scale: 2 }).default("50.00"), // Per hour
  allowNonMemberBookings: boolean("allow_non_member_bookings").default(true),
  requireAccountForBooking: boolean("require_account_for_booking").default(false), // If false, allows guest bookings
  
  // Membership billing
  billingPeriod: varchar("billing_period").default("monthly"), // "monthly" or "annual"
  
  // Bay selection settings
  allowBaySelection: boolean("allow_bay_selection").default(false), // Allow customers to choose specific bays
  
  // Booking buffer settings (in minutes)
  bayBookingBufferMinutes: integer("bay_booking_buffer_minutes").default(30), // Minimum time before booking (e.g., 30 min)
  lessonBookingBufferMinutes: integer("lesson_booking_buffer_minutes").default(1440), // 24 hours for lessons
  fittingBookingBufferMinutes: integer("fitting_booking_buffer_minutes").default(1440), // 24 hours for fittings
  
  // Buffer between bookings (in minutes)
  bayBufferBetweenMinutes: integer("bay_buffer_between_minutes").default(5), // Gap between bay bookings
  lessonBufferBetweenMinutes: integer("lesson_buffer_between_minutes").default(15), // Gap between lessons
  fittingBufferBetweenMinutes: integer("fitting_buffer_between_minutes").default(15), // Gap between fittings
  
  // Payment settings
  stripePublishableKey: text("stripe_publishable_key"),
  stripeSecretKey: text("stripe_secret_key"),
  stripeAccountId: varchar("stripe_account_id"), // For Stripe Connect (future)
  paymentProvider: varchar("payment_provider").default("stripe"), // "stripe", "square", etc.
  paymentsEnabled: boolean("payments_enabled").default(false),
  
  // Trackman API integration settings
  trackmanEnabled: boolean("trackman_enabled").default(false),
  trackmanClientId: text("trackman_client_id"),
  trackmanClientSecret: text("trackman_client_secret"),
  trackmanApiUrl: text("trackman_api_url").default("https://api.trackman.com"), // Base API URL
  
  // Referral tracking settings
  enableReferralTracking: boolean("enable_referral_tracking").default(false),
  showReferralOnPublicForms: boolean("show_referral_on_public_forms").default(false),
  
  // Payroll settings
  payrollFrequency: payrollFrequencyEnum("payroll_frequency").default("biweekly"),
  payrollDayOfWeek: integer("payroll_day_of_week"), // 0-6 for Sunday-Saturday (for weekly/biweekly)
  payrollDayOfMonth: integer("payroll_day_of_month"), // 1-31 (for monthly)
  
  // Thank you page settings
  thankYouPageEnabled: boolean("thank_you_page_enabled").default(true),
  thankYouPageMessage: text("thank_you_page_message"), // Custom welcome message
  thankYouPageExternalUrl: text("thank_you_page_external_url"), // External redirect URL
  useExternalThankYouPage: boolean("use_external_thank_you_page").default(false), // Use external URL instead of built-in page
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================================
// TRACKMAN OAUTH TOKENS (OAuth 2.0 Access & Refresh Tokens)
// ============================================================================
// Note: Must be defined before facilitiesRelations to avoid initialization errors

export const trackmanTokens = pgTable("trackman_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  facilityId: varchar("facility_id")
    .references(() => facilities.id, { onDelete: "cascade" })
    .notNull()
    .unique(), // One token record per facility
  
  // OAuth tokens
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  tokenType: varchar("token_type").default("Bearer").notNull(),
  
  // Expiry management
  expiresAt: timestamp("expires_at").notNull(), // When access token expires
  scope: text("scope"), // OAuth scopes granted
  
  // Metadata
  lastRefreshedAt: timestamp("last_refreshed_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  facilityIdIdx: index("trackman_tokens_facility_id_idx").on(table.facilityId),
}));

export const trackmanTokensRelations = relations(trackmanTokens, ({ one }) => ({
  facility: one(facilities, {
    fields: [trackmanTokens.facilityId],
    references: [facilities.id],
  }),
}));

export const insertTrackmanTokenSchema = createInsertSchema(trackmanTokens).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type TrackmanToken = typeof trackmanTokens.$inferSelect;
export type InsertTrackmanToken = z.infer<typeof insertTrackmanTokenSchema>;

// Facilities relations (defined after trackmanTokens to avoid initialization errors)
export const facilitiesRelations = relations(facilities, ({ one, many }) => ({
  users: many(users),
  bays: many(bays),
  bookings: many(bookings),
  membershipTiers: many(membershipTiers),
  lessons: many(lessons),
  fittings: many(fittings),
  customRoles: many(customRoles),
  trackmanToken: one(trackmanTokens),
}));

export const insertFacilitySchema = createInsertSchema(facilities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Facility = typeof facilities.$inferSelect;
export type InsertFacility = z.infer<typeof insertFacilitySchema>;

// ============================================================================
// USERS TABLE (Required for Replit Auth + Extended)
// ============================================================================

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  phone: varchar("phone"),
  
  // Multi-tenant
  facilityId: varchar("facility_id").references(() => facilities.id, {
    onDelete: "cascade",
  }),
  
  // Role-based access (use either system role OR custom role, not both)
  role: userRoleEnum("role"),
  customRoleId: varchar("custom_role_id").references(() => customRoles.id),
  
  // Membership
  membershipTierId: varchar("membership_tier_id").references(
    () => membershipTiers.id
  ),
  monthlyCreditsRemaining: integer("monthly_credits_remaining").default(0),
  
  // Referral tracking (who referred this user/member)
  referredBy: varchar("referred_by").references(() => users.id),
  
  // Staff-specific fields (for instructors, fitters, admins)
  bio: text("bio"),
  specialties: varchar("specialties").array(),
  
  // Payment structure
  paymentType: paymentTypeEnum("payment_type").default("hourly"),
  hourlyRate: numeric("hourly_rate", { precision: 10, scale: 2 }), // For hourly payment type
  salary: numeric("salary", { precision: 10, scale: 2 }), // Annual salary for salary payment type
  commissionRate: numeric("commission_rate", { precision: 5, scale: 2 }), // Percentage (e.g., 15.00 = 15%) for commission type
  taxId: varchar("tax_id"), // For payroll reporting (SSN/EIN)
  googleCalendarId: varchar("google_calendar_id"),
  
  // External integrations (for later)
  ghlContactId: varchar("ghl_contact_id"),
  stripeCustomerId: varchar("stripe_customer_id"),
  
  // Customer management fields
  tags: varchar("tags").array(), // Staff-added tags for customer categorization
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  facility: one(facilities, {
    fields: [users.facilityId],
    references: [facilities.id],
  }),
  membershipTier: one(membershipTiers, {
    fields: [users.membershipTierId],
    references: [membershipTiers.id],
  }),
  customRole: one(customRoles, {
    fields: [users.customRoleId],
    references: [customRoles.id],
  }),
  bookings: many(bookings),
  instructedLessons: many(lessons, { relationName: "instructor" }),
  studentLessons: many(lessons, { relationName: "student" }),
  fittings: many(fittings),
  notes: many(customerNotes, { relationName: "customerNotes" }),
  authoredNotes: many(customerNotes, { relationName: "authoredNotes" }),
}));

export const upsertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export type User = typeof users.$inferSelect;
export type UpsertUser = z.infer<typeof upsertUserSchema>;

// ============================================================================
// LEADS TABLE (CRM for prospective customers)
// ============================================================================

export const leads = pgTable("leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  facilityId: varchar("facility_id")
    .references(() => facilities.id, { onDelete: "cascade" })
    .notNull(),
  
  // Contact info
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email").notNull(),
  phone: varchar("phone"),
  company: varchar("company"),
  
  // Lead tracking
  status: leadStatusEnum("status").notNull().default("new"),
  source: leadSourceEnum("source").notNull().default("website"),
  
  // CRM fields
  notes: text("notes"),
  estimatedValue: numeric("estimated_value", { precision: 10, scale: 2 }),
  assignedTo: varchar("assigned_to").references(() => users.id),
  
  // Conversion tracking
  convertedToUserId: varchar("converted_to_user_id").references(() => users.id),
  convertedAt: timestamp("converted_at"),
  
  // Follow-up
  nextFollowUp: timestamp("next_follow_up"),
  lastContactedAt: timestamp("last_contacted_at"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const leadsRelations = relations(leads, ({ one }) => ({
  facility: one(facilities, {
    fields: [leads.facilityId],
    references: [facilities.id],
  }),
  assignedStaff: one(users, {
    fields: [leads.assignedTo],
    references: [users.id],
    relationName: "assignedLeads",
  }),
  convertedUser: one(users, {
    fields: [leads.convertedToUserId],
    references: [users.id],
    relationName: "convertedFromLead",
  }),
}));

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;

// ============================================================================
// CUSTOM ROLES TABLE (Per-facility custom roles with permissions)
// ============================================================================

export const customRoles = pgTable("custom_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  facilityId: varchar("facility_id")
    .references(() => facilities.id, { onDelete: "cascade" })
    .notNull(),
  
  name: varchar("name").notNull(),
  description: text("description"),
  permissions: varchar("permissions").array().notNull().default(sql`ARRAY[]::varchar[]`),
  
  // System roles cannot be edited/deleted
  isSystemRole: boolean("is_system_role").default(false).notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const customRolesRelations = relations(customRoles, ({ one, many }) => ({
  facility: one(facilities, {
    fields: [customRoles.facilityId],
    references: [facilities.id],
  }),
  users: many(users),
}));

export const insertCustomRoleSchema = createInsertSchema(customRoles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isSystemRole: true,
}).extend({
  permissions: z.array(z.string()).default([]),
});

export type CustomRole = typeof customRoles.$inferSelect;
export type InsertCustomRole = z.infer<typeof insertCustomRoleSchema>;

export const updateLeadSchema = createInsertSchema(leads)
  .omit({
    id: true,
    facilityId: true,
    createdAt: true,
    updatedAt: true,
  })
  .partial();

export type UpdateLead = z.infer<typeof updateLeadSchema>;

// ============================================================================
// CUSTOMER NOTES TABLE (Staff notes on customers)
// ============================================================================

export const customerNotes = pgTable("customer_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  facilityId: varchar("facility_id")
    .references(() => facilities.id, { onDelete: "cascade" })
    .notNull(),
  customerId: varchar("customer_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  
  // Note content
  content: text("content").notNull(),
  
  // Tracking
  createdBy: varchar("created_by")
    .references(() => users.id)
    .notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const customerNotesRelations = relations(customerNotes, ({ one }) => ({
  facility: one(facilities, {
    fields: [customerNotes.facilityId],
    references: [facilities.id],
  }),
  customer: one(users, {
    fields: [customerNotes.customerId],
    references: [users.id],
    relationName: "customerNotes",
  }),
  author: one(users, {
    fields: [customerNotes.createdBy],
    references: [users.id],
    relationName: "authoredNotes",
  }),
}));

export const insertCustomerNoteSchema = createInsertSchema(customerNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CustomerNote = typeof customerNotes.$inferSelect;
export type InsertCustomerNote = z.infer<typeof insertCustomerNoteSchema>;

// ============================================================================
// MEMBERSHIP TIERS TABLE
// ============================================================================

export const membershipTiers = pgTable("membership_tiers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  facilityId: varchar("facility_id")
    .references(() => facilities.id, { onDelete: "cascade" })
    .notNull(),
  
  name: text("name").notNull(), // e.g., "Bronze", "Gold", "Platinum"
  description: text("description"),
  tierLevel: integer("tier_level").notNull(), // 1-3 for priority
  
  // Pricing
  monthlyPrice: numeric("monthly_price", { precision: 10, scale: 2 }).notNull(),
  annualPrice: numeric("annual_price", { precision: 10, scale: 2 }), // Optional annual pricing
  
  // Bay rental benefits
  includedBayHours: integer("included_bay_hours").default(0), // Free hours per billing period
  memberBayRate: numeric("member_bay_rate", { precision: 10, scale: 2 }), // Discounted rate after hours used
  
  // Lesson & fitting discounts (percentage)
  lessonDiscountPercent: numeric("lesson_discount_percent", { precision: 5, scale: 2 }).default("0"),
  fittingDiscountPercent: numeric("fitting_discount_percent", { precision: 5, scale: 2 }).default("0"),
  productDiscountPercent: numeric("product_discount_percent", { precision: 5, scale: 2 }).default("0"),
  
  // Bay access (JSON array of allowed tiers)
  allowedBayTiers: json("allowed_bay_tiers")
    .$type<string[]>()
    .default(sql`'["standard"]'::json`),
  
  // Bay access control - which specific bays this tier can book (empty array = all bays)
  allowedBayIds: integer("allowed_bay_ids").array().default(sql`ARRAY[]::integer[]`), // Array of bay IDs this tier has access to
  canSelectBays: boolean("can_select_bays").default(false), // Override: allow bay selection for this tier even if facility doesn't
  
  // Automation integration
  tags: text("tags").array().default(sql`ARRAY[]::text[]`), // Tags for webhook/Zapier automation
  
  // Stripe (for later)
  stripePriceId: varchar("stripe_price_id"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const membershipTiersRelations = relations(
  membershipTiers,
  ({ one, many }) => ({
    facility: one(facilities, {
      fields: [membershipTiers.facilityId],
      references: [facilities.id],
    }),
    members: many(users),
  })
);

export const insertMembershipTierSchema = createInsertSchema(
  membershipTiers
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateMembershipTierSchema = insertMembershipTierSchema.partial().omit({
  facilityId: true,
});

export type MembershipTier = typeof membershipTiers.$inferSelect;
export type InsertMembershipTier = z.infer<typeof insertMembershipTierSchema>;

// ============================================================================
// MEMBERSHIP USAGE TABLE (Track hours used per billing period)
// ============================================================================

export const membershipUsage = pgTable("membership_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  facilityId: varchar("facility_id")
    .references(() => facilities.id, { onDelete: "cascade" })
    .notNull(),
  userId: varchar("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  membershipTierId: varchar("membership_tier_id")
    .references(() => membershipTiers.id, { onDelete: "cascade" })
    .notNull(),
  
  // Billing period tracking
  billingPeriodStart: timestamp("billing_period_start").notNull(),
  billingPeriodEnd: timestamp("billing_period_end").notNull(),
  
  // Usage tracking
  hoursUsed: numeric("hours_used", { precision: 10, scale: 2 }).default("0").notNull(),
  hoursIncluded: integer("hours_included").notNull(), // Snapshot from membership tier
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const membershipUsageRelations = relations(
  membershipUsage,
  ({ one }) => ({
    facility: one(facilities, {
      fields: [membershipUsage.facilityId],
      references: [facilities.id],
    }),
    user: one(users, {
      fields: [membershipUsage.userId],
      references: [users.id],
    }),
    membershipTier: one(membershipTiers, {
      fields: [membershipUsage.membershipTierId],
      references: [membershipTiers.id],
    }),
  })
);

export const insertMembershipUsageSchema = createInsertSchema(
  membershipUsage
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type MembershipUsage = typeof membershipUsage.$inferSelect;
export type InsertMembershipUsage = z.infer<typeof insertMembershipUsageSchema>;

// ============================================================================
// BAYS TABLE
// ============================================================================

export const bays = pgTable("bays", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  facilityId: varchar("facility_id")
    .references(() => facilities.id, { onDelete: "cascade" })
    .notNull(),
  
  name: text("name").notNull(), // "Bay 1", "Bay 2", etc.
  description: text("description"),
  trackmanUnitId: varchar("trackman_unit_id"), // TrackMan device identifier for this bay
  tier: bayTierEnum("tier").notNull().default("standard"),
  status: bayStatusEnum("status").notNull().default("active"),
  
  // Usage tracking
  usageHours: integer("usage_hours").default(0).notNull(),
  lastRotation: timestamp("last_rotation"),
  maintenanceNotes: text("maintenance_notes"),
  
  // Automation integration
  tags: text("tags").array().default(sql`ARRAY[]::text[]`), // Tags for webhook/Zapier automation
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const baysRelations = relations(bays, ({ one, many }) => ({
  facility: one(facilities, {
    fields: [bays.facilityId],
    references: [facilities.id],
  }),
  bookings: many(bookings),
}));

export const insertBaySchema = createInsertSchema(bays).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateBaySchema = createInsertSchema(bays)
  .omit({
    id: true,
    facilityId: true,
    usageHours: true,
    createdAt: true,
    updatedAt: true,
  })
  .partial();

export type Bay = typeof bays.$inferSelect;
export type InsertBay = z.infer<typeof insertBaySchema>;
export type UpdateBay = z.infer<typeof updateBaySchema>;

// ============================================================================
// BAY BLOCKS TABLE (For maintenance, events, etc.)
// ============================================================================

export const bayBlocks = pgTable("bay_blocks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  facilityId: varchar("facility_id")
    .references(() => facilities.id, { onDelete: "cascade" })
    .notNull(),
  bayId: varchar("bay_id")
    .references(() => bays.id, { onDelete: "cascade" })
    .notNull(),
  
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  reason: text("reason").notNull(), // "Maintenance", "Event", "Closed", etc.
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const bayBlocksRelations = relations(bayBlocks, ({ one }) => ({
  facility: one(facilities, {
    fields: [bayBlocks.facilityId],
    references: [facilities.id],
  }),
  bay: one(bays, {
    fields: [bayBlocks.bayId],
    references: [bays.id],
  }),
}));

export const insertBayBlockSchema = createInsertSchema(bayBlocks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateBayBlockSchema = createInsertSchema(bayBlocks)
  .omit({
    id: true,
    facilityId: true,
    bayId: true,
    createdAt: true,
    updatedAt: true,
  })
  .partial();

export type BayBlock = typeof bayBlocks.$inferSelect;
export type InsertBayBlock = z.infer<typeof insertBayBlockSchema>;
export type UpdateBayBlock = z.infer<typeof updateBayBlockSchema>;

// ============================================================================
// BOOKINGS TABLE
// ============================================================================

export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  facilityId: varchar("facility_id")
    .references(() => facilities.id, { onDelete: "cascade" })
    .notNull(),
  
  // Customer & Staff tracking
  customerId: varchar("customer_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(), // The customer the booking is for
  createdBy: varchar("created_by")
    .references(() => users.id, { onDelete: "set null" }), // Staff member who created it (null if customer self-booked)
  
  userId: varchar("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(), // DEPRECATED: kept for backward compatibility, will be removed in future
  
  bayIds: varchar("bay_ids").array().notNull(),
  
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  type: bookingTypeEnum("type").notNull().default("rental"),
  
  // Payment
  paymentStatus: paymentStatusEnum("payment_status")
    .notNull()
    .default("pending"),
  paymentMethod: paymentMethodEnum("payment_method").default("pay_at_desk"), // How customer will pay
  amount: numeric("amount", { precision: 10, scale: 2 }),
  stripePaymentId: varchar("stripe_payment_id"),
  stripePaymentMethodId: varchar("stripe_payment_method_id"), // Saved payment method ID for card_on_file
  
  // Check-in tracking
  checkInStatus: checkInStatusEnum("check_in_status").notNull().default("pending"),
  checkedInAt: timestamp("checked_in_at"), // When customer checked in
  
  // Membership usage tracking
  usedMembershipHours: boolean("used_membership_hours").default(false), // Was this covered by membership?
  membershipHoursUsed: numeric("membership_hours_used", { precision: 10, scale: 2 }).default("0"), // How many hours from package
  
  // Referral tracking
  referredBy: varchar("referred_by").references(() => users.id),
  
  // Automation integration
  tags: text("tags").array().default(sql`ARRAY[]::text[]`), // Tags for webhook/Zapier automation
  
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const bookingsRelations = relations(bookings, ({ one }) => ({
  facility: one(facilities, {
    fields: [bookings.facilityId],
    references: [facilities.id],
  }),
  user: one(users, {
    fields: [bookings.userId],
    references: [users.id],
  }),
}));

export const insertBookingSchema = createInsertSchema(bookings)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    checkedInAt: true, // Set automatically when checking in
  })
  .extend({
    startTime: z.union([z.string(), z.date()]).transform(val => typeof val === 'string' ? new Date(val) : val),
    endTime: z.union([z.string(), z.date()]).transform(val => typeof val === 'string' ? new Date(val) : val),
    bayIds: z.array(z.string()).min(1).optional(), // Optional - will be auto-assigned if not provided
    customerId: z.string(), // Required - the customer the booking is for
    userId: z.string(), // DEPRECATED - kept for backward compatibility, same as customerId
    createdBy: z.string().optional(), // Optional - staff member who created it
    
    // Payment fields
    paymentMethod: z.enum(["card_on_file", "new_card", "pay_at_desk", "membership"]).optional().default("pay_at_desk"),
    stripePaymentMethodId: z.string().optional(), // Required if paymentMethod is "card_on_file"
    
    // Guest customer fields (for walk-ins without existing accounts)
    guestName: z.string().optional(),
    guestEmail: z.string().email().optional(),
    guestPhone: z.string().optional(),
  });

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;

// ============================================================================
// LESSONS TABLE
// ============================================================================

export const lessons = pgTable("lessons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  facilityId: varchar("facility_id")
    .references(() => facilities.id, { onDelete: "cascade" })
    .notNull(),
  instructorId: varchar("instructor_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  studentId: varchar("student_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  
  // Can be linked to a booking
  bookingId: varchar("booking_id").references(() => bookings.id),
  
  title: text("title").notNull(),
  date: timestamp("date").notNull(),
  durationMinutes: integer("duration_minutes").default(60),
  
  // Referral tracking
  referredBy: varchar("referred_by").references(() => users.id),
  
  // Automation integration
  tags: text("tags").array().default(sql`ARRAY[]::text[]`), // Tags for webhook/Zapier automation
  
  notes: text("notes"),
  completed: boolean("completed").default(false).notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const lessonsRelations = relations(lessons, ({ one }) => ({
  facility: one(facilities, {
    fields: [lessons.facilityId],
    references: [facilities.id],
  }),
  instructor: one(users, {
    fields: [lessons.instructorId],
    references: [users.id],
    relationName: "instructor",
  }),
  student: one(users, {
    fields: [lessons.studentId],
    references: [users.id],
    relationName: "student",
  }),
  booking: one(bookings, {
    fields: [lessons.bookingId],
    references: [bookings.id],
  }),
}));

export const insertLessonSchema = createInsertSchema(lessons).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Lesson = typeof lessons.$inferSelect;
export type InsertLesson = z.infer<typeof insertLessonSchema>;

// ============================================================================
// LESSON PACKAGES TABLE
// ============================================================================

export const lessonPackageTypeEnum = pgEnum("lesson_package_type", [
  "pay_per_lesson",  // Single lesson purchase
  "package",         // Multi-lesson package (one-time)
  "recurring",       // Subscription/recurring payment
]);

export const billingIntervalEnum = pgEnum("billing_interval", [
  "monthly",
  "quarterly",
  "annual",
]);

export const lessonPackages = pgTable("lesson_packages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  facilityId: varchar("facility_id")
    .references(() => facilities.id, { onDelete: "cascade" })
    .notNull(),
  
  // Package details
  name: text("name").notNull(),
  description: text("description"),
  packageType: lessonPackageTypeEnum("package_type").notNull(),
  
  // Pricing
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  
  // Lessons included
  lessonsIncluded: integer("lessons_included").notNull().default(1), // 1 for pay-per-lesson, N for packages
  
  // Recurring details (for recurring packages)
  billingInterval: billingIntervalEnum("billing_interval"), // null for non-recurring
  
  // Validity
  validityDays: integer("validity_days"), // How long the package is valid (null = unlimited)
  
  // Status
  active: boolean("active").default(true).notNull(),
  
  // Stripe (for future)
  stripePriceId: varchar("stripe_price_id"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const lessonPackagesRelations = relations(lessonPackages, ({ one }) => ({
  facility: one(facilities, {
    fields: [lessonPackages.facilityId],
    references: [facilities.id],
  }),
}));

export const insertLessonPackageSchema = createInsertSchema(lessonPackages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateLessonPackageSchema = createInsertSchema(lessonPackages)
  .omit({
    id: true,
    facilityId: true,
    createdAt: true,
    updatedAt: true,
  })
  .partial();

export type LessonPackage = typeof lessonPackages.$inferSelect;
export type InsertLessonPackage = z.infer<typeof insertLessonPackageSchema>;
export type UpdateLessonPackage = z.infer<typeof updateLessonPackageSchema>;

// ============================================================================
// FITTINGS TABLE
// ============================================================================

export const fittings = pgTable("fittings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  facilityId: varchar("facility_id")
    .references(() => facilities.id, { onDelete: "cascade" })
    .notNull(),
  fitterId: varchar("fitter_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  userId: varchar("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  
  // Can be linked to a booking
  bookingId: varchar("booking_id").references(() => bookings.id),
  
  title: text("title").notNull(),
  date: timestamp("date").notNull(),
  durationMinutes: integer("duration_minutes").default(90),
  
  // Referral tracking
  referredBy: varchar("referred_by").references(() => users.id),
  
  // Automation integration
  tags: text("tags").array().default(sql`ARRAY[]::text[]`), // Tags for webhook/Zapier automation
  
  // Intake form data
  intakeData: json("intake_data"),
  notes: text("notes"),
  completed: boolean("completed").default(false).notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const fittingsRelations = relations(fittings, ({ one }) => ({
  facility: one(facilities, {
    fields: [fittings.facilityId],
    references: [facilities.id],
  }),
  fitter: one(users, {
    fields: [fittings.fitterId],
    references: [users.id],
  }),
  user: one(users, {
    fields: [fittings.userId],
    references: [users.id],
  }),
  booking: one(bookings, {
    fields: [fittings.bookingId],
    references: [bookings.id],
  }),
}));

export const insertFittingSchema = createInsertSchema(fittings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateFittingSchema = insertFittingSchema.partial().omit({
  facilityId: true,
});

export type Fitting = typeof fittings.$inferSelect;
export type InsertFitting = z.infer<typeof insertFittingSchema>;

// ============================================================================
// OFFERINGS TABLE (Products/Services Templates)
// ============================================================================

export const offerings = pgTable("offerings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  facilityId: varchar("facility_id")
    .references(() => facilities.id, { onDelete: "cascade" })
    .notNull(),
  
  // Staff assignment (optional - null for retail products)
  assignedStaffId: varchar("assigned_staff_id").references(() => users.id),
  
  type: offeringTypeEnum("type").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  
  // Pricing
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  
  // Duration (for services like lessons/fittings, null for products)
  durationMinutes: integer("duration_minutes"),
  
  // Availability
  isActive: boolean("is_active").default(true).notNull(),
  
  // Automation integration
  tags: text("tags").array().default(sql`ARRAY[]::text[]`), // Tags for webhook/Zapier automation
  
  // Stripe (for later)
  stripePriceId: varchar("stripe_price_id"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const offeringsRelations = relations(offerings, ({ one }) => ({
  facility: one(facilities, {
    fields: [offerings.facilityId],
    references: [facilities.id],
  }),
  assignedStaff: one(users, {
    fields: [offerings.assignedStaffId],
    references: [users.id],
  }),
}));

export const insertOfferingSchema = createInsertSchema(offerings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateOfferingSchema = createInsertSchema(offerings)
  .omit({
    id: true,
    facilityId: true,
    createdAt: true,
    updatedAt: true,
  })
  .partial();

export type Offering = typeof offerings.$inferSelect;
export type InsertOffering = z.infer<typeof insertOfferingSchema>;
export type UpdateOffering = z.infer<typeof updateOfferingSchema>;

// ============================================================================
// TRANSFORMATION PACKAGES TABLE (Comprehensive bundled offerings)
// ============================================================================

export const transformationPackages = pgTable("transformation_packages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  facilityId: varchar("facility_id")
    .references(() => facilities.id, { onDelete: "cascade" })
    .notNull(),
  
  // Basic info
  name: text("name").notNull(),
  description: text("description"),
  
  // Pricing
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  billingFrequency: billingFrequencyEnum("billing_frequency").notNull().default("one_time"),
  
  // Duration
  durationMonths: integer("duration_months").notNull(), // e.g., 3, 6, 12 months
  
  // Lesson components
  includeLessons: boolean("include_lessons").default(true).notNull(),
  totalLessons: integer("total_lessons").default(0), // Total number of lessons included
  lessonDurationMinutes: integer("lesson_duration_minutes").default(60),
  lessonsPerWeek: integer("lessons_per_week").default(0), // For weekly scheduling
  lessonsPerMonth: integer("lessons_per_month").default(0), // For monthly scheduling
  assignedInstructorId: varchar("assigned_instructor_id").references(() => users.id),
  
  // Club fitting
  includeClubFitting: boolean("include_club_fitting").default(false).notNull(),
  clubFittingSessions: integer("club_fitting_sessions").default(1),
  assignedFitterId: varchar("assigned_fitter_id").references(() => users.id),
  
  // Bay access
  includeBayAccess: boolean("include_bay_access").default(true).notNull(),
  bayAccessHours: integer("bay_access_hours").default(0), // Total hours of bay access
  bayAccessPerWeek: integer("bay_access_per_week").default(0), // Hours per week if recurring
  allowedBayTiers: json("allowed_bay_tiers")
    .$type<string[]>()
    .default(sql`'["standard"]'::json`),
  
  // On-course practice
  includeOnCoursePractice: boolean("include_on_course_practice").default(false).notNull(),
  onCoursePracticeSessions: integer("on_course_practice_sessions").default(0),
  
  // Additional features
  features: json("features").$type<string[]>().default(sql`'[]'::json`), // Array of additional features
  
  // Availability
  isActive: boolean("is_active").default(true).notNull(),
  maxEnrollments: integer("max_enrollments"), // null = unlimited
  currentEnrollments: integer("current_enrollments").default(0).notNull(),
  
  // Automation integration
  tags: text("tags").array().default(sql`ARRAY[]::text[]`), // Tags for webhook/Zapier automation
  
  // Stripe (for later)
  stripePriceId: varchar("stripe_price_id"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const transformationPackagesRelations = relations(
  transformationPackages,
  ({ one }) => ({
    facility: one(facilities, {
      fields: [transformationPackages.facilityId],
      references: [facilities.id],
    }),
    assignedInstructor: one(users, {
      fields: [transformationPackages.assignedInstructorId],
      references: [users.id],
      relationName: "packageInstructor",
    }),
    assignedFitter: one(users, {
      fields: [transformationPackages.assignedFitterId],
      references: [users.id],
      relationName: "packageFitter",
    }),
  })
);

export const insertTransformationPackageSchema = createInsertSchema(
  transformationPackages
).omit({
  id: true,
  currentEnrollments: true,
  createdAt: true,
  updatedAt: true,
});

export const updateTransformationPackageSchema = createInsertSchema(
  transformationPackages
)
  .omit({
    id: true,
    facilityId: true,
    currentEnrollments: true,
    createdAt: true,
    updatedAt: true,
  })
  .partial();

export type TransformationPackage = typeof transformationPackages.$inferSelect;
export type InsertTransformationPackage = z.infer<typeof insertTransformationPackageSchema>;
export type UpdateTransformationPackage = z.infer<typeof updateTransformationPackageSchema>;

// ============================================================================
// TRANSFORMATION PACKAGE ENROLLMENTS TABLE (Track customer enrollments)
// ============================================================================

export const transformationPackageEnrollments = pgTable("transformation_package_enrollments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  facilityId: varchar("facility_id")
    .references(() => facilities.id, { onDelete: "cascade" })
    .notNull(),
  packageId: varchar("package_id")
    .references(() => transformationPackages.id, { onDelete: "cascade" })
    .notNull(),
  userId: varchar("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  
  // Enrollment period
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  
  // Usage tracking
  lessonsCompleted: integer("lessons_completed").default(0).notNull(),
  bayHoursUsed: numeric("bay_hours_used", { precision: 10, scale: 2 }).default("0").notNull(),
  fittingsCompleted: integer("fittings_completed").default(0).notNull(),
  onCoursePracticeCompleted: integer("on_course_practice_completed").default(0).notNull(),
  
  // Payment tracking
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("pending"),
  totalPaid: numeric("total_paid", { precision: 10, scale: 2 }).default("0").notNull(),
  
  // Referral tracking
  referredBy: varchar("referred_by").references(() => users.id),
  
  // Status
  isActive: boolean("is_active").default(true).notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const transformationPackageEnrollmentsRelations = relations(
  transformationPackageEnrollments,
  ({ one }) => ({
    facility: one(facilities, {
      fields: [transformationPackageEnrollments.facilityId],
      references: [facilities.id],
    }),
    package: one(transformationPackages, {
      fields: [transformationPackageEnrollments.packageId],
      references: [transformationPackages.id],
    }),
    user: one(users, {
      fields: [transformationPackageEnrollments.userId],
      references: [users.id],
    }),
  })
);

export const insertTransformationPackageEnrollmentSchema = createInsertSchema(
  transformationPackageEnrollments
).omit({
  id: true,
  lessonsCompleted: true,
  bayHoursUsed: true,
  fittingsCompleted: true,
  onCoursePracticeCompleted: true,
  totalPaid: true,
  createdAt: true,
  updatedAt: true,
});

export type TransformationPackageEnrollment = typeof transformationPackageEnrollments.$inferSelect;
export type InsertTransformationPackageEnrollment = z.infer<typeof insertTransformationPackageEnrollmentSchema>;

// ============================================================================
// STAFF AVAILABILITY HOURS TABLE (Weekly recurring schedule)
// ============================================================================

export const staffAvailabilityHours = pgTable("staff_availability_hours", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  facilityId: varchar("facility_id")
    .references(() => facilities.id, { onDelete: "cascade" })
    .notNull(),
  staffId: varchar("staff_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  
  // Day of week (0 = Sunday, 6 = Saturday)
  dayOfWeek: integer("day_of_week").notNull(),
  
  // Time ranges (e.g., "09:00", "17:00")
  startTime: varchar("start_time", { length: 5 }).notNull(),
  endTime: varchar("end_time", { length: 5 }).notNull(),
  
  isActive: boolean("is_active").default(true).notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const staffAvailabilityHoursRelations = relations(
  staffAvailabilityHours,
  ({ one }) => ({
    facility: one(facilities, {
      fields: [staffAvailabilityHours.facilityId],
      references: [facilities.id],
    }),
    staff: one(users, {
      fields: [staffAvailabilityHours.staffId],
      references: [users.id],
    }),
  })
);

export const insertStaffAvailabilityHoursSchema = createInsertSchema(
  staffAvailabilityHours
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type StaffAvailabilityHours = typeof staffAvailabilityHours.$inferSelect;
export type InsertStaffAvailabilityHours = z.infer<
  typeof insertStaffAvailabilityHoursSchema
>;

// ============================================================================
// GOOGLE CALENDAR TOKENS TABLE (OAuth credentials)
// ============================================================================

export const googleCalendarTokens = pgTable("google_calendar_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  staffId: varchar("staff_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  
  // Google Calendar ID to sync
  calendarId: varchar("calendar_id").default("primary"),
  
  // Settings
  autoMarkBusy: boolean("auto_mark_busy").default(true).notNull(),
  
  lastSyncedAt: timestamp("last_synced_at"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const googleCalendarTokensRelations = relations(
  googleCalendarTokens,
  ({ one }) => ({
    staff: one(users, {
      fields: [googleCalendarTokens.staffId],
      references: [users.id],
    }),
  })
);

export const insertGoogleCalendarTokenSchema = createInsertSchema(
  googleCalendarTokens
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type GoogleCalendarToken = typeof googleCalendarTokens.$inferSelect;
export type InsertGoogleCalendarToken = z.infer<
  typeof insertGoogleCalendarTokenSchema
>;

// ============================================================================
// GOOGLE CALENDAR EVENTS TABLE (Cached events)
// ============================================================================

export const googleCalendarEvents = pgTable("google_calendar_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  staffId: varchar("staff_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  
  // Google event ID (for deduplication and updates)
  googleEventId: varchar("google_event_id").notNull(),
  
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  
  summary: text("summary"),
  isBusy: boolean("is_busy").default(true).notNull(),
  
  // Sync metadata
  lastSyncedAt: timestamp("last_synced_at").notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const googleCalendarEventsRelations = relations(
  googleCalendarEvents,
  ({ one }) => ({
    staff: one(users, {
      fields: [googleCalendarEvents.staffId],
      references: [users.id],
    }),
  })
);

export const insertGoogleCalendarEventSchema = createInsertSchema(
  googleCalendarEvents
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type GoogleCalendarEvent = typeof googleCalendarEvents.$inferSelect;
export type InsertGoogleCalendarEvent = z.infer<
  typeof insertGoogleCalendarEventSchema
>;

// ============================================================================
// TIME ENTRIES TABLE (Hours tracking for staff)
// ============================================================================

export const timeEntries = pgTable("time_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  facilityId: varchar("facility_id")
    .references(() => facilities.id, { onDelete: "cascade" })
    .notNull(),
  staffId: varchar("staff_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  
  clockInTime: timestamp("clock_in_time").notNull(),
  clockOutTime: timestamp("clock_out_time"),
  totalHours: numeric("total_hours", { precision: 10, scale: 2 }),
  
  // Manual entry support
  isManualEntry: boolean("is_manual_entry").default(false),
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const timeEntriesRelations = relations(timeEntries, ({ one }) => ({
  facility: one(facilities, {
    fields: [timeEntries.facilityId],
    references: [facilities.id],
  }),
  staff: one(users, {
    fields: [timeEntries.staffId],
    references: [users.id],
  }),
}));

export const insertTimeEntrySchema = createInsertSchema(timeEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type TimeEntry = typeof timeEntries.$inferSelect;
export type InsertTimeEntry = z.infer<typeof insertTimeEntrySchema>;

// ============================================================================
// TASKS TABLE (Task assignments for staff)
// ============================================================================

export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  facilityId: varchar("facility_id")
    .references(() => facilities.id, { onDelete: "cascade" })
    .notNull(),
  
  title: text("title").notNull(),
  description: text("description"),
  
  assignedToId: varchar("assigned_to_id").references(() => users.id, {
    onDelete: "set null",
  }),
  createdById: varchar("created_by_id")
    .references(() => users.id, { onDelete: "set null" })
    .notNull(),
  
  status: taskStatusEnum("status").default("pending").notNull(),
  priority: taskPriorityEnum("priority").default("medium").notNull(),
  
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  
  // Recurring task settings
  isRecurring: boolean("is_recurring").default(false),
  recurrenceType: recurrenceTypeEnum("recurrence_type"),
  recurrenceEndDate: timestamp("recurrence_end_date"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tasksRelations = relations(tasks, ({ one }) => ({
  facility: one(facilities, {
    fields: [tasks.facilityId],
    references: [facilities.id],
  }),
  assignedTo: one(users, {
    fields: [tasks.assignedToId],
    references: [users.id],
    relationName: "assignedTasks",
  }),
  createdBy: one(users, {
    fields: [tasks.createdById],
    references: [users.id],
    relationName: "createdTasks",
  }),
}));

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

// ============================================================================
// COMMISSIONS TABLE (Track earnings from services)
// ============================================================================

export const commissions = pgTable("commissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  facilityId: varchar("facility_id")
    .references(() => facilities.id, { onDelete: "cascade" })
    .notNull(),
  staffId: varchar("staff_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  
  // Source of commission
  sourceType: varchar("source_type").notNull(), // "lesson", "fitting", "sale"
  sourceId: varchar("source_id").notNull(), // ID of the lesson/fitting/booking
  
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  rate: numeric("rate", { precision: 5, scale: 2 }).notNull(), // Commission rate used
  baseAmount: numeric("base_amount", { precision: 10, scale: 2 }).notNull(), // Original transaction amount
  
  paidOut: boolean("paid_out").default(false),
  paidOutAt: timestamp("paid_out_at"),
  
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const commissionsRelations = relations(commissions, ({ one }) => ({
  facility: one(facilities, {
    fields: [commissions.facilityId],
    references: [facilities.id],
  }),
  staff: one(users, {
    fields: [commissions.staffId],
    references: [users.id],
  }),
}));

export const insertCommissionSchema = createInsertSchema(commissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Commission = typeof commissions.$inferSelect;
export type InsertCommission = z.infer<typeof insertCommissionSchema>;

// ============================================================================
// TIPS TABLE (Track tips for staff)
// ============================================================================

export const tips = pgTable("tips", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  facilityId: varchar("facility_id")
    .references(() => facilities.id, { onDelete: "cascade" })
    .notNull(),
  staffId: varchar("staff_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  date: timestamp("date").notNull(),
  
  // Optional source information
  sourceType: varchar("source_type"), // "lesson", "fitting", "other"
  sourceId: varchar("source_id"),
  
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tipsRelations = relations(tips, ({ one }) => ({
  facility: one(facilities, {
    fields: [tips.facilityId],
    references: [facilities.id],
  }),
  staff: one(users, {
    fields: [tips.staffId],
    references: [users.id],
  }),
}));

export const insertTipSchema = createInsertSchema(tips).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Tip = typeof tips.$inferSelect;
export type InsertTip = z.infer<typeof insertTipSchema>;

// ============================================================================
// COMMISSION STRUCTURES TABLE (Define commission rules per product/staff)
// ============================================================================

export const commissionStructures = pgTable("commission_structures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  facilityId: varchar("facility_id")
    .references(() => facilities.id, { onDelete: "cascade" })
    .notNull(),
  staffId: varchar("staff_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  
  // What product/service this commission applies to
  productType: productTypeEnum("product_type").notNull(),
  productId: varchar("product_id"), // Optional: specific product, or null for all of that type
  
  // Commission calculation
  commissionType: commissionTypeEnum("commission_type").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(), // Dollar amount or percentage
  
  // Recurring payment handling
  recurringType: recurringCommissionTypeEnum("recurring_type").default("one_time"),
  recurringDuration: integer("recurring_duration"), // Number of months if X_months type
  
  isActive: boolean("is_active").default(true),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const commissionStructuresRelations = relations(commissionStructures, ({ one }) => ({
  facility: one(facilities, {
    fields: [commissionStructures.facilityId],
    references: [facilities.id],
  }),
  staff: one(users, {
    fields: [commissionStructures.staffId],
    references: [users.id],
  }),
}));

export const insertCommissionStructureSchema = createInsertSchema(commissionStructures).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CommissionStructure = typeof commissionStructures.$inferSelect;
export type InsertCommissionStructure = z.infer<typeof insertCommissionStructureSchema>;

// ============================================================================
// COMMISSION PAYMENTS TABLE (Track actual commission earnings from sales)
// ============================================================================

export const commissionPayments = pgTable("commission_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  facilityId: varchar("facility_id")
    .references(() => facilities.id, { onDelete: "cascade" })
    .notNull(),
  staffId: varchar("staff_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  commissionStructureId: varchar("commission_structure_id")
    .references(() => commissionStructures.id),
  
  // Sale information
  saleType: productTypeEnum("sale_type").notNull(),
  saleId: varchar("sale_id").notNull(),
  
  // Payment details
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  paymentDate: timestamp("payment_date").notNull(), // When the customer payment was processed
  status: varchar("status").default("pending"), // pending, paid, cancelled
  
  // Stripe integration
  stripePaymentId: varchar("stripe_payment_id"),
  
  // Refund tracking
  isRefund: boolean("is_refund").default(false), // True for negative commission adjustments
  refundedCommissionId: varchar("refunded_commission_id").references(() => commissionPayments.id),
  
  // Payroll tracking
  includedInPayrollId: varchar("included_in_payroll_id"),
  
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const commissionPaymentsRelations = relations(commissionPayments, ({ one }) => ({
  facility: one(facilities, {
    fields: [commissionPayments.facilityId],
    references: [facilities.id],
  }),
  staff: one(users, {
    fields: [commissionPayments.staffId],
    references: [users.id],
  }),
  commissionStructure: one(commissionStructures, {
    fields: [commissionPayments.commissionStructureId],
    references: [commissionStructures.id],
  }),
}));

export const insertCommissionPaymentSchema = createInsertSchema(commissionPayments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CommissionPayment = typeof commissionPayments.$inferSelect;
export type InsertCommissionPayment = z.infer<typeof insertCommissionPaymentSchema>;

// ============================================================================
// PAYROLL PAYMENTS TABLE (Track payroll periods and total payments)
// ============================================================================

export const payrollPayments = pgTable("payroll_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  facilityId: varchar("facility_id")
    .references(() => facilities.id, { onDelete: "cascade" })
    .notNull(),
  staffId: varchar("staff_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  
  // Pay period
  payPeriodStart: timestamp("pay_period_start").notNull(),
  payPeriodEnd: timestamp("pay_period_end").notNull(),
  
  // Breakdown of payment components
  salaryAmount: numeric("salary_amount", { precision: 10, scale: 2 }).default("0"),
  hourlyAmount: numeric("hourly_amount", { precision: 10, scale: 2 }).default("0"),
  commissionAmount: numeric("commission_amount", { precision: 10, scale: 2 }).default("0"),
  tipsAmount: numeric("tips_amount", { precision: 10, scale: 2 }).default("0"),
  bonusAmount: numeric("bonus_amount", { precision: 10, scale: 2 }).default("0"),
  deductionsAmount: numeric("deductions_amount", { precision: 10, scale: 2 }).default("0"),
  
  // Totals
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  
  // Hours worked (for hourly staff)
  hoursWorked: numeric("hours_worked", { precision: 10, scale: 2 }),
  
  // Status
  status: payrollStatusEnum("status").default("pending"),
  paidDate: timestamp("paid_date"),
  
  // Payment method
  paymentMethod: varchar("payment_method"), // check, direct_deposit, cash
  paymentReference: varchar("payment_reference"), // Check number, transaction ID, etc.
  
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const payrollPaymentsRelations = relations(payrollPayments, ({ one }) => ({
  facility: one(facilities, {
    fields: [payrollPayments.facilityId],
    references: [facilities.id],
  }),
  staff: one(users, {
    fields: [payrollPayments.staffId],
    references: [users.id],
  }),
}));

export const insertPayrollPaymentSchema = createInsertSchema(payrollPayments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type PayrollPayment = typeof payrollPayments.$inferSelect;
export type InsertPayrollPayment = z.infer<typeof insertPayrollPaymentSchema>;

// ============================================================================
// TRACKMAN INTEGRATION - Session Tracking & Shot Data
// ============================================================================

// Trackman Sessions - Simulator sessions (may or may not be linked to bookings)
export const trackmanSessions = pgTable("trackman_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  facilityId: varchar("facility_id")
    .references(() => facilities.id, { onDelete: "cascade" })
    .notNull(),
  bayId: varchar("bay_id")
    .references(() => bays.id, { onDelete: "cascade" })
    .notNull(),
  
  // Optional booking link (null for walk-ins)
  bookingId: varchar("booking_id").references(() => bookings.id, { onDelete: "set null" }),
  
  // User (null for anonymous walk-ins)
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  
  // Session metadata
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  totalShots: integer("total_shots").default(0).notNull(),
  
  // Session type
  sessionType: varchar("session_type"), // practice, lesson, fitting, competition
  
  // Trackman external ID
  trackmanSessionId: varchar("trackman_session_id").unique(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  facilityBayIdx: index("trackman_sessions_facility_bay_idx").on(table.facilityId, table.bayId),
  facilityUserIdx: index("trackman_sessions_facility_user_idx").on(table.facilityId, table.userId),
  bookingIdx: index("trackman_sessions_booking_idx").on(table.bookingId),
  startTimeIdx: index("trackman_sessions_start_time_idx").on(table.startTime),
}));

// Trackman Shots - Individual shot data with extensive metrics
export const trackmanShots = pgTable("trackman_shots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id")
    .references(() => trackmanSessions.id, { onDelete: "cascade" })
    .notNull(),
  facilityId: varchar("facility_id")
    .references(() => facilities.id, { onDelete: "cascade" })
    .notNull(),
  
  // Shot metadata
  shotNumber: integer("shot_number").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  club: varchar("club"), // Driver, 7 Iron, Pitching Wedge, etc.
  
  // Ball data
  ballSpeed: numeric("ball_speed", { precision: 5, scale: 2 }), // mph
  totalSpin: numeric("total_spin", { precision: 6, scale: 0 }), // rpm
  backSpin: numeric("back_spin", { precision: 6, scale: 0 }), // rpm
  sideSpin: numeric("side_spin", { precision: 6, scale: 0 }), // rpm
  spinAxis: numeric("spin_axis", { precision: 5, scale: 2 }), // degrees
  launchAngle: numeric("launch_angle", { precision: 5, scale: 2 }), // degrees
  launchDirection: numeric("launch_direction", { precision: 5, scale: 2 }), // degrees
  
  // Club data
  clubSpeed: numeric("club_speed", { precision: 5, scale: 2 }), // mph
  attackAngle: numeric("attack_angle", { precision: 5, scale: 2 }), // degrees
  clubPath: numeric("club_path", { precision: 5, scale: 2 }), // degrees
  faceAngle: numeric("face_angle", { precision: 5, scale: 2 }), // degrees
  faceToPath: numeric("face_to_path", { precision: 5, scale: 2 }), // degrees
  dynamicLoft: numeric("dynamic_loft", { precision: 5, scale: 2 }), // degrees
  
  // Impact data
  smashFactor: numeric("smash_factor", { precision: 4, scale: 3 }),
  impactOffset: numeric("impact_offset", { precision: 5, scale: 2 }), // inches from center
  
  // Distance data
  carryDistance: numeric("carry_distance", { precision: 6, scale: 2 }), // yards
  totalDistance: numeric("total_distance", { precision: 6, scale: 2 }), // yards
  offline: numeric("offline", { precision: 6, scale: 2 }), // yards
  curve: numeric("curve", { precision: 6, scale: 2 }), // yards (negative = left, positive = right)
  maxHeight: numeric("max_height", { precision: 6, scale: 2 }), // yards
  landingAngle: numeric("landing_angle", { precision: 5, scale: 2 }), // degrees
  hangTime: numeric("hang_time", { precision: 5, scale: 2 }), // seconds
  
  // Trackman external ID
  trackmanShotId: varchar("trackman_shot_id").unique(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  sessionIdx: index("trackman_shots_session_idx").on(table.sessionId),
  facilityTimestampIdx: index("trackman_shots_facility_timestamp_idx").on(table.facilityId, table.timestamp),
}));

export const trackmanShotsRelations = relations(trackmanShots, ({ one }) => ({
  session: one(trackmanSessions, {
    fields: [trackmanShots.sessionId],
    references: [trackmanSessions.id],
  }),
  facility: one(facilities, {
    fields: [trackmanShots.facilityId],
    references: [facilities.id],
  }),
}));

export const insertTrackmanShotSchema = createInsertSchema(trackmanShots).omit({
  id: true,
  createdAt: true,
});

export type TrackmanShot = typeof trackmanShots.$inferSelect;
export type InsertTrackmanShot = z.infer<typeof insertTrackmanShotSchema>;

// Trackman Sessions Relations (defined after trackmanShots to avoid initialization errors)
export const trackmanSessionsRelations = relations(trackmanSessions, ({ one, many }) => ({
  facility: one(facilities, {
    fields: [trackmanSessions.facilityId],
    references: [facilities.id],
  }),
  bay: one(bays, {
    fields: [trackmanSessions.bayId],
    references: [bays.id],
  }),
  booking: one(bookings, {
    fields: [trackmanSessions.bookingId],
    references: [bookings.id],
  }),
  user: one(users, {
    fields: [trackmanSessions.userId],
    references: [users.id],
  }),
  shots: many(trackmanShots),
}));

export const insertTrackmanSessionSchema = createInsertSchema(trackmanSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type TrackmanSession = typeof trackmanSessions.$inferSelect;
export type InsertTrackmanSession = z.infer<typeof insertTrackmanSessionSchema>;

// Bay Wear Tracking - Aggregate wear data per bay
export const bayWearTracking = pgTable("bay_wear_tracking", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  facilityId: varchar("facility_id")
    .references(() => facilities.id, { onDelete: "cascade" })
    .notNull(),
  bayId: varchar("bay_id")
    .references(() => bays.id, { onDelete: "cascade" })
    .notNull(),
  
  // Time period identifier: "2025-10-26" (daily), "2025-W43" (weekly), "2025-10" (monthly), "lifetime"
  period: varchar("period").notNull(),
  
  // Wear metrics
  totalShots: integer("total_shots").default(0).notNull(),
  totalWearScore: numeric("total_wear_score", { precision: 12, scale: 2 }).default("0").notNull(),
  averageWearScore: numeric("average_wear_score", { precision: 10, scale: 2 }).default("0").notNull(),
  
  // Shot breakdown
  bookedShots: integer("booked_shots").default(0).notNull(),
  walkInShots: integer("walk_in_shots").default(0).notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  facilityBayPeriodIdx: uniqueIndex("bay_wear_facility_bay_period_idx").on(
    table.facilityId,
    table.bayId,
    table.period
  ),
  bayPeriodIdx: index("bay_wear_bay_period_idx").on(table.bayId, table.period),
}));

export const bayWearTrackingRelations = relations(bayWearTracking, ({ one }) => ({
  facility: one(facilities, {
    fields: [bayWearTracking.facilityId],
    references: [facilities.id],
  }),
  bay: one(bays, {
    fields: [bayWearTracking.bayId],
    references: [bays.id],
  }),
}));

export const insertBayWearTrackingSchema = createInsertSchema(bayWearTracking).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type BayWearTracking = typeof bayWearTracking.$inferSelect;
export type InsertBayWearTracking = z.infer<typeof insertBayWearTrackingSchema>;

// ============================================================================
// GOLF MARKETING OS - Event-Driven Marketing Automation
// ============================================================================

// Marketing Enums
export const marketingChannelTypeEnum = pgEnum("marketing_channel_type", [
  "email",
  "sms",
  "in_app_banner",
  "in_app_notification",
  "push_notification",
]);

export const marketingEventTypeEnum = pgEnum("marketing_event_type", [
  "swing_pattern.slice_detected",
  "swing_pattern.hook_detected",
  "swing_pattern.distance_loss_detected",
  "swing_pattern.poor_contact_detected",
  "trackman.session_completed",
  "trackman.shot_captured",
  "booking_created",
  "booking_no_show",
  "membership_expiring",
  "inactivity_detected",
  "milestone_achieved",
]);

export const marketingTriggerStatusEnum = pgEnum("marketing_trigger_status", [
  "active",
  "paused",
  "draft",
]);

export const marketingCampaignStatusEnum = pgEnum("marketing_campaign_status", [
  "draft",
  "scheduled",
  "active",
  "paused",
  "completed",
]);

export const marketingMessageStatusEnum = pgEnum("marketing_message_status", [
  "queued",
  "sending",
  "sent",
  "failed",
  "cancelled",
]);

export const marketingJourneyStepTypeEnum = pgEnum("marketing_journey_step_type", [
  "send_message",
  "wait_delay",
  "conditional_split",
  "add_to_segment",
  "remove_from_segment",
]);

// Marketing Events - Raw events ingested from various sources
export const marketingEvents = pgTable("marketing_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  facilityId: varchar("facility_id")
    .references(() => facilities.id, { onDelete: "cascade" })
    .notNull(),
  
  eventType: marketingEventTypeEnum("event_type").notNull(),
  userId: varchar("user_id").references(() => users.id),
  bookingId: varchar("booking_id").references(() => bookings.id),
  
  // Event metadata (flexible JSON for different event types)
  eventData: jsonb("event_data").notNull(),
  
  // Tracking
  processed: boolean("processed").default(false).notNull(),
  processedAt: timestamp("processed_at"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  facilityEventTypeIdx: index("facility_event_type_idx").on(table.facilityId, table.eventType),
  facilityProcessedIdx: index("facility_processed_idx").on(table.facilityId, table.processed),
}));

export const marketingEventsRelations = relations(marketingEvents, ({ one }) => ({
  facility: one(facilities, {
    fields: [marketingEvents.facilityId],
    references: [facilities.id],
  }),
  user: one(users, {
    fields: [marketingEvents.userId],
    references: [users.id],
  }),
  booking: one(bookings, {
    fields: [marketingEvents.bookingId],
    references: [bookings.id],
  }),
}));

export type MarketingEvent = typeof marketingEvents.$inferSelect;

// Contact Preferences - Opt-in/opt-out management
export const marketingContactPreferences = pgTable("marketing_contact_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  facilityId: varchar("facility_id")
    .references(() => facilities.id, { onDelete: "cascade" })
    .notNull(),
  
  // Channel opt-ins
  emailOptIn: boolean("email_opt_in").default(true).notNull(),
  smsOptIn: boolean("sms_opt_in").default(false).notNull(),
  pushOptIn: boolean("push_opt_in").default(true).notNull(),
  
  // Category opt-ins
  marketingOptIn: boolean("marketing_opt_in").default(true).notNull(),
  transactionalOptIn: boolean("transactional_opt_in").default(true).notNull(),
  
  // Compliance
  emailOptInDate: timestamp("email_opt_in_date"),
  smsOptInDate: timestamp("sms_opt_in_date"),
  emailOptOutDate: timestamp("email_opt_out_date"),
  smsOptOutDate: timestamp("sms_opt_out_date"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniqueUserFacility: uniqueIndex("unique_user_facility_pref").on(table.userId, table.facilityId),
}));

export const marketingContactPreferencesRelations = relations(marketingContactPreferences, ({ one }) => ({
  user: one(users, {
    fields: [marketingContactPreferences.userId],
    references: [users.id],
  }),
  facility: one(facilities, {
    fields: [marketingContactPreferences.facilityId],
    references: [facilities.id],
  }),
}));

export type MarketingContactPreference = typeof marketingContactPreferences.$inferSelect;

// Marketing Templates
export const marketingTemplates = pgTable("marketing_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  facilityId: varchar("facility_id")
    .references(() => facilities.id, { onDelete: "cascade" })
    .notNull(),
  
  name: text("name").notNull(),
  description: text("description"),
  channel: marketingChannelTypeEnum("channel").notNull(),
  
  // Template content
  subject: text("subject"), // For email
  body: text("body").notNull(), // Supports variables like {{firstName}}
  
  // Metadata
  isActive: boolean("is_active").default(true).notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const marketingTemplatesRelations = relations(marketingTemplates, ({ one }) => ({
  facility: one(facilities, {
    fields: [marketingTemplates.facilityId],
    references: [facilities.id],
  }),
}));

export type MarketingTemplate = typeof marketingTemplates.$inferSelect;

// Marketing Segments - Audience definitions
export const marketingSegments = pgTable("marketing_segments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  facilityId: varchar("facility_id")
    .references(() => facilities.id, { onDelete: "cascade" })
    .notNull(),
  
  name: text("name").notNull(),
  description: text("description"),
  
  // Segment criteria (JSON for flexibility)
  criteria: jsonb("criteria").notNull(), // e.g., {role: "customer", membershipTier: "premium"}
  
  // Dynamic vs static
  isDynamic: boolean("is_dynamic").default(true).notNull(), // Recalculates membership
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const marketingSegmentsRelations = relations(marketingSegments, ({ one }) => ({
  facility: one(facilities, {
    fields: [marketingSegments.facilityId],
    references: [facilities.id],
  }),
}));

export type MarketingSegment = typeof marketingSegments.$inferSelect;

// Marketing Campaigns
export const marketingCampaigns = pgTable("marketing_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  facilityId: varchar("facility_id")
    .references(() => facilities.id, { onDelete: "cascade" })
    .notNull(),
  
  name: text("name").notNull(),
  description: text("description"),
  status: marketingCampaignStatusEnum("status").default("draft").notNull(),
  
  // Scheduling
  scheduledAt: timestamp("scheduled_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  
  // Stats
  totalSent: integer("total_sent").default(0),
  totalDelivered: integer("total_delivered").default(0),
  totalFailed: integer("total_failed").default(0),
  totalClicked: integer("total_clicked").default(0),
  totalConverted: integer("total_converted").default(0),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const marketingCampaignsRelations = relations(marketingCampaigns, ({ one }) => ({
  facility: one(facilities, {
    fields: [marketingCampaigns.facilityId],
    references: [facilities.id],
  }),
}));

export type MarketingCampaign = typeof marketingCampaigns.$inferSelect;

// Marketing Triggers - Event-based campaign rules
export const marketingTriggers = pgTable("marketing_triggers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  facilityId: varchar("facility_id")
    .references(() => facilities.id, { onDelete: "cascade" })
    .notNull(),
  campaignId: varchar("campaign_id").references(() => marketingCampaigns.id),
  
  name: text("name").notNull(),
  description: text("description"),
  status: marketingTriggerStatusEnum("status").default("draft").notNull(),
  
  // Trigger configuration
  eventType: marketingEventTypeEnum("event_type").notNull(),
  eventConditions: jsonb("event_conditions"), // Additional filtering on event data
  
  // Target audience
  segmentId: varchar("segment_id").references(() => marketingSegments.id),
  
  // Message configuration
  channel: marketingChannelTypeEnum("channel").notNull(),
  templateId: varchar("template_id").references(() => marketingTemplates.id),
  
  // Throttling
  maxSendsPerDay: integer("max_sends_per_day"),
  cooldownHours: integer("cooldown_hours").default(24), // Min hours between sends to same user
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const marketingTriggersRelations = relations(marketingTriggers, ({ one }) => ({
  facility: one(facilities, {
    fields: [marketingTriggers.facilityId],
    references: [facilities.id],
  }),
  campaign: one(marketingCampaigns, {
    fields: [marketingTriggers.campaignId],
    references: [marketingCampaigns.id],
  }),
  segment: one(marketingSegments, {
    fields: [marketingTriggers.segmentId],
    references: [marketingSegments.id],
  }),
  template: one(marketingTemplates, {
    fields: [marketingTriggers.templateId],
    references: [marketingTemplates.id],
  }),
}));

export type MarketingTrigger = typeof marketingTriggers.$inferSelect;

// Marketing Message Queue
export const marketingMessageQueue = pgTable("marketing_message_queue", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  facilityId: varchar("facility_id")
    .references(() => facilities.id, { onDelete: "cascade" })
    .notNull(),
  
  // Recipient
  userId: varchar("user_id").references(() => users.id).notNull(),
  
  // Message details
  channel: marketingChannelTypeEnum("channel").notNull(),
  subject: text("subject"),
  body: text("body").notNull(),
  
  // Tracking
  campaignId: varchar("campaign_id").references(() => marketingCampaigns.id),
  triggerId: varchar("trigger_id").references(() => marketingTriggers.id),
  
  // Status
  status: marketingMessageStatusEnum("status").default("queued").notNull(),
  scheduledFor: timestamp("scheduled_for").defaultNow().notNull(),
  sentAt: timestamp("sent_at"),
  
  // Retry logic
  attempts: integer("attempts").default(0).notNull(),
  lastAttemptAt: timestamp("last_attempt_at"),
  errorMessage: text("error_message"),
  
  // Idempotency
  idempotencyKey: varchar("idempotency_key").unique(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  facilityStatusScheduledIdx: index("facility_status_scheduled_idx").on(table.facilityId, table.status, table.scheduledFor),
}));

export const marketingMessageQueueRelations = relations(marketingMessageQueue, ({ one }) => ({
  facility: one(facilities, {
    fields: [marketingMessageQueue.facilityId],
    references: [facilities.id],
  }),
  user: one(users, {
    fields: [marketingMessageQueue.userId],
    references: [users.id],
  }),
  campaign: one(marketingCampaigns, {
    fields: [marketingMessageQueue.campaignId],
    references: [marketingCampaigns.id],
  }),
  trigger: one(marketingTriggers, {
    fields: [marketingMessageQueue.triggerId],
    references: [marketingTriggers.id],
  }),
}));

export type MarketingMessageQueue = typeof marketingMessageQueue.$inferSelect;

// Marketing Delivery Log
export const marketingDeliveryLog = pgTable("marketing_delivery_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  facilityId: varchar("facility_id")
    .references(() => facilities.id, { onDelete: "cascade" })
    .notNull(),
  
  messageId: varchar("message_id").references(() => marketingMessageQueue.id),
  userId: varchar("user_id").references(() => users.id).notNull(),
  
  channel: marketingChannelTypeEnum("channel").notNull(),
  status: marketingMessageStatusEnum("status").notNull(),
  
  // External provider tracking
  externalId: varchar("external_id"), // Provider's message ID (SendGrid, Twilio, etc.)
  
  // Engagement tracking
  deliveredAt: timestamp("delivered_at"),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
  convertedAt: timestamp("converted_at"),
  
  errorMessage: text("error_message"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  facilityUserChannelIdx: index("facility_user_channel_idx").on(table.facilityId, table.userId, table.channel),
  facilityCreatedIdx: index("facility_created_idx").on(table.facilityId, table.createdAt),
}));

export const marketingDeliveryLogRelations = relations(marketingDeliveryLog, ({ one }) => ({
  facility: one(facilities, {
    fields: [marketingDeliveryLog.facilityId],
    references: [facilities.id],
  }),
  message: one(marketingMessageQueue, {
    fields: [marketingDeliveryLog.messageId],
    references: [marketingMessageQueue.id],
  }),
  user: one(users, {
    fields: [marketingDeliveryLog.userId],
    references: [users.id],
  }),
}));

export type MarketingDeliveryLog = typeof marketingDeliveryLog.$inferSelect;

// Marketing Banner Announcements (In-App)
export const marketingBannerAnnouncements = pgTable("marketing_banner_announcements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  facilityId: varchar("facility_id")
    .references(() => facilities.id, { onDelete: "cascade" })
    .notNull(),
  
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: varchar("type").default("info").notNull(), // info, warning, success, error
  
  // Targeting
  segmentId: varchar("segment_id").references(() => marketingSegments.id),
  
  // Scheduling
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  
  // Display settings
  dismissible: boolean("dismissible").default(true).notNull(),
  priority: integer("priority").default(0).notNull(),
  
  isActive: boolean("is_active").default(true).notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const marketingBannerAnnouncementsRelations = relations(marketingBannerAnnouncements, ({ one }) => ({
  facility: one(facilities, {
    fields: [marketingBannerAnnouncements.facilityId],
    references: [facilities.id],
  }),
  segment: one(marketingSegments, {
    fields: [marketingBannerAnnouncements.segmentId],
    references: [marketingSegments.id],
  }),
}));

export type MarketingBannerAnnouncement = typeof marketingBannerAnnouncements.$inferSelect;

// ============================================================================
// WIDGET CONFIGURATIONS
// ============================================================================

export const widgetTypeEnum = pgEnum("widget_type", [
  "rental", // Bay rental booking widget
  "lesson", // Lesson booking widget
  "fitting", // Club fitting booking widget
]);

export const widgetDisplayModeEnum = pgEnum("widget_display_mode", [
  "full", // Full page width
  "partial", // Partial width (e.g., 2/3 width)
  "sidebar", // Sidebar width (narrow)
]);

export const widgetConfigurations = pgTable("widget_configurations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  facilityId: varchar("facility_id")
    .references(() => facilities.id, { onDelete: "cascade" })
    .notNull(),
  widgetType: widgetTypeEnum("widget_type").notNull(),
  
  // Display settings
  displayMode: widgetDisplayModeEnum("display_mode").default("full").notNull(),
  showLogo: boolean("show_logo").default(true).notNull(),
  showDescription: boolean("show_description").default(true).notNull(),
  
  // Styling
  primaryColor: varchar("primary_color"),
  accentColor: varchar("accent_color"),
  backgroundColor: varchar("background_color"),
  textColor: varchar("text_color"),
  borderRadius: varchar("border_radius").default("8px"),
  
  // Content
  customTitle: text("custom_title"),
  customDescription: text("custom_description"),
  
  // Size settings
  maxWidth: varchar("max_width").default("1200px"),
  minHeight: varchar("min_height").default("600px"),
  
  // Behavior
  showPricing: boolean("show_pricing").default(true).notNull(),
  requirePhone: boolean("require_phone").default(false).notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const widgetConfigurationsRelations = relations(widgetConfigurations, ({ one }) => ({
  facility: one(facilities, {
    fields: [widgetConfigurations.facilityId],
    references: [facilities.id],
  }),
}));

export type WidgetConfiguration = typeof widgetConfigurations.$inferSelect;
export const insertWidgetConfigurationSchema = createInsertSchema(widgetConfigurations).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWidgetConfiguration = z.infer<typeof insertWidgetConfigurationSchema>;
