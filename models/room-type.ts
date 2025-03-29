import { ObjectId } from "mongodb"
import { getDb, releaseConnection } from "@/lib/mongodb"
import { getCachedData, invalidateCache, invalidateCachePattern } from "@/lib/cache"

export interface RoomType {
  _id?: ObjectId
  name: string
  description: string
  basePrice: number
  capacity: number
  amenities: string[]
  images: string[]
  createdAt: Date
  updatedAt: Date
}

export async function createRoomType(roomTypeData: Omit<RoomType, "_id" | "createdAt" | "updatedAt">) {
  const db = await getDb()
  try {
    // Check if room type already exists
    const existingRoomType = await db.collection("roomTypes").findOne({ name: roomTypeData.name })
    if (existingRoomType) {
      throw new Error("Room type already exists")
    }

    // Create room type
    const newRoomType = {
      ...roomTypeData,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection("roomTypes").insertOne(newRoomType)

    // Invalidar caché relacionada con tipos de habitación
    await invalidateCachePattern("roomTypes:*")

    return { ...newRoomType, _id: result.insertedId }
  } finally {
    // Liberar la conexión
    releaseConnection()
  }
}

export async function getRoomTypeById(id: string) {
  return getCachedData(
    `roomType:${id}`,
    async () => {
      const db = await getDb()
      try {
        return await db.collection("roomTypes").findOne({ _id: new ObjectId(id) })
      } finally {
        releaseConnection()
      }
    },
    300,
  ) // Caché por 5 minutos
}

export async function updateRoomType(id: string, roomTypeData: Partial<RoomType>) {
  const db = await getDb()
  try {
    const updateData = {
      ...roomTypeData,
      updatedAt: new Date(),
    }

    const result = await db.collection("roomTypes").updateOne({ _id: new ObjectId(id) }, { $set: updateData })

    // Invalidar caché
    await invalidateCache(`roomType:${id}`)
    await invalidateCachePattern("roomTypes:*")

    return result.modifiedCount > 0
  } finally {
    releaseConnection()
  }
}

export async function deleteRoomType(id: string) {
  const db = await getDb()
  try {
    // Check if there are rooms using this room type
    const roomsUsingType = await db.collection("rooms").countDocuments({ roomType: id })
    if (roomsUsingType > 0) {
      throw new Error("Cannot delete room type that is in use by rooms")
    }

    const result = await db.collection("roomTypes").deleteOne({ _id: new ObjectId(id) })

    // Invalidar caché
    await invalidateCache(`roomType:${id}`)
    await invalidateCachePattern("roomTypes:*")

    return result.deletedCount > 0
  } finally {
    releaseConnection()
  }
}

export async function getAllRoomTypes() {
  return getCachedData(
    "roomTypes:all",
    async () => {
      const db = await getDb()
      try {
        return await db.collection("roomTypes").find().toArray()
      } finally {
        releaseConnection()
      }
    },
    300,
  ) // Caché por 5 minutos
}

// Initialize default room types if they don't exist
export async function initializeRoomTypes() {
  const db = await getDb()
  try {
    const defaultRoomTypes = [
      {
        name: "Standard",
        description: "Comfortable room with basic amenities",
        basePrice: 100,
        capacity: 2,
        amenities: ["Wi-Fi", "TV", "Air Conditioning", "Private Bathroom"],
        images: ["/placeholder.svg?height=300&width=500"],
      },
      {
        name: "Deluxe",
        description: "Spacious room with premium amenities",
        basePrice: 150,
        capacity: 2,
        amenities: ["Wi-Fi", "TV", "Air Conditioning", "Private Bathroom", "Mini Bar", "Room Service"],
        images: ["/placeholder.svg?height=300&width=500"],
      },
      {
        name: "Suite",
        description: "Luxury suite with separate living area",
        basePrice: 250,
        capacity: 4,
        amenities: [
          "Wi-Fi",
          "TV",
          "Air Conditioning",
          "Private Bathroom",
          "Mini Bar",
          "Room Service",
          "Living Room",
          "Jacuzzi",
        ],
        images: ["/placeholder.svg?height=300&width=500"],
      },
      {
        name: "Family",
        description: "Spacious room ideal for families",
        basePrice: 200,
        capacity: 4,
        amenities: ["Wi-Fi", "TV", "Air Conditioning", "Private Bathroom", "Mini Bar", "Extra Beds"],
        images: ["/placeholder.svg?height=300&width=500"],
      },
    ]

    for (const roomType of defaultRoomTypes) {
      const existingRoomType = await db.collection("roomTypes").findOne({ name: roomType.name })
      if (!existingRoomType) {
        await db.collection("roomTypes").insertOne({
          ...roomType,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      }
    }

    // Invalidar caché después de inicialización
    await invalidateCachePattern("roomTypes:*")
  } finally {
    releaseConnection()
  }
}

