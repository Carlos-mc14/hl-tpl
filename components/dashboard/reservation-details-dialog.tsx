"use client"

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
import { Calendar, User, Mail, Phone, Clock, DollarSign, MessageSquare, Bed, UserCheck, UserX } from "lucide-react"

interface ReservationDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reservation: any
  onCheckIn: () => void
  onCheckOut: () => void
}

export function ReservationDetailsDialog({
  open,
  onOpenChange,
  reservation,
  onCheckIn,
  onCheckOut,
}: ReservationDetailsDialogProps) {
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "PPP", { locale: es })
    } catch (e) {
      return "Fecha no disponible"
    }
  }

  const formatDateTime = (dateString: string) => {
    if (!dateString) return null
    try {
      return format(new Date(dateString), "PPP 'a las' HH:mm", { locale: es })
    } catch (e) {
      return null
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

  if (!reservation) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Detalles de la Reserva</DialogTitle>
          <DialogDescription>Información completa de la reserva #{reservation.confirmationCode}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold">Estado de la Reserva</h3>
              <div className="flex gap-2 mt-2">
                {getStatusBadge(reservation.status)}
                {getPaymentStatusBadge(reservation.paymentStatus)}
              </div>
            </div>

            <div className="text-right">
              <p className="text-sm text-muted-foreground">Código de Confirmación</p>
              <p className="font-mono font-bold">{reservation.confirmationCode}</p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <h4 className="text-sm font-medium">Check-in</h4>
                <p>{formatDate(reservation.checkInDate)}</p>
                {reservation.checkedInAt && (
                  <p className="text-xs text-muted-foreground">Realizado: {formatDateTime(reservation.checkedInAt)}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <h4 className="text-sm font-medium">Check-out</h4>
                <p>{formatDate(reservation.checkOutDate)}</p>
                {reservation.checkedOutAt && (
                  <p className="text-xs text-muted-foreground">Realizado: {formatDateTime(reservation.checkedOutAt)}</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Huésped</h4>
            <div className="bg-muted p-3 rounded-md space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <p>
                  {reservation.guest.firstName} {reservation.guest.lastName}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <p>{reservation.guest.email}</p>
              </div>
              {reservation.guest.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <p>{reservation.guest.phone}</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Habitación</h4>
            {reservation.room ? (
              <div className="bg-muted p-3 rounded-md">
                <div className="flex items-center gap-2">
                  <Bed className="h-4 w-4 text-muted-foreground" />
                  <p>
                    Habitación {reservation.room.number} - {reservation.room.roomType}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No hay habitación asignada</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <h4 className="text-sm font-medium">Duración</h4>
                <p>
                  {reservation.adults} adultos, {reservation.children} niños
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <h4 className="text-sm font-medium">Precio Total</h4>
                <p>S/. {reservation.totalPrice?.toFixed(2) || "0.00"}</p>
              </div>
            </div>
          </div>

          {/* Información de quién realizó el check-in/check-out */}
          {(reservation.checkedInAt || reservation.checkedOutAt) && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Registro de Operaciones</h4>
                <div className="space-y-2">
                  {reservation.checkedInAt && (
                    <div className="bg-muted/50 p-2 rounded-md">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-blue-500" />
                        <div>
                          <p className="text-sm font-medium">Check-in realizado por:</p>
                          {reservation.checkedInByUser ? (
                            <p className="text-sm">
                              {reservation.checkedInByUser.firstName} {reservation.checkedInByUser.lastName} (
                              {reservation.checkedInByUser.email})
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground">Usuario no disponible</p>
                          )}
                          <p className="text-xs text-muted-foreground">{formatDateTime(reservation.checkedInAt)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {reservation.checkedOutAt && (
                    <div className="bg-muted/50 p-2 rounded-md">
                      <div className="flex items-center gap-2">
                        <UserX className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-sm font-medium">Check-out realizado por:</p>
                          {reservation.checkedOutByUser ? (
                            <p className="text-sm">
                              {reservation.checkedOutByUser.firstName} {reservation.checkedOutByUser.lastName} (
                              {reservation.checkedOutByUser.email})
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground">Usuario no disponible</p>
                          )}
                          <p className="text-xs text-muted-foreground">{formatDateTime(reservation.checkedOutAt)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {reservation.specialRequests && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-medium">Solicitudes Especiales</h4>
              </div>
              <p className="text-sm p-2 bg-muted/50 rounded-md">{reservation.specialRequests}</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>

          {reservation.status === "Confirmed" && (
            <Button onClick={onCheckIn} className="gap-2">
              <UserCheck className="h-4 w-4" />
              Realizar Check-in
            </Button>
          )}

          {reservation.status === "Checked-in" && (
            <Button onClick={onCheckOut} className="gap-2">
              <UserX className="h-4 w-4" />
              Realizar Check-out
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

