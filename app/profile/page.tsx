"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, Users, Bed, DollarSign, MessageSquare, LogOut } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"
import { toast } from "@/components/ui/use-toast"
import { ExtraServicesList } from "@/components/client/extra-services-list"

interface Reservation {
  _id: string
  roomId: string
  checkInDate: string
  checkOutDate: string
  adults: number
  children: number
  totalPrice: number
  status: string
  paymentStatus: string
  confirmationCode: string
  room?: {
    number: string
    roomType: string
  }
}

export default function ProfilePage() {
  const router = useRouter()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [loggingOut, setLoggingOut] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("active")

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch("/api/auth/me")
        if (!response.ok) {
          if (response.status === 401) {
            router.push("/auth/login?redirect=/profile")
            return
          }
          throw new Error("Failed to fetch user data")
        }
        const userData = await response.json()
        setUser(userData)
      } catch (err) {
        console.error("Error fetching user data:", err)
        setError("Failed to load user data")
      }
    }

    const fetchReservations = async () => {
      try {
        const response = await fetch("/api/user/reservations")
        // Always set reservations to an array, even if there's an error
        if (!response.ok) {
          console.warn("Reservations API returned status:", response.status)
          setReservations([])
        } else {
          const data = await response.json()
          setReservations(Array.isArray(data) ? data : [])
        }
      } catch (err) {
        console.error("Error fetching reservations:", err)
        setReservations([])
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
    fetchReservations()
  }, [router])

  // Función para manejar el logout
  const handleLogout = async () => {
    try {
      setLoggingOut(true)
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        toast({
          title: "Logout successful",
          description: "You have been logged out successfully.",
        })
        router.push("/")
      } else {
        const data = await response.json()
        throw new Error(data.message || "Logout failed")
      }
    } catch (err) {
      console.error("Error during logout:", err)
      toast({
        title: "Logout failed",
        description: "There was an error logging out. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoggingOut(false)
    }
  }

  // Categorize reservations
  const currentDate = new Date()

  const activeReservations = reservations.filter((res) => {
    const checkOutDate = new Date(res.checkOutDate)
    return (res.status === "Confirmed" || res.status === "Checked-in") && checkOutDate >= currentDate
  })

  const pastReservations = reservations.filter((res) => {
    const checkOutDate = new Date(res.checkOutDate)
    return (
      res.status === "Checked-out" ||
      res.status === "Cancelled" ||
      res.status === "No-show" ||
      checkOutDate < currentDate
    )
  })

  const upcomingReservations = reservations.filter((res) => {
    const checkInDate = new Date(res.checkInDate)
    return res.status === "Confirmed" && checkInDate > currentDate
  })

  // Función para manejar la visualización de servicios
  const handleViewServices = (reservationId: string) => {
    setSelectedReservation(reservationId)
    setActiveTab("services") // Cambiar a la pestaña de servicios
  }

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-10">
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <p className="text-red-500 mb-4">{error}</p>
            <Button asChild>
              <Link href="/">Return to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10 px-4 md:px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.firstName} {user?.lastName}
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/">Home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/rooms">Book a Room</Link>
          </Button>
          <Button
            variant="destructive"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-2"
          >
            {loggingOut ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div>
                Logging out...
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4" />
                Logout
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Loyalty Points</CardTitle>
            <CardDescription>Your current loyalty status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0 points</div>
            <p className="text-sm text-muted-foreground mt-1">Standard Member</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Stays</CardTitle>
            <CardDescription>Your booking history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{reservations.length}</div>
            <p className="text-sm text-muted-foreground mt-1">Lifetime reservations</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Account Status</CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              <Badge className="text-sm bg-green-500">Verified</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Member since {new Date().getFullYear()}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="active">
            Active Reservations
            {activeReservations.length > 0 && <Badge className="ml-2 bg-primary">{activeReservations.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="upcoming">
            Upcoming Reservations
            {upcomingReservations.length > 0 && (
              <Badge className="ml-2 bg-primary">{upcomingReservations.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="past">
            Past Reservations
            {pastReservations.length > 0 && <Badge className="ml-2 bg-primary">{pastReservations.length}</Badge>}
          </TabsTrigger>
          {selectedReservation && <TabsTrigger value="services">Extra Services</TabsTrigger>}
        </TabsList>

        <TabsContent value="active">
          {activeReservations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <p className="text-muted-foreground mb-4">You don't have any active reservations</p>
                <Button asChild>
                  <Link href="/rooms">Book a Room</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {activeReservations.map((reservation) => (
                <ReservationCard
                  key={reservation._id.toString()}
                  reservation={reservation}
                  onViewServices={() => handleViewServices(reservation._id.toString())}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="upcoming">
          {upcomingReservations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <p className="text-muted-foreground mb-4">You don't have any upcoming reservations</p>
                <Button asChild>
                  <Link href="/rooms">Book a Room</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {upcomingReservations.map((reservation) => (
                <ReservationCard
                  key={reservation._id.toString()}
                  reservation={reservation}
                  onViewServices={() => handleViewServices(reservation._id.toString())}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past">
          {pastReservations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <p className="text-muted-foreground mb-4">You don't have any past reservations</p>
                <Button asChild>
                  <Link href="/rooms">Book a Room</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pastReservations.map((reservation) => (
                <ReservationCard
                  key={reservation._id.toString()}
                  reservation={reservation}
                  onViewServices={() => handleViewServices(reservation._id.toString())}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {selectedReservation && (
          <TabsContent value="services">
            <Card>
              <CardHeader>
                <CardTitle>Extra Services for Reservation</CardTitle>
                <CardDescription>Request additional services for your stay</CardDescription>
              </CardHeader>
              <CardContent>
                <ExtraServicesList reservationId={selectedReservation} />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

function ReservationCard({
  reservation,
  onViewServices,
}: {
  reservation: Reservation
  onViewServices: () => void
}) {
  const checkInDate = new Date(reservation.checkInDate)
  const checkOutDate = new Date(reservation.checkOutDate)

  // Calculate number of nights
  const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "PEN",
    }).format(amount)
  }

  // Ensure room data is available
  const roomType = reservation.room?.roomType || "Standard Room"
  const roomNumber = reservation.room?.number || "Not assigned"

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">
              {roomType}
              {reservation.confirmationCode && ` - ${reservation.confirmationCode}`}
            </CardTitle>
            <CardDescription>
              {roomNumber !== "Not assigned" ? `Room ${roomNumber}` : "Room details will be assigned at check-in"}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {getStatusBadge(reservation.status)}
            {getPaymentStatusBadge(reservation.paymentStatus)}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-sm">Check-in: {format(checkInDate, "PPP")}</span>
            </div>
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-sm">Check-out: {format(checkOutDate, "PPP")}</span>
            </div>
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-sm">
                {nights} {nights === 1 ? "night" : "nights"}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-sm">
                {reservation.adults} {reservation.adults === 1 ? "adult" : "adults"}
                {reservation.children > 0 &&
                  `, ${reservation.children} ${reservation.children === 1 ? "child" : "children"}`}
              </span>
            </div>
            <div className="flex items-center">
              <Bed className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-sm">{roomType}</span>
            </div>
            <div className="flex items-center">
              <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-sm font-medium">{formatCurrency(reservation.totalPrice)}</span>
            </div>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <MessageSquare className="h-4 w-4 mr-2 text-muted-foreground" />
            <span className="text-sm">
              {reservation.status === "Checked-out" ? "Service history" : "Extra services"}
            </span>
          </div>
          <Button
            size="sm"
            variant={reservation.status === "Checked-out" ? "default" : "outline"}
            onClick={onViewServices}
          >
            {reservation.status === "Checked-out" ? "View History" : "View Services"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function getStatusBadge(status: string) {
  switch (status) {
    case "Confirmed":
      return <Badge className="bg-green-500 text-white">Confirmed</Badge>
    case "Checked-in":
      return <Badge className="bg-blue-500 text-white">Checked-in</Badge>
    case "Checked-out":
      return <Badge className="bg-gray-500 text-white">Checked-out</Badge>
    case "Cancelled":
      return <Badge className="bg-red-500 text-white">Cancelled</Badge>
    case "No-show":
      return <Badge className="bg-amber-500 text-white">No-show</Badge>
    default:
      return <Badge>{status || "Unknown"}</Badge>
  }
}

function getPaymentStatusBadge(status: string) {
  switch (status) {
    case "Paid":
      return <Badge className="bg-green-500 text-white">Paid</Badge>
    case "Partial":
      return <Badge className="bg-amber-500 text-white">Partial</Badge>
    case "Pending":
      return <Badge className="bg-red-500 text-white">Pending</Badge>
    default:
      return <Badge>{status || "Unknown"}</Badge>
  }
}
