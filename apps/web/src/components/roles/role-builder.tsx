'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Permission, DEPARTMENT_SUGGESTIONS } from '@docuroute/types'
import { createRoleSchema, CreateRoleInput } from '@/lib/validations/role'
import { PermissionCheckboxGrid } from './permission-checkbox-grid'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

interface RoleBuilderProps {
  onSubmit: (data: CreateRoleInput) => Promise<void>
  onCancel: () => void
  initialData?: CreateRoleInput
  mode: 'create' | 'edit'
}

export function RoleBuilder({ onSubmit, onCancel, initialData, mode }: RoleBuilderProps) {
  const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>(
    initialData?.permissions || []
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateRoleInput>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      permissions: initialData?.permissions || [],
    },
  })

  const handlePermissionChange = (permissions: Permission[]) => {
    setSelectedPermissions(permissions)
    setValue('permissions', permissions, { shouldValidate: true })
  }

  const fillDepartmentSuggestion = (dept: string) => {
    setValue('name', dept, { shouldValidate: true })
  }

  const onFormSubmit = async (data: CreateRoleInput) => {
    setIsSubmitting(true)
    try {
      await onSubmit({ ...data, permissions: selectedPermissions })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Role Name *</Label>
          <Input
            id="name"
            {...register('name')}
            placeholder="e.g., Site Operations Manager"
            className="mt-1"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        <div>
          <Label>Department Suggestions</Label>
          <p className="text-xs text-gray-500 mb-2">
            Click a suggestion to pre-fill the role name
          </p>
          <div className="flex flex-wrap gap-2">
            {DEPARTMENT_SUGGESTIONS.map((dept) => (
              <Badge
                key={dept}
                variant="outline"
                className="cursor-pointer hover:bg-blue-50 hover:border-blue-300"
                onClick={() => fillDepartmentSuggestion(dept)}
              >
                {dept}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="description">Description (Optional)</Label>
          <textarea
            id="description"
            {...register('description')}
            placeholder="Describe the purpose and responsibilities of this role"
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
          )}
        </div>
      </div>

      <div>
        <Label>Permissions *</Label>
        <p className="text-xs text-gray-500 mb-4">
          Select the permissions this role should have. Sensitive permissions are marked with a warning.
        </p>
        <PermissionCheckboxGrid
          selectedPermissions={selectedPermissions}
          onChange={handlePermissionChange}
          disabled={isSubmitting}
        />
        {errors.permissions && (
          <p className="mt-2 text-sm text-red-600">{errors.permissions.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (mode === 'create' ? 'Creating...' : 'Updating...') : (mode === 'create' ? 'Create Role' : 'Update Role')}
        </Button>
      </div>
    </form>
  )
}
