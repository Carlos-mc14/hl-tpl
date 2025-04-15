"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const formSchema = z.object({
  categoryId: z.string({
    required_error: "Please select a category",
  }),
  name: z.string().min(2, {
    message: "Name must be at least 2 characters",
  }),
  description: z.string().optional(),
  price: z.coerce.number().min(0, {
    message: "Price must be a positive number",
  }),
  isActive: z.boolean().default(true),
  displayOrder: z.coerce.number().int().default(0),
})

type FormValues = z.infer<typeof formSchema>

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

interface ServiceItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: ServiceItem | null
  categories: ServiceCategory[]
  onSubmit: (data: FormValues) => Promise<void>
}

export function ServiceItemDialog({ open, onOpenChange, item, categories, onSubmit }: ServiceItemDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      categoryId: item?.categoryId || "",
      name: item?.name || "",
      description: item?.description || "",
      price: item?.price ?? 0,
      isActive: item?.isActive ?? true,
      displayOrder: item?.displayOrder ?? 0,
    },
  })

  // Reset form when item changes
  useState(() => {
    if (open) {
      form.reset({
        categoryId: item?.categoryId || "",
        name: item?.name || "",
        description: item?.description || "",
        price: item?.price ?? 0,
        isActive: item?.isActive ?? true,
        displayOrder: item?.displayOrder ?? 0,
      })
    }
  })

  const handleSubmit = async (data: FormValues) => {
    try {
      setIsSubmitting(true)
      await onSubmit(data)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{item ? "Edit Service Item" : "Create Service Item"}</DialogTitle>
          <DialogDescription>
            {item ? "Update the details of this service item" : "Add a new service item to the system"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category._id} value={category._id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>The category this service item belongs to</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Continental Breakfast, Room Cleaning, etc." {...field} />
                  </FormControl>
                  <FormDescription>The name of the service item</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Description of the service item" {...field} />
                  </FormControl>
                  <FormDescription>A brief description of this service item</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormDescription>The price of this service item</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <FormDescription>Whether this item is active and available to guests</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="displayOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Order</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormDescription>Order in which to display this item</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {item ? "Updating..." : "Creating..."}
                  </>
                ) : item ? (
                  "Update Item"
                ) : (
                  "Create Item"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

