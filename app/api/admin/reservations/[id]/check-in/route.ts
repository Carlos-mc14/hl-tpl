import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { ObjectId } from "mongodb"
import { getCurrentUser } from "@/lib/session"

// Realizar check-in de una reserva
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Verificar permisos
    const hasPermission = user.role === "Administrator" || user.permissions.includes("manage:reservations")

    if (!hasPermission) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const { id } = params

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid reservation ID format" }, { status: 400 })
    }

    const db = await getDb()

    // Obtener la reserva
    const reservation = await db.collection("reservations").findOne({ _id: new ObjectId(id) })

    if (!reservation) {
      return NextResponse.json({ message: "Reservation not found" }, { status: 404 })
    }

    // Verificar que la reserva esté en estado "Confirmed"
    if (reservation.status !== "Confirmed") {
      return NextResponse.json(
        {
          message: "Cannot check-in a reservation that is not in 'Confirmed' status",
        },
        { status: 400 },
      )
    }

    // Actualizar el estado de la reserva a "Checked-in"
    await db.collection("reservations").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: "Checked-in",
          updatedAt: new Date(),
        },
      },
    )

    // Si hay una habitación asignada, actualizar su estado a "Occupied"
    if (reservation.roomId) {
      await db.collection("rooms").updateOne(
        { _id: new ObjectId(reservation.roomId) },
        {
          $set: {
            status: "Occupied",
            updatedAt: new Date(),
          },
        },
      )
    }

    return NextResponse.json({
      message: "Check-in completed successfully",
      reservationId: id,
    })
  } catch (error) {
    console.error("Error al realizar check-in:", error)
    return NextResponse.json({ message: "Error al realizar check-in" }, { status: 500 })
  }
}

