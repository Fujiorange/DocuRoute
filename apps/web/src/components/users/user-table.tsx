'use client'

import { useState } from 'react'
import { Permission, SystemRoleKey } from '@docuroute/types'
import { RoleBadge } from './role-badge'
import { PermissionGate } from './permission-gate'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Role {
  id: string
  name: string
  isSystemRole: boolean
  systemRoleKey: SystemRoleKey | null
  permissions: Permission[]
}

interface User {
  id: string
  email: string
  name: string | null
  roleId: string
  role: Role
  isActive: boolean
  mfaEnabled: boolean
  createdAt: string
  updatedAt: string
}

interface UserTableProps {
  users: User[]
  roles: Role[]
  onRoleChange: (userId: string, roleId: string) => Promise<void>
  onDeactivate: (userId: string) => Promise<void>
  currentUserId?: string
}

/**
 * UserTable component
 *
 * Displays all users with their roles and provides actions for management.
 *
 * Columns: Avatar | Name | Email | Role | Status | Last Active | Actions
 *
 * Actions are gated by PermissionGate:
 * - Change Role: Permission.MANAGE_USERS
 * - Deactivate: Permission.DEACTIVATE_USERS
 *
 * Role display uses RoleBadge for consistent color-coding.
 */
export function UserTable({
  users,
  roles,
  onRoleChange,
  onDeactivate,
  currentUserId,
}: UserTableProps) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false)
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false)
  const [selectedRoleId, setSelectedRoleId] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleOpenRoleDialog = (user: User) => {
    setSelectedUser(user)
    setSelectedRoleId(user.roleId)
    setIsRoleDialogOpen(true)
  }

  const handleOpenDeactivateDialog = (user: User) => {
    setSelectedUser(user)
    setIsDeactivateDialogOpen(true)
  }

  const handleRoleChange = async () => {
    if (!selectedUser || !selectedRoleId) return

    setIsSubmitting(true)
    try {
      await onRoleChange(selectedUser.id, selectedRoleId)
      setIsRoleDialogOpen(false)
      setSelectedUser(null)
      setSelectedRoleId('')
    } catch (error) {
      // Error handling is delegated to parent component via onRoleChange callback
      // Parent component should display appropriate error message to user
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeactivate = async () => {
    if (!selectedUser) return

    setIsSubmitting(true)
    try {
      await onDeactivate(selectedUser.id)
      setIsDeactivateDialogOpen(false)
      setSelectedUser(null)
    } catch (error) {
      // Error handling is delegated to parent component via onDeactivate callback
      // Parent component should display appropriate error message to user
    } finally {
      setIsSubmitting(false)
    }
  }

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    return email.slice(0, 2).toUpperCase()
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
    return date.toLocaleDateString()
  }

  // Group roles for dropdown
  const systemRoles = roles.filter((r) => r.isSystemRole)
  const customRoles = roles.filter((r) => !r.isSystemRole)

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Active</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {getInitials(user.name, user.email)}
                  </AvatarFallback>
                </Avatar>
              </TableCell>
              <TableCell className="font-medium">
                {user.name || '-'}
                {user.id === currentUserId && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    You
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">{user.email}</TableCell>
              <TableCell>
                <RoleBadge
                  roleName={user.role.name}
                  isSystemRole={user.role.isSystemRole}
                  systemRoleKey={user.role.systemRoleKey}
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {user.isActive ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-slate-50 text-slate-600">
                      Inactive
                    </Badge>
                  )}
                  {user.mfaEnabled && (
                    <Badge variant="outline" className="text-xs">
                      MFA
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(user.updatedAt)}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <PermissionGate requiredPermissions={[Permission.MANAGE_USERS]}>
                      <DropdownMenuItem onClick={() => handleOpenRoleDialog(user)}>
                        Change Role
                      </DropdownMenuItem>
                    </PermissionGate>
                    <PermissionGate requiredPermissions={[Permission.DEACTIVATE_USERS]}>
                      <DropdownMenuItem
                        onClick={() => handleOpenDeactivateDialog(user)}
                        disabled={user.id === currentUserId || !user.isActive}
                        className="text-red-600"
                      >
                        Deactivate
                      </DropdownMenuItem>
                    </PermissionGate>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Change Role Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Change the role for {selectedUser?.name || selectedUser?.email}. This will immediately
              update their permissions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Role</label>
              <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {systemRoles.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        System Roles
                      </div>
                      {systemRoles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          <div className="flex items-center gap-2">
                            <span>{role.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({role.permissions.length} permissions)
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {customRoles.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        Custom Roles
                      </div>
                      {customRoles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          <div className="flex items-center gap-2">
                            <span>{role.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({role.permissions.length} permissions)
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRoleDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleRoleChange} disabled={isSubmitting || !selectedRoleId}>
              {isSubmitting ? 'Changing...' : 'Change Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate User Dialog */}
      <Dialog open={isDeactivateDialogOpen} onOpenChange={setIsDeactivateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate User</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate {selectedUser?.name || selectedUser?.email}? They
              will no longer be able to access the system.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeactivateDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeactivate}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Deactivating...' : 'Deactivate User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
