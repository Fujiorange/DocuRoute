'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Permission } from '@docuroute/types'
import { RoleBuilder } from './role-builder'
import { CreateRoleInput } from '@/lib/validations/role'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface Role {
  id: string
  name: string
  description: string | null
  isSystemRole: boolean
  systemRoleKey: string | null
  permissions: Permission[]
  userCount: number
}

export function RoleList() {
  const { data: session } = useSession()
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)

  // Check if user has customRoles feature enabled
  const hasCustomRolesFeature = true // TODO: This should come from session or company data

  const fetchRoles = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/roles')
      if (!response.ok) {
        throw new Error('Failed to fetch roles')
      }
      const data = await response.json()
      setRoles(data.roles)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load roles')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRoles()
  }, [])

  const handleCreateRole = async (data: CreateRoleInput) => {
    try {
      const response = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to create role')
      }

      await fetchRoles()
      setIsDialogOpen(false)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create role')
    }
  }

  const handleEditRole = async (data: CreateRoleInput) => {
    if (!editingRole) return

    try {
      const response = await fetch(`/api/roles/${editingRole.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to update role')
      }

      await fetchRoles()
      setEditingRole(null)
      setIsDialogOpen(false)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update role')
    }
  }

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('Are you sure you want to delete this role?')) return

    try {
      const response = await fetch(`/api/roles/${roleId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to delete role')
      }

      await fetchRoles()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete role')
    }
  }

  if (loading) {
    return <div className="p-4">Loading roles...</div>
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        {error}
      </Alert>
    )
  }

  const systemRoles = roles.filter((r) => r.isSystemRole)
  const customRoles = roles.filter((r) => !r.isSystemRole)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Roles & Permissions</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage system and custom roles for your organization
          </p>
        </div>
        {hasCustomRolesFeature && (
          <Button onClick={() => { setEditingRole(null); setIsDialogOpen(true) }}>
            Create Custom Role
          </Button>
        )}
      </div>

      {!hasCustomRolesFeature && (
        <Alert>
          <p className="font-semibold">Custom roles require the Growth plan or above.</p>
          <p className="text-sm text-gray-600 mt-1">
            Upgrade your plan to create custom roles tailored to your organization's needs.
          </p>
        </Alert>
      )}

      <div>
        <h3 className="text-lg font-semibold mb-3">System Roles</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {systemRoles.map((role) => (
            <Card key={role.id} className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold">{role.name}</h4>
                <Badge variant="secondary">System</Badge>
              </div>
              {role.description && (
                <p className="text-sm text-gray-600 mb-3">{role.description}</p>
              )}
              <div className="text-xs text-gray-500">
                <p>{role.userCount} user{role.userCount !== 1 ? 's' : ''}</p>
                <p className="mt-1 italic">
                  Managed by system — contact DocuRoute support to discuss role structure
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {customRoles.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Custom Roles</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customRoles.map((role) => (
              <Card key={role.id} className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold">{role.name}</h4>
                  <Badge>Custom</Badge>
                </div>
                {role.description && (
                  <p className="text-sm text-gray-600 mb-3">{role.description}</p>
                )}
                <div className="text-xs text-gray-500 mb-3">
                  <p>{role.userCount} user{role.userCount !== 1 ? 's' : ''}</p>
                  <p className="mt-1">{role.permissions.length} permissions</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setEditingRole(role); setIsDialogOpen(true) }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteRole(role.id)}
                    disabled={role.userCount > 0}
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRole ? 'Edit Custom Role' : 'Create Custom Role'}
            </DialogTitle>
          </DialogHeader>
          <RoleBuilder
            mode={editingRole ? 'edit' : 'create'}
            initialData={editingRole ? {
              name: editingRole.name,
              description: editingRole.description || undefined,
              permissions: editingRole.permissions,
            } : undefined}
            onSubmit={editingRole ? handleEditRole : handleCreateRole}
            onCancel={() => { setIsDialogOpen(false); setEditingRole(null) }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
