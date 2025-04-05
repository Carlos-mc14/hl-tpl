import { NextResponse } from "next/server"
import { createRole, getAllRoles, getUserCountByRole } from "@/models/role"
import { checkPermission } from "@/lib/permissions"
import { getCurrentUser } from "@/lib/session"
import { applyRateLimit } from "@/lib/rate-limiter"
import { sanitizeObject } from "@/lib/validation"
import { handleApiError, ForbiddenError, ValidationError } from "@/lib/error-handler"
import { logAuditEvent, AuditEventType } from "@/lib/audit-logger"
import { getCachedData, invalidateCachePattern } from "@/lib/cache"

// GET all roles
export async function GET(request: Request) {
  try {

    const user = await getCurrentUser()

    if (!user) {
      throw new ForbiddenError("Unauthorized")
    }

    const hasPermission = await checkPermission(user.id, "view:roles")

    if (!hasPermission) {
      throw new ForbiddenError("Insufficient permissions")
    }

    // Usar caché para mejorar rendimiento
    const cacheKey = "roles:all"

    const fetchRoles = async () => {
      const roles = await getAllRoles()

      // Add user count to each role
      const rolesWithUserCount = await Promise.all(
        roles.map(async (role) => {
          const userCount = await getUserCountByRole(role._id.toString())
          return {
            ...role,
            userCount,
          }
        }),
      )

      return rolesWithUserCount
    }

    const rolesWithUserCount = await getCachedData(cacheKey, fetchRoles, 300) // 5 minutos de caché

    // Registrar evento de auditoría
    await logAuditEvent(AuditEventType.READ, "roles", undefined, { count: rolesWithUserCount.length }, request)

    return NextResponse.json(rolesWithUserCount)
  } catch (error: any) {
    return handleApiError(error, request, "roles", "list")
  }
}

// POST create new role
export async function POST(request: Request) {
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

    const rawBody = await request.json()

    // Sanitizar datos de entrada
    const body = sanitizeObject(rawBody)
    const { name, description, permissions } = body

    // Validate input
    if (!name || !description || !permissions) {
      throw new ValidationError("Missing required fields")
    }

    // Validar que el nombre no contenga caracteres especiales
    if (!/^[a-zA-Z0-9 _-]+$/.test(name)) {
      throw new ValidationError("Role name can only contain alphanumeric characters, spaces, underscores and hyphens")
    }

    // Validar que los permisos sean un array
    if (!Array.isArray(permissions)) {
      throw new ValidationError("Permissions must be an array")
    }

    const newRole = await createRole({
      name,
      description,
      permissions,
    })

    // Invalidar caché de roles
    await invalidateCachePattern("roles:*")

    // Registrar evento de auditoría
    await logAuditEvent(
      AuditEventType.CREATE,
      "role",
      newRole._id.toString(),
      {
        name,
        permissionCount: permissions.length,
      },
      request,
    )

    return NextResponse.json(newRole, { status: 201 })
  } catch (error: any) {
    return handleApiError(error, request, "role", "create")
  }
}

