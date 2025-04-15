import { NextResponse, type NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { getAllServiceCategories, createServiceCategory } from "@/models/service-category"
import { applyRateLimit } from "@/lib/rate-limiter"

// GET - Get all service categories (admin only)
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

    // Check if user has permission to view service categories
    const hasPermission =
      user.role === "Administrator" ||
      user.permissions.includes("manage:services") ||
      user.permissions.includes("view:services")

    if (!hasPermission) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const categories = await getAllServiceCategories()
    return NextResponse.json(categories)
  } catch (error: any) {
    console.error("Error fetching service categories:", error)
    return NextResponse.json({ message: error.message || "Error fetching service categories" }, { status: 500 })
  }
}

// POST - Create a new service category (admin only)
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

    // Check if user has permission to create service categories
    const hasPermission = user.role === "Administrator" || user.permissions.includes("manage:services")

    if (!hasPermission) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, icon, isActive, displayOrder } = body

    if (!name) {
      return NextResponse.json({ message: "Name is required" }, { status: 400 })
    }

    // Create the service category
    const category = await createServiceCategory({
      name,
      description: description || "",
      icon,
      isActive: isActive !== undefined ? isActive : true,
      displayOrder: displayOrder || 0,
    })

    return NextResponse.json(category)
  } catch (error: any) {
    console.error("Error creating service category:", error)
    return NextResponse.json({ message: error.message || "Error creating service category" }, { status: 500 })
  }
}

