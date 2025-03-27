import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session-utils"

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ message: "No authenticated user found" }, { status: 401 })
    }

    return NextResponse.json({
      message: "User permissions",
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
      },
      isAdmin: user.role === "Administrator",
      canManageUsers: user.permissions.includes("manage:users"),
      canViewUsers: user.permissions.includes("view:users"),
      canManageRoles: user.permissions.includes("manage:roles"),
      canViewRoles: user.permissions.includes("view:roles"),
    })
  } catch (error) {
    return NextResponse.json({ message: "Error checking permissions", error: String(error) }, { status: 500 })
  }
}

