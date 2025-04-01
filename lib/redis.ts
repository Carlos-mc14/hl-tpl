import { Redis } from "@upstash/redis"

if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  throw new Error("Please add your Upstash Redis credentials to .env.local")
}

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default redis

/**
 * Invalida múltiples claves de caché que coinciden con un patrón
 * @param pattern Patrón para las claves a invalidar (ej: "user:*")
 */
export async function invalidateCachePattern(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern)
    if (keys && keys.length > 0) {
      // Eliminar cada clave individualmente
      for (const key of keys) {
        await redis.del(key)
      }
      console.log(`Invalidated ${keys.length} cache keys matching pattern: ${pattern}`)
    } else {
      console.log(`No cache keys found matching pattern: ${pattern}`)
    }
  } catch (error) {
    console.error(`Error al invalidar caché para el patrón ${pattern}:`, error)
  }
}

