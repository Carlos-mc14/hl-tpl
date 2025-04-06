import { getRoomsWithType } from "@/models/room"
import { getAllRoomTypes } from "@/models/room-type"
import { getSiteConfig } from "@/models/site-config"
import RoomList from "@/components/client/room-list"
import { SiteHeader } from "@/components/site/site-header"
import { SiteFooter } from "@/components/site/site-footer"
import { AvailabilitySearch } from "@/components/site/availability-search"
import { checkRoomTypeAvailability } from "@/lib/availability"

// Función para serializar objetos MongoDB
function serializeData(data: any) {
  return JSON.parse(JSON.stringify(data))
}

export default async function RoomsPage({
  searchParams: rawSearchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined }
}) {
  // Await searchParams to ensure it's resolved
  const searchParams = await Promise.resolve(rawSearchParams)

  // Obtener parámetros de búsqueda
  const checkIn = searchParams?.checkIn as string | undefined
  const checkOut = searchParams?.checkOut as string | undefined
  const adults = searchParams?.adults as string | undefined
  const children = searchParams?.children as string | undefined

  // Determinar si hay una búsqueda de disponibilidad activa
  const hasDateSearch = Boolean(checkIn && checkOut)

  // Fetch room types from the database
  const roomTypesData = await getAllRoomTypes()
  const siteConfig = await getSiteConfig()

  // Fetch available rooms with their types
  const roomsData = await getRoomsWithType()

  // Serializar los datos para evitar problemas con objetos MongoDB
  const roomTypes = serializeData(roomTypesData)
  const rooms = serializeData(roomsData)
  const serializedSiteConfig = serializeData(siteConfig)

  // Si hay búsqueda por fechas, verificar disponibilidad real
  let roomsByType = []

  if (hasDateSearch && checkIn && checkOut) {
    // Verificar disponibilidad para cada tipo de habitación
    const availabilityPromises = roomTypes.map(async (type: any) => {
      try {
        // Verificar disponibilidad real usando la API
        const availability = await checkRoomTypeAvailability(
          type._id.toString(),
          new Date(checkIn),
          new Date(checkOut),
          Number.parseInt(adults || "2"),
          Number.parseInt(children || "0"),
        )

        return {
          ...type,
          availableCount: availability.availableRooms || 0,
          available: availability.available,
          rooms: rooms.filter((room: any) => room.roomTypeId === type._id.toString() && room.status === "Available"),
        }
      } catch (error) {
        console.error(`Error checking availability for room type ${type._id}:`, error)
        return {
          ...type,
          availableCount: 0,
          available: false,
          rooms: [],
        }
      }
    })

    roomsByType = await Promise.all(availabilityPromises)
  } else {
    // Si no hay búsqueda por fechas, mostrar todas las habitaciones disponibles por estado
    const availableRooms = rooms.filter((room: any) => room.status === "Available")

    roomsByType = roomTypes.map((type: any) => {
      const typeRooms = availableRooms.filter((room: any) => room.roomTypeId === type._id.toString())
      return {
        ...type,
        availableCount: typeRooms.length,
        rooms: typeRooms,
      }
    })
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader siteConfig={serializedSiteConfig} />

      <main className="flex-1">
        <section
          className="bg-cover bg-center py-24 text-white relative"
          style={{
            backgroundImage: `url(${serializedSiteConfig.homepage.heroImageUrl || "/placeholder.svg?height=600&width=1200"})`,
          }}
        >
          <div className="absolute inset-0 bg-black/50"></div>
          <div className="container mx-auto px-4 md:px-6 relative z-10">
            <div className="mx-auto max-w-[800px] text-center">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Our Rooms</h1>
              <p className="mt-4 text-lg md:text-xl">
                Discover our comfortable and elegant accommodations for your perfect stay
              </p>
            </div>
          </div>
        </section>

        {!hasDateSearch && (
          <section className="py-8 bg-white">
            <div className="container mx-auto px-4 md:px-6">
              <div className="max-w-4xl mx-auto">
                <div className="bg-muted/30 p-6 rounded-lg border">
                  <h2 className="text-xl font-semibold mb-4 text-center">Check Room Availability</h2>
                  <p className="text-center text-muted-foreground mb-6">
                    Select your dates to see available rooms for your stay
                  </p>
                  <AvailabilitySearch />
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="py-12 md:py-24 bg-white">
          <div className="container mx-auto px-4 md:px-6">
            {hasDateSearch && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-2">Available Rooms</h2>
                <p className="text-muted-foreground">
                  Showing availability for {adults || "2"} adults and {children || "0"} children from{" "}
                  {new Date(checkIn!).toLocaleDateString()} to {new Date(checkOut!).toLocaleDateString()}
                </p>
                <div className="mt-4">
                  <AvailabilitySearch />
                </div>
              </div>
            )}
            <RoomList roomTypes={roomsByType} hasDateSearch={hasDateSearch} />
          </div>
        </section>
      </main>

      <SiteFooter siteConfig={serializedSiteConfig} />
    </div>
  )
}

