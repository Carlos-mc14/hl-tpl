import { ObjectId } from "mongodb"
import { getDb, releaseConnection } from "@/lib/mongodb"
import { getCachedData, invalidateCache, invalidateCachePattern } from "@/lib/cache"

export type ServiceStatus = "Pending" | "In Progress" | "Completed" | "Cancelled"
export type ServiceType = "Room Service" | "Extra Hours" | "Cleaning" | "Maintenance" | "Other"

export interface ExtraService {
  _id?: ObjectId
  reservationId: string
  serviceType: ServiceType
  description: string
  status: ServiceStatus
  price: number
  requestedAt: Date
  completedAt?: Date
  notes?: string
  requestedBy?: string // userId of the person who requested the service
  handledBy?: string // userId of the staff who handled the service
  createdAt: Date
  updatedAt: Date
}

export async function createExtraService(
  serviceData: Omit<ExtraService, "_id" | "createdAt" | "updatedAt" | "status" | "requestedAt">,
): Promise<ExtraService> {
  const db = await getDb()
  try {
    const newService = {
      ...serviceData,
      status: "Pending" as ServiceStatus,
      requestedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection("extraServices").insertOne(newService)

    // Invalidate cache
    await invalidateCachePattern(`extraServices:reservation:${serviceData.reservationId}*`)
    await invalidateCachePattern("extraServices:*")

    return { ...newService, _id: result.insertedId }
  } finally {
    releaseConnection()
  }
}

export async function getExtraServiceById(id: string): Promise<ExtraService | null> {
  return getCachedData(
    `extraService:${id}`,
    async () => {
      const db = await getDb()
      try {
        if (!ObjectId.isValid(id)) {
          console.error(`Invalid ObjectId format: ${id}`)
          return null
        }
        return (await db.collection("extraServices").findOne({ _id: new ObjectId(id) })) as ExtraService | null
      } finally {
        releaseConnection()
      }
    },
    300, // Cache for 5 minutes
  )
}

export async function getExtraServicesByReservationId(reservationId: string): Promise<ExtraService[]> {
  return getCachedData(
    `extraServices:reservation:${reservationId}`,
    async () => {
      const db = await getDb()
      try {
        return (await db.collection("extraServices").find({ reservationId }).sort({ requestedAt: -1 }).toArray()) as ExtraService[]
      } finally {
        releaseConnection()
      }
    },
    300, // Cache for 5 minutes
  )
}

export async function getExtraServicesByUserId(userId: string): Promise<ExtraService[]> {
  return getCachedData(
    `extraServices:user:${userId}`,
    async () => {
      const db = await getDb()
      try {
        return (await db.collection("extraServices").find({ requestedBy: userId }).sort({ requestedAt: -1 }).toArray()) as ExtraService[]
      } finally {
        releaseConnection()
      }
    },
    300, // Cache for 5 minutes
  )
}

export async function getAllExtraServices(): Promise<ExtraService[]> {
  return getCachedData(
    "extraServices:all",
    async () => {
      const db = await getDb()
      try {
        const services = await db.collection("extraServices").find().sort({ requestedAt: -1 }).toArray()
        return services.map((service) => ({
          ...service,
          requestedAt: new Date(service.requestedAt),
          createdAt: new Date(service.createdAt),
          updatedAt: new Date(service.updatedAt),
          ...(service.completedAt && { completedAt: new Date(service.completedAt) }),
        })) as ExtraService[]
      } finally {
        releaseConnection()
      }
    },
    300, // Cache for 5 minutes
  )
}

export async function updateExtraService(id: string, serviceData: Partial<ExtraService>): Promise<boolean> {
  const db = await getDb()
  try {
    const service = await getExtraServiceById(id)
    if (!service) {
      throw new Error("Service not found")
    }

    // If status is being updated to Completed, set completedAt
    const updateData: Partial<ExtraService> & { updatedAt: Date } = {
      ...serviceData,
      updatedAt: new Date(),
    }

    if (serviceData.status === "Completed" && !service.completedAt) {
      updateData.completedAt = new Date()
    }

    const result = await db.collection("extraServices").updateOne({ _id: new ObjectId(id) }, { $set: updateData })

    // Invalidate cache
    await invalidateCache(`extraService:${id}`)
    await invalidateCachePattern(`extraServices:reservation:${service.reservationId}*`)
    if (service.requestedBy) {
      await invalidateCachePattern(`extraServices:user:${service.requestedBy}*`)
    }
    await invalidateCachePattern("extraServices:*")

    return result.modifiedCount > 0
  } finally {
    releaseConnection()
  }
}

export async function deleteExtraService(id: string): Promise<boolean> {
  const db = await getDb()
  try {
    const service = await getExtraServiceById(id)
    if (!service) {
      throw new Error("Service not found")
    }

    // Only allow deletion of pending services
    if (service.status !== "Pending" && service.status !== "Cancelled") {
      throw new Error("Only pending or cancelled services can be deleted")
    }

    const result = await db.collection("extraServices").deleteOne({ _id: new ObjectId(id) })

    // Invalidate cache
    await invalidateCache(`extraService:${id}`)
    await invalidateCachePattern(`extraServices:reservation:${service.reservationId}*`)
    if (service.requestedBy) {
      await invalidateCachePattern(`extraServices:user:${service.requestedBy}*`)
    }
    await invalidateCachePattern("extraServices:*")

    return result.deletedCount > 0
  } finally {
    releaseConnection()
  }
}

export async function getExtraServicesByStatus(status: ServiceStatus): Promise<ExtraService[]> {
  return getCachedData(
    `extraServices:status:${status}`,
    async () => {
      const db = await getDb()
      try {
        const services = await db.collection("extraServices").find({ status }).sort({ requestedAt: -1 }).toArray()
        return services.map((service) => ({
          ...service,
          requestedAt: new Date(service.requestedAt),
          createdAt: new Date(service.createdAt),
          updatedAt: new Date(service.updatedAt),
          ...(service.completedAt && { completedAt: new Date(service.completedAt) }),
        })) as ExtraService[]
      } finally {
        releaseConnection()
      }
    },
    300, // Cache for 5 minutes
  )
}

export interface ExtraServiceWithDetails extends ExtraService {
  reservation: {
    confirmationCode: string
    roomNumber: string
    guestName: string
    checkInDate: Date
    checkOutDate: Date
  }
  requestedByUser?: {
    firstName: string
    lastName: string
    email: string
  }
  handledByUser?: {
    firstName: string
    lastName: string
    email: string
  }
}

export async function getExtraServicesWithDetails(): Promise<ExtraServiceWithDetails[]> {
  return getCachedData(
    "extraServicesWithDetails:all",
    async () => {
      const db = await getDb()
      try {
        const services = await db.collection("extraServices").find().sort({ requestedAt: -1 }).toArray()

        // Get all reservation IDs
        const reservationIds = Array.from(new Set(services.map((service) => service.reservationId)))

        // Get all reservations in one query
        const reservations = await db
          .collection("reservations")
          .find({
            _id: { $in: reservationIds.map((id) => new ObjectId(id)) },
          })
          .toArray()

        const reservationsMap = reservations.reduce(
          (map, reservation) => {
            map[reservation._id.toString()] = reservation
            return map
          },
          {} as Record<string, any>,
        )

        // Get all room IDs
        const roomIds = Array.from(new Set(reservations.map((reservation) => reservation.roomId).filter(Boolean)))

        // Get all rooms in one query
        const rooms = await db
          .collection("rooms")
          .find({
            _id: { $in: roomIds.map((id) => new ObjectId(id)) },
          })
          .toArray()

        const roomsMap = rooms.reduce(
          (map, room) => {
            map[room._id.toString()] = room
            return map
          },
          {} as Record<string, any>,
        )

        // Get all user IDs (requestedBy and handledBy)
        const userIds = new Set<string>()
        services.forEach((service) => {
          if (service.requestedBy) userIds.add(service.requestedBy)
          if (service.handledBy) userIds.add(service.handledBy)
        })

        // Get all users in one query
        const users = await db
          .collection("users")
          .find({
            _id: { $in: Array.from(userIds).map((id) => new ObjectId(id)) },
          })
          .toArray()

        const usersMap = users.reduce(
          (map, user) => {
            map[user._id.toString()] = user
            return map
          },
          {} as Record<string, any>,
        )

        return services.map((service) => {
          const reservation = reservationsMap[service.reservationId]
          const room = reservation ? roomsMap[reservation.roomId] : null
          const requestedByUser = service.requestedBy ? usersMap[service.requestedBy] : null
          const handledByUser = service.handledBy ? usersMap[service.handledBy] : null

          const baseService = service as ExtraService;
          return {
            ...baseService,
            reservation: reservation
              ? {
                  confirmationCode: reservation.confirmationCode,
                  roomNumber: room ? room.number : "Unknown",
                  guestName: `${reservation.guest.firstName} ${reservation.guest.lastName}`,
                  checkInDate: reservation.checkInDate,
                  checkOutDate: reservation.checkOutDate,
                }
              : {
                  confirmationCode: "Unknown",
                  roomNumber: "Unknown",
                  guestName: "Unknown",
                  checkInDate: new Date(),
                  checkOutDate: new Date(),
                },
            requestedByUser: requestedByUser
              ? {
                  firstName: requestedByUser.firstName,
                  lastName: requestedByUser.lastName,
                  email: requestedByUser.email,
                }
              : undefined,
            handledByUser: handledByUser
              ? {
                  firstName: handledByUser.firstName,
                  lastName: handledByUser.lastName,
                  email: handledByUser.email,
                }
              : undefined,
          }
        })
      } finally {
        releaseConnection()
      }
    },
    300, // Cache for 5 minutes
  )
}

export async function getExtraServicesWithDetailsByReservationId(
  reservationId: string,
): Promise<ExtraServiceWithDetails[]> {
  return getCachedData(
    `extraServicesWithDetails:reservation:${reservationId}`,
    async () => {
      const db = await getDb()
      try {
        const services = await db
          .collection("extraServices")
          .find({ reservationId })
          .sort({ requestedAt: -1 })
          .toArray()

        if (services.length === 0) return []

        // Get the reservation
        const reservation = await db.collection("reservations").findOne({ _id: new ObjectId(reservationId) })
        if (!reservation) return services as ExtraServiceWithDetails[]

        // Get the room
        const room = reservation.roomId
          ? await db.collection("rooms").findOne({ _id: new ObjectId(reservation.roomId) })
          : null

        // Get all user IDs (requestedBy and handledBy)
        const userIds = new Set<string>()
        services.forEach((service) => {
          if (service.requestedBy) userIds.add(service.requestedBy)
          if (service.handledBy) userIds.add(service.handledBy)
        })

        // Get all users in one query if there are any user IDs
        const usersMap: Record<string, any> = {}
        if (userIds.size > 0) {
          const users = await db
            .collection("users")
            .find({
              _id: { $in: Array.from(userIds).map((id) => new ObjectId(id)) },
            })
            .toArray()

          users.forEach((user) => {
            usersMap[user._id.toString()] = user
          })
        }

        return services.map((service) => {
          const requestedByUser = service.requestedBy ? usersMap[service.requestedBy] : null
          const handledByUser = service.handledBy ? usersMap[service.handledBy] : null

          const extraService: ExtraService = {
            _id: service._id,
            reservationId: service.reservationId,
            serviceType: service.serviceType,
            description: service.description,
            status: service.status,
            price: service.price,
            requestedAt: service.requestedAt,
            completedAt: service.completedAt,
            notes: service.notes,
            requestedBy: service.requestedBy,
            handledBy: service.handledBy,
            createdAt: service.createdAt,
            updatedAt: service.updatedAt,
          };

          return {
            ...extraService,
            reservation: {
              confirmationCode: reservation.confirmationCode,
              roomNumber: room ? room.number : "Unknown",
              guestName: `${reservation.guest.firstName} ${reservation.guest.lastName}`,
              checkInDate: reservation.checkInDate,
              checkOutDate: reservation.checkOutDate,
            },
            requestedByUser: requestedByUser
              ? {
                  firstName: requestedByUser.firstName,
                  lastName: requestedByUser.lastName,
                  email: requestedByUser.email,
                }
              : undefined,
            handledByUser: handledByUser
              ? {
                  firstName: handledByUser.firstName,
                  lastName: handledByUser.lastName,
                  email: handledByUser.email,
                }
              : undefined,
          }
        })
      } finally {
        releaseConnection()
      }
    },
    300, // Cache for 5 minutes
  )
}

