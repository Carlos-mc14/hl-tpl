import { NextResponse, type NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { getAllServiceItems, createServiceItem, getAllServiceItemsWithCategories } from "@/models/service-item"
import { applyRateLimit } from "@/lib/rate-limiter"

// GET - Get all service items (admin only)
export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    // Get current user
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Check if user has permission to view service items
    const hasPermission =
      user.role === "Administrator" ||
      user.permissions.includes("manage:services") ||
      user.permissions.includes("view:services")

    if (!hasPermission) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    // Check if we should include category details
    const url = new URL(request.url)
    const includeCategories = url.searchParams.get("includeCategories") === "true"

    const items = includeCategories ? await getAllServiceItemsWithCategories() : await getAllServiceItems()

    return NextResponse.json(items)
  } catch (error: any) {
    console.error("Error fetching service items:", error)
    return NextResponse.json({ message: error.message || "Error fetching service items" }, { status: 500 })
  }
}

// POST - Create a new service item (admin only)
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    // Get current user
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Check if user has permission to create service items
    const hasPermission = user.role === "Administrator" || user.permissions.includes("manage:services")

    if (!hasPermission) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { categoryId, name, description, price, isActive, displayOrder } = body

    if (!categoryId || !name) {
      return NextResponse.json({ message: "Category ID and name are required" }, { status: 400 })
    }

    // Create the service item
    const item = await createServiceItem({
      categoryId,
      name,
      description: description || "",
      price: price || 0,
      isActive: isActive !== undefined ? isActive : true,
      displayOrder: displayOrder || 0,
    })

    return NextResponse.json(item)
  } catch (error: any) {
    console.error("Error creating service item:", error)
    return NextResponse.json({ message: error.message || "Error creating service item" }, { status: 500 })
  }
}

