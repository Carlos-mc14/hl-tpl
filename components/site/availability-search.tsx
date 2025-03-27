"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarIcon, Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"

export function AvailabilitySearch() {
  const router = useRouter()
  const [checkIn, setCheckIn] = useState<Date>()
  const [checkOut, setCheckOut] = useState<Date>()
  const [adults, setAdults] = useState("2")
  const [children, setChildren] = useState("0")

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()

    if (!checkIn || !checkOut) {
      toast({
        title: "Error",
        description: "Por favor selecciona las fechas de entrada y salida",
        variant: "destructive",
      })
      return
    }

    // Verificar que la fecha de salida es posterior a la de entrada
    if (checkOut <= checkIn) {
      toast({
        title: "Error",
        description: "La fecha de salida debe ser posterior a la fecha de entrada",
        variant: "destructive",
      })
      return
    }

    // Crear los parámetros de búsqueda
    const searchParams = new URLSearchParams({
      checkIn: checkIn.toISOString(),
      checkOut: checkOut.toISOString(),
      adults,
      children,
    })

    // Redirigir a la página de habitaciones con los filtros aplicados
    router.push(`/rooms?${searchParams.toString()}`)

    // Mostrar mensaje de búsqueda
    toast({
      title: "Buscando habitaciones disponibles",
      description: `Para ${adults} adultos y ${children} niños, del ${format(checkIn, "dd/MM/yyyy")} al ${format(checkOut, "dd/MM/yyyy")}`,
    })
  }

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6 -mt-16 relative z-10">
      <h2 className="text-xl font-bold mb-4 text-center">Check Availability</h2>
      <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="check-in">Check In</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn("w-full justify-start text-left font-normal", !checkIn && "text-muted-foreground")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {checkIn ? format(checkIn, "PPP") : "Select date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={checkIn}
                onSelect={setCheckIn}
                initialFocus
                disabled={(date) => date < new Date()}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label htmlFor="check-out">Check Out</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn("w-full justify-start text-left font-normal", !checkOut && "text-muted-foreground")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {checkOut ? format(checkOut, "PPP") : "Select date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={checkOut}
                onSelect={setCheckOut}
                initialFocus
                disabled={(date) => !checkIn || date <= checkIn || date < new Date()}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label htmlFor="adults">Adults</Label>
          <Select value={adults} onValueChange={setAdults}>
            <SelectTrigger id="adults">
              <SelectValue placeholder="Adults" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 Adult</SelectItem>
              <SelectItem value="2">2 Adults</SelectItem>
              <SelectItem value="3">3 Adults</SelectItem>
              <SelectItem value="4">4 Adults</SelectItem>
              <SelectItem value="5">5 Adults</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="children">Children</Label>
          <Select value={children} onValueChange={setChildren}>
            <SelectTrigger id="children">
              <SelectValue placeholder="Children" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">0 Children</SelectItem>
              <SelectItem value="1">1 Child</SelectItem>
              <SelectItem value="2">2 Children</SelectItem>
              <SelectItem value="3">3 Children</SelectItem>
              <SelectItem value="4">4 Children</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-4">
          <Button type="submit" className="w-full">
            <Search className="mr-2 h-4 w-4" />
            Check Availability
          </Button>
        </div>
      </form>
    </div>
  )
}

