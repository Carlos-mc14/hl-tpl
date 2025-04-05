import { redirect } from "next/navigation"
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns"
import { es } from "date-fns/locale"

import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { ReservationDashboard } from "@/components/dashboard/reservation-dashboard"
import { getCurrentUser } from "@/lib/session-utils"

export const dynamic = "force-dynamic"

export default async function ReservationsPage() {
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
    console.log("User lacks permission for reservations page:", user)
    redirect("/dashboard")
  }

  // Obtener fechas para los diferentes períodos
  const today = new Date()
  const tomorrow = addDays(today, 1)
  const weekStart = startOfWeek(today, { locale: es })
  const weekEnd = endOfWeek(today, { locale: es })
  const monthStart = startOfMonth(today)
  const monthEnd = endOfMonth(today)

  // Formatear fechas para mostrar en la UI
  const dateRanges = {
    today: {
      label: "Hoy",
      start: format(today, "yyyy-MM-dd"),
      end: format(today, "yyyy-MM-dd"),
      displayDate: format(today, "EEEE d 'de' MMMM", { locale: es }),
    },
    tomorrow: {
      label: "Mañana",
      start: format(tomorrow, "yyyy-MM-dd"),
      end: format(tomorrow, "yyyy-MM-dd"),
      displayDate: format(tomorrow, "EEEE d 'de' MMMM", { locale: es }),
    },
    thisWeek: {
      label: "Esta Semana",
      start: format(weekStart, "yyyy-MM-dd"),
      end: format(weekEnd, "yyyy-MM-dd"),
      displayDate: `${format(weekStart, "d", { locale: es })} - ${format(weekEnd, "d 'de' MMMM", { locale: es })}`,
    },
    thisMonth: {
      label: "Este Mes",
      start: format(monthStart, "yyyy-MM-dd"),
      end: format(monthEnd, "yyyy-MM-dd"),
      displayDate: format(today, "MMMM yyyy", { locale: es }),
    },
  }

  return (
    <DashboardShell>
      <DashboardHeader heading="Gestión de Reservas" text="Visualice y administre las reservas del hotel." />
      <ReservationDashboard dateRanges={dateRanges} />
    </DashboardShell>
  )
}

