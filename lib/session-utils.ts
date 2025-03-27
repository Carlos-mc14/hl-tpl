import { cookies } from "next/headers"
import { verify } from "jsonwebtoken"
import redis from "@/lib/redis"

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  permissions: string[]
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = cookies()
    const token = (await cookieStore).get("auth-token")

    if (!token) {
      return null
    }

    const decoded = verify(token.value, process.env.JWT_SECRET || "fallback-secret-key-change-me") as {
      sessionId: string
    }

    if (!decoded || !decoded.sessionId) {
      return null
    }

    const sessionData = await redis.get(`session:${decoded.sessionId}`)

    if (!sessionData) {
      return null
    }

    // Handle both string and object cases
    let session
    if (typeof sessionData === "string") {
      try {
        session = JSON.parse(sessionData)
      } catch (e) {
        console.error("Error parsing session data:", e)
        return null
      }
    } else {
      session = sessionData
    }

    return {
      id: session.id || session.userId,
      email: session.email,
      firstName: session.firstName,
      lastName: session.lastName,
      role: session.role,
      permissions: session.permissions,
    }
  } catch (error) {
    console.error("Error getting current user:", error)
    return null
  }
}

