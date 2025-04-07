import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { parsePayUNotification } from "@/lib/payu"
import type { ReservationStatus } from "@/models/reservation"
import { calculateReservationPaymentStatus } from "@/models/payment"
import { sendEmail } from "@/lib/email"
import { invalidateCache, invalidateCachePattern } from "@/lib/cache"

// Webhook para recibir notificaciones de PayU
export async function POST(request: Request) {
  try {
    // Obtener los datos de la notificación
    let body
    const contentType = request.headers.get("content-type") || ""

    if (contentType.includes("application/json")) {
      body = await request.json()
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await request.formData()
      body = Object.fromEntries(formData.entries())
    } else {
      // Intentar leer el cuerpo como texto y parsearlo
      const text = await request.text()
      console.log("Webhook raw text:", text)

      try {
        body = JSON.parse(text)
      } catch (e) {
        // Si no es JSON, intentar parsear como form data
        const params = new URLSearchParams(text)
        body = Object.fromEntries(params.entries())
      }
    }

    console.log("PayU webhook received:", JSON.stringify(body))
    console.log(
      "Transaction state:",
      body.transaction?.state || body.transactionResponse?.state || body.state_pol || "unknown",
    )

    // Verificar si es una notificación en formato nuevo (JSON) o antiguo (form data)
    let paymentData

    // Formato nuevo (JSON)
    if (body.transaction && body.transaction.order && body.transaction.order.referenceCode) {
      paymentData = {
        transactionId: body.transaction.id || "",
        referenceCode: body.transaction.order.referenceCode,
        amount: Number.parseFloat(body.transaction.order.additionalValues?.TX_VALUE?.value || "0"),
        currency: body.transaction.order.additionalValues?.TX_VALUE?.currency || "PEN",
        status: mapTransactionStatus(body.transaction.state),
      }
    }
    // Formato de respuesta directa de la API
    else if (body.transactionResponse && body.transactionResponse.state) {
      paymentData = {
        transactionId: body.transactionResponse.transactionId || "",
        referenceCode: body.reference_sale || body.order?.referenceCode || "",
        amount: Number.parseFloat(body.order?.additionalValues?.TX_VALUE?.value || "0"),
        currency: body.order?.additionalValues?.TX_VALUE?.currency || "PEN",
        status: mapTransactionStatus(body.transactionResponse.state),
      }
    }
    // Formato antiguo (form data)
    else if (body.reference_sale) {
      paymentData = parsePayUNotification(body)
    } else {
      console.error("Formato de notificación desconocido:", body)
      return NextResponse.json({ message: "Invalid notification format" }, { status: 400 })
    }

    if (!paymentData) {
      console.error("Invalid notification data:", body)
      return NextResponse.json({ message: "Invalid notification data" }, { status: 400 })
    }

    console.log("Parsed payment data:", JSON.stringify(paymentData))

    const db = await getDb()

    // Buscar el pago por referenceCode
    const payment = await db.collection("payments").findOne({
      "metadata.referenceCode": paymentData.referenceCode,
    })

    if (!payment) {
      console.error("Payment not found for reference code:", paymentData.referenceCode)
      return NextResponse.json({ message: "Payment not found" }, { status: 404 })
    }

    console.log(
      "Payment found:",
      payment._id.toString(),
      "with status:",
      payment.status,
      "-> new status:",
      paymentData.status,
    )

    // Actualizar el estado del pago
    await db.collection("payments").updateOne(
      { _id: payment._id },
      {
        $set: {
          status: paymentData.status,
          transactionId: paymentData.transactionId,
          updatedAt: new Date(),
        },
      },
    )

    // Invalidar caché relacionada con pagos
    await invalidateCache(`payment:${payment._id}`)
    await invalidateCachePattern("payments:*")

    // Enviar notificación por correo al administrador sobre la actualización del pago
    try {
      const adminEmail = process.env.ADMIN_EMAIL || "no-reply@nexius.lat"

      // Obtener información de la reserva si existe
      let reservationInfo = "No disponible"
      let guestInfo = "No disponible"

      if (payment.reservationId) {
        const reservation = await db.collection("reservations").findOne({
          _id: new ObjectId(payment.reservationId),
        })

        if (reservation) {
          reservationInfo = `ID: ${reservation._id}, Código: ${reservation.confirmationCode || "N/A"}`
          guestInfo = `${reservation.guest?.firstName || ""} ${reservation.guest?.lastName || ""} (${reservation.guest?.email || "Sin email"})`
        }
      } else if (payment.metadata?.originalTempId) {
        const tempReservation = await db.collection("temporaryReservations").findOne({
          _id: new ObjectId(payment.metadata.originalTempId),
        })

        if (tempReservation) {
          reservationInfo = `ID Temporal: ${tempReservation._id}, Código: ${tempReservation.confirmationCode || "N/A"}`
          guestInfo = `${tempReservation.guest?.firstName || ""} ${tempReservation.guest?.lastName || ""} (${tempReservation.guest?.email || "Sin email"})`
        }
      }

      // Determinar el método de pago
      const paymentMethod = payment.method || payment.metadata?.paymentMethod || "No especificado"

      await sendEmail({
        to: adminEmail,
        subject: `Notificación de Pago - ${paymentData.status} - Hotel Manager`,
        text: `
          Se ha recibido una notificación de pago de PayU.
          
          Referencia: ${paymentData.referenceCode}
          Estado: ${paymentData.status}
          Monto: ${paymentData.amount} ${paymentData.currency}
          Método de pago: ${paymentMethod}
          ID de transacción: ${paymentData.transactionId}
          
          Información de la reserva: ${reservationInfo}
          Huésped: ${guestInfo}
          
          Fecha y hora: ${new Date().toLocaleString()}
        `,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: ${paymentData.status === "Completed" ? "#4caf50" : paymentData.status === "Failed" ? "#f44336" : "#ff9800"};">
              Notificación de Pago - ${paymentData.status}
            </h1>
            
            <p>Se ha recibido una notificación de pago de PayU.</p>
            
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Detalles del pago:</strong></p>
              <p>Referencia: ${paymentData.referenceCode}</p>
              <p>Estado: <span style="color: ${paymentData.status === "Completed" ? "#4caf50" : paymentData.status === "Failed" ? "#f44336" : "#ff9800"};">${paymentData.status}</span></p>
              <p>Monto: ${paymentData.amount} ${paymentData.currency}</p>
              <p>Método de pago: ${paymentMethod}</p>
              <p>ID de transacción: ${paymentData.transactionId || "No disponible"}</p>
            </div>
            
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Información de la reserva:</strong></p>
              <p>${reservationInfo}</p>
              <p>Huésped: ${guestInfo}</p>
            </div>
            
            <p>Fecha y hora: ${new Date().toLocaleString()}</p>
          </div>
        `,
      })

      console.log("Admin payment notification email sent to", adminEmail)
    } catch (emailError) {
      console.error("Error sending admin payment notification email:", emailError)
      // Continuamos aunque falle el envío del correo
    }

    // Si el pago es para una reserva temporal y está completado, convertirla en permanente
    if (payment.metadata && payment.metadata.isTemporary === true && paymentData.status === "Completed") {
      console.log("Processing completed payment for temporary reservation")

      // Buscar la reserva temporal
      const tempReservation = await db.collection("temporaryReservations").findOne({
        _id: new ObjectId(payment.reservationId),
      })

      if (tempReservation) {
        console.log("Temporary reservation found:", tempReservation._id)

        // Verificar si ya existe una reserva permanente
        const existingPermanentReservation = await db.collection("reservations").findOne({
          "metadata.originalTempId": payment.metadata.originalTempId,
        })

        if (!existingPermanentReservation) {
          console.log("Creating permanent reservation from temporary reservation")

          // Buscar el tipo de habitación
          const roomType = await db.collection("roomTypes").findOne({
            _id: new ObjectId(tempReservation.roomTypeId),
          })

          // Verificar disponibilidad nuevamente antes de crear la reserva permanente
          const checkIn = new Date(tempReservation.checkInDate)
          const checkOut = new Date(tempReservation.checkOutDate)

          // Obtener todas las habitaciones de este tipo
          const rooms = await db.collection("rooms").find({ roomTypeId: tempReservation.roomTypeId }).toArray()

          // Obtener todas las reservas activas que se solapan con las fechas solicitadas
          const reservations = await db
            .collection("reservations")
            .find({
              roomId: { $in: rooms.map((room) => room._id.toString()) },
              status: { $in: ["Confirmed", "Checked-in", "Pending"] },
              $or: [
                // Caso 1: La reserva existente comienza antes y termina durante la nueva reserva
                { checkInDate: { $lt: checkOut }, checkOutDate: { $gt: checkIn } },
                // Caso 2: La reserva existente comienza durante la nueva reserva
                { checkInDate: { $gte: checkIn, $lt: checkOut } },
                // Caso 3: La reserva existente abarca completamente la nueva reserva
                { checkInDate: { $lte: checkIn }, checkOutDate: { $gte: checkOut } },
              ],
            })
            .toArray()

          // Contar cuántas habitaciones están ocupadas para esas fechas
          const occupiedRoomIds = new Set(reservations.map((res) => res.roomId))

          // Buscar una habitación disponible
          const availableRooms = rooms.filter((room) => !occupiedRoomIds.has(room._id.toString()))

          if (availableRooms.length === 0) {
            console.error("No available rooms found for reservation - all rooms are booked")

            // Enviar correo de notificación al administrador
            try {
              await sendEmail({
                to: process.env.ADMIN_EMAIL || "no-reply@nexius.lat",
                subject: "ALERTA: Conflicto de reserva - Hotel Manager",
                text: `
                Se ha recibido un pago para una reserva temporal (ID: ${tempReservation._id}), 
                pero no hay habitaciones disponibles para las fechas solicitadas.
                
                Referencia de pago: ${paymentData.referenceCode}
                Monto: ${paymentData.amount} ${paymentData.currency}
                
                Por favor, contacte al cliente para resolver esta situación.
                `,
                html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h1 style="color: #d32f2f;">ALERTA: Conflicto de reserva</h1>
                  <p>Se ha recibido un pago para una reserva temporal (ID: ${tempReservation._id}), 
                  pero no hay habitaciones disponibles para las fechas solicitadas.</p>
                  
                  <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Detalles del pago:</strong></p>
                    <p>Referencia: ${paymentData.referenceCode}</p>
                    <p>Monto: ${paymentData.amount} ${paymentData.currency}</p>
                    <p>Estado: Completado</p>
                  </div>
                  
                  <p>Por favor, contacte al cliente para resolver esta situación.</p>
                </div>
                `,
              })
            } catch (emailError) {
              console.error("Error sending admin alert email:", emailError)
            }

            // Continuar con la creación de la reserva pero marcarla como "Conflicto"
            // para que el administrador la resuelva manualmente
          }

          // Seleccionar una habitación disponible o marcar como pendiente de asignación
          const selectedRoom = availableRooms.length > 0 ? availableRooms[0] : null

          // Crear una reserva permanente a partir de la temporal
          const permanentReservation = {
            roomId: selectedRoom ? selectedRoom._id.toString() : "pending-assignment",
            userId: undefined, // Usuario no registrado
            guest: tempReservation.guest,
            checkInDate: tempReservation.checkInDate,
            checkOutDate: tempReservation.checkOutDate,
            adults: tempReservation.adults,
            children: tempReservation.children,
            totalPrice: tempReservation.totalPrice,
            status: selectedRoom ? "Confirmed" : ("Conflict" as ReservationStatus),
            paymentStatus:
              payment.type === "Full"
                ? ("Paid" as "Pending" | "Partial" | "Paid")
                : ("Partial" as "Pending" | "Partial" | "Paid"),
            paymentMethod: payment.method || payment.metadata?.paymentMethod || "PayU", // Usar el método guardado en el pago
            specialRequests: tempReservation.specialRequests,
            confirmationCode: tempReservation.confirmationCode,
            metadata: {
              originalTempId: payment.metadata.originalTempId,
              paymentId: payment._id.toString(),
              needsRoomAssignment: selectedRoom ? false : true,
              paymentMethod: payment.method || payment.metadata?.paymentMethod, // Guardar también en los metadatos
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          }

          // Crear la reserva permanente
          const result = await db.collection("reservations").insertOne(permanentReservation)
          const newReservationId = result.insertedId.toString()
          console.log("Permanent reservation created with ID:", newReservationId)

          // Actualizar el pago con el ID de la reserva permanente
          await db.collection("payments").updateOne(
            { _id: payment._id },
            {
              $set: {
                permanentReservationId: newReservationId,
                updatedAt: new Date(),
              },
            },
          )

          // Actualizar el estado de la habitación si se asignó una
          if (selectedRoom) {
            await db
              .collection("rooms")
              .updateOne({ _id: selectedRoom._id }, { $set: { status: "Reserved", updatedAt: new Date() } })
          }

          // Recalcular el estado del pago de la reserva
          await calculateReservationPaymentStatus(newReservationId)

          // Invalidar caché relacionada con reservaciones
          await invalidateCachePattern("reservations:*")
          await invalidateCachePattern("reservationsWithDetails:*")
          await invalidateCachePattern("roomTypes:*")
          await invalidateCachePattern("availability:*")

          // Enviar correo de confirmación al cliente
          try {
            await sendEmail({
              to: tempReservation.guest.email,
              subject: "Confirmación de Reserva - Hotel Manager",
              text: `Estimado/a ${tempReservation.guest.firstName},

Su reserva ha sido confirmada con el código ${tempReservation.confirmationCode}.

Fecha de llegada: ${new Date(tempReservation.checkInDate).toLocaleDateString()}
Fecha de salida: ${new Date(tempReservation.checkOutDate).toLocaleDateString()}

Gracias por su preferencia.`,
              html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #333;">Confirmación de Reserva</h1>
                <p>Estimado/a ${tempReservation.guest.firstName},</p>
                <p>Su reserva ha sido confirmada con el código <strong>${tempReservation.confirmationCode}</strong>.</p>
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <p><strong>Detalles de la reserva:</strong></p>
                  <p>Tipo de habitación: ${roomType ? roomType.name : "No especificado"}</p>
                  <p>Fecha de llegada: ${new Date(tempReservation.checkInDate).toLocaleDateString()}</p>
                  <p>Fecha de salida: ${new Date(tempReservation.checkOutDate).toLocaleDateString()}</p>
                  <p>Huéspedes: ${tempReservation.adults} adultos, ${tempReservation.children} niños</p>
                  <p>Estado del pago: ${payment.type === "Full" ? "Pagado completamente" : "Pago parcial"}</p>
                </div>
                <p>Gracias por su preferencia.</p>
                <p>Atentamente,<br>El equipo de Hotel Manager</p>
              </div>
            `,
            })
            console.log("Confirmation email sent to", tempReservation.guest.email)
          } catch (emailError) {
            console.error("Error sending confirmation email:", emailError)
            // Continuamos aunque falle el envío del correo
          }

          console.log("Permanent reservation created:", newReservationId)
        } else {
          console.log("Permanent reservation already exists:", existingPermanentReservation._id)

          // Actualizar el estado de pago de la reserva existente
          await calculateReservationPaymentStatus(existingPermanentReservation._id.toString())

          // Invalidar caché para esta reserva
          await invalidateCache(`reservation:${existingPermanentReservation._id}`)
          await invalidateCache(`reservationWithDetails:${existingPermanentReservation._id}`)
          await invalidateCachePattern("reservations:*")
          await invalidateCachePattern("reservationsWithDetails:*")
        }
      } else {
        console.error("Temporary reservation not found:", payment.reservationId)
      }
    } else if (!payment.metadata?.isTemporary && paymentData.status === "Completed") {
      // Para reservas normales (no temporales), actualizar el estado del pago
      if (payment.reservationId) {
        console.log("Updating payment status for permanent reservation:", payment.reservationId)

        // Actualizar el estado de la reserva a "Confirmed" si está en "Pending"
        const reservation = await db.collection("reservations").findOne({
          _id: new ObjectId(payment.reservationId),
        })

        if (reservation && reservation.status === "Pending") {
          console.log("Updating reservation status from Pending to Confirmed")
          await db
            .collection("reservations")
            .updateOne(
              { _id: new ObjectId(payment.reservationId) },
              { $set: { status: "Confirmed", updatedAt: new Date() } },
            )
        }

        await calculateReservationPaymentStatus(payment.reservationId)

        // Invalidar caché para esta reserva
        await invalidateCache(`reservation:${payment.reservationId}`)
        await invalidateCache(`reservationWithDetails:${payment.reservationId}`)
        await invalidateCachePattern("reservations:*")
        await invalidateCachePattern("reservationsWithDetails:*")

        // Obtener la reserva para enviar el correo de confirmación
        if (reservation) {
          // Enviar correo de confirmación de pago
          try {
            await sendEmail({
              to: reservation.guest.email,
              subject: "Confirmación de Pago - Hotel Manager",
              text: `Estimado/a ${reservation.guest.firstName},

Su pago por S/. ${payment.amount.toFixed(2)} ha sido procesado exitosamente para la reserva ${reservation.confirmationCode}.

Gracias por su preferencia.`,
              html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #333;">Confirmación de Pago</h1>
                <p>Estimado/a ${reservation.guest.firstName},</p>
                <p>Su pago por <strong>S/. ${payment.amount.toFixed(2)}</strong> ha sido procesado exitosamente para la reserva <strong>${reservation.confirmationCode}</strong>.</p>
                <p>Gracias por su preferencia.</p>
                <p>Atentamente,<br>El equipo de Hotel Manager</p>
              </div>
            `,
            })
            console.log("Payment confirmation email sent to", reservation.guest.email)
          } catch (emailError) {
            console.error("Error sending payment confirmation email:", emailError)
          }
        }
      }
    }

    // Forzar la invalidación de todas las cachés relacionadas con reservas
    console.log("Forcing cache invalidation for all reservations")
    await invalidateCachePattern("*reservations*")
    await invalidateCachePattern("*Reservations*")
    await invalidateCachePattern("*reservation*")
    await invalidateCachePattern("*Reservation*")

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("PayU webhook error:", error)
    return NextResponse.json({ message: error.message || "An error occurred processing the webhook" }, { status: 500 })
  }
}

// Función auxiliar para mapear estados de transacción de PayU
function mapTransactionStatus(state: string): "Completed" | "Failed" | "Pending" {
  if (!state) return "Pending"

  const stateUpper = state.toUpperCase()
  console.log("Mapping transaction state:", stateUpper)

  switch (stateUpper) {
    case "APPROVED":
      return "Completed"
    case "DECLINED":
    case "EXPIRED":
    case "REJECTED":
    case "ENTITY_DECLINED":
      return "Failed"
    default:
      return "Pending"
  }
}

// Función para obtener un nombre legible del método de pago
function getReadablePaymentMethod(method: string): string {
  switch (method.toUpperCase()) {
    case "VISA":
      return "Tarjeta Visa"
    case "MASTERCARD":
      return "Tarjeta Mastercard"
    case "YAPE":
      return "Yape"
    case "PAGOEFECTIVO":
      return "PagoEfectivo"
    default:
      return method || "Desconocido"
  }
}

