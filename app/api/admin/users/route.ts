import { NextResponse } from "next/server"
import { createUser, getAllUsers } from "@/models/user"
import { checkPermission } from "@/lib/permissions"
import { getCurrentUser } from "@/lib/session"

// GET all users
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const hasPermission = await checkPermission(user.id, "view:users")

    if (!hasPermission) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const users = await getAllUsers()

    // Remove sensitive data
    const sanitizedUsers = users.map((user) => {
      const { password, verificationToken, resetPasswordToken, resetPasswordExpires, ...rest } = user
      return rest
    })

    return NextResponse.json(sanitizedUsers)
  } catch (error: any) {
    console.error("Get users error:", error)
    return NextResponse.json({ message: error.message || "An error occurred while fetching users" }, { status: 500 })
  }
}

// POST create new user
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const hasPermission = await checkPermission(user.id, "manage:users")

    if (!hasPermission) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { firstName, lastName, email, password, role, status } = body

    // Validate input
    if (!firstName || !lastName || !email || !password || !role) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
    }

    const newUser = await createUser({
      firstName,
      lastName,
      email,
      password,
      role,
      status: status || "Active",
    })

    // Remove sensitive data
    const { password: _, ...userWithoutPassword } = newUser

    return NextResponse.json(userWithoutPassword, { status: 201 })
  } catch (error: any) {
    console.error("Create user error:", error)
    return NextResponse.json({ message: error.message || "An error occurred while creating user" }, { status: 500 })
  }
}

