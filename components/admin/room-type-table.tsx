"use client"

import { useState, useEffect } from "react"
import { MoreHorizontal, Pencil, Trash2, Plus, RefreshCw, Bed, DollarSign, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { RoomTypeDialog } from "@/components/admin/room-type-dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "@/components/ui/use-toast"

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

export function RoomTypeTable() {
  const [searchTerm, setSearchTerm] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedRoomType, setSelectedRoomType] = useState<RoomType | null>(null)
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch room types from the API
  const fetchRoomTypes = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/room-types")
      if (!response.ok) {
        throw new Error("Failed to fetch room types")
      }
      const data = await response.json()
      setRoomTypes(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while fetching room types")
      toast({
        title: "Error",
        description: "Failed to load room types. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Load room types on component mount
  useEffect(() => {
    fetchRoomTypes()
  }, [])

  const filteredRoomTypes = roomTypes.filter(
    (roomType) =>
      roomType.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      roomType.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      roomType.amenities.some((amenity) => amenity.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  const handleEdit = (roomType: RoomType) => {
    setSelectedRoomType(roomType)
    setDialogOpen(true)
  }

  const handleAddNew = () => {
    setSelectedRoomType(null)
    setDialogOpen(true)
  }

  const handleDeleteClick = (roomType: RoomType) => {
    setSelectedRoomType(roomType)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!selectedRoomType) return

    try {
      const response = await fetch(`/api/admin/room-types/${selectedRoomType._id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to delete room type")
      }

      // Remove room type from the list
      setRoomTypes(roomTypes.filter((roomType) => roomType._id !== selectedRoomType._id))
      toast({
        title: "Success",
        description: "Room type deleted successfully",
      })
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete room type",
        variant: "destructive",
      })
    } finally {
      setDeleteDialogOpen(false)
    }
  }

  const handleRoomTypeUpdated = (updatedRoomType: RoomType) => {
    // Update the room type in the list
    setRoomTypes(roomTypes.map((roomType) => (roomType._id === updatedRoomType._id ? updatedRoomType : roomType)))
  }

  const handleRoomTypeCreated = (newRoomType: RoomType) => {
    // Add the new room type to the list
    setRoomTypes([...roomTypes, newRoomType])
  }

  // Add toast notifications for delete operation
  const handleDeleteRoomType = async (roomTypeId: string) => {
    try {
      setIsDeleting(true)
      const response = await fetch(`/api/admin/room-types/${roomTypeId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to delete room type")
      }

      // Add toast notification
      toast({
        title: "Room type deleted",
        description: "The room type has been successfully deleted.",
      })

      // Remove the deleted room type from the state
      setRoomTypes((prev) => prev.filter((roomType) => roomType._id !== roomTypeId))
    } catch (err) {
      console.error("Error deleting room type:", err)
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "An error occurred",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search room types..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-[300px]"
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchRoomTypes} variant="outline" size="icon" title="Refresh room types">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={handleAddNew}>
            <Plus className="mr-2 h-4 w-4" />
            Add Room Type
          </Button>
        </div>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Base Price</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Amenities</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Loading room types...
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-red-500">
                  {error}
                </TableCell>
              </TableRow>
            ) : filteredRoomTypes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No room types found.
                </TableCell>
              </TableRow>
            ) : (
              filteredRoomTypes.map((roomType) => (
                <TableRow key={roomType._id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Bed className="h-4 w-4 text-muted-foreground" />
                      {roomType.name}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate">{roomType.description}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      {roomType.basePrice.toFixed(2)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      {roomType.capacity}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {roomType.amenities.slice(0, 3).map((amenity, index) => (
                        <Badge key={index} variant="outline">
                          {amenity}
                        </Badge>
                      ))}
                      {roomType.amenities.length > 3 && (
                        <Badge variant="outline">+{roomType.amenities.length - 3} more</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleEdit(roomType)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDeleteClick(roomType)} className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Room Type Dialog for Create/Edit */}
      <RoomTypeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        roomType={selectedRoomType}
        onRoomTypeUpdated={handleRoomTypeUpdated}
        onRoomTypeCreated={handleRoomTypeCreated}
      />

      {/* Confirmation Dialog for Delete */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the room type
              {selectedRoomType && ` "${selectedRoomType.name}"`}.
              <p className="mt-2 font-medium text-amber-600">
                Note: You cannot delete a room type that is currently assigned to rooms.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => (selectedRoomType ? handleDeleteRoomType(selectedRoomType._id) : null)}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

