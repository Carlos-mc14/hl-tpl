import { NextResponse } from "next/server"
import { verifyEmail } from "@/models/user"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const token = url.searchParams.get("token")

    if (!token) {
      return NextResponse.json({ message: "Verification token is required" }, { status: 400 })
    }

    const user = await verifyEmail(token)

    // Redirect to a success page instead of returning JSON
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/auth/verify-email?success=true`)
  } catch (error: any) {
    console.error("Email verification error:", error)
    // Redirect to error page
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/auth/verify-email?error=${encodeURIComponent(error.message || "An error occurred")}`,
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json({ message: "Verification token is required" }, { status: 400 })
    }

    const user = await verifyEmail(token)

    return NextResponse.json({ message: "Email verified successfully" }, { status: 200 })
  } catch (error: any) {
    console.error("Email verification error:", error)
    return NextResponse.json(
      { message: error.message || "An error occurred during email verification" },
      { status: 500 },
    )
  }
}

