"use client"

import { useState } from "react"
import { MoreHorizontal, Pencil, Trash2, Shield, Plus } from "lucide-react"

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

// Mock data - in a real app, this would come from an API
const roles = [
  {
    id: "1",
    name: "Administrator",
    description: "Full system access",
    permissions: ["manage:users", "manage:roles", "manage:reservations", "view:reports", "manage:settings"],
    userCount: 2,
  },
  {
    id: "2",
    name: "Manager",
    description: "Hotel management access",
    permissions: ["manage:reservations", "view:reports", "view:users"],
    userCount: 5,
  },
  {
    id: "3",
    name: "Staff",
    description: "Front desk operations",
    permissions: ["manage:reservations"],
    userCount: 10,
  },
  {
    id: "4",
    name: "Customer",
    description: "Regular customer account",
    permissions: ["manage:own_profile", "manage:own_reservations"],
    userCount: 120,
  },
]

export function RoleTable() {
  const [searchTerm, setSearchTerm] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<(typeof roles)[0] | null>(null)

  const filteredRoles = roles.filter(
    (role) =>
      role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      role.description.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleEdit = (role: (typeof roles)[0]) => {
    setSelectedRole(role)
    setDialogOpen(true)
  }

  const handleAddNew = () => {
    setSelectedRole(null)
    setDialogOpen(true)
  }

  const handleDelete = (roleId: string) => {
    // In a real app, this would call an API to delete the role
    alert(`Delete role with ID: ${roleId}`)
  }

  const handleManagePermissions = (roleId: string) => {
    // In a real app, this would open a dialog to manage role permissions
    alert(`Manage permissions for role with ID: ${roleId}`)
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
        <Button onClick={handleAddNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add Role
        </Button>
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
            {filteredRoles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No roles found.
                </TableCell>
              </TableRow>
            ) : (
              filteredRoles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">{role.name}</TableCell>
                  <TableCell>{role.description}</TableCell>
                  <TableCell>{role.permissions.length}</TableCell>
                  <TableCell>{role.userCount}</TableCell>
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
                        <DropdownMenuItem onClick={() => handleManagePermissions(role.id)}>
                          <Shield className="mr-2 h-4 w-4" />
                          Manage Permissions
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(role.id)}
                          className="text-red-600"
                          disabled={role.name === "Administrator" || role.name === "Customer"}
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
      <RoleDialog open={dialogOpen} onOpenChange={setDialogOpen} role={selectedRole} />
    </div>
  )
}

