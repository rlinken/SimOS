import "dotenv/config";
import { db } from "./db";
import { users, facilities } from "@shared/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function seed() {
  try {
    console.log("🌱 Starting database seed...");

    // Check if we already have a test user
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, "test@example.com"))
      .limit(1);

    if (existingUser.length > 0) {
      console.log("✅ Test user already exists");
      console.log("   Email: test@example.com");
      console.log("   Password: password123");
      return;
    }

    // Create a test facility first (if needed)
    let facility;
    const existingFacility = await db
      .select()
      .from(facilities)
      .limit(1);

    if (existingFacility.length === 0) {
      console.log("📍 Creating test facility...");
      [facility] = await db
        .insert(facilities)
        .values({
          name: "Test Golf Simulator",
          address: "123 Golf St",
          phone: "(555) 123-4567",
          email: "facility@example.com",
        })
        .returning();
      console.log("✅ Test facility created");
    } else {
      facility = existingFacility[0];
      console.log("✅ Using existing facility");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash("password123", 10);

    // Create test user
    console.log("👤 Creating test user...");
    await db.insert(users).values({
      email: "test@example.com",
      password: hashedPassword,
      firstName: "Test",
      lastName: "User",
      facilityId: facility.id,
      role: "owner",
    });

    console.log("✅ Test user created successfully!");
    console.log("");
    console.log("🎉 Seed complete! You can now login with:");
    console.log("   Email: test@example.com");
    console.log("   Password: password123");
  } catch (error) {
    console.error("❌ Seed failed:", error);
    throw error;
  }
}

seed()
  .then(() => {
    console.log("✅ Done");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  });
