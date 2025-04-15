"use client"

import { useState, useEffect } from "react"
import { Loader2, Plus, AlertCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ServiceCategoryDialog } from "@/components/admin/service-category-dialog"
import { ServiceItemDialog } from "@/components/admin/service-item-dialog"
import { ServiceCategoryTable } from "@/components/admin/service-category-table"
import { ServiceItemTable } from "@/components/admin/service-item-table"

interface ServiceCategory {
  _id: string
  name: string
  description: string
  icon?: string
  isActive: boolean
  displayOrder: number
}

interface ServiceItem {
  _id: string
  categoryId: string
  name: string
  description: string
  price: number
  isActive: boolean
  displayOrder: number
}

interface ServiceItemWithCategory extends ServiceItem {
  category: {
    name: string
    icon?: string
  }
}

export function ServiceCategoriesManagement() {
  const [activeTab, setActiveTab] = useState("categories")
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [items, setItems] = useState<ServiceItemWithCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null)
  const [selectedItem, setSelectedItem] = useState<ServiceItem | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch categories
      const categoriesResponse = await fetch("/api/admin/service-categories")
      if (!categoriesResponse.ok) {
        throw new Error("Failed to fetch service categories")
      }
      const categoriesData = await categoriesResponse.json()
      setCategories(categoriesData)

      // Fetch items with categories
      const itemsResponse = await fetch("/api/admin/service-items?includeCategories=true")
      if (!itemsResponse.ok) {
        throw new Error("Failed to fetch service items")
      }
      const itemsData = await itemsResponse.json()
      setItems(itemsData)

      // Log for debugging
      console.log("Fetched items:", itemsData)
    } catch (error) {
      console.error("Error fetching data:", error)
      setError(error instanceof Error ? error.message : "An unknown error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCategory = () => {
    setSelectedCategory(null)
    setIsCategoryDialogOpen(true)
  }

  const handleEditCategory = (category: ServiceCategory) => {
    setSelectedCategory(category)
    setIsCategoryDialogOpen(true)
  }

  const handleCreateItem = () => {
    setSelectedItem(null)
    setIsItemDialogOpen(true)
  }

  const handleEditItem = (item: ServiceItem) => {
    setSelectedItem(item)
    setIsItemDialogOpen(true)
  }

  const handleCategorySubmit = async (data: Partial<ServiceCategory>) => {
    try {
      if (selectedCategory) {
        // Update existing category
        const response = await fetch(`/api/admin/service-categories/${selectedCategory._id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || "Failed to update category")
        }

        toast({
          title: "Category Updated",
          description: "The service category has been updated successfully",
        })
      } else {
        // Create new category
        const response = await fetch("/api/admin/service-categories", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || "Failed to create category")
        }

        toast({
          title: "Category Created",
          description: "The service category has been created successfully",
        })
      }

      // Refresh data
      await fetchData()
      setIsCategoryDialogOpen(false)
    } catch (error) {
      console.error("Error submitting category:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save category",
        variant: "destructive",
      })
    }
  }

  const handleItemSubmit = async (data: Partial<ServiceItem>) => {
    try {
      if (selectedItem) {
        // Update existing item
        const response = await fetch(`/api/admin/service-items/${selectedItem._id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || "Failed to update item")
        }

        toast({
          title: "Item Updated",
          description: "The service item has been updated successfully",
        })
      } else {
        // Create new item
        const response = await fetch("/api/admin/service-items", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || "Failed to create item")
        }

        toast({
          title: "Item Created",
          description: "The service item has been created successfully",
        })
      }

      // Refresh data and switch to items tab
      await fetchData()
      setIsItemDialogOpen(false)
      setActiveTab("items")
    } catch (error) {
      console.error("Error submitting item:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save item",
        variant: "destructive",
      })
    }
  }

  const handleDeleteCategory = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/service-categories/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to delete category")
      }

      toast({
        title: "Category Deleted",
        description: "The service category has been deleted successfully",
      })

      // Refresh data
      await fetchData()
    } catch (error) {
      console.error("Error deleting category:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete category",
        variant: "destructive",
      })
    }
  }

  const handleDeleteItem = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/service-items/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to delete item")
      }

      toast({
        title: "Item Deleted",
        description: "The service item has been deleted successfully",
      })

      // Refresh data
      await fetchData()
    } catch (error) {
      console.error("Error deleting item:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete item",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="categories" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="items">Service Items</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={handleCreateCategory}>
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <ServiceCategoryTable categories={categories} onEdit={handleEditCategory} onDelete={handleDeleteCategory} />
          )}
        </TabsContent>

        <TabsContent value="items" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={handleCreateItem} disabled={categories.length === 0}>
              <Plus className="mr-2 h-4 w-4" />
              Add Service Item
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : categories.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No Categories</AlertTitle>
              <AlertDescription>
                You need to create at least one service category before adding service items.
              </AlertDescription>
            </Alert>
          ) : (
            <ServiceItemTable items={items} onEdit={handleEditItem} onDelete={handleDeleteItem} />
          )}
        </TabsContent>
      </Tabs>

      <ServiceCategoryDialog
        open={isCategoryDialogOpen}
        onOpenChange={setIsCategoryDialogOpen}
        category={selectedCategory}
        onSubmit={handleCategorySubmit}
      />

      <ServiceItemDialog
        open={isItemDialogOpen}
        onOpenChange={setIsItemDialogOpen}
        item={selectedItem}
        categories={categories}
        onSubmit={handleItemSubmit}
      />
    </div>
  )
}
