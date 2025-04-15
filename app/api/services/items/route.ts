import { NextResponse, type NextRequest } from "next/server"
import { getActiveServiceItemsWithCategories } from "@/models/service-item"
import { applyRateLimit } from "@/lib/rate-limiter"

// GET - Get all active service items with their categories (public)
export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    const items = await getActiveServiceItemsWithCategories()
    return NextResponse.json(items)
  } catch (error: any) {
    console.error("Error fetching service items:", error)
    return NextResponse.json({ message: error.message || "Error fetching service items" }, { status: 500 })
  }
}

