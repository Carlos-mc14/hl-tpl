"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CreditCard, DollarSign, Loader2, AlertCircle, Smartphone, Receipt } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CreditCardForm } from "@/components/client/credit-card-form"

interface PaymentOptionsProps {
  reservationId: string
  totalPrice: number
  onPaymentComplete?: () => void
}

export default function PaymentOptions({ reservationId, totalPrice, onPaymentComplete }: PaymentOptionsProps) {
  const router = useRouter()
  const [paymentType, setPaymentType] = useState<"Full" | "Partial" | "OnArrival">("OnArrival")
  const [paymentMethod, setPaymentMethod] = useState<string>("VISA")
  const [partialAmount, setPartialAmount] = useState<number>(Math.round(totalPrice * 0.3)) // Default 30% deposit
  const [otpCode, setOtpCode] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [payuConfigured, setPayuConfigured] = useState(true)
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<{
    card: boolean
    yape: boolean
    pagoefectivo: boolean
  }>({
    card: true,
    yape: true,
    pagoefectivo: true,
  })
  const [cardData, setCardData] = useState({
    number: "",
    name: "",
    expiryMonth: "",
    expiryYear: "",
    cvc: "",
  })
  const [activeTab, setActiveTab] = useState<string>("card")

  // Verificar si las variables de entorno de PayU están configuradas
  // y obtener los métodos de pago disponibles
  useEffect(() => {
    const checkPayuConfig = async () => {
      // Solo verificar la configuración de PayU si el tipo de pago no es "OnArrival"
      // Esto evita mostrar el error cuando el usuario no ha seleccionado un método de pago online
      if (paymentType !== "OnArrival") {
        try {
          console.log("Verificando configuración de PayU...")
          // Añadir un parámetro de timestamp para evitar caché
          const response = await fetch(`/api/payments/check-config?t=${Date.now()}`)
          const data = await response.json()
          console.log("Respuesta de verificación de PayU:", data)

          setPayuConfigured(data.configured)

          // Si hay información sobre métodos de pago disponibles, actualizarla
          if (data.availablePaymentMethods) {
            console.log("Actualizando métodos de pago disponibles:", data.availablePaymentMethods)
            setAvailablePaymentMethods(data.availablePaymentMethods)

            // Verificar si el método activo actual está disponible
            let shouldUpdateActiveTab = false

            if (activeTab === "card" && !data.availablePaymentMethods.card) {
              shouldUpdateActiveTab = true
            } else if (activeTab === "yape" && !data.availablePaymentMethods.yape) {
              shouldUpdateActiveTab = true
            } else if (activeTab === "pago_efectivo" && !data.availablePaymentMethods.pagoefectivo) {
              shouldUpdateActiveTab = true
            }

            // Si el método activo no está disponible, cambiar a uno disponible
            if (shouldUpdateActiveTab) {
              if (data.availablePaymentMethods.card) {
                setActiveTab("card")
                setPaymentMethod("VISA")
              } else if (data.availablePaymentMethods.yape) {
                setActiveTab("yape")
                setPaymentMethod("YAPE")
              } else if (data.availablePaymentMethods.pagoefectivo) {
                setActiveTab("pago_efectivo")
                setPaymentMethod("PAGOEFECTIVO")
              }
            }
          }

          if (!data.configured) {
            // Solo mostrar el error si el usuario ha seleccionado un método de pago online
          } else {
            console.log("PayU configurado correctamente")
          }
        } catch (err) {
          console.error("Error checking PayU configuration:", err)
          setPayuConfigured(false)
          // Solo mostrar el error si el usuario ha seleccionado un método de pago online
        }
      } else {
        // Si el tipo de pago es "OnArrival", no necesitamos verificar PayU
        setError(null) // Limpiar cualquier error previo
      }
    }

    checkPayuConfig()
  }, [paymentType, activeTab])

  // Actualizar el método de pago cuando cambian los métodos disponibles
  useEffect(() => {
    // Si el método actual no está disponible, cambiar a uno disponible
    if (paymentType !== "OnArrival") {
      let needToChangeMethod = false

      // Verificar si el método actual está disponible
      if ((paymentMethod === "VISA" || paymentMethod === "MASTERCARD") && !availablePaymentMethods.card) {
        needToChangeMethod = true
      } else if (paymentMethod === "YAPE" && !availablePaymentMethods.yape) {
        needToChangeMethod = true
      } else if (paymentMethod === "PAGOEFECTIVO" && !availablePaymentMethods.pagoefectivo) {
        needToChangeMethod = true
      }

      // Si necesitamos cambiar el método, buscar uno disponible
      if (needToChangeMethod) {
        console.log("Cambiando método de pago porque el actual no está disponible")
        if (availablePaymentMethods.card) {
          setPaymentMethod("VISA")
          setActiveTab("card")
        } else if (availablePaymentMethods.yape) {
          setPaymentMethod("YAPE")
          setActiveTab("yape")
        } else if (availablePaymentMethods.pagoefectivo) {
          setPaymentMethod("PAGOEFECTIVO")
          setActiveTab("pago_efectivo")
        }
      }
    }
  }, [availablePaymentMethods, paymentMethod, paymentType])

  const handlePartialAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseFloat(e.target.value)
    if (!isNaN(value) && value > 0 && value < totalPrice) {
      setPartialAmount(value)
    }
  }

  const handleCardDataChange = (data: typeof cardData) => {
    setCardData(data)
  }

  // Mejorar el manejo de errores en el componente de opciones de pago
  const handlePayment = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Para "Pay on Arrival" option, just redirect to confirmation
      if (paymentType === "OnArrival") {
        // Store reservation details in session storage
        sessionStorage.setItem("paymentCompleted", "true")
        sessionStorage.setItem("paymentMethod", "OnArrival")

        // Redirect to confirmation page
        if (onPaymentComplete) {
          onPaymentComplete()
        } else {
          router.push("/reservations/confirmation")
        }
        return
      }

      // Validar datos de tarjeta para pagos con tarjeta
      if (
        (paymentMethod === "VISA" || paymentMethod === "MASTERCARD") &&
        (!cardData.number || !cardData.name || !cardData.expiryMonth || !cardData.expiryYear || !cardData.cvc)
      ) {
        throw new Error("Por favor, complete todos los campos de la tarjeta de crédito")
      }

      // Validar OTP para pagos con Yape
      if (paymentMethod === "YAPE" && !otpCode) {
        throw new Error("Para pagos con Yape, debe ingresar el código OTP de la aplicación")
      }

      // Obtener los datos completos de la reserva del sessionStorage
      const reservationData = sessionStorage.getItem("reservation")
      const reservationDetails = reservationData ? JSON.parse(reservationData) : null

      if (!reservationDetails) {
        throw new Error("No se encontraron detalles de la reserva")
      }

      console.log("Procesando pago con PayU:", {
        reservationId,
        amount: paymentType === "Full" ? totalPrice : partialAmount,
        paymentType,
        paymentMethod,
        otpCode: paymentMethod === "YAPE" ? otpCode : undefined,
      })

      // Para pagos online (Full o Partial)
      const amount = paymentType === "Full" ? totalPrice : partialAmount

      const response = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservationId,
          amount,
          paymentType,
          paymentMethod, // Método de pago seleccionado
          otpCode: paymentMethod === "YAPE" ? otpCode : undefined,
          returnUrl: `${window.location.origin}/reservations/confirmation`,
          cancelUrl: `${window.location.origin}/reservations/payment`,
          // Incluir los datos completos de la reserva
          reservationData: reservationDetails,
          // Incluir datos de la tarjeta si es necesario
          cardData: paymentMethod === "VISA" || paymentMethod === "MASTERCARD" ? cardData : undefined,
        }),
      })

      const data = await response.json()
      console.log("Respuesta de la API de pagos:", data)

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || "Error al procesar el pago")
      }

      // Guardar información adicional en sessionStorage
      sessionStorage.setItem("actualReservationId", data.actualReservationId || reservationId)
      sessionStorage.setItem("paymentId", data.paymentId)

      // Si PayU proporciona una URL de redirección, redirigir a ella
      if (data.payuResponse && data.payuResponse.code === "SUCCESS") {
        // Verificar si hay una URL en la respuesta de transacción
        if (data.payuResponse.transactionResponse && data.payuResponse.transactionResponse.extraParameters) {
          const extraParams = data.payuResponse.transactionResponse.extraParameters

          if (extraParams.URL_PAYMENT_RECEIPT_HTML) {
            // Redirigir a la URL de pago de PayU
            window.location.href = extraParams.URL_PAYMENT_RECEIPT_HTML
            return
          }
        }

        // Si no hay URL específica pero la respuesta es exitosa, marcar como completado
        sessionStorage.setItem("paymentCompleted", "true")
        sessionStorage.setItem("paymentMethod", paymentType)

        if (paymentType === "Partial") {
          sessionStorage.setItem("paymentAmount", partialAmount.toString())
        }

        // Redirigir a la página de confirmación
        if (onPaymentComplete) {
          onPaymentComplete()
        } else {
          router.push("/reservations/confirmation")
        }
      } else {
        // Si no hay respuesta exitosa de PayU
        throw new Error("No se pudo procesar el pago con PayU")
      }
    } catch (err) {
      console.error("Error en el proceso de pago:", err)
      setError(err instanceof Error ? err.message : "Error inesperado al procesar el pago")
      toast({
        title: "Error",
        description: "No se pudo procesar el pago. Por favor intente nuevamente.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Determinar qué métodos de pago están disponibles
  const hasAvailableOnlinePaymentMethods =
    availablePaymentMethods.card || availablePaymentMethods.yape || availablePaymentMethods.pagoefectivo

  // Calcular los métodos disponibles para mostrar en la UI
  const enabledPaymentMethods = {
    card: availablePaymentMethods.card,
    yape: availablePaymentMethods.yape,
    pagoefectivo: availablePaymentMethods.pagoefectivo,
  }

  console.log("Métodos de pago habilitados para UI:", enabledPaymentMethods)

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Opciones de Pago</CardTitle>
        <CardDescription>Seleccione cómo desea pagar su reserva</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!payuConfigured && paymentType !== "OnArrival" && (
          <Alert variant="default" className="mb-4 bg-amber-50 border-amber-200 text-amber-800">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Advertencia</AlertTitle>
            <AlertDescription>
              La pasarela de pago PayU no está configurada correctamente. Por favor, contacte al administrador.
            </AlertDescription>
          </Alert>
        )}

        <RadioGroup
          value={paymentType}
          onValueChange={(value) => setPaymentType(value as "Full" | "Partial" | "OnArrival")}
          className="space-y-4"
        >
          {hasAvailableOnlinePaymentMethods && (
            <div className="flex items-start space-x-2 rounded-md border p-4">
              <RadioGroupItem value="Full" id="payment-full" />
              <div className="flex-1">
                <Label htmlFor="payment-full" className="flex items-center gap-2 font-medium">
                  <CreditCard className="h-4 w-4" />
                  Pago Completo
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Pague el monto total de S/. {totalPrice.toFixed(2)} ahora con tarjeta de crédito/débito.
                </p>
              </div>
            </div>
          )}

          {hasAvailableOnlinePaymentMethods && (
            <div className="flex items-start space-x-2 rounded-md border p-4">
              <RadioGroupItem value="Partial" id="payment-partial" />
              <div className="flex-1">
                <Label htmlFor="payment-partial" className="flex items-center gap-2 font-medium">
                  <CreditCard className="h-4 w-4" />
                  Pago Parcial (Depósito)
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Pague un depósito ahora y el resto al llegar al hotel.
                </p>
                <div className="mt-2">
                  <Label htmlFor="partial-amount">Monto del depósito (S/.)</Label>
                  <Input
                    id="partial-amount"
                    type="number"
                    min={1}
                    max={totalPrice - 1}
                    value={partialAmount}
                    onChange={handlePartialAmountChange}
                    disabled={paymentType !== "Partial"}
                    className="w-full mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Saldo a pagar al llegar: S/. {(totalPrice - partialAmount).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-start space-x-2 rounded-md border p-4">
            <RadioGroupItem value="OnArrival" id="payment-arrival" />
            <div className="flex-1">
              <Label htmlFor="payment-arrival" className="flex items-center gap-2 font-medium">
                <DollarSign className="h-4 w-4" />
                Pagar al llegar
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Pague el monto total de S/. {totalPrice.toFixed(2)} al llegar al hotel.
              </p>
            </div>
          </div>
        </RadioGroup>

        {paymentType !== "OnArrival" && hasAvailableOnlinePaymentMethods && (
          <div className="mt-6">
            <Label className="mb-2 block">Seleccione su método de pago:</Label>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList
                className="grid w-full"
                style={{
                  gridTemplateColumns: `repeat(${
                    (enabledPaymentMethods.card ? 1 : 0) +
                    (enabledPaymentMethods.yape ? 1 : 0) +
                    (enabledPaymentMethods.pagoefectivo ? 1 : 0)
                  }, minmax(0, 1fr))`,
                }}
              >
                {enabledPaymentMethods.card && <TabsTrigger value="card">Tarjeta</TabsTrigger>}
                {enabledPaymentMethods.yape && <TabsTrigger value="yape">Yape</TabsTrigger>}
                {enabledPaymentMethods.pagoefectivo && <TabsTrigger value="pago_efectivo">PagoEfectivo</TabsTrigger>}
              </TabsList>

              {enabledPaymentMethods.card && (
                <TabsContent value="card" className="mt-4">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div
                      className={`border rounded-md p-3 flex items-center gap-2 cursor-pointer ${paymentMethod === "VISA" ? "border-primary bg-primary/5" : ""}`}
                      onClick={() => setPaymentMethod("VISA")}
                    >
                      <CreditCard className="h-5 w-5" />
                      <span>Visa</span>
                    </div>
                    <div
                      className={`border rounded-md p-3 flex items-center gap-2 cursor-pointer ${paymentMethod === "MASTERCARD" ? "border-primary bg-primary/5" : ""}`}
                      onClick={() => setPaymentMethod("MASTERCARD")}
                    >
                      <CreditCard className="h-5 w-5" />
                      <span>Mastercard</span>
                    </div>
                  </div>

                  {(paymentMethod === "VISA" || paymentMethod === "MASTERCARD") && (
                    <CreditCardForm onChange={handleCardDataChange} />
                  )}
                </TabsContent>
              )}

              {enabledPaymentMethods.yape && (
                <TabsContent value="yape" className="mt-4">
                  <div
                    className={`border rounded-md p-3 flex items-center gap-2 cursor-pointer ${paymentMethod === "YAPE" ? "border-primary bg-primary/5" : ""}`}
                    onClick={() => setPaymentMethod("YAPE")}
                  >
                    <Smartphone className="h-5 w-5 text-pink-500" />
                    <span className="font-medium">Yape</span>
                  </div>

                  {paymentMethod === "YAPE" && (
                    <div className="mt-4">
                      <Label htmlFor="otp-code">Código OTP de Yape</Label>
                      <Input
                        id="otp-code"
                        type="text"
                        placeholder="Ingrese el código de 6 dígitos de la app Yape"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        className="w-full mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Abra su app de Yape y obtenga el código OTP para completar esta transacción
                      </p>
                    </div>
                  )}
                </TabsContent>
              )}

              {enabledPaymentMethods.pagoefectivo && (
                <TabsContent value="pago_efectivo" className="mt-4">
                  <div
                    className={`border rounded-md p-3 flex items-center gap-2 cursor-pointer ${paymentMethod === "PAGOEFECTIVO" ? "border-primary bg-primary/5" : ""}`}
                    onClick={() => setPaymentMethod("PAGOEFECTIVO")}
                  >
                    <Receipt className="h-5 w-5 text-green-500" />
                    <span className="font-medium">PagoEfectivo</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Recibirá un código para pagar en cualquier agente autorizado de PagoEfectivo
                  </p>
                </TabsContent>
              )}
            </Tabs>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handlePayment} disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Procesando...
            </>
          ) : (
            <>{paymentType === "OnArrival" ? "Confirmar Reserva" : "Proceder al Pago"}</>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}

