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
  "facility_admin",
  "instructor",
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
  hourlyRate: numeric("hourly_rate", { precision: 10, scale: 2 }), // Discounted rate
  monthlyHours: integer("monthly_hours").default(0), // Included hours
  
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
  bayId: varchar("bay_id")
    .references(() => bays.id, { onDelete: "cascade" })
    .notNull(),
  
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  type: bookingTypeEnum("type").notNull().default("rental"),
  
  // Payment
  paymentStatus: paymentStatusEnum("payment_status")
    .notNull()
    .default("pending"),
  amount: numeric("amount", { precision: 10, scale: 2 }),
  stripePaymentId: varchar("stripe_payment_id"),
  
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
  bay: one(bays, {
    fields: [bookings.bayId],
    references: [bays.id],
  }),
}));

export const insertBookingSchema = createInsertSchema(bookings)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    bayId: z.string().optional(), // Optional - will be auto-assigned if not provided
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
