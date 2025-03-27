import { NextResponse } from "next/server"
import { getRoomTypeById, updateRoomType, deleteRoomType } from "@/models/room-type"
import { checkPermission } from "@/lib/permissions"
import { getCurrentUser } from "@/lib/session"

// GET room type by ID
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const hasPermission = await checkPermission(user.id, "view:reservations")

    if (!hasPermission) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    // Extract the ID from params to avoid the warning
    const roomTypeId = params.id
    const roomType = await getRoomTypeById(roomTypeId)

    if (!roomType) {
      return NextResponse.json({ message: "Room type not found" }, { status: 404 })
    }

    return NextResponse.json(roomType)
  } catch (error: any) {
    console.error("Get room type error:", error)
    return NextResponse.json(
      { message: error.message || "An error occurred while fetching room type" },
      { status: 500 },
    )
  }
}

// PUT update room type
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const hasPermission = await checkPermission(user.id, "manage:reservations")

    if (!hasPermission) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    // Extract the ID from params to avoid the warning
    const roomTypeId = params.id
    const roomType = await getRoomTypeById(roomTypeId)

    if (!roomType) {
      return NextResponse.json({ message: "Room type not found" }, { status: 404 })
    }

    const body = await request.json()
    const success = await updateRoomType(roomTypeId, body)

    if (!success) {
      return NextResponse.json({ message: "Room type not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Room type updated successfully" }, { status: 200 })
  } catch (error: any) {
    console.error("Update room type error:", error)
    return NextResponse.json(
      { message: error.message || "An error occurred while updating room type" },
      { status: 500 },
    )
  }
}

// DELETE room type
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const hasPermission = await checkPermission(user.id, "manage:reservations")

    if (!hasPermission) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    // Extract the ID from params to avoid the warning
    const roomTypeId = params.id
    const roomType = await getRoomTypeById(roomTypeId)

    if (!roomType) {
      return NextResponse.json({ message: "Room type not found" }, { status: 404 })
    }

    const success = await deleteRoomType(roomTypeId)

    if (!success) {
      return NextResponse.json({ message: "Room type not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Room type deleted successfully" }, { status: 200 })
  } catch (error: any) {
    console.error("Delete room type error:", error)
    return NextResponse.json(
      { message: error.message || "An error occurred while deleting room type" },
      { status: 500 },
    )
  }
}

