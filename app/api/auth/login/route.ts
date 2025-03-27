import { NextResponse } from "next/server"
import { getUserByEmail, verifyPassword, type User } from "@/models/user"
import { createSession } from "@/lib/session"
import { sign } from "jsonwebtoken"
import { cookies } from "next/headers"
import { getRoleByName } from "@/models/role"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, callbackUrl } = body

    // Validate input
    if (!email || !password) {
      return NextResponse.json({ message: "Email and password are required" }, { status: 400 })
    }

    // Get user by email
    const user = await getUserByEmail(email)
    if (!user) {
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401 })
    }

    // Check if user is active
    if (user.status !== "Active") {
      return NextResponse.json(
        {
          message: "Account is not active. Please verify your email.",
          needsVerification: true,
          email: user.email,
        },
        { status: 403 },
      )
    }

    // Verify password
    const isValid = await verifyPassword(user as User, password)
    if (!isValid) {
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401 })
    }

    // Get user role
    const role = await getRoleByName(user.role)
    if (!role) {
      return NextResponse.json({ message: "User role not found" }, { status: 500 })
    }

    // Create session
    const sessionId = await createSession({
      userId: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      permissions: role.permissions,
    })

    // Create JWT token
    const token = sign({ sessionId }, process.env.JWT_SECRET || "fallback-secret-key-change-me", { expiresIn: "7d" })

    // Set cookie
    const cookieStore = await cookies()
    cookieStore.set({
      name: "auth-token",
      value: token,
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    // Determine redirect URL based on user role
    let redirectUrl = "/profile"

    if (
      user.role === "Administrator" ||
      role.permissions.includes("manage:users") ||
      role.permissions.includes("manage:roles")
    ) {
      redirectUrl = "/dashboard"
    }

    // Use callbackUrl if provided and it's not the login page
    if (callbackUrl && !callbackUrl.includes("/auth/login")) {
      redirectUrl = callbackUrl
    }

    return NextResponse.json({
      success: true,
      redirectUrl,
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    })
  } catch (error: any) {
    console.error("Login error:", error)
    return NextResponse.json({ message: error.message || "An error occurred during login" }, { status: 500 })
  }
}

