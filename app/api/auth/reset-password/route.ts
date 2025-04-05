import { NextResponse } from "next/server"
import { resetPassword } from "@/models/user"
import { applyRateLimit } from "@/lib/rate-limiter"

export async function POST(request: Request) {
  try {
    // Aplicar rate limiting
    const rateLimitResponse = await applyRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse
        
    const body = await request.json()
    const { token, password, confirmPassword } = body

    if (!token || !password) {
      return NextResponse.json({ message: "Token and password are required" }, { status: 400 })
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ message: "Passwords do not match" }, { status: 400 })
    }

    await resetPassword(token, password)

    return NextResponse.json({ message: "Password reset successfully" }, { status: 200 })
  } catch (error: any) {
    console.error("Reset password error:", error)
    return NextResponse.json(
      { message: error.message || "An error occurred while resetting your password" },
      { status: 500 },
    )
  }
}

