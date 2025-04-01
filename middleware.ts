import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtVerify } from "jose"
import redis from "@/lib/redis"

export async function middleware(request: NextRequest) {
  // Get the pathname of the request
  const pathname = request.nextUrl.pathname

  // Public routes that don't require authentication
  const publicRoutes = [
    "/",
    "/auth/login",
    "/auth/register",
    "/auth/verify-email",
    "/auth/forgot-password",
    "/auth/reset-password",
    "/rooms",
    "/reservations",
    "/reservations/payment",
    "/reservations/confirmation",

  ]

  // API routes that don't require authentication
  const publicApiRoutes = [
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/verify-email",
    "/api/auth/resend-verification",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
    "/api/auth/logout",
    "/api/user/reservations",
    "/api/init",
    "/api/debug/session",
    "/api/payments/check-config",
    "/api/payments/create",
    "/api/payments/status",
  ]

  // Check if the route is public
  const isPublicRoute =
    publicRoutes.some((route) => pathname === route) || publicApiRoutes.some((route) => pathname.startsWith(route))

  // If it's a public route, allow access
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Check for auth token
  const authToken = request.cookies.get("auth-token")?.value

  // If no token and not a public route, redirect to login
  if (!authToken) {
    const url = new URL("/auth/login", request.url)
    url.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(url)
  }

  try {
    // Verify token
    const secretKey = process.env.JWT_SECRET || "fallback-secret-key-change-me"
    const { payload } = await jwtVerify(authToken, new TextEncoder().encode(secretKey))

    // Get session data from Redis
    const sessionId = payload.sessionId as string
    if (!sessionId) {
      throw new Error("No sessionId in token")
    }

    const sessionData = await redis.get(`session:${sessionId}`)
    if (!sessionData) {
      throw new Error("Session not found")
    }

    // Parse session data if it's a string
    let userData
    if (typeof sessionData === "string") {
      try {
        userData = JSON.parse(sessionData)
      } catch (e) {
        throw new Error("Invalid session data format")
      }
    } else {
      userData = sessionData
    }

    // Dashboard routes check - only staff can access
    if (pathname.startsWith("/dashboard")) {
      const userRole = userData.role
      const isStaff =
        userRole === "Administrator" ||
        userRole === "Staff" ||
        userData.permissions.includes("manage:users") ||
        userData.permissions.includes("manage:roles") ||
        userData.permissions.includes("manage:rooms") ||
        userData.permissions.includes("manage:reservations")

      console.log("User role:", userRole)
      console.log("Is staff:", isStaff)
      console.log("User permissions:", userData.permissions)

      if (!isStaff) {
        console.log("Access denied to dashboard route")
        return NextResponse.redirect(new URL("/profile", request.url))
      }
    }

    // Token is valid, allow access
    return NextResponse.next()
  } catch (error) {
    // Token is invalid, redirect to login
    console.error("Auth error in middleware:", error)
    const url = new URL("/auth/login", request.url)
    url.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(url)
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
}
