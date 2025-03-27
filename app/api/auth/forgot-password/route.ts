import { NextResponse } from "next/server"
import { getUserByEmail, setResetPasswordToken } from "@/models/user"
import { sendPasswordResetEmail } from "@/lib/email"
import { v4 as uuidv4 } from "uuid"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 })
    }

    const user = await getUserByEmail(email)

    // Don't reveal if user exists or not for security
    if (!user) {
      return NextResponse.json(
        { message: "If a user with that email exists, a password reset link has been sent" },
        { status: 200 },
      )
    }

    // Generate reset token
    const resetToken = uuidv4()

    // Update user with reset token
    await setResetPasswordToken(email, resetToken)

    // Send password reset email
    await sendPasswordResetEmail(email, resetToken)

    return NextResponse.json(
      { message: "If a user with that email exists, a password reset link has been sent" },
      { status: 200 },
    )
  } catch (error: any) {
    console.error("Forgot password error:", error)
    return NextResponse.json({ message: "An error occurred while processing your request" }, { status: 500 })
  }
}

