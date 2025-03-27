"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface AboutSectionProps {
  siteConfig: any
}

export function AboutSection({ siteConfig }: AboutSectionProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const images = siteConfig.homepage.aboutImageUrls || [siteConfig.homepage.aboutImageUrl || ""]

  // Filter out empty image URLs
  const validImages = images.filter((url: string) => url && url.trim() !== "")

  // Auto-rotate images every 5 seconds
  useEffect(() => {
    if (validImages.length <= 1) return

    const interval = setInterval(() => {
      changeImage((prevIndex) => (prevIndex + 1) % validImages.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [validImages.length])

  const changeImage = (newIndexFn: (prevIndex: number) => number) => {
    if (isTransitioning) return

    setIsTransitioning(true)
    setCurrentImageIndex(newIndexFn)

    // Reset transition state after animation completes
    setTimeout(() => {
      setIsTransitioning(false)
    }, 500)
  }

  const goToPrevious = () => {
    changeImage((prevIndex) => (prevIndex === 0 ? validImages.length - 1 : prevIndex - 1))
  }

  const goToNext = () => {
    changeImage((prevIndex) => (prevIndex + 1) % validImages.length)
  }

  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1">
            <h2 className="text-3xl font-bold mb-6">{siteConfig.homepage.aboutTitle}</h2>
            <div className="prose max-w-none mb-8">
              <p>{siteConfig.homepage.aboutContent}</p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link href="/about">
                <Button variant="outline">Learn More</Button>
              </Link>
              <Link href="/contact">
                <Button
                  style={{
                    backgroundColor: siteConfig.primaryColor,
                    color: "#fff",
                  }}
                >
                  Contact Us
                </Button>
              </Link>
            </div>
          </div>

          <div className="order-1 lg:order-2 relative">
            {validImages.length > 0 && (
              <div className="relative overflow-hidden rounded-lg shadow-lg" style={{ height: "500px" }}>
                {validImages.map((image: string, index: number) => (
                  <img
                    key={index}
                    src={image || "/placeholder.svg"}
                    alt={`About Our Hotel ${index + 1}`}
                    className="absolute w-full h-full object-cover"
                    style={{
                      opacity: index === currentImageIndex ? 1 : 0,
                      transition: "opacity 0.5s ease-in-out",
                      zIndex: index === currentImageIndex ? 1 : 0,
                    }}
                  />
                ))}

                {validImages.length > 1 && (
                  <>
                    <button
                      onClick={goToPrevious}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full p-2 transition-colors z-10"
                      aria-label="Previous image"
                      disabled={isTransitioning}
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                      onClick={goToNext}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full p-2 transition-colors z-10"
                      aria-label="Next image"
                      disabled={isTransitioning}
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>

                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
                      {validImages.map((_: string, index: number) => (
                        <button
                          key={index}
                          onClick={() => !isTransitioning && setCurrentImageIndex(index)}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            index === currentImageIndex ? "bg-white" : "bg-white/50"
                          }`}
                          aria-label={`Go to image ${index + 1}`}
                          disabled={isTransitioning}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

