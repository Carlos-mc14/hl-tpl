import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/session-utils"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { SiteConfigForm } from "@/components/dashboard/site-config-form"
import { getSiteConfig } from "@/models/site-config"

export const dynamic = "force-dynamic"

export default async function SiteConfigPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Check if user has permission to access this page
  const hasPermission = user.role === "Administrator" || user.permissions.includes("manage:settings")

  if (!hasPermission) {
    console.log("User lacks permission for site configuration page:", user)
    redirect("/dashboard")
  }

  // Get current site configuration
  const siteConfig = await getSiteConfig()

  return (
    <DashboardShell>
      <DashboardHeader heading="Site Configuration" text="Customize your hotel website appearance and content." />
      <SiteConfigForm initialData={siteConfig} />
    </DashboardShell>
  )
}

