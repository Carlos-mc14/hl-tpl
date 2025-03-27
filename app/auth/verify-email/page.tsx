"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle, XCircle } from "lucide-react"
import Link from "next/link"

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")

  const token = searchParams.get("token")
  const success = searchParams.get("success")
  const error = searchParams.get("error")

  useEffect(() => {
    // If we already have success or error in URL params, use that
    if (success === "true") {
      setStatus("success")
      return
    }

    if (error) {
      setStatus("error")
      setMessage(decodeURIComponent(error))
      return
    }

    // If we have a token, verify it
    if (token) {
      const verifyToken = async () => {
        try {
          const response = await fetch("/api/auth/verify-email", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ token }),
          })

          const data = await response.json()

          if (response.ok) {
            setStatus("success")
          } else {
            setStatus("error")
            setMessage(data.message || "Failed to verify email")
          }
        } catch (err) {
          setStatus("error")
          setMessage("An error occurred while verifying your email")
          console.error(err)
        }
      }

      verifyToken()
    } else {
      setStatus("error")
      setMessage("No verification token provided")
    }
  }, [token, success, error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Email Verification</CardTitle>
          <CardDescription>
            {status === "loading" && "Verifying your email address..."}
            {status === "success" && "Your email has been verified!"}
            {status === "error" && "Email verification failed"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center space-y-4 pt-6">
          {status === "loading" && <Loader2 className="h-16 w-16 animate-spin text-primary" />}
          {status === "success" && <CheckCircle className="h-16 w-16 text-green-500" />}
          {status === "error" && (
            <>
              <XCircle className="h-16 w-16 text-red-500" />
              <p className="text-center text-sm text-red-500">{message}</p>
            </>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          {status === "success" && (
            <>
              <p className="text-center text-sm text-gray-500">You can now log in to your account.</p>
              <Button asChild className="w-full">
                <Link href="/auth/login">Go to Login</Link>
              </Button>
            </>
          )}
          {status === "error" && (
            <Button asChild variant="outline" className="w-full">
              <Link href="/auth/login">Back to Login</Link>
            </Button>
          )}
          <Button asChild variant="ghost" className="w-full">
            <Link href="/">Return to Home</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

