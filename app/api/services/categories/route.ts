import { NextResponse, type NextRequest } from "next/server"
import { getActiveServiceCategories } from "@/models/service-category"
import { applyRateLimit } from "@/lib/rate-limiter"

// GET - Get all active service categories (public)
export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    const categories = await getActiveServiceCategories()
    return NextResponse.json(categories)
  } catch (error: any) {
    console.error("Error fetching service categories:", error)
    return NextResponse.json({ message: error.message || "Error fetching service categories" }, { status: 500 })
  }
}

