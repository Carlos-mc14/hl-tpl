import { getCurrentUser } from "@/lib/session"

export async function checkPermission(userId: string, permission: string): Promise<boolean> {
  const user = await getCurrentUser()

  if (!user) {
    return false
  }

  // Check if the user has the permission
  return user.permissions.includes(permission)
}

export async function getUserPermissions(userId: string): Promise<string[]> {
  const user = await getCurrentUser()

  if (!user) {
    return []
  }

  return user.permissions
}

export async function hasRole(userId: string, role: string): Promise<boolean> {
  const user = await getCurrentUser()

  if (!user) {
    return false
  }

  return user.role === role
}

