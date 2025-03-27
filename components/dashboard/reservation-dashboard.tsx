"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Calendar,
  Search,
  RefreshCw,
  Loader2,
  UserCheck,
  UserX,
  MoreHorizontal,
  Clock,
  AlertCircle,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "@/components/ui/use-toast"
import { ReservationDetailsDialog } from "@/components/dashboard/reservation-details-dialog"

interface DateRange {
  label: string
  start: string
  end: string
  displayDate: string
}

interface ReservationDashboardProps {
  dateRanges: {
    today: DateRange
    tomorrow: DateRange
    thisWeek: DateRange
    thisMonth: DateRange
  }
}

export function ReservationDashboard({ dateRanges }: ReservationDashboardProps) {
  const [activeTab, setActiveTab] = useState("today")
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reservations, setReservations] = useState<any[]>([])
  const [filteredReservations, setFilteredReservations] = useState<any[]>([])
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<any>(null)

  // Cargar reservaciones según el período seleccionado
  useEffect(() => {
    fetchReservations()
  }, [activeTab])

  // Filtrar reservaciones cuando cambia el término de búsqueda
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredReservations(reservations)
    } else {
      const lowercaseSearch = searchTerm.toLowerCase()
      const filtered = reservations.filter(
        (reservation) =>
          reservation.guest.firstName.toLowerCase().includes(lowercaseSearch) ||
          reservation.guest.lastName.toLowerCase().includes(lowercaseSearch) ||
          reservation.guest.email.toLowerCase().includes(lowercaseSearch) ||
          reservation.confirmationCode.toLowerCase().includes(lowercaseSearch) ||
          (reservation.room?.number && reservation.room.number.toLowerCase().includes(lowercaseSearch)),
      )
      setFilteredReservations(filtered)
    }
  }, [searchTerm, reservations])

  const fetchReservations = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const currentRange = dateRanges[activeTab as keyof typeof dateRanges]
      const response = await fetch(
        `/api/admin/reservations?startDate=${currentRange.start}&endDate=${currentRange.end}`,
      )

      if (!response.ok) {
        throw new Error("Error al cargar las reservaciones")
      }

      const data = await response.json()
      setReservations(data)
      setFilteredReservations(data)
    } catch (err) {
      console.error("Error fetching reservations:", err)
      setError(err instanceof Error ? err.message : "Error al cargar las reservaciones")
      toast({
        title: "Error",
        description: "No se pudieron cargar las reservaciones. Por favor, intente nuevamente.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewDetails = (reservation: any) => {
    setSelectedReservation(reservation)
    setDetailsDialogOpen(true)
  }

  const handleCheckIn = async (reservationId: string) => {
    try {
      const response = await fetch(`/api/admin/reservations/${reservationId}/check-in`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Error al realizar el check-in")
      }

      toast({
        title: "Check-in completado",
        description: "El huésped ha sido registrado correctamente.",
      })

      // Actualizar la lista de reservaciones
      fetchReservations()
    } catch (err) {
      console.error("Error during check-in:", err)
      toast({
        title: "Error",
        description: "No se pudo completar el check-in. Por favor, intente nuevamente.",
        variant: "destructive",
      })
    }
  }

  const handleCheckOut = async (reservationId: string) => {
    try {
      const response = await fetch(`/api/admin/reservations/${reservationId}/check-out`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Error al realizar el check-out")
      }

      toast({
        title: "Check-out completado",
        description: "El huésped ha salido correctamente.",
      })

      // Actualizar la lista de reservaciones
      fetchReservations()
    } catch (err) {
      console.error("Error during check-out:", err)
      toast({
        title: "Error",
        description: "No se pudo completar el check-out. Por favor, intente nuevamente.",
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Confirmed":
        return <Badge className="bg-green-500">Confirmada</Badge>
      case "Checked-in":
        return <Badge className="bg-blue-500">Registrado</Badge>
      case "Checked-out":
        return <Badge className="bg-gray-500">Finalizada</Badge>
      case "Cancelled":
        return <Badge className="bg-red-500">Cancelada</Badge>
      case "Pending":
        return <Badge className="bg-yellow-500">Pendiente</Badge>
      case "No-show":
        return <Badge className="bg-red-700">No se presentó</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "Paid":
        return <Badge className="bg-green-500">Pagado</Badge>
      case "Partial":
        return <Badge className="bg-amber-500">Parcial</Badge>
      case "Pending":
        return <Badge className="bg-gray-500">Pendiente</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="today" value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <TabsList>
            <TabsTrigger value="today">Hoy</TabsTrigger>
            <TabsTrigger value="tomorrow">Mañana</TabsTrigger>
            <TabsTrigger value="thisWeek">Esta Semana</TabsTrigger>
            <TabsTrigger value="thisMonth">Este Mes</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar reservaciones..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-[200px] sm:w-[300px]"
              />
            </div>
            <Button variant="outline" size="icon" onClick={fetchReservations} title="Actualizar">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <TabsContent value="today" className="mt-0">
          <ReservationTable
            title="Reservaciones de Hoy"
            description={`Reservaciones para ${dateRanges.today.displayDate}`}
            reservations={filteredReservations}
            isLoading={isLoading}
            error={error}
            onViewDetails={handleViewDetails}
            onCheckIn={handleCheckIn}
            onCheckOut={handleCheckOut}
            getStatusBadge={getStatusBadge}
            getPaymentStatusBadge={getPaymentStatusBadge}
          />
        </TabsContent>

        <TabsContent value="tomorrow" className="mt-0">
          <ReservationTable
            title="Reservaciones de Mañana"
            description={`Reservaciones para ${dateRanges.tomorrow.displayDate}`}
            reservations={filteredReservations}
            isLoading={isLoading}
            error={error}
            onViewDetails={handleViewDetails}
            onCheckIn={handleCheckIn}
            onCheckOut={handleCheckOut}
            getStatusBadge={getStatusBadge}
            getPaymentStatusBadge={getPaymentStatusBadge}
          />
        </TabsContent>

        <TabsContent value="thisWeek" className="mt-0">
          <ReservationTable
            title="Reservaciones de Esta Semana"
            description={`Reservaciones del ${dateRanges.thisWeek.displayDate}`}
            reservations={filteredReservations}
            isLoading={isLoading}
            error={error}
            onViewDetails={handleViewDetails}
            onCheckIn={handleCheckIn}
            onCheckOut={handleCheckOut}
            getStatusBadge={getStatusBadge}
            getPaymentStatusBadge={getPaymentStatusBadge}
          />
        </TabsContent>

        <TabsContent value="thisMonth" className="mt-0">
          <ReservationTable
            title="Reservaciones de Este Mes"
            description={`Reservaciones de ${dateRanges.thisMonth.displayDate}`}
            reservations={filteredReservations}
            isLoading={isLoading}
            error={error}
            onViewDetails={handleViewDetails}
            onCheckIn={handleCheckIn}
            onCheckOut={handleCheckOut}
            getStatusBadge={getStatusBadge}
            getPaymentStatusBadge={getPaymentStatusBadge}
          />
        </TabsContent>
      </Tabs>

      {selectedReservation && (
        <ReservationDetailsDialog
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
          reservation={selectedReservation}
          onCheckIn={() => handleCheckIn(selectedReservation._id)}
          onCheckOut={() => handleCheckOut(selectedReservation._id)}
        />
      )}
    </div>
  )
}

interface ReservationTableProps {
  title: string
  description: string
  reservations: any[]
  isLoading: boolean
  error: string | null
  onViewDetails: (reservation: any) => void
  onCheckIn: (reservationId: string) => void
  onCheckOut: (reservationId: string) => void
  getStatusBadge: (status: string) => React.ReactNode
  getPaymentStatusBadge: (status: string) => React.ReactNode
}

function ReservationTable({
  title,
  description,
  reservations,
  isLoading,
  error,
  onViewDetails,
  onCheckIn,
  onCheckOut,
  getStatusBadge,
  getPaymentStatusBadge,
}: ReservationTableProps) {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    } catch (e) {
      return "Fecha no disponible"
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : reservations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
            <p>No hay reservaciones para este período</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Huésped</TableHead>
                  <TableHead>Habitación</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Check-out</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Pago</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reservations.map((reservation) => (
                  <TableRow key={reservation._id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {reservation.guest.firstName} {reservation.guest.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">{reservation.guest.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {reservation.room ? (
                        <div>
                          <p className="font-medium">{reservation.room.number}</p>
                          <p className="text-sm text-muted-foreground">{reservation.room.roomType}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No asignada</span>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(reservation.checkInDate)}</TableCell>
                    <TableCell>{formatDate(reservation.checkOutDate)}</TableCell>
                    <TableCell>{getStatusBadge(reservation.status)}</TableCell>
                    <TableCell>{getPaymentStatusBadge(reservation.paymentStatus)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Abrir menú</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => onViewDetails(reservation)}>
                            <Clock className="mr-2 h-4 w-4" />
                            Ver Detalles
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {reservation.status === "Confirmed" && (
                            <DropdownMenuItem onClick={() => onCheckIn(reservation._id)}>
                              <UserCheck className="mr-2 h-4 w-4" />
                              Check-in
                            </DropdownMenuItem>
                          )}
                          {reservation.status === "Checked-in" && (
                            <DropdownMenuItem onClick={() => onCheckOut(reservation._id)}>
                              <UserX className="mr-2 h-4 w-4" />
                              Check-out
                            </DropdownMenuItem>
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
  )
}

