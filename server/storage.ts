// Referenced from javascript_log_in_with_replit and javascript_database integrations
import {
  users,
  facilities,
  bays,
  bayBlocks,
  bookings,
  membershipTiers,
  leads,
  lessons,
  lessonPackages,
  fittings,
  offerings,
  transformationPackages,
  transformationPackageEnrollments,
  staffAvailabilityHours,
  googleCalendarTokens,
  googleCalendarEvents,
  type User,
  type UpsertUser,
  type Facility,
  type InsertFacility,
  type Bay,
  type InsertBay,
  type BayBlock,
  type InsertBayBlock,
  type Booking,
  type InsertBooking,
  type MembershipTier,
  type InsertMembershipTier,
  type Lead,
  type InsertLead,
  type UpdateLead,
  type Lesson,
  type InsertLesson,
  type LessonPackage,
  type InsertLessonPackage,
  type UpdateLessonPackage,
  type Fitting,
  type InsertFitting,
  type Offering,
  type InsertOffering,
  type UpdateOffering,
  type TransformationPackage,
  type InsertTransformationPackage,
  type UpdateTransformationPackage,
  type TransformationPackageEnrollment,
  type InsertTransformationPackageEnrollment,
  type StaffAvailabilityHours,
  type InsertStaffAvailabilityHours,
  type GoogleCalendarToken,
  type InsertGoogleCalendarToken,
  type GoogleCalendarEvent,
  type InsertGoogleCalendarEvent,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, gt, lt, asc, desc } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserFacility(userId: string, facilityId: string, role: string): Promise<void>;
  
  // Facilities
  getFacilities(): Promise<Facility[]>;
  getFacility(id: string): Promise<Facility | undefined>;
  createFacility(facility: InsertFacility): Promise<Facility>;
  
  // Bays
  getBays(facilityId?: string): Promise<Bay[]>;
  getBay(id: string): Promise<Bay | undefined>;
  createBay(bay: InsertBay): Promise<Bay>;
  updateBay(id: string, bay: Partial<InsertBay>): Promise<Bay>;
  updateBayUsage(id: string, hours: number): Promise<void>;
  deleteBay(id: string): Promise<void>;
  
  // Bay Blocks
  getBayBlocks(facilityId?: string): Promise<BayBlock[]>;
  getBayBlock(id: string): Promise<BayBlock | undefined>;
  getBayBlocksByBay(bayId: string): Promise<BayBlock[]>;
  getBayBlocksByDateRange(facilityId: string, start: Date, end: Date): Promise<BayBlock[]>;
  createBayBlock(block: InsertBayBlock): Promise<BayBlock>;
  updateBayBlock(id: string, block: Partial<InsertBayBlock>): Promise<BayBlock>;
  deleteBayBlock(id: string): Promise<void>;
  
  // Bookings
  getBookings(facilityId?: string): Promise<Booking[]>;
  getBooking(id: string): Promise<Booking | undefined>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  getBookingsByDateRange(facilityId: string, start: Date, end: Date): Promise<Booking[]>;
  
  // Membership Tiers
  getMembershipTiers(facilityId?: string): Promise<MembershipTier[]>;
  getMembershipTier(id: string): Promise<MembershipTier | undefined>;
  createMembershipTier(tier: InsertMembershipTier): Promise<MembershipTier>;
  
  // Members
  getMembers(facilityId?: string): Promise<User[]>;
  
  // Leads
  getLeads(facilityId?: string): Promise<Lead[]>;
  getLead(id: string): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: string, lead: UpdateLead): Promise<Lead>;
  deleteLead(id: string): Promise<void>;
  
  // Lessons
  getLessons(facilityId?: string): Promise<Lesson[]>;
  getLesson(id: string): Promise<Lesson | undefined>;
  createLesson(lesson: InsertLesson): Promise<Lesson>;
  
  // Lesson Packages
  getLessonPackages(facilityId?: string): Promise<LessonPackage[]>;
  getLessonPackage(id: string): Promise<LessonPackage | undefined>;
  createLessonPackage(pkg: InsertLessonPackage): Promise<LessonPackage>;
  updateLessonPackage(id: string, pkg: UpdateLessonPackage): Promise<LessonPackage>;
  deleteLessonPackage(id: string): Promise<void>;
  
  // Fittings
  getFittings(facilityId?: string): Promise<Fitting[]>;
  getFitting(id: string): Promise<Fitting | undefined>;
  createFitting(fitting: InsertFitting): Promise<Fitting>;
  
  // Offerings
  getOfferings(facilityId?: string): Promise<Offering[]>;
  getOffering(id: string): Promise<Offering | undefined>;
  createOffering(offering: InsertOffering): Promise<Offering>;
  updateOffering(id: string, offering: UpdateOffering): Promise<Offering>;
  deleteOffering(id: string): Promise<void>;
  
  // Staff Availability Hours
  getStaffAvailabilityHours(staffId: string): Promise<StaffAvailabilityHours[]>;
  createStaffAvailabilityHours(hours: InsertStaffAvailabilityHours): Promise<StaffAvailabilityHours>;
  deleteStaffAvailabilityHours(id: string): Promise<void>;
  
  // Google Calendar Tokens
  getGoogleCalendarToken(staffId: string): Promise<GoogleCalendarToken | undefined>;
  upsertGoogleCalendarToken(token: InsertGoogleCalendarToken): Promise<GoogleCalendarToken>;
  deleteGoogleCalendarToken(staffId: string): Promise<void>;
  
  // Google Calendar Events
  getGoogleCalendarEvents(staffId: string, start: Date, end: Date): Promise<GoogleCalendarEvent[]>;
  upsertGoogleCalendarEvent(event: InsertGoogleCalendarEvent): Promise<GoogleCalendarEvent>;
  deleteOldGoogleCalendarEvents(staffId: string, before: Date): Promise<void>;
  
  // Transformation Packages
  getTransformationPackages(facilityId?: string): Promise<TransformationPackage[]>;
  getTransformationPackage(id: string): Promise<TransformationPackage | undefined>;
  createTransformationPackage(pkg: InsertTransformationPackage): Promise<TransformationPackage>;
  updateTransformationPackage(id: string, pkg: UpdateTransformationPackage): Promise<TransformationPackage>;
  deleteTransformationPackage(id: string): Promise<void>;
  
  // Transformation Package Enrollments
  getTransformationPackageEnrollments(facilityId?: string): Promise<TransformationPackageEnrollment[]>;
  getTransformationPackageEnrollment(id: string): Promise<TransformationPackageEnrollment | undefined>;
  createTransformationPackageEnrollment(enrollment: InsertTransformationPackageEnrollment): Promise<TransformationPackageEnrollment>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserFacility(userId: string, facilityId: string, role: string): Promise<void> {
    await db
      .update(users)
      .set({
        facilityId,
        role: role as any,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  // Facilities
  async getFacilities(): Promise<Facility[]> {
    return await db.select().from(facilities).orderBy(desc(facilities.createdAt));
  }

  async getFacility(id: string): Promise<Facility | undefined> {
    const [facility] = await db
      .select()
      .from(facilities)
      .where(eq(facilities.id, id));
    return facility;
  }

  async createFacility(facilityData: InsertFacility): Promise<Facility> {
    const [facility] = await db
      .insert(facilities)
      .values(facilityData)
      .returning();
    return facility;
  }

  // Bays
  async getBays(facilityId?: string): Promise<Bay[]> {
    if (facilityId) {
      return await db
        .select()
        .from(bays)
        .where(eq(bays.facilityId, facilityId))
        .orderBy(asc(bays.name));
    }
    return await db.select().from(bays).orderBy(asc(bays.name));
  }

  async getBay(id: string): Promise<Bay | undefined> {
    const [bay] = await db.select().from(bays).where(eq(bays.id, id));
    return bay;
  }

  async createBay(bayData: InsertBay): Promise<Bay> {
    const [bay] = await db.insert(bays).values(bayData).returning();
    return bay;
  }

  async updateBay(id: string, bayData: Partial<InsertBay>): Promise<Bay> {
    const [bay] = await db
      .update(bays)
      .set({ ...bayData, updatedAt: new Date() })
      .where(eq(bays.id, id))
      .returning();
    return bay;
  }

  async updateBayUsage(id: string, hours: number): Promise<void> {
    await db
      .update(bays)
      .set({ usageHours: hours, updatedAt: new Date() })
      .where(eq(bays.id, id));
  }

  async deleteBay(id: string): Promise<void> {
    await db.delete(bays).where(eq(bays.id, id));
  }

  // Bay Blocks
  async getBayBlocks(facilityId?: string): Promise<BayBlock[]> {
    if (facilityId) {
      return await db
        .select()
        .from(bayBlocks)
        .where(eq(bayBlocks.facilityId, facilityId))
        .orderBy(asc(bayBlocks.startTime));
    }
    return await db.select().from(bayBlocks).orderBy(asc(bayBlocks.startTime));
  }

  async getBayBlock(id: string): Promise<BayBlock | undefined> {
    const [block] = await db
      .select()
      .from(bayBlocks)
      .where(eq(bayBlocks.id, id));
    return block;
  }

  async getBayBlocksByBay(bayId: string): Promise<BayBlock[]> {
    return await db
      .select()
      .from(bayBlocks)
      .where(eq(bayBlocks.bayId, bayId))
      .orderBy(asc(bayBlocks.startTime));
  }

  async getBayBlocksByDateRange(
    facilityId: string,
    start: Date,
    end: Date
  ): Promise<BayBlock[]> {
    return await db
      .select()
      .from(bayBlocks)
      .where(
        and(
          eq(bayBlocks.facilityId, facilityId),
          lt(bayBlocks.startTime, end),
          gt(bayBlocks.endTime, start)
        )
      )
      .orderBy(asc(bayBlocks.startTime));
  }

  async createBayBlock(blockData: InsertBayBlock): Promise<BayBlock> {
    const [block] = await db
      .insert(bayBlocks)
      .values(blockData)
      .returning();
    return block;
  }

  async updateBayBlock(
    id: string,
    blockData: Partial<InsertBayBlock>
  ): Promise<BayBlock> {
    const [block] = await db
      .update(bayBlocks)
      .set({ ...blockData, updatedAt: new Date() })
      .where(eq(bayBlocks.id, id))
      .returning();
    return block;
  }

  async deleteBayBlock(id: string): Promise<void> {
    await db.delete(bayBlocks).where(eq(bayBlocks.id, id));
  }

  // Bookings
  async getBookings(facilityId?: string): Promise<Booking[]> {
    if (facilityId) {
      return await db
        .select()
        .from(bookings)
        .where(eq(bookings.facilityId, facilityId))
        .orderBy(desc(bookings.startTime));
    }
    return await db.select().from(bookings).orderBy(desc(bookings.startTime));
  }

  async getBooking(id: string): Promise<Booking | undefined> {
    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, id));
    return booking;
  }

  async createBooking(bookingData: InsertBooking): Promise<Booking> {
    const [booking] = await db
      .insert(bookings)
      .values(bookingData)
      .returning();
    return booking;
  }

  async getBookingsByDateRange(
    facilityId: string,
    start: Date,
    end: Date
  ): Promise<Booking[]> {
    return await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.facilityId, facilityId),
          gte(bookings.startTime, start),
          lte(bookings.endTime, end)
        )
      )
      .orderBy(asc(bookings.startTime));
  }

  // Membership Tiers
  async getMembershipTiers(facilityId?: string): Promise<MembershipTier[]> {
    if (facilityId) {
      return await db
        .select()
        .from(membershipTiers)
        .where(eq(membershipTiers.facilityId, facilityId))
        .orderBy(asc(membershipTiers.tierLevel));
    }
    return await db
      .select()
      .from(membershipTiers)
      .orderBy(asc(membershipTiers.tierLevel));
  }

  async getMembershipTier(id: string): Promise<MembershipTier | undefined> {
    const [tier] = await db
      .select()
      .from(membershipTiers)
      .where(eq(membershipTiers.id, id));
    return tier;
  }

  async createMembershipTier(
    tierData: InsertMembershipTier
  ): Promise<MembershipTier> {
    const [tier] = await db
      .insert(membershipTiers)
      .values(tierData)
      .returning();
    return tier;
  }

  // Members
  async getMembers(facilityId?: string): Promise<User[]> {
    if (facilityId) {
      return await db
        .select()
        .from(users)
        .where(eq(users.facilityId, facilityId))
        .orderBy(desc(users.createdAt));
    }
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  // Leads
  async getLeads(facilityId?: string): Promise<Lead[]> {
    if (facilityId) {
      return await db
        .select()
        .from(leads)
        .where(eq(leads.facilityId, facilityId))
        .orderBy(desc(leads.createdAt));
    }
    return await db.select().from(leads).orderBy(desc(leads.createdAt));
  }

  async getLead(id: string): Promise<Lead | undefined> {
    const [lead] = await db
      .select()
      .from(leads)
      .where(eq(leads.id, id));
    return lead;
  }

  async createLead(leadData: InsertLead): Promise<Lead> {
    const [lead] = await db
      .insert(leads)
      .values(leadData)
      .returning();
    return lead;
  }

  async updateLead(id: string, leadData: UpdateLead): Promise<Lead> {
    const [lead] = await db
      .update(leads)
      .set(leadData)
      .where(eq(leads.id, id))
      .returning();
    return lead;
  }

  async deleteLead(id: string): Promise<void> {
    await db.delete(leads).where(eq(leads.id, id));
  }

  // Lessons
  async getLessons(facilityId?: string): Promise<Lesson[]> {
    if (facilityId) {
      return await db
        .select()
        .from(lessons)
        .where(eq(lessons.facilityId, facilityId))
        .orderBy(desc(lessons.date));
    }
    return await db.select().from(lessons).orderBy(desc(lessons.date));
  }

  async getLesson(id: string): Promise<Lesson | undefined> {
    const [lesson] = await db.select().from(lessons).where(eq(lessons.id, id));
    return lesson;
  }

  async createLesson(lessonData: InsertLesson): Promise<Lesson> {
    const [lesson] = await db.insert(lessons).values(lessonData).returning();
    return lesson;
  }

  // Lesson Packages
  async getLessonPackages(facilityId?: string): Promise<LessonPackage[]> {
    if (facilityId) {
      return await db
        .select()
        .from(lessonPackages)
        .where(eq(lessonPackages.facilityId, facilityId))
        .orderBy(desc(lessonPackages.createdAt));
    }
    return await db.select().from(lessonPackages).orderBy(desc(lessonPackages.createdAt));
  }

  async getLessonPackage(id: string): Promise<LessonPackage | undefined> {
    const [pkg] = await db.select().from(lessonPackages).where(eq(lessonPackages.id, id));
    return pkg;
  }

  async createLessonPackage(pkgData: InsertLessonPackage): Promise<LessonPackage> {
    const [pkg] = await db.insert(lessonPackages).values(pkgData).returning();
    return pkg;
  }

  async updateLessonPackage(id: string, pkgData: UpdateLessonPackage): Promise<LessonPackage> {
    const [pkg] = await db
      .update(lessonPackages)
      .set(pkgData)
      .where(eq(lessonPackages.id, id))
      .returning();
    return pkg;
  }

  async deleteLessonPackage(id: string): Promise<void> {
    await db.delete(lessonPackages).where(eq(lessonPackages.id, id));
  }

  // Fittings
  async getFittings(facilityId?: string): Promise<Fitting[]> {
    if (facilityId) {
      return await db
        .select()
        .from(fittings)
        .where(eq(fittings.facilityId, facilityId))
        .orderBy(desc(fittings.date));
    }
    return await db.select().from(fittings).orderBy(desc(fittings.date));
  }

  async getFitting(id: string): Promise<Fitting | undefined> {
    const [fitting] = await db
      .select()
      .from(fittings)
      .where(eq(fittings.id, id));
    return fitting;
  }

  async createFitting(fittingData: InsertFitting): Promise<Fitting> {
    const [fitting] = await db.insert(fittings).values(fittingData).returning();
    return fitting;
  }
  
  // Offerings
  async getOfferings(facilityId?: string): Promise<Offering[]> {
    if (facilityId) {
      return await db
        .select()
        .from(offerings)
        .where(eq(offerings.facilityId, facilityId))
        .orderBy(desc(offerings.createdAt));
    }
    return await db.select().from(offerings).orderBy(desc(offerings.createdAt));
  }
  
  async getOffering(id: string): Promise<Offering | undefined> {
    const [offering] = await db
      .select()
      .from(offerings)
      .where(eq(offerings.id, id));
    return offering;
  }
  
  async createOffering(offering: InsertOffering): Promise<Offering> {
    const [result] = await db
      .insert(offerings)
      .values(offering)
      .returning();
    return result;
  }
  
  async updateOffering(id: string, offering: UpdateOffering): Promise<Offering> {
    const [result] = await db
      .update(offerings)
      .set({ ...offering, updatedAt: new Date() })
      .where(eq(offerings.id, id))
      .returning();
    return result;
  }
  
  async deleteOffering(id: string): Promise<void> {
    await db.delete(offerings).where(eq(offerings.id, id));
  }
  
  // Staff Availability Hours
  async getStaffAvailabilityHours(staffId: string): Promise<StaffAvailabilityHours[]> {
    return await db
      .select()
      .from(staffAvailabilityHours)
      .where(
        and(
          eq(staffAvailabilityHours.staffId, staffId),
          eq(staffAvailabilityHours.isActive, true)
        )
      )
      .orderBy(asc(staffAvailabilityHours.dayOfWeek), asc(staffAvailabilityHours.startTime));
  }
  
  async createStaffAvailabilityHours(
    hours: InsertStaffAvailabilityHours
  ): Promise<StaffAvailabilityHours> {
    const [result] = await db
      .insert(staffAvailabilityHours)
      .values(hours)
      .returning();
    return result;
  }
  
  async deleteStaffAvailabilityHours(id: string): Promise<void> {
    await db.delete(staffAvailabilityHours).where(eq(staffAvailabilityHours.id, id));
  }
  
  // Google Calendar Tokens
  async getGoogleCalendarToken(staffId: string): Promise<GoogleCalendarToken | undefined> {
    const [token] = await db
      .select()
      .from(googleCalendarTokens)
      .where(eq(googleCalendarTokens.staffId, staffId));
    return token;
  }
  
  async upsertGoogleCalendarToken(
    token: InsertGoogleCalendarToken
  ): Promise<GoogleCalendarToken> {
    const [result] = await db
      .insert(googleCalendarTokens)
      .values(token)
      .onConflictDoUpdate({
        target: googleCalendarTokens.staffId,
        set: {
          ...token,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }
  
  async deleteGoogleCalendarToken(staffId: string): Promise<void> {
    await db.delete(googleCalendarTokens).where(eq(googleCalendarTokens.staffId, staffId));
  }
  
  // Google Calendar Events
  async getGoogleCalendarEvents(
    staffId: string,
    start: Date,
    end: Date
  ): Promise<GoogleCalendarEvent[]> {
    return await db
      .select()
      .from(googleCalendarEvents)
      .where(
        and(
          eq(googleCalendarEvents.staffId, staffId),
          lt(googleCalendarEvents.startTime, end),
          gt(googleCalendarEvents.endTime, start)
        )
      )
      .orderBy(asc(googleCalendarEvents.startTime));
  }
  
  async upsertGoogleCalendarEvent(
    event: InsertGoogleCalendarEvent
  ): Promise<GoogleCalendarEvent> {
    const [result] = await db
      .insert(googleCalendarEvents)
      .values(event)
      .onConflictDoUpdate({
        target: googleCalendarEvents.googleEventId,
        set: {
          ...event,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }
  
  async deleteOldGoogleCalendarEvents(staffId: string, before: Date): Promise<void> {
    await db
      .delete(googleCalendarEvents)
      .where(
        and(
          eq(googleCalendarEvents.staffId, staffId),
          lt(googleCalendarEvents.endTime, before)
        )
      );
  }
  
  // Transformation Packages
  async getTransformationPackages(facilityId?: string): Promise<TransformationPackage[]> {
    if (facilityId) {
      return await db
        .select()
        .from(transformationPackages)
        .where(eq(transformationPackages.facilityId, facilityId))
        .orderBy(desc(transformationPackages.createdAt));
    }
    return await db
      .select()
      .from(transformationPackages)
      .orderBy(desc(transformationPackages.createdAt));
  }
  
  async getTransformationPackage(id: string): Promise<TransformationPackage | undefined> {
    const [pkg] = await db
      .select()
      .from(transformationPackages)
      .where(eq(transformationPackages.id, id));
    return pkg;
  }
  
  async createTransformationPackage(
    pkg: InsertTransformationPackage
  ): Promise<TransformationPackage> {
    const [result] = await db.insert(transformationPackages).values(pkg).returning();
    return result;
  }
  
  async updateTransformationPackage(
    id: string,
    pkg: UpdateTransformationPackage
  ): Promise<TransformationPackage> {
    const [result] = await db
      .update(transformationPackages)
      .set({
        ...pkg,
        updatedAt: new Date(),
      })
      .where(eq(transformationPackages.id, id))
      .returning();
    return result;
  }
  
  async deleteTransformationPackage(id: string): Promise<void> {
    await db.delete(transformationPackages).where(eq(transformationPackages.id, id));
  }
  
  // Transformation Package Enrollments
  async getTransformationPackageEnrollments(
    facilityId?: string
  ): Promise<TransformationPackageEnrollment[]> {
    if (facilityId) {
      return await db
        .select()
        .from(transformationPackageEnrollments)
        .where(eq(transformationPackageEnrollments.facilityId, facilityId))
        .orderBy(desc(transformationPackageEnrollments.createdAt));
    }
    return await db
      .select()
      .from(transformationPackageEnrollments)
      .orderBy(desc(transformationPackageEnrollments.createdAt));
  }
  
  async getTransformationPackageEnrollment(
    id: string
  ): Promise<TransformationPackageEnrollment | undefined> {
    const [enrollment] = await db
      .select()
      .from(transformationPackageEnrollments)
      .where(eq(transformationPackageEnrollments.id, id));
    return enrollment;
  }
  
  async createTransformationPackageEnrollment(
    enrollment: InsertTransformationPackageEnrollment
  ): Promise<TransformationPackageEnrollment> {
    const [result] = await db
      .insert(transformationPackageEnrollments)
      .values(enrollment)
      .returning();
    return result;
  }
}

export const storage = new DatabaseStorage();
