import type React from "react"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { getSiteConfig } from "@/models/site-config"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export async function generateMetadata() {
  try {
    const siteConfig = await getSiteConfig()
    const faviconUrl = siteConfig?.favicon

    return {
      title: {
        default: siteConfig?.seo?.metaTitle || "Hotel Management System",
        template: `%s | ${siteConfig?.hotelName || "Hotel"}`,
      },
      description: siteConfig?.seo?.metaDescription || "Welcome to our hotel management system",
      keywords: siteConfig?.seo?.keywords?.split(",").map((keyword: string) => keyword.trim()) || ["hotel", "booking"],
      icons: {
        icon: faviconUrl,
        shortcut: faviconUrl,
        apple: faviconUrl,
      },
    }
  } catch (error) {
    console.error("Error fetching site config for metadata:", error)
    // Provide fallback metadata
    return {
      title: "Hotel Management System",
      description: "Welcome to our hotel management system",
      icons: {
        icon: "/favicon.ico",
        shortcut: "/favicon.ico",
        apple: "/favicon.ico",
      },
    }
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let siteConfig

  try {
    siteConfig = await getSiteConfig()
  } catch (error) {
    console.error("Error fetching site config for layout:", error)
    // Provide fallback site config
    siteConfig = {
      hotelName: "Hotel",
      seo: {
        metaTitle: "Hotel Management System",
        metaDescription: "Welcome to our hotel",
      },
      logoUrl: "/placeholder.svg",
      favicon: "/favicon.ico",
      homepage: {
        heroImageUrl: "/placeholder.svg",
        aboutContent: "Welcome to our hotel. We offer comfortable accommodations and excellent service.",
      },
      contactInfo: {
        address: "123 Main St",
        phone: "+1 234 567 890",
        email: "info@hotel.com",
      },
      socialMedia: {
        facebook: "",
        twitter: "",
        instagram: "",
      },
      footer: {
        columns: [],
        showPaymentMethods: false,
        copyrightText: "© 2023 Hotel. All rights reserved.",
      },
      primaryColor: "#3b82f6",
    }
  }

  const faviconUrl = siteConfig?.favicon || "/favicon.ico"
  // Add cache-busting query parameter to favicon URL
  const cacheBustFaviconUrl = `${faviconUrl}?v=${Date.now()}`

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Schema.org structured data for Hotel */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Hotel",
              name: siteConfig?.hotelName || "Hotel",
              description: siteConfig?.seo?.metaDescription || "Welcome to our hotel",
              url: process.env.NEXTAUTH_URL || "https://example.com",
              logo: `${process.env.NEXTAUTH_URL || "https://example.com"}${siteConfig?.logoUrl || "/placeholder.svg"}`,
              image: `${process.env.NEXTAUTH_URL || "https://example.com"}${siteConfig?.homepage?.heroImageUrl || "/placeholder.svg"}`,
              address: {
                "@type": "PostalAddress",
                streetAddress: siteConfig?.contactInfo?.address?.split(",")[0] || "123 Main St",
                addressLocality: siteConfig?.contactInfo?.address?.split(",")[1] || "",
                addressRegion: siteConfig?.contactInfo?.address?.split(",")[2] || "",
                addressCountry: "PE",
              },
              telephone: siteConfig?.contactInfo?.phone || "+1 234 567 890",
              email: siteConfig?.contactInfo?.email || "info@hotel.com",
              priceRange: "$$$",
              amenityFeature: [
                { "@type": "LocationFeatureSpecification", name: "Free Wi-Fi" },
                { "@type": "LocationFeatureSpecification", name: "Restaurant" },
                { "@type": "LocationFeatureSpecification", name: "Fitness Center" },
                { "@type": "LocationFeatureSpecification", name: "Spa" },
              ],
              starRating: {
                "@type": "Rating",
                ratingValue: "4.5",
              },
            }),
          }}
        />
        <link rel="icon" href={cacheBustFaviconUrl} />
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}

