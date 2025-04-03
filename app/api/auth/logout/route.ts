import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verify } from "jsonwebtoken"
import { deleteSession } from "@/lib/session"

export async function POST() {
  try {
    // Obtener el token de autenticación
    const cookieStore = cookies()
    const authToken = (await cookieStore).get("auth-token")?.value

    // Si hay un token, eliminar la sesión en Redis
    if (authToken) {
      try {
        // Verificar el token para obtener el sessionId
        const secretKey = process.env.JWT_SECRET || "fallback-secret-key-change-me"
        const { sessionId } = verify(authToken, secretKey) as { sessionId: string }

        // Eliminar la sesión de Redis
        if (sessionId) {
          await deleteSession(sessionId)
        }
      } catch (error) {
        console.error("Error al verificar el token:", error)
        // Continuamos con el proceso de logout aunque falle la verificación
      }
    }

    // Eliminar la cookie de autenticación
    (await
      // Eliminar la cookie de autenticación
      cookieStore).delete({
      name: "auth-token",
      path: "/",
    })

    // Establecer una cookie de expiración para asegurar que se elimine en el cliente
    ;(await
      // Establecer una cookie de expiración para asegurar que se elimine en el cliente
      cookieStore).set({
      name: "auth-token",
      value: "",
      expires: new Date(0),
      path: "/",
    })

    return NextResponse.json({
      success: true,
      message: "Logged out successfully",
    })
  } catch (error: any) {
    console.error("Logout error:", error)
    return NextResponse.json({ message: error.message || "An error occurred during logout" }, { status: 500 })
  }
}

