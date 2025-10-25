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
  "member",
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
]);

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
  
  // Stripe Connect (for later)
  stripeAccountId: varchar("stripe_account_id"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const facilitiesRelations = relations(facilities, ({ many }) => ({
  users: many(users),
  bays: many(bays),
  bookings: many(bookings),
  membershipTiers: many(membershipTiers),
  lessons: many(lessons),
  fittings: many(fittings),
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
  
  // Role-based access
  role: userRoleEnum("role").notNull().default("member"),
  
  // Membership
  membershipTierId: varchar("membership_tier_id").references(
    () => membershipTiers.id
  ),
  monthlyCreditsRemaining: integer("monthly_credits_remaining").default(0),
  
  // Staff-specific fields (for instructors, fitters, admins)
  bio: text("bio"),
  specialties: varchar("specialties").array(),
  hourlyRate: numeric("hourly_rate", { precision: 10, scale: 2 }),
  googleCalendarId: varchar("google_calendar_id"),
  
  // External integrations (for later)
  ghlContactId: varchar("ghl_contact_id"),
  stripeCustomerId: varchar("stripe_customer_id"),
  
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
  bookings: many(bookings),
  instructedLessons: many(lessons, { relationName: "instructor" }),
  studentLessons: many(lessons, { relationName: "student" }),
  fittings: many(fittings),
}));

export const upsertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export type User = typeof users.$inferSelect;
export type UpsertUser = z.infer<typeof upsertUserSchema>;

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
  tier: bayTierEnum("tier").notNull().default("standard"),
  status: bayStatusEnum("status").notNull().default("active"),
  
  // Usage tracking
  usageHours: integer("usage_hours").default(0).notNull(),
  lastRotation: timestamp("last_rotation"),
  maintenanceNotes: text("maintenance_notes"),
  
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
  userId: varchar("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  bayIds: varchar("bay_ids").array().notNull(),
  
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  type: bookingTypeEnum("type").notNull().default("rental"),
  
  // Payment
  paymentStatus: paymentStatusEnum("payment_status")
    .notNull()
    .default("pending"),
  amount: numeric("amount", { precision: 10, scale: 2 }),
  stripePaymentId: varchar("stripe_payment_id"),
  
  // Membership usage tracking
  usedMembershipHours: boolean("used_membership_hours").default(false), // Was this covered by membership?
  membershipHoursUsed: numeric("membership_hours_used", { precision: 10, scale: 2 }).default("0"), // How many hours from package
  
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
  })
  .extend({
    bayIds: z.array(z.string()).min(1).optional(), // Optional - will be auto-assigned if not provided
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
