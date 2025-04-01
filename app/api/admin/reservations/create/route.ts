import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { getCurrentUser } from "@/lib/session"
import { checkPermission } from "@/lib/permissions"
import { invalidateCachePattern } from "@/lib/cache"
import { updateRoomStatus } from "@/models/room"

export async function POST(request: Request) {
  try {
    // Check authentication
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Check permissions
    const canManageReservations = checkPermission(user.id, "manage:reservations") || user.role === "Administrator"
    if (!canManageReservations) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    // Parse request body
    const data = await request.json()

    // Validate required fields
    if (!data.roomId || !data.guest || !data.checkInDate || !data.checkOutDate) {
      return NextResponse.json(
        { message: "Missing required fields: roomId, guest, checkInDate, checkOutDate" },
        { status: 400 },
      )
    }

    // Validate guest information
    if (!data.guest.firstName || !data.guest.lastName || !data.guest.email) {
      return NextResponse.json(
        { message: "Missing required guest information: firstName, lastName, email" },
        { status: 400 },
      )
    }

    // Connect to database
    const db = await getDb()

    // Verify room exists
    const room = await db.collection("rooms").findOne({ _id: new ObjectId(data.roomId) })
    if (!room) {
      return NextResponse.json({ message: "Room not found" }, { status: 404 })
    }

    // Check for overlapping reservations
    const checkInDate = new Date(data.checkInDate)
    const checkOutDate = new Date(data.checkOutDate)

    const overlappingReservation = await db.collection("reservations").findOne({
      roomId: data.roomId,
      status: { $in: ["Pending", "Confirmed", "Checked-in"] },
      $or: [
        {
          checkInDate: { $lte: checkOutDate },
          checkOutDate: { $gte: checkInDate },
        },
      ],
    })

    if (overlappingReservation) {
      return NextResponse.json({ message: "Room is already reserved for the selected dates" }, { status: 409 })
    }

    // Create reservation object
    const reservation = {
      roomId: data.roomId,
      guest: {
        firstName: data.guest.firstName,
        lastName: data.guest.lastName,
        email: data.guest.email,
        phone: data.guest.phone || "",
      },
      checkInDate,
      checkOutDate,
      adults: data.adults || 1,
      children: data.children || 0,
      totalPrice: data.totalPrice || 0,
      status: data.status || "Confirmed",
      paymentStatus: data.paymentStatus || "Pending",
      specialRequests: data.specialRequests || "",
      confirmationCode: data.confirmationCode,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: user.id, // Track who created the reservation
    }

    // Insert reservation into database
    const result = await db.collection("reservations").insertOne(reservation)

    // Update room status based on reservation status
    if (data.status === "Checked-in") {
      await updateRoomStatus(data.roomId, "Occupied")
    } else if (data.status === "Confirmed" || data.status === "Pending") {
      await updateRoomStatus(data.roomId, "Reserved")
    }

    // Invalidate cache
    await invalidateCachePattern("reservations:*")
    await invalidateCachePattern("reservationsWithDetails:*")

    // Return success response
    return NextResponse.json({
      message: "Reservation created successfully",
      reservationId: result.insertedId,
      confirmationCode: data.confirmationCode,
    })
  } catch (error: any) {
    console.error("Error creating reservation:", error)
    return NextResponse.json(
      { message: error.message || "An error occurred while creating the reservation" },
      { status: 500 },
    )
  }
}

