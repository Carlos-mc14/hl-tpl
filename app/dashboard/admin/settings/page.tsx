import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/session-utils"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Globe, CreditCard, Bell, Shield, Settings } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Check if user has permission to access this page
  const hasPermission =
    user.role === "Administrator" ||
    user.permissions.includes("manage:settings") ||
    user.permissions.includes("view:settings")

  if (!hasPermission) {
    console.log("User lacks permission for settings page:", user)
    redirect("/dashboard")
  }

  const settingsCategories = [
    {
      title: "Site Configuration",
      description: "Customize your hotel website appearance and content",
      icon: <Globe className="h-8 w-8 text-blue-500" />,
      href: "/dashboard/admin/settings/site",
      permission: "manage:settings",
    },
    {
      title: "Payment Methods",
      description: "Configure payment gateways and options",
      icon: <CreditCard className="h-8 w-8 text-green-500" />,
      href: "/dashboard/admin/settings/payment-methods",
      permission: "manage:settings",
    },
    {
      title: "Notifications",
      description: "Configure email and system notifications",
      icon: <Bell className="h-8 w-8 text-amber-500" />,
      href: "/dashboard/admin/settings/notifications",
      permission: "manage:settings",
    },
    {
      title: "Security",
      description: "Manage security settings and access control",
      icon: <Shield className="h-8 w-8 text-red-500" />,
      href: "/dashboard/admin/settings/security",
      permission: "manage:settings",
    },
    {
      title: "General Settings",
      description: "Configure general system settings",
      icon: <Settings className="h-8 w-8 text-purple-500" />,
      href: "/dashboard/admin/settings/general",
      permission: "manage:settings",
    },
  ]

  return (
    <DashboardShell>
      <DashboardHeader heading="Settings" text="Manage your hotel system settings and configurations." />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {settingsCategories.map((category, index) => {
          // Check if user has permission for this category
          const hasPermissionForCategory =
            user.role === "Administrator" || user.permissions.includes(category.permission)

          if (!hasPermissionForCategory) return null

          return (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-start gap-4">
                <div className="p-2 rounded-md bg-muted">{category.icon}</div>
                <div>
                  <CardTitle>{category.title}</CardTitle>
                  <CardDescription>{category.description}</CardDescription>
                </div>
              </CardHeader>
              <CardFooter>
                <Link href={category.href} className="w-full">
                  <Button className="w-full">Manage</Button>
                </Link>
              </CardFooter>
            </Card>
          )
        })}
      </div>
    </DashboardShell>
  )
}

