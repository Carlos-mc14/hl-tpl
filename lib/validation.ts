import { ObjectId } from "mongodb"

/**
 * Valida un ID de MongoDB
 * @param id ID a validar
 * @returns true si es válido, false si no
 */
export function isValidObjectId(id: string): boolean {
  return ObjectId.isValid(id) && String(new ObjectId(id)) === id
}

/**
 * Sanitiza un objeto eliminando propiedades no deseadas y caracteres peligrosos
 * @param obj Objeto a sanitizar
 * @param allowedFields Campos permitidos (opcional)
 * @returns Objeto sanitizado
 */
export function sanitizeObject(obj: any, allowedFields?: string[]): any {
  if (!obj || typeof obj !== "object") return obj

  const sanitized: any = {}

  // Si hay campos permitidos, solo incluir esos
  const fields = allowedFields || Object.keys(obj)

  for (const field of fields) {
    if (obj[field] !== undefined) {
      // Sanitizar strings para prevenir XSS
      if (typeof obj[field] === "string") {
        sanitized[field] = sanitizeString(obj[field])
      }
      // Recursivamente sanitizar objetos anidados
      else if (typeof obj[field] === "object" && obj[field] !== null) {
        if (Array.isArray(obj[field])) {
          sanitized[field] = obj[field].map((item: any) =>
            typeof item === "object" ? sanitizeObject(item) : typeof item === "string" ? sanitizeString(item) : item,
          )
        } else {
          sanitized[field] = sanitizeObject(obj[field])
        }
      }
      // Otros tipos se pasan sin cambios
      else {
        sanitized[field] = obj[field]
      }
    }
  }

  return sanitized
}

/**
 * Sanitiza una cadena para prevenir XSS
 * @param str Cadena a sanitizar
 * @returns Cadena sanitizada
 */
export function sanitizeString(str: string): string {
  if (!str) return str

  // Reemplazar caracteres peligrosos
  return str
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
    .replace(/\\/g, "&#x5C;")
    .replace(/`/g, "&#96;")
}

/**
 * Valida un email
 * @param email Email a validar
 * @returns true si es válido, false si no
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(email)
}

/**
 * Valida un número de teléfono
 * @param phone Número a validar
 * @returns true si es válido, false si no
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+?[0-9]{7,15}$/
  return phoneRegex.test(phone)
}

/**
 * Valida una fecha
 * @param date Fecha a validar
 * @returns true si es válida, false si no
 */
export function isValidDate(date: string | Date): boolean {
  const d = new Date(date)
  return !isNaN(d.getTime())
}

