import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { getCurrentUser } from "@/lib/session"

// Obtener reservas activas para una habitación específica
export async function GET(request: Request, { params }: { params: { roomId: string } }) {
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

    const { roomId } = params

    if (!ObjectId.isValid(roomId)) {
      return NextResponse.json({ message: "Invalid room ID format" }, { status: 400 })
    }

    const db = await getDb()

    // Obtener la fecha actual
    const currentDate = new Date()

    // Buscar reservas activas para esta habitación
    // Una reserva activa es aquella que:
    // 1. Tiene el estado "Pending", "Confirmed", "Checked-in"
    // 2. La fecha de check-out es mayor o igual a la fecha actual
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

    return NextResponse.json(reservationsWithNights)
  } catch (error) {
    console.error("Error al obtener reservas por habitación:", error)
    return NextResponse.json({ message: "Error al obtener reservas por habitación" }, { status: 500 })
  }
}

