"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import {
  Loader2,
  Save,
  Globe,
  Palette,
  Phone,
  Home,
  FileText,
  Image,
  Plus,
  Trash2,
  Coffee,
  Wifi,
  Utensils,
  Car,
  Dumbbell,
  Bath,
  Tv,
  Wind,
  MoreHorizontal,
  PlusCircle,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { ColorPicker } from "@/components/dashboard/color-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface SiteConfigFormProps {
  initialData: any
}

// Definir interfaces para los tipos
interface FooterLink {
  text: string
  url: string
}

interface FooterColumn {
  title: string
  links: FooterLink[]
}

interface Amenity {
  icon: string
  title: string
  description: string
}

export function SiteConfigForm({ initialData }: SiteConfigFormProps) {
  // Inicializar con valores por defecto si initialData está vacío o es undefined
  const defaultData = {
    hotelName: "Hotel Name",
    logoUrl: "",
    favicon: "",
    primaryColor: "#3b82f6",
    secondaryColor: "#10b981",
    contactInfo: {
      phone: "",
      email: "",
      address: "",
      googleMapsUrl: "",
    },
    socialMedia: {
      facebook: "",
      instagram: "",
      twitter: "",
      tripadvisor: "",
    },
    homepage: {
      heroTitle: "Welcome to Our Hotel",
      heroSubtitle: "Experience luxury and comfort",
      heroImageUrl: "",
      aboutTitle: "About Us",
      aboutContent: "Our hotel offers the best experience...",
      aboutImageUrl: "",
      aboutImageUrls: [],
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
    ],
    seo: {
      metaTitle: "",
      metaDescription: "",
      keywords: "",
    },
    footer: {
      copyrightText: "© 2023 Hotel Name. All rights reserved.",
      showPaymentMethods: true,
      columns: [
        {
          title: "Quick Links",
          links: [
            { text: "Home", url: "/" },
            { text: "Rooms", url: "/rooms" },
          ],
        },
      ],
    },
  }

  // Combinar initialData con defaultData para asegurar que todos los campos existan
  const mergedData = initialData
    ? {
        ...defaultData,
        ...initialData,
        contactInfo: { ...defaultData.contactInfo, ...(initialData.contactInfo || {}) },
        socialMedia: { ...defaultData.socialMedia, ...(initialData.socialMedia || {}) },
        homepage: {
          ...defaultData.homepage,
          ...(initialData.homepage || {}),
          aboutImageUrls: initialData.homepage?.aboutImageUrls || [initialData.homepage?.aboutImageUrl || ""],
        },
        amenities: initialData.amenities || defaultData.amenities,
        seo: { ...defaultData.seo, ...(initialData.seo || {}) },
        footer: {
          ...defaultData.footer,
          ...(initialData.footer || {}),
          columns: initialData.footer?.columns || defaultData.footer.columns,
        },
      }
    : defaultData

  const [formData, setFormData] = useState(mergedData)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("general")
  const [origin, setOrigin] = useState("")

  // Usar useEffect para acceder a window solo en el cliente
  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin)
    }
  }, [])

  // Función para manejar cambios en campos simples
  const handleChange = (section: string, field: string, value: any) => {
    console.log(`Changing ${section ? `${section}.${field}` : field} to:`, value)

    if (section) {
      setFormData((prev: typeof formData) => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value,
        },
      }))
    } else {
      setFormData((prev: typeof formData) => ({
        ...prev,
        [field]: value,
      }))
    }
  }

  // Función para manejar cambios en campos anidados
  const handleNestedChange = (section: string, subsection: string, field: string, value: any) => {
    console.log(`Changing ${section}.${subsection ? `${subsection}.` : ""}${field} to:`, value)

    setFormData((prev: typeof formData) => {
      if (subsection) {
        // Si hay subsección, actualiza el campo dentro de la subsección
        return {
          ...prev,
          [section]: {
            ...prev[section],
            [subsection]: {
              ...prev[section][subsection],
              [field]: value,
            },
          },
        }
      } else {
        // Si no hay subsección, actualiza el campo directamente en la sección
        return {
          ...prev,
          [section]: {
            ...prev[section],
            [field]: value,
          },
        }
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Log the data being sent to help debug
      console.log("Sending site config data:", formData)

      const response = await fetch("/api/admin/site-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to update site configuration")
      }

      // Force a page reload to update the favicon
      if (typeof window !== "undefined" && formData.favicon !== initialData.favicon) {
        window.location.reload()
      }

      toast({
        title: "Success",
        description: "Site configuration updated successfully",
      })
    } catch (error) {
      console.error("Error updating site config:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getIconComponent = (iconName: string) => {
    const icons: Record<string, React.ReactNode> = {
      Wifi: <Wifi className="h-4 w-4" />,
      Coffee: <Coffee className="h-4 w-4" />,
      Utensils: <Utensils className="h-4 w-4" />,
      Car: <Car className="h-4 w-4" />,
      Dumbbell: <Dumbbell className="h-4 w-4" />,
      Bath: <Bath className="h-4 w-4" />,
      Tv: <Tv className="h-4 w-4" />,
      Wind: <Wind className="h-4 w-4" />,
    }

    return icons[iconName] || <MoreHorizontal className="h-4 w-4" />
  }

  return (
    <form onSubmit={handleSubmit}>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center mb-6">
          <TabsList>
            <TabsTrigger value="general" className="flex items-center gap-1">
              <Globe className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-1">
              <Palette className="h-4 w-4" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="contact" className="flex items-center gap-1">
              <Phone className="h-4 w-4" />
              Contact
            </TabsTrigger>
            <TabsTrigger value="homepage" className="flex items-center gap-1">
              <Home className="h-4 w-4" />
              Homepage
            </TabsTrigger>
            <TabsTrigger value="amenities" className="flex items-center gap-1">
              <Coffee className="h-4 w-4" />
              Amenities
            </TabsTrigger>
            <TabsTrigger value="seo" className="flex items-center gap-1">
              <Globe className="h-4 w-4" />
              SEO
            </TabsTrigger>
            <TabsTrigger value="footer" className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              Footer
            </TabsTrigger>
          </TabsList>

          <Button type="submit" disabled={isLoading} className="gap-2">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>
        </div>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Information</CardTitle>
              <CardDescription>Basic information about your hotel</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hotelName">Hotel Name</Label>
                  <Input
                    id="hotelName"
                    value={formData.hotelName || ""}
                    onChange={(e) => handleChange("", "hotelName", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logoUrl">Logo URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="logoUrl"
                      value={formData.logoUrl || ""}
                      onChange={(e) => handleChange("", "logoUrl", e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-shrink-0"
                      onClick={() => {
                        toast({
                          title: "Información",
                          description: "Para cambiar el logo, ingresa la URL de la imagen directamente en el campo.",
                        })
                      }}
                    >
                      <Image className="h-4 w-4 mr-2" />
                      Upload
                    </Button>
                  </div>
                  {formData.logoUrl && (
                    <div className="mt-2 p-2 border rounded flex items-center justify-center bg-muted/50">
                      <img
                        src={formData.logoUrl || "/placeholder.svg"}
                        alt="Logo Preview"
                        className="max-h-16 object-contain"
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder.svg?height=64&width=200"
                          toast({
                            title: "Error",
                            description: "No se pudo cargar la imagen. Verifica la URL.",
                            variant: "destructive",
                          })
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="favicon">Favicon URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="favicon"
                      value={formData.favicon || ""}
                      onChange={(e) => handleChange("", "favicon", e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-shrink-0"
                      onClick={() => {
                        toast({
                          title: "Información",
                          description: "Para cambiar el favicon, ingresa la URL de la imagen directamente en el campo.",
                        })
                      }}
                    >
                      <Image className="h-4 w-4 mr-2" />
                      Upload
                    </Button>
                  </div>
                  {formData.favicon && (
                    <div className="mt-2 p-2 border rounded flex items-center justify-center bg-muted/50">
                      <img
                        src={formData.favicon || "/placeholder.svg"}
                        alt="Favicon Preview"
                        className="h-8 w-8 object-contain"
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder.svg?height=32&width=32"
                          toast({
                            title: "Error",
                            description: "No se pudo cargar el favicon. Verifica la URL.",
                            variant: "destructive",
                          })
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Appearance Settings</CardTitle>
              <CardDescription>Customize the look and feel of your website</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <ColorPicker
                    color={formData.primaryColor || "#3b82f6"}
                    onChange={(color) => handleChange("", "primaryColor", color)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Secondary Color</Label>
                  <ColorPicker
                    color={formData.secondaryColor || "#10b981"}
                    onChange={(color) => handleChange("", "secondaryColor", color)}
                  />
                </div>
              </div>

              <div className="p-4 border rounded-md">
                <h3 className="font-medium mb-2">Preview</h3>
                <div className="flex gap-4 items-center">
                  <div
                    className="w-full h-16 rounded-md flex items-center justify-center text-white font-medium"
                    style={{ backgroundColor: formData.primaryColor || "#3b82f6" }}
                  >
                    Primary Color
                  </div>
                  <div
                    className="w-full h-16 rounded-md flex items-center justify-center text-white font-medium"
                    style={{ backgroundColor: formData.secondaryColor || "#10b981" }}
                  >
                    Secondary Color
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>Your hotel's contact details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Phone Number</Label>
                  <Input
                    id="contactPhone"
                    value={formData.contactInfo?.phone || ""}
                    onChange={(e) => handleNestedChange("contactInfo", "", "phone", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Email Address</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={formData.contactInfo?.email || ""}
                    onChange={(e) => handleNestedChange("contactInfo", "", "email", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactAddress">Address</Label>
                <Textarea
                  id="contactAddress"
                  value={formData.contactInfo?.address || ""}
                  onChange={(e) => handleNestedChange("contactInfo", "", "address", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="googleMapsUrl">Google Maps URL</Label>
                <Input
                  id="googleMapsUrl"
                  value={formData.contactInfo?.googleMapsUrl || ""}
                  onChange={(e) => handleNestedChange("contactInfo", "", "googleMapsUrl", e.target.value)}
                />
              </div>

              <h3 className="font-medium mt-6 mb-2">Social Media</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="facebook">Facebook URL</Label>
                  <Input
                    id="facebook"
                    value={formData.socialMedia?.facebook || ""}
                    onChange={(e) => handleNestedChange("socialMedia", "", "facebook", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram URL</Label>
                  <Input
                    id="instagram"
                    value={formData.socialMedia?.instagram || ""}
                    onChange={(e) => handleNestedChange("socialMedia", "", "instagram", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="twitter">Twitter URL</Label>
                  <Input
                    id="twitter"
                    value={formData.socialMedia?.twitter || ""}
                    onChange={(e) => handleNestedChange("socialMedia", "", "twitter", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tripadvisor">TripAdvisor URL</Label>
                  <Input
                    id="tripadvisor"
                    value={formData.socialMedia?.tripadvisor || ""}
                    onChange={(e) => handleNestedChange("socialMedia", "", "tripadvisor", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="homepage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Homepage Content</CardTitle>
              <CardDescription>Configure your homepage content and images</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium">Hero Section</h3>
                <div className="space-y-2">
                  <Label htmlFor="heroTitle">Hero Title</Label>
                  <Input
                    id="heroTitle"
                    value={formData.homepage?.heroTitle || ""}
                    onChange={(e) => handleNestedChange("homepage", "", "heroTitle", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="heroSubtitle">Hero Subtitle</Label>
                  <Input
                    id="heroSubtitle"
                    value={formData.homepage?.heroSubtitle || ""}
                    onChange={(e) => handleNestedChange("homepage", "", "heroSubtitle", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="heroImageUrl">Hero Image URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="heroImageUrl"
                      value={formData.homepage?.heroImageUrl || ""}
                      onChange={(e) => handleNestedChange("homepage", "", "heroImageUrl", e.target.value)}
                    />
                    <Button type="button" variant="outline" className="flex-shrink-0">
                      <Image className="h-4 w-4 mr-2" />
                      Upload
                    </Button>
                  </div>
                  {formData.homepage?.heroImageUrl && (
                    <div className="mt-2 p-2 border rounded bg-muted/50">
                      <img
                        src={formData.homepage.heroImageUrl || "/placeholder.svg"}
                        alt="Hero Preview"
                        className="w-full h-40 object-cover rounded"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium">About Section</h3>
                <div className="space-y-2">
                  <Label htmlFor="aboutTitle">About Title</Label>
                  <Input
                    id="aboutTitle"
                    value={formData.homepage?.aboutTitle || ""}
                    onChange={(e) => handleNestedChange("homepage", "", "aboutTitle", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="aboutContent">About Content</Label>
                  <Textarea
                    id="aboutContent"
                    rows={4}
                    value={formData.homepage?.aboutContent || ""}
                    onChange={(e) => handleNestedChange("homepage", "", "aboutContent", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="aboutImageUrl">About Images</Label>
                  <div className="space-y-4">
                    {formData.homepage?.aboutImageUrls?.map((imageUrl: string, index: number) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          id={`aboutImageUrl-${index}`}
                          value={imageUrl || ""}
                          onChange={(e) => {
                            const newImageUrls = [...(formData.homepage?.aboutImageUrls || [])]
                            newImageUrls[index] = e.target.value
                            handleNestedChange("homepage", "", "aboutImageUrls", newImageUrls)

                            // Also update the single aboutImageUrl for backward compatibility
                            if (index === 0) {
                              handleNestedChange("homepage", "", "aboutImageUrl", e.target.value)
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            const newImageUrls = [...(formData.homepage?.aboutImageUrls || [])]
                            newImageUrls.splice(index, 1)
                            handleNestedChange("homepage", "", "aboutImageUrls", newImageUrls)
                          }}
                          disabled={formData.homepage?.aboutImageUrls?.length <= 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        const newImageUrls = [...(formData.homepage?.aboutImageUrls || []), ""]
                        handleNestedChange("homepage", "", "aboutImageUrls", newImageUrls)
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Image
                    </Button>
                  </div>

                  {formData.homepage?.aboutImageUrls?.length > 0 && (
                    <div className="mt-4 p-2 border rounded bg-muted/50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {formData.homepage.aboutImageUrls.map(
                        (imageUrl: string, index: number) =>
                          imageUrl && (
                            <div key={index} className="relative">
                              <img
                                src={imageUrl || "/placeholder.svg"}
                                alt={`About Preview ${index + 1}`}
                                className="w-full h-40 object-cover rounded"
                                onError={(e) => {
                                  e.currentTarget.src = "/placeholder.svg?height=160&width=320"
                                }}
                              />
                              <div className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center">
                                {index + 1}
                              </div>
                            </div>
                          ),
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="amenities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Hotel Amenities</CardTitle>
              <CardDescription>Configure the amenities displayed on your website</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {formData.amenities?.map((amenity: Amenity, index: number) => (
                  <div key={index} className="p-4 border rounded-md">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        {getIconComponent(amenity.icon)}
                        <h4 className="font-medium">Amenity {index + 1}</h4>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newAmenities = [...(formData.amenities || [])]
                          newAmenities.splice(index, 1)
                          handleChange("", "amenities", newAmenities)
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    </div>

                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <Label>Icon</Label>
                        <Select
                          value={amenity.icon}
                          onValueChange={(value) => {
                            const newAmenities = [...(formData.amenities || [])]
                            newAmenities[index].icon = value
                            handleChange("", "amenities", newAmenities)
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select an icon" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Wifi">
                              <div className="flex items-center gap-2">
                                <Wifi className="h-4 w-4" />
                                <span>Wi-Fi</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="Coffee">
                              <div className="flex items-center gap-2">
                                <Coffee className="h-4 w-4" />
                                <span>Coffee</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="Utensils">
                              <div className="flex items-center gap-2">
                                <Utensils className="h-4 w-4" />
                                <span>Restaurant</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="Car">
                              <div className="flex items-center gap-2">
                                <Car className="h-4 w-4" />
                                <span>Parking</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="Dumbbell">
                              <div className="flex items-center gap-2">
                                <Dumbbell className="h-4 w-4" />
                                <span>Fitness</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="Bath">
                              <div className="flex items-center gap-2">
                                <Bath className="h-4 w-4" />
                                <span>Spa</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="Tv">
                              <div className="flex items-center gap-2">
                                <Tv className="h-4 w-4" />
                                <span>TV</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="Wind">
                              <div className="flex items-center gap-2">
                                <Wind className="h-4 w-4" />
                                <span>AC</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Title</Label>
                        <Input
                          value={amenity.title || ""}
                          onChange={(e) => {
                            const newAmenities = [...(formData.amenities || [])]
                            newAmenities[index].title = e.target.value
                            handleChange("", "amenities", newAmenities)
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          value={amenity.description || ""}
                          onChange={(e) => {
                            const newAmenities = [...(formData.amenities || [])]
                            newAmenities[index].description = e.target.value
                            handleChange("", "amenities", newAmenities)
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const newAmenities = [...(formData.amenities || [])]
                    newAmenities.push({
                      icon: "Coffee",
                      title: "New Amenity",
                      description: "Description of the amenity",
                    })
                    handleChange("", "amenities", newAmenities)
                  }}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Amenity
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SEO Settings</CardTitle>
              <CardDescription>Optimize your website for search engines</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="metaTitle">Meta Title</Label>
                <Input
                  id="metaTitle"
                  value={formData.seo?.metaTitle || ""}
                  onChange={(e) => handleNestedChange("seo", "", "metaTitle", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Recommended length: 50-60 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="metaDescription">Meta Description</Label>
                <Textarea
                  id="metaDescription"
                  value={formData.seo?.metaDescription || ""}
                  onChange={(e) => handleNestedChange("seo", "", "metaDescription", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Recommended length: 150-160 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="keywords">Keywords</Label>
                <Textarea
                  id="keywords"
                  value={formData.seo?.keywords || ""}
                  onChange={(e) => handleNestedChange("seo", "", "keywords", e.target.value)}
                  placeholder="hotel, luxury, accommodation, etc."
                />
                <p className="text-xs text-muted-foreground">Separate keywords with commas</p>
              </div>

              <Alert className="mt-4 bg-muted">
                <AlertTitle>SEO Preview</AlertTitle>
                <AlertDescription>
                  <div className="mt-2 space-y-1">
                    <p className="text-blue-600 text-lg font-medium">{formData.seo?.metaTitle || "Hotel Website"}</p>
                    <p className="text-green-700 text-sm">{origin}</p>
                    <p className="text-sm">{formData.seo?.metaDescription || "Description of your hotel website"}</p>
                  </div>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="footer" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Footer Settings</CardTitle>
              <CardDescription>Configure your website footer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="copyrightText">Copyright Text</Label>
                <Input
                  id="copyrightText"
                  value={formData.footer?.copyrightText || ""}
                  onChange={(e) => handleNestedChange("footer", "", "copyrightText", e.target.value)}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="showPaymentMethods"
                  checked={formData.footer?.showPaymentMethods || false}
                  onCheckedChange={(checked) => handleNestedChange("footer", "", "showPaymentMethods", checked)}
                />
                <Label htmlFor="showPaymentMethods">Show Payment Methods</Label>
              </div>

              <div className="mt-6">
                <h3 className="font-medium mb-2">Footer Columns</h3>
                <p className="text-sm text-muted-foreground mb-4">Configure the footer navigation columns</p>

                {formData.footer?.columns?.map((column: FooterColumn, columnIndex: number) => (
                  <div key={columnIndex} className="mb-6 p-4 border rounded-md">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-medium">Column {columnIndex + 1}</h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newColumns = [...(formData.footer?.columns || [])]
                          newColumns.splice(columnIndex, 1)
                          handleNestedChange("footer", "", "columns", newColumns)
                        }}
                      >
                        Remove
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>Title</Label>
                        <Input
                          value={column.title || ""}
                          onChange={(e) => {
                            const newColumns = [...(formData.footer?.columns || [])]
                            newColumns[columnIndex].title = e.target.value
                            handleNestedChange("footer", "", "columns", newColumns)
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Links</Label>
                        {column.links?.map((link: FooterLink, linkIndex: number) => (
                          <div key={linkIndex} className="flex gap-2 mb-2">
                            <Input
                              placeholder="Text"
                              value={link.text || ""}
                              onChange={(e) => {
                                const newColumns = [...(formData.footer?.columns || [])]
                                newColumns[columnIndex].links[linkIndex].text = e.target.value
                                handleNestedChange("footer", "", "columns", newColumns)
                              }}
                            />
                            <Input
                              placeholder="URL"
                              value={link.url || ""}
                              onChange={(e) => {
                                const newColumns = [...(formData.footer?.columns || [])]
                                newColumns[columnIndex].links[linkIndex].url = e.target.value
                                handleNestedChange("footer", "", "columns", newColumns)
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                const newColumns = [...(formData.footer?.columns || [])]
                                newColumns[columnIndex].links.splice(linkIndex, 1)
                                handleNestedChange("footer", "", "columns", newColumns)
                              }}
                            >
                              &times;
                            </Button>
                          </div>
                        ))}

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newColumns = [...(formData.footer?.columns || [])]
                            if (!newColumns[columnIndex].links) {
                              newColumns[columnIndex].links = []
                            }
                            newColumns[columnIndex].links.push({ text: "", url: "" })
                            handleNestedChange("footer", "", "columns", newColumns)
                          }}
                        >
                          Add Link
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const newColumns = [...(formData.footer?.columns || [])]
                    newColumns.push({
                      title: "New Column",
                      links: [{ text: "", url: "" }],
                    })
                    handleNestedChange("footer", "", "columns", newColumns)
                  }}
                >
                  Add Column
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </form>
  )
}

