import { NextResponse } from "next/server"
import { createRoomType, getAllRoomTypes } from "@/models/room-type"
import { checkPermission } from "@/lib/permissions"
import { getCurrentUser } from "@/lib/session"

// GET all room types
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

    const roomTypes = await getAllRoomTypes()

    return NextResponse.json(roomTypes)
  } catch (error: any) {
    console.error("Get room types error:", error)
    return NextResponse.json(
      { message: error.message || "An error occurred while fetching room types" },
      { status: 500 },
    )
  }
}

// POST create new room type
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
    const { name, description, basePrice, capacity, amenities, images } = body

    // Validate input
    if (!name || !description || basePrice === undefined || capacity === undefined) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
    }

    const newRoomType = await createRoomType({
      name,
      description,
      basePrice,
      capacity,
      amenities: amenities || [],
      images: images || [],
    })

    return NextResponse.json(newRoomType, { status: 201 })
  } catch (error: any) {
    console.error("Create room type error:", error)
    return NextResponse.json(
      { message: error.message || "An error occurred while creating room type" },
      { status: 500 },
    )
  }
}

