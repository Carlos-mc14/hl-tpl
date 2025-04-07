import { ObjectId } from "mongodb"
import { getDb } from "@/lib/mongodb"
import { invalidateCache, invalidateCachePattern } from "@/lib/cache"

export type PaymentStatus = "Pending" | "Completed" | "Failed" | "Refunded" | "Partial"
export type PaymentMethod = "PayU" | "Cash" | "CreditCard" | "BankTransfer"
export type PaymentType = "Full" | "Partial" | "OnArrival"

export interface Payment {
  _id?: ObjectId
  reservationId: string
  transactionId?: string
  amount: number
  currency: string
  status: PaymentStatus
  method: PaymentMethod
  type: PaymentType
  paymentDate: Date
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export async function createPayment(paymentData: Omit<Payment, "_id" | "createdAt" | "updatedAt">) {
  const db = await getDb()

  const newPayment = {
    ...paymentData,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const result = await db.collection("payments").insertOne(newPayment)
  return { ...newPayment, _id: result.insertedId }
}

export async function getPaymentById(id: string) {
  const db = await getDb()
  return db.collection("payments").findOne({ _id: new ObjectId(id) })
}

export async function getPaymentsByReservationId(reservationId: string) {
  const db = await getDb()
  return db.collection("payments").find({ reservationId }).toArray()
}

export async function updatePayment(id: string, paymentData: Partial<Payment>) {
  const db = await getDb()

  const updateData = {
    ...paymentData,
    updatedAt: new Date(),
  }

  const result = await db.collection("payments").updateOne({ _id: new ObjectId(id) }, { $set: updateData })

  // Invalidate cache
  await invalidateCache(`payment:${id}`)
  await invalidateCachePattern("payments:*")

  return result.modifiedCount > 0
}

export async function updateReservationPaymentStatus(reservationId: string, status: PaymentStatus) {
  const db = await getDb()

  const result = await db
    .collection("reservations")
    .updateOne({ _id: new ObjectId(reservationId) }, { $set: { paymentStatus: status, updatedAt: new Date() } })

  // Invalidate cache for this reservation
  await invalidateCache(`reservation:${reservationId}`)
  await invalidateCache(`reservationWithDetails:${reservationId}`)
  await invalidateCachePattern("reservations:*")
  await invalidateCachePattern("reservationsWithDetails:*")

  return result.modifiedCount > 0
}

export async function calculateReservationPaymentStatus(reservationId: string) {
  const db = await getDb()

  // Get the reservation to find the total price
  const reservation = await db.collection("reservations").findOne({ _id: new ObjectId(reservationId) })
  if (!reservation) {
    throw new Error("Reservation not found")
  }

  // Get all completed payments for this reservation
  const payments = await db
    .collection("payments")
    .find({
      reservationId,
      status: "Completed",
    })
    .toArray()

  // Calculate total paid amount
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0)

  // Determine payment status
  let paymentStatus: PaymentStatus
  if (totalPaid >= reservation.totalPrice) {
    paymentStatus = "Completed"
  } else if (totalPaid > 0) {
    paymentStatus = "Partial"
  } else {
    paymentStatus = "Pending"
  }

  // Update reservation payment status
  await updateReservationPaymentStatus(reservationId, paymentStatus)

  // Also update the reservation status to Confirmed if it was Pending
  if (reservation.status === "Pending") {
    await db
      .collection("reservations")
      .updateOne({ _id: new ObjectId(reservationId) }, { $set: { status: "Confirmed", updatedAt: new Date() } })
  }

  // Invalidate cache
  await invalidateCache(`reservation:${reservationId}`)
  await invalidateCache(`reservationWithDetails:${reservationId}`)
  await invalidateCachePattern("reservations:*")
  await invalidateCachePattern("reservationsWithDetails:*")

  // Obtener el método de pago más reciente
  const latestPayment =
    payments.length > 0
      ? payments.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())[0]
      : null

  return {
    totalPrice: reservation.totalPrice,
    totalPaid,
    remaining: Math.max(0, reservation.totalPrice - totalPaid),
    paymentStatus,
    paymentMethod: latestPayment?.method || reservation.paymentMethod || "No especificado",
    paymentMetadata: latestPayment?.metadata || {},
  }
}

