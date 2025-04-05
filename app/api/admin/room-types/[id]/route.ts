import { NextResponse } from "next/server"
import { getRoomTypeById, updateRoomType, deleteRoomType } from "@/models/room-type"
import { checkPermission } from "@/lib/permissions"
import { getCurrentUser } from "@/lib/session"
import { applyRateLimit } from "@/lib/rate-limiter"
import { isValidObjectId, sanitizeObject } from "@/lib/validation"
import { handleApiError, NotFoundError, ForbiddenError, ValidationError } from "@/lib/error-handler"
import { logAuditEvent, AuditEventType } from "@/lib/audit-logger"
import { invalidateCachePattern } from "@/lib/cache"

// GET room type by ID
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {

    const user = await getCurrentUser()

    if (!user) {
      throw new ForbiddenError("Unauthorized")
    }

    const hasPermission = await checkPermission(user.id, "view:reservations")

    if (!hasPermission) {
      throw new ForbiddenError("Insufficient permissions")
    }

    // Validar formato del ID
    if (!isValidObjectId(params.id)) {
      throw new ValidationError("Invalid room type ID format")
    }

    // Extract the ID from params to avoid the warning
    const roomTypeId = params.id
    const roomType = await getRoomTypeById(roomTypeId)

    if (!roomType) {
      throw new NotFoundError("Room type not found")
    }

    // Registrar evento de auditoría
    await logAuditEvent(AuditEventType.READ, "roomType", roomTypeId, { name: roomType.name }, request)

    return NextResponse.json(roomType)
  } catch (error: any) {
    return handleApiError(error, request, "roomType", params.id)
  }
}

// PUT update room type
export async function PUT(request: Request, { params }: { params: { id: string } }) {
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

    // Validar formato del ID
    if (!isValidObjectId(params.id)) {
      throw new ValidationError("Invalid room type ID format")
    }

    // Extract the ID from params to avoid the warning
    const roomTypeId = params.id
    const roomType = await getRoomTypeById(roomTypeId)

    if (!roomType) {
      throw new NotFoundError("Room type not found")
    }

    const rawBody = await request.json()

    // Sanitizar datos de entrada
    const body = sanitizeObject(rawBody)

    // Validar que el precio base sea un número positivo si está presente
    if (body.basePrice !== undefined && (typeof body.basePrice !== "number" || body.basePrice < 0)) {
      throw new ValidationError("Base price must be a positive number")
    }

    // Validar que la capacidad sea un número entero positivo si está presente
    if (body.capacity !== undefined && (!Number.isInteger(body.capacity) || body.capacity <= 0)) {
      throw new ValidationError("Capacity must be a positive integer")
    }

    // Validar que amenities sea un array si está presente
    if (body.amenities !== undefined && !Array.isArray(body.amenities)) {
      throw new ValidationError("Amenities must be an array")
    }

    // Validar que images sea un array si está presente
    if (body.images !== undefined && !Array.isArray(body.images)) {
      throw new ValidationError("Images must be an array")
    }

    const success = await updateRoomType(roomTypeId, body)

    if (!success) {
      throw new NotFoundError("Room type not found")
    }

    // Invalidar caché de tipos de habitación
    await invalidateCachePattern("roomTypes:*")

    // Registrar evento de auditoría
    await logAuditEvent(
      AuditEventType.UPDATE,
      "roomType",
      roomTypeId,
      {
        name: body.name || roomType.name,
        basePrice: body.basePrice,
        capacity: body.capacity,
      },
      request,
    )

    return NextResponse.json({ message: "Room type updated successfully" }, { status: 200 })
  } catch (error: any) {
    return handleApiError(error, request, "roomType", params.id)
  }
}

// DELETE room type
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
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

    // Validar formato del ID
    if (!isValidObjectId(params.id)) {
      throw new ValidationError("Invalid room type ID format")
    }

    // Extract the ID from params to avoid the warning
    const roomTypeId = params.id
    const roomType = await getRoomTypeById(roomTypeId)

    if (!roomType) {
      throw new NotFoundError("Room type not found")
    }

    const success = await deleteRoomType(roomTypeId)

    if (!success) {
      throw new NotFoundError("Room type not found")
    }

    // Invalidar caché de tipos de habitación
    await invalidateCachePattern("roomTypes:*")

    // Registrar evento de auditoría
    await logAuditEvent(AuditEventType.DELETE, "roomType", roomTypeId, { name: roomType.name }, request)

    return NextResponse.json({ message: "Room type deleted successfully" }, { status: 200 })
  } catch (error: any) {
    return handleApiError(error, request, "roomType", params.id)
  }
}

