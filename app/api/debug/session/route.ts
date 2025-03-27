import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"
import redis from "@/lib/redis"

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get("auth-token")?.value

    if (!authToken) {
      return NextResponse.json({ message: "No auth token found" }, { status: 401 })
    }

    const secretKey = process.env.JWT_SECRET || "fallback-secret-key-change-me"

    try {
      const { payload } = await jwtVerify(authToken, new TextEncoder().encode(secretKey))

      const sessionId = payload.sessionId as string

      if (!sessionId) {
        return NextResponse.json({ message: "Invalid token: no sessionId found", payload }, { status: 401 })
      }

      const sessionData = await redis.get(`session:${sessionId}`)

      if (!sessionData) {
        return NextResponse.json({ message: "No session found in Redis", sessionId }, { status: 401 })
      }

      // Return debug info
      return NextResponse.json({
        message: "Session found",
        tokenPayload: payload,
        sessionId,
        sessionData,
        sessionDataType: typeof sessionData,
      })
    } catch (error) {
      return NextResponse.json({ message: "Error verifying token", error: String(error) }, { status: 401 })
    }
  } catch (error) {
    return NextResponse.json({ message: "Error checking session", error: String(error) }, { status: 500 })
  }
}

