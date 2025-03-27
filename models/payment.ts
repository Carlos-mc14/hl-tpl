import { ObjectId } from "mongodb"
import { getDb } from "@/lib/db"

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

  return result.modifiedCount > 0
}

export async function updateReservationPaymentStatus(reservationId: string, status: PaymentStatus) {
  const db = await getDb()

  const result = await db
    .collection("reservations")
    .updateOne({ _id: new ObjectId(reservationId) }, { $set: { paymentStatus: status, updatedAt: new Date() } })

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

  return {
    totalPrice: reservation.totalPrice,
    totalPaid,
    remaining: Math.max(0, reservation.totalPrice - totalPaid),
    paymentStatus,
  }
}

