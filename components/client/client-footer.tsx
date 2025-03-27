import Link from "next/link"

export default function ClientFooter() {
  return (
    <footer className="border-t py-6 md:py-0">
      <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 md:h-16 md:flex-row md:px-6">
        <p className="text-sm text-gray-500">&copy; {new Date().getFullYear()} HotelManager. All rights reserved.</p>
        <div className="flex gap-4">
          <Link href="/terms" className="text-sm text-gray-500 hover:underline">
            Terms
          </Link>
          <Link href="/privacy" className="text-sm text-gray-500 hover:underline">
            Privacy
          </Link>
          <Link href="/contact" className="text-sm text-gray-500 hover:underline">
            Contact
          </Link>
        </div>
      </div>
    </footer>
  )
}

