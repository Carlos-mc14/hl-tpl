import { NextResponse } from "next/server"
import { logAuditEvent, AuditEventType } from "./audit-logger"

// Tipos de errores personalizados
export class ValidationError extends Error {
  status: number
  constructor(message: string) {
    super(message)
    this.name = "ValidationError"
    this.status = 400
  }
}

export class AuthorizationError extends Error {
  status: number
  constructor(message = "Unauthorized") {
    super(message)
    this.name = "AuthorizationError"
    this.status = 401
  }
}

export class ForbiddenError extends Error {
  status: number
  constructor(message = "Forbidden") {
    super(message)
    this.name = "ForbiddenError"
    this.status = 403
  }
}

export class NotFoundError extends Error {
  status: number
  constructor(message: string) {
    super(message)
    this.name = "NotFoundError"
    this.status = 404
  }
}

export class ConflictError extends Error {
  status: number
  constructor(message: string) {
    super(message)
    this.name = "ConflictError"
    this.status = 409
  }
}

export class ServerError extends Error {
  status: number
  constructor(message = "Internal Server Error") {
    super(message)
    this.name = "ServerError"
    this.status = 500
  }
}

/**
 * Manejador global de errores para rutas de API
 */
export async function handleApiError(
  error: any,
  request?: Request,
  resourceType?: string,
  resourceId?: string,
): Promise<NextResponse> {
  // Determinar el tipo de error y código de estado
  const status = error.status || 500
  const message = error.message || "An unexpected error occurred"

  // Registrar el error
  console.error(`API Error (${status}):`, error)

  // Registrar evento de auditoría para errores importantes
  if (status >= 400) {
    await logAuditEvent(
      AuditEventType.SYSTEM,
      resourceType || "api",
      resourceId,
      { error: message, stack: process.env.NODE_ENV === "development" ? error.stack : undefined },
      request,
    )
  }

  // En producción, no devolver detalles del error para errores del servidor
  const responseMessage =
    status >= 500 && process.env.NODE_ENV === "production" ? "An internal server error occurred" : message

  // Devolver respuesta con el código de estado apropiado
  return NextResponse.json({ message: responseMessage }, { status })
}

