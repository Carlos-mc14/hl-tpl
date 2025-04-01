"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon, Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toast } from "@/components/ui/use-toast"

// Esquema de validación para el formulario
const reservationFormSchema = z.object({
  firstName: z.string().min(2, {
    message: "El nombre debe tener al menos 2 caracteres.",
  }),
  lastName: z.string().min(2, {
    message: "El apellido debe tener al menos 2 caracteres.",
  }),
  email: z.string().email({
    message: "Por favor ingrese un correo electrónico válido.",
  }),
  phone: z.string().optional(),
  roomId: z.string({
    required_error: "Por favor seleccione una habitación.",
  }),
  checkInDate: z.date({
    required_error: "Por favor seleccione una fecha de entrada.",
  }),
  checkOutDate: z.date({
    required_error: "Por favor seleccione una fecha de salida.",
  }),
  adults: z.coerce.number().min(1, {
    message: "Debe haber al menos 1 adulto.",
  }),
  children: z.coerce.number().min(0, {
    message: "El número de niños no puede ser negativo.",
  }),
  totalPrice: z.coerce.number().min(0, {
    message: "El precio total no puede ser negativo.",
  }),
  status: z.enum(["Pending", "Confirmed", "Checked-in", "Checked-out", "Cancelled", "No-show"], {
    required_error: "Por favor seleccione un estado.",
  }),
  paymentStatus: z.enum(["Pending", "Partial", "Paid"], {
    required_error: "Por favor seleccione un estado de pago.",
  }),
  specialRequests: z.string().optional(),
})

type ReservationFormValues = z.infer<typeof reservationFormSchema>

interface Room {
  _id: string
  number: string
  roomTypeId: string
  roomTypeName: string
}

interface ReservationCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onReservationCreated: () => void
}

export function ReservationCreateDialog({ open, onOpenChange, onReservationCreated }: ReservationCreateDialogProps) {
  const [rooms, setRooms] = useState<Room[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingRooms, setIsLoadingRooms] = useState(true)

  // Inicializar el formulario con valores predeterminados
  const form = useForm<ReservationFormValues>({
    resolver: zodResolver(reservationFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      adults: 1,
      children: 0,
      totalPrice: 0,
      status: "Confirmed",
      paymentStatus: "Pending",
      specialRequests: "",
    },
  })

  // Cargar las habitaciones disponibles
  useEffect(() => {
    async function fetchRooms() {
      try {
        setIsLoadingRooms(true)
        const response = await fetch("/api/admin/rooms")
        if (!response.ok) {
          throw new Error("Error al cargar las habitaciones")
        }
        const data = await response.json()

        // Obtener los tipos de habitación para mostrar información más detallada
        const roomTypesResponse = await fetch("/api/admin/room-types")
        if (!roomTypesResponse.ok) {
          throw new Error("Error al cargar los tipos de habitación")
        }
        const roomTypes = await roomTypesResponse.json()

        // Combinar la información de habitaciones con sus tipos
        const roomsWithTypes = data.map((room: any) => {
          const roomType = roomTypes.find((type: any) => type._id === room.roomTypeId)
          return {
            ...room,
            roomTypeName: roomType ? roomType.name : "Desconocido",
          }
        })

        setRooms(roomsWithTypes)
      } catch (error) {
        console.error("Error fetching rooms:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar las habitaciones. Por favor, intente nuevamente.",
          variant: "destructive",
        })
      } finally {
        setIsLoadingRooms(false)
      }
    }

    if (open) {
      fetchRooms()
    }
  }, [open])

  // Manejar el envío del formulario
  async function onSubmit(data: ReservationFormValues) {
    setIsLoading(true)
    try {
      // Generar un código de confirmación aleatorio
      const confirmationCode = generateConfirmationCode()

      // Preparar los datos para enviar al servidor
      const reservationData = {
        roomId: data.roomId,
        guest: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
        },
        checkInDate: data.checkInDate,
        checkOutDate: data.checkOutDate,
        adults: data.adults,
        children: data.children,
        totalPrice: data.totalPrice,
        status: data.status,
        paymentStatus: data.paymentStatus,
        specialRequests: data.specialRequests,
        confirmationCode,
      }

      // Enviar los datos al servidor
      const response = await fetch("/api/admin/reservations/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reservationData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Error al crear la reservación")
      }

      // Mostrar mensaje de éxito
      toast({
        title: "Reservación creada",
        description: `La reservación ha sido creada exitosamente con el código ${confirmationCode}.`,
      })

      // Cerrar el diálogo y notificar que se ha creado una reservación
      onOpenChange(false)
      onReservationCreated()

      // Resetear el formulario
      form.reset()
    } catch (error) {
      console.error("Error creating reservation:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al crear la reservación",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Generar un código de confirmación aleatorio
  function generateConfirmationCode() {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let code = ""
    for (let i = 0; i < 8; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length))
    }
    return code
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Nueva Reservación</DialogTitle>
          <DialogDescription>Complete el formulario para crear una nueva reservación manualmente.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Información del Huésped</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre del huésped" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apellido</FormLabel>
                      <FormControl>
                        <Input placeholder="Apellido del huésped" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correo Electrónico</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="correo@ejemplo.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono (opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="+1234567890" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Detalles de la Reservación</h3>

              <FormField
                control={form.control}
                name="roomId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Habitación</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione una habitación" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingRooms ? (
                          <div className="flex items-center justify-center p-2">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Cargando...
                          </div>
                        ) : rooms.length === 0 ? (
                          <div className="p-2 text-center text-muted-foreground">No hay habitaciones disponibles</div>
                        ) : (
                          rooms.map((room) => (
                            <SelectItem key={room._id} value={room._id}>
                              Habitación {room.number} - {room.roomTypeName}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="checkInDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha de Entrada</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={`w-full pl-3 text-left font-normal ${
                                !field.value ? "text-muted-foreground" : ""
                              }`}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: es })
                              ) : (
                                <span>Seleccione una fecha</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="checkOutDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha de Salida</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={`w-full pl-3 text-left font-normal ${
                                !field.value ? "text-muted-foreground" : ""
                              }`}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: es })
                              ) : (
                                <span>Seleccione una fecha</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => {
                              const checkInDate = form.getValues("checkInDate")
                              return checkInDate ? date <= checkInDate : date <= new Date()
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="adults"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adultos</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="children"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Niños</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="totalPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio Total</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.01" {...field} />
                    </FormControl>
                    <FormDescription>Ingrese el precio total de la reservación en la moneda local.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado de la Reservación</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione un estado" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Pending">Pendiente</SelectItem>
                          <SelectItem value="Confirmed">Confirmada</SelectItem>
                          <SelectItem value="Checked-in">Registrado</SelectItem>
                          <SelectItem value="Checked-out">Finalizada</SelectItem>
                          <SelectItem value="Cancelled">Cancelada</SelectItem>
                          <SelectItem value="No-show">No se presentó</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="paymentStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado del Pago</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione un estado de pago" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Pending">Pendiente</SelectItem>
                          <SelectItem value="Partial">Parcial</SelectItem>
                          <SelectItem value="Paid">Pagado</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="specialRequests"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Solicitudes Especiales (opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ingrese cualquier solicitud especial del huésped"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear Reservación
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

