import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { getCurrentUser } from "@/lib/session"
import { checkPermission } from "@/lib/permissions"
import { invalidateCachePattern } from "@/lib/cache"
import { updateRoomStatus } from "@/models/room"
import { applyRateLimit } from "@/lib/rate-limiter"
import { sanitizeObject, isValidObjectId, isValidEmail, isValidDate } from "@/lib/validation"
import { handleApiError, ValidationError, ForbiddenError, NotFoundError, ConflictError } from "@/lib/error-handler"
import { logAuditEvent, AuditEventType } from "@/lib/audit-logger"

export async function POST(request: Request) {
  try {
    // Check authentication
    const user = await getCurrentUser()
    if (!user) {
      throw new ForbiddenError("Unauthorized")
    }

    // Check permissions
    const canManageReservations = checkPermission(user.id, "manage:reservations") || user.role === "Administrator"
    if (!canManageReservations) {
      throw new ForbiddenError("Insufficient permissions")
    }

    // Parse request body
    const rawData = await request.json()

    // Sanitizar datos de entrada
    const data = sanitizeObject(rawData)

    // Validate required fields
    if (!data.roomId || !data.guest || !data.checkInDate || !data.checkOutDate) {
      throw new ValidationError("Missing required fields: roomId, guest, checkInDate, checkOutDate")
    }

    // Validate guest information
    if (!data.guest.firstName || !data.guest.lastName || !data.guest.email) {
      throw new ValidationError("Missing required guest information: firstName, lastName, email")
    }

    // Validar formato de email
    if (!isValidEmail(data.guest.email)) {
      throw new ValidationError("Invalid email format")
    }

    // Validar fechas
    if (!isValidDate(data.checkInDate) || !isValidDate(data.checkOutDate)) {
      throw new ValidationError("Invalid date format")
    }

    const checkInDate = new Date(data.checkInDate)
    const checkOutDate = new Date(data.checkOutDate)

    // Verificar que la fecha de salida sea posterior a la de entrada
    if (checkOutDate <= checkInDate) {
      throw new ValidationError("Check-out date must be after check-in date")
    }

    // Connect to database
    const db = await getDb()

    // Verify room exists
    if (!isValidObjectId(data.roomId)) {
      throw new ValidationError("Invalid room ID format")
    }

    const room = await db.collection("rooms").findOne({ _id: new ObjectId(data.roomId) })
    if (!room) {
      throw new NotFoundError("Room not found")
    }

    // Check for overlapping reservations with index
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
      throw new ConflictError("Room is already reserved for the selected dates")
    }

    // Generar código de confirmación único
    const confirmationCode = data.confirmationCode || generateConfirmationCode()

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
      confirmationCode,
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

    // Registrar evento de auditoría
    await logAuditEvent(
      AuditEventType.CREATE,
      "reservation",
      result.insertedId.toString(),
      {
        roomId: data.roomId,
        guestName: `${data.guest.firstName} ${data.guest.lastName}`,
        checkInDate,
        checkOutDate,
        status: data.status,
      },
      request,
    )

    // Return success response
    return NextResponse.json({
      message: "Reservation created successfully",
      reservationId: result.insertedId,
      confirmationCode,
    })
  } catch (error: any) {
    return handleApiError(error, request, "reservation", "create")
  }
}

// Función para generar un código de confirmación único
function generateConfirmationCode(): string {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  const length = 8
  let code = ""

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length)
    code += characters.charAt(randomIndex)
  }

  return code
}

