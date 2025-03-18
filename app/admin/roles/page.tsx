import { redirect } from "next/navigation"

import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { RoleTable } from "@/components/admin/role-table"
import { getCurrentUser } from "@/lib/session"
import { checkPermission } from "@/lib/permissions"

export default async function RolesPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Check if user has permission to access this page
  const hasPermission = await checkPermission(user.id, "manage:roles")

  if (!hasPermission) {
    redirect("/dashboard")
  }

  return (
    <DashboardShell>
      <DashboardHeader heading="Role Management" text="View and manage roles and permissions in the system." />
      <RoleTable />
    </DashboardShell>
  )
}

