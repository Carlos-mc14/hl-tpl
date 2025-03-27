import { NextResponse } from "next/server"
import { createRoom, getAllRooms, getRoomsWithType } from "@/models/room"
import { checkPermission } from "@/lib/permissions"
import { getCurrentUser } from "@/lib/session"

// GET all rooms
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const hasPermission = await checkPermission(user.id, "view:reservations")

    if (!hasPermission) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const withType = searchParams.get("withType") === "true"

    // Return rooms with or without room type details
    const rooms = withType ? await getRoomsWithType() : await getAllRooms()

    return NextResponse.json(rooms)
  } catch (error: any) {
    console.error("Get rooms error:", error)
    return NextResponse.json({ message: error.message || "An error occurred while fetching rooms" }, { status: 500 })
  }
}

// POST create new room
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const hasPermission = await checkPermission(user.id, "manage:reservations")

    if (!hasPermission) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { number, floor, roomTypeId, status, notes } = body

    // Validate input
    if (!number || !floor || !roomTypeId || !status) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
    }

    const newRoom = await createRoom({
      number,
      floor,
      roomTypeId,
      status,
      notes,
    })

    return NextResponse.json(newRoom, { status: 201 })
  } catch (error: any) {
    console.error("Create room error:", error)
    return NextResponse.json({ message: error.message || "An error occurred while creating room" }, { status: 500 })
  }
}

