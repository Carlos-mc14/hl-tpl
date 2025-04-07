import { getRoomsWithType } from "@/models/room"
import { getAllRoomTypes } from "@/models/room-type"
import { getSiteConfig } from "@/models/site-config"
import RoomList from "@/components/client/room-list"
import { SiteHeader } from "@/components/site/site-header"
import { SiteFooter } from "@/components/site/site-footer"
import { AvailabilitySearch } from "@/components/site/availability-search"
import { checkRoomTypeAvailability } from "@/lib/availability"
import { Suspense } from "react"
import { isValidDate } from "@/lib/validation"

// Función para serializar objetos MongoDB
function serializeData(data: any) {
  return JSON.parse(JSON.stringify(data))
}

// Función para crear una fecha válida a partir de un string
function createValidDate(dateString: string | undefined): Date | null {
  if (!dateString) return null

  try {
    const date = new Date(dateString)
    return isValidDate(date) ? date : null
  } catch (e) {
    console.error("Error creating date from string:", dateString, e)
    return null
  }
}

export default async function RoomsPage({
  searchParams: rawSearchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined }
}) {
  // Await searchParams to ensure it's resolved
  const searchParams = await Promise.resolve(rawSearchParams)
  console.log("Search params received:", searchParams) // Debugging

  // Obtener parámetros de búsqueda
  const checkInStr = searchParams?.checkIn as string | undefined
  const checkOutStr = searchParams?.checkOut as string | undefined
  const adults = searchParams?.adults as string | undefined
  const children = searchParams?.children as string | undefined

  // Crear objetos Date válidos
  const checkInDate = createValidDate(checkInStr)
  const checkOutDate = createValidDate(checkOutStr)

  // Determinar si hay una búsqueda de disponibilidad activa con fechas válidas
  const hasDateSearch = Boolean(checkInDate && checkOutDate)

  if (checkInStr && checkOutStr && !hasDateSearch) {
    console.error("Invalid dates provided:", { checkIn: checkInStr, checkOut: checkOutStr })
  }

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

  if (hasDateSearch && checkInDate && checkOutDate) {
    console.log("Checking availability for dates:", {
      checkIn: checkInDate.toISOString(),
      checkOut: checkOutDate.toISOString(),
    }) // Debugging

    // Verificar disponibilidad para cada tipo de habitación
    const availabilityPromises = roomTypes.map(async (type: any) => {
      try {
        // Verificar disponibilidad real usando la API
        const availability = await checkRoomTypeAvailability(
          type._id.toString(),
          checkInDate,
          checkOutDate,
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
              <Suspense fallback={<div className="h-64 flex items-center justify-center">Loading search form...</div>}>
                <AvailabilitySearch variant="default" />
              </Suspense>
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
                  {checkInDate!.toLocaleDateString()} to {checkOutDate!.toLocaleDateString()}
                </p>
                <div className="mt-4">
                  <Suspense
                    fallback={<div className="h-32 flex items-center justify-center">Loading search form...</div>}
                  >
                    <AvailabilitySearch variant="embedded" />
                  </Suspense>
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

