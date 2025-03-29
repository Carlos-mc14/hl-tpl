import { NextResponse } from "next/server"
import { createPayment, updateReservationPaymentStatus } from "@/models/payment"
import { getReservationById } from "@/models/reservation"
import { createPaymentRequest, processPayment, generateReferenceCode } from "@/lib/payu"
import { getCurrentUser } from "@/lib/session"
import { ObjectId } from "mongodb"
import { getDb } from "@/lib/mongodb"

// Modificar la función para mejorar el manejo de reservas temporales
export async function POST(request: Request) {
  try {
    // Obtener el usuario actual (si está autenticado)
    const user = await getCurrentUser()
    // Ya no requerimos autenticación para procesar pagos
    // Esto permite que usuarios no registrados puedan pagar

    const body = await request.json()
    const {
      reservationId,
      amount,
      paymentType,
      returnUrl,
      cancelUrl,
      reservationData,
      paymentMethod = "VISA",
      otpCode,
      cardData,
    } = body

    if (!reservationId || amount === undefined || !paymentType || !returnUrl || !cancelUrl) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
    }

    // Verificar datos de tarjeta para pagos con tarjeta
    if ((paymentMethod === "VISA" || paymentMethod === "MASTERCARD") && !cardData) {
      return NextResponse.json({ message: "La tarjeta de crédito no puede ser null" }, { status: 400 })
    }

    // Verificar si es un ID temporal (usuario sin cuenta)
    const isTemporaryId = reservationId.startsWith("temp-")
    console.log("Procesando reserva:", {
      reservationId,
      isTemporaryId,
      paymentType,
      amount,
      paymentMethod,
      hasOtpCode: !!otpCode,
      hasCardData: !!cardData,
      isAuthenticated: !!user,
    })

    let reservation
    let payment
    let referenceCode
    let actualReservationId = reservationId

    // Obtener información del cliente para PayU
    let ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1"
    // Si la dirección IP contiene comas (múltiples IPs), tomar solo la primera
    if (ipAddress.includes(",")) {
      ipAddress = ipAddress.split(",")[0].trim()
    }
    // Asegurar que no exceda los 39 caracteres
    if (ipAddress.length > 39) {
      ipAddress = ipAddress.substring(0, 39)
    }

    const clientInfo = {
      ipAddress,
      userAgent: (request.headers.get("user-agent") || "Unknown Browser").substring(0, 255), // También limitar user-agent
      deviceSessionId: crypto.randomUUID(),
      cookie: crypto.randomUUID(),
    }

    if (isTemporaryId) {
      console.log("Procesando reserva de usuario temporal (sin cuenta)")

      if (!reservationData) {
        return NextResponse.json({ message: "Missing reservation data for temporary reservation" }, { status: 400 })
      }

      // En producción, guardamos la reserva temporal en la base de datos
      const db = await getDb()

      // Crear una colección para reservas temporales si no existe
      if (!(await db.listCollections({ name: "temporaryReservations" }).toArray()).length) {
        await db.createCollection("temporaryReservations")
      }

      // Guardar la reserva temporal en la base de datos
      const tempReservation = {
        _id: new ObjectId(),
        originalId: reservationId, // Mantener el ID temporal original para referencia
        status: "Pending",
        paymentStatus: "Pending",
        guest: {
          firstName: reservationData.firstName,
          lastName: reservationData.lastName,
          email: reservationData.email,
          phone: reservationData.phone || "",
        },
        checkInDate: new Date(reservationData.checkInDate),
        checkOutDate: new Date(reservationData.checkOutDate),
        adults: Number.parseInt(reservationData.adults) || 1,
        children: Number.parseInt(reservationData.children) || 0,
        roomTypeId: reservationData.roomTypeId,
        roomTypeName: reservationData.roomTypeName,
        totalPrice: reservationData.totalPrice,
        specialRequests: reservationData.specialRequests || "",
        confirmationCode: reservationData.confirmationCode,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const result = await db.collection("temporaryReservations").insertOne(tempReservation)
      actualReservationId = result.insertedId.toString()

      console.log("Reserva temporal guardada en la base de datos:", actualReservationId)

      // Usar los datos reales de la reserva temporal
      reservation = {
        _id: actualReservationId,
        totalPrice: reservationData.totalPrice,
        guest: {
          firstName: reservationData.firstName,
          lastName: reservationData.lastName,
          email: reservationData.email,
          phone: reservationData.phone || "",
        },
      }

      // Generar un código de referencia único para esta reserva
      referenceCode = generateReferenceCode(actualReservationId)

      // Crear un registro de pago real en la base de datos
      payment = await createPayment({
        reservationId: actualReservationId,
        amount,
        currency: "PEN",
        status: "Pending",
        method: paymentMethod as any, // Asegurarse de que el método de pago sea correcto
        type: paymentType,
        paymentDate: new Date(),
        metadata: {
          referenceCode,
          returnUrl,
          cancelUrl,
          isTemporary: true,
          originalTempId: reservationId,
          paymentMethod,
        },
      })

      console.log("Pago creado para reserva temporal:", payment._id)
    } else {
      // Validar que el ID de reserva tenga el formato correcto para MongoDB
      if (!ObjectId.isValid(reservationId)) {
        return NextResponse.json(
          {
            message: "Invalid reservation ID format",
            details: "The reservation ID must be a valid MongoDB ObjectId",
          },
          { status: 400 },
        )
      }

      // Validate the reservation exists
      reservation = await getReservationById(reservationId)
      if (!reservation) {
        return NextResponse.json({ message: "Reservation not found" }, { status: 404 })
      }

      // Create a reference code for this payment
      referenceCode = generateReferenceCode(reservationId)

      // Create payment record in pending state
      payment = await createPayment({
        reservationId,
        amount,
        currency: "PEN", // Peruvian Sol
        status: "Pending",
        method: paymentMethod as any, // Asegurarse de que el método de pago sea correcto
        type: paymentType,
        paymentDate: new Date(),
        metadata: {
          referenceCode,
          returnUrl,
          cancelUrl,
          isTemporary: false,
          paymentMethod,
        },
      })

      // Update reservation payment status to pending
      await updateReservationPaymentStatus(reservationId, "Pending")
    }

    // Verificar que las variables de entorno de PayU estén configuradas
    const payuCredentials = {
      PAYU_MERCHANT_ID: process.env.PAYU_MERCHANT_ID,
      PAYU_API_KEY: process.env.PAYU_API_KEY,
      PAYU_API_LOGIN: process.env.PAYU_API_LOGIN,
      PAYU_ACCOUNT_ID: process.env.PAYU_ACCOUNT_ID,
      PAYU_API_URL: process.env.PAYU_API_URL,
    }

    console.log("PayU credentials check:", {
      PAYU_MERCHANT_ID_exists: !!payuCredentials.PAYU_MERCHANT_ID,
      PAYU_API_KEY_exists: !!payuCredentials.PAYU_API_KEY,
      PAYU_API_LOGIN_exists: !!payuCredentials.PAYU_API_LOGIN,
      PAYU_ACCOUNT_ID_exists: !!payuCredentials.PAYU_ACCOUNT_ID,
      PAYU_API_URL_exists: !!payuCredentials.PAYU_API_URL,
    })

    if (
      !payuCredentials.PAYU_MERCHANT_ID ||
      !payuCredentials.PAYU_API_KEY ||
      !payuCredentials.PAYU_API_LOGIN ||
      !payuCredentials.PAYU_ACCOUNT_ID
    ) {
      console.error("PayU credentials not configured properly")
      return NextResponse.json(
        {
          message: "PayU credentials not configured properly",
          paymentId: payment._id,
          missingCredentials: {
            PAYU_MERCHANT_ID: !payuCredentials.PAYU_MERCHANT_ID,
            PAYU_API_KEY: !payuCredentials.PAYU_API_KEY,
            PAYU_API_LOGIN: !payuCredentials.PAYU_API_LOGIN,
            PAYU_ACCOUNT_ID: !payuCredentials.PAYU_ACCOUNT_ID,
          },
        },
        { status: 500 },
      )
    }

    // Preparar datos adicionales para la tarjeta si es necesario
    let creditCardInfo = undefined
    if ((paymentMethod === "VISA" || paymentMethod === "MASTERCARD") && cardData) {
      creditCardInfo = {
        number: cardData.number.replace(/\s+/g, ""),
        securityCode: cardData.cvc,
        expirationDate: `${cardData.expiryYear}/${cardData.expiryMonth}`,
        name: cardData.name,
      }
    }

    // Create PayU payment request with the updated function, passing client info
    const paymentRequest = createPaymentRequest(
      actualReservationId, // Usar el ID real de la reserva (temporal o permanente)
      amount,
      {
        firstName: reservation.guest.firstName,
        lastName: reservation.guest.lastName,
        email: reservation.guest.email,
        phone: reservation.guest.phone || "",
        dniNumber: "00000000", // DNI por defecto para pruebas
        // Añadir dirección de envío por defecto
        shippingAddress: {
          street1: "Dirección del hotel",
          city: "Lima",
          state: "Lima",
          country: "PE",
          postalCode: "15000",
          phone: reservation.guest.phone || "",
        },
      },
      `Reserva Hotel ${paymentType === "Full" ? "Pago Completo" : "Pago Parcial"}`,
      paymentMethod, // Método de pago seleccionado por el usuario
      {
        returnUrl: `${returnUrl}?paymentId=${payment._id}`,
        cancelUrl: `${cancelUrl}?paymentId=${payment._id}`,
      },
      undefined, // Número de cuotas (ya no se usa)
      otpCode, // Código OTP para Yape (opcional)
      creditCardInfo, // Información de la tarjeta de crédito
      clientInfo, // Información del cliente para PayU
    )

    try {
      // Process payment through PayU
      const payuResponse = await processPayment(paymentRequest)

      // Si la respuesta es exitosa, devolver la URL de redirección
      if (payuResponse.code === "SUCCESS") {
        // Actualizar el pago con el ID de transacción si está disponible
        if (payuResponse.transactionResponse && payuResponse.transactionResponse.transactionId) {
          const db = await getDb()
          await db.collection("payments").updateOne(
            { _id: new ObjectId(payment._id.toString()) },
            {
              $set: {
                transactionId: payuResponse.transactionResponse.transactionId,
                updatedAt: new Date(),
              },
            },
          )
        }

        // Return the PayU response with payment URL
        return NextResponse.json({
          success: true,
          paymentId: payment._id,
          isTemporary: isTemporaryId,
          originalTempId: isTemporaryId ? reservationId : null,
          actualReservationId,
          payuResponse,
        })
      } else {
        // Si hay un error en la respuesta de PayU, actualizar el estado del pago
        console.error("PayU error response:", payuResponse)

        const db = await getDb()
        await db
          .collection("payments")
          .updateOne(
            { _id: new ObjectId(payment._id.toString()) },
            { $set: { status: "Failed", updatedAt: new Date() } },
          )

        return NextResponse.json(
          {
            success: false,
            message: "Error processing payment with PayU",
            error: payuResponse.error || "Unknown PayU error",
            paymentId: payment._id,
          },
          { status: 400 },
        )
      }
    } catch (payuError) {
      console.error("PayU processing error:", payuError)

      // Update payment status to failed
      const db = await getDb()
      await db
        .collection("payments")
        .updateOne({ _id: new ObjectId(payment._id.toString()) }, { $set: { status: "Failed", updatedAt: new Date() } })

      return NextResponse.json(
        {
          success: false,
          message: "Error processing payment with PayU",
          error: payuError instanceof Error ? payuError.message : "Unknown PayU error",
          paymentId: payment._id,
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("Payment creation error:", error)
    return NextResponse.json({ message: error.message || "An error occurred while creating payment" }, { status: 500 })
  }
}

