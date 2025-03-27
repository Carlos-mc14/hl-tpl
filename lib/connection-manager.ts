// Contador global de conexiones activas
let activeConnections = 0

// Tiempo máximo de inactividad para una conexión (en ms)
const MAX_IDLE_TIME = 30000 // 30 segundos

// Mapa para rastrear el tiempo de la última actividad de cada conexión
const connectionLastActivity = new Map<string, number>()

// Intervalo para limpiar conexiones inactivas (en ms)
const CLEANUP_INTERVAL = 60000 // 1 minuto

/**
 * Registra una nueva conexión activa
 * @param connectionId Identificador único para la conexión (opcional)
 * @returns El ID de la conexión
 */
export function trackConnection(connectionId?: string): string {
  const id = connectionId || `conn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  activeConnections++
  connectionLastActivity.set(id, Date.now())
  console.debug(`Nueva conexión: ${id}. Total activas: ${activeConnections}`)
  return id
}

/**
 * Actualiza el tiempo de última actividad de una conexión
 * @param connectionId ID de la conexión
 */
export function updateConnectionActivity(connectionId: string): void {
  if (connectionLastActivity.has(connectionId)) {
    connectionLastActivity.set(connectionId, Date.now())
  }
}

/**
 * Libera una conexión
 * @param connectionId ID de la conexión a liberar
 */
export function releaseConnection(connectionId: string): void {
  if (connectionLastActivity.has(connectionId)) {
    connectionLastActivity.delete(connectionId)
    if (activeConnections > 0) {
      activeConnections--
    }
    console.debug(`Conexión liberada: ${connectionId}. Total activas: ${activeConnections}`)
  }
}

/**
 * Limpia conexiones inactivas
 */
export function cleanupInactiveConnections(): void {
  const now = Date.now()
  let cleaned = 0

  connectionLastActivity.forEach((lastActivity, id) => {
    if (now - lastActivity > MAX_IDLE_TIME) {
      connectionLastActivity.delete(id)
      if (activeConnections > 0) {
        activeConnections--
      }
      cleaned++
    }
  })

  if (cleaned > 0) {
    console.debug(`Limpieza: ${cleaned} conexiones inactivas eliminadas. Total activas: ${activeConnections}`)
  }
}

/**
 * Obtiene el número actual de conexiones activas
 */
export function getActiveConnectionsCount(): number {
  return activeConnections
}

// Iniciar limpieza periódica de conexiones inactivas
if (typeof window === "undefined") {
  // Solo en el servidor
  setInterval(cleanupInactiveConnections, CLEANUP_INTERVAL)
}

