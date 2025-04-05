import { NextResponse } from "next/server"
import { createRoomType, getAllRoomTypes } from "@/models/room-type"
import { checkPermission } from "@/lib/permissions"
import { getCurrentUser } from "@/lib/session"
import { applyRateLimit } from "@/lib/rate-limiter"
import { sanitizeObject } from "@/lib/validation"
import { handleApiError, ForbiddenError, ValidationError } from "@/lib/error-handler"
import { logAuditEvent, AuditEventType } from "@/lib/audit-logger"
import { getCachedData, invalidateCachePattern } from "@/lib/cache"

// GET all room types
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      throw new ForbiddenError("Unauthorized")
    }

    const hasPermission = await checkPermission(user.id, "view:reservations")

    if (!hasPermission) {
      throw new ForbiddenError("Insufficient permissions")
    }

    // Usar caché para mejorar rendimiento
    const cacheKey = "roomTypes:all"

    const roomTypes = await getCachedData(cacheKey, getAllRoomTypes, 600) // 10 minutos de caché

    // Registrar evento de auditoría
    await logAuditEvent(AuditEventType.READ, "roomTypes", undefined, { count: roomTypes.length }, request)

    return NextResponse.json(roomTypes)
  } catch (error: any) {
    return handleApiError(error, request, "roomTypes", "list")
  }
}

// POST create new room type
export async function POST(request: Request) {
  try {
    // Aplicar rate limiting
    const rateLimitResponse = await applyRateLimit(request, true)
    if (rateLimitResponse) return rateLimitResponse

    const user = await getCurrentUser()

    if (!user) {
      throw new ForbiddenError("Unauthorized")
    }

    const hasPermission = await checkPermission(user.id, "manage:reservations")

    if (!hasPermission) {
      throw new ForbiddenError("Insufficient permissions")
    }

    const rawBody = await request.json()

    // Sanitizar datos de entrada
    const body = sanitizeObject(rawBody)
    const { name, description, basePrice, capacity, amenities, images } = body

    // Validate input
    if (!name || !description || basePrice === undefined || capacity === undefined) {
      throw new ValidationError("Missing required fields")
    }

    // Validar que el precio base sea un número positivo
    if (typeof basePrice !== "number" || basePrice < 0) {
      throw new ValidationError("Base price must be a positive number")
    }

    // Validar que la capacidad sea un número entero positivo
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new ValidationError("Capacity must be a positive integer")
    }

    // Validar que amenities sea un array si está presente
    if (amenities && !Array.isArray(amenities)) {
      throw new ValidationError("Amenities must be an array")
    }

    // Validar que images sea un array si está presente
    if (images && !Array.isArray(images)) {
      throw new ValidationError("Images must be an array")
    }

    const newRoomType = await createRoomType({
      name,
      description,
      basePrice,
      capacity,
      amenities: amenities || [],
      images: images || [],
    })

    // Invalidar caché de tipos de habitación
    await invalidateCachePattern("roomTypes:*")

    // Registrar evento de auditoría
    await logAuditEvent(
      AuditEventType.CREATE,
      "roomType",
      newRoomType._id.toString(),
      {
        name,
        basePrice,
        capacity,
      },
      request,
    )

    return NextResponse.json(newRoomType, { status: 201 })
  } catch (error: any) {
    return handleApiError(error, request, "roomType", "create")
  }
}

