import { NextResponse, type NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { getExtraServiceById, updateExtraService, deleteExtraService } from "@/models/extra-service"
import { applyRateLimit } from "@/lib/rate-limiter"

// GET - Get a specific extra service
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

    const service = await getExtraServiceById(id)
    if (!service) {
      return NextResponse.json({ message: "Service not found" }, { status: 404 })
    }

    // Check if user has permission to view this service
    const isAdmin =
      user.role === "Administrator" ||
      user.permissions.includes("manage:services") ||
      user.permissions.includes("view:services")

    const isOwner = service.requestedBy === user.id

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json(service)
  } catch (error: any) {
    console.error(`Error fetching extra service ${params.id}:`, error)
    return NextResponse.json({ message: error.message || "Error fetching extra service" }, { status: 500 })
  }
}

// PATCH - Update a specific extra service
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

    const service = await getExtraServiceById(id)
    if (!service) {
      return NextResponse.json({ message: "Service not found" }, { status: 404 })
    }

    // Check if user has permission to update this service
    const isAdmin = user.role === "Administrator" || user.permissions.includes("manage:services")

    const isOwner = service.requestedBy === user.id

    // Owners can only cancel their own requests, admins can do anything
    if (!isAdmin && !isOwner) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()

    // If user is not admin, they can only cancel their own requests
    if (!isAdmin && isOwner) {
      if (body.status && body.status !== "Cancelled") {
        return NextResponse.json(
          {
            message: "You can only cancel your own requests",
          },
          { status: 403 },
        )
      }

      // Only allow cancellation if the service is still pending
      if (service.status !== "Pending") {
        return NextResponse.json(
          {
            message: "You can only cancel pending requests",
          },
          { status: 400 },
        )
      }
    }

    // If status is being updated to "In Progress" or "Completed", set handledBy
    if (
      isAdmin &&
      body.status &&
      (body.status === "In Progress" || body.status === "Completed") &&
      !service.handledBy
    ) {
      body.handledBy = user.id
    }

    const updated = await updateExtraService(id, body)
    if (!updated) {
      return NextResponse.json({ message: "Failed to update service" }, { status: 500 })
    }

    const updatedService = await getExtraServiceById(id)
    return NextResponse.json(updatedService)
  } catch (error: any) {
    console.error(`Error updating extra service ${params.id}:`, error)
    return NextResponse.json({ message: error.message || "Error updating extra service" }, { status: 500 })
  }
}

// DELETE - Delete a specific extra service
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

    const service = await getExtraServiceById(id)
    if (!service) {
      return NextResponse.json({ message: "Service not found" }, { status: 404 })
    }

    // Check if user has permission to delete this service
    const isAdmin = user.role === "Administrator" || user.permissions.includes("manage:services")

    const isOwner = service.requestedBy === user.id

    // Only admins or owners of pending services can delete
    if (!isAdmin && (!isOwner || service.status !== "Pending")) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const deleted = await deleteExtraService(id)
    if (!deleted) {
      return NextResponse.json({ message: "Failed to delete service" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error(`Error deleting extra service ${params.id}:`, error)
    return NextResponse.json({ message: error.message || "Error deleting extra service" }, { status: 500 })
  }
}

