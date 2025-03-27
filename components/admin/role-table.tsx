"use client"

import { useState, useEffect } from "react"
import { MoreHorizontal, Pencil, Trash2, Plus, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { RoleDialog } from "@/components/admin/role-dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"

interface Role {
  _id: string
  name: string
  description: string
  permissions: string[]
  userCount?: number
}

export function RoleTable() {
  const [searchTerm, setSearchTerm] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [roles, setRoles] = useState<Role[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch roles from the API
  const fetchRoles = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/roles")
      if (!response.ok) {
        throw new Error("Failed to fetch roles")
      }
      const data = await response.json()
      setRoles(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while fetching roles")
      toast({
        title: "Error",
        description: "Failed to load roles. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Load roles on component mount
  useEffect(() => {
    fetchRoles()
  }, [])

  const filteredRoles = roles.filter(
    (role) =>
      role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      role.description.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleEdit = (role: Role) => {
    setSelectedRole(role)
    setDialogOpen(true)
  }

  const handleAddNew = () => {
    setSelectedRole(null)
    setDialogOpen(true)
  }

  const handleDeleteClick = (role: Role) => {
    setSelectedRole(role)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!selectedRole) return

    try {
      const response = await fetch(`/api/admin/roles/${selectedRole._id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to delete role")
      }

      // Remove role from the list
      setRoles(roles.filter((role) => role._id !== selectedRole._id))
      toast({
        title: "Success",
        description: "Role deleted successfully",
      })
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete role",
        variant: "destructive",
      })
    } finally {
      setDeleteDialogOpen(false)
    }
  }

  const handleRoleUpdated = (updatedRole: Role) => {
    // Update the role in the list
    setRoles(roles.map((role) => (role._id === updatedRole._id ? updatedRole : role)))
  }

  const handleRoleCreated = (newRole: Role) => {
    // Add the new role to the list
    setRoles([...roles, newRole])
  }

  const isProtectedRole = (roleName: string) => {
    return roleName === "Administrator" || roleName === "Customer"
  }

  // Add toast notifications for delete operation
  const handleDeleteRole = async (roleId: string) => {
    try {
      setIsDeleting(true)
      const response = await fetch(`/api/admin/roles/${roleId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to delete role")
      }

      // Add toast notification
      toast({
        title: "Role deleted",
        description: "The role has been successfully deleted.",
      })

      // Remove the deleted role from the state
      setRoles((prev) => prev.filter((role) => role._id !== roleId))
    } catch (err) {
      console.error("Error deleting role:", err)
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "An error occurred",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search roles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-[300px]"
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchRoles} variant="outline" size="icon" title="Refresh roles">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={handleAddNew}>
            <Plus className="mr-2 h-4 w-4" />
            Add Role
          </Button>
        </div>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead>Users</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  Loading roles...
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-red-500">
                  {error}
                </TableCell>
              </TableRow>
            ) : filteredRoles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No roles found.
                </TableCell>
              </TableRow>
            ) : (
              filteredRoles.map((role) => (
                <TableRow key={role._id}>
                  <TableCell className="font-medium">
                    {isProtectedRole(role.name) ? (
                      <div className="flex items-center gap-2">
                        {role.name}
                        <Badge variant="outline" className="ml-2">
                          Protected
                        </Badge>
                      </div>
                    ) : (
                      role.name
                    )}
                  </TableCell>
                  <TableCell>{role.description}</TableCell>
                  <TableCell>
                    <Badge>{role.permissions.length}</Badge>
                  </TableCell>
                  <TableCell>{role.userCount || 0}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleEdit(role)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(role)}
                          className="text-red-600"
                          disabled={isProtectedRole(role.name)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Role Dialog for Create/Edit */}
      <RoleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        role={selectedRole}
        onRoleUpdated={handleRoleUpdated}
        onRoleCreated={handleRoleCreated}
      />

      {/* Confirmation Dialog for Delete */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the role
              {selectedRole && ` "${selectedRole.name}"`} and may affect users assigned to this role.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedRole && handleDeleteRole(selectedRole._id)}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

