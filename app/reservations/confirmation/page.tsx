"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle, Calendar, Bed, Users, DollarSign, Loader2, AlertCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { SiteHeader } from "@/components/site/site-header"
import { SiteFooter } from "@/components/site/site-footer"

interface SiteConfig {
  hotelName: string
  logoUrl: string
  favicon: string
  primaryColor: string
  secondaryColor: string
  contactInfo: {
    phone: string
    email: string
    address: string
    googleMapsUrl: string
  }
  socialMedia: {
    facebook: string
    instagram: string
    twitter: string
    tripadvisor: string
  }
  footer: {
    copyrightText: string
    showPaymentMethods: boolean
    columns: Array<{
      title: string
      links: Array<{
        text: string
        url: string
      }>
    }>
  }
  // Add other properties as needed
}

interface ReservationDetails {
  firstName: string
  lastName: string
  email: string
  phone: string
  checkInDate: string
  checkOutDate: string
  adults: string
  children: string
  roomTypeName: string
  roomNumber: string
  nights: number
  totalPrice: number
  confirmationCode: string
  specialRequests?: string
  paymentStatus?: string
  paymentMethod?: string
  paymentAmount?: number
  remainingAmount?: number
}

export default function ConfirmationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [reservation, setReservation] = useState<ReservationDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null)
  const [configLoading, setConfigLoading] = useState(true)

  const paymentId = searchParams.get("paymentId")
  const paymentCompleted = sessionStorage.getItem("paymentCompleted") === "true"
  const paymentMethod = sessionStorage.getItem("paymentMethod") || ""
  const actualReservationId = sessionStorage.getItem("actualReservationId") || ""

  // Fetch site config
  useEffect(() => {
    async function fetchSiteConfig() {
      try {
        const response = await fetch("/api/site-config")
        if (!response.ok) {
          throw new Error("Failed to fetch site configuration")
        }
        const data = await response.json()
        setSiteConfig(data)
      } catch (error) {
        console.error("Error fetching site config:", error)
      } finally {
        setConfigLoading(false)
      }
    }

    fetchSiteConfig()
  }, [])

  useEffect(() => {
    // Get reservation details from session storage
    const reservationData = sessionStorage.getItem("reservation")
    if (!reservationData) {
      setError("No se encontró información de la reserva")
      setIsLoading(false)
      return
    }

    try {
      const parsedData = JSON.parse(reservationData)
      console.log("Datos de reserva recuperados:", parsedData)

      // Check if payment was completed
      if (paymentId) {
        // Fetch payment status from API
        fetch(`/api/payments/status/${paymentId}`)
          .then((response) => {
            if (!response.ok) {
              throw new Error("Error al verificar el estado del pago")
            }
            return response.json()
          })
          .then((data) => {
            console.log("Datos de pago recuperados:", data)

            // Usar los datos de la reserva temporal si están disponibles
            if (data.isTemporary && data.tempReservationData) {
              const tempData = data.tempReservationData

              setReservation({
                ...parsedData,
                firstName: tempData.guest.firstName,
                lastName: tempData.guest.lastName,
                email: tempData.guest.email,
                phone: tempData.guest.phone || "",
                paymentStatus: data.reservationPaymentStatus.paymentStatus,
                paymentMethod: data.payment.method,
                paymentAmount: data.payment.amount,
                remainingAmount: data.reservationPaymentStatus.remaining,
              })
            } else {
              // Para pagos normales, usar los datos de la API
              setReservation({
                ...parsedData,
                paymentStatus: data.payment.status,
                paymentMethod: data.payment.method,
                paymentAmount: data.payment.amount,
                remainingAmount: data.reservationPaymentStatus.remaining,
              })
            }
            setIsLoading(false)
          })
          .catch((err) => {
            console.error("Error fetching payment status:", err)
            setReservation(parsedData)
            setIsLoading(false)
          })
      } else if (paymentCompleted) {
        // Payment was completed or skipped (pay on arrival)
        let status, method, amount, remaining

        if (paymentMethod === "OnArrival") {
          status = "Pendiente"
          method = "Efectivo al llegar"
          amount = 0
          remaining = parsedData.totalPrice
        } else if (paymentMethod === "Partial") {
          status = "Parcial"
          method = "Tarjeta"
          amount = Number.parseFloat(sessionStorage.getItem("paymentAmount") || "0")
          remaining = parsedData.totalPrice - amount
        } else {
          status = "Completado"
          method = "Tarjeta"
          amount = parsedData.totalPrice
          remaining = 0
        }

        setReservation({
          ...parsedData,
          paymentStatus: status,
          paymentMethod: method,
          paymentAmount: amount,
          remainingAmount: remaining,
        })
        setIsLoading(false)
      } else {
        // No payment information
        setReservation(parsedData)
        setIsLoading(false)
      }
    } catch (err) {
      console.error("Error parsing reservation data:", err)
      setError("Error al procesar la información de la reserva")
      setIsLoading(false)
    }
  }, [paymentId, paymentCompleted, paymentMethod, actualReservationId])

  if (isLoading || configLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        {siteConfig ? <SiteHeader siteConfig={siteConfig} /> : <div className="h-16 border-b"></div>}
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="mt-4 text-lg">Verificando información de la reserva...</p>
          </div>
        </main>
        {siteConfig ? <SiteFooter siteConfig={siteConfig} /> : <div className="h-16 border-t"></div>}
      </div>
    )
  }

  if (error || !reservation || !siteConfig) {
    return (
      <div className="flex min-h-screen flex-col">
        {siteConfig ? <SiteHeader siteConfig={siteConfig} /> : <div className="h-16 border-b"></div>}
        <main className="flex-1">
          <div className="container mx-auto px-4 py-12 md:py-24">
            <div className="max-w-md mx-auto text-center">
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  {error || !reservation
                    ? "No se encontró información de la reserva"
                    : "Error al cargar la configuración del sitio"}
                </AlertDescription>
              </Alert>
              <Button asChild>
                <Link href="/reservations">Hacer una Nueva Reserva</Link>
              </Button>
            </div>
          </div>
        </main>
        {siteConfig ? <SiteFooter siteConfig={siteConfig} /> : <div className="h-16 border-t"></div>}
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader siteConfig={siteConfig} />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-12 md:py-24">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold">¡Reserva Confirmada!</h1>
              <p className="text-lg text-gray-600 mt-2">
                Gracias por su reserva, {reservation.firstName}. Su código de confirmación es:
              </p>
              <p className="text-2xl font-mono font-bold mt-2 p-2 bg-gray-100 rounded inline-block">
                {reservation.confirmationCode}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-6 border-b">
                <h2 className="text-xl font-bold mb-4">Detalles de la Reserva</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium text-gray-500 mb-2">Información del Huésped</h3>
                    <p className="mb-1">
                      <span className="font-medium">Nombre:</span> {reservation.firstName} {reservation.lastName}
                    </p>
                    <p className="mb-1">
                      <span className="font-medium">Email:</span> {reservation.email}
                    </p>
                    {reservation.phone && (
                      <p className="mb-1">
                        <span className="font-medium">Teléfono:</span> {reservation.phone}
                      </p>
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-500 mb-2">Información de la Estancia</h3>
                    <p className="flex items-center mb-1">
                      <Calendar className="h-4 w-4 mr-2 text-primary" />
                      <span className="font-medium">Check-in:</span>{" "}
                      {new Date(reservation.checkInDate).toLocaleDateString()}
                    </p>
                    <p className="flex items-center mb-1">
                      <Calendar className="h-4 w-4 mr-2 text-primary" />
                      <span className="font-medium">Check-out:</span>{" "}
                      {new Date(reservation.checkOutDate).toLocaleDateString()}
                    </p>
                    <p className="flex items-center mb-1">
                      <Bed className="h-4 w-4 mr-2 text-primary" />
                      <span className="font-medium">Habitación:</span> {reservation.roomTypeName} (Habitación{" "}
                      {reservation.roomNumber})
                    </p>
                    <p className="flex items-center mb-1">
                      <Users className="h-4 w-4 mr-2 text-primary" />
                      <span className="font-medium">Huéspedes:</span> {reservation.adults} adultos,{" "}
                      {reservation.children} niños
                    </p>
                  </div>
                </div>

                {reservation.specialRequests && (
                  <div className="mt-4">
                    <h3 className="font-medium text-gray-500 mb-2">Solicitudes Especiales</h3>
                    <p className="bg-gray-50 p-3 rounded">{reservation.specialRequests}</p>
                  </div>
                )}
              </div>

              <div className="p-6 bg-gray-50">
                <h3 className="font-medium text-gray-500 mb-2">Información de Pago</h3>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-500">
                      Tarifa por {reservation.nights} noche{reservation.nights !== 1 ? "s" : ""}
                    </p>
                    <p className="flex items-center font-medium text-lg">
                      <DollarSign className="h-4 w-4 mr-1" />
                      S/. {reservation.totalPrice.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Estado del Pago</p>
                    {reservation.paymentStatus === "Completado" ? (
                      <p className="font-medium text-green-600">Pagado Completamente</p>
                    ) : reservation.paymentStatus === "Parcial" ? (
                      <div>
                        <p className="font-medium text-amber-600">Pago Parcial</p>
                        <p className="text-sm">
                          Pagado: S/. {reservation.paymentAmount?.toFixed(2) || "0.00"}
                          <br />
                          Pendiente: S/. {reservation.remainingAmount?.toFixed(2) || "0.00"}
                        </p>
                      </div>
                    ) : (
                      <p className="font-medium text-amber-600">Pago al llegar</p>
                    )}

                    {reservation.paymentMethod && (
                      <p className="text-sm mt-1">
                        <span className="font-medium">Método:</span> {reservation.paymentMethod}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 text-center">
              <p className="mb-4 text-gray-600">Se ha enviado un email de confirmación a {reservation.email}</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild variant="outline">
                  <Link href="/">Volver al Inicio</Link>
                </Button>
                <Button asChild>
                  <Link href="/rooms">Ver Más Habitaciones</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter siteConfig={siteConfig} />
    </div>
  )
}

