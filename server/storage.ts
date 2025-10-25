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
  timeEntries,
  tasks,
  commissions,
  tips,
  customRoles,
  commissionStructures,
  commissionPayments,
  payrollPayments,
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
  type TimeEntry,
  type InsertTimeEntry,
  type Task,
  type InsertTask,
  type Commission,
  type InsertCommission,
  type Tip,
  type InsertTip,
  type CustomRole,
  type InsertCustomRole,
  type CommissionStructure,
  type InsertCommissionStructure,
  type CommissionPayment,
  type InsertCommissionPayment,
  type PayrollPayment,
  type InsertPayrollPayment,
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
  updateBooking(id: string, booking: Partial<InsertBooking>): Promise<Booking>;
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
  
  // Time Entries (Hours Tracking)
  getTimeEntries(facilityId?: string, staffId?: string): Promise<TimeEntry[]>;
  getTimeEntry(id: string): Promise<TimeEntry | undefined>;
  createTimeEntry(entry: InsertTimeEntry): Promise<TimeEntry>;
  updateTimeEntry(id: string, entry: Partial<InsertTimeEntry>): Promise<TimeEntry>;
  deleteTimeEntry(id: string): Promise<void>;
  getActiveTimeEntry(staffId: string): Promise<TimeEntry | undefined>;
  
  // Tasks
  getTasks(facilityId?: string, assignedToId?: string): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, task: Partial<InsertTask>): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  
  // Commissions
  getCommissions(facilityId?: string, staffId?: string): Promise<Commission[]>;
  getCommission(id: string): Promise<Commission | undefined>;
  createCommission(commission: InsertCommission): Promise<Commission>;
  updateCommission(id: string, commission: Partial<InsertCommission>): Promise<Commission>;
  
  // Tips
  getTips(facilityId?: string, staffId?: string): Promise<Tip[]>;
  getTip(id: string): Promise<Tip | undefined>;
  createTip(tip: InsertTip): Promise<Tip>;
  deleteTip(id: string): Promise<void>;
  
  // Staff (extends existing getUser methods)
  getStaffMembers(facilityId: string): Promise<User[]>;
  updateUser(id: string, user: Partial<UpsertUser>): Promise<User>;
  updateFacility(id: string, facility: Partial<InsertFacility>): Promise<Facility>;
  
  // Custom Roles
  getCustomRoles(facilityId: string): Promise<CustomRole[]>;
  getCustomRole(id: string): Promise<CustomRole | undefined>;
  createCustomRole(role: InsertCustomRole): Promise<CustomRole>;
  updateCustomRole(id: string, role: Partial<InsertCustomRole>): Promise<CustomRole>;
  deleteCustomRole(id: string): Promise<void>;
  
  // Commission Structures
  getCommissionStructures(facilityId: string): Promise<CommissionStructure[]>;
  getCommissionStructure(id: string): Promise<CommissionStructure | undefined>;
  createCommissionStructure(structure: InsertCommissionStructure): Promise<CommissionStructure>;
  updateCommissionStructure(id: string, structure: Partial<InsertCommissionStructure>): Promise<CommissionStructure>;
  deleteCommissionStructure(id: string): Promise<void>;
  
  // Commission Payments
  getCommissionPayments(facilityId: string, filters?: { staffId?: string; startDate?: Date; endDate?: Date }): Promise<CommissionPayment[]>;
  getCommissionPayment(id: string): Promise<CommissionPayment | undefined>;
  createCommissionPayment(payment: InsertCommissionPayment): Promise<CommissionPayment>;
  getCommissionPaymentsByStaff(staffId: string): Promise<CommissionPayment[]>;
  
  // Payroll Payments
  getPayrollPayments(facilityId: string, filters?: { startDate?: Date; endDate?: Date }): Promise<PayrollPayment[]>;
  getPayrollPayment(id: string): Promise<PayrollPayment | undefined>;
  createPayrollPayment(payment: InsertPayrollPayment): Promise<PayrollPayment>;
  getPayrollPaymentsByStaff(staffId: string, startDate?: Date, endDate?: Date): Promise<PayrollPayment[]>;
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

  async updateBooking(id: string, bookingData: Partial<InsertBooking>): Promise<Booking> {
    const [booking] = await db
      .update(bookings)
      .set({ ...bookingData, updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();
    return booking;
  }

  async getBookingsByDateRange(
    facilityId: string,
    start: Date,
    end: Date
  ): Promise<Booking[]> {
    console.log('[Storage] getBookingsByDateRange input:', {
      facilityId,
      start: start.toISOString(),
      end: end.toISOString(),
      startType: typeof start,
      endType: typeof end
    });
    
    const result = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.facilityId, facilityId),
          lt(bookings.startTime, end),
          gt(bookings.endTime, start)
        )
      )
      .orderBy(asc(bookings.startTime));
      
    console.log('[Storage] getBookingsByDateRange result:', {
      count: result.length,
      bookings: result.map(b => ({
        id: b.id,
        startTime: b.startTime,
        endTime: b.endTime
      }))
    });
    
    return result;
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
  
  // Time Entries (Hours Tracking)
  async getTimeEntries(facilityId?: string, staffId?: string): Promise<TimeEntry[]> {
    let query = db.select().from(timeEntries).orderBy(desc(timeEntries.clockInTime));
    
    if (facilityId && staffId) {
      const result = await query.where(
        and(
          eq(timeEntries.facilityId, facilityId),
          eq(timeEntries.staffId, staffId)
        )
      );
      return result;
    } else if (facilityId) {
      const result = await query.where(eq(timeEntries.facilityId, facilityId));
      return result;
    } else if (staffId) {
      const result = await query.where(eq(timeEntries.staffId, staffId));
      return result;
    }
    
    return await query;
  }
  
  async getTimeEntry(id: string): Promise<TimeEntry | undefined> {
    const [entry] = await db.select().from(timeEntries).where(eq(timeEntries.id, id));
    return entry;
  }
  
  async createTimeEntry(entry: InsertTimeEntry): Promise<TimeEntry> {
    const [result] = await db.insert(timeEntries).values(entry).returning();
    return result;
  }
  
  async updateTimeEntry(id: string, entry: Partial<InsertTimeEntry>): Promise<TimeEntry> {
    const [result] = await db
      .update(timeEntries)
      .set({
        ...entry,
        updatedAt: new Date(),
      })
      .where(eq(timeEntries.id, id))
      .returning();
    return result;
  }
  
  async deleteTimeEntry(id: string): Promise<void> {
    await db.delete(timeEntries).where(eq(timeEntries.id, id));
  }
  
  async getActiveTimeEntry(staffId: string): Promise<TimeEntry | undefined> {
    const [entry] = await db
      .select()
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.staffId, staffId),
          eq(timeEntries.clockOutTime, null as any)
        )
      )
      .orderBy(desc(timeEntries.clockInTime))
      .limit(1);
    return entry;
  }
  
  // Tasks
  async getTasks(facilityId?: string, assignedToId?: string): Promise<Task[]> {
    let query = db.select().from(tasks).orderBy(desc(tasks.createdAt));
    
    if (facilityId && assignedToId) {
      const result = await query.where(
        and(
          eq(tasks.facilityId, facilityId),
          eq(tasks.assignedToId, assignedToId)
        )
      );
      return result;
    } else if (facilityId) {
      const result = await query.where(eq(tasks.facilityId, facilityId));
      return result;
    } else if (assignedToId) {
      const result = await query.where(eq(tasks.assignedToId, assignedToId));
      return result;
    }
    
    return await query;
  }
  
  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }
  
  async createTask(task: InsertTask): Promise<Task> {
    const [result] = await db.insert(tasks).values(task).returning();
    return result;
  }
  
  async updateTask(id: string, task: Partial<InsertTask>): Promise<Task> {
    const [result] = await db
      .update(tasks)
      .set({
        ...task,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id))
      .returning();
    return result;
  }
  
  async deleteTask(id: string): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }
  
  // Commissions
  async getCommissions(facilityId?: string, staffId?: string): Promise<Commission[]> {
    let query = db.select().from(commissions).orderBy(desc(commissions.createdAt));
    
    if (facilityId && staffId) {
      const result = await query.where(
        and(
          eq(commissions.facilityId, facilityId),
          eq(commissions.staffId, staffId)
        )
      );
      return result;
    } else if (facilityId) {
      const result = await query.where(eq(commissions.facilityId, facilityId));
      return result;
    } else if (staffId) {
      const result = await query.where(eq(commissions.staffId, staffId));
      return result;
    }
    
    return await query;
  }
  
  async getCommission(id: string): Promise<Commission | undefined> {
    const [commission] = await db.select().from(commissions).where(eq(commissions.id, id));
    return commission;
  }
  
  async createCommission(commission: InsertCommission): Promise<Commission> {
    const [result] = await db.insert(commissions).values(commission).returning();
    return result;
  }
  
  async updateCommission(id: string, commission: Partial<InsertCommission>): Promise<Commission> {
    const [result] = await db
      .update(commissions)
      .set({
        ...commission,
        updatedAt: new Date(),
      })
      .where(eq(commissions.id, id))
      .returning();
    return result;
  }
  
  // Tips
  async getTips(facilityId?: string, staffId?: string): Promise<Tip[]> {
    let query = db.select().from(tips).orderBy(desc(tips.date));
    
    if (facilityId && staffId) {
      const result = await query.where(
        and(
          eq(tips.facilityId, facilityId),
          eq(tips.staffId, staffId)
        )
      );
      return result;
    } else if (facilityId) {
      const result = await query.where(eq(tips.facilityId, facilityId));
      return result;
    } else if (staffId) {
      const result = await query.where(eq(tips.staffId, staffId));
      return result;
    }
    
    return await query;
  }
  
  async getTip(id: string): Promise<Tip | undefined> {
    const [tip] = await db.select().from(tips).where(eq(tips.id, id));
    return tip;
  }
  
  async createTip(tip: InsertTip): Promise<Tip> {
    const [result] = await db.insert(tips).values(tip).returning();
    return result;
  }
  
  async deleteTip(id: string): Promise<void> {
    await db.delete(tips).where(eq(tips.id, id));
  }
  
  // Staff
  async getStaffMembers(facilityId: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.facilityId, facilityId),
          gt(users.hourlyRate, "0") as any // Staff members have hourly rate set
        )
      )
      .orderBy(asc(users.firstName));
  }
  
  async updateUser(id: string, user: Partial<UpsertUser>): Promise<User> {
    const [result] = await db
      .update(users)
      .set({
        ...user,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return result;
  }
  
  async updateFacility(id: string, facility: Partial<InsertFacility>): Promise<Facility> {
    const [result] = await db
      .update(facilities)
      .set({
        ...facility,
        updatedAt: new Date(),
      })
      .where(eq(facilities.id, id))
      .returning();
    return result;
  }

  // Custom Roles
  async getCustomRoles(facilityId: string): Promise<CustomRole[]> {
    return await db
      .select()
      .from(customRoles)
      .where(eq(customRoles.facilityId, facilityId))
      .orderBy(asc(customRoles.name));
  }

  async getCustomRole(id: string): Promise<CustomRole | undefined> {
    const [role] = await db
      .select()
      .from(customRoles)
      .where(eq(customRoles.id, id));
    return role;
  }

  async createCustomRole(role: InsertCustomRole): Promise<CustomRole> {
    const [newRole] = await db
      .insert(customRoles)
      .values(role)
      .returning();
    return newRole;
  }

  async updateCustomRole(id: string, role: Partial<InsertCustomRole>): Promise<CustomRole> {
    const [updatedRole] = await db
      .update(customRoles)
      .set({
        ...role,
        updatedAt: new Date(),
      })
      .where(eq(customRoles.id, id))
      .returning();
    return updatedRole;
  }

  async deleteCustomRole(id: string): Promise<void> {
    await db.delete(customRoles).where(eq(customRoles.id, id));
  }
  
  // Commission Structures
  async getCommissionStructures(facilityId: string): Promise<CommissionStructure[]> {
    return await db
      .select()
      .from(commissionStructures)
      .where(eq(commissionStructures.facilityId, facilityId))
      .orderBy(asc(commissionStructures.productType));
  }

  async getCommissionStructure(id: string): Promise<CommissionStructure | undefined> {
    const [structure] = await db
      .select()
      .from(commissionStructures)
      .where(eq(commissionStructures.id, id));
    return structure;
  }

  async createCommissionStructure(structure: InsertCommissionStructure): Promise<CommissionStructure> {
    const [newStructure] = await db
      .insert(commissionStructures)
      .values(structure)
      .returning();
    return newStructure;
  }

  async updateCommissionStructure(id: string, structure: Partial<InsertCommissionStructure>): Promise<CommissionStructure> {
    const [updatedStructure] = await db
      .update(commissionStructures)
      .set({
        ...structure,
        updatedAt: new Date(),
      })
      .where(eq(commissionStructures.id, id))
      .returning();
    return updatedStructure;
  }

  async deleteCommissionStructure(id: string): Promise<void> {
    await db.delete(commissionStructures).where(eq(commissionStructures.id, id));
  }
  
  // Commission Payments
  async getCommissionPayments(
    facilityId: string,
    filters?: { staffId?: string; startDate?: Date; endDate?: Date }
  ): Promise<CommissionPayment[]> {
    const conditions = [eq(commissionPayments.facilityId, facilityId)];
    
    if (filters?.staffId) {
      conditions.push(eq(commissionPayments.staffId, filters.staffId));
    }
    if (filters?.startDate) {
      conditions.push(gte(commissionPayments.earnedDate, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(commissionPayments.earnedDate, filters.endDate));
    }
    
    return await db
      .select()
      .from(commissionPayments)
      .where(and(...conditions))
      .orderBy(desc(commissionPayments.earnedDate));
  }

  async getCommissionPayment(id: string): Promise<CommissionPayment | undefined> {
    const [payment] = await db
      .select()
      .from(commissionPayments)
      .where(eq(commissionPayments.id, id));
    return payment;
  }

  async createCommissionPayment(payment: InsertCommissionPayment): Promise<CommissionPayment> {
    const [newPayment] = await db
      .insert(commissionPayments)
      .values(payment)
      .returning();
    return newPayment;
  }

  async getCommissionPaymentsByStaff(staffId: string): Promise<CommissionPayment[]> {
    return await db
      .select()
      .from(commissionPayments)
      .where(eq(commissionPayments.staffId, staffId))
      .orderBy(desc(commissionPayments.earnedDate));
  }
  
  // Payroll Payments
  async getPayrollPayments(
    facilityId: string,
    filters?: { startDate?: Date; endDate?: Date }
  ): Promise<PayrollPayment[]> {
    const conditions = [eq(payrollPayments.facilityId, facilityId)];
    
    if (filters?.startDate) {
      conditions.push(gte(payrollPayments.payPeriodStart, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(payrollPayments.payPeriodEnd, filters.endDate));
    }
    
    return await db
      .select()
      .from(payrollPayments)
      .where(and(...conditions))
      .orderBy(desc(payrollPayments.paidDate));
  }

  async getPayrollPayment(id: string): Promise<PayrollPayment | undefined> {
    const [payment] = await db
      .select()
      .from(payrollPayments)
      .where(eq(payrollPayments.id, id));
    return payment;
  }

  async createPayrollPayment(payment: InsertPayrollPayment): Promise<PayrollPayment> {
    const [newPayment] = await db
      .insert(payrollPayments)
      .values(payment)
      .returning();
    return newPayment;
  }

  async getPayrollPaymentsByStaff(
    staffId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<PayrollPayment[]> {
    const conditions = [eq(payrollPayments.staffId, staffId)];
    
    if (startDate) {
      conditions.push(gte(payrollPayments.payPeriodStart, startDate));
    }
    if (endDate) {
      conditions.push(lte(payrollPayments.payPeriodEnd, endDate));
    }
    
    return await db
      .select()
      .from(payrollPayments)
      .where(and(...conditions))
      .orderBy(desc(payrollPayments.paidDate));
  }
}

export const storage = new DatabaseStorage();
