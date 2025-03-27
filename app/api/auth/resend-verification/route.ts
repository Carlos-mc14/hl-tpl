import { NextResponse } from "next/server"
import { getUserByEmail, setVerificationToken } from "@/models/user"
import { sendVerificationEmail } from "@/lib/email"
import { v4 as uuidv4 } from "uuid"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    // Check if user is trying to resend verification for their own account
    const session = await getServerSession(authOptions)
    let email

    if (session?.user?.email) {
      // User is logged in, use their email
      email = session.user.email
    } else {
      // User is not logged in, get email from request
      const body = await request.json()
      email = body.email

      if (!email) {
        return NextResponse.json({ message: "Email is required" }, { status: 400 })
      }
    }

    const user = await getUserByEmail(email)

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    if (user.emailVerified) {
      return NextResponse.json({ message: "Email is already verified" }, { status: 400 })
    }

    // Generate new verification token
    const verificationToken = uuidv4()

    // Update user with new token
    await setVerificationToken(email, verificationToken)

    // Send verification email
    await sendVerificationEmail(email, verificationToken)

    return NextResponse.json({ message: "Verification email sent successfully" }, { status: 200 })
  } catch (error: any) {
    console.error("Resend verification error:", error)
    return NextResponse.json(
      { message: error.message || "An error occurred while resending verification email" },
      { status: 500 },
    )
  }
}

