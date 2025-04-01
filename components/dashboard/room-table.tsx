"use client"

import { useState, useEffect, useMemo } from "react"
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Plus,
  RefreshCw,
  BedDouble,
  CheckCircle,
  XCircle,
  Clock,
  Wrench,
  Brush,
  X,
  SearchX,
  Loader2,
  Info,
} from "lucide-react"

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
import { RoomDialog } from "@/components/dashboard/room-dialog"
import { RoomStatusDialog } from "@/components/dashboard/room-status-dialog"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { RoomDetailsDialog } from "@/components/dashboard/room-details-dialog"

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

export function RoomTable() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [floorFilter, setFloorFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [floors, setFloors] = useState<string[]>([])
  // Añadir un estado para el contador de habitaciones filtradas
  const [filteredCount, setFilteredCount] = useState<number>(0)
  const [totalCount, setTotalCount] = useState<number>(0)

  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [selectedRoomForDetails, setSelectedRoomForDetails] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch rooms from the API
  const fetchRooms = async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Añadir un parámetro de timestamp para evitar la caché del navegador
      const timestamp = new Date().getTime()
      const response = await fetch(`/api/admin/rooms?withType=true&t=${timestamp}`)
      if (!response.ok) {
        throw new Error("Failed to fetch rooms")
      }
      const data = await response.json()
      setRooms(data)

      // Extract unique floors
      const uniqueFloors = Array.from(new Set(data.map((room: Room) => room.floor)))
      setFloors((uniqueFloors as string[]).sort())
      setTotalCount(data.length)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while fetching rooms")
      toast({
        title: "Error",
        description: "Failed to load rooms. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch room types from the API
  const fetchRoomTypes = async () => {
    try {
      const response = await fetch("/api/admin/room-types")
      if (!response.ok) {
        throw new Error("Failed to fetch room types")
      }
      const data = await response.json()
      setRoomTypes(data)
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to load room types. Some features may be limited.",
        variant: "destructive",
      })
    }
  }

  // Load rooms and room types on component mount
  // Actualizar el useEffect para establecer el contador total cuando se cargan las habitaciones
  useEffect(() => {
    fetchRooms()
    fetchRoomTypes()
  }, [])

  // Filter rooms based on search term and filters
  // Actualizar la función que filtra las habitaciones para actualizar también el contador
  const filteredRooms = useMemo(() => {
    // Search filter
    const filtered = rooms.filter((room) => {
      const matchesSearch =
        room.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (room.roomType?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (room.notes || "").toLowerCase().includes(searchTerm.toLowerCase())

      // Status filter
      const matchesStatus = statusFilter === "all" || room.status === statusFilter

      // Floor filter
      const matchesFloor = floorFilter === "all" || room.floor === floorFilter

      // Type filter
      const matchesType = typeFilter === "all" || room.roomType?.name === typeFilter

      return matchesSearch && matchesStatus && matchesFloor && matchesType
    })

    // Actualizar el contador de habitaciones filtradas
    setFilteredCount(filtered.length)

    return filtered
  }, [rooms, searchTerm, statusFilter, floorFilter, typeFilter])

  const handleEdit = (room: Room) => {
    setSelectedRoom(room)
    setDialogOpen(true)
  }

  const handleStatusChange = (room: Room) => {
    setSelectedRoom(room)
    setStatusDialogOpen(true)
  }

  const handleAddNew = () => {
    setSelectedRoom(null)
    setDialogOpen(true)
  }

  const handleDeleteClick = (room: Room) => {
    setSelectedRoom(room)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!selectedRoom) return

    try {
      const response = await fetch(`/api/admin/rooms/${selectedRoom._id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to delete room")
      }

      // Remove room from the list
      setRooms(rooms.filter((room) => room._id !== selectedRoom._id))
      toast({
        title: "Success",
        description: "Room deleted successfully",
      })
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete room",
        variant: "destructive",
      })
    } finally {
      setDeleteDialogOpen(false)
    }
  }

  const handleRoomUpdated = (updatedRoom: Room) => {
    // Update the room in the list
    setRooms(rooms.map((room) => (room._id === updatedRoom._id ? updatedRoom : room)))
  }

  const handleRoomCreated = (newRoom: Room) => {
    // Add the new room to the list
    setRooms([...rooms, newRoom])
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Available":
        return <Badge className="bg-green-500">{status}</Badge>
      case "Occupied":
        return <Badge className="bg-blue-500">{status}</Badge>
      case "Maintenance":
        return <Badge className="bg-orange-500">{status}</Badge>
      case "Cleaning":
        return <Badge className="bg-yellow-500">{status}</Badge>
      case "Reserved":
        return <Badge className="bg-purple-500">{status}</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Available":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "Occupied":
        return <BedDouble className="h-4 w-4 text-blue-500" />
      case "Maintenance":
        return <Wrench className="h-4 w-4 text-orange-500" />
      case "Cleaning":
        return <Brush className="h-4 w-4 text-yellow-500" />
      case "Reserved":
        return <Clock className="h-4 w-4 text-purple-500" />
      default:
        return <XCircle className="h-4 w-4" />
    }
  }

  const handleViewDetails = (roomId: string) => {
    setSelectedRoomForDetails(roomId)
    setDetailsDialogOpen(true)
  }

  // Get unique room types from the rooms data
  const uniqueRoomTypes = Array.from(
    new Set(rooms.filter((room) => room.roomType?.name).map((room) => room.roomType?.name)),
  )

  const handleDeleteRoom = async (roomId: string) => {
    try {
      setIsDeleting(true)
      const response = await fetch(`/api/admin/rooms/${roomId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to delete room")
      }

      // Add toast notification
      toast({
        title: "Room deleted",
        description: "The room has been successfully deleted.",
      })

      // Remove the deleted room from the state
      setRooms((prev) => prev.filter((room) => room._id !== roomId))
    } catch (err) {
      console.error("Error deleting room:", err)
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

  // Reemplazar la parte de la interfaz de filtros con una versión mejorada
  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <Input
                placeholder="Search rooms..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:w-[300px]"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-[150px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Available">Available</SelectItem>
                    <SelectItem value="Occupied">Occupied</SelectItem>
                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                    <SelectItem value="Cleaning">Cleaning</SelectItem>
                    <SelectItem value="Reserved">Reserved</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={floorFilter} onValueChange={setFloorFilter}>
                  <SelectTrigger className="w-full md:w-[150px]">
                    <SelectValue placeholder="Filter by floor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Floors</SelectItem>
                    {floors.map((floor) => (
                      <SelectItem key={floor} value={floor}>
                        Floor {floor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full md:w-[150px]">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {uniqueRoomTypes.map((type) => (
                      <SelectItem key={type} value={type as string}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={fetchRooms} variant="outline" size="icon" title="Refresh rooms">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button onClick={handleAddNew}>
                <Plus className="mr-2 h-4 w-4" />
                Add Room
              </Button>
            </div>
          </div>

          {/* Contador de habitaciones y resumen de filtros */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/40 p-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="bg-background">
                Showing {filteredCount} of {totalCount} rooms
              </Badge>

              {statusFilter !== "all" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Status: {statusFilter}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-1 h-4 w-4 rounded-full p-0 hover:bg-secondary"
                    onClick={() => setStatusFilter("all")}
                  >
                    <X className="h-3 w-3" />
                    <span className="sr-only">Clear status filter</span>
                  </Button>
                </Badge>
              )}

              {floorFilter !== "all" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Floor: {floorFilter}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-1 h-4 w-4 rounded-full p-0 hover:bg-secondary"
                    onClick={() => setFloorFilter("all")}
                  >
                    <X className="h-3 w-3" />
                    <span className="sr-only">Clear floor filter</span>
                  </Button>
                </Badge>
              )}

              {typeFilter !== "all" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Type: {typeFilter}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-1 h-4 w-4 rounded-full p-0 hover:bg-secondary"
                    onClick={() => setTypeFilter("all")}
                  >
                    <X className="h-3 w-3" />
                    <span className="sr-only">Clear type filter</span>
                  </Button>
                </Badge>
              )}

              {(statusFilter !== "all" || floorFilter !== "all" || typeFilter !== "all" || searchTerm) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={() => {
                    setStatusFilter("all")
                    setFloorFilter("all")
                    setTypeFilter("all")
                    setSearchTerm("")
                  }}
                >
                  <X className="h-3 w-3" />
                  Clear all filters
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              {/* Estadísticas rápidas */}
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  {rooms.filter((room) => room.status === "Available").length} Available
                </Badge>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {rooms.filter((room) => room.status === "Occupied").length} Occupied
                </Badge>
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                  {rooms.filter((room) => room.status === "Reserved").length} Reserved
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Room Number</TableHead>
                <TableHead>Floor</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Base Price</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    <div className="flex items-center justify-center">
                      <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
                      <span>Loading rooms...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-red-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <XCircle className="h-6 w-6 text-red-500" />
                      <p>{error}</p>
                      <Button variant="outline" size="sm" onClick={fetchRooms}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Try Again
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredRooms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <SearchX className="h-6 w-6 text-muted-foreground" />
                      <p>No rooms found matching your filters.</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setStatusFilter("all")
                          setFloorFilter("all")
                          setTypeFilter("all")
                          setSearchTerm("")
                        }}
                      >
                        Clear Filters
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRooms.map((room) => (
                  <TableRow key={room._id} className="group hover:bg-muted/50">
                    <TableCell className="font-medium">{room.number}</TableCell>
                    <TableCell>{room.floor}</TableCell>
                    <TableCell>{room.roomType?.name || "Unknown"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(room.status)}
                        {getStatusBadge(room.status)}
                      </div>
                    </TableCell>
                    <TableCell>${room.roomType?.basePrice.toFixed(2) || "N/A"}</TableCell>
                    <TableCell>{room.roomType?.capacity || "N/A"}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {room.notes ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help underline decoration-dotted">{room.notes}</span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>{room.notes}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        "-"
                      )}
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
                          <DropdownMenuItem onClick={() => handleEdit(room)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewDetails(room._id.toString())}>
                            <Info className="mr-2 h-4 w-4" />
                            Ver Detalles
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(room)}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Change Status
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDeleteClick(room)} className="text-red-600">
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

        {/* Room Dialog for Create/Edit */}
        <RoomDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          room={selectedRoom}
          roomTypes={roomTypes}
          onRoomUpdated={handleRoomUpdated}
          onRoomCreated={handleRoomCreated}
        />

        {/* Room Status Dialog */}
        <RoomStatusDialog
          open={statusDialogOpen}
          onOpenChange={setStatusDialogOpen}
          room={selectedRoom}
          onRoomUpdated={handleRoomUpdated}
        />

        {/* Confirmation Dialog for Delete */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the room
                {selectedRoom && ` "${selectedRoom.number}"`}.
                {selectedRoom?.status === "Occupied" && (
                  <p className="mt-2 font-bold text-red-500">Warning: This room is currently occupied!</p>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => selectedRoom?._id && handleDeleteRoom(selectedRoom._id)}
                className="bg-red-600 hover:bg-red-700"
                disabled={isDeleting}
              >
                Delete
                {isDeleting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <RoomDetailsDialog
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
          roomId={selectedRoomForDetails}
        />
      </div>
    </TooltipProvider>
  )
}

