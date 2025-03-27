import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"

import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { ReservationStats } from "@/components/dashboard/reservation-stats"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import redis from "@/lib/redis"

async function getCurrentUser() {
  const cookieStore = await cookies()
  const authToken = cookieStore.get("auth-token")?.value

  if (!authToken) {
    return null
  }

  try {
    const secretKey = process.env.JWT_SECRET || "fallback-secret-key-change-me"
    const { payload } = await jwtVerify(authToken, new TextEncoder().encode(secretKey))

    const sessionId = payload.sessionId as string
    const sessionData = await redis.get(`session:${sessionId}`)

    if (!sessionData) {
      return null
    }

    // Handle both cases: when sessionData is a string or an object
    if (typeof sessionData === "string") {
      try {
        return JSON.parse(sessionData)
      } catch (e) {
        console.error("Error parsing session data:", e)
        return null
      }
    } else {
      // sessionData is already an object
      return sessionData
    }
  } catch (error) {
    console.error("Error verifying token:", error)
    return null
  }
}

export default async function DashboardPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/auth/login")
  }

  return (
    <DashboardShell>
      <DashboardHeader heading="Dashboard" text={`Welcome back, ${user.firstName}!`} />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <ReservationStats />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <RecentActivity className="col-span-4" />
        <div className="col-span-3">{/* Additional dashboard widgets can go here */}</div>
      </div>
    </DashboardShell>
  )
}

