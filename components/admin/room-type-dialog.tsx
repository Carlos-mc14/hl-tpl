"use client"

import type React from "react"

import { useState, useEffect } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { X, Plus, Image } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface RoomType {
  _id: string
  name: string
  description: string
  basePrice: number
  capacity: number
  amenities: string[]
  images: string[]
  createdAt: string
  updatedAt: string
}

interface RoomTypeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  roomType: RoomType | null
  onRoomTypeUpdated?: (roomType: RoomType) => void
  onRoomTypeCreated?: (roomType: RoomType) => void
}

export function RoomTypeDialog({
  open,
  onOpenChange,
  roomType,
  onRoomTypeUpdated,
  onRoomTypeCreated,
}: RoomTypeDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    basePrice: 0,
    capacity: 1,
    amenities: [] as string[],
    images: [] as string[],
  })
  const [newAmenity, setNewAmenity] = useState("")
  const [newImage, setNewImage] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (roomType) {
      setFormData({
        name: roomType.name,
        description: roomType.description,
        basePrice: roomType.basePrice,
        capacity: roomType.capacity,
        amenities: [...roomType.amenities],
        images: [...roomType.images],
      })
    } else {
      // Reset form for new room type
      setFormData({
        name: "",
        description: "",
        basePrice: 100,
        capacity: 2,
        amenities: ["Wi-Fi", "TV", "Air Conditioning"],
        images: ["/placeholder.svg?height=300&width=500"],
      })
    }
    // Clear errors and new inputs when dialog opens/closes
    setErrors({})
    setNewAmenity("")
    setNewImage("")
  }, [roomType, open])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    const numValue = Number.parseFloat(value)
    if (!isNaN(numValue)) {
      setFormData((prev) => ({ ...prev, [name]: numValue }))
      // Clear error when user types
      if (errors[name]) {
        setErrors((prev) => ({ ...prev, [name]: "" }))
      }
    }
  }

  const handleAddAmenity = () => {
    if (newAmenity.trim() === "") return
    if (formData.amenities.includes(newAmenity.trim())) {
      toast({
        title: "Duplicate amenity",
        description: "This amenity already exists in the list.",
        variant: "destructive",
      })
      return
    }
    setFormData((prev) => ({
      ...prev,
      amenities: [...prev.amenities, newAmenity.trim()],
    }))
    setNewAmenity("")
  }

  const handleRemoveAmenity = (amenity: string) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.filter((a) => a !== amenity),
    }))
  }

  const handleAddImage = () => {
    if (newImage.trim() === "") return
    if (formData.images.includes(newImage.trim())) {
      toast({
        title: "Duplicate image",
        description: "This image URL already exists in the list.",
        variant: "destructive",
      })
      return
    }
    setFormData((prev) => ({
      ...prev,
      images: [...prev.images, newImage.trim()],
    }))
    setNewImage("")
  }

  const handleRemoveImage = (image: string) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((img) => img !== image),
    }))
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "Name is required"
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required"
    }

    if (formData.basePrice <= 0) {
      newErrors.basePrice = "Base price must be greater than 0"
    }

    if (formData.capacity <= 0) {
      newErrors.capacity = "Capacity must be greater than 0"
    }

    if (formData.amenities.length === 0) {
      newErrors.amenities = "At least one amenity is required"
    }

    if (formData.images.length === 0) {
      newErrors.images = "At least one image is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)

    try {
      if (roomType) {
        // Update existing room type
        const response = await fetch(`/api/admin/room-types/${roomType._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || "Failed to update room type")
        }

        toast({
          title: "Success",
          description: "Room type updated successfully",
        })

        // Get the updated room type data
        const updatedRoomTypeResponse = await fetch(`/api/admin/room-types/${roomType._id}`)
        if (updatedRoomTypeResponse.ok) {
          const updatedRoomType = await updatedRoomTypeResponse.json()
          if (onRoomTypeUpdated) onRoomTypeUpdated(updatedRoomType)
        }
      } else {
        // Create new room type
        const response = await fetch("/api/admin/room-types", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || "Failed to create room type")
        }

        const newRoomType = await response.json()

        toast({
          title: "Success",
          description: "Room type created successfully",
        })

        if (onRoomTypeCreated) onRoomTypeCreated(newRoomType)
      }

      // Close the dialog
      onOpenChange(false)
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "An error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{roomType ? "Edit Room Type" : "Add New Room Type"}</DialogTitle>
            <DialogDescription>
              {roomType ? "Update room type details and properties." : "Create a new room type for the hotel."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="col-span-3"
                required
                disabled={isLoading}
              />
              {errors.name && <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.name}</p>}
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="description" className="text-right pt-2">
                Description
              </Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="col-span-3"
                required
                disabled={isLoading}
                rows={3}
              />
              {errors.description && (
                <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.description}</p>
              )}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="basePrice" className="text-right">
                Base Price
              </Label>
              <div className="col-span-3 flex items-center">
                <span className="mr-2">$</span>
                <Input
                  id="basePrice"
                  name="basePrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.basePrice}
                  onChange={handleNumberChange}
                  className="w-32"
                  required
                  disabled={isLoading}
                />
                <span className="ml-2 text-muted-foreground">per night</span>
              </div>
              {errors.basePrice && <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.basePrice}</p>}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="capacity" className="text-right">
                Capacity
              </Label>
              <div className="col-span-3 flex items-center">
                <Input
                  id="capacity"
                  name="capacity"
                  type="number"
                  min="1"
                  value={formData.capacity}
                  onChange={handleNumberChange}
                  className="w-32"
                  required
                  disabled={isLoading}
                />
                <span className="ml-2 text-muted-foreground">guests</span>
              </div>
              {errors.capacity && <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.capacity}</p>}
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">Amenities</Label>
              <div className="col-span-3 space-y-4">
                <div className="flex flex-wrap gap-2">
                  {formData.amenities.map((amenity, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {amenity}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 rounded-full p-0 hover:bg-transparent"
                        onClick={() => handleRemoveAmenity(amenity)}
                      >
                        <X className="h-3 w-3" />
                        <span className="sr-only">Remove {amenity}</span>
                      </Button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add amenity..."
                    value={newAmenity}
                    onChange={(e) => setNewAmenity(e.target.value)}
                    disabled={isLoading}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        handleAddAmenity()
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleAddAmenity}
                    disabled={isLoading || !newAmenity.trim()}
                  >
                    <Plus className="h-4 w-4" />
                    <span className="sr-only">Add amenity</span>
                  </Button>
                </div>
                {errors.amenities && <p className="text-sm text-red-500">{errors.amenities}</p>}
              </div>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">Images</Label>
              <div className="col-span-3 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {formData.images.map((image, index) => (
                    <div key={index} className="relative group rounded-md overflow-hidden border">
                      <img
                        src={image || "/placeholder.svg"}
                        alt={`Room ${index + 1}`}
                        className="w-full h-32 object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveImage(image)}
                      >
                        <X className="h-3 w-3" />
                        <span className="sr-only">Remove image</span>
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add image URL..."
                    value={newImage}
                    onChange={(e) => setNewImage(e.target.value)}
                    disabled={isLoading}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        handleAddImage()
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleAddImage}
                    disabled={isLoading || !newImage.trim()}
                  >
                    <Image className="h-4 w-4" />
                    <span className="sr-only">Add image</span>
                  </Button>
                </div>
                {errors.images && <p className="text-sm text-red-500">{errors.images}</p>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : roomType ? "Update Room Type" : "Create Room Type"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

