import { redirect } from "next/navigation"

import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { UserTable } from "@/components/admin/user-table"
import { getCurrentUser } from "@/lib/session-utils"

export const dynamic = "force-dynamic"

export default async function UsersPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Check if user has permission to access this page
  const hasPermission =
    user.role === "Administrator" ||
    user.permissions.includes("manage:users") ||
    user.permissions.includes("view:users")

  if (!hasPermission) {
    console.log("User lacks permission for users page:", user)
    redirect("/dashboard")
  }

  return (
    <DashboardShell>
      <DashboardHeader heading="User Management" text="View and manage all users in the system." />
      <UserTable />
    </DashboardShell>
  )
}

