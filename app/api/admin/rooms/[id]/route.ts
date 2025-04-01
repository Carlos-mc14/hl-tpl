import { NextResponse } from "next/server"
import { getRoomById, updateRoom, deleteRoom, getRoomWithTypeById } from "@/models/room"
import { checkPermission } from "@/lib/permissions"
import { getCurrentUser } from "@/lib/session"

// GET room by ID
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
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

    // Return room with or without room type details
    const room = withType ? await getRoomWithTypeById(id) : await getRoomById(id)

    if (!room) {
      return NextResponse.json({ message: "Room not found" }, { status: 404 })
    }

    return NextResponse.json(room)
  } catch (error: any) {
    console.error("Get room error:", error)
    return NextResponse.json({ message: error.message || "An error occurred while fetching room" }, { status: 500 })
  }
}

// PUT update room
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const hasPermission = await checkPermission(user.id, "manage:reservations")

    if (!hasPermission) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const room = await getRoomById(id)

    if (!room) {
      return NextResponse.json({ message: "Room not found" }, { status: 404 })
    }

    const body = await request.json()
    const success = await updateRoom(id, body)

    if (!success) {
      return NextResponse.json({ message: "Room not found" }, { status: 404 })
    }

    // Obtener la habitación actualizada para devolverla en la respuesta
    const updatedRoom = await getRoomWithTypeById(id)

    return NextResponse.json(
      {
        message: "Room updated successfully",
        room: updatedRoom,
      },
      { status: 200 },
    )
  } catch (error: any) {
    console.error("Update room error:", error)
    return NextResponse.json({ message: error.message || "An error occurred while updating room" }, { status: 500 })
  }
}

// DELETE room
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const hasPermission = await checkPermission(user.id, "manage:reservations")

    if (!hasPermission) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const room = await getRoomById(id)

    if (!room) {
      return NextResponse.json({ message: "Room not found" }, { status: 404 })
    }

    const success = await deleteRoom(id)

    if (!success) {
      return NextResponse.json({ message: "Room not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Room deleted successfully" }, { status: 200 })
  } catch (error: any) {
    console.error("Delete room error:", error)
    return NextResponse.json({ message: error.message || "An error occurred while deleting room" }, { status: 500 })
  }
}

