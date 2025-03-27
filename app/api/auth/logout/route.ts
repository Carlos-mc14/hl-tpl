import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST() {
  try {
    // Clear the auth token cookie
    const cookieStore = cookies()
    ;(await cookieStore).delete({
      name: "auth-token",
      path: "/",
    })

    return NextResponse.json({
      success: true,
      message: "Logged out successfully",
    })
  } catch (error: any) {
    console.error("Logout error:", error)
    return NextResponse.json({ message: error.message || "An error occurred during logout" }, { status: 500 })
  }
}

