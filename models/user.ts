import { ObjectId } from "mongodb"
import { getDb } from "@/lib/mongodb"
import bcrypt from "bcryptjs"

export interface User {
  _id?: ObjectId
  firstName: string
  lastName: string
  email: string
  password: string
  role: string
  status: "Active" | "Inactive" | "Pending"
  emailVerified?: Date
  verificationToken?: string
  resetPasswordToken?: string
  resetPasswordExpires?: Date
  createdAt: Date
  updatedAt: Date
}

export async function createUser(userData: Omit<User, "_id" | "createdAt" | "updatedAt">) {
  const db = await getDb()

  // Check if user already exists
  const existingUser = await db.collection("users").findOne({ email: userData.email })
  if (existingUser) {
    throw new Error("User already exists")
  }

  // Hash password
  const salt = await bcrypt.genSalt(10)
  const hashedPassword = await bcrypt.hash(userData.password, salt)

  // Create user
  const newUser = {
    ...userData,
    password: hashedPassword,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const result = await db.collection("users").insertOne(newUser)
  return { ...newUser, _id: result.insertedId }
}

export async function getUserByEmail(email: string) {
  const db = await getDb()
  return db.collection("users").findOne({ email })
}

export async function getUserById(id: string) {
  const db = await getDb()
  return db.collection("users").findOne({ _id: new ObjectId(id) })
}

export async function updateUser(id: string, userData: Partial<User>) {
  const db = await getDb()

  // If updating password, hash it
  if (userData.password) {
    const salt = await bcrypt.genSalt(10)
    userData.password = await bcrypt.hash(userData.password, salt)
  }

  const updateData = {
    ...userData,
    updatedAt: new Date(),
  }

  const result = await db.collection("users").updateOne({ _id: new ObjectId(id) }, { $set: updateData })

  return result.modifiedCount > 0
}

export async function deleteUser(id: string) {
  const db = await getDb()
  const result = await db.collection("users").deleteOne({ _id: new ObjectId(id) })
  return result.deletedCount > 0
}

export async function verifyPassword(user: User, password: string) {
  return bcrypt.compare(password, user.password)
}

export async function getAllUsers(filter = {}) {
  const db = await getDb()
  return db.collection("users").find(filter).toArray()
}

export async function setVerificationToken(email: string, token: string) {
  const db = await getDb()
  await db.collection("users").updateOne({ email }, { $set: { verificationToken: token, updatedAt: new Date() } })
}

export async function verifyEmail(token: string) {
  const db = await getDb()
  const user = await db.collection("users").findOne({ verificationToken: token })

  if (!user) {
    throw new Error("Invalid verification token")
  }

  await db.collection("users").updateOne(
    { _id: user._id },
    {
      $set: {
        emailVerified: new Date(),
        status: "Active",
        updatedAt: new Date(),
      },
      $unset: { verificationToken: 1 },
    },
  )

  return user
}

export async function setResetPasswordToken(email: string, token: string) {
  const db = await getDb()
  const expires = new Date()
  expires.setHours(expires.getHours() + 1) // Token expires in 1 hour

  await db.collection("users").updateOne(
    { email },
    {
      $set: {
        resetPasswordToken: token,
        resetPasswordExpires: expires,
        updatedAt: new Date(),
      },
    },
  )
}

export async function resetPassword(token: string, newPassword: string) {
  const db = await getDb()
  const user = await db.collection("users").findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: new Date() },
  })

  if (!user) {
    throw new Error("Invalid or expired reset token")
  }

  const salt = await bcrypt.genSalt(10)
  const hashedPassword = await bcrypt.hash(newPassword, salt)

  await db.collection("users").updateOne(
    { _id: user._id },
    {
      $set: {
        password: hashedPassword,
        updatedAt: new Date(),
      },
      $unset: {
        resetPasswordToken: 1,
        resetPasswordExpires: 1,
      },
    },
  )

  return user
}

