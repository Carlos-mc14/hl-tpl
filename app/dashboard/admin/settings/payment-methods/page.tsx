import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/session-utils"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { PaymentMethodsSettings } from "@/components/dashboard/payment-methods-settings"

export default async function PaymentMethodsSettingsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Check if user has permission to access this page
  const hasPermission = user.role === "Administrator" || user.permissions.includes("manage:settings")

  if (!hasPermission) {
    console.log("User lacks permission for payment settings page:", user)
    redirect("/dashboard")
  }

  return (
    <DashboardShell>
      <DashboardHeader heading="Métodos de Pago" text="Configurar los métodos de pago disponibles para los clientes." />
      <PaymentMethodsSettings />
    </DashboardShell>
  )
}

