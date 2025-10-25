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
  // Dashboard Stats Route
  // ============================================================================

  app.get("/api/dashboard/stats", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      
      // Mock stats for now - in production would aggregate from real data
      const stats = {
        totalBookings: 127,
        totalMembers: 45,
        totalRevenue: 12450,
        bayUtilization: 78,
        todayBookings: 12,
        activeMembers: 38,
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
