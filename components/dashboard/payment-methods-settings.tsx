"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { CreditCard, Smartphone, Receipt, Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function PaymentMethodsSettings() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [methods, setMethods] = useState({
    card: true,
    yape: true,
    pagoefectivo: true,
  })

  // Cargar la configuración actual
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true)
        const response = await fetch("/api/settings/payment-methods")

        if (response.ok) {
          const data = await response.json()
          setMethods(data.methods)
        } else {
          // Si no hay configuración guardada, usar los valores predeterminados
          console.log("No se encontró configuración de métodos de pago, usando valores predeterminados")
        }
      } catch (err) {
        console.error("Error al cargar la configuración de métodos de pago:", err)
        setError("No se pudo cargar la configuración. Por favor, intente nuevamente.")
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [])

  // Guardar la configuración
  const handleSave = async () => {
    try {
      setIsSaving(true)
      setError(null)

      const response = await fetch("/api/settings/payment-methods", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ methods }),
      })

      if (!response.ok) {
        throw new Error("Error al guardar la configuración")
      }

      toast({
        title: "Configuración guardada",
        description: "Los métodos de pago han sido actualizados correctamente.",
      })
    } catch (err) {
      console.error("Error al guardar la configuración:", err)
      setError("No se pudo guardar la configuración. Por favor, intente nuevamente.")
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuración de Métodos de Pago</CardTitle>
        <CardDescription>Habilite o deshabilite los métodos de pago disponibles para los clientes.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between border p-4 rounded-md">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-primary" />
              <div>
                <h3 className="font-medium">Tarjetas de Crédito/Débito</h3>
                <p className="text-sm text-muted-foreground">Visa, Mastercard y otras tarjetas</p>
              </div>
            </div>
            <Switch checked={methods.card} onCheckedChange={(checked) => setMethods({ ...methods, card: checked })} />
          </div>

          <div className="flex items-center justify-between border p-4 rounded-md">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-pink-500" />
              <div>
                <h3 className="font-medium">Yape</h3>
                <p className="text-sm text-muted-foreground">Pagos móviles con Yape</p>
              </div>
            </div>
            <Switch checked={methods.yape} onCheckedChange={(checked) => setMethods({ ...methods, yape: checked })} />
          </div>

          <div className="flex items-center justify-between border p-4 rounded-md">
            <div className="flex items-center gap-3">
              <Receipt className="h-5 w-5 text-green-500" />
              <div>
                <h3 className="font-medium">PagoEfectivo</h3>
                <p className="text-sm text-muted-foreground">Pagos en efectivo en agentes autorizados</p>
              </div>
            </div>
            <Switch
              checked={methods.pagoefectivo}
              onCheckedChange={(checked) => setMethods({ ...methods, pagoefectivo: checked })}
            />
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            "Guardar Cambios"
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}

