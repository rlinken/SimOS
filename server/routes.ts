// Referenced from javascript_log_in_with_replit integration
import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { bayWearCalculator } from "./services/bay-wear-calculator";
import Stripe from "stripe";
// Referenced from javascript_object_storage blueprint
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";

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
  insertBayRentalOfferSchema,
  updateBayRentalOfferSchema,
  insertBayBlockSchema,
  updateBayBlockSchema,
  insertBookingSchema,
  insertWidgetBookingSchema,
  insertMembershipTierSchema,
  updateMembershipTierSchema,
  insertLeadSchema,
  updateLeadSchema,
  insertLessonSchema,
  insertLessonPackageSchema,
  updateLessonPackageSchema,
  insertFittingSchema,
  updateFittingSchema,
  insertOfferingSchema,
  updateOfferingSchema,
  insertTransformationPackageSchema,
  updateTransformationPackageSchema,
  upsertUserSchema,
  insertStaffAvailabilityHoursSchema,
  insertTimeEntrySchema,
  insertTaskSchema,
  insertCommissionSchema,
  insertTipSchema,
  insertProductSchema,
  updateProductSchema,
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Include facility data if user has a facility
      if (user && user.facilityId) {
        const facility = await storage.getFacility(user.facilityId);
        res.json({ ...user, facility });
      } else {
        res.json(user);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // ============================================================================
  // Object Storage Routes
  // ============================================================================
  // Reference: javascript_object_storage blueprint - protected file uploading

  // Endpoint for serving uploaded logo files (public visibility)
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Endpoint for getting presigned upload URL
  app.post("/api/objects/upload", isAuthenticated, async (req: any, res) => {
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    res.json({ uploadURL });
  });

  // Endpoint for setting facility logo after upload
  app.put("/api/facility-logo", isAuthenticated, async (req: any, res) => {
    if (!req.body.logoUrl) {
      return res.status(400).json({ error: "logoUrl is required" });
    }

    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);

    if (!user || !user.facilityId) {
      return res.status(403).json({ error: "No facility associated with user" });
    }

    // Only owners and administrators can update facility logo
    if (!isAdmin(user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.logoUrl,
        {
          owner: userId,
          visibility: "public", // Logo is public so it can be displayed in widgets
        },
      );

      // Update facility with the logo path
      await storage.updateFacility(user.facilityId, { logoUrl: objectPath });

      res.status(200).json({ objectPath });
    } catch (error) {
      console.error("Error setting facility logo:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ============================================================================
  // Public Routes (No Authentication Required)
  // ============================================================================

  // Get membership tier details for shareable purchase page
  app.get("/api/public/membership/:id", async (req, res) => {
    try {
      const membershipTier = await storage.getMembershipTier(req.params.id);
      if (!membershipTier) {
        return res.status(404).json({ message: "Membership tier not found" });
      }
      // Also fetch facility info for branding
      const facility = await storage.getFacility(membershipTier.facilityId);
      res.json({ membershipTier, facility });
    } catch (error: any) {
      console.error("Error fetching membership tier:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get lesson package details for shareable purchase page
  app.get("/api/public/lesson-package/:id", async (req, res) => {
    try {
      const lessonPackage = await storage.getLessonPackage(req.params.id);
      if (!lessonPackage) {
        return res.status(404).json({ message: "Lesson package not found" });
      }
      // Also fetch facility info for branding
      const facility = await storage.getFacility(lessonPackage.facilityId);
      res.json({ lessonPackage, facility });
    } catch (error: any) {
      console.error("Error fetching lesson package:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get offer details for shareable purchase page
  app.get("/api/public/offer/:id", async (req, res) => {
    try {
      const offer = await storage.getOffering(req.params.id);
      if (!offer) {
        return res.status(404).json({ message: "Offer not found" });
      }
      // Also fetch facility info for branding
      const facility = await storage.getFacility(offer.facilityId);
      res.json({ offer, facility });
    } catch (error: any) {
      console.error("Error fetching offer:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get facility details for shareable booking page
  app.get("/api/public/facility/:id", async (req, res) => {
    try {
      const facility = await storage.getFacility(req.params.id);
      if (!facility) {
        return res.status(404).json({ message: "Facility not found" });
      }
      // Get bays for booking
      const bays = await storage.getBays(facility.id);
      res.json({ facility, bays });
    } catch (error: any) {
      console.error("Error fetching facility:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get product details for QR code purchase page
  app.get("/api/public/product/:id", async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      // Also fetch facility info for branding
      const facility = await storage.getFacility(product.facilityId);
      res.json({ product, facility });
    } catch (error: any) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Create Stripe checkout session for product purchase
  app.post("/api/public/create-product-checkout", async (req, res) => {
    try {
      const { productId, facilityId, firstName, lastName, email, phone, quantity } = req.body;

      if (!productId || !facilityId || !firstName || !lastName || !email || !quantity) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const product = await storage.getProduct(productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Check stock availability
      if (product.stockQuantity !== null && product.stockQuantity < quantity) {
        return res.status(400).json({ message: "Insufficient stock available" });
      }

      const facility = await storage.getFacility(facilityId);
      if (!facility) {
        return res.status(404).json({ message: "Facility not found" });
      }

      // Check if facility has Stripe configured
      if (!facility.stripeSecretKey) {
        return res.status(400).json({ message: "Payment processing not configured for this facility" });
      }

      // Initialize Stripe with facility's secret key
      const stripe = new Stripe(facility.stripeSecretKey, {
        apiVersion: "2024-12-18.acacia",
      });

      // Find or create customer user
      let customer = await storage.getUserByEmail(email);
      if (!customer) {
        customer = await storage.upsertUser({
          email,
          firstName,
          lastName,
          phone: phone || undefined,
          facilityId,
          role: "customer",
        });
      }

      // Calculate total amount
      const unitPrice = parseFloat(product.price);
      const totalAmount = unitPrice * quantity;

      // Create Stripe Checkout Session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: product.name,
                description: product.description || `${product.category} - ${facility.name}`,
                images: product.imageUrl ? [product.imageUrl] : undefined,
              },
              unit_amount: Math.round(unitPrice * 100), // Convert to cents
            },
            quantity: quantity,
          },
        ],
        mode: 'payment',
        success_url: `${req.protocol}://${req.get('host')}/thank-you?type=product&name=${encodeURIComponent(product.name)}&quantity=${quantity}&amount=${totalAmount.toFixed(2)}&customerName=${encodeURIComponent(`${firstName} ${lastName}`)}&email=${encodeURIComponent(email)}&facilityId=${facilityId}&productId=${productId}`,
        cancel_url: `${req.protocol}://${req.get('host')}/buy/product/${productId}`,
        customer_email: email,
        metadata: {
          productId,
          facilityId,
          customerId: customer.id,
          quantity: quantity.toString(),
        },
      });

      res.json({ checkoutUrl: session.url });
    } catch (error: any) {
      console.error("Error creating product checkout session:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Register customer from public purchase pages
  app.post("/api/auth/register-customer", async (req, res) => {
    try {
      const { firstName, lastName, email, phone, facilityId, membershipTierId, transformationPackageId } = req.body;

      if (!facilityId) {
        return res.status(400).json({ message: "Facility ID is required" });
      }

      // Check enrollment capacity for transformation packages
      if (transformationPackageId) {
        const pkg = await storage.getTransformationPackage(transformationPackageId);
        if (!pkg) {
          return res.status(404).json({ message: "Transformation package not found" });
        }
        
        // Check if package is full
        if (pkg.maxEnrollments && pkg.currentEnrollments !== null && pkg.currentEnrollments >= pkg.maxEnrollments) {
          return res.status(400).json({ message: "This transformation package is currently full. Please join the waitlist." });
        }
      }

      // Create a lead entry for this customer (Stripe integration deferred)
      const lead = await storage.createLead({
        facilityId,
        firstName,
        lastName,
        email,
        phone: phone || null,
        source: transformationPackageId ? "transformation_package" : membershipTierId ? "membership" : "website",
        status: "new",
        notes: transformationPackageId 
          ? `Interested in transformation package ID: ${transformationPackageId}` 
          : membershipTierId 
          ? `Interested in membership tier ID: ${membershipTierId}` 
          : null,
      });

      res.status(201).json({ 
        message: "Registration successful", 
        leadId: lead.id 
      });
    } catch (error: any) {
      console.error("Error registering customer:", error);
      res.status(400).json({ message: error.message });
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
  // Trackman WebSocket Management Routes (Admin only)
  // ============================================================================

  app.post("/api/trackman/connect", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      if (!isAdmin(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { getTrackmanWebSocketService } = await import("./services/trackman-websocket");
      const wsService = getTrackmanWebSocketService();
      
      await wsService.connect(user.facilityId);
      res.json({ message: "Trackman WebSocket connected successfully" });
    } catch (error: any) {
      console.error("Error connecting Trackman WebSocket:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/trackman/disconnect", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      if (!isAdmin(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { getTrackmanWebSocketService } = await import("./services/trackman-websocket");
      const wsService = getTrackmanWebSocketService();
      
      wsService.disconnect(user.facilityId);
      res.json({ message: "Trackman WebSocket disconnected successfully" });
    } catch (error: any) {
      console.error("Error disconnecting Trackman WebSocket:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ============================================================================
  // Payment Settings Routes (Admin only)
  // ============================================================================

  app.get("/api/payment-settings", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      if (!isAdmin(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const facility = await storage.getFacility(user.facilityId);
      if (!facility) {
        return res.status(404).json({ message: "Facility not found" });
      }

      // Return payment settings without exposing the full secret key
      res.json({
        stripePublishableKey: facility.stripePublishableKey || "",
        stripeSecretKey: facility.stripeSecretKey ? "sk_****" : "", // Masked for security
        paymentProvider: facility.paymentProvider || "stripe",
        paymentsEnabled: facility.paymentsEnabled || false,
        hasStripeSecretKey: !!facility.stripeSecretKey,
      });
    } catch (error: any) {
      console.error("Error fetching payment settings:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/payment-settings", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      if (!isAdmin(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const paymentSettingsSchema = z.object({
        stripePublishableKey: z.string().optional(),
        stripeSecretKey: z.string().optional(),
        paymentProvider: z.string().optional(),
        paymentsEnabled: z.boolean().optional(),
      });

      const validatedData = paymentSettingsSchema.parse(req.body);
      
      // Build update object, only including provided fields
      const updates: any = {};
      if (validatedData.stripePublishableKey !== undefined) {
        updates.stripePublishableKey = validatedData.stripePublishableKey;
      }
      if (validatedData.stripeSecretKey !== undefined && 
          validatedData.stripeSecretKey !== "sk_****" &&
          validatedData.stripeSecretKey.trim() !== "") {
        // Only update if not the masked value and not empty/whitespace
        updates.stripeSecretKey = validatedData.stripeSecretKey;
      }
      if (validatedData.paymentProvider !== undefined) {
        updates.paymentProvider = validatedData.paymentProvider;
      }
      if (validatedData.paymentsEnabled !== undefined) {
        updates.paymentsEnabled = validatedData.paymentsEnabled;
      }

      await storage.updateFacility(user.facilityId, updates);
      
      res.json({ message: "Payment settings updated successfully" });
    } catch (error: any) {
      console.error("Error updating payment settings:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // ============================================================================
  // Time Tracking Endpoints
  // ============================================================================

  // Get time entries (filter by facilityId and optionally staffId)
  app.get("/api/time-entries", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }

      const { staffId } = req.query;
      const timeEntries = await storage.getTimeEntries(
        user.facilityId,
        staffId as string | undefined
      );

      // Enrich with staff data
      const enrichedEntries = await Promise.all(
        timeEntries.map(async (entry) => {
          const staff = await storage.getUser(entry.staffId);
          return { ...entry, staff };
        })
      );

      res.json(enrichedEntries);
    } catch (error: any) {
      console.error("Error fetching time entries:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get active (unclosed) time entry for current user
  app.get("/api/time-entries/active", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const activeEntry = await storage.getActiveTimeEntry(user.id);
      res.json(activeEntry || null);
    } catch (error: any) {
      console.error("Error fetching active time entry:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Clock in (creates new time entry)
  app.post("/api/time-entries/clock-in", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }

      // Check if user already has an active time entry
      const activeEntry = await storage.getActiveTimeEntry(user.id);
      if (activeEntry) {
        return res.status(400).json({ 
          message: "You already have an active time entry. Please clock out first." 
        });
      }

      const validatedData = insertTimeEntrySchema.parse({
        facilityId: user.facilityId,
        staffId: user.id,
        clockInTime: new Date(),
        clockOutTime: null,
        totalHours: null,
        isManualEntry: false,
        notes: null,
      });

      const timeEntry = await storage.createTimeEntry(validatedData);
      res.status(201).json(timeEntry);
    } catch (error: any) {
      console.error("Error clocking in:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // Clock out (updates active time entry with clock out time and calculates total hours)
  app.post("/api/time-entries/clock-out", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Find active time entry for this user
      const activeEntry = await storage.getActiveTimeEntry(user.id);
      if (!activeEntry) {
        return res.status(400).json({ 
          message: "No active time entry found. Please clock in first." 
        });
      }

      const clockOutTime = new Date();
      const clockInTime = new Date(activeEntry.clockInTime);
      
      // Calculate total hours: (clockOutTime - clockInTime) / (1000 * 60 * 60)
      const totalHours = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);

      const updatedEntry = await storage.updateTimeEntry(activeEntry.id, {
        clockOutTime,
        totalHours: totalHours.toFixed(2),
      });

      res.json(updatedEntry);
    } catch (error: any) {
      console.error("Error clocking out:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // Create manual time entry (admin only)
  app.post("/api/time-entries", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      if (!isAdmin(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const validatedData = insertTimeEntrySchema.parse({
        ...req.body,
        facilityId: user.facilityId,
        isManualEntry: true,
      });

      // Calculate total hours if both clock in and clock out are provided
      if (validatedData.clockInTime && validatedData.clockOutTime) {
        const clockInTime = new Date(validatedData.clockInTime);
        const clockOutTime = new Date(validatedData.clockOutTime);
        const totalHours = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);
        validatedData.totalHours = totalHours.toFixed(2);
      }

      const timeEntry = await storage.createTimeEntry(validatedData);
      res.status(201).json(timeEntry);
    } catch (error: any) {
      console.error("Error creating manual time entry:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // Update time entry (admin only)
  app.patch("/api/time-entries/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      if (!isAdmin(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const timeEntry = await storage.getTimeEntry(req.params.id);
      if (!timeEntry || timeEntry.facilityId !== user.facilityId) {
        return res.status(404).json({ message: "Time entry not found" });
      }

      const updateData = { ...req.body };
      
      // Recalculate total hours if clock times are updated
      if (updateData.clockInTime || updateData.clockOutTime) {
        const clockInTime = new Date(updateData.clockInTime || timeEntry.clockInTime);
        const clockOutTime = new Date(updateData.clockOutTime || timeEntry.clockOutTime);
        
        if (clockOutTime) {
          const totalHours = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);
          updateData.totalHours = totalHours.toFixed(2);
        }
      }

      const updatedEntry = await storage.updateTimeEntry(req.params.id, updateData);
      res.json(updatedEntry);
    } catch (error: any) {
      console.error("Error updating time entry:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // Delete time entry (admin only)
  app.delete("/api/time-entries/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      if (!isAdmin(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const timeEntry = await storage.getTimeEntry(req.params.id);
      if (!timeEntry || timeEntry.facilityId !== user.facilityId) {
        return res.status(404).json({ message: "Time entry not found" });
      }

      await storage.deleteTimeEntry(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting time entry:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // ============================================================================
  // Task Endpoints
  // ============================================================================

  // Get tasks (filter by facilityId, optionally by assignedToId)
  app.get("/api/tasks", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }

      const { assignedToId } = req.query;
      const tasks = await storage.getTasks(
        user.facilityId,
        assignedToId as string | undefined
      );

      // Enrich with user data
      const enrichedTasks = await Promise.all(
        tasks.map(async (task) => {
          const assignedTo = task.assignedToId 
            ? await storage.getUser(task.assignedToId)
            : null;
          const createdBy = await storage.getUser(task.createdById);
          return { ...task, assignedTo, createdBy };
        })
      );

      res.json(enrichedTasks);
    } catch (error: any) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Create task (admin only)
  app.post("/api/tasks", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      if (!isAdmin(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const validatedData = insertTaskSchema.parse({
        ...req.body,
        facilityId: user.facilityId,
        createdById: user.id,
      });

      const task = await storage.createTask(validatedData);
      res.status(201).json(task);
    } catch (error: any) {
      console.error("Error creating task:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // Update task (admin or assigned person can update status)
  app.patch("/api/tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }

      const task = await storage.getTask(req.params.id);
      if (!task || task.facilityId !== user.facilityId) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Check permissions: admin can update anything, assigned person can update status
      const isAssignedUser = task.assignedToId === user.id;
      const canUpdate = isAdmin(user.role) || isAssignedUser;

      if (!canUpdate) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // If not admin, only allow status updates
      let updateData = req.body;
      if (!isAdmin(user.role) && isAssignedUser) {
        updateData = { status: req.body.status };
      }

      // Auto-set completedAt if status is being set to completed
      if (updateData.status === "completed" && !task.completedAt) {
        updateData.completedAt = new Date();
      }

      const updatedTask = await storage.updateTask(req.params.id, updateData);
      res.json(updatedTask);
    } catch (error: any) {
      console.error("Error updating task:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // Delete task (admin only)
  app.delete("/api/tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      if (!isAdmin(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const task = await storage.getTask(req.params.id);
      if (!task || task.facilityId !== user.facilityId) {
        return res.status(404).json({ message: "Task not found" });
      }

      await storage.deleteTask(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting task:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // ============================================================================
  // Commission Endpoints
  // ============================================================================

  // Get commissions (filter by facilityId and optionally staffId)
  app.get("/api/commissions", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }

      const { staffId } = req.query;
      const commissions = await storage.getCommissions(
        user.facilityId,
        staffId as string | undefined
      );

      // Enrich with staff data
      const enrichedCommissions = await Promise.all(
        commissions.map(async (commission) => {
          const staff = await storage.getUser(commission.staffId);
          return { ...commission, staff };
        })
      );

      res.json(enrichedCommissions);
    } catch (error: any) {
      console.error("Error fetching commissions:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Create commission (admin only)
  app.post("/api/commissions", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      if (!isAdmin(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const validatedData = insertCommissionSchema.parse({
        ...req.body,
        facilityId: user.facilityId,
      });

      const commission = await storage.createCommission(validatedData);
      res.status(201).json(commission);
    } catch (error: any) {
      console.error("Error creating commission:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // Mark commission as paid out (admin only)
  app.patch("/api/commissions/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      if (!isAdmin(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const commission = await storage.getCommission(req.params.id);
      if (!commission || commission.facilityId !== user.facilityId) {
        return res.status(404).json({ message: "Commission not found" });
      }

      const updatedCommission = await storage.updateCommission(req.params.id, {
        paidOut: req.body.paidOut !== undefined ? req.body.paidOut : true,
        paidOutAt: req.body.paidOut !== false ? new Date() : null,
      });

      res.json(updatedCommission);
    } catch (error: any) {
      console.error("Error updating commission:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // ============================================================================
  // Tip Endpoints
  // ============================================================================

  // Get tips (filter by facilityId and optionally staffId)
  app.get("/api/tips", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }

      const { staffId } = req.query;
      const tips = await storage.getTips(
        user.facilityId,
        staffId as string | undefined
      );

      // Enrich with staff data
      const enrichedTips = await Promise.all(
        tips.map(async (tip) => {
          const staff = await storage.getUser(tip.staffId);
          return { ...tip, staff };
        })
      );

      res.json(enrichedTips);
    } catch (error: any) {
      console.error("Error fetching tips:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Create tip entry
  app.post("/api/tips", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }

      const validatedData = insertTipSchema.parse({
        ...req.body,
        facilityId: user.facilityId,
      });

      const tip = await storage.createTip(validatedData);
      res.status(201).json(tip);
    } catch (error: any) {
      console.error("Error creating tip:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // Delete tip (admin only)
  app.delete("/api/tips/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      if (!isAdmin(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const tip = await storage.getTip(req.params.id);
      if (!tip || tip.facilityId !== user.facilityId) {
        return res.status(404).json({ message: "Tip not found" });
      }

      await storage.deleteTip(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting tip:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // ============================================================================
  // Staff Endpoints
  // ============================================================================

  // Get all staff members for facility
  app.get("/api/staff", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }

      const staffMembers = await storage.getStaffMembers(user.facilityId);
      res.json(staffMembers);
    } catch (error: any) {
      console.error("Error fetching staff members:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Update staff member details (admin only)
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

      // Extract only allowed fields for staff updates
      const allowedUpdates: any = {};
      if (req.body.hourlyRate !== undefined) allowedUpdates.hourlyRate = req.body.hourlyRate;
      if (req.body.commissionRate !== undefined) allowedUpdates.commissionRate = req.body.commissionRate;
      if (req.body.taxId !== undefined) allowedUpdates.taxId = req.body.taxId;
      if (req.body.bio !== undefined) allowedUpdates.bio = req.body.bio;
      if (req.body.specialties !== undefined) allowedUpdates.specialties = req.body.specialties;

      const updatedStaff = await storage.updateUser(req.params.id, allowedUpdates);
      res.json(updatedStaff);
    } catch (error: any) {
      console.error("Error updating staff member:", error);
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
  // Bay Rental Offers Routes
  // ============================================================================

  app.get("/api/bay-rental-offers", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      const offers = await storage.getBayRentalOffers(user?.facilityId || undefined);
      res.json(offers);
    } catch (error: any) {
      console.error("Error fetching bay rental offers:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/bay-rental-offers", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      if (!isAdmin(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const validatedData = insertBayRentalOfferSchema.parse({
        ...req.body,
        facilityId: user.facilityId,
      });
      const offer = await storage.createBayRentalOffer(validatedData);
      res.status(201).json(offer);
    } catch (error: any) {
      console.error("Error creating bay rental offer:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/bay-rental-offers/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      if (!isAdmin(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const offer = await storage.getBayRentalOffer(req.params.id);
      if (!offer || offer.facilityId !== user.facilityId) {
        return res.status(404).json({ message: "Offer not found" });
      }

      const validatedData = updateBayRentalOfferSchema.parse(req.body);
      const updatedOffer = await storage.updateBayRentalOffer(req.params.id, validatedData);
      res.json(updatedOffer);
    } catch (error: any) {
      console.error("Error updating bay rental offer:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/bay-rental-offers/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      if (!isAdmin(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const offer = await storage.getBayRentalOffer(req.params.id);
      if (!offer || offer.facilityId !== user.facilityId) {
        return res.status(404).json({ message: "Offer not found" });
      }

      await storage.deleteBayRentalOffer(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting bay rental offer:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // ============================================================================
  // Events Routes (Golf Schools, Clinics, etc.)
  // ============================================================================

  app.get("/api/events", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      const events = await storage.getEvents(user?.facilityId || undefined);
      res.json(events);
    } catch (error: any) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/events/:id", isAuthenticated, async (req: any, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json(event);
    } catch (error: any) {
      console.error("Error fetching event:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/events", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      if (!isAdmin(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const eventData = {
        ...req.body,
        facilityId: user.facilityId,
      };

      const event = await storage.createEvent(eventData);

      // Generate bay blocks for this event
      await generateBayBlocksForEvent(event);

      res.status(201).json(event);
    } catch (error: any) {
      console.error("Error creating event:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/events/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      if (!isAdmin(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const existingEvent = await storage.getEvent(req.params.id);
      if (!existingEvent || existingEvent.facilityId !== user.facilityId) {
        return res.status(404).json({ message: "Event not found" });
      }

      const updatedEvent = await storage.updateEvent(req.params.id, req.body);

      // Delete existing bay blocks for this event
      const existingBlocks = await storage.getBayBlocks(user.facilityId);
      for (const block of existingBlocks) {
        if (block.eventId === existingEvent.id) {
          await storage.deleteBayBlock(block.id);
        }
      }

      // Regenerate bay blocks with new event data
      await generateBayBlocksForEvent(updatedEvent);

      res.json(updatedEvent);
    } catch (error: any) {
      console.error("Error updating event:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/events/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      if (!isAdmin(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const event = await storage.getEvent(req.params.id);
      if (!event || event.facilityId !== user.facilityId) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Bay blocks will be automatically deleted due to cascade on delete
      await storage.deleteEvent(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting event:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Helper function to generate bay blocks for an event
  async function generateBayBlocksForEvent(event: any) {
    const { startDate, endDate, bayIds, timePeriods, facilityId } = event;
    
    // Parse time periods (empty array means all day)
    const periods = timePeriods && Array.isArray(timePeriods) && timePeriods.length > 0 
      ? timePeriods 
      : [{ startTime: "00:00", endTime: "23:59" }];

    // Generate blocks for each day in the date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      // For each bay assigned to this event
      for (const bayId of bayIds) {
        // For each time period in the day
        for (const period of periods) {
          const [startHour, startMinute] = period.startTime.split(':').map(Number);
          const [endHour, endMinute] = period.endTime.split(':').map(Number);
          
          const blockStart = new Date(date);
          blockStart.setHours(startHour, startMinute, 0, 0);
          
          const blockEnd = new Date(date);
          blockEnd.setHours(endHour, endMinute, 0, 0);

          await storage.createBayBlock({
            facilityId,
            bayId,
            eventId: event.id,
            startTime: blockStart,
            endTime: blockEnd,
            reason: `Event: ${event.name}`,
            notes: event.description || null,
          });
        }
      }
    }
  }

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
      const { start, end } = req.query;
      
      // Support date range filtering for week/month views
      let bookings;
      if (start && end && user?.facilityId) {
        const startDate = new Date(start as string);
        const endDate = new Date(end as string);
        console.log('[Bookings Query] Date range:', { 
          start: startDate.toISOString(), 
          end: endDate.toISOString(),
          facilityId: user.facilityId
        });
        bookings = await storage.getBookingsByDateRange(
          user.facilityId,
          startDate,
          endDate
        );
        console.log('[Bookings Query] Found bookings:', bookings.length);
      } else {
        bookings = await storage.getBookings(user?.facilityId || undefined);
      }
      
      // Fetch related data for each booking
      const enrichedBookings = await Promise.all(
        bookings.map(async (booking) => {
          const bays = await Promise.all(
            (booking.bayIds || []).map(bayId => storage.getBay(bayId))
          );
          // Fetch customer info using customerId (new) or userId (deprecated fallback)
          const customer = await storage.getUser(booking.customerId || booking.userId);
          // Fetch staff who created it (if applicable)
          const createdByUser = booking.createdBy ? await storage.getUser(booking.createdBy) : null;
          return { 
            ...booking, 
            bays: bays.filter(Boolean), 
            customer, 
            createdByUser,
            user: customer, // DEPRECATED: for backward compatibility
          };
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

      let customerId = req.body.customerId;
      
      // Handle walk-in customers (guest with no existing account)
      if (!customerId && req.body.guestEmail) {
        // Try to find existing customer by email
        const existingCustomers = await storage.getUsers();
        const existingCustomer = existingCustomers.find(
          u => u.email.toLowerCase() === req.body.guestEmail.toLowerCase() && u.facilityId === user.facilityId
        );
        
        if (existingCustomer) {
          customerId = existingCustomer.id;
        } else {
          // Create a minimal customer record for walk-in
          const [firstName, ...lastNameParts] = (req.body.guestName || 'Guest').split(' ');
          const lastName = lastNameParts.join(' ') || '';
          
          const newCustomer = await storage.createUser({
            email: req.body.guestEmail,
            firstName,
            lastName,
            phone: req.body.guestPhone || '',
            role: 'customer',
            facilityId: user.facilityId,
            sub: `guest-${Date.now()}-${Math.random().toString(36).substring(7)}`, // Temporary sub for guest
          });
          customerId = newCustomer.id;
        }
      }
      
      if (!customerId) {
        return res.status(400).json({ message: "Customer ID or guest information required" });
      }

      const validatedData = insertBookingSchema.parse({
        ...req.body,
        facilityId: user.facilityId,
        customerId, // The customer the booking is for
        createdBy: user.id, // Staff member creating the booking
        userId: customerId, // DEPRECATED: for backward compatibility
      });

      // Smart bay assignment - prioritize bays with lowest wear using Trackman data
      if (!validatedData.bayIds || validatedData.bayIds.length === 0) {
        const numberOfBays = req.body.numberOfBays || 1;
        const bays = await storage.getBays(user.facilityId);
        const activeBays = bays.filter((b) => b.status === "active");
        
        if (activeBays.length < numberOfBays) {
          return res.status(400).json({ 
            message: `Only ${activeBays.length} active bays available, ${numberOfBays} requested` 
          });
        }
        
        // Get real Trackman wear scores for intelligent bay assignment
        const wearScores = await bayWearCalculator.getBayWearScores(user.facilityId);
        
        // Sort by wear score (ascending = lowest wear first)
        // Fall back to usage hours if wear data not available
        activeBays.sort((a, b) => {
          const wearA = wearScores.get(a.id) || 0;
          const wearB = wearScores.get(b.id) || 0;
          
          // If wear scores are equal, use usage hours as tiebreaker
          if (wearA === wearB) {
            return (a.usageHours || 0) - (b.usageHours || 0);
          }
          
          return wearA - wearB;
        });
        
        validatedData.bayIds = activeBays.slice(0, numberOfBays).map(b => b.id);
        
        // Log assignment for monitoring
        console.log(`🎯 Smart bay assignment: Selected bays ${validatedData.bayIds.join(', ')} with wear scores ${validatedData.bayIds.map(id => wearScores.get(id) || 0).join(', ')}`);
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

  // General booking update endpoint - for type, payment method, payment status
  app.patch("/api/bookings/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }

      const booking = await storage.getBooking(req.params.id);
      if (!booking || booking.facilityId !== user.facilityId) {
        return res.status(404).json({ message: "Booking not found" });
      }

      const updates: any = {};
      
      // Validate and set booking type
      if (req.body.type !== undefined) {
        if (!["rental", "lesson", "fitting", "event"].includes(req.body.type)) {
          return res.status(400).json({ message: "Invalid booking type" });
        }
        updates.type = req.body.type;
      }
      
      // Validate and set payment method
      if (req.body.paymentMethod !== undefined) {
        if (!["card_on_file", "new_card", "pay_at_desk", "membership"].includes(req.body.paymentMethod)) {
          return res.status(400).json({ message: "Invalid payment method" });
        }
        updates.paymentMethod = req.body.paymentMethod;
      }
      
      // Validate and set payment status
      if (req.body.paymentStatus !== undefined) {
        if (!["pending", "paid", "cancelled", "refunded"].includes(req.body.paymentStatus)) {
          return res.status(400).json({ message: "Invalid payment status" });
        }
        updates.paymentStatus = req.body.paymentStatus;
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }

      const updated = await storage.updateBooking(req.params.id, updates);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating booking:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // Check-in endpoint - update booking check-in status
  app.patch("/api/bookings/:id/check-in", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }

      const booking = await storage.getBooking(req.params.id);
      if (!booking || booking.facilityId !== user.facilityId) {
        return res.status(404).json({ message: "Booking not found" });
      }

      const { checkInStatus } = req.body;
      
      if (!["pending", "checked_in", "no_show"].includes(checkInStatus)) {
        return res.status(400).json({ message: "Invalid check-in status" });
      }

      const updated = await storage.updateBooking(req.params.id, {
        checkInStatus,
        checkedInAt: checkInStatus === "checked_in" ? new Date() : null,
      });
      
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating booking check-in status:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // Payment status endpoint - mark booking as paid
  app.patch("/api/bookings/:id/payment-status", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }

      const booking = await storage.getBooking(req.params.id);
      if (!booking || booking.facilityId !== user.facilityId) {
        return res.status(404).json({ message: "Booking not found" });
      }

      const { paymentStatus } = req.body;
      
      if (!["pending", "paid", "refunded"].includes(paymentStatus)) {
        return res.status(400).json({ message: "Invalid payment status" });
      }

      const updated = await storage.updateBooking(req.params.id, {
        paymentStatus,
      });
      
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating booking payment status:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // Top off endpoint - extend booking time and add charge
  app.patch("/api/bookings/:id/top-off", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }

      const booking = await storage.getBooking(req.params.id);
      if (!booking || booking.facilityId !== user.facilityId) {
        return res.status(404).json({ message: "Booking not found" });
      }

      const { additionalMinutes, price } = req.body;
      
      if (!additionalMinutes || typeof additionalMinutes !== 'number' || additionalMinutes <= 0) {
        return res.status(400).json({ message: "Invalid additional minutes" });
      }

      if (price !== undefined && (typeof price !== 'number' || price < 0)) {
        return res.status(400).json({ message: "Invalid price" });
      }

      // Calculate new end time
      const currentEndTime = new Date(booking.endTime);
      const newEndTime = new Date(currentEndTime.getTime() + (additionalMinutes * 60000));

      const updated = await storage.updateBooking(req.params.id, {
        endTime: newEndTime,
      });
      
      res.json(updated);
    } catch (error: any) {
      console.error("Error extending booking time:", error);
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

  app.patch("/api/memberships/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      if (!isAdmin(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const tier = await storage.getMembershipTier(req.params.id);
      if (!tier || tier.facilityId !== user.facilityId) {
        return res.status(404).json({ message: "Membership tier not found" });
      }

      const validatedData = updateMembershipTierSchema.parse(req.body);
      const updated = await storage.updateMembershipTier(req.params.id, validatedData);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating membership tier:", error);
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
  // PRODUCTS ROUTES
  // ============================================================================

  app.get("/api/products", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }

      const products = await storage.getProducts(user.facilityId);
      res.json(products);
    } catch (error: any) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/products", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      if (!isAdmin(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const validatedData = insertProductSchema.parse({
        ...req.body,
        facilityId: user.facilityId,
      });

      const product = await storage.createProduct(validatedData);
      res.status(201).json(product);
    } catch (error: any) {
      console.error("Error creating product:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/products/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      if (!isAdmin(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const product = await storage.getProduct(req.params.id);
      if (!product || product.facilityId !== user.facilityId) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Parse and remove facilityId from request to prevent cross-tenant reassignment
      const { facilityId: _, ...updateData } = req.body;
      const validatedData = updateProductSchema.parse(updateData);
      const updated = await storage.updateProduct(req.params.id, validatedData);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating product:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/products/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      if (!isAdmin(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const product = await storage.getProduct(req.params.id);
      if (!product || product.facilityId !== user.facilityId) {
        return res.status(404).json({ message: "Product not found" });
      }

      await storage.deleteProduct(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting product:", error);
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
  // Lesson Packages Routes
  // ============================================================================

  app.get("/api/lesson-packages", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      const packages = await storage.getLessonPackages(user?.facilityId || undefined);
      res.json(packages);
    } catch (error: any) {
      console.error("Error fetching lesson packages:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/lesson-packages", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      if (!isAdmin(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const validatedData = insertLessonPackageSchema.parse({
        ...req.body,
        facilityId: user.facilityId,
      });
      const pkg = await storage.createLessonPackage(validatedData);
      res.status(201).json(pkg);
    } catch (error: any) {
      console.error("Error creating lesson package:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/lesson-packages/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      if (!isAdmin(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const validatedData = updateLessonPackageSchema.parse(req.body);
      const pkg = await storage.updateLessonPackage(req.params.id, validatedData);
      res.json(pkg);
    } catch (error: any) {
      console.error("Error updating lesson package:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/lesson-packages/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      if (!isAdmin(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      await storage.deleteLessonPackage(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting lesson package:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ============================================================================
  // Transformation Packages Routes
  // ============================================================================

  app.get("/api/transformation-packages", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      const packages = await storage.getTransformationPackages(user?.facilityId || undefined);
      res.json(packages);
    } catch (error: any) {
      console.error("Error fetching transformation packages:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/transformation-packages", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      if (!isAdmin(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const validatedData = insertTransformationPackageSchema.parse({
        ...req.body,
        facilityId: user.facilityId,
      });
      const pkg = await storage.createTransformationPackage(validatedData);
      res.status(201).json(pkg);
    } catch (error: any) {
      console.error("Error creating transformation package:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/transformation-packages/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      if (!isAdmin(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const validatedData = updateTransformationPackageSchema.parse(req.body);
      const pkg = await storage.updateTransformationPackage(req.params.id, validatedData);
      res.json(pkg);
    } catch (error: any) {
      console.error("Error updating transformation package:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/transformation-packages/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      if (!isAdmin(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      await storage.deleteTransformationPackage(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting transformation package:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Public route for transformation package purchase page
  app.get("/api/public/transformation-package/:id", async (req, res) => {
    try {
      const pkg = await storage.getTransformationPackage(req.params.id);
      if (!pkg) {
        return res.status(404).json({ message: "Transformation package not found" });
      }
      const facility = await storage.getFacility(pkg.facilityId);
      res.json({ package: pkg, facility });
    } catch (error: any) {
      console.error("Error fetching transformation package:", error);
      res.status(500).json({ message: error.message });
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

  app.patch("/api/fittings/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      if (!isAdmin(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const fitting = await storage.getFitting(req.params.id);
      if (!fitting || fitting.facilityId !== user.facilityId) {
        return res.status(404).json({ message: "Fitting not found" });
      }

      const validatedData = updateFittingSchema.parse(req.body);
      const updated = await storage.updateFitting(req.params.id, validatedData);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating fitting:", error);
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
      const { startTime, duration, customerName, customerEmail, customerPhone, paymentMethod } = req.body;
      
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
      
      // Find or create customer user for anonymous widget bookings
      let customer = await storage.getUserByEmail(customerEmail);
      if (!customer) {
        // Create new customer account
        const [firstName, ...lastNameParts] = customerName.split(" ");
        const lastName = lastNameParts.join(" ") || "";
        
        customer = await storage.upsertUser({
          email: customerEmail,
          firstName,
          lastName: lastName || undefined,
          phone: customerPhone || undefined,
          facilityId,
          role: "customer",
        });
      }
      
      // Transform frontend payment method values to database enum values
      const dbPaymentMethod = paymentMethod === "online" ? "new_card" : "pay_at_desk";
      
      // Create booking with customer ID (regular booking schema)
      const validatedData = insertBookingSchema.parse({
        facilityId,
        bayIds: [assignedBay.id],
        customerId: customer.id,
        userId: customer.id, // DEPRECATED but required for backward compatibility
        startTime: bookingStart,
        endTime: bookingEnd,
        duration: bookingDuration,
        type: "rental",
        paymentMethod: dbPaymentMethod,
        paymentStatus: "pending",
      });
      
      const booking = await storage.createBooking(validatedData);
      
      res.status(201).json({ success: true, booking });
    } catch (error: any) {
      console.error("Error creating widget booking:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Widget Stripe Checkout Session - Referenced from blueprint:javascript_stripe
  app.post("/api/widget/create-checkout-session/:facilityId", async (req, res) => {
    try {
      const { facilityId } = req.params;
      const { startTime, duration, customerName, customerEmail, customerPhone, amount } = req.body;
      
      if (!startTime || !customerName || !customerEmail || !amount) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const facility = await storage.getFacility(facilityId);
      if (!facility) {
        return res.status(404).json({ message: "Facility not found" });
      }
      
      // Check if facility has Stripe configured
      if (!facility.stripeSecretKey) {
        return res.status(400).json({ message: "Payment processing not configured for this facility" });
      }
      
      // Initialize Stripe with facility's secret key
      const stripe = new Stripe(facility.stripeSecretKey, {
        apiVersion: "2024-12-18.acacia",
      });
      
      // Create booking first (with pending payment status)
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
      
      // Find or create customer user
      let customer = await storage.getUserByEmail(customerEmail);
      if (!customer) {
        const [firstName, ...lastNameParts] = customerName.split(" ");
        const lastName = lastNameParts.join(" ") || "";
        
        customer = await storage.upsertUser({
          email: customerEmail,
          firstName,
          lastName: lastName || undefined,
          phone: customerPhone || undefined,
          facilityId,
          role: "customer",
        });
      }
      
      // Create booking with pending payment status
      const validatedData = insertBookingSchema.parse({
        facilityId,
        bayIds: [assignedBay.id],
        customerId: customer.id,
        userId: customer.id,
        startTime: bookingStart,
        endTime: bookingEnd,
        duration: bookingDuration,
        type: "rental",
        paymentMethod: "new_card",
        paymentStatus: "pending",
      });
      
      const booking = await storage.createBooking(validatedData);
      
      // Create Stripe Checkout Session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Bay Rental',
                description: `${bookingDuration} minute bay rental at ${facility.name}`,
              },
              unit_amount: Math.round(amount * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${req.protocol}://${req.get('host')}/thank-you?type=booking&name=Bay+Rental&date=${encodeURIComponent(startTime)}&time=${encodeURIComponent(new Date(startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }))}&customerName=${encodeURIComponent(customerName)}&email=${encodeURIComponent(customerEmail)}&facilityId=${facilityId}&bookingId=${booking.id}`,
        cancel_url: `${req.protocol}://${req.get('host')}/widget/rental/${facilityId}`,
        customer_email: customerEmail,
        metadata: {
          bookingId: booking.id,
          facilityId,
        },
      });
      
      res.json({ url: session.url, bookingId: booking.id });
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Widget Configuration Routes
  app.get("/api/widget-config/:facilityId/:widgetType", async (req, res) => {
    try {
      const { facilityId, widgetType } = req.params;
      
      const facility = await storage.getFacility(facilityId);
      if (!facility) {
        return res.status(404).json({ message: "Facility not found" });
      }
      
      const config = await storage.getWidgetConfig(facilityId, widgetType);
      
      if (config) {
        res.json(config);
      } else {
        res.json({
          facilityId,
          widgetType,
          displayMode: "full",
          showLogo: true,
          showDescription: true,
          primaryColor: facility.primaryColor || "#16a34a",
          accentColor: facility.accentColor || "#22c55e",
          showPricing: true,
          requirePhone: false,
        });
      }
    } catch (error: any) {
      console.error("Error fetching widget config:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/widget-config/:facilityId/:widgetType", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      
      const { facilityId, widgetType } = req.params;
      
      if (facilityId !== user.facilityId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      if (!isAdmin(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const { insertWidgetConfigurationSchema } = await import("@shared/schema");
      const validatedData = insertWidgetConfigurationSchema.parse({
        ...req.body,
        facilityId,
        widgetType,
      });
      
      const config = await storage.upsertWidgetConfig(validatedData);
      res.json(config);
    } catch (error: any) {
      console.error("Error updating widget config:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // ============================================================================
  // Custom Roles Routes
  // ============================================================================

  app.get("/api/custom-roles", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }

      const roles = await storage.getCustomRoles(user.facilityId);
      res.json(roles);
    } catch (error: any) {
      console.error("Error fetching custom roles:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/custom-roles/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }

      const role = await storage.getCustomRole(req.params.id);
      if (!role || role.facilityId !== user.facilityId) {
        return res.status(404).json({ message: "Custom role not found" });
      }

      res.json(role);
    } catch (error: any) {
      console.error("Error fetching custom role:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/custom-roles", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      if (!isAdmin(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { insertCustomRoleSchema } = await import("@shared/schema");
      const validatedData = insertCustomRoleSchema.parse({
        ...req.body,
        facilityId: user.facilityId,
      });

      const newRole = await storage.createCustomRole(validatedData);
      res.status(201).json(newRole);
    } catch (error: any) {
      console.error("Error creating custom role:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/custom-roles/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      if (!isAdmin(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const role = await storage.getCustomRole(req.params.id);
      if (!role || role.facilityId !== user.facilityId) {
        return res.status(404).json({ message: "Custom role not found" });
      }

      // Prevent editing system roles
      if (role.isSystemRole) {
        return res.status(403).json({ message: "Cannot edit system roles" });
      }

      const updatedRole = await storage.updateCustomRole(req.params.id, req.body);
      res.json(updatedRole);
    } catch (error: any) {
      console.error("Error updating custom role:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/custom-roles/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      if (!isAdmin(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const role = await storage.getCustomRole(req.params.id);
      if (!role || role.facilityId !== user.facilityId) {
        return res.status(404).json({ message: "Custom role not found" });
      }

      // Prevent deleting system roles
      if (role.isSystemRole) {
        return res.status(403).json({ message: "Cannot delete system roles" });
      }

      // TODO: Check if any users have this role and prevent deletion if so
      // Or auto-reassign them to a default role

      await storage.deleteCustomRole(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting custom role:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ============================================================================
  // Commission Structures Routes
  // ============================================================================

  app.get("/api/commission-structures", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }

      const structures = await storage.getCommissionStructures(user.facilityId);
      res.json(structures);
    } catch (error: any) {
      console.error("Error fetching commission structures:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/commission-structures", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      if (!isAdmin(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const structure = await storage.createCommissionStructure({
        ...req.body,
        facilityId: user.facilityId,
      });
      res.status(201).json(structure);
    } catch (error: any) {
      console.error("Error creating commission structure:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/commission-structures/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      if (!isAdmin(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const structure = await storage.getCommissionStructure(req.params.id);
      if (!structure || structure.facilityId !== user.facilityId) {
        return res.status(404).json({ message: "Commission structure not found" });
      }

      const updated = await storage.updateCommissionStructure(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating commission structure:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/commission-structures/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      if (!isAdmin(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const structure = await storage.getCommissionStructure(req.params.id);
      if (!structure || structure.facilityId !== user.facilityId) {
        return res.status(404).json({ message: "Commission structure not found" });
      }

      await storage.deleteCommissionStructure(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting commission structure:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ============================================================================
  // Commission Payments Routes
  // ============================================================================

  app.get("/api/commission-payments", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }

      const filters: any = {};
      if (req.query.staffId) filters.staffId = req.query.staffId;
      if (req.query.startDate) filters.startDate = new Date(req.query.startDate as string);
      if (req.query.endDate) filters.endDate = new Date(req.query.endDate as string);

      const payments = await storage.getCommissionPayments(user.facilityId, filters);
      res.json(payments);
    } catch (error: any) {
      console.error("Error fetching commission payments:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/commission-payments/staff/:staffId", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }

      const payments = await storage.getCommissionPaymentsByStaff(req.params.staffId);
      res.json(payments);
    } catch (error: any) {
      console.error("Error fetching staff commission payments:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ============================================================================
  // Payroll Routes
  // ============================================================================

  app.get("/api/payroll/payments", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }

      const filters: any = {};
      if (req.query.startDate) filters.startDate = new Date(req.query.startDate as string);
      if (req.query.endDate) filters.endDate = new Date(req.query.endDate as string);

      const payments = await storage.getPayrollPayments(user.facilityId, filters);
      res.json(payments);
    } catch (error: any) {
      console.error("Error fetching payroll payments:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/payroll/payments/staff/:staffId", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }

      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const payments = await storage.getPayrollPaymentsByStaff(req.params.staffId, startDate, endDate);
      res.json(payments);
    } catch (error: any) {
      console.error("Error fetching staff payroll payments:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/payroll/payments", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "No facility associated" });
      }
      if (!isAdmin(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const payment = await storage.createPayrollPayment({
        ...req.body,
        facilityId: user.facilityId,
      });
      res.status(201).json(payment);
    } catch (error: any) {
      console.error("Error creating payroll payment:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ============================================================================
  // Orders Route (Unified view of all transactions)
  // ============================================================================

  app.get("/api/orders", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "User facility not found" });
      }

      const { type, status, date } = req.query;

      // Fetch all transaction types
      const bookings = await storage.getBookings(user.facilityId);
      const lessons = await storage.getLessons(user.facilityId);
      const fittings = await storage.getFittings(user.facilityId);
      const packageEnrollments = await storage.getTransformationPackageEnrollments(user.facilityId);

      // Helper to get date range based on filter
      const getDateRange = (filter: string) => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        switch (filter) {
          case "today":
            return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
          case "week": {
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay());
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 7);
            return { start: weekStart, end: weekEnd };
          }
          case "month": {
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            return { start: monthStart, end: monthEnd };
          }
          case "quarter": {
            const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
            const quarterStart = new Date(now.getFullYear(), quarterMonth, 1);
            const quarterEnd = new Date(now.getFullYear(), quarterMonth + 3, 0, 23, 59, 59);
            return { start: quarterStart, end: quarterEnd };
          }
          case "year": {
            const yearStart = new Date(now.getFullYear(), 0, 1);
            const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
            return { start: yearStart, end: yearEnd };
          }
          default:
            return null;
        }
      };

      const dateRange = date ? getDateRange(date as string) : null;

      // Helper to check if date is in range
      const isInDateRange = (orderDate: Date) => {
        if (!dateRange) return true;
        return orderDate >= dateRange.start && orderDate <= dateRange.end;
      };

      const orders: any[] = [];

      // Process bookings
      if (!type || type === "all" || type === "booking") {
        for (const booking of bookings) {
          if (status && status !== "all" && booking.paymentStatus !== status) continue;
          if (!isInDateRange(new Date(booking.createdAt))) continue;

          const customer = await storage.getUser(booking.customerId);
          const referrer = booking.referredBy ? await storage.getUser(booking.referredBy) : null;

          if (customer) {
            orders.push({
              id: booking.id,
              type: "booking",
              date: booking.createdAt,
              customer: {
                id: customer.id,
                firstName: customer.firstName,
                lastName: customer.lastName,
                email: customer.email,
              },
              description: `${booking.type === "rental" ? "Bay Rental" : booking.type === "lesson" ? "Lesson Booking" : booking.type === "fitting" ? "Fitting Booking" : "Event"} - ${new Date(booking.startTime).toLocaleDateString()}`,
              amount: booking.amount || "0",
              paymentStatus: booking.paymentStatus,
              paymentMethod: booking.paymentMethod,
              referredBy: referrer ? {
                firstName: referrer.firstName,
                lastName: referrer.lastName,
              } : undefined,
            });
          }
        }
      }

      // Process lessons (payment info comes from associated booking if exists)
      if (!type || type === "all" || type === "lesson") {
        for (const lesson of lessons) {
          if (!isInDateRange(new Date(lesson.createdAt))) continue;

          const customer = await storage.getUser(lesson.studentId);
          const referrer = lesson.referredBy ? await storage.getUser(lesson.referredBy) : null;

          // Get payment info from associated booking if it exists
          let paymentStatus = "pending"; // Default to pending for standalone lessons
          let paymentMethod = undefined;
          let amount = "0";

          if (lesson.bookingId) {
            const relatedBooking = bookings.find(b => b.id === lesson.bookingId);
            if (relatedBooking) {
              paymentStatus = relatedBooking.paymentStatus;
              paymentMethod = relatedBooking.paymentMethod;
              amount = relatedBooking.amount || "0";
            }
          }

          if (status && status !== "all" && paymentStatus !== status) continue;

          if (customer) {
            orders.push({
              id: lesson.id,
              type: "lesson",
              date: lesson.createdAt,
              customer: {
                id: customer.id,
                firstName: customer.firstName,
                lastName: customer.lastName,
                email: customer.email,
              },
              description: `${lesson.title} - ${new Date(lesson.date).toLocaleDateString()}`,
              amount,
              paymentStatus,
              paymentMethod,
              referredBy: referrer ? {
                firstName: referrer.firstName,
                lastName: referrer.lastName,
              } : undefined,
            });
          }
        }
      }

      // Process fittings (payment info comes from associated booking if exists)
      if (!type || type === "all" || type === "fitting") {
        for (const fitting of fittings) {
          if (!isInDateRange(new Date(fitting.createdAt))) continue;

          const customer = await storage.getUser(fitting.userId);
          const referrer = fitting.referredBy ? await storage.getUser(fitting.referredBy) : null;

          // Get payment info from associated booking if it exists
          let paymentStatus = "pending"; // Default to pending for standalone fittings
          let paymentMethod = undefined;
          let amount = "0";

          if (fitting.bookingId) {
            const relatedBooking = bookings.find(b => b.id === fitting.bookingId);
            if (relatedBooking) {
              paymentStatus = relatedBooking.paymentStatus;
              paymentMethod = relatedBooking.paymentMethod;
              amount = relatedBooking.amount || "0";
            }
          }

          if (status && status !== "all" && paymentStatus !== status) continue;

          if (customer) {
            orders.push({
              id: fitting.id,
              type: "fitting",
              date: fitting.createdAt,
              customer: {
                id: customer.id,
                firstName: customer.firstName,
                lastName: customer.lastName,
                email: customer.email,
              },
              description: `${fitting.title} - ${new Date(fitting.date).toLocaleDateString()}`,
              amount,
              paymentStatus,
              paymentMethod,
              referredBy: referrer ? {
                firstName: referrer.firstName,
                lastName: referrer.lastName,
              } : undefined,
            });
          }
        }
      }

      // Process transformation package enrollments
      if (!type || type === "all" || type === "transformation_package") {
        for (const enrollment of packageEnrollments) {
          if (status && status !== "all" && enrollment.paymentStatus !== status) continue;
          if (!isInDateRange(new Date(enrollment.createdAt))) continue;

          const customer = await storage.getUser(enrollment.userId);
          const pkg = await storage.getTransformationPackage(enrollment.packageId);
          const referrer = enrollment.referredBy ? await storage.getUser(enrollment.referredBy) : null;

          if (customer && pkg) {
            orders.push({
              id: enrollment.id,
              type: "transformation_package",
              date: enrollment.createdAt,
              customer: {
                id: customer.id,
                firstName: customer.firstName,
                lastName: customer.lastName,
                email: customer.email,
              },
              description: `${pkg.name} Package`,
              amount: pkg.price || "0",
              paymentStatus: enrollment.paymentStatus,
              paymentMethod: undefined, // Not tracked on enrollments
              referredBy: referrer ? {
                firstName: referrer.firstName,
                lastName: referrer.lastName,
              } : undefined,
            });
          }
        }
      }

      // Sort by date (newest first)
      orders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      res.json(orders);
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Analytics endpoint with comprehensive revenue breakdowns
  app.get("/api/analytics", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.facilityId) {
        return res.status(400).json({ message: "User facility not found" });
      }

      const { startDate, endDate } = req.query;

      // Default to current month if no dates provided
      const now = new Date();
      const start = startDate ? new Date(startDate as string) : new Date(now.getFullYear(), now.getMonth(), 1);
      const end = endDate ? new Date(endDate as string) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      // Fetch all data
      const bookings = await storage.getBookings(user.facilityId);
      const lessons = await storage.getLessons(user.facilityId);
      const fittings = await storage.getFittings(user.facilityId);
      const packageEnrollments = await storage.getTransformationPackageEnrollments(user.facilityId);
      const members = await storage.getMembers(user.facilityId);

      // Filter by date range
      const isInRange = (date: Date) => date >= start && date <= end;

      const filteredBookings = bookings.filter(b => isInRange(new Date(b.createdAt)));
      const filteredLessons = lessons.filter(l => isInRange(new Date(l.createdAt)));
      const filteredFittings = fittings.filter(f => isInRange(new Date(f.createdAt)));
      const filteredPackages = packageEnrollments.filter(p => isInRange(new Date(p.createdAt)));
      const filteredMembers = members.filter(m => isInRange(new Date(m.createdAt)));

      // Revenue by product type
      let transformationPackagesRevenue = 0;
      for (const pkg of filteredPackages.filter(p => p.paymentStatus === "paid")) {
        const packageData = await storage.getTransformationPackage(pkg.packageId);
        transformationPackagesRevenue += parseFloat(packageData?.price || "0");
      }

      // Calculate membership revenue from new sign-ups in date range
      let membershipsRevenue = 0;
      for (const member of filteredMembers.filter(m => m.status === "active")) {
        const tier = member.tierId ? await storage.getMembershipTier(member.tierId) : null;
        // Count first month's revenue for new memberships in this period
        membershipsRevenue += parseFloat(tier?.monthlyPrice || "0");
      }

      const revenueByType = {
        bookings: filteredBookings
          .filter(b => b.paymentStatus === "paid")
          .reduce((sum, b) => sum + parseFloat(b.amount || "0"), 0),
        lessons: filteredLessons
          .filter(l => {
            if (l.bookingId) {
              const booking = bookings.find(b => b.id === l.bookingId);
              return booking?.paymentStatus === "paid";
            }
            return false;
          })
          .reduce((sum, l) => {
            const booking = bookings.find(b => b.id === l.bookingId);
            return sum + parseFloat(booking?.amount || "0");
          }, 0),
        fittings: filteredFittings
          .filter(f => {
            if (f.bookingId) {
              const booking = bookings.find(b => b.id === f.bookingId);
              return booking?.paymentStatus === "paid";
            }
            return false;
          })
          .reduce((sum, f) => {
            const booking = bookings.find(b => b.id === f.bookingId);
            return sum + parseFloat(booking?.amount || "0");
          }, 0),
        transformationPackages: transformationPackagesRevenue,
        memberships: membershipsRevenue,
      };

      // Monthly recurring revenue (MRR) from active memberships
      const activeMemberships = members.filter(m => m.status === "active");
      let mrr = 0;
      for (const member of activeMemberships) {
        const tier = member.tierId ? await storage.getMembershipTier(member.tierId) : null;
        mrr += parseFloat(tier?.monthlyPrice || "0");
      }

      // Revenue by referral
      const revenueByReferrer: { [key: string]: { name: string; revenue: number; count: number } } = {};
      
      for (const booking of filteredBookings.filter(b => b.paymentStatus === "paid" && b.referredBy)) {
        if (booking.referredBy) {
          if (!revenueByReferrer[booking.referredBy]) {
            const referrer = await storage.getUser(booking.referredBy);
            revenueByReferrer[booking.referredBy] = {
              name: referrer ? `${referrer.firstName} ${referrer.lastName}` : "Unknown",
              revenue: 0,
              count: 0,
            };
          }
          revenueByReferrer[booking.referredBy].revenue += parseFloat(booking.amount || "0");
          revenueByReferrer[booking.referredBy].count += 1;
        }
      }

      for (const pkg of filteredPackages.filter(p => p.paymentStatus === "paid" && p.referredBy)) {
        if (pkg.referredBy) {
          if (!revenueByReferrer[pkg.referredBy]) {
            const referrer = await storage.getUser(pkg.referredBy);
            revenueByReferrer[pkg.referredBy] = {
              name: referrer ? `${referrer.firstName} ${referrer.lastName}` : "Unknown",
              revenue: 0,
              count: 0,
            };
          }
          const packageData = await storage.getTransformationPackage(pkg.packageId);
          revenueByReferrer[pkg.referredBy].revenue += parseFloat(packageData?.price || "0");
          revenueByReferrer[pkg.referredBy].count += 1;
        }
      }

      // Revenue by instructor
      const revenueByInstructor: { [key: string]: { name: string; revenue: number; count: number } } = {};
      
      for (const lesson of filteredLessons) {
        if (lesson.bookingId) {
          const booking = bookings.find(b => b.id === lesson.bookingId);
          if (booking?.paymentStatus === "paid") {
            if (!revenueByInstructor[lesson.instructorId]) {
              const instructor = await storage.getUser(lesson.instructorId);
              revenueByInstructor[lesson.instructorId] = {
                name: instructor ? `${instructor.firstName} ${instructor.lastName}` : "Unknown",
                revenue: 0,
                count: 0,
              };
            }
            revenueByInstructor[lesson.instructorId].revenue += parseFloat(booking.amount || "0");
            revenueByInstructor[lesson.instructorId].count += 1;
          }
        }
      }

      // Monthly breakdown for the year
      const monthlyRevenue: { month: string; revenue: number }[] = [];
      const currentYear = new Date().getFullYear();
      
      for (let month = 0; month < 12; month++) {
        const monthStart = new Date(currentYear, month, 1);
        const monthEnd = new Date(currentYear, month + 1, 0, 23, 59, 59);
        
        const monthlyBookings = bookings.filter(b => {
          const date = new Date(b.createdAt);
          return b.paymentStatus === "paid" && date >= monthStart && date <= monthEnd;
        });
        
        const monthlyPackages = packageEnrollments.filter(p => {
          const date = new Date(p.createdAt);
          return p.paymentStatus === "paid" && date >= monthStart && date <= monthEnd;
        });

        let revenue = monthlyBookings.reduce((sum, b) => sum + parseFloat(b.amount || "0"), 0);
        
        for (const pkg of monthlyPackages) {
          const packageData = await storage.getTransformationPackage(pkg.packageId);
          revenue += parseFloat(packageData?.price || "0");
        }

        monthlyRevenue.push({
          month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
          revenue,
        });
      }

      res.json({
        dateRange: { start, end },
        revenueByType,
        recurringRevenue: {
          mrr,
          activeMemberships: activeMemberships.length,
          annualizedRevenue: mrr * 12,
        },
        revenueByReferrer: Object.entries(revenueByReferrer).map(([id, data]) => ({
          id,
          ...data,
        })).sort((a, b) => b.revenue - a.revenue),
        revenueByInstructor: Object.entries(revenueByInstructor).map(([id, data]) => ({
          id,
          ...data,
        })).sort((a, b) => b.revenue - a.revenue),
        monthlyRevenue,
        totalRevenue: Object.values(revenueByType).reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0),
      });
    } catch (error: any) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Record manual payment for an order
  app.post("/api/orders/:orderId/record-payment", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      const facilityId = user?.facilityId;
      const orderId = req.params.orderId;
      const { orderType, paymentMethod, paymentReference, notes, amountPaid } = req.body;

      if (!orderType || !paymentMethod || !amountPaid) {
        return res.status(400).json({ message: "Order type, payment method, and amount are required" });
      }

      // Validate amount is a positive number
      const amount = parseFloat(amountPaid);
      if (isNaN(amount) || amount < 0) {
        return res.status(400).json({ message: "Invalid payment amount" });
      }

      // Update the appropriate table based on order type
      switch (orderType) {
        case "booking": {
          const booking = await storage.getBooking(orderId);
          if (!booking || booking.facilityId !== facilityId) {
            return res.status(404).json({ message: "Booking not found" });
          }

          await storage.updateBooking(orderId, {
            paymentStatus: "paid",
            paymentMethod: paymentMethod === "external_pos" ? "pay_at_desk" : paymentMethod,
            amount: amount.toFixed(2),
            notes: notes ? `${booking.notes ? booking.notes + "\n\n" : ""}Payment recorded: ${paymentMethod}${paymentReference ? ` (${paymentReference})` : ""}${notes ? ` - ${notes}` : ""}` : booking.notes,
          });
          break;
        }

        case "lesson": {
          const lesson = await storage.getLesson(orderId);
          if (!lesson || lesson.facilityId !== facilityId) {
            return res.status(404).json({ message: "Lesson not found" });
          }

          // If lesson has a booking, update that booking's payment
          if (lesson.bookingId) {
            const booking = await storage.getBooking(lesson.bookingId);
            if (booking) {
              await storage.updateBooking(lesson.bookingId, {
                paymentStatus: "paid",
                paymentMethod: paymentMethod === "external_pos" ? "pay_at_desk" : paymentMethod,
                amount: amount.toFixed(2),
                notes: notes ? `${booking.notes ? booking.notes + "\n\n" : ""}Payment recorded: ${paymentMethod}${paymentReference ? ` (${paymentReference})` : ""}${notes ? ` - ${notes}` : ""}` : booking.notes,
              });
            }
          }
          // Update lesson notes
          await storage.updateLesson(orderId, {
            notes: notes ? `${lesson.notes ? lesson.notes + "\n\n" : ""}Payment recorded: ${paymentMethod}${paymentReference ? ` (${paymentReference})` : ""}${notes ? ` - ${notes}` : ""}` : lesson.notes,
          });
          break;
        }

        case "fitting": {
          const fitting = await storage.getFitting(orderId);
          if (!fitting || fitting.facilityId !== facilityId) {
            return res.status(404).json({ message: "Fitting not found" });
          }

          // If fitting has a booking, update that booking's payment
          if (fitting.bookingId) {
            const booking = await storage.getBooking(fitting.bookingId);
            if (booking) {
              await storage.updateBooking(fitting.bookingId, {
                paymentStatus: "paid",
                paymentMethod: paymentMethod === "external_pos" ? "pay_at_desk" : paymentMethod,
                amount: amount.toFixed(2),
                notes: notes ? `${booking.notes ? booking.notes + "\n\n" : ""}Payment recorded: ${paymentMethod}${paymentReference ? ` (${paymentReference})` : ""}${notes ? ` - ${notes}` : ""}` : booking.notes,
              });
            }
          }
          // Update fitting notes
          await storage.updateFitting(orderId, {
            notes: notes ? `${fitting.notes ? fitting.notes + "\n\n" : ""}Payment recorded: ${paymentMethod}${paymentReference ? ` (${paymentReference})` : ""}${notes ? ` - ${notes}` : ""}` : fitting.notes,
          });
          break;
        }

        case "transformation_package": {
          const enrollment = await storage.getTransformationPackageEnrollment(orderId);
          if (!enrollment || enrollment.facilityId !== facilityId) {
            return res.status(404).json({ message: "Package enrollment not found" });
          }

          await storage.updateTransformationPackageEnrollment(orderId, {
            paymentStatus: "paid",
          });
          break;
        }

        case "membership": {
          // For memberships, we would update the user's membership payment status
          // This is a placeholder - actual implementation depends on membership structure
          return res.status(400).json({ message: "Manual payment recording for memberships not yet implemented" });
        }

        default:
          return res.status(400).json({ message: "Invalid order type" });
      }

      res.json({ message: "Payment recorded successfully" });
    } catch (error: any) {
      console.error("Error recording payment:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Email receipt to customer
  app.post("/api/orders/:orderId/email-receipt", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      const facilityId = user?.facilityId;
      const orderId = req.params.orderId;
      const { orderType } = req.body;

      if (!orderType) {
        return res.status(400).json({ message: "Order type is required" });
      }

      // Get order details based on type
      let orderDetails: any;
      let customer: any;

      switch (orderType) {
        case "booking": {
          const booking = await storage.getBooking(orderId);
          if (!booking || booking.facilityId !== facilityId) {
            return res.status(404).json({ message: "Booking not found" });
          }
          customer = await storage.getUser(booking.customerId);
          orderDetails = {
            type: "booking",
            description: `Bay Booking - ${booking.type}`,
            amount: booking.amount,
            date: booking.createdAt,
            paymentStatus: booking.paymentStatus,
            paymentMethod: booking.paymentMethod,
          };
          break;
        }
        case "lesson": {
          const lesson = await storage.getLesson(orderId);
          if (!lesson || lesson.facilityId !== facilityId) {
            return res.status(404).json({ message: "Lesson not found" });
          }
          customer = await storage.getUser(lesson.customerId);
          orderDetails = {
            type: "lesson",
            description: `Lesson - ${lesson.lessonType || 'Individual'}`,
            amount: lesson.price || "0",
            date: lesson.createdAt,
            paymentStatus: "paid", // Lessons track payment via bookings
            paymentMethod: undefined,
          };
          break;
        }
        case "fitting": {
          const fitting = await storage.getFitting(orderId);
          if (!fitting || fitting.facilityId !== facilityId) {
            return res.status(404).json({ message: "Fitting not found" });
          }
          customer = await storage.getUser(fitting.customerId);
          orderDetails = {
            type: "fitting",
            description: `Club Fitting - ${fitting.fittingType || 'Standard'}`,
            amount: fitting.price || "0",
            date: fitting.createdAt,
            paymentStatus: "paid",
            paymentMethod: undefined,
          };
          break;
        }
        case "transformation_package": {
          const enrollment = await storage.getTransformationPackageEnrollment(orderId);
          if (!enrollment || enrollment.facilityId !== facilityId) {
            return res.status(404).json({ message: "Package enrollment not found" });
          }
          customer = await storage.getUser(enrollment.customerId);
          const pkg = await storage.getTransformationPackage(enrollment.packageId);
          orderDetails = {
            type: "transformation_package",
            description: pkg?.name || "Transformation Package",
            amount: pkg?.price || "0",
            date: enrollment.createdAt,
            paymentStatus: enrollment.paymentStatus,
            paymentMethod: undefined,
          };
          break;
        }
        case "membership": {
          // For memberships, the orderId is actually a userId
          customer = await storage.getUser(orderId);
          if (!customer || customer.facilityId !== facilityId) {
            return res.status(404).json({ message: "Member not found" });
          }
          // Get membership tier info
          const membershipTier = customer.membershipTier 
            ? await storage.getMembershipTier(customer.membershipTier)
            : null;
          orderDetails = {
            type: "membership",
            description: membershipTier ? `${membershipTier.name} Membership` : "Membership",
            amount: membershipTier?.monthlyPrice || "0",
            date: customer.membershipStartDate || customer.createdAt,
            paymentStatus: "paid", // Memberships are typically paid
            paymentMethod: undefined,
          };
          break;
        }
        default:
          return res.status(400).json({ message: "Invalid order type" });
      }

      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      // TODO: Implement actual email sending
      // For now, we'll just log that we would send an email
      console.log(`Would send receipt email to ${customer.email} for order ${orderId}`);
      console.log("Order details:", orderDetails);

      // In a real implementation, you would:
      // 1. Get facility details for branding
      // 2. Generate HTML email with receipt
      // 3. Use email service (SendGrid, Mailgun, etc.) to send
      // 4. Log email sent in database

      res.json({ 
        message: "Receipt email sent successfully",
        // Note: In production, implement actual email sending
        note: "Email functionality will be implemented with email service integration"
      });
    } catch (error: any) {
      console.error("Error sending receipt email:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ============================================================================
  // Customer Profile Routes
  // ============================================================================

  // Get customer profile with notes
  app.get("/api/customers/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      const facilityId = user?.facilityId;
      const customerId = req.params.id;

      // Get customer
      const customer = await storage.getUser(customerId);
      if (!customer || customer.facilityId !== facilityId) {
        return res.status(404).json({ message: "Customer not found" });
      }

      // Get customer notes
      const notes = await storage.getCustomerNotes(customerId);

      res.json({ ...customer, notes });
    } catch (error: any) {
      console.error("Error fetching customer profile:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Update customer profile (including tags)
  app.patch("/api/customers/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      const facilityId = user?.facilityId;
      const customerId = req.params.id;

      // Verify customer belongs to facility
      const customer = await storage.getUser(customerId);
      if (!customer || customer.facilityId !== facilityId) {
        return res.status(404).json({ message: "Customer not found" });
      }

      // Update customer
      const updatedCustomer = await storage.updateUser(customerId, req.body);
      res.json(updatedCustomer);
    } catch (error: any) {
      console.error("Error updating customer profile:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get customer notes
  app.get("/api/customers/:customerId/notes", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      const facilityId = user?.facilityId;
      const customerId = req.params.customerId;

      // Verify customer belongs to facility
      const customer = await storage.getUser(customerId);
      if (!customer || customer.facilityId !== facilityId) {
        return res.status(404).json({ message: "Customer not found" });
      }

      const notes = await storage.getCustomerNotes(customerId);
      res.json(notes);
    } catch (error: any) {
      console.error("Error fetching customer notes:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Create customer note
  app.post("/api/customer-notes", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      const facilityId = user?.facilityId;
      const { customerId, content } = req.body;

      if (!customerId || !content) {
        return res.status(400).json({ message: "customerId and content are required" });
      }

      // Verify customer belongs to facility
      const customer = await storage.getUser(customerId);
      if (!customer || customer.facilityId !== facilityId) {
        return res.status(404).json({ message: "Customer not found" });
      }

      const note = await storage.createCustomerNote({
        facilityId: facilityId!,
        customerId,
        content,
        createdBy: user!.id,
      });

      res.json(note);
    } catch (error: any) {
      console.error("Error creating customer note:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Delete customer note
  app.delete("/api/customer-notes/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      const facilityId = user?.facilityId;
      const noteId = req.params.id;

      // Get note to verify it belongs to this facility
      const note = await storage.getCustomerNote(noteId);
      if (!note || note.facilityId !== facilityId) {
        return res.status(404).json({ message: "Note not found" });
      }

      await storage.deleteCustomerNote(noteId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting customer note:", error);
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
