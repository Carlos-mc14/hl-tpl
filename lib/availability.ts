import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { getCachedData } from "@/lib/cache"

// Función para verificar la disponibilidad de un tipo de habitación
export async function checkRoomTypeAvailability(
  roomTypeId: string,
  checkInDate: Date,
  checkOutDate: Date,
  adults: number = 0,
  children: number = 0,
) {
  // Crear una clave de caché única para esta consulta
  const cacheKey = `availability:${roomTypeId}:${checkInDate.toISOString()}:${checkOutDate.toISOString()}:${adults}:${children}`

  // Usar el sistema de caché existente
  return getCachedData(
    cacheKey,
    async () => {
      try {
        // Validar datos
        if (!roomTypeId || !checkInDate || !checkOutDate) {
          return {
            available: false,
            availableRooms: 0,
            message: "Datos incompletos",
          }
        }

        // Validar fechas
        if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
          return {
            available: false,
            availableRooms: 0,
            message: "Fechas inválidas",
          }
        }

        if (checkInDate >= checkOutDate) {
          return {
            available: false,
            availableRooms: 0,
            message: "La fecha de salida debe ser posterior a la de entrada",
          }
        }

        const db = await getDb()

        // Verificar si el tipo de habitación existe
        const roomType = await db.collection("roomTypes").findOne({ _id: new ObjectId(roomTypeId) })
        if (!roomType) {
          return {
            available: false,
            availableRooms: 0,
            message: "Tipo de habitación no encontrado",
          }
        }

        // Verificar capacidad
        const totalGuests = (adults || 0) + (children || 0)
        if (totalGuests > roomType.maxOccupancy) {
          return {
            available: false,
            availableRooms: 0,
            message: `Este tipo de habitación tiene capacidad máxima para ${roomType.maxOccupancy} personas`,
          }
        }

        // Obtener todas las habitaciones de este tipo
        const rooms = await db.collection("rooms").find({ roomTypeId: roomTypeId }).toArray()
        if (!rooms.length) {
          return {
            available: false,
            availableRooms: 0,
            message: "No hay habitaciones disponibles de este tipo",
          }
        }

        // Obtener todas las reservas activas que se solapan con las fechas solicitadas
        const reservations = await db
          .collection("reservations")
          .find({
            roomId: { $in: rooms.map((room) => room._id.toString()) },
            status: { $in: ["Confirmed", "Checked-in", "Pending"] },
            $or: [
              // Caso 1: La reserva existente comienza antes y termina durante la nueva reserva
              { checkInDate: { $lt: checkOutDate }, checkOutDate: { $gt: checkInDate } },
              // Caso 2: La reserva existente comienza durante la nueva reserva
              { checkInDate: { $gte: checkInDate, $lt: checkOutDate } },
              // Caso 3: La reserva existente abarca completamente la nueva reserva
              { checkInDate: { $lte: checkInDate }, checkOutDate: { $gte: checkOutDate } },
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
              { checkInDate: { $lt: checkOutDate }, checkOutDate: { $gt: checkInDate } },
              // Caso 2: La reserva existente comienza durante la nueva reserva
              { checkInDate: { $gte: checkInDate, $lt: checkOutDate } },
              // Caso 3: La reserva existente abarca completamente la nueva reserva
              { checkInDate: { $lte: checkInDate }, checkOutDate: { $gte: checkOutDate } },
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
        const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
        const basePrice = roomType.basePrice * nights

        // Aplicar recargo por persona adicional si corresponde
        const standardOccupancy = roomType.standardOccupancy || 2
        const additionalGuests = Math.max(0, totalGuests - standardOccupancy)
        const additionalGuestCharge = additionalGuests * (roomType.additionalGuestCharge || 0) * nights

        const totalPrice = basePrice + additionalGuestCharge

        return {
          available,
          roomType,
          totalPrice,
          basePrice,
          additionalGuestCharge,
          nights,
          message: available
            ? "Habitación disponible"
            : "No hay habitaciones disponibles para las fechas seleccionadas",
          availableRooms: rooms.length - totalOccupied,
        }
      } catch (error: any) {
        console.error("Error checking availability:", error)
        return {
          available: false,
          availableRooms: 0,
          message: error.message || "Error al verificar disponibilidad",
        }
      }
    },
    300, // Caché por 5 minutos
  )
}

