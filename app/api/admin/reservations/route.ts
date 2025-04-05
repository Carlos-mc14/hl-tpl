import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { getCurrentUser } from "@/lib/session"
import { applyRateLimit } from "@/lib/rate-limiter"
import { handleApiError, ForbiddenError } from "@/lib/error-handler"
import { getCachedData } from "@/lib/cache"

// Obtener todas las reservaciones o filtradas por fecha
export async function GET(request: Request) {
  try {

    const user = await getCurrentUser()

    if (!user) {
      throw new ForbiddenError("Unauthorized")
    }

    // Verificar permisos
    const hasPermission = user.role === "Administrator" || user.permissions.includes("read:reservations")

    if (!hasPermission) {
      throw new ForbiddenError("Insufficient permissions")
    }

    // Obtener parámetros de consulta
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    // Construir la consulta
    let query: any = {}

    if (startDate && endDate) {
      query = {
        $or: [
          { checkInDate: { $gte: new Date(startDate), $lte: new Date(endDate) } },
          { checkOutDate: { $gte: new Date(startDate), $lte: new Date(endDate) } },
          {
            checkInDate: { $lte: new Date(startDate) },
            checkOutDate: { $gte: new Date(endDate) },
          },
        ],
      }
    }

    // Usar caché para mejorar el rendimiento
    const cacheKey = `reservations:${startDate || "all"}:${endDate || "all"}`

    const reservations = await getCachedData(
      cacheKey,
      async () => {
        const db = await getDb()

        // Obtener todas las reservaciones que coincidan con la consulta
        const reservations = await db.collection("reservations").find(query).sort({ checkInDate: 1 }).toArray()

        // Obtener todos los IDs de habitaciones
        const roomIds = reservations.map((r) => (r.roomId ? new ObjectId(r.roomId) : null)).filter((id) => id !== null)

        // Obtener todas las habitaciones en una sola consulta
        const rooms = roomIds.length
          ? await db
              .collection("rooms")
              .find({ _id: { $in: roomIds } })
              .toArray()
          : []

        // Crear un mapa de habitaciones por ID
        const roomsMap = rooms.reduce(
          (map, room) => {
            map[room._id.toString()] = room
            return map
          },
          {} as Record<string, any>,
        )

        // Obtener todos los IDs de tipos de habitación
        const roomTypeIds = rooms
          .map((r) => (r.roomTypeId ? new ObjectId(r.roomTypeId) : null))
          .filter((id) => id !== null)

        // Obtener todos los tipos de habitación en una sola consulta
        const roomTypes = roomTypeIds.length
          ? await db
              .collection("roomTypes")
              .find({ _id: { $in: roomTypeIds } })
              .toArray()
          : []

        // Crear un mapa de tipos de habitación por ID
        const roomTypesMap = roomTypes.reduce(
          (map, type) => {
            map[type._id.toString()] = type
            return map
          },
          {} as Record<string, any>,
        )

        // Recopilar todos los IDs de usuario (incluyendo checkedInBy y checkedOutBy)
        const userIds = new Set<string>()

        reservations.forEach((r) => {
          if (r.userId) userIds.add(r.userId)
          if (r.checkedInBy) userIds.add(r.checkedInBy)
          if (r.checkedOutBy) userIds.add(r.checkedOutBy)
        })

        // Convertir los IDs de string a ObjectId
        const userObjectIds = Array.from(userIds)
          .map((id) => {
            try {
              return new ObjectId(id)
            } catch (e) {
              console.error(`Invalid ObjectId: ${id}`)
              return null
            }
          })
          .filter((id): id is ObjectId => id !== null)

        // Obtener todos los usuarios en una sola consulta
        const users = userObjectIds.length
          ? await db
              .collection("users")
              .find({ _id: { $in: userObjectIds } })
              .toArray()
          : []

        // Crear un mapa de usuarios por ID
        const usersMap = users.reduce(
          (map, user) => {
            map[user._id.toString()] = user
            return map
          },
          {} as Record<string, any>,
        )

        // Enriquecer las reservaciones con información de habitación, tipo y usuario
        return reservations.map((reservation) => {
          const room = reservation.roomId ? roomsMap[reservation.roomId] : null
          const roomType = room && room.roomTypeId ? roomTypesMap[room.roomTypeId] : null
          const user = reservation.userId ? usersMap[reservation.userId] : null

          // Obtener información de los usuarios que realizaron check-in/check-out
          const checkedInByUser = reservation.checkedInBy ? usersMap[reservation.checkedInBy] : null
          const checkedOutByUser = reservation.checkedOutBy ? usersMap[reservation.checkedOutBy] : null

          return {
            ...reservation,
            room: room
              ? {
                  number: room.number,
                  roomType: roomType ? roomType.name : "Unknown",
                }
              : null,
            user: user
              ? {
                  firstName: user.firstName,
                  lastName: user.lastName,
                  email: user.email,
                }
              : null,
            checkedInByUser: checkedInByUser
              ? {
                  firstName: checkedInByUser.firstName,
                  lastName: checkedInByUser.lastName,
                  email: checkedInByUser.email,
                }
              : null,
            checkedOutByUser: checkedOutByUser
              ? {
                  firstName: checkedOutByUser.firstName,
                  lastName: checkedOutByUser.lastName,
                  email: checkedOutByUser.email,
                }
              : null,
          }
        })
      },
      60, // Caché por 1 minuto
    )

    return NextResponse.json(reservations)
  } catch (error) {
    return handleApiError(error, request, "reservations")
  }
}

