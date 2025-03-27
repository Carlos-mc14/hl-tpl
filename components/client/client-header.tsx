import Link from "next/link"
import { Hotel, UserCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ClientHeader() {
  return (
    <header className="border-b">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center text-xl font-bold">
            <Hotel className="mr-2 h-6 w-6" />
            HotelManager
          </Link>
          <nav className="hidden md:flex gap-6">
            <Link href="/" className="text-sm font-medium">
              Home
            </Link>
            <Link href="/rooms" className="text-sm font-medium">
              Rooms
            </Link>
            <Link href="/reservations" className="text-sm font-medium">
              Reservations
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/auth/login">
            <Button variant="ghost" size="sm">
              <UserCircle className="mr-2 h-4 w-4" />
              Login
            </Button>
          </Link>
          <Link href="/auth/register">
            <Button size="sm">Register</Button>
          </Link>
        </div>
      </div>
    </header>
  )
}

