import { NextResponse } from "next/server"
import { isPayUConfigured, getPayUDebugInfo } from "@/lib/payu"

export async function GET() {
  try {
    // Verificar si PayU está configurado correctamente
    const configured = isPayUConfigured()

    // Obtener información de depuración (solo para desarrollo)
    const debugInfo = process.env.NODE_ENV === "development" ? getPayUDebugInfo() : undefined

    // Determinar qué métodos de pago están disponibles
    // En un entorno real, esto podría venir de una configuración en la base de datos
    const availablePaymentMethods = {
      card: true, // Tarjetas de crédito/débito
      yape: true, // Yape (método de pago móvil peruano)
      pagoefectivo: true, // PagoEfectivo (red de pagos en efectivo)
    }

    return NextResponse.json({
      configured,
      availablePaymentMethods,
      debugInfo,
    })
  } catch (error: any) {
    console.error("Error checking PayU configuration:", error)
    return NextResponse.json({ message: error.message || "Error checking PayU configuration" }, { status: 500 })
  }
}

