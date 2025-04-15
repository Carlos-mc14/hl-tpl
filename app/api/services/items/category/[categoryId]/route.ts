import { NextResponse, type NextRequest } from "next/server"
import { getActiveServiceItemsByCategoryId } from "@/models/service-item"
import { applyRateLimit } from "@/lib/rate-limiter"

// GET - Get all active service items for a specific category (public)
export async function GET(request: NextRequest, { params }: { params: { categoryId: string } }) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    const categoryId = params.categoryId
    const items = await getActiveServiceItemsByCategoryId(categoryId)
    return NextResponse.json(items)
  } catch (error: any) {
    console.error(`Error fetching service items for category ${params.categoryId}:`, error)
    return NextResponse.json({ message: error.message || "Error fetching service items" }, { status: 500 })
  }
}

