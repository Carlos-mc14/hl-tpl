import { ObjectId } from "mongodb"
import { getDb, releaseConnection } from "@/lib/mongodb"
import { getCachedData, invalidateCache, invalidateCachePattern } from "@/lib/cache"

export interface ServiceItem {
  _id?: ObjectId
  categoryId: string
  name: string
  description: string
  price: number
  isActive: boolean
  displayOrder: number
  createdAt: Date
  updatedAt: Date
}

export interface ServiceItemWithCategory extends ServiceItem {
  category: {
    name: string
    icon?: string
  }
}

export async function createServiceItem(
  itemData: Omit<ServiceItem, "_id" | "createdAt" | "updatedAt">,
): Promise<ServiceItem> {
  const db = await getDb()
  try {
    // Ensure categoryId is an ObjectId string if it's not already
    const categoryId = ObjectId.isValid(itemData.categoryId)
      ? itemData.categoryId
      : new ObjectId(itemData.categoryId).toString()

    const newItem = {
      ...itemData,
      categoryId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection("serviceItems").insertOne(newItem)

    // Invalidate cache
    await invalidateCachePattern("serviceItems:*")
    await invalidateCachePattern(`serviceItems:category:${categoryId}*`)

    return { ...newItem, _id: result.insertedId }
  } finally {
    releaseConnection()
  }
}

export async function getServiceItemById(id: string): Promise<ServiceItem | null> {
  return getCachedData(
    `serviceItem:${id}`,
    async () => {
      const db = await getDb()
      try {
        if (!ObjectId.isValid(id)) {
          console.error(`Invalid ObjectId format: ${id}`)
          return null
        }
        return (await db.collection("serviceItems").findOne({ _id: new ObjectId(id) })) as ServiceItem | null
      } finally {
        releaseConnection()
      }
    },
    300, // Cache for 5 minutes
  )
}

export async function getAllServiceItems(): Promise<ServiceItem[]> {
  return getCachedData(
    "serviceItems:all",
    async () => {
      const db = await getDb()
      try {
        return (await db
          .collection("serviceItems")
          .find()
          .sort({ displayOrder: 1, name: 1 })
          .toArray()) as ServiceItem[]
      } finally {
        releaseConnection()
      }
    },
    300, // Cache for 5 minutes
  )
}

export async function getActiveServiceItems(): Promise<ServiceItem[]> {
  return getCachedData(
    "serviceItems:active",
    async () => {
      const db = await getDb()
      try {
        return (await db
          .collection("serviceItems")
          .find({ isActive: true })
          .sort({ displayOrder: 1, name: 1 })
          .toArray()) as ServiceItem[]
      } finally {
        releaseConnection()
      }
    },
    300, // Cache for 5 minutes
  )
}

export async function getServiceItemsByCategoryId(categoryId: string): Promise<ServiceItem[]> {
  return getCachedData(
    `serviceItems:category:${categoryId}`,
    async () => {
      const db = await getDb()
      try {
        return (await db
          .collection("serviceItems")
          .find({ categoryId })
          .sort({ displayOrder: 1, name: 1 })
          .toArray()) as ServiceItem[]
      } finally {
        releaseConnection()
      }
    },
    300, // Cache for 5 minutes
  )
}

export async function getActiveServiceItemsByCategoryId(categoryId: string): Promise<ServiceItem[]> {
  return getCachedData(
    `serviceItems:category:${categoryId}:active`,
    async () => {
      const db = await getDb()
      try {
        return (await db
          .collection("serviceItems")
          .find({ categoryId, isActive: true })
          .sort({ displayOrder: 1, name: 1 })
          .toArray()) as ServiceItem[]
      } finally {
        releaseConnection()
      }
    },
    300, // Cache for 5 minutes
  )
}

export async function updateServiceItem(id: string, itemData: Partial<ServiceItem>): Promise<boolean> {
  const db = await getDb()
  try {
    const item = await getServiceItemById(id)
    if (!item) {
      throw new Error("Service item not found")
    }

    const updateData: Partial<ServiceItem> & { updatedAt: Date } = {
      ...itemData,
      updatedAt: new Date(),
    }

    // If categoryId is being updated, ensure it's in the correct format
    if (itemData.categoryId) {
      updateData.categoryId = ObjectId.isValid(itemData.categoryId)
        ? itemData.categoryId
        : new ObjectId(itemData.categoryId).toString()
    }

    const result = await db.collection("serviceItems").updateOne({ _id: new ObjectId(id) }, { $set: updateData })

    // Invalidate cache
    await invalidateCache(`serviceItem:${id}`)
    await invalidateCachePattern("serviceItems:*")
    await invalidateCachePattern(`serviceItems:category:${item.categoryId}*`)
    if (itemData.categoryId && itemData.categoryId !== item.categoryId) {
      await invalidateCachePattern(`serviceItems:category:${updateData.categoryId}*`)
    }

    return result.modifiedCount > 0
  } finally {
    releaseConnection()
  }
}

export async function deleteServiceItem(id: string): Promise<boolean> {
  const db = await getDb()
  try {
    const item = await getServiceItemById(id)
    if (!item) {
      throw new Error("Service item not found")
    }

    const result = await db.collection("serviceItems").deleteOne({ _id: new ObjectId(id) })

    // Invalidate cache
    await invalidateCache(`serviceItem:${id}`)
    await invalidateCachePattern("serviceItems:*")
    await invalidateCachePattern(`serviceItems:category:${item.categoryId}*`)

    return result.deletedCount > 0
  } finally {
    releaseConnection()
  }
}

export async function getAllServiceItemsWithCategories(): Promise<ServiceItemWithCategory[]> {
  return getCachedData(
    "serviceItemsWithCategories:all",
    async () => {
      const db = await getDb()
      try {
        const items = await db.collection("serviceItems").find().sort({ displayOrder: 1, name: 1 }).toArray()

        // Get all category IDs
        const categoryIds = Array.from(new Set(items.map((item) => item.categoryId)))

        // Convert string IDs to ObjectId where needed
        const objectIdCategoryIds = categoryIds.map((id) => (ObjectId.isValid(id) ? new ObjectId(id) : id))

        // Get all categories in one query
        const categories = await db
          .collection("serviceCategories")
          .find({
            _id: { $in: objectIdCategoryIds },
          })
          .toArray()

        const categoriesMap = categories.reduce(
          (map, category) => {
            map[category._id.toString()] = category
            return map
          },
          {} as Record<string, any>,
        )

        return items.map((item) => {
          const category = categoriesMap[item.categoryId]
          return {
            ...item,
            category: category
              ? {
                  name: category.name,
                  icon: category.icon,
                }
              : {
                  name: "Unknown Category",
                },
          }
        }) as ServiceItemWithCategory[]
      } finally {
        releaseConnection()
      }
    },
    300, // Cache for 5 minutes
  )
}

export async function getActiveServiceItemsWithCategories(): Promise<ServiceItemWithCategory[]> {
  return getCachedData(
    "serviceItemsWithCategories:active",
    async () => {
      const db = await getDb()
      try {
        const items = await db
          .collection("serviceItems")
          .find({ isActive: true })
          .sort({ displayOrder: 1, name: 1 })
          .toArray()

        // Get all category IDs
        const categoryIds = Array.from(new Set(items.map((item) => item.categoryId)))

        // Convert string IDs to ObjectId where needed
        const objectIdCategoryIds = categoryIds.map((id) => (ObjectId.isValid(id) ? new ObjectId(id) : id))

        // Get all active categories in one query
        const categories = await db
          .collection("serviceCategories")
          .find({
            _id: { $in: objectIdCategoryIds },
            isActive: true,
          })
          .toArray()

        const categoriesMap = categories.reduce(
          (map, category) => {
            map[category._id.toString()] = category
            return map
          },
          {} as Record<string, any>,
        )

        // Only return items whose categories are active
        return items
          .filter((item) => categoriesMap[item.categoryId])
          .map((item) => {
            const category = categoriesMap[item.categoryId]
            return {
              ...item,
              category: {
                name: category.name,
                icon: category.icon,
              },
            }
          }) as ServiceItemWithCategory[]
      } finally {
        releaseConnection()
      }
    },
    300, // Cache for 5 minutes
  )
}
