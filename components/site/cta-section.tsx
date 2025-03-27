import Link from "next/link"
import { Button } from "@/components/ui/button"

interface CtaSectionProps {
  siteConfig: any
}

export function CtaSection({ siteConfig }: CtaSectionProps) {
  return (
    <section
      className="py-20 bg-cover bg-center bg-no-repeat relative"
      style={{
        backgroundImage: "url('/images/cta-bg.jpg')",
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black opacity-60"></div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Experience Luxury?</h2>
          <p className="text-xl mb-8">Book your stay now and enjoy our special rates and exclusive offers.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/reservations">
              <Button
                size="lg"
                style={{
                  backgroundColor: siteConfig.primaryColor,
                  color: "#fff",
                }}
              >
                Book Now
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline" size="lg" className="text-black border-white hover:bg-slate-300 hover:text-black">
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

