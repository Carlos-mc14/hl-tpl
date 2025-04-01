import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
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
    const canViewReservations = checkPermission(user.id, "view:reservations") || user.role === "Administrator"
    if (!canViewReservations) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const status = searchParams.get("status")

    // Invalidate cache to ensure fresh data
    await invalidateCachePattern("reservations:*")
    await invalidateCachePattern("reservationsWithDetails:*")

    // Connect to database directly to bypass any caching issues
    const db = await getDb()

    // Build query
    const query: any = {}

    // If date range is provided, filter by date
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)

      // Ensure valid dates
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return NextResponse.json({ message: "Invalid date format" }, { status: 400 })
      }

      query.$or = [
        // Reservas que comienzan en el rango de fechas
        { checkInDate: { $gte: start, $lte: end } },
        // Reservas que terminan en el rango de fechas
        { checkOutDate: { $gte: start, $lte: end } },
        // Reservas que abarcan todo el rango de fechas
        { checkInDate: { $lte: start }, checkOutDate: { $gte: end } },
      ]
    }

    // Add status filter if provided
    if (status) {
      query.status = status
    }

    // Get all reservations directly from database
    const reservations = await db.collection("reservations").find(query).sort({ checkInDate: 1 }).toArray()

    // Log the number of reservations found for debugging
    //console.log(`Found ${reservations.length} reservations with query:`, JSON.stringify(query))

    // Log the reservations for debugging
    /*console.log(
      "Reservations details:",
      reservations.map((r) => ({
        id: r._id.toString(),
        status: r.status,
        checkIn: r.checkInDate,
        checkOut: r.checkOutDate,
        guest: r.guest.firstName + " " + r.guest.lastName,
      })),
    )*/

    // Get room details for all reservations
    const roomIds = reservations
      .filter((r) => r.roomId && r.roomId !== "pending-assignment")
      .map((r) => new ObjectId(r.roomId))

    const rooms =
      roomIds.length > 0
        ? await db
            .collection("rooms")
            .find({ _id: { $in: roomIds } })
            .toArray()
        : []

    // Get room type details
    const roomTypeIds = rooms
      .map((r) => (r.roomTypeId ? new ObjectId(r.roomTypeId) : null))
      .filter((id): id is ObjectId => id !== null)

    const roomTypes =
      roomTypeIds.length > 0
        ? await db
            .collection("roomTypes")
            .find({ _id: { $in: roomTypeIds } })
            .toArray()
        : []

    // Combine data
    const reservationsWithDetails = reservations.map((reservation) => {
      const room = rooms.find((r) => r._id.toString() === reservation.roomId)

      let roomDetails = null
      if (room) {
        const roomType = roomTypes.find((rt) => rt._id.toString() === room.roomTypeId)
        roomDetails = {
          _id: room._id,
          number: room.number,
          floor: room.floor,
          roomType: roomType ? roomType.name : "Desconocido",
          roomTypeId: room.roomTypeId,
        }
      }

      return {
        ...reservation,
        room: roomDetails,
      }
    })

    return NextResponse.json(reservationsWithDetails)
  } catch (error: any) {
    console.error("Error fetching reservations:", error)
    return NextResponse.json({ message: error.message || "An error occurred" }, { status: 500 })
  }
}

