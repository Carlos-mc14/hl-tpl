import { verify } from "jsonwebtoken"
import { cookies } from "next/headers"
import { v4 as uuidv4 } from "uuid"
import redis from "@/lib/redis"

const SESSION_EXPIRES_IN = 60 * 60 * 24 * 7 // 7 days

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  permissions: string[]
}

interface SessionData {
  userId: string
  email: string
  firstName: string
  lastName: string
  role: string
  permissions: string[]
}

export async function createSession(sessionData: SessionData): Promise<string> {
  const sessionId = uuidv4()
  const sessionKey = `session:${sessionId}`

  // Store session data in Redis with expiration
  await redis.set(sessionKey, JSON.stringify(sessionData), { ex: SESSION_EXPIRES_IN })

  return sessionId
}

export async function getSession(sessionId: string): Promise<SessionData | null> {
  const sessionKey = `session:${sessionId}`
  const sessionData = await redis.get(sessionKey)

  if (!sessionData) {
    return null
  }

  // Handle both string and object cases
  if (typeof sessionData === "string") {
    try {
      return JSON.parse(sessionData)
    } catch (e) {
      console.error("Error parsing session data:", e)
      return null
    }
  } else {
    // If it's already an object, return it directly
    return sessionData as unknown as SessionData
  }
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

    const sessionData = await getSession(decoded.sessionId)

    if (!sessionData) {
      return null
    }

    return {
      id: sessionData.userId,
      email: sessionData.email,
      firstName: sessionData.firstName,
      lastName: sessionData.lastName,
      role: sessionData.role,
      permissions: sessionData.permissions,
    }
  } catch (error) {
    console.error("Error getting current user:", error)
    return null
  }
}

export async function deleteSession(sessionId: string): Promise<boolean> {
  const sessionKey = `session:${sessionId}`
  const result = await redis.del(sessionKey)
  return result > 0
}

