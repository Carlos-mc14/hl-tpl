"use client"

import type React from "react"

import { useState } from "react"

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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { CheckCircle, BedDouble, Wrench, Brush, Clock, XCircle, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

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

interface RoomStatusDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  room: Room | null
  onRoomUpdated?: (room: Room) => void
}

export function RoomStatusDialog({ open, onOpenChange, room, onRoomUpdated }: RoomStatusDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<string>("")
  const [notes, setNotes] = useState<string>("")
  const [error, setError] = useState<string | null>(null)

  // Initialize form when dialog opens
  useState(() => {
    if (room) {
      setStatus(room.status)
      setNotes(room.notes || "")
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!room) return
    if (!status) {
      setError("Status is required")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/rooms/${room._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          notes,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to update room status")
      }

      const responseData = await response.json()

      toast({
        title: "Status updated",
        description: `Room ${room.number} status has been updated to ${status}.`,
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

      // Close the dialog
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "An error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (statusValue: string) => {
    switch (statusValue) {
      case "Available":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "Occupied":
        return <BedDouble className="h-5 w-5 text-blue-500" />
      case "Maintenance":
        return <Wrench className="h-5 w-5 text-orange-500" />
      case "Cleaning":
        return <Brush className="h-5 w-5 text-yellow-500" />
      case "Reserved":
        return <Clock className="h-5 w-5 text-purple-500" />
      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Change Room Status
              <Badge variant="outline" className="ml-2 font-normal">
                Room {room?.number}
              </Badge>
            </DialogTitle>
            <DialogDescription>Update the status of this room and add optional notes</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-500 flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <Select value={status} onValueChange={setStatus} disabled={isLoading}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select status">
                    {status && (
                      <div className="flex items-center gap-2">
                        {getStatusIcon(status)}
                        <span>{status}</span>
                      </div>
                    )}
                  </SelectValue>
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
            </div>

            {room && (
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="currentStatus" className="text-right pt-2">
                  Current Status
                </Label>
                <div className="col-span-3 flex items-center gap-2 p-2 rounded-md bg-muted/50">
                  {getStatusIcon(room.status)}
                  <span>{room.status}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">
                Notes
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="col-span-3"
                placeholder="Add notes about this status change"
                disabled={isLoading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Status"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

