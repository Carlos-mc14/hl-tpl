import { getRoomsWithType } from "@/models/room"
import { getAllRoomTypes } from "@/models/room-type"
import { getSiteConfig } from "@/models/site-config"
import RoomList from "@/components/client/room-list"
import { SiteHeader } from "@/components/site/site-header"
import { SiteFooter } from "@/components/site/site-footer"

// Función para serializar objetos MongoDB
function serializeData(data: any) {
  return JSON.parse(JSON.stringify(data))
}

export default async function RoomsPage() {
  // Fetch room types from the database
  const roomTypesData = await getAllRoomTypes()
  const siteConfig = await getSiteConfig()

  // Fetch available rooms with their types
  const roomsData = await getRoomsWithType()

  // Serializar los datos para evitar problemas con objetos MongoDB
  const roomTypes = serializeData(roomTypesData)
  const rooms = serializeData(roomsData)
  const serializedSiteConfig = serializeData(siteConfig)

  // Filter only available rooms
  const availableRooms = rooms.filter((room: any) => room.status === "Available")

  // Group rooms by type
  const roomsByType = roomTypes.map((type: any) => {
    const typeRooms = availableRooms.filter((room: any) => room.roomTypeId === type._id.toString())
    return {
      ...type,
      availableCount: typeRooms.length,
      rooms: typeRooms,
    }
  })

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

        <section className="py-12 md:py-24 bg-white">
          <div className="container mx-auto px-4 md:px-6">
            <RoomList roomTypes={roomsByType} />
          </div>
        </section>
      </main>

      <SiteFooter siteConfig={serializedSiteConfig} />
    </div>
  )
}

