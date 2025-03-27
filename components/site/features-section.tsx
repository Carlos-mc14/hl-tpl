import type React from "react"
import { Wifi, Coffee, Utensils, Car, Dumbbell, Bath, Tv, Wind, MoreHorizontal } from "lucide-react"

interface Amenity {
  icon: string
  title: string
  description: string
}

interface FeaturesSectionProps {
  siteConfig: any
}

export function FeaturesSection({ siteConfig }: FeaturesSectionProps) {
  // Function to get the icon component based on the icon name
  const getIconComponent = (iconName: string) => {
    const icons: Record<string, React.ReactNode> = {
      Wifi: <Wifi className="h-10 w-10" />,
      Coffee: <Coffee className="h-10 w-10" />,
      Utensils: <Utensils className="h-10 w-10" />,
      Car: <Car className="h-10 w-10" />,
      Dumbbell: <Dumbbell className="h-10 w-10" />,
      Bath: <Bath className="h-10 w-10" />,
      Tv: <Tv className="h-10 w-10" />,
      Wind: <Wind className="h-10 w-10" />,
    }

    return icons[iconName] || <MoreHorizontal className="h-10 w-10" />
  }

  // Use amenities from site config or fallback to default if not available
  const amenities: Amenity[] = siteConfig.amenities || [
    {
      icon: "Wifi",
      title: "Free Wi-Fi",
      description: "High-speed internet access throughout the hotel",
    },
    {
      icon: "Coffee",
      title: "Breakfast Included",
      description: "Start your day with our delicious breakfast buffet",
    },
    {
      icon: "Utensils",
      title: "Restaurant & Bar",
      description: "Enjoy fine dining and drinks at our on-site restaurant",
    },
    {
      icon: "Car",
      title: "Free Parking",
      description: "Convenient parking for all our guests",
    },
  ]

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Hotel Amenities</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Experience luxury and comfort with our premium amenities and services
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {amenities.map((amenity: Amenity, index: number) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div
                className="inline-flex items-center justify-center p-3 mb-4 rounded-full"
                style={{
                  backgroundColor: `${siteConfig.primaryColor}20`,
                  color: siteConfig.primaryColor,
                }}
              >
                {getIconComponent(amenity.icon)}
              </div>
              <h3 className="text-xl font-semibold mb-2">{amenity.title}</h3>
              <p className="text-gray-600">{amenity.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

