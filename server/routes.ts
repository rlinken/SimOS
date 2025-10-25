// Referenced from javascript_log_in_with_replit integration
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import {
  insertFacilitySchema,
  insertBaySchema,
  insertBookingSchema,
  insertMembershipTierSchema,
  insertLessonSchema,
  insertFittingSchema,
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // ============================================================================
  // Facilities Routes (Super Admin only)
  // ============================================================================

  app.get("/api/facilities", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== "super_admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      const facilities = await storage.getFacilities();
      res.json(facilities);
    } catch (error: any) {
      console.error("Error fetching facilities:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/facilities", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== "super_admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const validatedData = insertFacilitySchema.parse(req.body);
      const facility = await storage.createFacility(validatedData);
      res.status(201).json(facility);
    } catch (error: any) {
      console.error("Error creating facility:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // ============================================================================
  // Bays Routes
  // ============================================================================

  app.get("/api/bays", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      const bays = await storage.getBays(user?.facilityId || undefined);
      res.json(bays);
    } catch (error: any) {
      console.error("Error fetching bays:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/bays", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      if (user.role !== "facility_admin" && user.role !== "super_admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const validatedData = insertBaySchema.parse({
        ...req.body,
        facilityId: user.facilityId,
      });
      const bay = await storage.createBay(validatedData);
      res.status(201).json(bay);
    } catch (error: any) {
      console.error("Error creating bay:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // ============================================================================
  // Bookings Routes
  // ============================================================================

  app.get("/api/bookings", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      const bookings = await storage.getBookings(user?.facilityId || undefined);
      
      // Fetch related data for each booking
      const enrichedBookings = await Promise.all(
        bookings.map(async (booking) => {
          const bay = await storage.getBay(booking.bayId);
          const bookingUser = await storage.getUser(booking.userId);
          return { ...booking, bay, user: bookingUser };
        })
      );
      
      res.json(enrichedBookings);
    } catch (error: any) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/bookings", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }

      const validatedData = insertBookingSchema.parse({
        ...req.body,
        facilityId: user.facilityId,
        userId: user.id,
      });

      // Smart bay assignment - find bay with lowest usage
      if (!validatedData.bayId) {
        const bays = await storage.getBays(user.facilityId);
        const activeBays = bays.filter((b) => b.status === "active");
        if (activeBays.length === 0) {
          return res.status(400).json({ message: "No active bays available" });
        }
        
        // Sort by usage hours (ascending)
        activeBays.sort((a, b) => (a.usageHours || 0) - (b.usageHours || 0));
        validatedData.bayId = activeBays[0].id;
      }

      const booking = await storage.createBooking(validatedData);
      res.status(201).json(booking);
    } catch (error: any) {
      console.error("Error creating booking:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // ============================================================================
  // Membership Tiers Routes
  // ============================================================================

  app.get("/api/memberships", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      const tiers = await storage.getMembershipTiers(
        user?.facilityId || undefined
      );
      res.json(tiers);
    } catch (error: any) {
      console.error("Error fetching membership tiers:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/memberships", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      if (user.role !== "facility_admin" && user.role !== "super_admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const validatedData = insertMembershipTierSchema.parse({
        ...req.body,
        facilityId: user.facilityId,
      });
      const tier = await storage.createMembershipTier(validatedData);
      res.status(201).json(tier);
    } catch (error: any) {
      console.error("Error creating membership tier:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // ============================================================================
  // Members Routes
  // ============================================================================

  app.get("/api/members", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      const members = await storage.getMembers(user?.facilityId || undefined);
      
      // Enrich members with membership tier data
      const enrichedMembers = await Promise.all(
        members.map(async (member) => {
          if (member.membershipTierId) {
            const membershipTier = await storage.getMembershipTier(
              member.membershipTierId
            );
            return { ...member, membershipTier };
          }
          return member;
        })
      );
      
      res.json(enrichedMembers);
    } catch (error: any) {
      console.error("Error fetching members:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ============================================================================
  // Lessons Routes
  // ============================================================================

  app.get("/api/lessons", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      const lessons = await storage.getLessons(user?.facilityId || undefined);
      
      // Enrich lessons with instructor and student data
      const enrichedLessons = await Promise.all(
        lessons.map(async (lesson) => {
          const instructor = await storage.getUser(lesson.instructorId);
          const student = await storage.getUser(lesson.studentId);
          return { ...lesson, instructor, student };
        })
      );
      
      res.json(enrichedLessons);
    } catch (error: any) {
      console.error("Error fetching lessons:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/lessons", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }

      const validatedData = insertLessonSchema.parse({
        ...req.body,
        facilityId: user.facilityId,
      });
      const lesson = await storage.createLesson(validatedData);
      res.status(201).json(lesson);
    } catch (error: any) {
      console.error("Error creating lesson:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // ============================================================================
  // Fittings Routes
  // ============================================================================

  app.get("/api/fittings", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      const fittings = await storage.getFittings(user?.facilityId || undefined);
      
      // Enrich fittings with fitter and user data
      const enrichedFittings = await Promise.all(
        fittings.map(async (fitting) => {
          const fitter = await storage.getUser(fitting.fitterId);
          const fittingUser = await storage.getUser(fitting.userId);
          return { ...fitting, fitter, user: fittingUser };
        })
      );
      
      res.json(enrichedFittings);
    } catch (error: any) {
      console.error("Error fetching fittings:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/fittings", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }

      const validatedData = insertFittingSchema.parse({
        ...req.body,
        facilityId: user.facilityId,
      });
      const fitting = await storage.createFitting(validatedData);
      res.status(201).json(fitting);
    } catch (error: any) {
      console.error("Error creating fitting:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // ============================================================================
  // Onboarding Route
  // ============================================================================

  app.post("/api/onboarding/complete", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user already has a facility
      if (user.facilityId) {
        return res.status(400).json({ message: "User already has a facility" });
      }

      const {
        name,
        subdomain,
        logo,
        address,
        phone,
        email,
        bays,
        lessonsEnabled,
        fittingsEnabled,
        membershipTiers,
      } = req.body;

      // Validation
      if (!name || !subdomain) {
        return res.status(400).json({ message: "Name and subdomain are required" });
      }
      if (!bays || bays.length === 0) {
        return res.status(400).json({ message: "At least one bay is required" });
      }
      if (!membershipTiers || membershipTiers.length === 0) {
        return res.status(400).json({ message: "At least one membership tier is required" });
      }

      // Create facility
      const facility = await storage.createFacility({
        name,
        subdomain,
        logo,
        address,
        phone,
        email,
        lessonsEnabled,
        fittingsEnabled,
      });

      // Update user to be facility admin
      await storage.updateUserFacility(userId, facility.id, "facility_admin");

      // Create bays with custom names and tiers
      const bayPromises = bays.map((bay: any) =>
        storage.createBay({
          facilityId: facility.id,
          name: bay.name,
          description: `${bay.tier} tier bay`,
          tier: bay.tier,
          status: "active",
        })
      );
      await Promise.all(bayPromises);

      // Create membership tiers
      const tierPromises = membershipTiers.map((tier: any) =>
        storage.createMembershipTier({
          facilityId: facility.id,
          name: tier.name,
          tierLevel: tier.tierLevel,
          monthlyPrice: tier.monthlyPrice,
          hourlyRate: tier.hourlyRate,
          monthlyHours: tier.monthlyHours,
          allowedBayTiers: ["standard", "premium", "vip"],
        })
      );
      await Promise.all(tierPromises);

      res.json({
        success: true,
        facility,
        message: "Onboarding complete!",
      });
    } catch (error: any) {
      console.error("Error completing onboarding:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ============================================================================
  // Dashboard Stats Route
  // ============================================================================

  app.get("/api/dashboard/stats", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      const facilityId = user?.facilityId;
      
      // Aggregate real data
      const bookings = await storage.getBookings(facilityId || undefined);
      const members = await storage.getMembers(facilityId || undefined);
      const bays = await storage.getBays(facilityId || undefined);
      
      // Calculate today's bookings
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const todayBookings = bookings.filter(b => {
        const bookingDate = new Date(b.startTime);
        return bookingDate >= today && bookingDate < tomorrow;
      }).length;
      
      // Calculate total revenue (from paid bookings)
      const totalRevenue = bookings
        .filter(b => b.paymentStatus === "paid" && b.amount)
        .reduce((sum, b) => sum + parseFloat(b.amount || "0"), 0);
      
      // Calculate bay utilization (bookings / total possible slots)
      const activeBays = bays.filter(b => b.status === "active").length;
      const totalPossibleSlots = activeBays * 10; // Assume 10 hours/day
      const bayUtilization = totalPossibleSlots > 0 
        ? Math.round((todayBookings / totalPossibleSlots) * 100)
        : 0;
      
      // Active members (those with a membership tier)
      const activeMembers = members.filter(m => m.membershipTierId).length;
      
      const stats = {
        totalBookings: bookings.length,
        totalMembers: members.length,
        totalRevenue: Math.round(totalRevenue),
        bayUtilization,
        todayBookings,
        activeMembers,
      };
      
      res.json(stats);
    } catch (error: any) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
