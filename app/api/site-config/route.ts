import { NextResponse } from "next/server"
import { getSiteConfig } from "@/models/site-config"

// Marcar esta ruta como dinámica para evitar errores de renderizado estático
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const config = await getSiteConfig()
    return NextResponse.json(config)
  } catch (error) {
    console.error("Error fetching site config:", error)
    return NextResponse.json({ error: "Failed to fetch site configuration" }, { status: 500 })
  }
}

