"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"

interface ServiceCategory {
  _id: string
  name: string
  description: string
  icon?: string
}

interface ServiceItem {
  _id: string
  categoryId: string
  name: string
  description: string
  category: {
    name: string
    icon?: string
  }
}

const formSchema = z.object({
  serviceItemId: z.string({
    required_error: "Please select a service item",
  }),
  description: z.string().optional(),
  customPrice: z.coerce.number().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface ExtraServiceFormProps {
  reservationId: string
  onServiceCreated: () => void
}

export function ExtraServiceForm({ reservationId, onServiceCreated }: ExtraServiceFormProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [items, setItems] = useState<ServiceItem[]>([])
  const [loading, setLoading] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<ServiceItem | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      serviceItemId: "",
      description: "",
      customPrice: undefined,
    },
  })

  useEffect(() => {
    if (open) {
      fetchServiceData()
    }
  }, [open])

  const fetchServiceData = async () => {
    try {
      setLoading(true)

      // Fetch categories
      const categoriesResponse = await fetch("/api/services/categories")
      if (!categoriesResponse.ok) {
        throw new Error("Failed to fetch service categories")
      }
      const categoriesData = await categoriesResponse.json()
      setCategories(categoriesData)

      if (categoriesData.length > 0) {
        setActiveCategory(categoriesData[0]._id)
      }

      // Fetch items
      const itemsResponse = await fetch("/api/services/items")
      if (!itemsResponse.ok) {
        throw new Error("Failed to fetch service items")
      }
      const itemsData = await itemsResponse.json()
      setItems(itemsData)
    } catch (error) {
      console.error("Error fetching service data:", error)
      toast({
        title: "Error",
        description: "Failed to load service options",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleItemSelect = (item: ServiceItem) => {
    setSelectedItem(item)
    form.setValue("serviceItemId", item._id)
  }

  const onSubmit = async (data: FormValues) => {
    try {
      setIsSubmitting(true)

      // Find the selected item to get its details
      const item = items.find((i) => i._id === data.serviceItemId)
      if (!item) {
        throw new Error("Selected service item not found")
      }

      const response = await fetch("/api/extra-services", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reservationId,
          serviceType: item.name,
          description: `${item.description}\n\nAdditional notes: ${data.description}`,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to create service request")
      }

      toast({
        title: "Service Requested",
        description: "Your service request has been submitted successfully",
      })

      // Reset form and close dialog
      form.reset()
      setOpen(false)
      setSelectedItem(null)

      // Notify parent component
      onServiceCreated()
    } catch (error) {
      console.error("Error creating service request:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create service request",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredItems = activeCategory ? items.filter((item) => item.categoryId === activeCategory) : items

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Request Service
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Request Additional Service</DialogTitle>
          <DialogDescription>Select a service from our catalog or request a custom service</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-muted-foreground">No service categories available</p>
          </div>
        ) : (
          <Tabs defaultValue={activeCategory || categories[0]?._id} onValueChange={setActiveCategory}>
            <TabsList className="mb-4">
              {categories.map((category) => (
                <TabsTrigger key={category._id} value={category._id}>
                  {category.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {categories.map((category) => (
              <TabsContent key={category._id} value={category._id} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredItems.length === 0 ? (
                    <div className="col-span-2 text-center py-4">
                      <p className="text-muted-foreground">No services available in this category</p>
                    </div>
                  ) : (
                    filteredItems.map((item) => (
                      <Card
                        key={item._id}
                        className={`cursor-pointer transition-all ${
                          selectedItem?._id === item._id ? "ring-2 ring-primary" : "hover:bg-accent"
                        }`}
                        onClick={() => handleItemSelect(item)}
                      >
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
            <FormField
              control={form.control}
              name="serviceItemId"
              render={({ field }) => (
                <FormItem className="hidden">
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Please provide any specific details or requirements..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Add any special instructions or details about your request</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !selectedItem}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Request"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

