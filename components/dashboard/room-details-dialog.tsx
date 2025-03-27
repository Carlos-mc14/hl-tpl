"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Calendar, User, Mail, Phone, Clock, DollarSign, MessageSquare, Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface RoomDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  roomId: string | null
}

export function RoomDetailsDialog({ open, onOpenChange, roomId }: RoomDetailsDialogProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [roomDetails, setRoomDetails] = useState<any>(null)
  const [reservationDetails, setReservationDetails] = useState<any>(null)

  useEffect(() => {
    if (open && roomId) {
      fetchRoomDetails()
    }
  }, [open, roomId])

  const fetchRoomDetails = async () => {
    if (!roomId) return

    setIsLoading(true)
    setError(null)

    try {
      // Obtener detalles de la habitación
      const roomResponse = await fetch(`/api/admin/rooms/${roomId}?withType=true`)
      if (!roomResponse.ok) {
        throw new Error("No se pudo obtener la información de la habitación")
      }

      const roomData = await roomResponse.json()
      setRoomDetails(roomData)

      // Si la habitación está ocupada o reservada, obtener detalles de la reserva
      if (roomData.status === "Occupied" || roomData.status === "Reserved") {
        const reservationsResponse = await fetch(`/api/admin/reservations/by-room/${roomId}`)
        if (reservationsResponse.ok) {
          const reservationsData = await reservationsResponse.json()
          if (reservationsData && reservationsData.length > 0) {
            // Obtener la reserva activa (la más reciente)
            const activeReservation = reservationsData[0]
            setReservationDetails(activeReservation)
          }
        }
      } else {
        setReservationDetails(null)
      }
    } catch (err) {
      console.error("Error al obtener detalles de la habitación:", err)
      setError(err instanceof Error ? err.message : "Error al cargar los detalles")
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "PPP", { locale: es })
    } catch (e) {
      return "Fecha no disponible"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Detalles de la Habitación</DialogTitle>
          <DialogDescription>Información detallada sobre la habitación y su reserva actual</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : roomDetails ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Número</h3>
                <p className="text-lg font-semibold">{roomDetails.number}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Piso</h3>
                <p className="text-lg font-semibold">{roomDetails.floor}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Tipo</h3>
                <p className="text-lg font-semibold">{roomDetails.roomType?.name || "No disponible"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Estado</h3>
                <Badge
                  className={
                    roomDetails.status === "Available"
                      ? "bg-green-500"
                      : roomDetails.status === "Occupied"
                        ? "bg-blue-500"
                        : roomDetails.status === "Reserved"
                          ? "bg-purple-500"
                          : roomDetails.status === "Cleaning"
                            ? "bg-yellow-500"
                            : roomDetails.status === "Maintenance"
                              ? "bg-orange-500"
                              : "bg-gray-500"
                  }
                >
                  {roomDetails.status}
                </Badge>
              </div>
            </div>

            {roomDetails.notes && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Notas</h3>
                <p className="text-sm mt-1 p-2 bg-muted rounded-md">{roomDetails.notes}</p>
              </div>
            )}

            {reservationDetails && (
              <>
                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-4">Información de Reserva</h3>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <h4 className="text-sm font-medium">Check-in</h4>
                          <p>{formatDate(reservationDetails.checkInDate)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <h4 className="text-sm font-medium">Check-out</h4>
                          <p>{formatDate(reservationDetails.checkOutDate)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Huésped</h4>
                      <div className="bg-muted p-3 rounded-md space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <p>
                            {reservationDetails.guest.firstName} {reservationDetails.guest.lastName}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <p>{reservationDetails.guest.email}</p>
                        </div>
                        {reservationDetails.guest.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <p>{reservationDetails.guest.phone}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <h4 className="text-sm font-medium">Duración</h4>
                          <p>{reservationDetails.nights || "?"} noches</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <h4 className="text-sm font-medium">Precio Total</h4>
                          <p>S/. {reservationDetails.totalPrice?.toFixed(2) || "0.00"}</p>
                        </div>
                      </div>
                    </div>

                    {reservationDetails.specialRequests && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                          <h4 className="text-sm font-medium">Solicitudes Especiales</h4>
                        </div>
                        <p className="text-sm p-2 bg-muted/50 rounded-md">{reservationDetails.specialRequests}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium">Código de Confirmación:</h4>
                      <Badge variant="outline" className="font-mono">
                        {reservationDetails.confirmationCode}
                      </Badge>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="py-4 text-center text-muted-foreground">No se encontró información para esta habitación</div>
        )}

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

