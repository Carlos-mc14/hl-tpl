"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  Coffee,
  Clock,
  PenToolIcon as Tool,
  CheckCircle,
  MoreHorizontal,
  XCircle,
  Loader2,
  AlertCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { ExtraServiceForm } from "@/components/client/extra-service-form"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface ExtraService {
  _id: string
  serviceType: string
  description: string
  status: string
  price: number
  requestedAt: string
  completedAt?: string
  notes?: string
}

interface ExtraServicesListProps {
  reservationId: string
}

export function ExtraServicesList({ reservationId }: ExtraServicesListProps) {
  const [services, setServices] = useState<ExtraService[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedService, setSelectedService] = useState<ExtraService | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchServices()
  }, [reservationId])

  const fetchServices = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/extra-services/reservation/${reservationId}`)

      if (!response.ok) {
        if (response.status === 404) {
          setServices([])
          return
        }
        throw new Error("Failed to fetch services")
      }

      const data = await response.json()
      setServices(data)
    } catch (error) {
      console.error("Error fetching services:", error)
      setError("Failed to load extra services")
    } finally {
      setLoading(false)
    }
  }

  const handleCancelService = async (serviceId: string) => {
    try {
      setActionLoading(true)

      const response = await fetch(`/api/extra-services/${serviceId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "Cancelled" }),
      })

      if (!response.ok) {
        throw new Error("Failed to cancel service")
      }

      // Update the local state
      setServices((prevServices) =>
        prevServices.map((service) => (service._id === serviceId ? { ...service, status: "Cancelled" } : service)),
      )

      toast({
        title: "Service Cancelled",
        description: "Your service request has been cancelled",
      })

      // Close the details dialog if open
      if (isDetailsOpen) {
        setIsDetailsOpen(false)
      }
    } catch (error) {
      console.error("Error cancelling service:", error)
      toast({
        title: "Error",
        description: "Failed to cancel service",
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Extra Services</h3>
        <ExtraServiceForm reservationId={reservationId} onServiceCreated={fetchServices} />
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : services.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <p className="text-muted-foreground mb-4">You haven't requested any extra services yet</p>
            <ExtraServiceForm reservationId={reservationId} onServiceCreated={fetchServices} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {services.map((service) => (
            <Card key={service._id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    {getServiceIcon(service.serviceType)}
                    <CardTitle className="text-base">{service.serviceType}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(service.status)}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedService(service)
                            setIsDetailsOpen(true)
                          }}
                        >
                          View Details
                        </DropdownMenuItem>
                        {service.status === "Pending" && (
                          <DropdownMenuItem onClick={() => handleCancelService(service._id)}>
                            <XCircle className="mr-2 h-4 w-4" />
                            Cancel Request
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <CardDescription className="line-clamp-2">{service.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Requested:</p>
                    <p>{formatDate(service.requestedAt)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Price:</p>
                    <p>S/. {service.price.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
              {service.status === "Pending" && (
                <CardFooter>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleCancelService(service._id)}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="mr-2 h-4 w-4" />
                    )}
                    Cancel Request
                  </Button>
                </CardFooter>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Service Details Dialog */}
      {selectedService && (
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Service Request Details</DialogTitle>
              <DialogDescription>Information about your service request</DialogDescription>
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
                  <h4 className="text-sm font-medium">Requested At</h4>
                  <p className="mt-1">{formatDateTime(selectedService.requestedAt)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium">Price</h4>
                  <p className="mt-1">S/. {selectedService.price.toFixed(2)}</p>
                </div>
              </div>

              {selectedService.completedAt && (
                <div>
                  <h4 className="text-sm font-medium">Completed At</h4>
                  <p className="mt-1">{formatDateTime(selectedService.completedAt)}</p>
                </div>
              )}

              {selectedService.notes && (
                <div>
                  <h4 className="text-sm font-medium">Notes</h4>
                  <p className="mt-1 text-sm">{selectedService.notes}</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
                Close
              </Button>
              {selectedService.status === "Pending" && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    handleCancelService(selectedService._id)
                    setIsDetailsOpen(false)
                  }}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="mr-2 h-4 w-4" />
                  )}
                  Cancel Request
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

