"use client"

import type React from "react"

import { useState, useEffect } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "@/components/ui/use-toast"

interface Role {
  _id: string
  name: string
  description: string
  permissions: string[]
  userCount?: number
}

interface Permission {
  id: string
  label: string
  category: string
}

interface RoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: Role | null
  onRoleUpdated?: (role: Role) => void
  onRoleCreated?: (role: Role) => void
}

// Available permissions with categories for better organization
const availablePermissions: Permission[] = [
  { id: "manage:users", label: "Manage Users", category: "Users" },
  { id: "view:users", label: "View Users", category: "Users" },
  { id: "manage:roles", label: "Manage Roles", category: "Roles" },
  { id: "view:roles", label: "View Roles", category: "Roles" },
  { id: "manage:reservations", label: "Manage Reservations", category: "Reservations" },
  { id: "view:reservations", label: "View Reservations", category: "Reservations" },
  { id: "manage:own_reservations", label: "Manage Own Reservations", category: "Reservations" },
  { id: "view:own_reservations", label: "View Own Reservations", category: "Reservations" },
  { id: "view:reports", label: "View Reports", category: "Reports" },
  { id: "manage:settings", label: "Manage Settings", category: "Settings" },
  { id: "manage:own_profile", label: "Manage Own Profile", category: "Profile" },
]

// Group permissions by category
const permissionsByCategory = availablePermissions.reduce(
  (acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = []
    }
    acc[permission.category].push(permission)
    return acc
  },
  {} as Record<string, Permission[]>,
)

export function RoleDialog({ open, onOpenChange, role, onRoleUpdated, onRoleCreated }: RoleDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissions: [] as string[],
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isProtectedRole = role?.name === "Administrator" || role?.name === "Customer"

  useEffect(() => {
    if (role) {
      setFormData({
        name: role.name,
        description: role.description,
        permissions: [...role.permissions],
      })
    } else {
      // Reset form for new role
      setFormData({
        name: "",
        description: "",
        permissions: [],
      })
    }
    // Clear errors when dialog opens/closes
    setErrors({})
  }, [role, open])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      permissions: checked ? [...prev.permissions, permissionId] : prev.permissions.filter((id) => id !== permissionId),
    }))
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "Name is required"
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required"
    }

    if (formData.permissions.length === 0) {
      newErrors.permissions = "At least one permission must be selected"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)

    try {
      if (role) {
        // Update existing role
        const response = await fetch(`/api/admin/roles/${role._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || "Failed to update role")
        }

        toast({
          title: "Success",
          description: "Role updated successfully",
        })

        // Get the updated role data
        const updatedRoleResponse = await fetch(`/api/admin/roles/${role._id}`)
        if (updatedRoleResponse.ok) {
          const updatedRole = await updatedRoleResponse.json()
          if (onRoleUpdated) onRoleUpdated(updatedRole)
        }
      } else {
        // Create new role
        const response = await fetch("/api/admin/roles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || "Failed to create role")
        }

        const newRole = await response.json()

        toast({
          title: "Success",
          description: "Role created successfully",
        })

        if (onRoleCreated) onRoleCreated(newRole)
      }

      // Close the dialog
      onOpenChange(false)
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "An error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Helper function to check if all permissions in a category are selected
  const isCategoryFullySelected = (category: string) => {
    const categoryPermissions = permissionsByCategory[category].map((p) => p.id)
    return categoryPermissions.every((p) => formData.permissions.includes(p))
  }

  // Helper function to toggle all permissions in a category
  const toggleCategory = (category: string, checked: boolean) => {
    const categoryPermissionIds = permissionsByCategory[category].map((p) => p.id)

    if (checked) {
      // Add all permissions from this category that aren't already selected
      const newPermissions = [...formData.permissions]
      categoryPermissionIds.forEach((id) => {
        if (!newPermissions.includes(id)) {
          newPermissions.push(id)
        }
      })
      setFormData((prev) => ({ ...prev, permissions: newPermissions }))
    } else {
      // Remove all permissions from this category
      setFormData((prev) => ({
        ...prev,
        permissions: prev.permissions.filter((id) => !categoryPermissionIds.includes(id)),
      }))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{role ? "Edit Role" : "Add New Role"}</DialogTitle>
            <DialogDescription>
              {role ? "Update role details and permissions." : "Create a new role with specific permissions."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="col-span-3"
                required
                disabled={isLoading || isProtectedRole}
              />
              {errors.name && <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.name}</p>}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="col-span-3"
                required
                disabled={isLoading}
              />
              {errors.description && (
                <p className="col-span-3 col-start-2 text-sm text-red-500">{errors.description}</p>
              )}
            </div>
            <div className="grid grid-cols-4 gap-4">
              <Label className="text-right pt-2">Permissions</Label>
              <div className="col-span-3 space-y-4">
                {errors.permissions && <p className="text-sm text-red-500">{errors.permissions}</p>}

                {Object.entries(permissionsByCategory).map(([category, permissions]) => (
                  <div key={category} className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`category-${category}`}
                        checked={isCategoryFullySelected(category)}
                        onCheckedChange={(checked) => toggleCategory(category, checked as boolean)}
                        disabled={
                          isLoading ||
                          (isProtectedRole &&
                            (category === "Users" ||
                              category === "Roles" ||
                              category === "Settings" ||
                              category === "Profile"))
                        }
                      />
                      <label
                        htmlFor={`category-${category}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {category}
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-2 ml-6">
                      {permissions.map((permission) => (
                        <div key={permission.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={permission.id}
                            checked={formData.permissions.includes(permission.id)}
                            onCheckedChange={(checked) => handlePermissionChange(permission.id, checked as boolean)}
                            disabled={
                              isLoading ||
                              (isProtectedRole &&
                                ((role?.name === "Administrator" && permission.id.startsWith("manage:")) ||
                                  (role?.name === "Customer" &&
                                    (permission.id === "manage:own_profile" ||
                                      permission.id === "manage:own_reservations" ||
                                      permission.id === "view:own_reservations"))))
                            }
                          />
                          <label
                            htmlFor={permission.id}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {permission.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : role ? "Update Role" : "Create Role"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

