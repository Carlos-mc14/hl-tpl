"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight, Star } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TestimonialsSectionProps {
  siteConfig: any
}

export function TestimonialsSection({ siteConfig }: TestimonialsSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Business Traveler",
      image: "/images/testimonial-1.jpg",
      content:
        "The hotel exceeded all my expectations. The staff was incredibly attentive, the room was immaculate, and the amenities were top-notch. I'll definitely be staying here again on my next business trip.",
      rating: 5,
    },
    {
      name: "Michael Chen",
      role: "Family Vacation",
      image: "/images/testimonial-2.jpg",
      content:
        "We had an amazing family vacation at this hotel. The kids loved the pool, and we appreciated the spacious rooms and convenient location. The breakfast buffet was outstanding!",
      rating: 5,
    },
    {
      name: "Elena Rodriguez",
      role: "Honeymoon Stay",
      image: "/images/testimonial-3.jpg",
      content:
        "Our honeymoon stay was absolutely perfect. The romantic package they arranged for us was thoughtful and made our stay special. The views from our suite were breathtaking.",
      rating: 5,
    },
  ]

  const nextTestimonial = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % testimonials.length)
  }

  const prevTestimonial = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + testimonials.length) % testimonials.length)
  }

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      nextTestimonial()
    }, 8000)

    return () => clearInterval(interval)
  }, [])

  return (
    <section
      className="py-20"
      style={{
        backgroundColor: `${siteConfig.primaryColor}10`,
      }}
    >
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">What Our Guests Say</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">Read testimonials from our satisfied guests</p>
        </div>

        <div className="max-w-4xl mx-auto relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="bg-white p-8 rounded-lg shadow-lg"
            >
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="w-24 h-24 rounded-full overflow-hidden flex-shrink-0">
                  <img
                    src={testimonials[currentIndex].image || "/placeholder.svg?height=96&width=96"}
                    alt={testimonials[currentIndex].name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1">
                  <div className="flex mb-2">
                    {[...Array(testimonials[currentIndex].rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>

                  <blockquote className="text-lg italic mb-4">"{testimonials[currentIndex].content}"</blockquote>

                  <div>
                    <p className="font-semibold">{testimonials[currentIndex].name}</p>
                    <p className="text-gray-600">{testimonials[currentIndex].role}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="flex justify-center mt-8 gap-4">
            <Button variant="outline" size="icon" onClick={prevTestimonial} className="rounded-full">
              <ChevronLeft className="h-5 w-5" />
            </Button>

            <div className="flex gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-3 h-3 rounded-full ${
                    index === currentIndex ? "bg-primary" : "bg-gray-300 hover:bg-gray-400"
                  }`}
                  style={{
                    backgroundColor: index === currentIndex ? siteConfig.primaryColor : undefined,
                  }}
                />
              ))}
            </div>

            <Button variant="outline" size="icon" onClick={nextTestimonial} className="rounded-full">
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

