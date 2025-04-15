import { NextResponse, type NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { getServiceItemById, updateServiceItem, deleteServiceItem } from "@/models/service-item"
import { applyRateLimit } from "@/lib/rate-limiter"

// GET - Get a specific service item
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    const id = params.id

    // Get current user
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Check if user has permission to view service items
    const hasPermission =
      user.role === "Administrator" ||
      user.permissions.includes("manage:services") ||
      user.permissions.includes("view:services")

    if (!hasPermission) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const item = await getServiceItemById(id)
    if (!item) {
      return NextResponse.json({ message: "Service item not found" }, { status: 404 })
    }

    return NextResponse.json(item)
  } catch (error: any) {
    console.error(`Error fetching service item ${params.id}:`, error)
    return NextResponse.json({ message: error.message || "Error fetching service item" }, { status: 500 })
  }
}

// PATCH - Update a specific service item
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    const id = params.id

    // Get current user
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Check if user has permission to update service items
    const hasPermission = user.role === "Administrator" || user.permissions.includes("manage:services")

    if (!hasPermission) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const item = await getServiceItemById(id)
    if (!item) {
      return NextResponse.json({ message: "Service item not found" }, { status: 404 })
    }

    const body = await request.json()
    const updated = await updateServiceItem(id, body)
    if (!updated) {
      return NextResponse.json({ message: "Failed to update service item" }, { status: 500 })
    }

    const updatedItem = await getServiceItemById(id)
    return NextResponse.json(updatedItem)
  } catch (error: any) {
    console.error(`Error updating service item ${params.id}:`, error)
    return NextResponse.json({ message: error.message || "Error updating service item" }, { status: 500 })
  }
}

// DELETE - Delete a specific service item
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    const id = params.id

    // Get current user
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Check if user has permission to delete service items
    const hasPermission = user.role === "Administrator" || user.permissions.includes("manage:services")

    if (!hasPermission) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const item = await getServiceItemById(id)
    if (!item) {
      return NextResponse.json({ message: "Service item not found" }, { status: 404 })
    }

    const deleted = await deleteServiceItem(id)
    if (!deleted) {
      return NextResponse.json({ message: "Failed to delete service item" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error(`Error deleting service item ${params.id}:`, error)
    return NextResponse.json({ message: error.message || "Error deleting service item" }, { status: 500 })
  }
}

