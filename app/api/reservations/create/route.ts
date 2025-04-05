import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { getCurrentUser } from "@/lib/session"
import { generateConfirmationCode } from "@/models/reservation"
import { sendEmail } from "@/lib/email"
import { invalidateCachePattern } from "@/lib/cache"
import { applyRateLimit } from "@/lib/rate-limiter"

export async function POST(request: NextRequest) {
  try {
    // Aplicar rate limiting
    const rateLimitResponse = await applyRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse
        
    const body = await request.json()
    const {
      roomTypeId,
      checkInDate,
      checkOutDate,
      adults,
      children,
      totalPrice,
      guest,
      specialRequests,
      payOnArrival,
      isTemporary,
    } = body

    if (!roomTypeId || !checkInDate || !checkOutDate || !adults || !totalPrice || !guest) {
      return NextResponse.json({ message: "Datos incompletos" }, { status: 400 })
    }

    const db = await getDb()

    // Verificar si el tipo de habitación existe
    const roomType = await db.collection("roomTypes").findOne({ _id: new ObjectId(roomTypeId) })
    if (!roomType) {
      return NextResponse.json({ message: "Tipo de habitación no encontrado" }, { status: 404 })
    }

    // Verificar disponibilidad nuevamente antes de crear la reserva
    // Obtener todas las habitaciones de este tipo
    const rooms = await db.collection("rooms").find({ roomTypeId: roomTypeId }).toArray()
    if (!rooms.length) {
      return NextResponse.json(
        { success: false, message: "No hay habitaciones disponibles de este tipo" },
        { status: 409 },
      )
    }

    const checkIn = new Date(checkInDate)
    const checkOut = new Date(checkOutDate)

    // Obtener todas las reservas activas que se solapan con las fechas solicitadas
    const reservations = await db
      .collection("reservations")
      .find({
        roomId: { $in: rooms.map((room) => room._id.toString()) },
        status: { $in: ["Confirmed", "Checked-in", "Pending"] },
        $or: [
          // Caso 1: La reserva existente comienza antes y termina durante la nueva reserva
          { checkInDate: { $lt: checkOut }, checkOutDate: { $gt: checkIn } },
          // Caso 2: La reserva existente comienza durante la nueva reserva
          { checkInDate: { $gte: checkIn, $lt: checkOut } },
          // Caso 3: La reserva existente abarca completamente la nueva reserva
          { checkInDate: { $lte: checkIn }, checkOutDate: { $gte: checkOut } },
        ],
      })
      .toArray()

    // Obtener también las reservas temporales activas para estas fechas
    const tempReservations = await db
      .collection("temporaryReservations")
      .find({
        roomTypeId: roomTypeId,
        status: "Pending",
        expiresAt: { $gt: new Date() }, // Solo considerar las que no han expirado
        $or: [
          // Caso 1: La reserva existente comienza antes y termina durante la nueva reserva
          { checkInDate: { $lt: checkOut }, checkOutDate: { $gt: checkIn } },
          // Caso 2: La reserva existente comienza durante la nueva reserva
          { checkInDate: { $gte: checkIn, $lt: checkOut } },
          // Caso 3: La reserva existente abarca completamente la nueva reserva
          { checkInDate: { $lte: checkIn }, checkOutDate: { $gte: checkOut } },
        ],
      })
      .toArray()

    // Contar cuántas habitaciones están ocupadas para esas fechas
    const occupiedRoomIds = new Set(reservations.map((res) => res.roomId))
    const occupiedRoomCount = occupiedRoomIds.size

    // Contar reservas temporales (cada una ocupa una habitación)
    const tempReservationCount = tempReservations.length

    // Total de habitaciones ocupadas
    const totalOccupied = occupiedRoomCount + tempReservationCount

    // Verificar disponibilidad
    const available = rooms.length > totalOccupied

    if (!available) {
      return NextResponse.json(
        { success: false, message: "No hay habitaciones disponibles para las fechas seleccionadas" },
        { status: 409 },
      )
    }

    // Generar código de confirmación
    const confirmationCode = generateConfirmationCode()

    // Obtener usuario actual (si está autenticado)
    const currentUser = await getCurrentUser()

    // Determinar si la reserva debe ser temporal
    // Si isTemporary es true o si no hay usuario autenticado, crear reserva temporal
    const shouldBeTemporary = isTemporary || !currentUser

    if (shouldBeTemporary) {
      // Crear reserva temporal (para usuarios no registrados)
      const expirationTime = new Date()
      expirationTime.setMinutes(expirationTime.getMinutes() + 30) // Expira en 30 minutos

      const tempReservation = {
        roomTypeId,
        guest,
        checkInDate: new Date(checkInDate),
        checkOutDate: new Date(checkOutDate),
        adults: Number.parseInt(adults),
        children: Number.parseInt(children || 0),
        totalPrice: Number.parseFloat(totalPrice),
        status: "Pending",
        specialRequests,
        confirmationCode,
        payOnArrival: !!payOnArrival,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: expirationTime,
      }

      const result = await db.collection("temporaryReservations").insertOne(tempReservation)

      // Invalidar caché
      await invalidateCachePattern("roomTypes:*")
      await invalidateCachePattern("availability:*")

      return NextResponse.json({
        success: true,
        reservationId: result.insertedId,
        confirmationCode,
        isTemporary: true,
      })
    } else {
      // Para usuarios registrados, asignar una habitación específica
      // Encontrar una habitación disponible
      const availableRooms = rooms.filter((room) => !occupiedRoomIds.has(room._id.toString()))

      if (availableRooms.length === 0) {
        return NextResponse.json(
          { success: false, message: "No hay habitaciones disponibles para las fechas seleccionadas" },
          { status: 409 },
        )
      }

      const selectedRoom = availableRooms[0]

      // Crear reserva permanente
      const reservation = {
        roomId: selectedRoom._id.toString(),
        userId: currentUser?.id,
        guest,
        checkInDate: new Date(checkInDate),
        checkOutDate: new Date(checkOutDate),
        adults: Number.parseInt(adults),
        children: Number.parseInt(children || 0),
        totalPrice: Number.parseFloat(totalPrice),
        status: payOnArrival ? "Pending" : "Confirmed",
        paymentStatus: payOnArrival ? "Pending" : "Paid",
        paymentMethod: payOnArrival ? "Cash" : "Online",
        specialRequests,
        confirmationCode,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const result = await db.collection("reservations").insertOne(reservation)

      // Actualizar estado de la habitación
      await db
        .collection("rooms")
        .updateOne({ _id: selectedRoom._id }, { $set: { status: "Reserved", updatedAt: new Date() } })

      // Enviar correo de confirmación
      try {
        await sendEmail({
          to: guest.email,
          subject: "Confirmación de Reserva - Hotel Manager",
          text: `Estimado/a ${guest.firstName},

            Su reserva ha sido confirmada con el código ${confirmationCode}.

            Fecha de llegada: ${new Date(checkInDate).toLocaleDateString()}
            Fecha de salida: ${new Date(checkOutDate).toLocaleDateString()}

            Gracias por su preferencia.`,
          html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Confirmación de Reserva</h1>
            <p>Estimado/a ${guest.firstName},</p>
            <p>Su reserva ha sido confirmada con el código <strong>${confirmationCode}</strong>.</p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Detalles de la reserva:</strong></p>
              <p>Tipo de habitación: ${roomType.name}</p>
              <p>Habitación: ${selectedRoom.number}</p>
              <p>Fecha de llegada: ${new Date(checkInDate).toLocaleDateString()}</p>
              <p>Fecha de salida: ${new Date(checkOutDate).toLocaleDateString()}</p>
              <p>Huéspedes: ${adults} adultos, ${children || 0} niños</p>
              <p>Estado del pago: ${payOnArrival ? "Pago pendiente (a la llegada)" : "Pagado"}</p>
            </div>
            <p>Gracias por su preferencia.</p>
            <p>Atentamente,<br>El equipo de Hotel Manager</p>
          </div>
        `,
        })
      } catch (emailError) {
        console.error("Error sending confirmation email:", emailError)
        // Continuamos aunque falle el envío del correo
      }

      // Invalidar caché
      await invalidateCachePattern("reservations:*")
      await invalidateCachePattern("reservationsWithDetails:*")
      await invalidateCachePattern("roomTypes:*")
      await invalidateCachePattern("availability:*")

      return NextResponse.json({
        success: true,
        reservationId: result.insertedId,
        confirmationCode,
        isTemporary: false,
      })
    }
  } catch (error: any) {
    console.error("Error creating reservation:", error)
    return NextResponse.json({ message: error.message || "Error al crear la reserva" }, { status: 500 })
  }
}

