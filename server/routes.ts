// Referenced from javascript_log_in_with_replit integration
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";

// Helper function to check if user has admin privileges
function isAdmin(role: string): boolean {
  return role === "super_admin" || role === "owner" || role === "administrator";
}

// Helper function to check if user is staff (can provide services)
function isStaff(role: string): boolean {
  return role === "instructor" || role === "club_fitter" || role === "owner" || role === "administrator";
}
import {
  insertFacilitySchema,
  insertBaySchema,
  updateBaySchema,
  insertBayBlockSchema,
  updateBayBlockSchema,
  insertBookingSchema,
  insertMembershipTierSchema,
  insertLeadSchema,
  updateLeadSchema,
  insertLessonSchema,
  insertFittingSchema,
  insertOfferingSchema,
  updateOfferingSchema,
  upsertUserSchema,
  insertStaffAvailabilityHoursSchema,
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
      if (!isAdmin(user.role)) {
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

  app.patch("/api/bays/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      if (!isAdmin(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const bay = await storage.getBay(req.params.id);
      if (!bay || bay.facilityId !== user.facilityId) {
        return res.status(404).json({ message: "Bay not found" });
      }

      const validatedData = updateBaySchema.parse(req.body);
      const updatedBay = await storage.updateBay(req.params.id, validatedData);
      res.json(updatedBay);
    } catch (error: any) {
      console.error("Error updating bay:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/bays/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      if (!isAdmin(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const bay = await storage.getBay(req.params.id);
      if (!bay || bay.facilityId !== user.facilityId) {
        return res.status(404).json({ message: "Bay not found" });
      }

      await storage.deleteBay(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting bay:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // ============================================================================
  // Bay Blocks Routes
  // ============================================================================

  app.get("/api/bay-blocks", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      const blocks = await storage.getBayBlocks(user?.facilityId || undefined);
      
      // Enrich with bay data
      const enrichedBlocks = await Promise.all(
        blocks.map(async (block) => {
          const bay = await storage.getBay(block.bayId);
          return { ...block, bay };
        })
      );
      
      res.json(enrichedBlocks);
    } catch (error: any) {
      console.error("Error fetching bay blocks:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/bay-blocks", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      if (!isAdmin(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const validatedData = insertBayBlockSchema.parse({
        ...req.body,
        facilityId: user.facilityId,
      });

      // Verify bay belongs to facility
      const bay = await storage.getBay(validatedData.bayId);
      if (!bay || bay.facilityId !== user.facilityId) {
        return res.status(400).json({ message: "Bay not found or not owned by your facility" });
      }

      const block = await storage.createBayBlock(validatedData);
      res.status(201).json(block);
    } catch (error: any) {
      console.error("Error creating bay block:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/bay-blocks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      if (!isAdmin(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const block = await storage.getBayBlock(req.params.id);
      if (!block || block.facilityId !== user.facilityId) {
        return res.status(404).json({ message: "Bay block not found" });
      }

      const validatedData = updateBayBlockSchema.parse(req.body);
      const updatedBlock = await storage.updateBayBlock(req.params.id, validatedData);
      res.json(updatedBlock);
    } catch (error: any) {
      console.error("Error updating bay block:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/bay-blocks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      if (!isAdmin(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const block = await storage.getBayBlock(req.params.id);
      if (!block || block.facilityId !== user.facilityId) {
        return res.status(404).json({ message: "Bay block not found" });
      }

      await storage.deleteBayBlock(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting bay block:", error);
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
          const bays = await Promise.all(
            (booking.bayIds || []).map(bayId => storage.getBay(bayId))
          );
          const bookingUser = await storage.getUser(booking.userId);
          return { ...booking, bays: bays.filter(Boolean), user: bookingUser };
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

      // Smart bay assignment - find bays with lowest usage
      if (!validatedData.bayIds || validatedData.bayIds.length === 0) {
        const numberOfBays = req.body.numberOfBays || 1;
        const bays = await storage.getBays(user.facilityId);
        const activeBays = bays.filter((b) => b.status === "active");
        
        if (activeBays.length < numberOfBays) {
          return res.status(400).json({ 
            message: `Only ${activeBays.length} active bays available, ${numberOfBays} requested` 
          });
        }
        
        // Sort by usage hours (ascending) and take the requested number
        activeBays.sort((a, b) => (a.usageHours || 0) - (b.usageHours || 0));
        validatedData.bayIds = activeBays.slice(0, numberOfBays).map(b => b.id);
      } else {
        // Manual bay selection - validate all bays belong to user's facility
        const bays = await storage.getBays(user.facilityId);
        const facilityBayIds = new Set(bays.map(b => b.id));
        
        for (const bayId of validatedData.bayIds) {
          if (!facilityBayIds.has(bayId)) {
            return res.status(403).json({ 
              message: "One or more selected bays do not belong to your facility" 
            });
          }
        }
        
        // Validate all selected bays are active
        const selectedBays = bays.filter(b => validatedData.bayIds!.includes(b.id));
        const inactiveBays = selectedBays.filter(b => b.status !== "active");
        if (inactiveBays.length > 0) {
          return res.status(400).json({ 
            message: `Cannot book inactive bays: ${inactiveBays.map(b => b.name).join(", ")}` 
          });
        }
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
      if (!isAdmin(user.role)) {
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
  // Leads Routes (CRM)
  // ============================================================================

  app.get("/api/leads", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      if (!isAdmin(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const leads = await storage.getLeads(user.facilityId);
      res.json(leads);
    } catch (error: any) {
      console.error("Error fetching leads:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/leads", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      if (!isAdmin(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const validatedData = insertLeadSchema.parse({
        ...req.body,
        facilityId: user.facilityId,
      });
      const lead = await storage.createLead(validatedData);
      res.status(201).json(lead);
    } catch (error: any) {
      console.error("Error creating lead:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/leads/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      if (!isAdmin(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const validatedData = updateLeadSchema.parse(req.body);
      const lead = await storage.updateLead(req.params.id, validatedData);
      res.json(lead);
    } catch (error: any) {
      console.error("Error updating lead:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/leads/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      if (!isAdmin(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      await storage.deleteLead(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting lead:", error);
      res.status(500).json({ message: error.message });
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
  // Staff Routes
  // ============================================================================

  app.get("/api/staff", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      if (!isAdmin(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Get all users with staff roles (instructor, club_fitter, owner, administrator)
      const allUsers = await storage.getMembers(user.facilityId);
      const staff = allUsers.filter((u) => isStaff(u.role) || u.role === "support");

      res.json(staff);
    } catch (error: any) {
      console.error("Error fetching staff:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/staff", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      if (!isAdmin(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const validatedData = upsertUserSchema.parse({
        ...req.body,
        facilityId: user.facilityId,
      });

      // Ensure role is a staff role
      if (
        !["instructor", "club_fitter", "facility_admin"].includes(
          validatedData.role
        )
      ) {
        return res
          .status(400)
          .json({ message: "Invalid staff role" });
      }

      const newStaff = await storage.upsertUser(validatedData);
      res.status(201).json(newStaff);
    } catch (error: any) {
      console.error("Error creating staff:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/staff/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      if (!isAdmin(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const staffMember = await storage.getUser(req.params.id);
      if (!staffMember || staffMember.facilityId !== user.facilityId) {
        return res.status(404).json({ message: "Staff member not found" });
      }

      const updatedData = upsertUserSchema.partial().parse({
        ...req.body,
        id: req.params.id,
        facilityId: user.facilityId,
      });

      const updatedStaff = await storage.upsertUser(updatedData);
      res.json(updatedStaff);
    } catch (error: any) {
      console.error("Error updating staff:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/staff/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      if (!isAdmin(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const staffMember = await storage.getUser(req.params.id);
      if (!staffMember || staffMember.facilityId !== user.facilityId) {
        return res.status(404).json({ message: "Staff member not found" });
      }

      // Soft delete by changing role to "customer" instead of actual deletion
      await storage.upsertUser({
        id: req.params.id,
        role: "customer",
        facilityId: user.facilityId,
      });

      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting staff:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // ============================================================================
  // Offerings Routes (Products/Services/Packages)
  // ============================================================================

  app.get("/api/offerings", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }

      const offerings = await storage.getOfferings(user.facilityId);
      
      // Enrich with assigned staff data
      const enrichedOfferings = await Promise.all(
        offerings.map(async (offering) => {
          if (offering.assignedStaffId) {
            const staff = await storage.getUser(offering.assignedStaffId);
            return { ...offering, assignedStaff: staff };
          }
          return offering;
        })
      );

      res.json(enrichedOfferings);
    } catch (error: any) {
      console.error("Error fetching offerings:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/offerings", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      if (!isAdmin(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Validate assigned staff belongs to facility
      if (req.body.assignedStaffId) {
        const staff = await storage.getUser(req.body.assignedStaffId);
        if (!staff || staff.facilityId !== user.facilityId) {
          return res.status(400).json({ message: "Invalid staff assignment" });
        }
      }

      const validatedData = insertOfferingSchema.parse({
        ...req.body,
        facilityId: user.facilityId,
      });

      const offering = await storage.createOffering(validatedData);
      res.status(201).json(offering);
    } catch (error: any) {
      console.error("Error creating offering:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/offerings/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      if (!isAdmin(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const offering = await storage.getOffering(req.params.id);
      if (!offering || offering.facilityId !== user.facilityId) {
        return res.status(404).json({ message: "Offering not found" });
      }

      // Validate assigned staff belongs to facility
      if (req.body.assignedStaffId) {
        const staff = await storage.getUser(req.body.assignedStaffId);
        if (!staff || staff.facilityId !== user.facilityId) {
          return res.status(400).json({ message: "Invalid staff assignment" });
        }
      }

      // Parse and remove facilityId from request to prevent cross-tenant reassignment
      const { facilityId: _, ...updateData } = req.body;
      const validatedData = updateOfferingSchema.parse(updateData);
      const updated = await storage.updateOffering(req.params.id, validatedData);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating offering:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/offerings/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      if (!isAdmin(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const offering = await storage.getOffering(req.params.id);
      if (!offering || offering.facilityId !== user.facilityId) {
        return res.status(404).json({ message: "Offering not found" });
      }

      await storage.deleteOffering(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting offering:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ============================================================================
  // Staff Availability Hours Routes
  // ============================================================================

  app.get("/api/staff/:staffId/availability", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }

      // Verify staff belongs to same facility
      const staff = await storage.getUser(req.params.staffId);
      if (!staff || staff.facilityId !== user.facilityId) {
        return res.status(404).json({ message: "Staff not found" });
      }

      const hours = await storage.getStaffAvailabilityHours(req.params.staffId);
      res.json(hours);
    } catch (error: any) {
      console.error("Error fetching staff availability:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/staff/:staffId/availability", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }

      // Verify staff belongs to same facility
      const staff = await storage.getUser(req.params.staffId);
      if (!staff || staff.facilityId !== user.facilityId) {
        return res.status(404).json({ message: "Staff not found" });
      }

      // Only admins or the staff member themselves can set availability
      if (
        user.role !== "facility_admin" &&
        user.role !== "super_admin" &&
        user.id !== req.params.staffId
      ) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const validatedData = insertStaffAvailabilityHoursSchema.parse({
        ...req.body,
        facilityId: user.facilityId,
        staffId: req.params.staffId,
      });

      const hours = await storage.createStaffAvailabilityHours(validatedData);
      res.status(201).json(hours);
    } catch (error: any) {
      console.error("Error creating availability hours:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/staff/availability/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }

      // TODO: Add ownership validation for the availability hours record
      await storage.deleteStaffAvailabilityHours(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting availability hours:", error);
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
      // Assign creator as owner of the facility
      await storage.updateUserFacility(userId, facility.id, "owner");

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
  // Widget Routes (Public - no authentication required)
  // ============================================================================

  app.get("/api/facilities/:id", async (req, res) => {
    try {
      const facility = await storage.getFacility(req.params.id);
      if (!facility) {
        return res.status(404).json({ message: "Facility not found" });
      }
      res.json(facility);
    } catch (error: any) {
      console.error("Error fetching facility:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/widget/availability/:facilityId", async (req, res) => {
    try {
      const { facilityId } = req.params;
      const { date } = req.query;
      
      const selectedDate = date ? new Date(date as string) : new Date();
      selectedDate.setHours(0, 0, 0, 0);
      
      const nextDay = new Date(selectedDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      const bays = await storage.getBays(facilityId);
      const bookings = await storage.getBookingsByDateRange(facilityId, selectedDate, nextDay);
      
      const activeBays = bays.filter(b => b.status === "active");
      
      const timeSlots: { time: string; available: boolean }[] = [];
      
      for (let hour = 9; hour < 21; hour++) {
        for (const minutes of ["00", "30"]) {
          const time = `${hour.toString().padStart(2, "0")}:${minutes}`;
          const [h, m] = time.split(":").map(Number);
          const slotTime = new Date(selectedDate);
          slotTime.setHours(h, m, 0, 0);
          const slotEnd = new Date(slotTime.getTime() + 60 * 60000);
          
          const hasAvailableBay = activeBays.some(bay => {
            const conflictingBookings = bookings.filter(b => {
              if (b.bayId !== bay.id) return false;
              const bookingStart = new Date(b.startTime);
              const bookingEnd = new Date(bookingStart.getTime() + (b.duration || 60) * 60000);
              return (slotTime < bookingEnd && slotEnd > bookingStart);
            });
            return conflictingBookings.length === 0;
          });
          
          timeSlots.push({ time, available: hasAvailableBay });
        }
      }
      
      res.json(timeSlots);
    } catch (error: any) {
      console.error("Error fetching availability:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/widget/bookings/:facilityId", async (req, res) => {
    try {
      const { facilityId } = req.params;
      const { startTime, duration, customerName, customerEmail } = req.body;
      
      if (!startTime || !customerName || !customerEmail) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const facility = await storage.getFacility(facilityId);
      if (!facility) {
        return res.status(404).json({ message: "Facility not found" });
      }
      
      const bookingStart = new Date(startTime);
      const bookingDuration = duration || 60;
      const bookingEnd = new Date(bookingStart.getTime() + bookingDuration * 60000);
      
      const bays = await storage.getBays(facilityId);
      const activeBays = bays.filter(b => b.status === "active");
      
      if (activeBays.length === 0) {
        return res.status(400).json({ message: "No bays available at this facility" });
      }
      
      const dayStart = new Date(bookingStart);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      
      const existingBookings = await storage.getBookingsByDateRange(facilityId, dayStart, dayEnd);
      
      let assignedBay = null;
      for (const bay of activeBays) {
        const conflictingBookings = existingBookings.filter(b => {
          if (b.bayId !== bay.id) return false;
          const existingStart = new Date(b.startTime);
          const existingEnd = new Date(existingStart.getTime() + (b.duration || 60) * 60000);
          return (bookingStart < existingEnd && bookingEnd > existingStart);
        });
        
        if (conflictingBookings.length === 0) {
          assignedBay = bay;
          break;
        }
      }
      
      if (!assignedBay) {
        return res.status(400).json({ message: "No bays available at this time. Please select another time slot." });
      }
      
      const validatedData = insertBookingSchema.parse({
        facilityId,
        bayId: assignedBay.id,
        userId: null,
        startTime: bookingStart,
        duration: bookingDuration,
        type: "rental",
        customerName,
        customerEmail,
        paymentStatus: "pending",
      });
      
      const booking = await storage.createBooking(validatedData);
      
      res.status(201).json({ success: true, booking });
    } catch (error: any) {
      console.error("Error creating widget booking:", error);
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
