import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { ObjectId } from "mongodb"
import { parsePayUNotification } from "@/lib/payu"
import type { ReservationStatus } from "@/models/reservation"
import { calculateReservationPaymentStatus } from "@/models/payment"
import { sendEmail } from "@/lib/email"

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

    console.log("PayU webhook received:", body)

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

    const db = await getDb()

    // Buscar el pago por referenceCode
    const payment = await db.collection("payments").findOne({
      "metadata.referenceCode": paymentData.referenceCode,
    })

    if (!payment) {
      console.error("Payment not found for reference code:", paymentData.referenceCode)
      return NextResponse.json({ message: "Payment not found" }, { status: 404 })
    }

    console.log("Payment found:", payment._id.toString())

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

    // Si el pago es para una reserva temporal y está completado, convertirla en permanente
    if (payment.metadata && payment.metadata.isTemporary === true && paymentData.status === "Completed") {
      // Buscar la reserva temporal
      const tempReservation = await db.collection("temporaryReservations").findOne({
        _id: new ObjectId(payment.reservationId),
      })

      if (tempReservation) {
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

          // Buscar una habitación disponible del tipo seleccionado
          const availableRoom = await db.collection("rooms").findOne({
            roomTypeId: tempReservation.roomTypeId,
            status: "Available",
          })

          if (!availableRoom) {
            console.error("No available room found for reservation")
            // Aún así continuamos, pero marcamos la reserva como pendiente de asignación
          }

          // Crear una reserva permanente a partir de la temporal
          const permanentReservation = {
            roomId: availableRoom ? availableRoom._id.toString() : "pending-assignment",
            userId: undefined, // Usuario no registrado
            guest: tempReservation.guest,
            checkInDate: tempReservation.checkInDate,
            checkOutDate: tempReservation.checkOutDate,
            adults: tempReservation.adults,
            children: tempReservation.children,
            totalPrice: tempReservation.totalPrice,
            status: "Confirmed" as ReservationStatus,
            paymentStatus:
              payment.type === "Full"
                ? ("Paid" as "Pending" | "Partial" | "Paid")
                : ("Partial" as "Pending" | "Partial" | "Paid"),
            paymentMethod: "PayU",
            specialRequests: tempReservation.specialRequests,
            confirmationCode: tempReservation.confirmationCode,
            metadata: {
              originalTempId: payment.metadata.originalTempId,
              paymentId: payment._id.toString(),
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
          if (availableRoom) {
            await db
              .collection("rooms")
              .updateOne({ _id: availableRoom._id }, { $set: { status: "Reserved", updatedAt: new Date() } })
          }

          // Recalcular el estado del pago de la reserva
          await calculateReservationPaymentStatus(newReservationId)

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
        }
      } else {
        console.error("Temporary reservation not found:", payment.reservationId)
      }
    } else if (!payment.metadata?.isTemporary && paymentData.status === "Completed") {
      // Para reservas normales (no temporales), actualizar el estado del pago
      if (payment.reservationId) {
        await calculateReservationPaymentStatus(payment.reservationId)

        // Obtener la reserva para enviar el correo de confirmación
        const reservation = await db.collection("reservations").findOne({
          _id: new ObjectId(payment.reservationId),
        })

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

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("PayU webhook error:", error)
    return NextResponse.json({ message: error.message || "An error occurred processing the webhook" }, { status: 500 })
  }
}

// Función auxiliar para mapear estados de transacción de PayU
function mapTransactionStatus(state: string): "Completed" | "Failed" | "Pending" {
  switch (state) {
    case "APPROVED":
      return "Completed"
    case "DECLINED":
    case "EXPIRED":
      return "Failed"
    default:
      return "Pending"
  }
}

