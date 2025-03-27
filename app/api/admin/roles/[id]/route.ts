import { NextResponse } from "next/server"
import { getRoleById, updateRole, deleteRole } from "@/models/role"
import { checkPermission } from "@/lib/permissions"
import { getCurrentUser } from "@/lib/session"

// GET role by ID
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const hasPermission = await checkPermission(user.id, "view:roles")

    if (!hasPermission) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const role = await getRoleById(params.id)

    if (!role) {
      return NextResponse.json({ message: "Role not found" }, { status: 404 })
    }

    return NextResponse.json(role)
  } catch (error: any) {
    console.error("Get role error:", error)
    return NextResponse.json({ message: error.message || "An error occurred while fetching role" }, { status: 500 })
  }
}

// PUT update role
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const hasPermission = await checkPermission(user.id, "manage:roles")

    if (!hasPermission) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const role = await getRoleById(params.id)

    if (!role) {
      return NextResponse.json({ message: "Role not found" }, { status: 404 })
    }

    // Prevent modifying protected roles
    if (role.name === "Administrator" || role.name === "Customer") {
      return NextResponse.json({ message: "Cannot modify protected roles" }, { status: 400 })
    }

    const body = await request.json()
    const success = await updateRole(params.id, body)

    if (!success) {
      return NextResponse.json({ message: "Role not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Role updated successfully" }, { status: 200 })
  } catch (error: any) {
    console.error("Update role error:", error)
    return NextResponse.json({ message: error.message || "An error occurred while updating role" }, { status: 500 })
  }
}

// DELETE role
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const hasPermission = await checkPermission(user.id, "manage:roles")

    if (!hasPermission) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const role = await getRoleById(params.id)

    if (!role) {
      return NextResponse.json({ message: "Role not found" }, { status: 404 })
    }

    // Prevent deleting protected roles
    if (role.name === "Administrator" || role.name === "Customer") {
      return NextResponse.json({ message: "Cannot delete protected roles" }, { status: 400 })
    }

    const success = await deleteRole(params.id)

    if (!success) {
      return NextResponse.json({ message: "Role not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Role deleted successfully" }, { status: 200 })
  } catch (error: any) {
    console.error("Delete role error:", error)
    return NextResponse.json({ message: error.message || "An error occurred while deleting role" }, { status: 500 })
  }
}

