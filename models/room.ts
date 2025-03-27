import { ObjectId } from "mongodb"
import { getDb, releaseConnection } from "@/lib/db"
import { getRoomTypeById } from "./room-type"
import { getCachedData, invalidateCache, invalidateCachePattern } from "@/lib/cache"

export type RoomStatus = "Available" | "Occupied" | "Maintenance" | "Cleaning" | "Reserved"

export interface Room {
  _id?: ObjectId
  number: string
  floor: string
  roomTypeId: string
  status: RoomStatus
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface RoomWithType extends Room {
  roomType: {
    name: string
    basePrice: number
    capacity: number
  }
}

export async function createRoom(roomData: Omit<Room, "_id" | "createdAt" | "updatedAt">) {
  const db = await getDb()
  try {
    // Check if room already exists
    const existingRoom = await db.collection("rooms").findOne({ number: roomData.number })
    if (existingRoom) {
      throw new Error("Room number already exists")
    }

    // Verify room type exists
    const roomType = await getRoomTypeById(roomData.roomTypeId)
    if (!roomType) {
      throw new Error("Room type not found")
    }

    // Create room
    const newRoom = {
      ...roomData,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection("rooms").insertOne(newRoom)

    // Invalidar caché
    await invalidateCachePattern("rooms:*")

    return { ...newRoom, _id: result.insertedId }
  } finally {
    releaseConnection()
  }
}

export async function getRoomById(id: string) {
  return getCachedData(
    `room:${id}`,
    async () => {
      const db = await getDb()
      try {
        return await db.collection("rooms").findOne({ _id: new ObjectId(id) })
      } finally {
        releaseConnection()
      }
    },
    300,
  ) // Caché por 5 minutos
}

// Fix the getRoomWithTypeById function
export async function getRoomWithTypeById(id: string): Promise<RoomWithType | null> {
  return getCachedData(
    `roomWithType:${id}`,
    async () => {
      const db = await getDb()
      try {
        const room = await db.collection("rooms").findOne({ _id: new ObjectId(id) })

        if (!room) return null

        const roomType = await getRoomTypeById(room.roomTypeId)

        if (!roomType) return null

        return {
          _id: room._id,
          number: room.number,
          floor: room.floor,
          roomTypeId: room.roomTypeId,
          status: room.status as RoomStatus,
          notes: room.notes,
          createdAt: room.createdAt,
          updatedAt: room.updatedAt,
          roomType: {
            name: roomType.name,
            basePrice: roomType.basePrice,
            capacity: roomType.capacity,
          },
        }
      } finally {
        releaseConnection()
      }
    },
    300,
  ) // Caché por 5 minutos
}

// Fix the getRoomsWithType function
export async function getRoomsWithType(): Promise<RoomWithType[]> {
  return getCachedData(
    "roomsWithType:all",
    async () => {
      const db = await getDb()
      try {
        const rooms = await db.collection("rooms").find().toArray()

        // Get all room types in one query to avoid multiple database calls
        const roomTypes = await db.collection("roomTypes").find().toArray()
        const roomTypesMap = roomTypes.reduce(
          (map, type) => {
            map[type._id.toString()] = type
            return map
          },
          {} as Record<string, any>,
        )

        return rooms.map((room) => {
          const roomType = roomTypesMap[room.roomTypeId]
          return {
            _id: room._id,
            number: room.number,
            floor: room.floor,
            roomTypeId: room.roomTypeId,
            status: room.status as RoomStatus,
            notes: room.notes,
            createdAt: room.createdAt,
            updatedAt: room.updatedAt,
            roomType: roomType
              ? {
                  name: roomType.name,
                  basePrice: roomType.basePrice,
                  capacity: roomType.capacity,
                }
              : {
                  name: "Unknown",
                  basePrice: 0,
                  capacity: 0,
                },
          }
        })
      } finally {
        releaseConnection()
      }
    },
    300,
  ) // Caché por 5 minutos
}

export async function updateRoom(id: string, roomData: Partial<Room>) {
  const db = await getDb()
  try {
    // If updating room type, verify it exists
    if (roomData.roomTypeId) {
      const roomType = await getRoomTypeById(roomData.roomTypeId)
      if (!roomType) {
        throw new Error("Room type not found")
      }
    }

    const updateData = {
      ...roomData,
      updatedAt: new Date(),
    }

    const result = await db.collection("rooms").updateOne({ _id: new ObjectId(id) }, { $set: updateData })

    // Invalidar caché
    await invalidateCache(`room:${id}`)
    await invalidateCache(`roomWithType:${id}`)
    await invalidateCachePattern("rooms:*")

    return result.modifiedCount > 0
  } finally {
    releaseConnection()
  }
}

export async function deleteRoom(id: string) {
  const db = await getDb()
  try {
    // Check if there are reservations for this room
    const reservationsForRoom = await db.collection("reservations").countDocuments({ roomId: id })
    if (reservationsForRoom > 0) {
      throw new Error("Cannot delete room that has reservations")
    }

    const result = await db.collection("rooms").deleteOne({ _id: new ObjectId(id) })

    // Invalidar caché
    await invalidateCache(`room:${id}`)
    await invalidateCache(`roomWithType:${id}`)
    await invalidateCachePattern("rooms:*")

    return result.deletedCount > 0
  } finally {
    releaseConnection()
  }
}

export async function getRoomsByStatus(status: RoomStatus) {
  return getCachedData(
    `rooms:status:${status}`,
    async () => {
      const db = await getDb()
      try {
        return await db.collection("rooms").find({ status }).toArray()
      } finally {
        releaseConnection()
      }
    },
    300,
  ) // Caché por 5 minutos
}

export async function getRoomsByType(roomTypeId: string) {
  return getCachedData(
    `rooms:type:${roomTypeId}`,
    async () => {
      const db = await getDb()
      try {
        return await db.collection("rooms").find({ roomTypeId }).toArray()
      } finally {
        releaseConnection()
      }
    },
    300,
  ) // Caché por 5 minutos
}

export async function updateRoomStatus(id: string, status: RoomStatus, notes?: string) {
  const db = await getDb()
  try {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    }

    if (notes !== undefined) {
      updateData.notes = notes
    }

    const result = await db.collection("rooms").updateOne({ _id: new ObjectId(id) }, { $set: updateData })

    // Invalidar caché
    await invalidateCache(`room:${id}`)
    await invalidateCache(`roomWithType:${id}`)
    await invalidateCachePattern("rooms:status:*")
    await invalidateCachePattern("rooms:*")

    return result.modifiedCount > 0
  } finally {
    releaseConnection()
  }
}

export async function getAllRooms() {
  return getCachedData(
    "rooms:all",
    async () => {
      const db = await getDb()
      try {
        return await db.collection("rooms").find().toArray()
      } finally {
        releaseConnection()
      }
    },
    300,
  ) // Caché por 5 minutos
}

// Initialize some default rooms if they don't exist
export async function initializeRooms() {
  const db = await getDb()
  try {
    // Get room types
    const roomTypes = await db.collection("roomTypes").find().toArray()
    if (roomTypes.length === 0) return // Can't create rooms without room types

    const roomTypeMap = roomTypes.reduce(
      (map, type) => {
        map[type.name] = type._id.toString()
        return map
      },
      {} as Record<string, string>,
    )

    // Sample rooms data
    const sampleRooms = [
      // First floor - Standard rooms
      { number: "101", floor: "1", roomTypeId: roomTypeMap["Standard"], status: "Available" },
      { number: "102", floor: "1", roomTypeId: roomTypeMap["Standard"], status: "Available" },
      { number: "103", floor: "1", roomTypeId: roomTypeMap["Standard"], status: "Available" },
      { number: "104", floor: "1", roomTypeId: roomTypeMap["Standard"], status: "Maintenance", notes: "Bathroom leak" },

      // First floor - Deluxe rooms
      { number: "105", floor: "1", roomTypeId: roomTypeMap["Deluxe"], status: "Available" },
      { number: "106", floor: "1", roomTypeId: roomTypeMap["Deluxe"], status: "Available" },

      // Second floor - Deluxe rooms
      { number: "201", floor: "2", roomTypeId: roomTypeMap["Deluxe"], status: "Available" },
      { number: "202", floor: "2", roomTypeId: roomTypeMap["Deluxe"], status: "Available" },
      { number: "203", floor: "2", roomTypeId: roomTypeMap["Deluxe"], status: "Cleaning" },

      // Second floor - Family rooms
      { number: "204", floor: "2", roomTypeId: roomTypeMap["Family"], status: "Available" },
      { number: "205", floor: "2", roomTypeId: roomTypeMap["Family"], status: "Available" },

      // Third floor - Suites
      { number: "301", floor: "3", roomTypeId: roomTypeMap["Suite"], status: "Available" },
      { number: "302", floor: "3", roomTypeId: roomTypeMap["Suite"], status: "Available" },
      { number: "303", floor: "3", roomTypeId: roomTypeMap["Suite"], status: "Reserved" },
    ]

    for (const roomData of sampleRooms) {
      const existingRoom = await db.collection("rooms").findOne({ number: roomData.number })
      if (!existingRoom) {
        await db.collection("rooms").insertOne({
          ...roomData,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      }
    }

    // Invalidar caché después de inicialización
    await invalidateCachePattern("rooms:*")
  } finally {
    releaseConnection()
  }
}

