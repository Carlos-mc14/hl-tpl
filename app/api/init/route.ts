import { NextResponse } from "next/server"
import { initializeRoles } from "@/models/role"
import { createUser, getUserByEmail } from "@/models/user"
import { getDb } from "@/lib/mongodb"
import { initializeRoomTypes } from "@/models/room-type"
import { initializeRooms } from "@/models/room"
import bcrypt from "bcryptjs"

// This endpoint initializes the database with default roles and an admin user
export async function POST(request: Request) {
  try {
    // Initialize default roles
    await initializeRoles()

    // Initialize room types
    await initializeRoomTypes()

    // Initialize rooms
    await initializeRooms()

    // Check if admin user exists
    const adminEmail = "admin@example.com"
    const adminPassword = "Admin123!"
    const existingAdmin = await getUserByEmail(adminEmail)

    if (!existingAdmin) {
      // Create admin user with Active status and emailVerified
      await createUser({
        firstName: "Admin",
        lastName: "User",
        email: adminEmail,
        password: adminPassword, // This should be changed immediately after first login
        role: "Administrator",
        status: "Active", // Ensure the status is Active
        emailVerified: new Date(), // Set emailVerified to current date
      })

      console.log("Admin user created and activated successfully")
    } else if (existingAdmin.status !== "Active") {
      // If admin exists but is not active, update it
      const db = await getDb()
      await db.collection("users").updateOne(
        { email: adminEmail },
        {
          $set: {
            status: "Active",
            emailVerified: new Date(),
            updatedAt: new Date(),
          },
        },
      )

      console.log("Existing admin user activated successfully")
    } else {
      // If admin exists and is active, update the password
      const salt = await bcrypt.genSalt(10)
      const hashedPassword = await bcrypt.hash(adminPassword, salt)

      const db = await getDb()
      await db.collection("users").updateOne(
        { email: adminEmail },
        {
          $set: {
            password: hashedPassword,
            updatedAt: new Date(),
          },
        },
      )

      console.log("Admin password reset successfully")
    }

    return NextResponse.json(
      { message: "Database initialized successfully with active admin account, room types, and rooms" },
      { status: 200 },
    )
  } catch (error: any) {
    console.error("Database initialization error:", error)
    return NextResponse.json(
      { message: error.message || "An error occurred during database initialization" },
      { status: 500 },
    )
  }
}

