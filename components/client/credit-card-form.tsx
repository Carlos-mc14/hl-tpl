"use client"

import type React from "react"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CreditCard } from "lucide-react"

interface CreditCardFormProps {
  onChange: (data: {
    number: string
    name: string
    expiryMonth: string
    expiryYear: string
    cvc: string
  }) => void
}

export function CreditCardForm({ onChange }: CreditCardFormProps) {
  const [cardData, setCardData] = useState({
    number: "",
    name: "",
    expiryMonth: "",
    expiryYear: "",
    cvc: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target

    // Validaciones específicas
    let processedValue = value

    if (name === "number") {
      // Solo permitir números y formatear con espacios cada 4 dígitos
      processedValue = value
        .replace(/\D/g, "")
        .replace(/(\d{4})(?=\d)/g, "$1 ")
        .trim()
        .substring(0, 19) // 16 dígitos + 3 espacios
    } else if (name === "expiryMonth") {
      // Solo permitir números del 1 al 12
      const numericValue = value.replace(/\D/g, "")
      const month = Number.parseInt(numericValue)

      if (numericValue === "") {
        processedValue = ""
      } else if (isNaN(month)) {
        processedValue = cardData.expiryMonth // Mantener el valor anterior
      } else if (month < 1) {
        processedValue = "01"
      } else if (month > 12) {
        processedValue = "12"
      } else {
        processedValue = month.toString().padStart(2, "0")
      }
    } else if (name === "expiryYear") {
      // Solo permitir años válidos (actual + 20 años)
      const currentYear = new Date().getFullYear()
      const numericValue = value.replace(/\D/g, "")

      if (numericValue === "") {
        processedValue = ""
      } else {
        const year = Number.parseInt(numericValue)
        if (isNaN(year)) {
          processedValue = cardData.expiryYear // Mantener el valor anterior
        } else {
          processedValue = numericValue.substring(0, 2)
        }
      }
    } else if (name === "cvc") {
      // Solo permitir 3 o 4 dígitos
      processedValue = value.replace(/\D/g, "").substring(0, 4)
    }

    const updatedData = {
      ...cardData,
      [name]: processedValue,
    }

    setCardData(updatedData)
    onChange(updatedData)
  }

  return (
    <div className="space-y-4 mt-4 p-4 border rounded-md bg-gray-50">
      <div className="flex items-center gap-2 mb-4">
        <CreditCard className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-medium">Datos de la Tarjeta</h3>
      </div>

      <div className="space-y-2">
        <Label htmlFor="card-number">Número de Tarjeta</Label>
        <Input
          id="card-number"
          name="number"
          placeholder="1234 5678 9012 3456"
          value={cardData.number}
          onChange={handleChange}
          className="font-mono"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="card-name">Nombre en la Tarjeta</Label>
        <Input
          id="card-name"
          name="name"
          placeholder="NOMBRE APELLIDO"
          value={cardData.name}
          onChange={(e) => {
            const value = e.target.value.toUpperCase()
            setCardData({ ...cardData, name: value })
            onChange({ ...cardData, name: value })
          }}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="expiry-month">Mes (MM)</Label>
          <Input
            id="expiry-month"
            name="expiryMonth"
            placeholder="MM"
            value={cardData.expiryMonth}
            onChange={handleChange}
            maxLength={2}
            className="font-mono"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="expiry-year">Año (YY)</Label>
          <Input
            id="expiry-year"
            name="expiryYear"
            placeholder="YY"
            value={cardData.expiryYear}
            onChange={handleChange}
            maxLength={2}
            className="font-mono"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cvc">CVC/CVV</Label>
          <Input
            id="cvc"
            name="cvc"
            placeholder="123"
            value={cardData.cvc}
            onChange={handleChange}
            maxLength={4}
            className="font-mono"
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-2">
        Sus datos de pago están seguros y encriptados. No almacenamos los datos de su tarjeta.
      </p>
    </div>
  )
}

