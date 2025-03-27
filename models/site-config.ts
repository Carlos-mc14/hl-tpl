import { ObjectId } from "mongodb"
import { getDb, releaseConnection } from "@/lib/db"
import { getCachedData, invalidateCache } from "@/lib/cache"

export interface SiteConfig {
  _id?: ObjectId | string
  hotelName: string
  logoUrl: string
  favicon: string
  primaryColor: string
  secondaryColor: string
  contactInfo: {
    phone: string
    email: string
    address: string
    googleMapsUrl: string
  }
  socialMedia: {
    facebook: string
    instagram: string
    twitter: string
    tripadvisor: string
  }
  seo: {
    metaTitle: string
    metaDescription: string
    keywords: string
  }
  homepage: {
    heroTitle: string
    heroSubtitle: string
    heroImageUrl: string
    aboutTitle: string
    aboutContent: string
    aboutImageUrl: string // Keep for backward compatibility
    aboutImageUrls: string[] // New field for multiple images
  }
  amenities: Array<{
    icon: string
    title: string
    description: string
  }>
  footer: {
    copyrightText: string
    showPaymentMethods: boolean
    columns: Array<{
      title: string
      links: Array<{
        text: string
        url: string
      }>
    }>
  }
  createdAt: Date
  updatedAt: Date
}

export async function getSiteConfig() {
  return getCachedData(
    "siteConfig",
    async () => {
      const db = await getDb()
      try {
        // Get the site configuration or create default if not exists
        let config = await db.collection<SiteConfig>("siteConfig").findOne({})

        if (!config) {
          config = await createDefaultSiteConfig()
        } else if (config._id instanceof ObjectId) {
          // Convert MongoDB ObjectId to string to make it serializable
          config = {
            ...config,
            _id: config._id.toString(),
          }
        }

        return config
      } finally {
        releaseConnection()
      }
    },
    3600,
  ) // Caché por 1 hora (la configuración del sitio cambia con poca frecuencia)
}

export async function updateSiteConfig(configData: Partial<SiteConfig>) {
  const db = await getDb()
  try {
    // Remove _id from update data if it exists (MongoDB doesn't allow updating _id)
    const { _id, ...updateData } = configData

    const result = await db.collection("siteConfig").updateOne(
      {}, // Update the first document (there should be only one)
      { $set: { ...updateData, updatedAt: new Date() } },
      { upsert: true },
    )

    // Invalidar caché
    await invalidateCache("siteConfig")

    return result.modifiedCount > 0 || result.upsertedCount > 0
  } finally {
    releaseConnection()
  }
}

export async function createDefaultSiteConfig() {
  const db = await getDb()
  try {
    const defaultConfig: Omit<SiteConfig, "_id"> = {
      hotelName: "Hotel Manager",
      logoUrl: "/images/logo.svg",
      favicon: "/favicon.ico",
      primaryColor: "#0f172a",
      secondaryColor: "#4f46e5",
      contactInfo: {
        phone: "+51 123 456 789",
        email: "info@hotelmanager.com",
        address: "Av. Principal 123, Lima, Perú",
        googleMapsUrl: "https://maps.google.com/?q=Lima,Peru",
      },
      socialMedia: {
        facebook: "https://facebook.com/hotelmanager",
        instagram: "https://instagram.com/hotelmanager",
        twitter: "https://twitter.com/hotelmanager",
        tripadvisor: "https://tripadvisor.com/hotelmanager",
      },
      seo: {
        metaTitle: "Hotel Manager | Luxury Hotel in Lima, Peru",
        metaDescription:
          "Experience luxury and comfort at Hotel Manager in Lima, Peru. Book your stay today and enjoy our premium amenities and exceptional service.",
        keywords: "hotel, lima, peru, luxury hotel, accommodation, booking",
      },
      homepage: {
        heroTitle: "Experience Luxury & Comfort",
        heroSubtitle: "Your perfect stay in the heart of Lima",
        heroImageUrl: "/images/hero.jpg",
        aboutTitle: "About Our Hotel",
        aboutContent:
          "Hotel Manager offers a luxurious and comfortable stay in the heart of Lima. With our premium amenities and exceptional service, we ensure that your stay with us is memorable and enjoyable.",
        aboutImageUrl: "/images/about.jpg",
        aboutImageUrls: ["/images/about.jpg"],
      },
      amenities: [
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
        {
          icon: "Dumbbell",
          title: "Fitness Center",
          description: "Stay fit with our modern gym equipment",
        },
        {
          icon: "Bath",
          title: "Spa Services",
          description: "Relax and rejuvenate with our spa treatments",
        },
        {
          icon: "Tv",
          title: "Smart TVs",
          description: "Enjoy premium channels and streaming services",
        },
        {
          icon: "Wind",
          title: "Air Conditioning",
          description: "Climate control in all rooms for your comfort",
        },
      ],
      footer: {
        copyrightText: "© 2023 Hotel Manager. All rights reserved.",
        showPaymentMethods: true,
        columns: [
          {
            title: "Hotel",
            links: [
              { text: "About Us", url: "/about" },
              { text: "Rooms", url: "/rooms" },
              { text: "Amenities", url: "/amenities" },
              { text: "Gallery", url: "/gallery" },
            ],
          },
          {
            title: "Reservations",
            links: [
              { text: "Book Now", url: "/reservations" },
              { text: "Check Availability", url: "/availability" },
              { text: "Special Offers", url: "/offers" },
              { text: "Group Bookings", url: "/group-bookings" },
            ],
          },
          {
            title: "Information",
            links: [
              { text: "Contact Us", url: "/contact" },
              { text: "FAQs", url: "/faqs" },
              { text: "Terms & Conditions", url: "/terms" },
              { text: "Privacy Policy", url: "/privacy" },
            ],
          },
        ],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection("siteConfig").insertOne(defaultConfig)

    // Invalidar caché
    await invalidateCache("siteConfig")

    return { ...defaultConfig, _id: result.insertedId.toString() }
  } finally {
    releaseConnection()
  }
}

