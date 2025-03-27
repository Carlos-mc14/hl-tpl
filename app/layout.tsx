import type React from "react"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { getSiteConfig } from "@/models/site-config"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export async function generateMetadata() {
  const siteConfig = await getSiteConfig()

  return {
    title: {
      default: siteConfig.seo.metaTitle,
      template: `%s | ${siteConfig.hotelName}`,
    },
    description: siteConfig.seo.metaDescription,
    keywords: siteConfig.seo.keywords.split(",").map((keyword: string) => keyword.trim()),
    icons: {
      icon: siteConfig.favicon,
    },
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const siteConfig = await getSiteConfig()

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
              name: siteConfig.hotelName,
              description: siteConfig.seo.metaDescription,
              url: process.env.NEXTAUTH_URL || "https://example.com",
              logo: `${process.env.NEXTAUTH_URL || "https://example.com"}${siteConfig.logoUrl}`,
              image: `${process.env.NEXTAUTH_URL || "https://example.com"}${siteConfig.homepage.heroImageUrl}`,
              address: {
                "@type": "PostalAddress",
                streetAddress: siteConfig.contactInfo.address.split(",")[0],
                addressLocality: siteConfig.contactInfo.address.split(",")[1] || "",
                addressRegion: siteConfig.contactInfo.address.split(",")[2] || "",
                addressCountry: "PE",
              },
              telephone: siteConfig.contactInfo.phone,
              email: siteConfig.contactInfo.email,
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
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}

