import { NextResponse } from "next/server"

// Esta ruta es solo para depuración y debe eliminarse en producción
export async function GET() {
  try {
    // Verificar las variables de entorno de PayU
    const envVars = {
      NODE_ENV: process.env.NODE_ENV,
      PAYU_API_URL: process.env.PAYU_API_URL ? "Configurado" : "No configurado",
      PAYU_REPORTS_URL: process.env.PAYU_REPORTS_URL ? "Configurado" : "No configurado",
      PAYU_MERCHANT_ID: process.env.PAYU_MERCHANT_ID
        ? `${process.env.PAYU_MERCHANT_ID.substring(0, 3)}...`
        : "No configurado",
      PAYU_API_KEY: process.env.PAYU_API_KEY ? `${process.env.PAYU_API_KEY.substring(0, 3)}...` : "No configurado",
      PAYU_API_LOGIN: process.env.PAYU_API_LOGIN
        ? `${process.env.PAYU_API_LOGIN.substring(0, 3)}...`
        : "No configurado",
      PAYU_ACCOUNT_ID: process.env.PAYU_ACCOUNT_ID
        ? `${process.env.PAYU_ACCOUNT_ID.substring(0, 3)}...`
        : "No configurado",
    }

    return NextResponse.json({
      message: "Variables de entorno (parciales por seguridad)",
      envVars,
      payuConfigured:
        !!process.env.PAYU_API_URL &&
        !!process.env.PAYU_MERCHANT_ID &&
        !!process.env.PAYU_API_KEY &&
        !!process.env.PAYU_API_LOGIN &&
        !!process.env.PAYU_ACCOUNT_ID,
    })
  } catch (error) {
    console.error("Error checking environment variables:", error)
    return NextResponse.json({ error: "Error checking environment variables" }, { status: 500 })
  }
}

