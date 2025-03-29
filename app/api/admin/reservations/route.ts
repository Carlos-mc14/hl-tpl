import { type NextRequest, NextResponse } from "next/server"
import { getReservationsWithDetails, getReservationsByDateRange } from "@/models/reservation"
import { getCurrentUser } from "@/lib/session"
import { checkPermission } from "@/lib/permissions"
import { invalidateCachePattern } from "@/lib/cache"

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Check permissions
    const canViewReservations = await checkPermission(user.id, "view:reservations") || user.role === "Administrator"
    if (!canViewReservations) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    // Invalidate cache to ensure fresh data
    await invalidateCachePattern("reservations:*")
    await invalidateCachePattern("reservationsWithDetails:*")

    // If date range is provided, filter by date
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)

      // Ensure valid dates
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return NextResponse.json({ message: "Invalid date format" }, { status: 400 })
      }

      const reservations = await getReservationsByDateRange(start, end)
      return NextResponse.json(reservations)
    }

    // Otherwise, get all reservations
    const reservations = await getReservationsWithDetails()
    return NextResponse.json(reservations)
  } catch (error: any) {
    console.error("Error fetching reservations:", error)
    return NextResponse.json({ message: error.message || "An error occurred" }, { status: 500 })
  }
}

