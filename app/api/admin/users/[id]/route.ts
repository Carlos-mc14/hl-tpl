import { NextResponse } from "next/server"
import { getUserById, updateUser, deleteUser } from "@/models/user"
import { checkPermission } from "@/lib/permissions"
import { getCurrentUser } from "@/lib/session"

// GET user by ID
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const hasPermission = await checkPermission(user.id, "view:users")

    if (!hasPermission && user.id !== params.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const targetUser = await getUserById(params.id)

    if (!targetUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    // Remove sensitive data
    const { password, verificationToken, resetPasswordToken, resetPasswordExpires, ...userWithoutSensitiveData } =
      targetUser

    return NextResponse.json(userWithoutSensitiveData)
  } catch (error: any) {
    console.error("Get user error:", error)
    return NextResponse.json({ message: error.message || "An error occurred while fetching user" }, { status: 500 })
  }
}

// PUT update user
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const isOwnProfile = user.id === params.id
    const canManageUsers = await checkPermission(user.id, "manage:users")
    const canManageOwnProfile = await checkPermission(user.id, "manage:own_profile")

    if (!canManageUsers && !(isOwnProfile && canManageOwnProfile)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()

    // If not an admin, restrict what fields can be updated
    if (!canManageUsers && isOwnProfile) {
      const { firstName, lastName } = body
      await updateUser(params.id, { firstName, lastName })
    } else {
      await updateUser(params.id, body)
    }

    return NextResponse.json({ message: "User updated successfully" }, { status: 200 })
  } catch (error: any) {
    console.error("Update user error:", error)
    return NextResponse.json({ message: error.message || "An error occurred while updating user" }, { status: 500 })
  }
}

// DELETE user
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const hasPermission = await checkPermission(user.id, "manage:users")

    if (!hasPermission) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    // Prevent deleting own account
    if (user.id === params.id) {
      return NextResponse.json({ message: "Cannot delete your own account" }, { status: 400 })
    }

    const success = await deleteUser(params.id)

    if (!success) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "User deleted successfully" }, { status: 200 })
  } catch (error: any) {
    console.error("Delete user error:", error)
    return NextResponse.json({ message: error.message || "An error occurred while deleting user" }, { status: 500 })
  }
}

