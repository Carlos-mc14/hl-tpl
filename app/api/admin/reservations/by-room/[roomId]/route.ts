import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { getCurrentUser } from "@/lib/session"
import { applyRateLimit } from "@/lib/rate-limiter"
import { isValidObjectId } from "@/lib/validation"
import { handleApiError, NotFoundError, ForbiddenError } from "@/lib/error-handler"
import { logAuditEvent, AuditEventType } from "@/lib/audit-logger"

// Obtener reservas activas para una habitación específica
export async function GET(request: Request, { params }: { params: { roomId: string } }) {
  try {
    // Autenticación
    const user = await getCurrentUser()
    if (!user) {
      throw new ForbiddenError("Unauthorized")
    }

    // Verificar permisos
    const hasPermission =
      user.role === "Administrator" ||
      user.permissions.includes("manage:reservations") ||
      user.permissions.includes("view:reservations")

    if (!hasPermission) {
      throw new ForbiddenError("Insufficient permissions")
    }

    const { roomId } = params

    // Validar formato del ID
    if (!isValidObjectId(roomId)) {
      throw new NotFoundError("Invalid room ID format")
    }

    const db = await getDb()

    // Obtener la fecha actual
    const currentDate = new Date()

    // Buscar reservas activas para esta habitación con índices
    const reservations = await db
      .collection("reservations")
      .find({
        roomId,
        status: { $in: ["Pending", "Confirmed", "Checked-in"] },
        checkOutDate: { $gte: currentDate },
      })
      .sort({ checkInDate: 1 }) // Ordenar por fecha de check-in ascendente
      .toArray()

    // Calcular la duración en noches para cada reserva
    const reservationsWithNights = reservations.map((reservation) => {
      const checkIn = new Date(reservation.checkInDate)
      const checkOut = new Date(reservation.checkOutDate)
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))

      return {
        ...reservation,
        nights,
      }
    })

    // Registrar evento de auditoría
    await logAuditEvent(AuditEventType.READ, "reservations", roomId, { count: reservationsWithNights.length }, request)

    return NextResponse.json(reservationsWithNights)
  } catch (error) {
    return handleApiError(error, request, "reservations", params.roomId)
  }
}

