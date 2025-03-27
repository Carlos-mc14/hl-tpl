"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"

import PaymentOptions from "@/components/client/payment-options"
import ClientHeader from "@/components/client/client-header"
import ClientFooter from "@/components/client/client-footer"

interface ReservationDetails {
  reservationId: string
  totalPrice: number
  checkInDate: string
  checkOutDate: string
  roomTypeName: string
  nights: number
  firstName: string
  lastName: string
}

export default function PaymentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [reservation, setReservation] = useState<ReservationDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Get reservation details from session storage
    const reservationData = sessionStorage.getItem("reservation")

    if (!reservationData) {
      // If no reservation data, redirect to reservations page
      router.push("/reservations")
      return
    }

    try {
      const parsedData = JSON.parse(reservationData)
      setReservation({
        reservationId: parsedData.reservationId || "temp-" + Date.now(),
        totalPrice: parsedData.totalPrice || 0,
        checkInDate: parsedData.checkInDate || "",
        checkOutDate: parsedData.checkOutDate || "",
        roomTypeName: parsedData.roomTypeName || "",
        nights: parsedData.nights || 0,
        firstName: parsedData.firstName || "",
        lastName: parsedData.lastName || "",
      })
    } catch (error) {
      console.error("Error parsing reservation data:", error)
    }

    setIsLoading(false)
  }, [router])

  const handlePaymentComplete = () => {
    // Redirect to confirmation page
    router.push("/reservations/confirmation")
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <ClientHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="mt-4 text-lg">Cargando información de pago...</p>
          </div>
        </main>
        <ClientFooter />
      </div>
    )
  }

  if (!reservation) {
    return (
      <div className="flex min-h-screen flex-col">
        <ClientHeader />
        <main className="flex-1">
          <div className="container mx-auto px-4 py-12 md:py-24">
            <div className="max-w-md mx-auto text-center">
              <h1 className="text-2xl font-bold mb-4">No se encontró información de reserva</h1>
              <p className="mb-6">
                No pudimos encontrar los detalles de su reserva. Por favor, inicie el proceso de reserva nuevamente.
              </p>
              <button
                onClick={() => router.push("/reservations")}
                className="bg-primary text-white px-4 py-2 rounded-md"
              >
                Volver a Reservas
              </button>
            </div>
          </div>
        </main>
        <ClientFooter />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <ClientHeader />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-12 md:py-24">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Pago de Reserva</h1>

            <div className="bg-muted/30 rounded-lg p-4 mb-8">
              <h2 className="text-xl font-semibold mb-2">Resumen de Reserva</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p>
                    <span className="font-medium">Huésped:</span> {reservation.firstName} {reservation.lastName}
                  </p>
                  <p>
                    <span className="font-medium">Tipo de Habitación:</span> {reservation.roomTypeName}
                  </p>
                  <p>
                    <span className="font-medium">Noches:</span> {reservation.nights}
                  </p>
                </div>
                <div>
                  <p>
                    <span className="font-medium">Check-in:</span>{" "}
                    {new Date(reservation.checkInDate).toLocaleDateString()}
                  </p>
                  <p>
                    <span className="font-medium">Check-out:</span>{" "}
                    {new Date(reservation.checkOutDate).toLocaleDateString()}
                  </p>
                  <p className="font-medium">Total: S/. {reservation.totalPrice.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <PaymentOptions
              reservationId={reservation.reservationId}
              totalPrice={reservation.totalPrice}
              onPaymentComplete={handlePaymentComplete}
            />
          </div>
        </div>
      </main>
      <ClientFooter />
    </div>
  )
}

