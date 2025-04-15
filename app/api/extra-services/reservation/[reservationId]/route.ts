import { NextResponse, type NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { getExtraServicesByReservationId, getExtraServicesWithDetailsByReservationId } from "@/models/extra-service"
import { getReservationById } from "@/models/reservation"
import { applyRateLimit } from "@/lib/rate-limiter"

// GET - Get all extra services for a specific reservation
export async function GET(request: NextRequest, { params }: { params: { reservationId: string } }) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    const reservationId = await params.reservationId

    // Get current user
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Get the reservation to check ownership
    const reservation = await getReservationById(reservationId)
    if (!reservation) {
      return NextResponse.json({ message: "Reservation not found" }, { status: 404 })
    }

    // Check if user has permission to view these services
    const isAdmin =
      user.role === "Administrator" ||
      user.permissions.includes("manage:services") ||
      user.permissions.includes("view:services")

    const isOwner = reservation.userId === user.id || reservation.guest.email === user.email

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    // Get detailed view for admins, basic view for clients
    const services = isAdmin
      ? await getExtraServicesWithDetailsByReservationId(reservationId)
      : await getExtraServicesByReservationId(reservationId)

    return NextResponse.json(services)
  } catch (error: any) {
    console.error(`Error fetching extra services for reservation ${params.reservationId}:`, error)
    return NextResponse.json({ message: error.message || "Error fetching extra services" }, { status: 500 })
  }
}

