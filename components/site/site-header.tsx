"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Menu, X, ChevronDown, User, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"

interface SiteHeaderProps {
  siteConfig: any
}

export function SiteHeader({ siteConfig }: SiteHeaderProps) {
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch("/api/auth/me")
        if (response.ok) {
          const userData = await response.json()
          setUser(userData)
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [])

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

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
        setUser(null)
        // Forzar recarga para limpiar cualquier estado persistente
        window.location.href = "/"
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

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled ? "bg-white shadow-md py-2" : "bg-transparent py-4",
      )}
      style={
        isScrolled
          ? {}
          : {
              background: "linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)",
            }
      }
    >
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-12 items-center">
          {/* Logo */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center">
              <img src={siteConfig.logoUrl || "/placeholder.svg"} alt={siteConfig.hotelName} className="h-10 w-auto" />
            </Link>
          </div>

          {/* Desktop Navigation - Centered */}
          <div className="hidden lg:flex col-span-8 justify-center">
            <NavigationMenu>
              <NavigationMenuList className="flex justify-center gap-2">
                <NavigationMenuItem>
                  <Link href="/" legacyBehavior passHref>
                    <NavigationMenuLink
                      className={cn(
                        "group inline-flex h-10 w-max items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors",
                        isScrolled
                          ? "text-foreground hover:bg-accent hover:text-accent-foreground"
                          : "text-white hover:bg-white/10",
                      )}
                    >
                      Home
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuTrigger
                    className={cn(
                      isScrolled
                        ? "text-foreground hover:bg-accent hover:text-accent-foreground"
                        : "text-black hover:bg-white/10",
                    )}
                  >
                    Rooms
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                      <li className="row-span-3">
                        <NavigationMenuLink asChild>
                          <a
                            className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md"
                            href="/rooms"
                          >
                            <div className="mb-2 mt-4 text-lg font-medium">All Rooms</div>
                            <p className="text-sm leading-tight text-muted-foreground">
                              Explore all our luxurious rooms and suites
                            </p>
                          </a>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <Link href="/rooms?type=standard" legacyBehavior passHref>
                          <NavigationMenuLink className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
                            <div className="text-sm font-medium leading-none">Standard Rooms</div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                              Comfortable rooms with essential amenities
                            </p>
                          </NavigationMenuLink>
                        </Link>
                      </li>
                      <li>
                        <Link href="/rooms?type=deluxe" legacyBehavior passHref>
                          <NavigationMenuLink className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
                            <div className="text-sm font-medium leading-none">Deluxe Rooms</div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                              Spacious rooms with premium amenities
                            </p>
                          </NavigationMenuLink>
                        </Link>
                      </li>
                      <li>
                        <Link href="/rooms?type=suite" legacyBehavior passHref>
                          <NavigationMenuLink className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
                            <div className="text-sm font-medium leading-none">Suites</div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                              Luxury suites with separate living areas
                            </p>
                          </NavigationMenuLink>
                        </Link>
                      </li>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <Link href="/amenities" legacyBehavior passHref>
                    <NavigationMenuLink
                      className={cn(
                        "group inline-flex h-10 w-max items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors",
                        isScrolled
                          ? "text-foreground hover:bg-accent hover:text-accent-foreground"
                          : "text-white hover:bg-white/10",
                      )}
                    >
                      Amenities
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <Link href="/gallery" legacyBehavior passHref>
                    <NavigationMenuLink
                      className={cn(
                        "group inline-flex h-10 w-max items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors",
                        isScrolled
                          ? "text-foreground hover:bg-accent hover:text-accent-foreground"
                          : "text-white hover:bg-white/10",
                      )}
                    >
                      Gallery
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <Link href="/contact" legacyBehavior passHref>
                    <NavigationMenuLink
                      className={cn(
                        "group inline-flex h-10 w-max items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors",
                        isScrolled
                          ? "text-foreground hover:bg-accent hover:text-accent-foreground"
                          : "text-white hover:bg-white/10",
                      )}
                    >
                      Contact
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* Action Buttons */}
          <div className="hidden lg:flex col-span-2 items-center justify-end space-x-2">
            {loading ? (
              <div className="h-10 w-20 bg-gray-200 animate-pulse rounded"></div>
            ) : user ? (
              <div className="flex items-center space-x-2">
                <Link href="/profile">
                  <Button
                    variant="ghost"
                    className={cn(
                      isScrolled
                        ? "text-foreground hover:bg-accent hover:text-accent-foreground"
                        : "text-white hover:bg-white/10",
                    )}
                  >
                    <User className="h-5 w-5 mr-2" />
                    {user.firstName}
                  </Button>
                </Link>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="flex items-center"
                >
                  {loggingOut ? (
                    <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div>
                  ) : (
                    <>
                      <LogOut className="h-4 w-4 mr-1" />
                      Logout
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <Link href="/auth/login">
                <Button
                  variant="ghost"
                  className={cn(
                    isScrolled
                      ? "text-foreground hover:bg-accent hover:text-accent-foreground"
                      : "text-white hover:bg-white/10",
                  )}
                >
                  <User className="h-5 w-5 mr-2" />
                  Login
                </Button>
              </Link>
            )}

            <Link href="/reservations">
              <Button
                style={{
                  backgroundColor: siteConfig.primaryColor || "#3b82f6",
                  color: "#fff",
                }}
              >
                Book Now
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden col-span-10 flex justify-end">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={cn(
                isScrolled
                  ? "text-foreground hover:bg-accent hover:text-accent-foreground"
                  : "text-white hover:bg-white/10",
              )}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden mt-2 py-4 px-2 bg-white rounded-md shadow-md">
            <nav className="flex flex-col space-y-2">
              <Link
                href="/"
                className="px-4 py-2 text-sm font-medium rounded-md hover:bg-accent"
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>

              <div className="relative">
                <button
                  className="w-full flex items-center justify-between px-4 py-2 text-sm font-medium rounded-md hover:bg-accent"
                  onClick={(e) => {
                    e.preventDefault()
                    const target = e.currentTarget.nextElementSibling
                    if (target) {
                      target.classList.toggle("hidden")
                    }
                  }}
                >
                  <span>Rooms</span>
                  <ChevronDown className="h-4 w-4" />
                </button>
                <div className="hidden pl-4 mt-1 space-y-1">
                  <Link
                    href="/rooms"
                    className="block px-4 py-2 text-sm rounded-md hover:bg-accent"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    All Rooms
                  </Link>
                  <Link
                    href="/rooms?type=standard"
                    className="block px-4 py-2 text-sm rounded-md hover:bg-accent"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Standard Rooms
                  </Link>
                  <Link
                    href="/rooms?type=deluxe"
                    className="block px-4 py-2 text-sm rounded-md hover:bg-accent"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Deluxe Rooms
                  </Link>
                  <Link
                    href="/rooms?type=suite"
                    className="block px-4 py-2 text-sm rounded-md hover:bg-accent"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Suites
                  </Link>
                </div>
              </div>

              <Link
                href="/amenities"
                className="px-4 py-2 text-sm font-medium rounded-md hover:bg-accent"
                onClick={() => setIsMenuOpen(false)}
              >
                Amenities
              </Link>

              <Link
                href="/gallery"
                className="px-4 py-2 text-sm font-medium rounded-md hover:bg-accent"
                onClick={() => setIsMenuOpen(false)}
              >
                Gallery
              </Link>

              <Link
                href="/contact"
                className="px-4 py-2 text-sm font-medium rounded-md hover:bg-accent"
                onClick={() => setIsMenuOpen(false)}
              >
                Contact
              </Link>

              <div className="pt-2 mt-2 border-t flex flex-col space-y-2">
                {user ? (
                  <>
                    <Link
                      href="/profile"
                      className="px-4 py-2 text-sm font-medium rounded-md hover:bg-accent"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      My Profile
                    </Link>
                    <button
                      className="px-4 py-2 text-sm font-medium text-white rounded-md bg-red-500 hover:bg-red-600"
                      onClick={async () => {
                        setIsMenuOpen(false)
                        await handleLogout()
                      }}
                      disabled={loggingOut}
                    >
                      {loggingOut ? "Logging out..." : "Logout"}
                    </button>
                  </>
                ) : (
                  <Link
                    href="/auth/login"
                    className="px-4 py-2 text-sm font-medium rounded-md hover:bg-accent"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Login
                  </Link>
                )}

                <Link
                  href="/reservations"
                  className="px-4 py-2 text-sm font-medium text-white rounded-md"
                  style={{ backgroundColor: siteConfig.primaryColor || "#3b82f6" }}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Book Now
                </Link>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}

