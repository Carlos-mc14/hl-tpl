import { NextResponse } from "next/server"
import { getSiteConfig, updateSiteConfig } from "@/models/site-config"
import { getCurrentUser } from "@/lib/session"

// GET site configuration
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Check permissions
    const hasPermission =
      user.role === "Administrator" ||
      user.permissions.includes("manage:settings") ||
      user.permissions.includes("view:settings")

    if (!hasPermission) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const config = await getSiteConfig()
    return NextResponse.json(config)
  } catch (error: any) {
    console.error("Get site config error:", error)
    return NextResponse.json(
      { message: error.message || "An error occurred while fetching site configuration" },
      { status: 500 },
    )
  }
}

// POST update site configuration
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Check permissions
    const hasPermission = user.role === "Administrator" || user.permissions.includes("manage:settings")

    if (!hasPermission) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()

    // Log the received data for debugging
    console.log("Received site config update:", body)

    // Ensure we're not trying to update the _id field
    const { _id, ...updateData } = body

    const success = await updateSiteConfig(updateData)

    if (!success) {
      return NextResponse.json({ message: "Failed to update site configuration" }, { status: 500 })
    }

    // Get the updated config to return
    const updatedConfig = await getSiteConfig()

    return NextResponse.json({
      message: "Site configuration updated successfully",
      config: updatedConfig,
    })
  } catch (error: any) {
    console.error("Update site config error:", error)
    return NextResponse.json(
      { message: error.message || "An error occurred while updating site configuration" },
      { status: 500 },
    )
  }
}

