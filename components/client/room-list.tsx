"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bed, Users, DollarSign, ChevronLeft, ChevronRight } from "lucide-react"

interface RoomType {
  _id: string
  name: string
  description: string
  basePrice: number
  capacity: number
  amenities: string[]
  images: string[]
  availableCount: number
  rooms: any[]
}

interface RoomListProps {
  roomTypes: RoomType[]
}

export default function RoomList({ roomTypes }: RoomListProps) {
  // State to track current image for each room type
  const [currentImageIndex, setCurrentImageIndex] = useState<Record<string, number>>({})

  // Function to get current image index for a room type
  const getCurrentImageIndex = (roomTypeId: string) => {
    return currentImageIndex[roomTypeId] || 0
  }

  // Function to navigate to next image
  const nextImage = (roomTypeId: string, imagesLength: number) => {
    setCurrentImageIndex((prev) => ({
      ...prev,
      [roomTypeId]: (prev[roomTypeId] + 1) % imagesLength || 1,
    }))
  }

  // Function to navigate to previous image
  const prevImage = (roomTypeId: string, imagesLength: number) => {
    setCurrentImageIndex((prev) => ({
      ...prev,
      [roomTypeId]: prev[roomTypeId] === 0 ? imagesLength - 1 : prev[roomTypeId] - 1,
    }))
  }

  if (roomTypes.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold mb-2">No rooms available</h3>
        <p className="text-muted-foreground">Please check back later for availability.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      {roomTypes.map((roomType) => (
        <Card key={roomType._id} className="overflow-hidden flex flex-col h-full">
          <div className="relative h-64 bg-muted">
            {roomType.images && roomType.images.length > 0 ? (
              <>
                <img
                  src={roomType.images[getCurrentImageIndex(roomType._id)] || "/placeholder.svg"}
                  alt={roomType.name}
                  className="w-full h-full object-cover"
                />
                {roomType.images.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full p-1"
                      onClick={(e) => {
                        e.preventDefault()
                        prevImage(roomType._id, roomType.images.length)
                      }}
                    >
                      <ChevronLeft className="h-5 w-5" />
                      <span className="sr-only">Previous image</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full p-1"
                      onClick={(e) => {
                        e.preventDefault()
                        nextImage(roomType._id, roomType.images.length)
                      }}
                    >
                      <ChevronRight className="h-5 w-5" />
                      <span className="sr-only">Next image</span>
                    </Button>
                    <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                      {roomType.images.map((_, index) => (
                        <span
                          key={index}
                          className={`block w-2 h-2 rounded-full ${
                            index === getCurrentImageIndex(roomType._id) ? "bg-white" : "bg-white/50"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <Bed className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
          </div>
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle className="text-xl">{roomType.name}</CardTitle>
              <Badge variant="outline" className="flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5" />
                {roomType.basePrice.toFixed(2)}
              </Badge>
            </div>
            <CardDescription className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              Up to {roomType.capacity} guests
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <p className="text-sm text-muted-foreground mb-4">{roomType.description}</p>
            <div className="flex flex-wrap gap-1 mt-2">
              {roomType.amenities.slice(0, 4).map((amenity, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {amenity}
                </Badge>
              ))}
              {roomType.amenities.length > 4 && (
                <Badge variant="secondary" className="text-xs">
                  +{roomType.amenities.length - 4} more
                </Badge>
              )}
            </div>
          </CardContent>
          <CardFooter className="border-t pt-4">
            <div className="w-full flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {roomType.availableCount} {roomType.availableCount === 1 ? "room" : "rooms"} available
              </p>
              <Link href={`/reservations?roomType=${roomType._id}`}>
                <Button>Book Now</Button>
              </Link>
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}

