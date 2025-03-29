import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { getCurrentUser } from "@/lib/session"

// Obtener la configuración de métodos de pago
export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Verificar permisos
    const hasPermission =
      user.role === "Administrator" ||
      user.permissions.includes("manage:settings") ||
      user.permissions.includes("view:settings")

    if (!hasPermission) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const db = await getDb()

    // Buscar la configuración en la base de datos
    const settings = await db.collection("settings").findOne({ type: "payment_methods" })

    // Si no hay configuración, devolver valores predeterminados
    if (!settings) {
      return NextResponse.json({
        methods: {
          card: true,
          yape: true,
          pagoefectivo: true,
        },
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error("Error al obtener la configuración de métodos de pago:", error)
    return NextResponse.json({ message: "Error al obtener la configuración de métodos de pago" }, { status: 500 })
  }
}

// Guardar la configuración de métodos de pago
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Verificar permisos
    const hasPermission = user.role === "Administrator" || user.permissions.includes("manage:settings")

    if (!hasPermission) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { methods } = body

    // Validar que los métodos sean booleanos
    if (
      typeof methods.card !== "boolean" ||
      typeof methods.yape !== "boolean" ||
      typeof methods.pagoefectivo !== "boolean"
    ) {
      return NextResponse.json({ message: "Formato de métodos de pago inválido" }, { status: 400 })
    }

    const db = await getDb()

    // Actualizar o crear la configuración
    await db.collection("settings").updateOne(
      { type: "payment_methods" },
      {
        $set: {
          methods,
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    )

    return NextResponse.json({
      message: "Configuración guardada correctamente",
      methods,
    })
  } catch (error) {
    console.error("Error al guardar la configuración de métodos de pago:", error)
    return NextResponse.json({ message: "Error al guardar la configuración de métodos de pago" }, { status: 500 })
  }
}

