import { redirect } from "next/navigation"

import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { RoomTable } from "@/components/dashboard/room-table"
import { getCurrentUser } from "@/lib/session-utils"

export const dynamic = "force-dynamic"

export default async function RoomsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Check if user has permission to access this page
  const hasPermission =
    user.role === "Administrator" ||
    user.permissions.includes("manage:reservations") ||
    user.permissions.includes("view:reservations")

  if (!hasPermission) {
    console.log("User lacks permission for rooms page:", user)
    redirect("/dashboard")
  }

  return (
    <DashboardShell>
      <DashboardHeader heading="Room Management" text="View and manage hotel rooms and their status." />
      <RoomTable />
    </DashboardShell>
  )
}

