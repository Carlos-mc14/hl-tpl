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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { Bed, BedDouble, Brush, CheckCircle, Clock, Loader2, Wrench } from "lucide-react"

interface Room {
  _id: string
  number: string
  floor: string
  roomTypeId: string
  status: "Available" | "Occupied" | "Maintenance" | "Cleaning" | "Reserved"
  notes?: string
  createdAt: string
  updatedAt: string
  roomType?: {
    name: string
    basePrice: number
    capacity: number
  }
}

interface RoomType {
  _id: string
  name: string
  description: string
  basePrice: number
  capacity: number
  amenities: string[]
}

interface RoomDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  room: Room | null
  roomTypes: RoomType[]
  onRoomUpdated?: (room: Room) => void
  onRoomCreated?: (room: Room) => void
}

export function RoomDialog({ open, onOpenChange, room, roomTypes, onRoomUpdated, onRoomCreated }: RoomDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    number: "",
    floor: "",
    roomTypeId: "",
    status: "Available" as Room["status"],
    notes: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (room) {
      setFormData({
        number: room.number,
        floor: room.floor,
        roomTypeId: room.roomTypeId,
        status: room.status,
        notes: room.notes || "",
      })
    } else {
      // Reset form for new room
      setFormData({
        number: "",
        floor: "",
        roomTypeId: roomTypes.length > 0 ? roomTypes[0]._id : "",
        status: "Available",
        notes: "",
      })
    }
    // Clear errors when dialog opens/closes
    setErrors({})
  }, [room, open, roomTypes])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear error when user selects
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.number.trim()) {
      newErrors.number = "Room number is required"
    }

    if (!formData.floor.trim()) {
      newErrors.floor = "Floor is required"
    }

    if (!formData.roomTypeId) {
      newErrors.roomTypeId = "Room type is required"
    }

    if (!formData.status) {
      newErrors.status = "Status is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)

    try {
      if (room) {
        // Update existing room
        const response = await fetch(`/api/admin/rooms/${room._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || "Failed to update room")
        }

        const responseData = await response.json()

        toast({
          title: "Success",
          description: "Room updated successfully",
        })

        // Use the room data from the response if available
        if (responseData.room && onRoomUpdated) {
          onRoomUpdated(responseData.room)
        } else {
          // Fallback to fetching the updated room data
          const updatedRoomResponse = await fetch(`/api/admin/rooms/${room._id}?withType=true`)
          if (updatedRoomResponse.ok) {
            const updatedRoom = await updatedRoomResponse.json()
            if (onRoomUpdated) onRoomUpdated(updatedRoom)
          }
        }
      } else {
        // Create new room
        const response = await fetch("/api/admin/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || "Failed to create room")
        }

        const newRoom = await response.json()

        toast({
          title: "Success",
          description: "Room created successfully",
        })

        // Fetch the complete room data with type information
        const newRoomWithTypeResponse = await fetch(`/api/admin/rooms/${newRoom._id}?withType=true`)
        if (newRoomWithTypeResponse.ok) {
          const newRoomWithType = await newRoomWithTypeResponse.json()
          if (onRoomCreated) onRoomCreated(newRoomWithType)
        } else {
          if (onRoomCreated) onRoomCreated(newRoom)
        }
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

  // Mejorar la interfaz del diálogo de edición/creación de habitaciones
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{room ? "Edit Room" : "Add New Room"}</DialogTitle>
            <DialogDescription>
              {room ? "Update room details and properties." : "Create a new room in the hotel."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="number">Room Number</Label>
                <Input
                  id="number"
                  name="number"
                  value={formData.number}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                />
                {errors.number && <p className="text-sm text-red-500">{errors.number}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="floor">Floor</Label>
                <Input
                  id="floor"
                  name="floor"
                  value={formData.floor}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                />
                {errors.floor && <p className="text-sm text-red-500">{errors.floor}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="roomTypeId">Room Type</Label>
              <Select
                value={formData.roomTypeId}
                onValueChange={(value) => handleSelectChange("roomTypeId", value)}
                disabled={isLoading || roomTypes.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select room type" />
                </SelectTrigger>
                <SelectContent>
                  {roomTypes.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No room types available
                    </SelectItem>
                  ) : (
                    roomTypes.map((type) => (
                      <SelectItem key={type._id} value={type._id}>
                        <div className="flex items-center gap-2">
                          <Bed className="h-4 w-4 text-muted-foreground" />
                          <span>{type.name}</span>
                          <span className="text-xs text-muted-foreground">
                            (${type.basePrice}, {type.capacity} guests)
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.roomTypeId && <p className="text-sm text-red-500">{errors.roomTypeId}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleSelectChange("status", value)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Available">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Available</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="Occupied">
                    <div className="flex items-center gap-2">
                      <BedDouble className="h-4 w-4 text-blue-500" />
                      <span>Occupied</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="Maintenance">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-orange-500" />
                      <span>Maintenance</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="Cleaning">
                    <div className="flex items-center gap-2">
                      <Brush className="h-4 w-4 text-yellow-500" />
                      <span>Cleaning</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="Reserved">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-purple-500" />
                      <span>Reserved</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {errors.status && <p className="text-sm text-red-500">{errors.status}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Optional notes about the room"
                disabled={isLoading}
                rows={3}
              />
            </div>

            {/* Información del tipo de habitación seleccionado */}
            {formData.roomTypeId && roomTypes.length > 0 && (
              <div className="rounded-md border p-3 bg-muted/30">
                <h4 className="text-sm font-medium mb-2">Selected Room Type Details</h4>
                {(() => {
                  const selectedType = roomTypes.find((type) => type._id === formData.roomTypeId)
                  if (!selectedType)
                    return <p className="text-sm text-muted-foreground">Type information not available</p>

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="font-medium">Name:</span> {selectedType.name}
                      </div>
                      <div>
                        <span className="font-medium">Price:</span> ${selectedType.basePrice.toFixed(2)}/night
                      </div>
                      <div>
                        <span className="font-medium">Capacity:</span> {selectedType.capacity} guests
                      </div>
                      <div>
                        <span className="font-medium">Amenities:</span> {selectedType.amenities.length} included
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {room ? "Updating..." : "Creating..."}
                </>
              ) : room ? (
                "Update Room"
              ) : (
                "Create Room"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

