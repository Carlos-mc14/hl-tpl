import { NextResponse } from "next/server"
import { createRole, getAllRoles, getUserCountByRole } from "@/models/role"
import { checkPermission } from "@/lib/permissions"
import { getCurrentUser } from "@/lib/session"

// GET all roles
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const hasPermission = await checkPermission(user.id, "view:roles")

    if (!hasPermission) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const roles = await getAllRoles()

    // Add user count to each role
    const rolesWithUserCount = await Promise.all(
      roles.map(async (role) => {
        const userCount = await getUserCountByRole(role._id.toString())
        return {
          ...role,
          userCount,
        }
      }),
    )

    return NextResponse.json(rolesWithUserCount)
  } catch (error: any) {
    console.error("Get roles error:", error)
    return NextResponse.json({ message: error.message || "An error occurred while fetching roles" }, { status: 500 })
  }
}

// POST create new role
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const hasPermission = await checkPermission(user.id, "manage:roles")

    if (!hasPermission) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, permissions } = body

    // Validate input
    if (!name || !description || !permissions) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
    }

    const newRole = await createRole({
      name,
      description,
      permissions,
    })

    return NextResponse.json(newRole, { status: 201 })
  } catch (error: any) {
    console.error("Create role error:", error)
    return NextResponse.json({ message: error.message || "An error occurred while creating role" }, { status: 500 })
  }
}

