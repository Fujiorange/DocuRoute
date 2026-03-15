'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Permission, SystemRoleKey, PLAN_LIMITS, PlanTier } from '@docuroute/types'
import { UserTable } from '@/components/users/user-table'
import { InviteModal } from '@/components/users/invite-modal'
import { PermissionGate } from '@/components/users/permission-gate'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'

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

/**
 * Users Management Page
 *
 * /dashboard/settings/users
 *
 * Displays all users in the company with management actions.
 *
 * Header shows seat count: "8 / 15 seats" (excludes BILLING_CONTACT role users)
 * Seat warning: amber >80%, red at limit
 *
 * Permissions:
 * - View page: Permission.MANAGE_USERS or Permission.INVITE_USERS
 * - Invite users: Permission.INVITE_USERS
 * - Change roles: Permission.MANAGE_USERS
 * - Deactivate: Permission.DEACTIVATE_USERS
 */
export default function UsersPage() {
  const { data: session } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [seatCount, setSeatCount] = useState({ current: 0, limit: 0 })

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/users')
      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }
      const data = await response.json()
      setUsers(data.users)

      // Calculate seat count (exclude BILLING_CONTACT users)
      const activeSeats = data.users.filter(
        (u: User) =>
          u.isActive &&
          !(u.role.isSystemRole && u.role.systemRoleKey === 'BILLING_CONTACT')
      ).length

      // Get plan limit (default to PILOT if not available)
      const planTier = (session?.user?.companyId ? 'PILOT' : 'PILOT') as PlanTier
      const limit = PLAN_LIMITS[planTier]?.users || 15

      setSeatCount({ current: activeSeats, limit })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/roles')
      if (!response.ok) {
        throw new Error('Failed to fetch roles')
      }
      const data = await response.json()
      setRoles(data.roles)
    } catch (err) {
      console.error('Failed to fetch roles:', err)
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchRoles()
  }, [session])

  const handleInvite = async (email: string, roleId: string, name?: string) => {
    const response = await fetch('/api/users/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, roleId, name }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'Failed to send invitation')
    }

    // Refresh users list
    await fetchUsers()
  }

  const handleRoleChange = async (userId: string, roleId: string) => {
    const response = await fetch(`/api/users/${userId}/role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roleId }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'Failed to change role')
    }

    // Refresh users list
    await fetchUsers()
  }

  const handleDeactivate = async (userId: string) => {
    const response = await fetch(`/api/users/${userId}/deactivate`, {
      method: 'POST',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'Failed to deactivate user')
    }

    // Refresh users list
    await fetchUsers()
  }

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-10">
        <Alert variant="destructive">
          <p>{error}</p>
        </Alert>
      </div>
    )
  }

  const seatPercentage = (seatCount.current / seatCount.limit) * 100
  const seatWarningColor =
    seatPercentage >= 100
      ? 'bg-red-100 text-red-800 border-red-200'
      : seatPercentage >= 80
      ? 'bg-amber-100 text-amber-800 border-amber-200'
      : 'bg-green-100 text-green-800 border-green-200'

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Users</CardTitle>
              <CardDescription>
                Manage your team members and their roles
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Seats:</span>
                <Badge className={seatWarningColor}>
                  {seatCount.current} / {seatCount.limit}
                </Badge>
              </div>
              <PermissionGate requiredPermissions={[Permission.INVITE_USERS]}>
                <Button onClick={() => setIsInviteModalOpen(true)}>
                  Invite User
                </Button>
              </PermissionGate>
            </div>
          </div>
          {seatPercentage >= 80 && (
            <Alert
              variant={seatPercentage >= 100 ? 'destructive' : 'default'}
              className="mt-4"
            >
              <p className="text-sm">
                {seatPercentage >= 100
                  ? `You've reached your seat limit (${seatCount.limit} seats). Upgrade your plan to invite more users.`
                  : `You're using ${seatCount.current} of ${seatCount.limit} seats. Consider upgrading your plan if you need more users.`}
              </p>
            </Alert>
          )}
        </CardHeader>
        <CardContent>
          <UserTable
            users={users}
            roles={roles}
            onRoleChange={handleRoleChange}
            onDeactivate={handleDeactivate}
            currentUserId={session?.user?.userId}
          />
        </CardContent>
      </Card>

      <InviteModal
        open={isInviteModalOpen}
        onOpenChange={setIsInviteModalOpen}
        roles={roles}
        onInvite={handleInvite}
      />
    </div>
  )
}
