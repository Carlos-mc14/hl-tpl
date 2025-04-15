"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  Coffee,
  Clock,
  PenToolIcon as Tool,
  Trash2,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  PlayCircle,
  Loader2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ExtraService {
  _id: string
  serviceType: string
  description: string
  status: string
  price: number
  requestedAt: string
  completedAt?: string
  notes?: string
  reservation: {
    confirmationCode: string
    roomNumber: string
    guestName: string
    checkInDate: string
    checkOutDate: string
  }
  requestedByUser?: {
    firstName: string
    lastName: string
    email: string
  }
  handledByUser?: {
    firstName: string
    lastName: string
    email: string
  }
}

export function ExtraServicesDashboard() {
  const [services, setServices] = useState<ExtraService[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedService, setSelectedService] = useState<ExtraService | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("all")

  useEffect(() => {
    fetchServices()
  }, [])

  const fetchServices = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/extra-services")
      if (!response.ok) {
        throw new Error("Failed to fetch services")
      }
      const data = await response.json()
      setServices(data)
    } catch (error) {
      console.error("Error fetching services:", error)
      toast({
        title: "Error",
        description: "Failed to load extra services",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (serviceId: string, newStatus: string) => {
    try {
      setActionLoading(true)
      const response = await fetch(`/api/extra-services/${serviceId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error("Failed to update service status")
      }

      // Update the local state
      setServices((prevServices) =>
        prevServices.map((service) => (service._id === serviceId ? { ...service, status: newStatus } : service)),
      )

      toast({
        title: "Status Updated",
        description: `Service status changed to ${newStatus}`,
      })

      // Close the details dialog if open
      if (isDetailsOpen) {
        setIsDetailsOpen(false)
      }
    } catch (error) {
      console.error("Error updating service status:", error)
      toast({
        title: "Error",
        description: "Failed to update service status",
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteService = async (serviceId: string) => {
    try {
      setActionLoading(true)
      const response = await fetch(`/api/extra-services/${serviceId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete service")
      }

      // Update the local state
      setServices((prevServices) => prevServices.filter((service) => service._id !== serviceId))

      toast({
        title: "Service Deleted",
        description: "The service request has been deleted",
      })

      // Close the dialogs
      setIsDeleteDialogOpen(false)
      setIsDetailsOpen(false)
    } catch (error) {
      console.error("Error deleting service:", error)
      toast({
        title: "Error",
        description: "Failed to delete service",
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }

  const getServiceIcon = (type: string) => {
    switch (type) {
      case "Room Service":
        return <Coffee className="h-4 w-4" />
      case "Extra Hours":
        return <Clock className="h-4 w-4" />
      case "Cleaning":
        return <CheckCircle className="h-4 w-4" />
      case "Maintenance":
        return <Tool className="h-4 w-4" />
      default:
        return <MoreHorizontal className="h-4 w-4" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending":
        return <Badge className="bg-yellow-500">Pending</Badge>
      case "In Progress":
        return <Badge className="bg-blue-500">In Progress</Badge>
      case "Completed":
        return <Badge className="bg-green-500">Completed</Badge>
      case "Cancelled":
        return <Badge className="bg-red-500">Cancelled</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "PPP", { locale: es })
    } catch (e) {
      return "Invalid date"
    }
  }

  const formatDateTime = (dateString: string) => {
    if (!dateString) return "N/A"
    try {
      return format(new Date(dateString), "PPP 'at' HH:mm", { locale: es })
    } catch (e) {
      return "Invalid date"
    }
  }

  const filteredServices = services.filter((service) => {
    if (activeTab === "all") return true
    return service.status.toLowerCase() === activeTab.toLowerCase()
  })

  return (
    <div className="space-y-4">
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="in progress">In Progress</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Extra Services</CardTitle>
          <CardDescription>Manage additional services requested by guests</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">No service requests found</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Guest</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredServices.map((service) => (
                    <TableRow key={service._id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getServiceIcon(service.serviceType)}
                          <span>{service.serviceType}</span>
                        </div>
                      </TableCell>
                      <TableCell>{service.reservation.roomNumber}</TableCell>
                      <TableCell>{service.reservation.guestName}</TableCell>
                      <TableCell>{formatDate(service.requestedAt)}</TableCell>
                      <TableCell>{getStatusBadge(service.status)}</TableCell>
                      <TableCell>S/. {service.price.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedService(service)
                                setIsDetailsOpen(true)
                              }}
                            >
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {service.status === "Pending" && (
                              <DropdownMenuItem onClick={() => handleStatusChange(service._id, "In Progress")}>
                                <PlayCircle className="mr-2 h-4 w-4" />
                                Mark as In Progress
                              </DropdownMenuItem>
                            )}
                            {(service.status === "Pending" || service.status === "In Progress") && (
                              <DropdownMenuItem onClick={() => handleStatusChange(service._id, "Completed")}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Mark as Completed
                              </DropdownMenuItem>
                            )}
                            {service.status === "Pending" && (
                              <DropdownMenuItem onClick={() => handleStatusChange(service._id, "Cancelled")}>
                                <XCircle className="mr-2 h-4 w-4" />
                                Cancel Service
                              </DropdownMenuItem>
                            )}
                            {service.status === "Pending" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => {
                                    setSelectedService(service)
                                    setIsDeleteDialogOpen(true)
                                  }}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Service Details Dialog */}
      {selectedService && (
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Service Request Details</DialogTitle>
              <DialogDescription>Information about the service request</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium">Service Type</h4>
                  <div className="flex items-center gap-2 mt-1">
                    {getServiceIcon(selectedService.serviceType)}
                    <p>{selectedService.serviceType}</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium">Status</h4>
                  <div className="mt-1">{getStatusBadge(selectedService.status)}</div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium">Description</h4>
                <p className="mt-1 text-sm">{selectedService.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium">Price</h4>
                  <p className="mt-1">S/. {selectedService.price.toFixed(2)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium">Room</h4>
                  <p className="mt-1">{selectedService.reservation.roomNumber}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium">Guest</h4>
                  <p className="mt-1">{selectedService.reservation.guestName}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium">Reservation</h4>
                  <p className="mt-1">{selectedService.reservation.confirmationCode}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium">Requested At</h4>
                  <p className="mt-1">{formatDateTime(selectedService.requestedAt)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium">Completed At</h4>
                  <p className="mt-1">
                    {selectedService.completedAt ? formatDateTime(selectedService.completedAt) : "Not completed yet"}
                  </p>
                </div>
              </div>

              {selectedService.requestedByUser && (
                <div>
                  <h4 className="text-sm font-medium">Requested By</h4>
                  <p className="mt-1">
                    {selectedService.requestedByUser.firstName} {selectedService.requestedByUser.lastName} (
                    {selectedService.requestedByUser.email})
                  </p>
                </div>
              )}

              {selectedService.handledByUser && (
                <div>
                  <h4 className="text-sm font-medium">Handled By</h4>
                  <p className="mt-1">
                    {selectedService.handledByUser.firstName} {selectedService.handledByUser.lastName} (
                    {selectedService.handledByUser.email})
                  </p>
                </div>
              )}

              {selectedService.notes && (
                <div>
                  <h4 className="text-sm font-medium">Notes</h4>
                  <p className="mt-1 text-sm">{selectedService.notes}</p>
                </div>
              )}
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
                Close
              </Button>
              {selectedService.status === "Pending" && (
                <>
                  <Button
                    variant="default"
                    onClick={() => handleStatusChange(selectedService._id, "In Progress")}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <PlayCircle className="mr-2 h-4 w-4" />
                    )}
                    Mark as In Progress
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setIsDetailsOpen(false)
                      setIsDeleteDialogOpen(true)
                    }}
                    disabled={actionLoading}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </>
              )}
              {(selectedService.status === "Pending" || selectedService.status === "In Progress") && (
                <Button
                  variant="default"
                  onClick={() => handleStatusChange(selectedService._id, "Completed")}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  )}
                  Mark as Completed
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {selectedService && (
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this service request? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={actionLoading}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDeleteService(selectedService._id)}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

