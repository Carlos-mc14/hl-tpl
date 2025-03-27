import { redirect } from "next/navigation"

import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { RoleTable } from "@/components/admin/role-table"
import { getCurrentUser } from "@/lib/session-utils"

export default async function RolesPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Check if user has permission to access this page
  const hasPermission =
    user.role === "Administrator" ||
    user.permissions.includes("manage:roles") ||
    user.permissions.includes("view:roles")

  if (!hasPermission) {
    console.log("User lacks permission for roles page:", user)
    redirect("/dashboard")
  }

  return (
    <DashboardShell>
      <DashboardHeader heading="Role Management" text="View and manage roles and permissions in the system." />
      <RoleTable />
    </DashboardShell>
  )
}

