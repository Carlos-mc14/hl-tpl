import { getAllRoomTypes } from "@/models/room-type"
import { getRoomsWithType } from "@/models/room"
import ReservationForm from "@/components/client/reservation-form"
import { SiteHeader } from "@/components/site/site-header"
import { SiteFooter } from "@/components/site/site-footer"
import { getSiteConfig } from "@/models/site-config"
import { getCachedData } from "@/lib/cache"
import { Suspense } from "react"

// Función para serializar objetos MongoDB
function serializeData(data: any) {
  return JSON.parse(JSON.stringify(data))
}

// Clave de caché para la página de reservaciones
const getReservationsPageCacheKey = (roomTypeId?: string) => `page:reservations:${roomTypeId || "all"}`

// Componente de carga mientras se resuelven los datos
function ReservationsLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="h-16 bg-white shadow animate-pulse"></div>
      <main className="flex-1 p-8">
        <div className="container mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="h-96 bg-gray-200 rounded"></div>
              <div className="space-y-4">
                <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <div className="h-16 bg-gray-100 animate-pulse"></div>
    </div>
  )
}

// Componente interno que maneja la lógica de la página
async function ReservationsContent({
  roomTypeId,
}: {
  roomTypeId?: string
}) {
  // Usar caché para toda la página para reducir conexiones
  const data = await getCachedData(
    getReservationsPageCacheKey(roomTypeId),
    async () => {
      // Fetch site configuration
      const siteConfig = await getSiteConfig()

      // Fetch all room types
      const roomTypesData = await getAllRoomTypes()

      // Fetch available rooms
      const roomsData = await getRoomsWithType()

      // Serializar los datos para evitar problemas con objetos MongoDB
      const roomTypes = serializeData(roomTypesData)
      const rooms = serializeData(roomsData)
      const serializedSiteConfig = serializeData(siteConfig)

      const availableRooms = rooms.filter((room: any) => room.status === "Available")

      // Get the selected room type if provided
      const selectedRoomType = roomTypeId ? roomTypes.find((type: any) => type._id.toString() === roomTypeId) : null

      return {
        siteConfig: serializedSiteConfig,
        roomTypes,
        availableRooms,
        selectedRoomType,
      }
    },
    60, // Caché por 1 minuto para mantener la página actualizada pero reducir conexiones
  )

  const { siteConfig, roomTypes, availableRooms, selectedRoomType } = data

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader siteConfig={siteConfig} />
      <main className="flex-1">
        {/* Hero section with background image - matching the rooms page style */}
        <section
          className="bg-cover bg-center py-24 text-white relative"
          style={{
            backgroundImage: `url(${siteConfig.homepage.heroImageUrl || "/placeholder.svg?height=600&width=1200"})`,
          }}
        >
          <div className="absolute inset-0 bg-black/50"></div>
          <div className="container mx-auto px-4 md:px-6 relative z-10">
            <div className="mx-auto max-w-[800px] text-center">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Make a Reservation</h1>
              <p className="mt-4 text-lg md:text-xl">
                Book your stay with us for a comfortable and memorable experience
              </p>
            </div>
          </div>
        </section>

        {/* Main content section - matching the rooms page style */}
        <section className="py-12 md:py-24 bg-white">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mx-auto grid max-w-[1000px] gap-8 lg:grid-cols-2">
              <ReservationForm
                roomTypes={roomTypes}
                availableRooms={availableRooms}
                selectedRoomTypeId={selectedRoomType?._id?.toString()}
              />

              <div>
                <h2 className="text-2xl font-bold mb-6">Why Book With Us</h2>
                <div className="space-y-6">
                  <div className="rounded-lg border p-6 shadow-sm">
                    <h3 className="flex items-center gap-2 text-lg font-semibold mb-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-primary"
                      >
                        <rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect>
                        <line x1="16" x2="16" y1="2" y2="6"></line>
                        <line x1="8" x2="8" y1="2" y2="6"></line>
                        <line x1="3" x2="21" y1="10" y2="10"></line>
                      </svg>
                      Flexible Booking
                    </h3>
                    <p className="text-gray-500">
                      Free cancellation up to 24 hours before check-in. Plans change, and we understand.
                    </p>
                  </div>
                  <div className="rounded-lg border p-6 shadow-sm">
                    <h3 className="flex items-center gap-2 text-lg font-semibold mb-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-primary"
                      >
                        <path d="M5 12h14"></path>
                        <path d="m12 5 7 7-7 7"></path>
                      </svg>
                      Direct Check-in
                    </h3>
                    <p className="text-gray-500">
                      Skip the line with our streamlined check-in process. Your room will be ready when you arrive.
                    </p>
                  </div>
                  <div className="rounded-lg border p-6 shadow-sm">
                    <h3 className="flex items-center gap-2 text-lg font-semibold mb-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-primary"
                      >
                        <path d="M2 4v16"></path>
                        <path d="M2 8h18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-2"></path>
                        <path d="M2 17h20"></path>
                        <path d="M6 8v1"></path>
                      </svg>
                      Best Room Guarantee
                    </h3>
                    <p className="text-gray-500">
                      We guarantee you'll get the best room available in your chosen category.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter siteConfig={siteConfig} />
    </div>
  )
}

// Componente principal que usa Suspense para manejar la carga
export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: { roomTypeId?: string; roomType?: string }
}) {
  const params = await searchParams

  // Obtener el ID del tipo de habitación de cualquiera de los dos parámetros posibles
  const roomTypeId = (await params.roomTypeId) || params.roomType

  return (
    <Suspense fallback={<ReservationsLoading />}>
      <ReservationsContent roomTypeId={roomTypeId} />
    </Suspense>
  )
}

