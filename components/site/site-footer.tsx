import Link from "next/link"
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin } from "lucide-react"

interface SiteFooterProps {
  siteConfig: any
}

export function SiteFooter({ siteConfig }: SiteFooterProps) {
  return (
    <footer className="bg-gray-900 text-white pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Hotel Info */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-block mb-4">
              <img src={siteConfig.logoUrl || "/placeholder.svg"} alt={siteConfig.hotelName} className="h-12 w-auto" />
            </Link>
            <p className="text-gray-400 mb-6 max-w-md">{siteConfig.homepage.aboutContent.substring(0, 150)}...</p>
            <div className="flex space-x-4">
              {siteConfig.socialMedia.facebook && (
                <a
                  href={siteConfig.socialMedia.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <Facebook className="h-5 w-5" />
                </a>
              )}
              {siteConfig.socialMedia.instagram && (
                <a
                  href={siteConfig.socialMedia.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <Instagram className="h-5 w-5" />
                </a>
              )}
              {siteConfig.socialMedia.twitter && (
                <a
                  href={siteConfig.socialMedia.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <Twitter className="h-5 w-5" />
                </a>
              )}
            </div>
          </div>

          {/* Footer Columns */}
          {siteConfig.footer.columns.map((column: any, index: number) => (
            <div key={index}>
              <h3 className="font-semibold text-lg mb-4">{column.title}</h3>
              <ul className="space-y-2">
                {column.links.map((link: any, linkIndex: number) => (
                  <li key={linkIndex}>
                    <Link href={link.url} className="text-gray-400 hover:text-white transition-colors">
                      {link.text}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contact Info */}
        <div className="border-t border-gray-800 mt-12 pt-8 pb-4">
          <div className="flex flex-wrap justify-between items-center">
            <div className="flex flex-wrap gap-6 mb-4 md:mb-0">
              <div className="flex items-center text-gray-400">
                <Phone className="h-4 w-4 mr-2" />
                <span>{siteConfig.contactInfo.phone}</span>
              </div>
              <div className="flex items-center text-gray-400">
                <Mail className="h-4 w-4 mr-2" />
                <span>{siteConfig.contactInfo.email}</span>
              </div>
              <div className="flex items-center text-gray-400">
                <MapPin className="h-4 w-4 mr-2" />
                <span>{siteConfig.contactInfo.address}</span>
              </div>
            </div>

            {/* Payment Methods */}
            {siteConfig.footer.showPaymentMethods && (
              <div className="flex items-center space-x-2">
                <img src="/images/visa.svg" alt="Visa" className="h-11" />
                <img src="/images/mastercard.svg" alt="Mastercard" className="h-11" />
                <img src="/images/amex.svg" alt="American Express" className="h-11" />
              </div>
            )}
          </div>
        </div>

        {/* Copyright */}
        <div className="text-center text-gray-500 text-sm mt-8">{siteConfig.footer.copyrightText}</div>
      </div>
    </footer>
  )
}

