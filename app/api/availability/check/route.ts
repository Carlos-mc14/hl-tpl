import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { checkInDate, checkOutDate, roomTypeId, adults, children } = body

    if (!checkInDate || !checkOutDate || !roomTypeId) {
      return NextResponse.json({ message: "Datos incompletos" }, { status: 400 })
    }

    const checkIn = new Date(checkInDate)
    const checkOut = new Date(checkOutDate)

    // Validar fechas
    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      return NextResponse.json({ message: "Fechas inválidas" }, { status: 400 })
    }

    if (checkIn >= checkOut) {
      return NextResponse.json({ message: "La fecha de salida debe ser posterior a la de entrada" }, { status: 400 })
    }

    const db = await getDb()

    // Verificar si el tipo de habitación existe
    const roomType = await db.collection("roomTypes").findOne({ _id: new ObjectId(roomTypeId) })
    if (!roomType) {
      return NextResponse.json({ message: "Tipo de habitación no encontrado" }, { status: 404 })
    }

    // Verificar capacidad
    const totalGuests = (adults || 0) + (children || 0)
    if (totalGuests > roomType.maxOccupancy) {
      return NextResponse.json(
        {
          available: false,
          message: `Este tipo de habitación tiene capacidad máxima para ${roomType.maxOccupancy} personas`,
        },
        { status: 200 },
      )
    }

    // Obtener todas las habitaciones de este tipo
    const rooms = await db.collection("rooms").find({ roomTypeId: roomTypeId }).toArray()
    if (!rooms.length) {
      return NextResponse.json(
        { available: false, message: "No hay habitaciones disponibles de este tipo" },
        { status: 200 },
      )
    }

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

    // Calcular precio
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
    const basePrice = roomType.basePrice * nights

    // Aplicar recargo por persona adicional si corresponde
    const standardOccupancy = roomType.standardOccupancy || 2
    const additionalGuests = Math.max(0, totalGuests - standardOccupancy)
    const additionalGuestCharge = additionalGuests * (roomType.additionalGuestCharge || 0) * nights

    const totalPrice = basePrice + additionalGuestCharge

    return NextResponse.json({
      available,
      roomType,
      totalPrice,
      basePrice,
      additionalGuestCharge,
      nights,
      message: available ? "Habitación disponible" : "No hay habitaciones disponibles para las fechas seleccionadas",
      availableRooms: rooms.length - totalOccupied,
    })
  } catch (error: any) {
    console.error("Error checking availability:", error)
    return NextResponse.json({ message: error.message || "Error al verificar disponibilidad" }, { status: 500 })
  }
}

