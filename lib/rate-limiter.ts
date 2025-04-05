import { NextResponse } from "next/server"
import redis from "./redis"

// Configuración del rate limiter
const WINDOW_SIZE_IN_SECONDS = 60 // Ventana de tiempo (1 minuto)
const MAX_REQUESTS_PER_WINDOW = 100 // Máximo de solicitudes por ventana
const ADMIN_MAX_REQUESTS_PER_WINDOW = 300 // Máximo para rutas admin

/**
 * Implementa rate limiting basado en IP y ruta
 * @param ip Dirección IP del cliente
 * @param path Ruta de la solicitud
 * @param isAdmin Indica si la ruta es administrativa
 * @returns Un objeto con la información del rate limiting o null si está permitido
 */
export async function rateLimiter(
  ip: string,
  path: string,
  isAdmin = false,
): Promise<{ status: number; message: string } | null> {
  try {
    // Crear una clave única para esta IP y ruta
    const key = `ratelimit:${ip}:${path}`

    // Obtener el número actual de solicitudes
    const currentRequests = await redis.get(key)
    const maxRequests = isAdmin ? ADMIN_MAX_REQUESTS_PER_WINDOW : MAX_REQUESTS_PER_WINDOW

    // Si no hay solicitudes previas, inicializar contador
    if (!currentRequests) {
      await redis.set(key, 1, { ex: WINDOW_SIZE_IN_SECONDS })
      return null
    }

    // Incrementar contador
    const requestCount = Number.parseInt(String(currentRequests)) + 1

    // Actualizar TTL para mantener la ventana deslizante
    await redis.expire(key, WINDOW_SIZE_IN_SECONDS)

    // Verificar si excede el límite
    if (requestCount > maxRequests) {
      console.warn(`Rate limit exceeded for ${ip} on ${path}`)
      return {
        status: 429,
        message: "Too many requests, please try again later",
      }
    }

    // Actualizar contador
    await redis.set(key, requestCount, { ex: WINDOW_SIZE_IN_SECONDS })

    return null
  } catch (error) {
    console.error("Rate limiter error:", error)
    // En caso de error, permitir la solicitud para no bloquear el servicio
    return null
  }
}

/**
 * Middleware para aplicar rate limiting en rutas de API
 */
export async function applyRateLimit(request: Request, isAdmin = false): Promise<NextResponse | null> {
  try {
    // Obtener IP del cliente
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"

    // Obtener ruta
    const url = new URL(request.url)
    const path = url.pathname

    // Aplicar rate limiting
    const limitResult = await rateLimiter(ip.split(",")[0], path, isAdmin)

    if (limitResult) {
      return NextResponse.json(
        { message: limitResult.message },
        {
          status: limitResult.status,
          headers: {
            "Retry-After": WINDOW_SIZE_IN_SECONDS.toString(),
          },
        },
      )
    }

    return null
  } catch (error) {
    console.error("Rate limit application error:", error)
    return null
  }
}

