import { ObjectId } from "mongodb"
import { getDb, releaseConnection } from "@/lib/mongodb"
import { getRoomById, updateRoomStatus } from "./room"
import { getUserById } from "./user"
import { getCachedData, invalidateCache, invalidateCachePattern } from "@/lib/cache"

export type ReservationStatus = "Pending" | "Confirmed" | "Checked-in" | "Checked-out" | "Cancelled" | "No-show"

export interface Guest {
  firstName: string
  lastName: string
  email: string
  phone?: string
  address?: string
  idNumber?: string
  idType?: string
}

export interface Reservation {
  _id?: ObjectId
  roomId: string
  userId?: string // Optional for non-registered users
  guest: Guest
  checkInDate: Date
  checkOutDate: Date
  adults: number
  children: number
  totalPrice: number
  status: ReservationStatus
  paymentStatus: "Pending" | "Partial" | "Paid"
  paymentMethod?: string
  specialRequests?: string
  createdAt: Date
  updatedAt: Date
  confirmationCode: string
}

export interface ReservationWithDetails extends Reservation {
  room: {
    number: string
    roomType: string
  }
  user?: {
    firstName: string
    lastName: string
    email: string
  }
}

// Generate a random confirmation code
function generateConfirmationCode(): string {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let code = ""
  for (let i = 0; i < 8; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return code
}

export async function createReservation(
  reservationData: Omit<Reservation, "_id" | "createdAt" | "updatedAt" | "confirmationCode">,
) {
  const db = await getDb()
  try {
    // Verify room exists and is available
    const room = await getRoomById(reservationData.roomId)
    if (!room) {
      throw new Error("Room not found")
    }

    if (room.status !== "Available" && room.status !== "Reserved") {
      throw new Error("Room is not available for reservation")
    }

    // Verify user exists if provided
    if (reservationData.userId) {
      const user = await getUserById(reservationData.userId)
      if (!user) {
        throw new Error("User not found")
      }
    }

    // Check for overlapping reservations
    const overlappingReservation = await db.collection("reservations").findOne({
      roomId: reservationData.roomId,
      status: { $in: ["Pending", "Confirmed", "Checked-in"] },
      $or: [
        {
          checkInDate: { $lte: reservationData.checkOutDate },
          checkOutDate: { $gte: reservationData.checkInDate },
        },
      ],
    })

    if (overlappingReservation) {
      throw new Error("Room is already reserved for the selected dates")
    }

    // Generate confirmation code
    const confirmationCode = generateConfirmationCode()

    // Create reservation
    const newReservation = {
      ...reservationData,
      confirmationCode,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection("reservations").insertOne(newReservation)

    // Update room status to Reserved
    await updateRoomStatus(reservationData.roomId, "Reserved")

    // Invalidar caché relacionada con reservaciones
    if (reservationData.userId) {
      await invalidateCachePattern(`reservations:user:${reservationData.userId}*`)
    }
    await invalidateCachePattern(`reservations:email:${reservationData.guest.email}*`)
    await invalidateCachePattern("reservations:*")

    return { ...newReservation, _id: result.insertedId }
  } finally {
    releaseConnection()
  }
}

// Añadir una validación de ObjectId en getReservationById
export async function getReservationById(id: string) {
  return getCachedData(
    `reservation:${id}`,
    async () => {
      try {
        const db = await getDb()
        try {
          // Verificar que el ID sea un ObjectId válido antes de usarlo
          if (!ObjectId.isValid(id)) {
            console.error(`Invalid ObjectId format: ${id}`)
            return null
          }
          return await db.collection("reservations").findOne({ _id: new ObjectId(id) })
        } finally {
          releaseConnection()
        }
      } catch (error) {
        console.error(`Error in getReservationById: ${error}`)
        return null
      }
    },
    300,
  ) // Caché por 5 minutos
}

export async function getReservationByConfirmationCode(code: string) {
  return getCachedData(
    `reservation:code:${code}`,
    async () => {
      const db = await getDb()
      try {
        return await db.collection("reservations").findOne({ confirmationCode: code })
      } finally {
        releaseConnection()
      }
    },
    300,
  ) // Caché por 5 minutos
}

// Fix the getReservationWithDetailsById function
export async function getReservationWithDetailsById(id: string): Promise<ReservationWithDetails | null> {
  return getCachedData(
    `reservationWithDetails:${id}`,
    async () => {
      const db = await getDb()
      try {
        const reservation = await db.collection("reservations").findOne({ _id: new ObjectId(id) })

        if (!reservation) return null

        const room = await getRoomById(reservation.roomId)
        if (!room) return null

        // Get room type name
        const roomType = await db.collection("roomTypes").findOne({ _id: new ObjectId(room.roomTypeId) })

        let user = null
        if (reservation.userId) {
          user = await getUserById(reservation.userId)
        }

        return {
          _id: reservation._id,
          roomId: reservation.roomId,
          userId: reservation.userId,
          guest: reservation.guest,
          checkInDate: reservation.checkInDate,
          checkOutDate: reservation.checkOutDate,
          adults: reservation.adults,
          children: reservation.children,
          totalPrice: reservation.totalPrice,
          status: reservation.status as ReservationStatus,
          paymentStatus: reservation.paymentStatus,
          paymentMethod: reservation.paymentMethod,
          specialRequests: reservation.specialRequests,
          createdAt: reservation.createdAt,
          updatedAt: reservation.updatedAt,
          confirmationCode: reservation.confirmationCode,
          room: {
            number: room.number,
            roomType: roomType ? roomType.name : "Unknown",
          },
          user: user
            ? {
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
              }
            : undefined,
        }
      } finally {
        releaseConnection()
      }
    },
    300,
  ) // Caché por 5 minutos
}

export async function updateReservation(id: string, reservationData: Partial<Reservation>) {
  const db = await getDb()
  try {
    const currentReservation = await getReservationById(id)
    if (!currentReservation) {
      throw new Error("Reservation not found")
    }

    // If changing room, verify new room exists and is available
    if (reservationData.roomId && reservationData.roomId !== currentReservation.roomId) {
      const newRoom = await getRoomById(reservationData.roomId)
      if (!newRoom) {
        throw new Error("New room not found")
      }

      if (newRoom.status !== "Available" && newRoom.status !== "Reserved") {
        throw new Error("New room is not available for reservation")
      }

      // Check for overlapping reservations on new room
      const overlappingReservation = await db.collection("reservations").findOne({
        _id: { $ne: new ObjectId(id) },
        roomId: reservationData.roomId,
        status: { $in: ["Pending", "Confirmed", "Checked-in"] },
        $or: [
          {
            checkInDate: { $lte: reservationData.checkOutDate || currentReservation.checkOutDate },
            checkOutDate: { $gte: reservationData.checkInDate || currentReservation.checkInDate },
          },
        ],
      })

      if (overlappingReservation) {
        throw new Error("New room is already reserved for the selected dates")
      }

      // Update old room status back to Available if not checked in
      if (currentReservation.status !== "Checked-in") {
        await updateRoomStatus(currentReservation.roomId, "Available")
      }

      // Update new room status to Reserved
      await updateRoomStatus(reservationData.roomId, "Reserved")
    }

    // If changing status to Checked-in, update room status
    if (reservationData.status === "Checked-in" && currentReservation.status !== "Checked-in") {
      await updateRoomStatus(currentReservation.roomId, "Occupied")
    }

    // If changing status to Checked-out or Cancelled, update room status
    if (
      (reservationData.status === "Checked-out" || reservationData.status === "Cancelled") &&
      currentReservation.status !== "Checked-out" &&
      currentReservation.status !== "Cancelled"
    ) {
      await updateRoomStatus(currentReservation.roomId, "Cleaning")
    }

    const updateData = {
      ...reservationData,
      updatedAt: new Date(),
    }

    const result = await db.collection("reservations").updateOne({ _id: new ObjectId(id) }, { $set: updateData })

    // Invalidar caché
    await invalidateCache(`reservation:${id}`)
    await invalidateCache(`reservationWithDetails:${id}`)
    if (currentReservation.userId) {
      await invalidateCachePattern(`reservations:user:${currentReservation.userId}*`)
    }
    if (currentReservation.guest && currentReservation.guest.email) {
      await invalidateCachePattern(`reservations:email:${currentReservation.guest.email}*`)
    }
    await invalidateCachePattern("reservations:*")

    return result.modifiedCount > 0
  } finally {
    releaseConnection()
  }
}

export async function deleteReservation(id: string) {
  const db = await getDb()
  try {
    const reservation = await getReservationById(id)
    if (!reservation) {
      throw new Error("Reservation not found")
    }

    // Only allow deletion of pending or cancelled reservations
    if (reservation.status !== "Pending" && reservation.status !== "Cancelled") {
      throw new Error("Only pending or cancelled reservations can be deleted")
    }

    // Update room status back to Available
    await updateRoomStatus(reservation.roomId, "Available")

    const result = await db.collection("reservations").deleteOne({ _id: new ObjectId(id) })

    // Invalidar caché
    await invalidateCache(`reservation:${id}`)
    await invalidateCache(`reservationWithDetails:${id}`)
    if (reservation.userId) {
      await invalidateCachePattern(`reservations:user:${reservation.userId}*`)
    }
    if (reservation.guest && reservation.guest.email) {
      await invalidateCachePattern(`reservations:email:${reservation.guest.email}*`)
    }
    await invalidateCachePattern("reservations:*")

    return result.deletedCount > 0
  } finally {
    releaseConnection()
  }
}

export async function getAllReservations() {
  return getCachedData(
    "reservations:all",
    async () => {
      const db = await getDb()
      try {
        return await db.collection("reservations").find().sort({ checkInDate: -1 }).toArray()
      } finally {
        releaseConnection()
      }
    },
    300,
  ) // Caché por 5 minutos
}

export async function getReservationsByUser(userId: string) {
  return getCachedData(
    `reservations:user:${userId}`,
    async () => {
      const db = await getDb()
      try {
        return await db.collection("reservations").find({ userId }).sort({ checkInDate: -1 }).toArray()
      } finally {
        releaseConnection()
      }
    },
    300,
  ) // Caché por 5 minutos
}

export async function getReservationsByEmail(email: string) {
  return getCachedData(
    `reservations:email:${email}`,
    async () => {
      const db = await getDb()
      try {
        return await db.collection("reservations").find({ "guest.email": email }).sort({ checkInDate: -1 }).toArray()
      } finally {
        releaseConnection()
      }
    },
    300,
  ) // Caché por 5 minutos
}

export async function getReservationsByStatus(status: ReservationStatus) {
  return getCachedData(
    `reservations:status:${status}`,
    async () => {
      const db = await getDb()
      try {
        return await db.collection("reservations").find({ status }).sort({ checkInDate: -1 }).toArray()
      } finally {
        releaseConnection()
      }
    },
    300,
  ) // Caché por 5 minutos
}

export async function getReservationsByDateRange(startDate: Date, endDate: Date) {
  const cacheKey = `reservations:dateRange:${startDate.toISOString()}-${endDate.toISOString()}`
  return getCachedData(
    cacheKey,
    async () => {
      const db = await getDb()
      try {
        return await db
          .collection("reservations")
          .find({
            $or: [
              { checkInDate: { $gte: startDate, $lte: endDate } },
              { checkOutDate: { $gte: startDate, $lte: endDate } },
              {
                checkInDate: { $lte: startDate },
                checkOutDate: { $gte: endDate },
              },
            ],
          })
          .sort({ checkInDate: -1 })
          .toArray()
      } finally {
        releaseConnection()
      }
    },
    300,
  ) // Caché por 5 minutos
}

// Fix the getReservationsWithDetails function
export async function getReservationsWithDetails(): Promise<ReservationWithDetails[]> {
  return getCachedData(
    "reservationsWithDetails:all",
    async () => {
      const db = await getDb()
      try {
        const reservations = await db.collection("reservations").find().sort({ checkInDate: -1 }).toArray()

        // Get all rooms and room types in one query to avoid multiple database calls
        const rooms = await db.collection("rooms").find().toArray()
        const roomsMap = rooms.reduce(
          (map, room) => {
            map[room._id.toString()] = room
            return map
          },
          {} as Record<string, any>,
        )

        // Fix: Use Array.from instead of spread operator for Set
        const roomTypeIds = Array.from(new Set(rooms.map((room) => room.roomTypeId)))
        const roomTypes = await db
          .collection("roomTypes")
          .find({
            _id: { $in: roomTypeIds.map((id) => new ObjectId(id)) },
          })
          .toArray()

        const roomTypesMap = roomTypes.reduce(
          (map, type) => {
            map[type._id.toString()] = type
            return map
          },
          {} as Record<string, any>,
        )

        // Get all users in one query
        // Fix: Use Array.from instead of spread operator for Set
        const userIds = Array.from(new Set(reservations.filter((r) => r.userId).map((r) => r.userId)))
        const users = await db
          .collection("users")
          .find({
            _id: { $in: userIds.map((id) => new ObjectId(id as string)) },
          })
          .toArray()

        const usersMap = users.reduce(
          (map, user) => {
            map[user._id.toString()] = user
            return map
          },
          {} as Record<string, any>,
        )

        return reservations.map((reservation) => {
          const room = roomsMap[reservation.roomId]
          const roomType = room ? roomTypesMap[room.roomTypeId] : null
          const user = reservation.userId ? usersMap[reservation.userId] : null

          return {
            _id: reservation._id,
            roomId: reservation.roomId,
            userId: reservation.userId,
            guest: reservation.guest,
            checkInDate: reservation.checkInDate,
            checkOutDate: reservation.checkOutDate,
            adults: reservation.adults,
            children: reservation.children,
            totalPrice: reservation.totalPrice,
            status: reservation.status as ReservationStatus,
            paymentStatus: reservation.paymentStatus,
            paymentMethod: reservation.paymentMethod,
            specialRequests: reservation.specialRequests,
            createdAt: reservation.createdAt,
            updatedAt: reservation.updatedAt,
            confirmationCode: reservation.confirmationCode,
            room: {
              number: room ? room.number : "Unknown",
              roomType: roomType ? roomType.name : "Unknown",
            },
            user: user
              ? {
                  firstName: user.firstName,
                  lastName: user.lastName,
                  email: user.email,
                }
              : undefined,
          }
        })
      } finally {
        releaseConnection()
      }
    },
    300,
  ) // Caché por 5 minutos
}

// Initialize the database with sample reservations
export async function initializeReservations() {
  // This would be implemented for testing purposes
  // Not adding sample reservations by default as they would need to match available rooms
}

