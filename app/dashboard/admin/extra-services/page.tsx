import { redirect } from "next/navigation"

import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { ExtraServicesDashboard } from "@/components/dashboard/extra-services-dashboard"
import { getCurrentUser } from "@/lib/session-utils"

export const dynamic = "force-dynamic"

export default async function ExtraServicesPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Check if user has permission to access this page
  const hasPermission =
    user.role === "Administrator" ||
    user.permissions.includes("manage:services") ||
    user.permissions.includes("view:services")

  if (!hasPermission) {
    console.log("User lacks permission for extra services page:", user)
    redirect("/dashboard")
  }

  return (
    <DashboardShell>
      <DashboardHeader heading="Extra Services Management" text="Manage additional services requested by guests" />
      <ExtraServicesDashboard />
    </DashboardShell>
  )
}

