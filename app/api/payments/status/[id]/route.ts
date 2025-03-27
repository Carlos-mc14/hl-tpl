import { NextResponse } from "next/server"
import { getPaymentById, calculateReservationPaymentStatus } from "@/models/payment"
import { verifyPayment } from "@/lib/payu"
import { getCurrentUser } from "@/lib/session"
import { getDb } from "@/lib/db"
import { ObjectId } from "mongodb"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const paymentId = params.id
    const db = await getDb()

    // Obtener el pago de la base de datos
    const payment = await getPaymentById(paymentId)

    if (!payment) {
      return NextResponse.json({ message: "Payment not found" }, { status: 404 })
    }

    // Verificar si es un pago para una reserva temporal
    const isTemporaryReservation = payment.metadata && payment.metadata.isTemporary === true

    let payuStatus = null
    let reservationPaymentStatus = null
    let tempReservationData = null

    // Si el pago tiene un ID de transacción, verificar su estado con PayU
    if (payment.transactionId) {
      try {
        payuStatus = await verifyPayment(payment.transactionId)
      } catch (error) {
        console.error("Error verifying payment with PayU:", error)
      }
    }

    if (isTemporaryReservation) {
      // Para pagos de reservas temporales, obtener la información de la base de datos temporal
      const tempReservation = await db.collection("temporaryReservations").findOne({
        _id: new ObjectId(payment.reservationId),
      })

      if (tempReservation) {
        tempReservationData = tempReservation

        // Calcular el estado del pago para la reserva temporal
        reservationPaymentStatus = {
          totalPrice: tempReservation.totalPrice,
          totalPaid: payment.status === "Completed" ? payment.amount : 0,
          remaining:
            payment.status === "Completed"
              ? Math.max(0, tempReservation.totalPrice - payment.amount)
              : tempReservation.totalPrice,
          paymentStatus:
            payment.status === "Completed"
              ? payment.amount >= tempReservation.totalPrice
                ? "Completed"
                : "Partial"
              : "Pending",
        }
      } else {
        // Si no se encuentra la reserva temporal, usar los datos del pago
        reservationPaymentStatus = {
          totalPrice: payment.amount,
          totalPaid: payment.status === "Completed" ? payment.amount : 0,
          remaining: payment.status === "Completed" ? 0 : payment.amount,
          paymentStatus: payment.status,
        }
      }
    } else {
      // Para reservas normales, calcular el estado del pago
      reservationPaymentStatus = await calculateReservationPaymentStatus(payment.reservationId)
    }

    // Si el pago está completado y es para una reserva temporal,
    // podríamos convertir la reserva temporal en permanente aquí
    if (payment.status === "Completed" && isTemporaryReservation && tempReservationData) {
      // Verificar si ya se ha creado una reserva permanente
      const existingPermanentReservation = await db.collection("reservations").findOne({
        "metadata.originalTempId": payment.metadata.originalTempId,
      })

      if (!existingPermanentReservation) {
        // Aquí iría el código para convertir la reserva temporal en permanente
        // Este proceso dependerá de la estructura de tu base de datos
        console.log("Se debería crear una reserva permanente a partir de la temporal")

        // Ejemplo de cómo podría ser:
        /*
        const permanentReservation = {
          ...tempReservationData,
          _id: new ObjectId(),
          status: "Confirmed",
          paymentStatus: reservationPaymentStatus.paymentStatus,
          metadata: {
            originalTempId: payment.metadata.originalTempId,
            paymentId: payment._id
          },
          createdAt: new Date(),
          updatedAt: new Date()
        }
        
        delete permanentReservation.originalId;
        
        await db.collection("reservations").insertOne(permanentReservation)
        */
      }
    }

    return NextResponse.json({
      payment,
      payuStatus,
      reservationPaymentStatus,
      isTemporary: isTemporaryReservation,
      tempReservationData: isTemporaryReservation ? tempReservationData : null,
    })
  } catch (error: any) {
    console.error("Payment status error:", error)
    return NextResponse.json(
      { message: error.message || "An error occurred while checking payment status" },
      { status: 500 },
    )
  }
}

