import { NextResponse, type NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { getExtraServicesWithDetails, createExtraService } from "@/models/extra-service"
import { applyRateLimit } from "@/lib/rate-limiter"

// GET - Get all extra services (admin only)
export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    // Get current user
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Check if user has permission to view all services
    const hasPermission =
      user.role === "Administrator" ||
      user.permissions.includes("manage:services") ||
      user.permissions.includes("view:services")

    if (!hasPermission) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    // Get detailed view for admins
    const services = await getExtraServicesWithDetails()

    return NextResponse.json(services)
  } catch (error: any) {
    console.error("Error fetching extra services:", error)
    return NextResponse.json({ message: error.message || "Error fetching extra services" }, { status: 500 })
  }
}

// POST - Create a new extra service
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    // Get current user
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { reservationId, serviceType, description, price } = body

    if (!reservationId || !serviceType || !description) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
    }

    // Create the service
    const service = await createExtraService({
      reservationId,
      serviceType,
      description,
      price: price || 0,
      requestedBy: user.id,
    })

    return NextResponse.json({ success: true, service })
  } catch (error: any) {
    console.error("Error creating extra service:", error)
    return NextResponse.json({ message: error.message || "Error creating extra service" }, { status: 500 })
  }
}
