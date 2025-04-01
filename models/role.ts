import { ObjectId } from "mongodb"
import { getDb } from "@/lib/mongodb"

export interface Role {
  _id?: ObjectId
  name: string
  description: string
  permissions: string[]
  createdAt: Date
  updatedAt: Date
}

export async function createRole(roleData: Omit<Role, "_id" | "createdAt" | "updatedAt">) {
  const db = await getDb()

  // Check if role already exists
  const existingRole = await db.collection("roles").findOne({ name: roleData.name })
  if (existingRole) {
    throw new Error("Role already exists")
  }

  // Create role
  const newRole = {
    ...roleData,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const result = await db.collection("roles").insertOne(newRole)
  return { ...newRole, _id: result.insertedId }
}

export async function getRoleById(id: string) {
  const db = await getDb()
  return db.collection("roles").findOne({ _id: new ObjectId(id) })
}

export async function getRoleByName(name: string) {
  const db = await getDb()
  return db.collection("roles").findOne({ name })
}

export async function updateRole(id: string, roleData: Partial<Role>) {
  const db = await getDb()

  const updateData = {
    ...roleData,
    updatedAt: new Date(),
  }

  const result = await db.collection("roles").updateOne({ _id: new ObjectId(id) }, { $set: updateData })

  return result.modifiedCount > 0
}

export async function deleteRole(id: string) {
  const db = await getDb()
  const result = await db.collection("roles").deleteOne({ _id: new ObjectId(id) })
  return result.deletedCount > 0
}

export async function getAllRoles() {
  const db = await getDb()
  return db.collection("roles").find().toArray()
}

export async function getUserCountByRole(roleId: string) {
  const db = await getDb()
  return db.collection("users").countDocuments({ role: roleId })
}

// Initialize default roles if they don't exist
export async function initializeRoles() {
  const db = await getDb()

  const defaultRoles = [
    {
      name: "Administrator",
      description: "Full system access",
      permissions: [
        "manage:users",
        "view:users",
        "manage:roles",
        "view:roles",
        "manage:reservations",
        "view:reservations",
        "view:reports",
        "manage:settings",
      ],
    },
    {
      name: "Manager",
      description: "Hotel management access",
      permissions: ["view:users", "manage:reservations", "view:reservations", "view:reports"],
    },
    {
      name: "Staff",
      description: "Front desk operations",
      permissions: ["manage:reservations", "view:reservations"],
    },
    {
      name: "Customer",
      description: "Regular customer account",
      permissions: ["manage:own_profile", "manage:own_reservations", "view:own_reservations"],
    },
  ]

  for (const role of defaultRoles) {
    const existingRole = await db.collection("roles").findOne({ name: role.name })
    if (!existingRole) {
      await db.collection("roles").insertOne({
        ...role,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }
  }
}