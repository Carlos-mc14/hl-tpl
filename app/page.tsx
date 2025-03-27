import { getSiteConfig } from "@/models/site-config"
import { SiteHeader } from "@/components/site/site-header"
import { SiteFooter } from "@/components/site/site-footer"
import { HeroSection } from "@/components/site/hero-section"
import { AboutSection } from "@/components/site/about-section"
import { FeaturesSection } from "@/components/site/features-section"
import { TestimonialsSection } from "@/components/site/testimonials-section"
import { CtaSection } from "@/components/site/cta-section"
import type { Metadata } from "next"

export async function generateMetadata(): Promise<Metadata> {
  const siteConfig = await getSiteConfig()

  return {
    title: siteConfig.seo.metaTitle,
    description: siteConfig.seo.metaDescription,
    keywords: siteConfig.seo.keywords.split(",").map((keyword: string) => keyword.trim()),
  }
}

export default async function Home() {
  const siteConfig = await getSiteConfig()

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader siteConfig={siteConfig} />

      <main className="flex-1">
        <HeroSection siteConfig={siteConfig} />
        <AboutSection siteConfig={siteConfig} />
        <FeaturesSection siteConfig={siteConfig} />
        <TestimonialsSection siteConfig={siteConfig} />
        <CtaSection siteConfig={siteConfig} />
      </main>

      <SiteFooter siteConfig={siteConfig} />
    </div>
  )
}

