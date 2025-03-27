import { NextResponse } from "next/server"
import { createUser } from "@/models/user"
import { getRoleByName } from "@/models/role"
import { sendVerificationEmail } from "@/lib/email"
import { v4 as uuidv4 } from "uuid"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { firstName, lastName, email, password, confirmPassword } = body

    // Validate input
    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ message: "Passwords do not match" }, { status: 400 })
    }

    // Get customer role
    const customerRole = await getRoleByName("Customer")
    if (!customerRole) {
      return NextResponse.json({ message: "Customer role not found" }, { status: 500 })
    }

    // Generate verification token
    const verificationToken = uuidv4()

    // Create user
    const user = await createUser({
      firstName,
      lastName,
      email,
      password,
      role: "Customer",
      status: "Pending",
      verificationToken,
    })

    // Send verification email
    await sendVerificationEmail(email, verificationToken)

    return NextResponse.json(
      { message: "User registered successfully. Please check your email to verify your account." },
      { status: 201 },
    )
  } catch (error: any) {
    console.error("Registration error:", error)
    return NextResponse.json({ message: error.message || "An error occurred during registration" }, { status: 500 })
  }
}

