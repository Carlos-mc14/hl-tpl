import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { getReservationsByUser, getReservationsByEmail, getReservationWithDetailsById } from "@/models/reservation"

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Get reservations by user ID and by email (to catch reservations made before registration)
    const reservationsByUserId = await getReservationsByUser(user.id)
    const reservationsByEmail = await getReservationsByEmail(user.email)

    // Combine and deduplicate reservations
    const allReservations = [...reservationsByUserId]

    // Add reservations by email that aren't already included by user ID
    for (const emailRes of reservationsByEmail) {
      const isDuplicate = allReservations.some((userRes) => userRes._id.toString() === emailRes._id.toString())
      if (!isDuplicate) {
        allReservations.push(emailRes)
      }
    }

    // Get detailed information for each reservation
    const detailedReservations = await Promise.all(
      allReservations.map(async (reservation) => {
        const details = await getReservationWithDetailsById(reservation._id.toString())
        return details || reservation
      }),
    )

    // Sort by check-in date (newest first)
    detailedReservations.sort((a, b) => new Date(b.checkInDate).getTime() - new Date(a.checkInDate).getTime())

    // Return empty array if no reservations found (instead of error)
    return NextResponse.json(detailedReservations)
  } catch (error: any) {
    console.error("Error fetching user reservations:", error)
    // Return empty array instead of error for better UX
    return NextResponse.json([])
  }
}

