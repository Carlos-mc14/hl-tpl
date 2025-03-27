import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { ObjectId } from "mongodb"

// Obtener reservaciones con filtros de fecha
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Verificar permisos
    const hasPermission =
      user.role === "Administrator" ||
      user.permissions.includes("manage:reservations") ||
      user.permissions.includes("view:reservations")

    if (!hasPermission) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    // Obtener parámetros de consulta
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const status = searchParams.get("status")

    const db = await getDb()

    // Construir el filtro de consulta
    const filter: any = {}

    // Filtrar por fechas si se proporcionan
    if (startDate || endDate) {
      filter.$or = []

      // Caso 1: Check-in está dentro del rango de fechas
      if (startDate && endDate) {
        filter.$or.push({
          checkInDate: {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
          },
        })
      } else if (startDate) {
        filter.$or.push({
          checkInDate: { $gte: new Date(startDate) },
        })
      } else if (endDate) {
        filter.$or.push({
          checkInDate: { $lte: new Date(endDate) },
        })
      }

      // Caso 2: Check-out está dentro del rango de fechas
      if (startDate && endDate) {
        filter.$or.push({
          checkOutDate: {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
          },
        })
      } else if (startDate) {
        filter.$or.push({
          checkOutDate: { $gte: new Date(startDate) },
        })
      } else if (endDate) {
        filter.$or.push({
          checkOutDate: { $lte: new Date(endDate) },
        })
      }

      // Caso 3: La estancia abarca todo el rango de fechas
      if (startDate && endDate) {
        filter.$or.push({
          checkInDate: { $lte: new Date(startDate) },
          checkOutDate: { $gte: new Date(endDate) },
        })
      }
    }

    // Filtrar por estado si se proporciona
    if (status) {
      filter.status = status
    }

    // Obtener las reservaciones
    const reservations = await db.collection("reservations").find(filter).sort({ checkInDate: 1 }).toArray()

    // Obtener información adicional para cada reserva
    const reservationsWithDetails = await Promise.all(
      reservations.map(async (reservation) => {
        // Obtener información de la habitación
        let roomInfo = null
        if (reservation.roomId) {
          const room = await db.collection("rooms").findOne({ _id: new ObjectId(reservation.roomId) })
          if (room) {
            // Obtener el tipo de habitación
            const roomType = await db.collection("roomTypes").findOne({ _id: new ObjectId(room.roomTypeId) })
            roomInfo = {
              number: room.number,
              roomType: roomType ? roomType.name : "Desconocido",
            }
          }
        }

        return {
          ...reservation,
          room: roomInfo,
        }
      }),
    )

    return NextResponse.json(reservationsWithDetails)
  } catch (error) {
    console.error("Error al obtener reservaciones:", error)
    return NextResponse.json({ message: "Error al obtener reservaciones" }, { status: 500 })
  }
}

