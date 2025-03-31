"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CalendarDays, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { Textarea } from "@/components/ui/textarea"

interface RoomType {
  _id: string
  name: string
  description: string
  basePrice: number
  capacity: number
  amenities: string[]
}

interface Room {
  _id: string
  number: string
  floor: string
  roomTypeId: string
  status: string
  roomType?: {
    name: string
    basePrice: number
    capacity: number
  }
}

interface ReservationFormProps {
  roomTypes: RoomType[]
  availableRooms: Room[]
  selectedRoomTypeId?: string
}

export default function ReservationForm({ roomTypes, availableRooms, selectedRoomTypeId }: ReservationFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false)
  const [availabilityChecked, setAvailabilityChecked] = useState(false)
  const [availableRoomsForDates, setAvailableRoomsForDates] = useState<Room[]>([])

  const today = new Date().toISOString().split("T")[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0]

  const [formData, setFormData] = useState({
    checkInDate: today,
    checkOutDate: tomorrow,
    adults: "2",
    children: "0",
    roomTypeId: selectedRoomTypeId || "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    specialRequests: "",
  })

  // Update roomTypeId when selectedRoomTypeId changes
  useEffect(() => {
    if (selectedRoomTypeId) {
      setFormData((prev) => ({ ...prev, roomTypeId: selectedRoomTypeId }))
    }
  }, [selectedRoomTypeId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Reset availability check when dates change
    if (name === "checkInDate" || name === "checkOutDate") {
      setAvailabilityChecked(false)
    }
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Reset availability check when room type changes
    if (name === "roomTypeId") {
      setAvailabilityChecked(false)
    }
  }

  const checkAvailability = async () => {
    if (!formData.roomTypeId) {
      toast({
        title: "Room type required",
        description: "Please select a room type to check availability",
        variant: "destructive",
      })
      return
    }

    if (new Date(formData.checkInDate) >= new Date(formData.checkOutDate)) {
      toast({
        title: "Invalid dates",
        description: "Check-out date must be after check-in date",
        variant: "destructive",
      })
      return
    }

    setIsCheckingAvailability(true)

    try {
      // In a real app, you would call an API endpoint to check availability
      // For now, we'll simulate this by filtering the available rooms by room type
      const roomsOfSelectedType = availableRooms.filter((room) => room.roomTypeId === formData.roomTypeId)

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setAvailableRoomsForDates(roomsOfSelectedType)
      setAvailabilityChecked(true)

      if (roomsOfSelectedType.length === 0) {
        toast({
          title: "No rooms available",
          description: "Sorry, there are no rooms available for the selected dates and room type",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Rooms available!",
          description: `We found ${roomsOfSelectedType.length} rooms available for your dates`,
        })
      }
    } catch (error) {
      toast({
        title: "Error checking availability",
        description: "An error occurred while checking room availability",
        variant: "destructive",
      })
    } finally {
      setIsCheckingAvailability(false)
    }
  }

  // Modificar la función handleSubmit para usar IDs temporales
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!availabilityChecked) {
      checkAvailability()
      return
    }

    if (availableRoomsForDates.length === 0) {
      toast({
        title: "No rooms available",
        description: "Please select different dates or room type",
        variant: "destructive",
      })
      return
    }

    // Validate form
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Get the selected room type details
      const selectedRoomType = roomTypes.find((type) => type._id.toString() === formData.roomTypeId)

      // Calculate total price (base price * number of nights)
      const checkInDate = new Date(formData.checkInDate)
      const checkOutDate = new Date(formData.checkOutDate)
      const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
      const totalPrice = selectedRoomType ? selectedRoomType.basePrice * nights : 0

      // Crear una reserva temporal en el servidor
      const response = await fetch("/api/reservations/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomTypeId: formData.roomTypeId,
          checkInDate: formData.checkInDate,
          checkOutDate: formData.checkOutDate,
          adults: formData.adults,
          children: formData.children,
          totalPrice: totalPrice,
          guest: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            phone: formData.phone,
          },
          specialRequests: formData.specialRequests,
          isTemporary: true,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Error creating reservation")
      }

      const data = await response.json()
      console.log("Reservation created:", data)

      // Store reservation details in session storage for the payment page
      sessionStorage.setItem(
        "reservation",
        JSON.stringify({
          ...formData,
          reservationId: data.reservationId, // Use the real ID from the server
          nights,
          totalPrice,
          confirmationCode: data.confirmationCode,
          roomTypeName: selectedRoomType?.name,
          roomNumber: availableRoomsForDates[0].number,
        }),
      )

      // Redirect to payment page
      router.push("/reservations/payment")
    } catch (error) {
      console.error("Error creating reservation:", error)
      toast({
        title: "Error creating reservation",
        description: error instanceof Error ? error.message : "An error occurred while creating your reservation",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Get the selected room type
  const selectedRoomType = roomTypes.find((type) => type._id.toString() === formData.roomTypeId)

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Reservation Details</h2>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="checkInDate">Check-in Date</Label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="checkInDate"
                    name="checkInDate"
                    type="date"
                    className="pl-10"
                    min={today}
                    value={formData.checkInDate}
                    onChange={handleChange}
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="checkOutDate">Check-out Date</Label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="checkOutDate"
                    name="checkOutDate"
                    type="date"
                    className="pl-10"
                    min={formData.checkInDate}
                    value={formData.checkOutDate}
                    onChange={handleChange}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="adults">Adults</Label>
                <Select
                  value={formData.adults}
                  onValueChange={(value) => handleSelectChange("adults", value)}
                  disabled={isLoading}
                >
                  <SelectTrigger id="adults">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="children">Children</Label>
                <Select
                  value={formData.children}
                  onValueChange={(value) => handleSelectChange("children", value)}
                  disabled={isLoading}
                >
                  <SelectTrigger id="children">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0</SelectItem>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="roomTypeId">Room Type</Label>
              <Select
                value={formData.roomTypeId}
                onValueChange={(value) => handleSelectChange("roomTypeId", value)}
                disabled={isLoading}
              >
                <SelectTrigger id="roomTypeId">
                  <SelectValue placeholder="Select room type" />
                </SelectTrigger>
                <SelectContent>
                  {roomTypes.map((type) => (
                    <SelectItem key={type._id.toString()} value={type._id.toString()}>
                      {type.name} - ${type.basePrice}/night (Up to {type.capacity} guests)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!availabilityChecked ? (
              <Button
                type="button"
                className="w-full"
                onClick={checkAvailability}
                disabled={isCheckingAvailability || !formData.roomTypeId}
              >
                {isCheckingAvailability ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking Availability...
                  </>
                ) : (
                  "Check Availability"
                )}
              </Button>
            ) : (
              <>
                {availableRoomsForDates.length > 0 && (
                  <>
                    <div className="border-t pt-4 mt-4">
                      <h3 className="font-semibold text-lg mb-4">Guest Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First Name</Label>
                          <Input
                            id="firstName"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleChange}
                            required
                            disabled={isLoading}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input
                            id="lastName"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleChange}
                            required
                            disabled={isLoading}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            disabled={isLoading}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone (optional)</Label>
                          <Input
                            id="phone"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            disabled={isLoading}
                          />
                        </div>
                      </div>

                      <div className="space-y-2 mt-4">
                        <Label htmlFor="specialRequests">Special Requests (optional)</Label>
                        <Textarea
                          id="specialRequests"
                          name="specialRequests"
                          value={formData.specialRequests}
                          onChange={handleChange}
                          placeholder="Any special requests or requirements?"
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    {selectedRoomType && (
                      <div className="bg-gray-50 p-4 rounded-lg mt-4">
                        <h3 className="font-semibold mb-2">Reservation Summary</h3>
                        <div className="text-sm space-y-1">
                          <p>
                            <span className="font-medium">Room Type:</span> {selectedRoomType.name}
                          </p>
                          <p>
                            <span className="font-medium">Check-in:</span>{" "}
                            {new Date(formData.checkInDate).toLocaleDateString()}
                          </p>
                          <p>
                            <span className="font-medium">Check-out:</span>{" "}
                            {new Date(formData.checkOutDate).toLocaleDateString()}
                          </p>
                          <p>
                            <span className="font-medium">Guests:</span> {formData.adults} adults, {formData.children}{" "}
                            children
                          </p>
                          <p>
                            <span className="font-medium">Price per night:</span> $
                            {selectedRoomType.basePrice.toFixed(2)}
                          </p>
                          <p className="font-medium mt-2">
                            Total: $
                            {calculateTotal(formData.checkInDate, formData.checkOutDate, selectedRoomType.basePrice)}
                          </p>
                        </div>
                      </div>
                    )}

                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Continue to Payment"
                      )}
                    </Button>
                  </>
                )}
              </>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

// Helper function to calculate total price
function calculateTotal(checkInDate: string, checkOutDate: string, pricePerNight: number): string {
  const startDate = new Date(checkInDate)
  const endDate = new Date(checkOutDate)
  const nights = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  return (nights * pricePerNight).toFixed(2)
}

