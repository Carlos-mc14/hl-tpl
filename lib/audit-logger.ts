import { getDb } from "./mongodb"
import { getCurrentUser } from "./session"

// Tipos de eventos para auditoría
export enum AuditEventType {
  CREATE = "create",
  READ = "read",
  UPDATE = "update",
  DELETE = "delete",
  LOGIN = "login",
  LOGOUT = "logout",
  FAILED_LOGIN = "failed_login",
  PERMISSION_DENIED = "permission_denied",
  SYSTEM = "system",
}

// Interfaz para eventos de auditoría
interface AuditEvent {
  userId?: string
  userEmail?: string
  eventType: AuditEventType
  resourceType: string
  resourceId?: string
  details?: any
  ipAddress?: string
  userAgent?: string
  timestamp: Date
}

/**
 * Registra un evento de auditoría en la base de datos
 */
export async function logAuditEvent(
  eventType: AuditEventType,
  resourceType: string,
  resourceId?: string,
  details?: any,
  request?: Request,
): Promise<void> {
  try {
    // Obtener información del usuario actual
    const user = await getCurrentUser()

    // Obtener información de la solicitud
    const ipAddress = request?.headers.get("x-forwarded-for") || request?.headers.get("x-real-ip") || "unknown"

    const userAgent = request?.headers.get("user-agent") || "unknown"

    // Crear evento de auditoría
    const auditEvent: AuditEvent = {
      userId: user?.id,
      userEmail: user?.email,
      eventType,
      resourceType,
      resourceId,
      details,
      ipAddress: ipAddress.split(",")[0],
      userAgent,
      timestamp: new Date(),
    }

    // Guardar en la base de datos
    const db = await getDb()
    await db.collection("auditLogs").insertOne(auditEvent)
  } catch (error) {
    // No queremos que un error en el logging interrumpa la operación principal
    console.error("Error logging audit event:", error)
  }
}

/**
 * Obtiene eventos de auditoría con filtros
 */
export async function getAuditEvents(
  filters: {
    userId?: string
    eventType?: AuditEventType
    resourceType?: string
    resourceId?: string
    startDate?: Date
    endDate?: Date
  },
  page = 1,
  limit = 50,
): Promise<{ events: AuditEvent[]; total: number }> {
  try {
    const db = await getDb()

    // Construir query basado en filtros
    const query: any = {}

    if (filters.userId) query.userId = filters.userId
    if (filters.eventType) query.eventType = filters.eventType
    if (filters.resourceType) query.resourceType = filters.resourceType
    if (filters.resourceId) query.resourceId = filters.resourceId

    // Filtro de fecha
    if (filters.startDate || filters.endDate) {
      query.timestamp = {}
      if (filters.startDate) query.timestamp.$gte = filters.startDate
      if (filters.endDate) query.timestamp.$lte = filters.endDate
    }

    // Contar total de resultados
    const total = await db.collection("auditLogs").countDocuments(query)

    // Obtener resultados paginados
    const events = (await db
      .collection("auditLogs")
      .find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray())
      .map(doc => ({
        userId: doc.userId,
        userEmail: doc.userEmail,
        eventType: doc.eventType,
        resourceType: doc.resourceType,
        resourceId: doc.resourceId,
        details: doc.details,
        ipAddress: doc.ipAddress,
        userAgent: doc.userAgent,
        timestamp: new Date(doc.timestamp),
      })) as AuditEvent[]

    return { events, total }
  } catch (error) {
    console.error("Error getting audit events:", error)
    throw error
  }
}

