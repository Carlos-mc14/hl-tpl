import { NextResponse } from "next/server"
import { getRoleById, updateRole, deleteRole } from "@/models/role"
import { checkPermission } from "@/lib/permissions"
import { getCurrentUser } from "@/lib/session"
import { applyRateLimit } from "@/lib/rate-limiter"
import { isValidObjectId, sanitizeObject } from "@/lib/validation"
import { handleApiError, NotFoundError, ForbiddenError, ValidationError } from "@/lib/error-handler"
import { logAuditEvent, AuditEventType } from "@/lib/audit-logger"
import { invalidateCachePattern } from "@/lib/cache"

// GET role by ID
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {

    const user = await getCurrentUser()

    if (!user) {
      throw new ForbiddenError("Unauthorized")
    }

    const hasPermission = await checkPermission(user.id, "view:roles")

    if (!hasPermission) {
      throw new ForbiddenError("Insufficient permissions")
    }

    // Validar formato del ID
    if (!isValidObjectId(params.id)) {
      throw new ValidationError("Invalid role ID format")
    }

    const role = await getRoleById(params.id)

    if (!role) {
      throw new NotFoundError("Role not found")
    }

    // Registrar evento de auditoría
    await logAuditEvent(AuditEventType.READ, "role", params.id, { name: role.name }, request)

    return NextResponse.json(role)
  } catch (error: any) {
    return handleApiError(error, request, "role", params.id)
  }
}

// PUT update role
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    // Aplicar rate limiting
    const rateLimitResponse = await applyRateLimit(request, true)
    if (rateLimitResponse) return rateLimitResponse

    const user = await getCurrentUser()

    if (!user) {
      throw new ForbiddenError("Unauthorized")
    }

    const hasPermission = await checkPermission(user.id, "manage:roles")

    if (!hasPermission) {
      throw new ForbiddenError("Insufficient permissions")
    }

    // Validar formato del ID
    if (!isValidObjectId(params.id)) {
      throw new ValidationError("Invalid role ID format")
    }

    const role = await getRoleById(params.id)

    if (!role) {
      throw new NotFoundError("Role not found")
    }

    // Prevent modifying protected roles
    if (role.name === "Administrator" || role.name === "Customer") {
      throw new ValidationError("Cannot modify protected roles")
    }

    const rawBody = await request.json()

    // Sanitizar datos de entrada
    const body = sanitizeObject(rawBody)

    // Validar que los permisos sean un array si están presentes
    if (body.permissions && !Array.isArray(body.permissions)) {
      throw new ValidationError("Permissions must be an array")
    }

    const success = await updateRole(params.id, body)

    if (!success) {
      throw new NotFoundError("Role not found")
    }

    // Invalidar caché de roles
    await invalidateCachePattern("roles:*")

    // Registrar evento de auditoría
    await logAuditEvent(
      AuditEventType.UPDATE,
      "role",
      params.id,
      {
        name: body.name || role.name,
        permissionCount: body.permissions?.length,
      },
      request,
    )

    return NextResponse.json({ message: "Role updated successfully" }, { status: 200 })
  } catch (error: any) {
    return handleApiError(error, request, "role", params.id)
  }
}

// DELETE role
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    // Aplicar rate limiting
    const rateLimitResponse = await applyRateLimit(request, true)
    if (rateLimitResponse) return rateLimitResponse

    const user = await getCurrentUser()

    if (!user) {
      throw new ForbiddenError("Unauthorized")
    }

    const hasPermission = await checkPermission(user.id, "manage:roles")

    if (!hasPermission) {
      throw new ForbiddenError("Insufficient permissions")
    }

    // Validar formato del ID
    if (!isValidObjectId(params.id)) {
      throw new ValidationError("Invalid role ID format")
    }

    const role = await getRoleById(params.id)

    if (!role) {
      throw new NotFoundError("Role not found")
    }

    // Prevent deleting protected roles
    if (role.name === "Administrator" || role.name === "Customer") {
      throw new ValidationError("Cannot delete protected roles")
    }

    const success = await deleteRole(params.id)

    if (!success) {
      throw new NotFoundError("Role not found")
    }

    // Invalidar caché de roles
    await invalidateCachePattern("roles:*")

    // Registrar evento de auditoría
    await logAuditEvent(AuditEventType.DELETE, "role", params.id, { name: role.name }, request)

    return NextResponse.json({ message: "Role deleted successfully" }, { status: 200 })
  } catch (error: any) {
    return handleApiError(error, request, "role", params.id)
  }
}

