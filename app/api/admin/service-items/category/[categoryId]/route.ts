import { NextResponse, type NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { getServiceItemsByCategoryId } from "@/models/service-item"
import { applyRateLimit } from "@/lib/rate-limiter"

// GET - Get all service items for a specific category
export async function GET(request: NextRequest, { params }: { params: { categoryId: string } }) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    const categoryId = params.categoryId

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

    const items = await getServiceItemsByCategoryId(categoryId)
    return NextResponse.json(items)
  } catch (error: any) {
    console.error(`Error fetching service items for category ${params.categoryId}:`, error)
    return NextResponse.json({ message: error.message || "Error fetching service items" }, { status: 500 })
  }
}

