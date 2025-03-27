"use client"

import { AvailabilitySearch } from "@/components/site/availability-search"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface HeroSectionProps {
  siteConfig: any
}

export function HeroSection({ siteConfig }: HeroSectionProps) {
  return (
    <section className="relative">
      {/* Hero Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${siteConfig.homepage.heroImageUrl || "/images/hero.jpg"})`,
          height: "600px",
        }}
      >
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Hero Content */}
      <div
        className="relative pt-32 pb-40 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center text-white"
        style={{ minHeight: "600px" }}
      >
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
          {siteConfig.homepage.heroTitle}
        </h1>
        <p className="text-xl md:text-2xl max-w-3xl mx-auto mb-8">{siteConfig.homepage.heroSubtitle}</p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/rooms">
            <Button size="lg" className="bg-white text-primary hover:bg-gray-100">
              View Rooms
            </Button>
          </Link>
        </div>
      </div>

      {/* Availability Search */}
      <div className="container mx-auto px-4 relative">
        <AvailabilitySearch />
      </div>
    </section>
  )
}

