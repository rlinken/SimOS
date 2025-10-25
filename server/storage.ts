// Referenced from javascript_log_in_with_replit and javascript_database integrations
import {
  users,
  facilities,
  bays,
  bayBlocks,
  bookings,
  membershipTiers,
  lessons,
  fittings,
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
  type Lesson,
  type InsertLesson,
  type Fitting,
  type InsertFitting,
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
  
  // Lessons
  getLessons(facilityId?: string): Promise<Lesson[]>;
  getLesson(id: string): Promise<Lesson | undefined>;
  createLesson(lesson: InsertLesson): Promise<Lesson>;
  
  // Fittings
  getFittings(facilityId?: string): Promise<Fitting[]>;
  getFitting(id: string): Promise<Fitting | undefined>;
  createFitting(fitting: InsertFitting): Promise<Fitting>;
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
}

export const storage = new DatabaseStorage();
