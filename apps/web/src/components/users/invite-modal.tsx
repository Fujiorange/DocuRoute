'use client'

import { useState } from 'react'
import { Permission, SystemRoleKey } from '@docuroute/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Alert } from '@/components/ui/alert'

interface Role {
  id: string
  name: string
  isSystemRole: boolean
  systemRoleKey: SystemRoleKey | null
  permissions: Permission[]
}

interface InviteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  roles: Role[]
  onInvite: (email: string, roleId: string, name?: string) => Promise<void>
}

/**
 * InviteModal component
 *
 * Modal dialog for inviting new users to the company.
 *
 * Fields:
 * - Email (required): Valid email address
 * - Name (optional): User's display name
 * - Role (required): Select from system roles and custom roles
 *
 * Role dropdown shows two sections:
 * - System Roles (isSystemRole: true)
 * - Custom Roles (isSystemRole: false) - shown only if company has custom roles
 *
 * Shows permission count for each role to help with selection.
 */
export function InviteModal({ open, onOpenChange, roles, onInvite }: InviteModalProps) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [selectedRoleId, setSelectedRoleId] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email || !selectedRoleId) {
      setError('Email and role are required')
      return
    }

    setIsSubmitting(true)
    try {
      await onInvite(email, selectedRoleId, name || undefined)
      // Reset form
      setEmail('')
      setName('')
      setSelectedRoleId('')
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open && !isSubmitting) {
      // Reset form when closing
      setEmail('')
      setName('')
      setSelectedRoleId('')
      setError(null)
    }
    onOpenChange(open)
  }

  // Group roles
  const systemRoles = roles.filter((r) => r.isSystemRole)
  const customRoles = roles.filter((r) => !r.isSystemRole)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
          <DialogDescription>
            Send an invitation to a new user to join your company. They will receive an email with
            a magic link to set up their account.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {error && (
              <Alert variant="destructive">
                <p className="text-sm">{error}</p>
              </Alert>
            )}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email <span className="text-red-500">*</span>
              </label>
              <Input
                id="email"
                type="email"
                placeholder="user@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Name (optional)
              </label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="role" className="text-sm font-medium">
                Role <span className="text-red-500">*</span>
              </label>
              <Select
                value={selectedRoleId}
                onValueChange={setSelectedRoleId}
                disabled={isSubmitting}
                required
              >
                <SelectTrigger id="role">
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
                          <div className="flex flex-col">
                            <span className="font-medium">{role.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {role.permissions.length} permissions
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {customRoles.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">
                        Custom Roles
                      </div>
                      {customRoles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium">{role.name}</span>
                              <span className="text-[10px] px-1 py-0.5 rounded bg-slate-100 text-slate-600">
                                Custom
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {role.permissions.length} permissions
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                The selected role determines what actions this user can perform.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !email || !selectedRoleId}>
              {isSubmitting ? 'Sending...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
