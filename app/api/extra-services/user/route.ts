import { NextResponse, type NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { getExtraServicesByUserId } from "@/models/extra-service"
import { applyRateLimit } from "@/lib/rate-limiter"

// GET - Get all extra services requested by the current user
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

    const services = await getExtraServicesByUserId(user.id)

    return NextResponse.json(services)
  } catch (error: any) {
    console.error("Error fetching user's extra services:", error)
    return NextResponse.json({ message: error.message || "Error fetching extra services" }, { status: 500 })
  }
}

