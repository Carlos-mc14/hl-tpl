import redis from "./redis"
import { cache } from "react"

// Tiempo de caché predeterminado: 5 minutos
const DEFAULT_CACHE_TIME = 300

// Caché en memoria para usar durante la renderización estática
const memoryCache = new Map<string, { data: any; expiry: number }>()

/**
 * Obtiene datos de la caché o de la función proporcionada si no están en caché
 * @param key Clave única para los datos en caché
 * @param fetchFn Función que obtiene los datos si no están en caché
 * @param ttl Tiempo de vida en segundos (opcional, predeterminado: 5 minutos)
 */
export async function getCachedData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = DEFAULT_CACHE_TIME,
): Promise<T> {
  // Verificar si estamos en un entorno de renderizado estático
  const isStaticRendering = typeof window === "undefined" && process.env.NEXT_PHASE === "phase-production-build"

  // Si estamos en un entorno de renderizado estático, usar caché en memoria
  if (isStaticRendering) {
    const now = Date.now()
    const cached = memoryCache.get(key)

    if (cached && cached.expiry > now) {
      return cached.data as T
    }

    const freshData = await fetchFn()
    memoryCache.set(key, { data: freshData, expiry: now + ttl * 1000 })
    return freshData
  }

  try {
    // Intentar obtener datos de la caché
    const cachedData = await redis.get(key)

    if (cachedData) {
      // Si los datos están en caché, verificar si ya es un objeto o necesita ser parseado
      if (typeof cachedData === "string") {
        try {
          // Intentar parsear como JSON
          return JSON.parse(cachedData) as T
        } catch (parseError) {
          // Si no se puede parsear, registrar el error y obtener datos frescos
          console.warn(`No se pudo parsear el valor en caché para ${key}, obteniendo datos frescos`, parseError)
          // Invalidar la caché corrupta
          await redis.del(key)
          // Obtener datos frescos
          return fetchFn()
        }
      } else {
        // Si ya es un objeto, devolverlo directamente
        return cachedData as unknown as T
      }
    }

    // Si no están en caché, obtenerlos usando la función proporcionada
    const freshData = await fetchFn()

    // Verificar que los datos sean serializables antes de guardarlos en caché
    if (freshData && typeof freshData === "object") {
      try {
        // Probar la serialización antes de guardar
        const serialized = JSON.stringify(freshData)
        // Guardar los datos en caché
        await redis.set(key, serialized, { ex: ttl })
      } catch (setError) {
        console.error(`Error al guardar en caché para la clave ${key}:`, setError)
        // Continuar aunque haya error al guardar en caché
      }
    } else {
      console.warn(`Datos no serializables para la clave ${key}, no se guardarán en caché`)
    }

    return freshData
  } catch (error) {
    console.error(`Error en getCachedData para la clave ${key}:`, error)
    // Si hay un error con la caché, obtener los datos directamente
    return fetchFn()
  }
}

// Versión de getCachedData que usa React cache() para renderizado estático
export const getCachedDataStatic = cache(async <T>(
  key: string,
  fetchFn: () => Promise<T>,
): Promise<T> => {
try {
  return await fetchFn();
} catch (error) {
  console.error(`Error en getCachedDataStatic para la clave: ${key}`, error)
  throw error
}
})

/**
 * Invalida una clave de caché específica
 * @param key Clave a invalidar
 */
export async function invalidateCache(key: string): Promise<void> {
  try {
    await redis.del(key)
    // También limpiar la caché en memoria
    memoryCache.delete(key)
  } catch (error) {
    console.error(`Error al invalidar caché para la clave ${key}:`, error)
  }
}

/**
 * Invalida múltiples claves de caché que coinciden con un patrón
 * @param pattern Patrón para las claves a invalidar (ej: "user:*")
 */
export async function invalidateCachePattern(pattern: string) {
  try {
    const keys = await redis.keys(pattern)
    if (keys && keys.length > 0) {
      // Eliminar cada clave individualmente
      for (const key of keys) {
        await redis.del(key)
        // También limpiar la caché en memoria
        memoryCache.delete(key)
      }
      console.log(`Invalidated ${keys.length} cache keys matching pattern: ${pattern}`)
    } else {
      console.log(`No cache keys found matching pattern: ${pattern}`)
    }
  } catch (error) {
    console.error(`Error al invalidar caché para el patrón ${pattern}:`, error)
  }
}

