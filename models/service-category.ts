import { ObjectId } from "mongodb"
import { getDb, releaseConnection } from "@/lib/mongodb"
import { getCachedData, invalidateCache, invalidateCachePattern } from "@/lib/cache"

export interface ServiceCategory {
  _id?: ObjectId
  name: string
  description: string
  icon?: string
  isActive: boolean
  displayOrder: number
  createdAt: Date
  updatedAt: Date
}

export async function createServiceCategory(
  categoryData: Omit<ServiceCategory, "_id" | "createdAt" | "updatedAt">,
): Promise<ServiceCategory> {
  const db = await getDb()
  try {
    const newCategory = {
      ...categoryData,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection("serviceCategories").insertOne(newCategory)

    // Invalidate cache
    await invalidateCachePattern("serviceCategories:*")

    return { ...newCategory, _id: result.insertedId }
  } finally {
    releaseConnection()
  }
}

export async function getServiceCategoryById(id: string): Promise<ServiceCategory | null> {
  return getCachedData(
    `serviceCategory:${id}`,
    async () => {
      const db = await getDb()
      try {
        if (!ObjectId.isValid(id)) {
          console.error(`Invalid ObjectId format: ${id}`)
          return null
        }
        return (await db.collection("serviceCategories").findOne({ _id: new ObjectId(id) })) as ServiceCategory | null
      } finally {
        releaseConnection()
      }
    },
    300, // Cache for 5 minutes
  )
}

export async function getAllServiceCategories(): Promise<ServiceCategory[]> {
  return getCachedData(
    "serviceCategories:all",
    async () => {
      const db = await getDb()
      try {
        return (await db
          .collection("serviceCategories")
          .find()
          .sort({ displayOrder: 1, name: 1 })
          .toArray()) as ServiceCategory[]
      } finally {
        releaseConnection()
      }
    },
    300, // Cache for 5 minutes
  )
}

export async function getActiveServiceCategories(): Promise<ServiceCategory[]> {
  return getCachedData(
    "serviceCategories:active",
    async () => {
      const db = await getDb()
      try {
        return (await db
          .collection("serviceCategories")
          .find({ isActive: true })
          .sort({ displayOrder: 1, name: 1 })
          .toArray()) as ServiceCategory[]
      } finally {
        releaseConnection()
      }
    },
    300, // Cache for 5 minutes
  )
}

export async function updateServiceCategory(id: string, categoryData: Partial<ServiceCategory>): Promise<boolean> {
  const db = await getDb()
  try {
    const updateData: Partial<ServiceCategory> & { updatedAt: Date } = {
      ...categoryData,
      updatedAt: new Date(),
    }

    const result = await db.collection("serviceCategories").updateOne({ _id: new ObjectId(id) }, { $set: updateData })

    // Invalidate cache
    await invalidateCache(`serviceCategory:${id}`)
    await invalidateCachePattern("serviceCategories:*")

    return result.modifiedCount > 0
  } finally {
    releaseConnection()
  }
}

export async function deleteServiceCategory(id: string): Promise<boolean> {
  const db = await getDb()
  try {
    // Check if there are any service items using this category
    const serviceItemCount = await db.collection("serviceItems").countDocuments({ categoryId: id })
    if (serviceItemCount > 0) {
      throw new Error("Cannot delete category with existing service items")
    }

    const result = await db.collection("serviceCategories").deleteOne({ _id: new ObjectId(id) })

    // Invalidate cache
    await invalidateCache(`serviceCategory:${id}`)
    await invalidateCachePattern("serviceCategories:*")

    return result.deletedCount > 0
  } finally {
    releaseConnection()
  }
}

