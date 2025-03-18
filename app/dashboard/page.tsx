import { redirect } from "next/navigation"

import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { ReservationStats } from "@/components/dashboard/reservation-stats"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { getCurrentUser } from "@/lib/session"

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

