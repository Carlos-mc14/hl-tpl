"use client"

import type React from "react"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { BarChart3, Users, ShieldCheck, Calendar, Settings, Home, LogOut, Bed, Hotel, Globe, Coffee } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: Home,
  },
  {
    title: "Reservations",
    href: "/dashboard/admin/reservations",
    icon: Calendar,
  },
  {
    title: "Rooms",
    href: "/dashboard/admin/rooms",
    icon: Hotel,
  },
  {
    title: "Extra Services",
    href: "/dashboard/admin/services",
    icon: Coffee,
  },
  {
    title: "Room Types",
    href: "/dashboard/admin/room-types",
    icon: Bed,
    adminOnly: true,
  },
  {
    title: "Users",
    href: "/dashboard/admin/users",
    icon: Users,
    adminOnly: true,
  },
  {
    title: "Roles",
    href: "/dashboard/admin/roles",
    icon: ShieldCheck,
    adminOnly: true,
  },
  {
    title: "Reports",
    href: "/dashboard/admin/reports",
    icon: BarChart3,
  },
  {
    title: "Settings",
    href: "/dashboard/admin/settings",
    icon: Settings,
  },
]

export function DashboardNav() {
  const pathname = usePathname()
  const router = useRouter()

  // In a real app, you would check if the user is an admin
  const isAdmin = true

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        toast({
          title: "Logout successful",
          description: "You have been logged out successfully.",
        })
        // Redirect to home page or login page after successful logout
        router.push("/")
      } else {
        const data = await response.json()
        throw new Error(data.message || "Logout failed")
      }
    } catch (error) {
      console.error("Logout error:", error)
      toast({
        title: "Logout failed",
        description: "There was an error logging out. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <nav className="grid items-start gap-2 px-2 py-4">
      <Link href="/">
        <Button variant="outline" className="w-full justify-start mb-2 border-dashed">
          <Globe className="mr-2 h-4 w-4" />
          View Website
        </Button>
      </Link>
      {navItems.map((item) => {
        // Skip admin-only items for non-admin users
        if (item.adminOnly && !isAdmin) return null

        return (
          <Link key={item.href} href={item.href}>
            <Button
              variant={pathname === item.href ? "secondary" : "ghost"}
              className={cn("w-full justify-start", pathname === item.href ? "bg-muted font-medium" : "font-normal")}
            >
              <item.icon className="mr-2 h-4 w-4" />
              {item.title}
            </Button>
          </Link>
        )
      })}
      <div className="mt-auto">
        <Button
          variant="ghost"
          className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </nav>
  )
}

