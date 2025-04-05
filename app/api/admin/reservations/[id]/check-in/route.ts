import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { getCurrentUser } from "@/lib/session"
import { applyRateLimit } from "@/lib/rate-limiter"
import { isValidObjectId } from "@/lib/validation"
import { handleApiError, NotFoundError, ForbiddenError, ValidationError } from "@/lib/error-handler"
import { logAuditEvent, AuditEventType } from "@/lib/audit-logger"
import { invalidateCachePattern } from "@/lib/cache"

// Realizar check-in de una reserva
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      throw new ForbiddenError("Unauthorized")
    }

    // Verificar permisos
    const hasPermission = user.role === "Administrator" || user.permissions.includes("manage:reservations")

    if (!hasPermission) {
      throw new ForbiddenError("Insufficient permissions")
    }

    const { id } = await params

    if (!isValidObjectId(id)) {
      throw new ValidationError("Invalid reservation ID format")
    }

    const db = await getDb()

    // Obtener la reserva
    const reservation = await db.collection("reservations").findOne({ _id: new ObjectId(id) })

    if (!reservation) {
      throw new NotFoundError("Reservation not found")
    }

    // Verificar que la reserva esté en estado "Confirmed"
    if (reservation.status !== "Confirmed") {
      throw new ValidationError("Cannot check-in a reservation that is not in 'Confirmed' status")
    }

    // Capturar la hora actual para el check-in
    const checkInTime = new Date()

    // Actualizar el estado de la reserva a "Checked-in" y registrar quién lo hizo y cuándo
    await db.collection("reservations").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: "Checked-in",
          updatedAt: checkInTime,
          checkedInBy: user.id, // ID del usuario que realizó el check-in
          checkedInAt: checkInTime, // Hora exacta del check-in
        },
      },
    )

    // Si hay una habitación asignada, actualizar su estado a "Occupied"
    if (reservation.roomId) {
      await db.collection("rooms").updateOne(
        { _id: new ObjectId(reservation.roomId) },
        {
          $set: {
            status: "Occupied",
            updatedAt: checkInTime,
          },
        },
      )
    }

    // Invalidar caché relacionada
    await invalidateCachePattern("reservations:*")
    await invalidateCachePattern("reservationsWithDetails:*")

    // Registrar evento de auditoría
    await logAuditEvent(
      AuditEventType.UPDATE,
      "reservation",
      id,
      {
        action: "check-in",
        roomId: reservation.roomId,
        guestName: `${reservation.guest.firstName} ${reservation.guest.lastName}`,
        performedBy: user.email,
        performedAt: checkInTime,
      },
      request,
    )

    return NextResponse.json({
      message: "Check-in completed successfully",
      reservationId: id,
      checkedInBy: user.email,
      checkedInAt: checkInTime,
    })
  } catch (error) {
    return handleApiError(error, request, "reservation", params.id)
  }
}

