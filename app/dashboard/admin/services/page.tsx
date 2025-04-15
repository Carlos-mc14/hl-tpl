import { redirect } from "next/navigation"

import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { ServiceCategoriesManagement } from "@/components/dashboard/service-categories-management"
import { getCurrentUser } from "@/lib/session-utils"

export const dynamic = "force-dynamic"

export default async function ServicesPage() {
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
    console.log("User lacks permission for services page:", user)
    redirect("/dashboard")
  }

  return (
    <DashboardShell>
      <DashboardHeader heading="Services Management" text="Manage service categories and items" />
      <ServiceCategoriesManagement />
    </DashboardShell>
  )
}

