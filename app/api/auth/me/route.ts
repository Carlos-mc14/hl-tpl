import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    return NextResponse.json(user)
  } catch (error: any) {
    console.error("Get current user error:", error)
    return NextResponse.json(
      { message: error.message || "An error occurred while fetching user data" },
      { status: 500 },
    )
  }
}

